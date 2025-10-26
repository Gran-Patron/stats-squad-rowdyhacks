import type { RegisteredAction } from "convex/server";
import { internalAction, internalMutation, internalQuery, query, action, mutation } from "./_generated/server";
import type { ActionCtx as ConvexActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { customAlphabet } from "nanoid";
import type { Id } from "./_generated/dataModel";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_PROFILE_URL = "https://api.spotify.com/v1/me";
const SPOTIFY_TOP_TRACKS_URL = "https://api.spotify.com/v1/me/top/tracks";
const SPOTIFY_TOP_ARTISTS_URL = "https://api.spotify.com/v1/me/top/artists";

export const REQUIRED_SCOPE = "user-top-read user-read-email user-read-private";

const STATE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const STATE_LENGTH = 32;
const stateGenerator = customAlphabet(STATE_ALPHABET, STATE_LENGTH);

type SpotifyTokenPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
};

type StoredSpotifyTokenDoc = SpotifyTokenPayload & {
  _id: Id<"spotifyTokens">;
  userId: Id<"users">;
};

type RefreshedSpotifyToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
};

type SpotifyImage = {
  url: string;
  width?: number;
  height?: number;
};

type SpotifyTopTrack = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    images: SpotifyImage[];
  };
  preview_url?: string;
  external_urls: {
    spotify: string;
  };
};

type SpotifyTopArtist = {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
  followers: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
};

type SpotifyUserProfile = {
  id: string;
  display_name?: string;
  email?: string;
  images?: SpotifyImage[];
};

const selectLargestImage = (images: SpotifyImage[] | undefined): string | null => {
  if (!images || images.length === 0) {
    return null;
  }

  return images.reduce((best, candidate) => {
    const bestWidth = best?.width ?? 0;
    const candidateWidth = candidate.width ?? 0;
    if (candidateWidth > bestWidth) {
      return candidate;
    }
    return best;
  }).url;
};

export const getEnvOrThrow = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
};

export const generateSpotifyState = () => stateGenerator();
export const buildSpotifyAuthorizeUrl = (state: string): string => {
  const clientId = getEnvOrThrow("SPOTIFY_CLIENT_ID");
  const redirectUri = getEnvOrThrow("SPOTIFY_REDIRECT_URI");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: REQUIRED_SCOPE,
    state,
  });
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
};


function encodeBasicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

const fetchSpotifyResource = async <T>(
  ctx: ConvexActionCtx,
  tokens: SpotifyTokenPayload,
  userId: Id<"users">,
  url: string,
  transform: (json: unknown) => T,
): Promise<T> => {
  "use node";

  const fetchOnce = async (accessToken: string) => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("Spotify request failed", {
        url,
        status: response.status,
        body: text,
      });
      throw new Error("Failed to fetch Spotify resource");
    }

    const json: unknown = await response.json();
    return transform(json);
  };

  const initial = await fetchOnce(tokens.accessToken);
  if (initial !== null) {
    return initial;
  }

  const refreshed = await ctx.runAction(internal.spotify.ensureValidAccessToken, {
    userId,
  });

  if (!refreshed) {
    throw new Error("Spotify account not connected");
  }

  const retry = await fetchOnce(refreshed.accessToken);
  if (retry === null) {
    throw new Error("Spotify authorization failed");
  }

  return retry;
};

export const connectionStatus = query({
  args: {},
  returns: v.union(
    v.literal("connected"),
    v.literal("not_connected"),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return "not_connected";
    }

    const existing = await ctx.db
      .query("spotifyTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return existing ? "connected" : "not_connected";
  },
});

export const startConnect = mutation({
  args: {},
  returns: v.object({ authorizeUrl: v.string() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const state = generateSpotifyState();
    await ctx.db.insert("spotifyAuthStates", {
      userId,
      state,
    });

    const authorizeUrl = buildSpotifyAuthorizeUrl(state);
    return { authorizeUrl };
  },
});

export const createAuthState = internalMutation({
  args: {
    userId: v.id("users"),
    state: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("spotifyAuthStates", {
      userId: args.userId,
      state: args.state,
    });
    return null;
  },
});

export const exchangeTokens = internalAction({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  returns: v.object({
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
    scope: v.optional(v.string()),
  }),
  handler: async (_, args) => {
    "use node";
    const clientId = getEnvOrThrow("SPOTIFY_CLIENT_ID");
    const clientSecret = getEnvOrThrow("SPOTIFY_CLIENT_SECRET");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: args.redirectUri,
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${encodeBasicAuth(clientId, clientSecret)}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Spotify token exchange failed", text);
      throw new Error("Spotify token exchange failed");
    }

    const json = await response.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
      scope: json.scope,
    };
  },
});

export const storeTokens = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("spotifyTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
      });
    } else {
      await ctx.db.insert("spotifyTokens", {
        userId: args.userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
      });
    }

    return null;
  },
});

export const consumeAuthState = internalMutation({
  args: {
    state: v.string(),
  },
  returns: v.union(
    v.object({ userId: v.id("users") }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("spotifyAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!entry) {
      return null;
    }

    await ctx.db.delete(entry._id);
    return { userId: entry.userId };
  },
});

export const ensureValidAccessToken = internalAction({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
      scope: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<SpotifyTokenPayload | null> => {
    "use node";
    const tokenDoc: StoredSpotifyTokenDoc | null = await ctx.runQuery(
      internal.spotify.getTokenForUser,
      {
        userId: args.userId,
      },
    );

    if (!tokenDoc) {
      return null;
    }

    const now = Date.now() / 1000;
    if (tokenDoc.expiresAt - now > 60) {
      return tokenDoc;
    }

    const refreshed: RefreshedSpotifyToken = await ctx.runAction(
      internal.spotify.refreshAccessToken,
      {
        refreshToken: tokenDoc.refreshToken,
      },
    );

    await ctx.runMutation(internal.spotify.storeTokens, {
      userId: args.userId,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokenDoc.refreshToken,
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope,
    });

    return {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokenDoc.refreshToken,
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope,
    };
  },
});

export const getTokenForUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("spotifyTokens"),
      userId: v.id("users"),
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
      scope: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("spotifyTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const refreshAccessToken = internalAction({
  args: {
    refreshToken: v.string(),
  },
  returns: v.object({
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
  }),
  handler: async (_, args) => {
    "use node";
    const clientId = getEnvOrThrow("SPOTIFY_CLIENT_ID");
    const clientSecret = getEnvOrThrow("SPOTIFY_CLIENT_SECRET");

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: args.refreshToken,
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${encodeBasicAuth(clientId, clientSecret)}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Spotify refresh failed", text);
      throw new Error("Spotify token refresh failed");
    }

    const json = await response.json();
    const expiresIn = json.expires_in as number;

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
      scope: json.scope,
    };
  },
});

const fetchProfileDefinition = {
  args: {},
  returns: v.object({
    id: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.union(v.null(), v.string()),
  }),
  handler: async (ctx: ConvexActionCtx) => {
    "use node";
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tokens: SpotifyTokenPayload | null = await ctx.runAction(
      internal.spotify.ensureValidAccessToken,
      {
        userId,
      },
    );

    if (!tokens) {
      throw new Error("Spotify account not connected");
    }

    const response = await fetch(SPOTIFY_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Fetching Spotify profile failed", text);
      throw new Error("Failed to fetch Spotify profile");
    }

    const profile: SpotifyUserProfile = await response.json();
    return {
      id: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      imageUrl: selectLargestImage(profile.images),
    };
  },
} satisfies Parameters<typeof action>[0];

export const fetchProfile: RegisteredAction<
  "public",
  {},
  Promise<{
    id: string;
    displayName?: string;
    email?: string;
    imageUrl: string | null;
  }>
> = action(fetchProfileDefinition);

const fetchTopTracksDefinition = {
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      artistNames: v.array(v.string()),
      albumArtUrl: v.union(v.null(), v.string()),
      previewUrl: v.union(v.null(), v.string()),
      externalUrl: v.string(),
    }),
  ),
  handler: async (ctx: ConvexActionCtx, args: { limit?: number }) => {
    "use node";
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tokens: SpotifyTokenPayload | null = await ctx.runAction(
      internal.spotify.ensureValidAccessToken,
      {
        userId,
      },
    );

    if (!tokens) {
      throw new Error("Spotify account not connected");
    }

    const limit = args.limit ?? 10;
    const url = `${SPOTIFY_TOP_TRACKS_URL}?limit=${limit}`;

    return fetchSpotifyResource(
      ctx,
      tokens,
      userId,
      url,
      (json) =>
        ((json as { items?: SpotifyTopTrack[] }).items ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          artistNames: item.artists.map((artist) => artist.name),
          albumArtUrl: selectLargestImage(item.album.images),
          previewUrl: item.preview_url ?? null,
          externalUrl: item.external_urls.spotify,
        })),
    );
  },
} satisfies Parameters<typeof action>[0];

export const fetchTopTracks: RegisteredAction<
  "public",
  {
    limit?: number;
  },
  Promise<
    Array<{
      id: string;
      name: string;
      artistNames: string[];
      albumArtUrl: string | null;
      previewUrl: string | null;
      externalUrl: string;
    }>
  >
> = action(fetchTopTracksDefinition);

const fetchTopArtistsDefinition = {
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      genres: v.array(v.string()),
      imageUrl: v.union(v.null(), v.string()),
      externalUrl: v.string(),
      followerCount: v.number(),
    }),
  ),
  handler: async (ctx: ConvexActionCtx, args: { limit?: number }) => {
    "use node";
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tokens: SpotifyTokenPayload | null = await ctx.runAction(
      internal.spotify.ensureValidAccessToken,
      {
        userId,
      },
    );

    if (!tokens) {
      throw new Error("Spotify account not connected");
    }

    const limit = args.limit ?? 10;
    const url = `${SPOTIFY_TOP_ARTISTS_URL}?limit=${limit}`;

    return fetchSpotifyResource(
      ctx,
      tokens,
      userId,
      url,
      (json) =>
        ((json as { items?: SpotifyTopArtist[] }).items ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          genres: item.genres ?? [],
          imageUrl: selectLargestImage(item.images),
          externalUrl: item.external_urls.spotify,
          followerCount: item.followers?.total ?? 0,
        })),
    );
  },
} satisfies Parameters<typeof action>[0];

export const fetchTopArtists: RegisteredAction<
  "public",
  {
    limit?: number;
  },
  Promise<
    Array<{
      id: string;
      name: string;
      genres: string[];
      imageUrl: string | null;
      externalUrl: string;
      followerCount: number;
    }>
  >
> = action(fetchTopArtistsDefinition);

