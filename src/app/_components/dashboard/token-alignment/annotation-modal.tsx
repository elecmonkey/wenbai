'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

type AnnotationModalProps = {
  tokenWord: string;
  tokenType: 'source' | 'target';
  initialAnnotation?: string | null;
  onSave: (annotation: string | null) => void;
  onClose: () => void;
};

export function AnnotationModal({
  tokenWord,
  tokenType,
  initialAnnotation,
  onSave,
  onClose,
}: AnnotationModalProps) {
  const [value, setValue] = useState(initialAnnotation ?? '');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    onSave(trimmed.length > 0 ? trimmed : null);
    onClose();
  }, [value, onSave, onClose]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSave();
  };

  const typeLabel = tokenType === 'source' ? '文言' : '白话';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">
            {initialAnnotation ? '编辑注释' : '添加注释'}
          </h2>
          <button
            onClick={onClose}
            className="rounded border border-transparent px-2 py-1 text-xs text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="关闭"
          >
            关闭
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              tokenType === 'source'
                ? 'bg-orange-100 text-orange-600'
                : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {typeLabel}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-700">
            {tokenWord}
          </span>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wide text-neutral-500">
              注释内容
            </label>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full resize-none rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              rows={4}
              placeholder="输入注释内容..."
            />
            <div className="text-xs text-neutral-400">
              提示：按 Ctrl/⌘+Enter 快速保存
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded border border-blue-500 bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
