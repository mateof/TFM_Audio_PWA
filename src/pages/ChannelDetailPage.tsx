import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Music, Video, FileText, Image, Folder, Play, Plus, ChevronRight, Download } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { LoadingScreen } from '@/components/common/Spinner';
import { PlaylistPicker } from '@/components/playlists/PlaylistPicker';
import { channelsApi } from '@/services/api/channels.api';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useUiStore } from '@/stores/uiStore';
import { formatFileSize } from '@/utils/format';
import { buildStreamUrlSync } from '@/services/api/client';
import { downloadManager, useDownloadStore } from '@/services/download/DownloadManager';
import { cacheService } from '@/services/cache/CacheService';
import type { ChannelDetail, ChannelFile, Track } from '@/types/models';

type FileCategory = 'All' | 'Audio' | 'Video' | 'Document' | 'Photo';

const categoryIcons: Record<string, React.ReactNode> = {
  Audio: <Music className="w-5 h-5" />,
  Video: <Video className="w-5 h-5" />,
  Document: <FileText className="w-5 h-5" />,
  Photo: <Image className="w-5 h-5" />,
  Folder: <Folder className="w-5 h-5" />
};

// Convert ChannelFile to Track
function fileToTrack(file: ChannelFile, channelId: string, channelName: string): Track {
  return {
    fileId: file.id,
    messageId: file.messageId,
    channelId: channelId,
    channelName: channelName,
    fileName: file.name,
    filePath: file.path,
    fileType: file.type,
    fileSize: file.size,
    order: 0,
    dateAdded: file.dateCreated,
    isLocalFile: false,
    streamUrl: file.streamUrl || buildStreamUrlSync(channelId, file.id, file.name),
    title: file.name.replace(/\.[^/.]+$/, '') // Remove extension
  };
}

// Folder breadcrumb item for navigation history
interface FolderBreadcrumb {
  id: string;
  name: string;
}

export function ChannelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useUiStore();
  const { play } = useAudioPlayer();
  const activeDownloads = useDownloadStore((state) => state.activeDownloads);

  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [files, setFiles] = useState<ChannelFile[]>([]);
  const [folderPath, setFolderPath] = useState<FolderBreadcrumb[]>([]);
  const [category, setCategory] = useState<FileCategory>('All');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [cachedTrackIds, setCachedTrackIds] = useState<Set<string>>(new Set());

  // Get current folder ID from URL params
  const currentFolderId = searchParams.get('folder') || undefined;

  // Parse folder path from URL
  const folderPathParam = searchParams.get('path');

  // Initialize folder path from URL on mount
  useEffect(() => {
    if (folderPathParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(folderPathParam));
        setFolderPath(parsed);
      } catch {
        setFolderPath([]);
      }
    } else {
      setFolderPath([]);
    }
  }, [folderPathParam]);

  useEffect(() => {
    if (id) {
      loadChannel();
      loadFiles();
    }
  }, [id, currentFolderId, category]);

  const loadChannel = async () => {
    try {
      const data = await channelsApi.getInfo(parseInt(id!));
      setChannel(data);
    } catch (error) {
      addToast('Failed to load channel', 'error');
      console.error(error);
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
      const filterValue = category === 'All' ? undefined : category.toLowerCase();
      const { files: data } = await channelsApi.getFiles(parseInt(id!), currentFolderId, {
        filter: filterValue
      });
      setFiles(data);

      // Check which audio files are cached
      const audioFiles = data.filter(f => f.category === 'Audio');
      const cachedIds = new Set<string>();
      for (const file of audioFiles) {
        const isCached = await cacheService.isTrackCached(file.id);
        if (isCached) cachedIds.add(file.id);
      }
      setCachedTrackIds(cachedIds);
    } catch (error) {
      addToast('Failed to load files', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: ChannelFile) => {
    if (file.category === 'Folder') {
      // Navigate into folder - update URL
      const newPath = [...folderPath, { id: file.id, name: file.name }];
      const params = new URLSearchParams(searchParams);
      params.set('folder', file.id);
      params.set('path', encodeURIComponent(JSON.stringify(newPath)));
      setSearchParams(params);
    } else if (file.category === 'Audio') {
      playAudioFile(file);
    }
  };

  const navigateToFolder = (index: number) => {
    const params = new URLSearchParams(searchParams);

    if (index === -1) {
      // Navigate to root
      params.delete('folder');
      params.delete('path');
    } else {
      // Navigate to specific folder in path
      const newPath = folderPath.slice(0, index + 1);
      params.set('folder', newPath[newPath.length - 1].id);
      params.set('path', encodeURIComponent(JSON.stringify(newPath)));
    }

    setSearchParams(params);
  };

  const playAudioFile = (file: ChannelFile) => {
    if (!channel) return;

    // Get all audio files for the queue
    const audioFiles = files.filter(f => f.category === 'Audio');
    const tracks = audioFiles.map(f => fileToTrack(f, id!, channel.name));
    const startIndex = audioFiles.findIndex(f => f.id === file.id);

    // Play the selected track with the queue
    const track = fileToTrack(file, id!, channel.name);
    play(track, tracks, startIndex >= 0 ? startIndex : 0);
  };

  const handleAddToPlaylist = (file: ChannelFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!channel) return;
    const track = fileToTrack(file, id!, channel.name);
    setSelectedTrack(track);
  };

  const handleDownload = async (file: ChannelFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!channel) return;

    const track = fileToTrack(file, id!, channel.name);
    await downloadManager.addToQueue(track);
    addToast('Added to download queue', 'info');
  };

  const categories: FileCategory[] = ['All', 'Audio', 'Video', 'Document', 'Photo'];

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={channel?.name || 'Channel'}
        subtitle={channel ? `${channel.fileCount} files` : undefined}
        showBack
      />

      {/* Category Filter */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      {folderPath.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm overflow-x-auto no-scrollbar">
          <button
            onClick={() => navigateToFolder(-1)}
            className="text-emerald-400 hover:underline"
          >
            Root
          </button>
          {folderPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-slate-500" />
              <button
                onClick={() => navigateToFolder(index)}
                className={index === folderPath.length - 1 ? 'text-white' : 'text-emerald-400 hover:underline'}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Files List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingScreen message="Loading files..." />
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Folder className="w-12 h-12 mb-4 opacity-50" />
            <p>No files found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {files.map((file) => (
              <div
                key={`${file.category}-${file.id}`}
                onClick={() => handleFileClick(file)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors touch-manipulation text-left cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    file.category === 'Folder'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : file.category === 'Audio'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : file.category === 'Video'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {categoryIcons[file.category] || <FileText className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {file.category !== 'Folder' && formatFileSize(file.size)}
                  </p>
                </div>
                {file.category === 'Audio' && (
                  <>
                    {/* Download button */}
                    {cachedTrackIds.has(file.id) ? (
                      <span className="p-2 text-emerald-400" title="Cached">
                        <Download className="w-5 h-5" />
                      </span>
                    ) : activeDownloads.has(file.id) ? (
                      <span className="p-2 text-amber-400 text-xs">
                        {activeDownloads.get(file.id)}%
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleDownload(file, e)}
                        className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleAddToPlaylist(file, e)}
                      className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"
                      title="Add to playlist"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudioFile(file);
                      }}
                      className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"
                      title="Play"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  </>
                )}
                {file.category === 'Folder' && (
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playlist Picker Modal */}
      {selectedTrack && (
        <PlaylistPicker
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
        />
      )}
    </div>
  );
}
