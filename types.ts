
export interface CleanSpotifyTrack {
  track_id: string;
  track_name: string;
  track_artist: string;
  track_popularity: number | null;
  track_album_id: string;
  track_album_name: string;
  track_album_release_date: string;
  danceability: number | null;
  energy: number | null;
  valence: number | null;
  tempo: number | null;
  duration_ms: number | null;
  playlist_genres_all: string;
  playlist_subgenres_all: string;
  playlist_count: number | null;
}

export type SongOrigin = "clean_spotify" | "itunes" | "mock";

export interface Song {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  previewUrl: string | null;
  origin: SongOrigin;
  datasetTrack?: CleanSpotifyTrack;
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
