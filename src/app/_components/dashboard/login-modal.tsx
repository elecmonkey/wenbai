'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuthStore } from '@/app/_stores/auth-store';

export function LoginModal() {
  const login = useAuthStore((state) => state.login);
  const close = useAuthStore((state) => state.closeLoginModal);
  const clearError = useAuthStore((state) => state.clearLoginError);
  const loading = useAuthStore((state) => state.loginLoading);
  const error = useAuthStore((state) => state.loginError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const resetForm = () => {
    setUsername('');
    setPassword('');
    clearError();
  };

  const handleClose = () => {
    if (loading) {
      return;
    }
    resetForm();
    close();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      return;
    }
    try {
      await login({ username: trimmedUsername, password });
      resetForm();
    } catch {
      // 错误信息已由 store 处理
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">登录</h2>
          <button
            onClick={handleClose}
            className="rounded border border-transparent px-2 py-1 text-xs text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="关闭登录窗口"
            disabled={loading}
          >
            关闭
          </button>
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wide text-neutral-500">
              用户名
            </label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wide text-neutral-500">
              密码
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
