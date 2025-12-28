import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Shuffle, Download, Music, Trash2, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/common/Button';
import { LoadingScreen } from '@/components/common/Spinner';
import { playlistsApi } from '@/services/api/playlists.api';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useUiStore } from '@/stores/uiStore';
import { formatDuration, formatFileSize } from '@/utils/format';
import { downloadManager, useDownloadStore } from '@/services/download/DownloadManager';
import { cacheService } from '@/services/cache/CacheService';
import type { PlaylistDetail, Track } from '@/types/models';

export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useUiStore();
  const { play, currentTrack, isPlaying } = useAudioPlayer();
  const activeDownloads = useDownloadStore((state) => state.activeDownloads);

  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [cachedTrackIds, setCachedTrackIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlaylist();
    }
  }, [id]);

  const loadPlaylist = async () => {
    setLoading(true);
    try {
      const data = await playlistsApi.getById(id!);
      setPlaylist(data);

      // Check which tracks are cached
      const cachedIds = new Set<string>();
      for (const track of data.tracks) {
        const isCached = await cacheService.isTrackCached(track.fileId);
        if (isCached) cachedIds.add(track.fileId);
      }
      setCachedTrackIds(cachedIds);
    } catch (error) {
      addToast('Failed to load playlist', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (!playlist?.tracks.length) return;
    play(playlist.tracks[0], playlist.tracks, 0);
  };

  const handleShufflePlay = () => {
    if (!playlist?.tracks.length) return;
    // Shuffle the tracks and play
    const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
    play(shuffled[0], shuffled, 0);
  };

  const handleDownloadAll = async () => {
    if (!playlist?.tracks.length) return;

    // Filter out already cached tracks
    const tracksToDownload = playlist.tracks.filter(
      (track) => !cachedTrackIds.has(track.fileId)
    );

    if (tracksToDownload.length === 0) {
      addToast('All tracks already cached', 'info');
      return;
    }

    setDownloading(true);
    try {
      await downloadManager.addMultipleToQueue(tracksToDownload);
      addToast(`Added ${tracksToDownload.length} tracks to download queue`, 'success');
    } catch (error) {
      addToast('Failed to start downloads', 'error');
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadTrack = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    await downloadManager.addToQueue(track);
    addToast('Added to download queue', 'info');
  };

  const handlePlayTrack = (track: Track, index: number) => {
    if (!playlist) return;
    play(track, playlist.tracks, index);
  };

  const handleRemoveTrack = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove "${track.title || track.fileName}" from playlist?`)) return;

    try {
      await playlistsApi.removeTrack(id!, track.fileId);
      addToast('Track removed', 'success');
      loadPlaylist();
    } catch {
      addToast('Failed to remove track', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Playlist" showBack />
        <LoadingScreen message="Loading playlist..." />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Playlist" showBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Playlist not found</p>
        </div>
      </div>
    );
  }

  const totalDuration = playlist.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalSize = playlist.tracks.reduce((acc, t) => acc + t.fileSize, 0);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={playlist.name} subtitle={playlist.description} showBack />

      {/* Playlist Info & Actions */}
      <div className="p-4 bg-gradient-to-b from-slate-800 to-transparent">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <Music className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl">{playlist.name}</p>
            <p className="text-slate-400 text-sm">
              {playlist.trackCount} tracks • {formatDuration(totalDuration)}
            </p>
            <p className="text-slate-500 text-xs">{formatFileSize(totalSize)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            icon={<Play className="w-4 h-4" fill="currentColor" />}
            onClick={handlePlayAll}
            disabled={!playlist.tracks.length}
            className="flex-1"
          >
            Play All
          </Button>
          <Button
            variant="secondary"
            icon={<Shuffle className="w-4 h-4" />}
            onClick={handleShufflePlay}
            disabled={!playlist.tracks.length}
          >
            Shuffle
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadAll}
            disabled={!playlist.tracks.length || downloading}
          >
            {downloading ? 'Adding...' : cachedTrackIds.size === playlist.tracks.length ? 'Cached' : 'Download'}
          </Button>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        {playlist.tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Music className="w-12 h-12 mb-4 opacity-50" />
            <p>No tracks in this playlist</p>
            <p className="text-sm mt-2">Add tracks from channels</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {playlist.tracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.fileId === track.fileId;
              return (
                <div
                  key={track.fileId}
                  onClick={() => handlePlayTrack(track, index)}
                  className={`w-full flex items-center gap-4 p-4 transition-colors touch-manipulation text-left cursor-pointer ${
                    isCurrentTrack ? 'bg-emerald-500/10' : 'hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-6 text-center text-sm ${isCurrentTrack ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isCurrentTrack && isPlaying ? (
                      <div className="flex justify-center gap-0.5">
                        <div className="w-1 h-3 bg-emerald-400 animate-pulse" />
                        <div className="w-1 h-3 bg-emerald-400 animate-pulse delay-75" />
                        <div className="w-1 h-3 bg-emerald-400 animate-pulse delay-150" />
                      </div>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Music className={`w-5 h-5 ${isCurrentTrack ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isCurrentTrack ? 'text-emerald-400' : 'text-white'}`}>
                      {track.title || track.fileName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {track.artist || track.channelName}
                      {track.duration ? ` • ${formatDuration(track.duration)}` : ''}
                    </p>
                  </div>
                  {/* Download status */}
                  {cachedTrackIds.has(track.fileId) ? (
                    <span className="p-2 text-emerald-400" title="Cached">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : activeDownloads.has(track.fileId) ? (
                    <span className="p-2 text-amber-400 text-xs tabular-nums">
                      {activeDownloads.get(track.fileId)}%
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleDownloadTrack(track, e)}
                      className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleRemoveTrack(track, e)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
