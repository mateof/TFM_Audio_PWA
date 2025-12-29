import { apiClient, buildBaseUrl } from './client';
import type { ChannelFile, ApiResult } from '@/types/models';

export interface LocalFilesResponse {
  files: ChannelFile[];
  currentPath: string;
  parentPath: string | null;
}

export const localFilesApi = {
  async getFiles(path: string = '', params?: {
    page?: number;
    pageSize?: number;
    filter?: string;
    search?: string;
    sortBy?: string;
    sortDesc?: boolean;
  }): Promise<{ files: ChannelFile[]; totalCount: number; currentPath: string; parentPath: string | null }> {
    const client = await apiClient.getClient();
    const { data } = await client.get<ApiResult<LocalFilesResponse>>('/api/mobile/files/local', {
      params: {
        path: path || undefined,
        filter: params?.filter,
        searchText: params?.search,
        page: params?.page,
        pageSize: params?.pageSize,
        sortBy: params?.sortBy,
        sortDesc: params?.sortDesc
      }
    });
    return {
      files: data.data.files || data.data as unknown as ChannelFile[],
      totalCount: data.totalCount || (data.data.files?.length ?? 0),
      currentPath: data.data.currentPath || path,
      parentPath: data.data.parentPath || null
    };
  },

  async getStreamUrl(filePath: string): Promise<string> {
    const baseUrl = await buildBaseUrl();
    return `${baseUrl}/api/mobile/stream/local?path=${encodeURIComponent(filePath)}`;
  }
};
