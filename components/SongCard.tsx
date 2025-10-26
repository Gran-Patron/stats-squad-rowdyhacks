import React from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Song } from '../types';
import { Play, Pause } from 'lucide-react';

interface SongCardProps {
  song: Song;
  isActive: boolean;
  onSwipe: (direction: 'left' | 'right') => void;
  isPlaying: boolean;
  togglePlay: () => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, isActive, onSwipe, isPlaying, togglePlay }) => {
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isActive) return;
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  const cardVariants = {
    active: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3 },
    },
    inactive: {
      opacity: 0,
      y: 50,
      scale: 0.95,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      className="absolute w-full h-full"
      drag={isActive ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      variants={cardVariants}
      animate={isActive ? 'active' : 'inactive'}
      style={{
        transformOrigin: 'bottom center',
      }}
    >
      <div className="relative w-full h-full bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing">
        <img src={song.albumArt} alt={`${song.title} by ${song.artist}`} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h2 className="text-3xl font-bold truncate">{song.title}</h2>
          <p className="text-lg text-zinc-300 truncate">{song.artist}</p>
        </div>
        <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
                e.stopPropagation();
                togglePlay();
            }}
            className="w-14 h-14 bg-[#1DB954]/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-lg transition-transform transform hover:scale-110 active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};