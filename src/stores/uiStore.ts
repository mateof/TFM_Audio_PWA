import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UiState {
  isPlayerExpanded: boolean;
  isQueueOpen: boolean;
  toasts: Toast[];
  isLoading: boolean;
  loadingMessage: string;

  setPlayerExpanded: (expanded: boolean) => void;
  togglePlayerExpanded: () => void;
  setQueueOpen: (open: boolean) => void;
  toggleQueue: () => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean, message?: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isPlayerExpanded: false,
  isQueueOpen: false,
  toasts: [],
  isLoading: false,
  loadingMessage: '',

  setPlayerExpanded: (expanded) => set({ isPlayerExpanded: expanded }),
  togglePlayerExpanded: () => set((s) => ({ isPlayerExpanded: !s.isPlayerExpanded })),
  setQueueOpen: (open) => set({ isQueueOpen: open }),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(7);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message })
}));
