import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Radio, FolderOpen, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/common/Input';
import { LoadingScreen } from '@/components/common/Spinner';
import { channelsApi } from '@/services/api/channels.api';
import { useUiStore } from '@/stores/uiStore';
import type { Channel, ChannelFolder } from '@/types/models';

type Tab = 'all' | 'favorites' | 'folders';

export function ChannelsPage() {
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [folders, setFolders] = useState<ChannelFolder[]>([]);
  const [ungroupedChannels, setUngroupedChannels] = useState<Channel[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allChannels, favChannels, foldersData] = await Promise.all([
        channelsApi.getAll(),
        channelsApi.getFavorites(),
        channelsApi.getFolders()
      ]);

      setChannels(allChannels);
      setFavorites(favChannels);
      setFolders(foldersData.folders);
      setUngroupedChannels(foldersData.ungroupedChannels);
    } catch (error) {
      addToast('Failed to load channels', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (channel.isFavorite) {
        await channelsApi.removeFromFavorites(channel.id);
      } else {
        await channelsApi.addToFavorites(channel.id);
      }
      loadData();
    } catch {
      addToast('Failed to update favorite', 'error');
    }
  };

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFavorites = favorites.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'folders', label: 'Folders' }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Channels" />

      {/* Search */}
      <div className="px-4 py-3">
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingScreen message="Loading channels..." />
        ) : activeTab === 'all' ? (
          <ChannelList
            channels={filteredChannels}
            onToggleFavorite={toggleFavorite}
            onSelect={(ch) => navigate(`/channels/${ch.id}`)}
          />
        ) : activeTab === 'favorites' ? (
          <ChannelList
            channels={filteredFavorites}
            onToggleFavorite={toggleFavorite}
            onSelect={(ch) => navigate(`/channels/${ch.id}`)}
            emptyMessage="No favorite channels yet"
          />
        ) : (
          <FoldersList
            folders={folders}
            ungroupedChannels={ungroupedChannels}
            onSelectChannel={(ch) => navigate(`/channels/${ch.id}`)}
          />
        )}
      </div>
    </div>
  );
}

interface ChannelListProps {
  channels: Channel[];
  onToggleFavorite: (channel: Channel, e: React.MouseEvent) => void;
  onSelect: (channel: Channel) => void;
  emptyMessage?: string;
}

function ChannelList({ channels, onToggleFavorite, onSelect, emptyMessage }: ChannelListProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Radio className="w-12 h-12 mb-4 opacity-50" />
        <p>{emptyMessage || 'No channels found'}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-700">
      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => onSelect(channel)}
          className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors touch-manipulation text-left"
        >
          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <Radio className="w-6 h-6 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{channel.name}</p>
            <p className="text-sm text-slate-400">
              {channel.fileCount} files
            </p>
          </div>
          <button
            onClick={(e) => onToggleFavorite(channel, e)}
            className="p-2 touch-manipulation"
          >
            <Star
              className={`w-5 h-5 ${
                channel.isFavorite
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-slate-500'
              }`}
            />
          </button>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
      ))}
    </div>
  );
}

interface FoldersListProps {
  folders: ChannelFolder[];
  ungroupedChannels: Channel[];
  onSelectChannel: (channel: Channel) => void;
}

function FoldersList({ folders, ungroupedChannels, onSelectChannel }: FoldersListProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  const toggleFolder = (folderId: number) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  return (
    <div className="divide-y divide-slate-700">
      {folders.map((folder) => (
        <div key={folder.id}>
          <button
            onClick={() => toggleFolder(folder.id)}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors touch-manipulation"
          >
            <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
              {folder.iconEmoji || <FolderOpen className="w-6 h-6 text-slate-400" />}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">{folder.title}</p>
              <p className="text-sm text-slate-400">
                {folder.channelCount} channels
              </p>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-slate-500 transition-transform ${
                expandedFolders.has(folder.id) ? 'rotate-90' : ''
              }`}
            />
          </button>
          {expandedFolders.has(folder.id) && (
            <div className="bg-slate-800/50">
              {folder.channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  className="w-full flex items-center gap-4 p-4 pl-8 hover:bg-slate-700 transition-colors touch-manipulation"
                >
                  <Radio className="w-5 h-5 text-slate-400" />
                  <span className="flex-1 text-left text-white truncate">
                    {channel.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {ungroupedChannels.length > 0 && (
        <>
          <div className="px-4 py-2 bg-slate-800">
            <span className="text-xs text-slate-400 uppercase">Ungrouped</span>
          </div>
          {ungroupedChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors touch-manipulation"
            >
              <Radio className="w-5 h-5 text-slate-400" />
              <span className="flex-1 text-left text-white truncate">
                {channel.name}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          ))}
        </>
      )}
    </div>
  );
}
