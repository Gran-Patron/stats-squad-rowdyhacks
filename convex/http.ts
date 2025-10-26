import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { buildSpotifyAuthorizeUrl, getEnvOrThrow } from "./spotify";
import { customAlphabet } from "nanoid";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const generateState = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);

const startSpotifyConnect = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const state = generateState();
  await ctx.runMutation(internal.spotify.createAuthState, {
    userId,
    state,
  });

  try {
    const authorizeUrl = buildSpotifyAuthorizeUrl(state);
    return jsonResponse({ authorizeUrl });
  } catch (err) {
    console.error("Failed to build Spotify auth URL", err);
    return new Response("Server Error", { status: 500 });
  }
});

const spotifyCallback = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const redirectUri = getEnvOrThrow("SPOTIFY_REDIRECT_URI");
  const successRedirect = getEnvOrThrow("SPOTIFY_SUCCESS_REDIRECT");
  const failureRedirect = getEnvOrThrow("SPOTIFY_FAILURE_REDIRECT");

  const redirectWithParams = (base: string, params: Record<string, string>) => {
    const target = new URL(base);
    for (const [key, value] of Object.entries(params)) {
      target.searchParams.set(key, value);
    }
    return target.toString();
  };

  if (!state) {
    return Response.redirect(
      redirectWithParams(failureRedirect, { reason: "missing_state" }),
      302,
    );
  }

  const stateResult = await ctx.runMutation(internal.spotify.consumeAuthState, {
    state,
  });

  if (!stateResult) {
    return Response.redirect(
      redirectWithParams(failureRedirect, { reason: "invalid_state" }),
      302,
    );
  }

  if (error || !code) {
    return Response.redirect(
      redirectWithParams(failureRedirect, {
        reason: error ? `spotify_${error}` : "missing_code",
      }),
      302,
    );
  }

  try {
    const tokenResponse = await ctx.runAction(internal.spotify.exchangeTokens, {
      code,
      redirectUri,
    });
    const expiresAt = Math.floor(Date.now() / 1000) + tokenResponse.expiresIn;
    await ctx.runMutation(internal.spotify.storeTokens, {
      userId: stateResult.userId,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresAt,
      scope: tokenResponse.scope,
    });

    return Response.redirect(
      redirectWithParams(successRedirect, { connected: "true" }),
      302,
    );
  } catch (err) {
    console.error("Spotify callback failed", err);
    return Response.redirect(
      redirectWithParams(failureRedirect, { reason: "token_exchange_failed" }),
      302,
    );
  }
});

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/spotify/start",
  method: "POST",
  handler: startSpotifyConnect,
});

http.route({
  path: "/api/spotify/callback",
  method: "GET",
  handler: spotifyCallback,
});

export default http;
