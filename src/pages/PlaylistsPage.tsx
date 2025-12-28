import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListMusic, ChevronRight, Trash2 } from 'lucide-react';
import { Header, HeaderAction } from '@/components/layout/Header';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingScreen } from '@/components/common/Spinner';
import { playlistsApi } from '@/services/api/playlists.api';
import { useUiStore } from '@/stores/uiStore';
import type { Playlist } from '@/types/models';

export function PlaylistsPage() {
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await playlistsApi.getAll();
      setPlaylists(data);
    } catch (error) {
      addToast('Failed to load playlists', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      addToast('Please enter a playlist name', 'warning');
      return;
    }

    setCreating(true);
    try {
      await playlistsApi.create({ name: newPlaylistName.trim() });
      setNewPlaylistName('');
      setShowCreate(false);
      addToast('Playlist created!', 'success');
      loadPlaylists();
    } catch {
      addToast('Failed to create playlist', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${playlist.name}"?`)) return;

    try {
      await playlistsApi.delete(playlist.id);
      addToast('Playlist deleted', 'success');
      loadPlaylists();
    } catch {
      addToast('Failed to delete playlist', 'error');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Playlists"
        actions={
          <HeaderAction
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setShowCreate(true)}
            label="Create playlist"
          />
        }
      />

      {/* Create playlist form */}
      {showCreate && (
        <div className="p-4 bg-slate-800 border-b border-slate-700">
          <div className="flex gap-3">
            <Input
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleCreatePlaylist}
              loading={creating}
            >
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingScreen message="Loading playlists..." />
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <ListMusic className="w-12 h-12 mb-4 opacity-50" />
            <p className="mb-4">No playlists yet</p>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreate(true)}
            >
              Create Playlist
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => navigate(`/playlists/${playlist.id}`)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors touch-manipulation text-left cursor-pointer"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ListMusic className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{playlist.name}</p>
                  <p className="text-sm text-slate-400">
                    {playlist.trackCount} tracks
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeletePlaylist(playlist, e)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors touch-manipulation"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
