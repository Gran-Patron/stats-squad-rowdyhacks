
export interface Song {
  id: number;
  title: string;
  artist: string;
  albumArt: string;
  previewUrl: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artistNames: string[];
  albumArtUrl: string | null;
  previewUrl: string | null;
  externalUrl: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  imageUrl: string | null;
  externalUrl: string;
  followerCount: number;
}

export interface SpotifyProfile {
  id: string;
  displayName?: string;
  email?: string;
  imageUrl: string | null;
}

export type SpotifyConnectionStatus = "connected" | "not_connected";
