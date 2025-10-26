import React from "react";
import { SpotifyArtist } from "../types";
import { Loader2, Users, ExternalLink } from "lucide-react";

interface TopArtistsListProps {
  artists: SpotifyArtist[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TopArtistsList: React.FC<TopArtistsListProps> = ({ artists, isLoading, error, onRetry }) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin text-[#1DB954]" />
        Loading your top artists...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-2 text-sm text-red-400">
        <span>{error}</span>
        <button
          onClick={onRetry}
          className="rounded-md bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/30"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Users className="h-4 w-4" />
        Your Spotify top artists will appear here after you connect.
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl rounded-2xl bg-zinc-900/60 p-4 backdrop-blur">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        <Users className="h-5 w-5 text-[#1DB954]" />
        Your Spotify Top Artists
      </h3>
      <ol className="grid gap-3 md:grid-cols-2">
        {artists.map((artist, index) => (
          <li
            key={artist.id}
            className="flex items-center gap-3 rounded-xl bg-zinc-800/50 p-3 transition-transform hover:-translate-y-0.5 hover:bg-zinc-800"
          >
            <span className="text-lg font-semibold text-zinc-500">{index + 1}.</span>
            {artist.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400">
                <Users className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{artist.name}</p>
              {artist.genres.length > 0 && (
                <p className="truncate text-xs text-zinc-400">{artist.genres.join(", ")}</p>
              )}
              <p className="text-xs text-zinc-500">{artist.followerCount.toLocaleString()} followers</p>
            </div>
            <a
              href={artist.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-full bg-[#1DB954]/10 px-3 py-1 text-xs font-semibold text-[#1DB954] transition-colors hover:bg-[#1DB954]/20"
            >
              Open
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
};

