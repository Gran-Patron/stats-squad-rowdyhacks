import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import { Search, Loader2, Plus, X, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FriendSuggestViewProps {
  onSuggestionsAdded: (songs: Song[]) => void;
  searchiTunesByQuery: (query: string) => Promise<Song[]>;
}

const SongListItem: React.FC<{ song: Song, onAction: () => void, actionIcon: React.ReactNode }> = ({ song, onAction, actionIcon }) => {
    return (
         <motion.li
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 p-2 rounded-lg"
        >
            <img src={song.albumArt} alt={song.title} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
                <p className="font-semibold truncate text-white">{song.title}</p>
                <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
            </div>
            <button onClick={onAction} className="p-2 text-zinc-400 hover:text-[#1DB954] transition-colors rounded-full hover:bg-zinc-700">
                {actionIcon}
            </button>
        </motion.li>
    )
}

export const FriendSuggestView: React.FC<FriendSuggestViewProps> = ({ onSuggestionsAdded, searchiTunesByQuery }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [suggestedSongs, setSuggestedSongs] = useState<Song[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    
    const ITEMS_PER_PAGE = 6;

    useEffect(() => {
        if (!query.trim()) {
            setSearchResults([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        const handleSearch = async (currentQuery: string) => {
            setIsLoading(true);
            setError(null);
            setCurrentPage(1); // Reset to first page on new search
            try {
                const results = await searchiTunesByQuery(currentQuery);
                const suggestedIds = new Set(suggestedSongs.map(s => s.id));
                const filteredResults = results.filter(r => !suggestedIds.has(r.id));
                setSearchResults(filteredResults);

                if (results.length === 0) {
                    setError("No songs found. Try another search.");
                }
            } catch (err) {
                setError("Failed to search for songs. Please try again.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimeout = setTimeout(() => {
            handleSearch(query.trim());
        }, 500);

        return () => clearTimeout(debounceTimeout);
    }, [query, searchiTunesByQuery, suggestedSongs]);


    const addSuggestion = (song: Song) => {
        setSuggestedSongs(prev => [song, ...prev]);
        setSearchResults(prev => prev.filter(s => s.id !== song.id));
    };

    const removeSuggestion = (songId: number) => {
        setSuggestedSongs(prev => prev.filter(s => s.id !== songId));
    };

    const handleFinish = () => {
        onSuggestionsAdded(suggestedSongs);
    };

    // Pagination logic
    const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedResults = searchResults.slice(startIndex, endIndex);

    const goToNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    return (
        <div className="w-full max-w-xl h-full flex flex-col p-4">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold mb-2 text-white flex items-center justify-center gap-2">
                    <Users/>
                    Friend Suggest
                </h2>
                <p className="text-zinc-400">Search for songs and add them to your friend's deck.</p>
            </div>
            
             <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for a song or artist..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-full py-3 px-6 pl-12 pr-12 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1DB954] transition-shadow"
                />
                {isLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-zinc-400" size={20} />
                    </div>
                )}
            </div>

            <div className="flex-1 grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col overflow-hidden bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <h3 className="font-bold text-lg mb-2 text-zinc-300">Search Results</h3>
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800">
                        {error && !isLoading && <p className="text-red-400 text-center mt-4">{error}</p>}
                        {searchResults.length === 0 && !error && !isLoading && query.trim() === '' && (
                           <p className="text-zinc-500 text-center mt-4">Search for music to get started.</p>
                        )}
                        {searchResults.length === 0 && !error && !isLoading && query.trim() !== '' && (
                           <p className="text-zinc-500 text-center mt-4">No results for "{query}"</p>
                        )}
                        <ul className="space-y-1">
                            <AnimatePresence>
                                {paginatedResults.map(song => (
                                    <SongListItem key={song.id} song={song} onAction={() => addSuggestion(song)} actionIcon={<Plus size={20} />} />
                                ))}
                            </AnimatePresence>
                        </ul>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 mt-auto border-t border-zinc-700">
                            <button 
                                onClick={goToPreviousPage} 
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm bg-zinc-700 rounded-md hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
                            >
                                Prev
                            </button>
                            <span className="text-sm text-zinc-400">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button 
                                onClick={goToNextPage} 
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm bg-zinc-700 rounded-md hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col overflow-hidden bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                     <h3 className="font-bold text-lg mb-2 text-zinc-300">
                        Suggestions ({suggestedSongs.length})
                     </h3>
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800">
                        {suggestedSongs.length === 0 && <p className="text-zinc-500 text-center mt-4">Added songs will appear here.</p>}
                        <ul className="space-y-1">
                            <AnimatePresence>
                                {suggestedSongs.map(song => (
                                    <SongListItem key={song.id} song={song} onAction={() => removeSuggestion(song.id)} actionIcon={<X size={20} />} />
                                ))}
                            </AnimatePresence>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6">
                <button 
                    onClick={handleFinish} 
                    disabled={suggestedSongs.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-[#1DB954] text-black font-semibold py-3 px-6 rounded-full hover:bg-[#1ed760] disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all transform active:scale-95"
                >
                    <Check size={20}/>
                    Add {suggestedSongs.length} {suggestedSongs.length === 1 ? 'Song' : 'Songs'} to Deck
                </button>
            </div>
        </div>
    );
};