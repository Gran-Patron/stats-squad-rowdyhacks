import React, { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';

interface DiscoverViewProps {
  onDiscover: (prompt: string) => void;
  onVibeDiscover: () => void;
  isDiscovering: boolean;
  error: string | null;
  hasLikedSongs: boolean;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({ onDiscover, onVibeDiscover, isDiscovering, error, hasLikedSongs }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim() && !isDiscovering) {
            onDiscover(query.trim());
        }
    };

    return (
        <div className="w-full max-w-md h-full flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-3xl font-bold mb-2 text-white">Discover New Music</h2>
            <p className="text-zinc-400 mb-8">Tell the AI what you're in the mood for.</p>
            
            <div className="w-full space-y-4">
              <form onSubmit={handleSubmit} className="w-full">
                  <div className="relative">
                      <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="e.g., '80s synth-pop' or 'rainy day indie'"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-full py-3 px-6 pr-12 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1DB954] transition-shadow"
                          disabled={isDiscovering}
                      />
                      <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-[#1DB954] transition-colors" disabled={isDiscovering || !query.trim()}>
                          <Search />
                      </button>
                  </div>
              </form>

              <div className="flex items-center w-full gap-4 text-zinc-500">
                <hr className="flex-grow border-zinc-700"/>
                <span>OR</span>
                <hr className="flex-grow border-zinc-700"/>
              </div>

              <button 
                onClick={onVibeDiscover}
                disabled={!hasLikedSongs || isDiscovering}
                className="w-full flex items-center justify-center gap-2 bg-[#1DB954] text-black font-semibold py-3 px-6 rounded-full hover:bg-[#1ed760] disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles size={18} />
                Suggest Songs Based On My Likes
              </button>
              {!hasLikedSongs && <p className="text-xs text-zinc-500 -mt-2">Like some songs first to enable this feature!</p>}
            </div>


            <div className="h-24 mt-4">
              {isDiscovering && (
                  <div className="mt-8 flex items-center gap-2 text-zinc-300">
                      <Loader2 className="animate-spin" />
                      <span>AI is curating your new playlist...</span>
                  </div>
              )}
              
              {error && !isDiscovering && (
                  <p className="mt-4 text-red-400 animate-pulse">{error}</p>
              )}
            </div>
            
            <div className="mt-auto text-zinc-500 text-sm">
                <h3 className="font-semibold text-zinc-400 mb-2">Some ideas to try:</h3>
                <p>"Upbeat workout pop"</p>
                <p>"Chill lofi beats for studying"</p>
                <p>"Indie artists like Phoebe Bridgers"</p>
            </div>
        </div>
    );
};