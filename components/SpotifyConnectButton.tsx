import React from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Loader2, PlugZap } from "lucide-react";
import { SpotifyConnectionStatus } from "../types";

interface SpotifyConnectButtonProps {
  status: SpotifyConnectionStatus | undefined;
}

export const SpotifyConnectButton: React.FC<SpotifyConnectButtonProps> = ({ status }) => {
  const isLoadingStatus = status === undefined;
  const [isStarting, setIsStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const start = useMutation(api.spotify.startConnect);

  const handleClick = async () => {
    setError(null);
    setIsStarting(true);
    try {
      const { authorizeUrl } = await start({});
      window.location.href = authorizeUrl;
    } catch (err) {
      console.error("Failed to start Spotify connect", err);
      const message =
        typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: string }).message === "string"
          ? (err as { message?: string }).message
          : "Unable to start Spotify connection. Please try again.";
      setError(message);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-[#1DB954]/10 px-3 py-1 text-xs text-[#1DB954]">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking Spotify…
      </div>
    );
  }

  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
        <PlugZap className="h-3 w-3" />
        Spotify Connected
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 text-xs">
      <button
        onClick={handleClick}
        disabled={isStarting}
        className="flex items-center gap-2 rounded-full bg-[#1DB954] px-3 py-1 font-semibold text-black transition-colors hover:bg-[#1ed760] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isStarting ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <PlugZap className="h-3 w-3" />
            Connect Spotify
          </>
        )}
      </button>
      {error && <span className="text-red-400">{error}</span>}
    </div>
  );
};
