import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Music, Heart, X, ListMusic, Loader2, Compass, Users, ThumbsDown } from 'lucide-react';
import { useAction, useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from './convex/_generated/api';
import { CleanSpotifyTrack, Song, SpotifyConnectionStatus, SpotifyProfile, SpotifyTrack, SpotifyArtist } from './types';
import Papa from 'papaparse';
import { MOCK_SONGS } from './constants';
import { SongCard } from './components/SongCard';
import { LikedSongsView } from './components/LikedSongsView';
import { DiscoverView } from './components/DiscoverView';
import { FriendSuggestView } from './components/FriendSuggestView';
import LogoutButton from './components/LogoutButton';
import Profile from './components/Profile';
import { SpotifyConnectButton } from './components/SpotifyConnectButton';
import { TopTracksList } from './components/TopTracksList';
import { TopArtistsList } from './components/TopArtistsList';
import { getVibeAnalysis, getSongRecommendations } from './services/geminiService';

type View = 'swipe' | 'likes' | 'discover' | 'suggest';

const App: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const userDoc = useQuery(api.users.currentUser);
  const userLoading = userDoc === undefined;
  const fetchSpotifyProfile = useAction(api.spotify.fetchProfile);
  const fetchSpotifyTopTracks = useAction(api.spotify.fetchTopTracks);
  const fetchSpotifyTopArtists = useAction(api.spotify.fetchTopArtists);
  const [authActionPending, setAuthActionPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [dislikedArtists, setDislikedArtists] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [view, setView] = useState<View>('swipe');
  const [appIsLoading, setAppIsLoading] = useState(true);
  
  // Vibe Analysis State
  const [vibe, setVibe] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Discovery State
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const currentSong = songs[currentIndex];
  const spotifyStatus = useQuery(api.spotify.connectionStatus) as SpotifyConnectionStatus | undefined;
  const [spotifyProfile, setSpotifyProfile] = useState<SpotifyProfile | null>(null);
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([]);
  const [spotifyArtists, setSpotifyArtists] = useState<SpotifyArtist[]>([]);
  const [spotifyDataLoading, setSpotifyDataLoading] = useState(false);
  const [spotifyDataError, setSpotifyDataError] = useState<string | null>(null);

  useEffect(() => {
    // Always pause the old audio element when currentSong changes
    if (audioRef.current) {
        audioRef.current.pause();
    }
    
    if (currentSong && currentSong.previewUrl) {
      const newAudio = new Audio(currentSong.previewUrl);
      newAudio.volume = 0.5;
      audioRef.current = newAudio;
      setIsPlaying(false);
    }
  }, [currentSong]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (currentIndex < 0) return;

    if (direction === 'right') {
      setLikedSongs(prev => [songs[currentIndex], ...prev]);
    }
    
    // Immediately stop audio if it's playing
    if (audioRef.current && isPlaying) {
      togglePlay();
    }
    
    // Then, set a timeout to change the card
    setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
    }, 100);

  }, [currentIndex, songs, isPlaying, togglePlay]);
  
    const handleSuperDislike = useCallback(() => {
    if (currentIndex < 0) return;

    // Immediately stop audio if it's playing
    if (audioRef.current && isPlaying) {
      togglePlay();
    }

    const artistToDislike = songs[currentIndex].artist;
    const newDislikedArtists = new Set(dislikedArtists).add(artistToDislike);
    setDislikedArtists(newDislikedArtists);

    // Calculate the new index before filtering the whole deck
    // The new index will be the count of valid songs before the current one
    const newIndex = songs.slice(0, currentIndex).filter(song => song.artist !== artistToDislike).length - 1;

    // Filter the song deck to remove all songs from the disliked artist
    const newSongs = songs.filter(song => !newDislikedArtists.has(song.artist));
    
    setSongs(newSongs);
    setCurrentIndex(newIndex);
    
  }, [currentIndex, songs, dislikedArtists, isPlaying, togglePlay]);


  const handleAnalyzeVibe = async () => {
      if (likedSongs.length < 3) {
          setAnalysisError("Like at least 3 songs to analyze your vibe!");
          return;
      }
      setIsAnalyzing(true);
      setAnalysisError(null);
      setVibe(null);
      try {
          const analysis = await getVibeAnalysis(likedSongs);
          setVibe(analysis);
      } catch (err) {
          setAnalysisError("Sorry, couldn't analyze your vibe. Please try again.");
          console.error(err);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const searchiTunesByQuery = useCallback(async (query: string): Promise<Song[]> => {
      const searchTerm = query.replace(/\s/g, '+');
      const url = `https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=20`;
      try {
          const response = await fetch(`https://corsproxy.io/?${url}`);
          if (!response.ok) throw new Error('iTunes API request failed');
          const data = await response.json();
          if (data.results && data.results.length > 0) {
              return data.results
                  .filter((track: any) => track.previewUrl) // only songs with previews
                  .map((track: any) => ({
                      id: track.trackId,
                      title: track.trackName,
                      artist: track.artistName,
                      albumArt: track.artworkUrl100.replace('100x100bb', '600x600bb'),
                      previewUrl: track.previewUrl,
                  }));
          }
          return [];
      } catch (error) {
          console.error(`iTunes search failed for "${query}":`, error);
          return [];
      }
  }, []);

  const searchiTunes = useCallback(async (title: string, artist: string): Promise<Song | null> => {
      const searchTerm = `${title} ${artist}`.replace(/\s/g, '+');
      const url = `https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=1`;
      try {
          // Using a proxy is not ideal but needed for client-side CORS issues with iTunes API
          const response = await fetch(`https://corsproxy.io/?${url}`);
          if (!response.ok) throw new Error('iTunes API request failed');
          const data = await response.json();
          if (data.results && data.results.length > 0) {
              const track = data.results[0];
              if (!track.previewUrl) return null; // Skip songs without a preview
              return {
                  id: track.trackId,
                  title: track.trackName,
                  artist: track.artistName,
                  albumArt: track.artworkUrl100.replace('100x100bb', '800x800bb'),
                  previewUrl: track.previewUrl,
              };
          }
          return null;
      } catch (error) {
          console.error(`iTunes search failed for "${title}":`, error);
          return null;
      }
  }, []);

  const loadInitialSongs = useCallback(async () => {
    setAppIsLoading(true);
    const genres = ["top pop hits", "today's hits", "classic rock", "90s hip hop", "indie alternative", "summer party"];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    const initialSongsRaw = await searchiTunesByQuery(randomGenre);
    const initialSongs = initialSongsRaw.filter(song => !dislikedArtists.has(song.artist));
    
    if (initialSongs && initialSongs.length > 0) {
        setSongs(initialSongs);
        setCurrentIndex(initialSongs.length - 1);
    } else {
        console.warn("Failed to fetch initial songs from iTunes, falling back to mock data. Previews may be broken.");
        setSongs(MOCK_SONGS);
        setCurrentIndex(MOCK_SONGS.length - 1);
    }
    setAppIsLoading(false);
  }, [searchiTunesByQuery, dislikedArtists]);

  useEffect(() => {
    loadInitialSongs();
  }, [loadInitialSongs]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthError(null);
    }
  }, [isAuthenticated]);

  const handleGitHubSignIn = useCallback(async () => {
    setAuthActionPending(true);
    setAuthError(null);
    try {
      await signIn('github');
    } catch (error) {
      console.error('GitHub sign-in failed', error);
      setAuthError('GitHub sign-in failed. Please try again.');
    } finally {
      setAuthActionPending(false);
    }
  }, [signIn]);

  const handleLogout = useCallback(async () => {
    setAuthActionPending(true);
    setAuthError(null);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign-out failed', error);
      setAuthError('Sign-out failed. Please try again.');
    } finally {
      setAuthActionPending(false);
    }
  }, [signOut]);

  useEffect(() => {
    const loadSpotifyData = async () => {
      if (spotifyStatus === undefined) {
        return;
      }

      if (spotifyStatus !== 'connected') {
        setSpotifyProfile(null);
        setSpotifyTracks([]);
        setSpotifyArtists([]);
        setSpotifyDataError(null);
        setSpotifyDataLoading(false);
        return;
      }

      setSpotifyDataLoading(true);
      setSpotifyDataError(null);

      try {
        const [profile, tracks, artists] = await Promise.all([
          fetchSpotifyProfile({}),
          fetchSpotifyTopTracks({ limit: 10 }),
          fetchSpotifyTopArtists({ limit: 10 }),
        ]);
        setSpotifyProfile(profile);
        setSpotifyTracks(tracks);
        setSpotifyArtists(artists);
      } catch (error) {
        console.error('Failed to load Spotify data', error);
        setSpotifyDataError('Unable to load Spotify data. Please try again.');
      } finally {
        setSpotifyDataLoading(false);
      }
    };

    if (isAuthenticated) {
      void loadSpotifyData();
    }
  }, [isAuthenticated, spotifyStatus, fetchSpotifyProfile, fetchSpotifyTopTracks, fetchSpotifyTopArtists]);

  const handleDiscover = async (prompt: string) => {
      setIsDiscovering(true);
      setDiscoverError(null);
      try {
          const recommendations = await getSongRecommendations(prompt, Array.from(dislikedArtists));
          if (recommendations.length === 0) {
              setDiscoverError("Couldn't find any songs for that. Try a different search!");
              setIsDiscovering(false);
              return;
          }

          const songPromises = recommendations.map(rec => searchiTunes(rec.title, rec.artist));
          const newSongsRaw = (await Promise.all(songPromises)).filter((song): song is Song => song !== null);
          const newSongs = newSongsRaw.filter(song => !dislikedArtists.has(song.artist));
          
          if (newSongs.length === 0) {
               setDiscoverError("Found ideas, but couldn't get song previews. Try again.");
               setIsDiscovering(false);
               return;
          }

          setSongs(prevSongs => {
            const newDeck = [...prevSongs, ...newSongs];
            setCurrentIndex(newDeck.length - 1);
            return newDeck;
          });
          setView('swipe');

      } catch (err) {
          console.error("Discovery failed:", err);
          setDiscoverError("Something went wrong while finding new music.");
      } finally {
          setIsDiscovering(false);
      }
  };
  
  const handleVibeDiscover = () => {
      if (likedSongs.length === 0) {
          setDiscoverError("Like some songs first!");
          return;
      }
      const songList = likedSongs.map(s => `"${s.title}" by ${s.artist}`).join(', ');
      const prompt = `songs that have a similar vibe to these: ${songList}`;
      setView('discover'); // Switch to discover view before starting
      handleDiscover(prompt);
  };

  const handleSuggestionsAdded = (newSuggestions: Song[]) => {
    const existingSongIds = new Set(songs.map(s => s.id));
    const uniqueNewSuggestions = newSuggestions.filter(s => !existingSongIds.has(s.id) && !dislikedArtists.has(s.artist));

    if (uniqueNewSuggestions.length > 0) {
      const newDeck = [...songs, ...uniqueNewSuggestions];
      setSongs(newDeck);
      setCurrentIndex(newDeck.length - 1);
    }
    setView('swipe');
  };

  const handleDeleteLikedSong = (songId: number) => {
    setLikedSongs(prev => prev.filter(song => song.id !== songId));
  };

  const resetSwipeDeck = useCallback(() => {
    setLikedSongs([]);
    setVibe(null);
    setAnalysisError(null);
    // Note: We are intentionally not clearing dislikedArtists here
    // so the preference persists if the user starts over.
    loadInitialSongs();
  }, [loadInitialSongs]);
  
  const handleSpotifyRetry = () => {
    setSpotifyDataError(null);
    setSpotifyDataLoading(true);
    Promise.all([
      fetchSpotifyProfile({}),
      fetchSpotifyTopTracks({ limit: 10 }),
      fetchSpotifyTopArtists({ limit: 10 }),
    ])
      .then(([profile, tracks, artists]) => {
        setSpotifyProfile(profile);
        setSpotifyTracks(tracks);
        setSpotifyArtists(artists);
      })
      .catch((error) => {
        console.error('Failed to reload Spotify data', error);
        setSpotifyDataError('Unable to load Spotify data. Please try again.');
      })
      .finally(() => {
        setSpotifyDataLoading(false);
      });
  };

  const renderContent = () => {
    if (authLoading || userLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-zinc-400">
          <Loader2 size={48} className="animate-spin mb-4 text-[#1DB954]" />
          <p>Loading authentication...</p>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <Music size={64} className="text-[#1DB954] mb-6" />
          <h2 className="text-3xl font-bold mb-4">Welcome to Swipeify</h2>
          <p className="text-zinc-400 mb-8 max-w-md">
            Discover your next favorite song by swiping through music recommendations. 
            Connect your GitHub account to start your musical journey!
          </p>
          {authError && <p className="text-sm text-red-400 mb-4">{authError}</p>}
          <button
            onClick={handleGitHubSignIn}
            disabled={authActionPending}
            className="px-6 py-3 bg-[#1DB954] text-white rounded-full font-semibold hover:bg-[#1ed760] transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {authActionPending ? 'Connecting…' : 'Continue with GitHub'}
          </button>
        </div>
      );
    }

    if (appIsLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-zinc-400">
          <Loader2 size={48} className="animate-spin mb-4 text-[#1DB954]" />
          <p>Loading fresh tracks...</p>
        </div>
      );
    }

    switch(view) {
      case 'swipe':
        return (
          <div className="w-full h-full max-w-sm max-h-[70vh] flex flex-col items-center justify-center">
            <div className="relative w-full aspect-[3/4] mb-6">
               {songs.map((song, index) =>
                index >= currentIndex -1 && (
                  <SongCard
                    key={`${song.id}-${index}`}
                    song={song}
                    isActive={index === currentIndex}
                    onSwipe={handleSwipe}
                    isPlaying={isPlaying && index === currentIndex}
                    togglePlay={togglePlay}
                  />
                )
              )}
               {currentIndex < 0 && !appIsLoading && (
                <div className="absolute inset-0 bg-zinc-800 rounded-xl flex flex-col items-center justify-center text-center p-8 shadow-lg">
                  <h2 className="text-2xl font-bold mb-2">That's all for now!</h2>
                  <p className="text-zinc-400 mb-6">You've swiped through all the available tracks.</p>
                  <button onClick={resetSwipeDeck} className="px-6 py-2 bg-[#1DB954] rounded-full font-semibold hover:bg-[#1ed760] transition-colors">
                    Start Over
                  </button>
                </div>
              )}
            </div>
            {currentIndex >= 0 && (
              <div className="flex items-center gap-4">
                <button onClick={() => handleSwipe('left')} className="p-5 bg-zinc-800 rounded-full shadow-lg hover:bg-zinc-700 transition-transform transform hover:scale-110 active:scale-95">
                  <X className="text-red-500" size={32} />
                </button>
                <button onClick={handleSuperDislike} className="p-4 bg-zinc-800 rounded-full shadow-lg hover:bg-zinc-700 transition-transform transform hover:scale-110 active:scale-95">
                  <ThumbsDown className="text-white" size={24} />
                </button>
                <button onClick={() => handleSwipe('right')} className="p-5 bg-zinc-800 rounded-full shadow-lg hover:bg-zinc-700 transition-transform transform hover:scale-110 active:scale-95">
                  <Heart className="text-[#1DB954]" size={32} />
                </button>
              </div>
            )}
          </div>
        );
      case 'likes':
        return (
          <LikedSongsView 
            likedSongs={likedSongs} 
            onAnalyze={handleAnalyzeVibe} 
            isAnalyzing={isAnalyzing} 
            analysisResult={vibe}
            error={analysisError}
            clearError={() => setAnalysisError(null)}
            onDelete={handleDeleteLikedSong}
          />
        );
      case 'discover':
        return (
          <DiscoverView 
            onDiscover={handleDiscover}
            onVibeDiscover={handleVibeDiscover}
            isDiscovering={isDiscovering}
            error={discoverError}
            hasLikedSongs={likedSongs.length > 0}
          />
        );
      case 'suggest':
        return (
          <FriendSuggestView
            searchiTunesByQuery={searchiTunesByQuery}
            onSuggestionsAdded={handleSuggestionsAdded}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-gradient-to-b from-[#282828] to-[#121212] text-white select-none overflow-hidden">
      <header className="flex justify-between items-center p-4 border-b border-zinc-700/50">
        <div className="flex items-center gap-2">
          <Music className="text-[#1DB954]" />
          <h1 className="text-xl font-bold tracking-tight">Swipeify</h1>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <nav className="flex items-center gap-2">
                <button onClick={() => setView('swipe')} className={`p-2 rounded-md transition-colors ${view === 'swipe' ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                  <Music size={20} />
                </button>
                <button onClick={() => setView('discover')} className={`p-2 rounded-md transition-colors ${view === 'discover' ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                  <Compass size={20} />
                </button>
                 <button onClick={() => setView('suggest')} className={`p-2 rounded-md transition-colors ${view === 'suggest' ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                  <Users size={20} />
                </button>
                <button onClick={() => setView('likes')} className={`p-2 rounded-md transition-colors relative ${view === 'likes' ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                  <ListMusic size={20} />
                  {likedSongs.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#1DB954] text-xs font-bold text-black">
                      {likedSongs.length}
                    </span>
                  )}
                </button>
              </nav>
            <div className="flex items-center gap-3">
              <Profile userName={userDoc?.name ?? 'GitHub User'} spotifyProfile={spotifyProfile} />
              <SpotifyConnectButton status={spotifyStatus} />
                <LogoutButton onLogout={handleLogout} isLoading={authActionPending && !authLoading} />
              </div>
            </>
          ) : (
            <button
              onClick={handleGitHubSignIn}
              disabled={authActionPending}
              className="px-6 py-3 bg-[#1DB954] text-white rounded-full font-semibold hover:bg-[#1ed760] transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authActionPending ? 'Connecting…' : 'Continue with GitHub'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow relative flex flex-col items-center justify-center p-4 gap-6 overflow-y-auto">
        {renderContent()}
        {isAuthenticated && spotifyStatus === 'connected' && (
          <div className="flex w-full max-w-4xl flex-col items-center gap-6 pb-8">
            <TopTracksList
              tracks={spotifyTracks}
              isLoading={spotifyDataLoading}
              error={spotifyDataError}
              onRetry={handleSpotifyRetry}
            />
            <TopArtistsList
              artists={spotifyArtists}
              isLoading={spotifyDataLoading}
              error={spotifyDataError}
              onRetry={handleSpotifyRetry}
            />
          </div>
        )}
        {authError && isAuthenticated && (
          <p className="absolute bottom-4 text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-md">
            {authError}
          </p>
        )}
      </main>
    </div>
  );
};

export default App;