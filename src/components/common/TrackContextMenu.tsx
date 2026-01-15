import { X, ListPlus, Music } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Track } from '@/types/models';

interface TrackContextMenuProps {
  track: Track;
  onClose: () => void;
  onPlayNext: (track: Track) => void;
  coverArt?: string | null;
}

export function TrackContextMenu({ track, onClose, onPlayNext, coverArt }: TrackContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to prevent immediate close from the long press event
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as EventListener);
    }, 100);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [onClose]);

  const handlePlayNext = () => {
    onPlayNext(track);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-in fade-in duration-200">
      <div
        ref={menuRef}
        className="w-full max-w-lg bg-slate-800 rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Track info header */}
        <div className="flex items-center gap-4 p-4 border-b border-slate-700">
          <div className="w-14 h-14 bg-slate-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
            {coverArt ? (
              <img src={coverArt} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <Music className="w-7 h-7 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-white truncate">
              {track.title || track.fileName}
            </p>
            <p className="text-sm text-slate-400 truncate">
              {track.artist || track.channelName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu options */}
        <div className="py-2">
          <button
            onClick={handlePlayNext}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-700 transition-colors"
          >
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <ListPlus className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Play Next</p>
              <p className="text-sm text-slate-400">Add to queue after current track</p>
            </div>
          </button>
        </div>

        {/* Safe area padding for bottom */}
        <div className="h-6 bg-slate-800" />
      </div>
    </div>
  );
}

// Hook for long press detection
export function useLongPress(
  onLongPress: () => void,
  onClick?: () => void,
  { delay = 500 }: { delay?: number } = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;

    // Store start position for touch events
    if ('touches' in e) {
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  };

  const move = (e: React.TouchEvent) => {
    // Cancel long press if moved too much (scrolling)
    if (startPosRef.current && timerRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - startPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - startPosRef.current.y);

      if (deltaX > 10 || deltaY > 10) {
        clear();
      }
    }
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  };

  const end = (e: React.TouchEvent | React.MouseEvent) => {
    clear();

    // Only trigger click if it wasn't a long press
    if (!isLongPressRef.current && onClick) {
      // Prevent default to avoid double-firing on touch devices
      if ('touches' in e) {
        e.preventDefault();
      }
      onClick();
    }
  };

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
  };
}
