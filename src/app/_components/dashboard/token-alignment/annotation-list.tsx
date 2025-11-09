'use client';

import type { Token } from '@/types/dashboard';

type AnnotationListProps = {
  sourceTokens: Token[];
  targetTokens: Token[];
};

type AnnotationItem = {
  type: 'source' | 'target';
  index: number;
  token: Token;
};

export function AnnotationList({
  sourceTokens,
  targetTokens,
}: AnnotationListProps) {
  // 收集所有有注释的词元
  const annotations: AnnotationItem[] = [];

  // 先添加文言词元的注释
  sourceTokens.forEach((token, index) => {
    if (token.annotation && token.annotation.trim().length > 0) {
      annotations.push({ type: 'source', index, token });
    }
  });

  // 再添加白话词元的注释
  targetTokens.forEach((token, index) => {
    if (token.annotation && token.annotation.trim().length > 0) {
      annotations.push({ type: 'target', index, token });
    }
  });

  if (annotations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        词元注释
      </div>
      <div className="space-y-2">
        {annotations.map((item) => (
          <div
            key={`${item.type}-${item.index}`}
            className="rounded border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.type === 'source'
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {item.type === 'source' ? '文' : '白'}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                {item.token.word || `词元 ${item.index + 1}`}
              </span>
            </div>
            <div className="text-xs leading-relaxed text-neutral-600">
              {item.token.annotation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
