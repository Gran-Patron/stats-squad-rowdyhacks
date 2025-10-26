import React from "react";
import { SpotifyProfile } from "../types";

interface ProfileProps {
  userName?: string | null;
  spotifyProfile?: SpotifyProfile | null;
}

const Profile: React.FC<ProfileProps> = ({ userName, spotifyProfile }) => {
  const displayName = spotifyProfile?.displayName ?? userName;
  const fallbackInitial = (spotifyProfile?.displayName ?? userName ?? "").slice(0, 1).toUpperCase();
  const imageUrl = spotifyProfile?.imageUrl ?? null;

  if (!displayName) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={displayName}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954]/30 text-sm font-semibold text-[#1DB954]">
          {fallbackInitial}
        </div>
      )}
      <span className="text-sm text-zinc-300">{displayName}</span>
    </div>
  );
};

export default Profile;
