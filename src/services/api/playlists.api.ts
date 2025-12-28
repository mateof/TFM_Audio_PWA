import { apiClient } from './client';
import type {
  Playlist,
  PlaylistDetail,
  ApiResult,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackRequest
} from '@/types/models';

export const playlistsApi = {
  async getAll(): Promise<Playlist[]> {
    const client = await apiClient.getClient();
    const { data } = await client.get<ApiResult<Playlist[]>>('/api/mobile/playlists');
    return data.data;
  },

  async getById(id: string): Promise<PlaylistDetail> {
    const client = await apiClient.getClient();
    const { data } = await client.get<ApiResult<PlaylistDetail>>(`/api/mobile/playlists/${id}`);
    return data.data;
  },

  async create(request: CreatePlaylistRequest): Promise<Playlist> {
    const client = await apiClient.getClient();
    const { data } = await client.post<ApiResult<Playlist>>('/api/mobile/playlists', request);
    return data.data;
  },

  async update(id: string, request: UpdatePlaylistRequest): Promise<Playlist> {
    const client = await apiClient.getClient();
    const { data } = await client.put<ApiResult<Playlist>>(`/api/mobile/playlists/${id}`, request);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    const client = await apiClient.getClient();
    await client.delete(`/api/mobile/playlists/${id}`);
  },

  async addTrack(playlistId: string, track: AddTrackRequest): Promise<void> {
    const client = await apiClient.getClient();
    await client.post(`/api/mobile/playlists/${playlistId}/tracks`, track);
  },

  async removeTrack(playlistId: string, fileId: string): Promise<void> {
    const client = await apiClient.getClient();
    await client.delete(`/api/mobile/playlists/${playlistId}/tracks/${fileId}`);
  },

  async reorderTracks(playlistId: string, trackIds: string[]): Promise<void> {
    const client = await apiClient.getClient();
    await client.put(`/api/mobile/playlists/${playlistId}/tracks/reorder`, { trackIds });
  }
};
