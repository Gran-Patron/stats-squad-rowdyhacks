import React from 'react';
import { Song } from '../types';
import { BrainCircuit, Loader2, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LikedSongsViewProps {
  likedSongs: Song[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysisResult: string | null;
  error: string | null;
  clearError: () => void;
  onDelete: (songId: string) => void;
}

const VibeAnalysis: React.FC<{ analysisResult: string | null; isAnalyzing: boolean; onAnalyze: () => void; error: string | null; clearError: () => void; hasEnoughSongs: boolean; }> = 
({ analysisResult, isAnalyzing, onAnalyze, error, clearError, hasEnoughSongs }) => {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-[#1DB954] flex items-center gap-2">
          <BrainCircuit size={20} />
          Your Vibe Analysis
        </h3>
        <button 
          onClick={onAnalyze} 
          disabled={isAnalyzing || !hasEnoughSongs}
          className="px-4 py-2 text-sm font-semibold bg-[#1DB954] text-black rounded-full hover:bg-[#1ed760] disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? <Loader2 className="animate-spin" /> : 'Analyze'}
        </button>
      </div>

      <AnimatePresence>
        {error && (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-md text-sm flex justify-between items-center"
            >
                <span>{error}</span>
                <button onClick={clearError}><XCircle size={16} /></button>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 text-zinc-300 min-h-[60px]">
        {isAnalyzing ? (
            <p className="italic">AI is checking your vibe...</p>
        ) : analysisResult ? (
            <p className="whitespace-pre-wrap">{analysisResult}</p>
        ) : (
            <p className="italic text-zinc-400">Like 3+ songs then click 'Analyze' to discover your unique music taste!</p>
        )}
      </div>
    </div>
  );
};


const LikedSongItem: React.FC<{ song: Song; onDelete: () => void; }> = ({ song, onDelete }) => {
    return (
        <motion.li
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
        >
            <img src={song.albumArt} alt={song.title} className="w-12 h-12 rounded-md object-cover" />
            <div className="flex-1 overflow-hidden">
                <p className="font-semibold truncate">{song.title}</p>
                <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
            </div>
             <button 
                onClick={onDelete} 
                className="ml-auto p-1.5 text-zinc-500 rounded-full hover:bg-zinc-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`Remove ${song.title}`}
            >
                <X size={16} />
            </button>
        </motion.li>
    );
}

export const LikedSongsView: React.FC<LikedSongsViewProps> = ({ likedSongs, onAnalyze, isAnalyzing, analysisResult, error, clearError, onDelete }) => {
  return (
    <div className="w-full max-w-md h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-white">Your Liked Songs</h2>

      <VibeAnalysis 
        analysisResult={analysisResult}
        isAnalyzing={isAnalyzing}
        onAnalyze={onAnalyze}
        error={error}
        clearError={clearError}
        hasEnoughSongs={likedSongs.length >= 3}
      />
      
      {likedSongs.length > 0 ? (
        <ul className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800">
          <AnimatePresence>
            {likedSongs.map(song => <LikedSongItem key={song.id} song={song} onDelete={() => onDelete(song.id)} />)}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-400">
          <p className="text-lg">No liked songs yet.</p>
          <p>Go back and swipe right on some music!</p>
        </div>
      )}
    </div>
  );
};