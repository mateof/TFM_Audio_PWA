import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  isConfigured: boolean;
  serverHost: string;
  serverPort: number;
  useHttps: boolean;

  setConfigured: (configured: boolean) => void;
  setServerInfo: (host: string, port: number, useHttps: boolean) => void;
  clearSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isConfigured: false,
      serverHost: '',
      serverPort: 5000,
      useHttps: false,

      setConfigured: (configured) => set({ isConfigured: configured }),
      setServerInfo: (host, port, useHttps) =>
        set({ serverHost: host, serverPort: port, useHttps, isConfigured: true }),
      clearSettings: () =>
        set({ isConfigured: false, serverHost: '', serverPort: 5000, useHttps: false })
    }),
    {
      name: 'tfm-settings-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
