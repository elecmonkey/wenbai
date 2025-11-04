'use client';

import { create } from 'zustand';
import { apiRequest, ApiError } from '@/lib/api-client';

export type AuthUser = {
  id: number;
  username: string;
  displayName: string | null;
};

type AuthState = {
  user: AuthUser | null;
  initialized: boolean;
  loginModalOpen: boolean;
  loginLoading: boolean;
  loginError: string | null;
  pendingAction: (() => Promise<void>) | null;
  setUser: (user: AuthUser | null) => void;
  refreshSession: () => Promise<void>;
  requireAuth: (action?: () => Promise<void>) => Promise<boolean>;
  openLoginModal: (action?: () => Promise<void>) => void;
  closeLoginModal: () => void;
  clearLoginError: () => void;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  handleUnauthorized: (action?: () => Promise<void>) => void;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  initialized: false,
  loginModalOpen: false,
  loginLoading: false,
  loginError: null,
  pendingAction: null,
  setUser: (user) => set({ user }),
  refreshSession: async () => {
    if (get().initialized) {
      return;
    }
    try {
      const user = await apiRequest<AuthUser | null>('/api/auth/session');
      set({ user, initialized: true });
    } catch (error) {
      console.error('刷新登录状态失败', error);
      set({ user: null, initialized: true });
    }
  },
  requireAuth: async (action) => {
    const state = get();
    if (state.user) {
      if (action) {
        await action();
      }
      return true;
    }
    set({
      loginModalOpen: true,
      pendingAction: action ?? null,
      loginError: null,
    });
    return false;
  },
  openLoginModal: (action) =>
    set({
      loginModalOpen: true,
      pendingAction: action ?? null,
      loginError: null,
    }),
  closeLoginModal: () =>
    set({
      loginModalOpen: false,
    }),
  clearLoginError: () => set({ loginError: null }),
  handleUnauthorized: (action) =>
    set({
      user: null,
      loginModalOpen: true,
      pendingAction: action ?? null,
      loginError: null,
    }),
  login: async ({ username, password }) => {
    set({ loginLoading: true, loginError: null });
    try {
      const user = await apiRequest<AuthUser>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const pending = get().pendingAction;
      set({
        user,
        loginModalOpen: false,
        loginLoading: false,
        loginError: null,
        pendingAction: null,
      });

      if (pending) {
        try {
          await pending();
        } catch (error) {
          console.error('登录后执行操作失败', error);
          if (error instanceof ApiError) {
            window.alert(error.message);
          } else if (error instanceof Error) {
            window.alert(error.message);
          } else {
            window.alert('操作失败，请稍后再试。');
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : '登录失败，请稍后再试。';
      set({ loginError: message, loginLoading: false });
      throw error;
    }
  },
  logout: async () => {
    try {
      await apiRequest<void>('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('退出登录失败', error);
    } finally {
      set({
        user: null,
        pendingAction: null,
      });
    }
  },
}));
