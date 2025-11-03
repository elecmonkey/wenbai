'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Alignment, Token } from '@/types/dashboard';

const POS_OPTIONS = [
  '-',
  '名词',
  '动词',
  '形容词',
  '副词',
  '代词',
  '数词',
  '量词',
  '连词',
  '介词',
  '助词',
  '叹词',
  '拟声词',
  '其他',
];

const SYNTAX_OPTIONS = [
  '-',
  '主语',
  '谓语',
  '宾语',
  '定语',
  '状语',
  '补语',
  '并列',
  '引用',
  '其他',
];

const RELATION_OPTIONS = ['语义', '字面', '语法', '其他'];

type TokenAlignmentEditorProps = {
  sourceTokens: Token[];
  targetTokens: Token[];
  alignment: Alignment[];
  onUpdateSourceToken: (index: number, token: Token) => void;
  onUpdateTargetToken: (index: number, token: Token) => void;
  onAlignmentChange: (alignment: Alignment[]) => void;
};

type LineSegment = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  relation: string;
};

const toSelectValue = (value?: string | null) => (value && value.length > 0 ? value : '-');
const getTokenId = (token: Token, index: number) => token.id ?? index + 1;

export function TokenAlignmentEditor({
  sourceTokens,
  targetTokens,
  alignment,
  onUpdateSourceToken,
  onUpdateTargetToken,
  onAlignmentChange,
}: TokenAlignmentEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sourceRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const targetRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [pendingSourceId, setPendingSourceId] = useState<number | null>(null);
  const [pendingTargetId, setPendingTargetId] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [lineSegments, setLineSegments] = useState<LineSegment[]>([]);

  const computeLayout = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    const content = contentRef.current;
    if (!scrollContainer || !content) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    const segments: LineSegment[] = [];

    alignment.forEach((item) => {
      const sourceEl = sourceRefs.current[item.source_id];
      const targetEl = targetRefs.current[item.target_id];
      if (!sourceEl || !targetEl) return;

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      segments.push({
        key: `${item.source_id}-${item.target_id}`,
        x1: sourceRect.left - contentRect.left + sourceRect.width / 2,
        y1: sourceRect.top - contentRect.top + sourceRect.height / 2,
        x2: targetRect.left - contentRect.left + targetRect.width / 2,
        y2: targetRect.top - contentRect.top + targetRect.height / 2,
        relation: item.relation_type,
      });
    });

    setCanvasSize({
      width: Math.max(content.scrollWidth, containerRect.width),
      height: Math.max(content.scrollHeight, containerRect.height),
    });
    setLineSegments(segments);
  }, [alignment]);

  useLayoutEffect(() => {
    computeLayout();
  }, [computeLayout, sourceTokens, targetTokens]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => computeLayout();
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [computeLayout]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => computeLayout());
    observer.observe(content);
    return () => observer.disconnect();
  }, [computeLayout]);

  const toggleAlignment = useCallback(
    (sourceId: number, targetId: number) => {
      const exists = alignment.some(
        (item) => item.source_id === sourceId && item.target_id === targetId,
      );
      if (exists) {
        onAlignmentChange(
          alignment.filter(
            (item) => !(item.source_id === sourceId && item.target_id === targetId),
          ),
        );
      } else {
        onAlignmentChange([
          ...alignment,
          { source_id: sourceId, target_id: targetId, relation_type: '语义' },
        ]);
      }
    },
    [alignment, onAlignmentChange],
  );

  const handleSourceClick = useCallback(
    (tokenId: number) => {
      if (pendingSourceId === tokenId) {
        setPendingSourceId(null);
        return;
      }
      if (pendingTargetId !== null) {
        toggleAlignment(tokenId, pendingTargetId);
        setPendingSourceId(null);
        setPendingTargetId(null);
        return;
      }
      setPendingSourceId(tokenId);
    },
    [pendingSourceId, pendingTargetId, toggleAlignment],
  );

  const handleTargetClick = useCallback(
    (tokenId: number) => {
      if (pendingTargetId === tokenId) {
        setPendingTargetId(null);
        return;
      }
      if (pendingSourceId !== null) {
        toggleAlignment(pendingSourceId, tokenId);
        setPendingSourceId(null);
        setPendingTargetId(null);
        return;
      }
      setPendingTargetId(tokenId);
    },
    [pendingSourceId, pendingTargetId, toggleAlignment],
  );

  const highlightSource = useCallback(
    (tokenId: number) => {
      if (pendingSourceId === tokenId) {
        return 'border-blue-600 bg-blue-100 text-blue-900';
      }
      return alignment.some((item) => item.source_id === tokenId)
        ? 'border-blue-300 bg-blue-50 text-blue-700'
        : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200';
    },
    [alignment, pendingSourceId],
  );

  const highlightTarget = useCallback(
    (tokenId: number) => {
      if (pendingTargetId === tokenId) {
        return 'border-blue-600 bg-blue-100 text-blue-900';
      }
      return alignment.some((item) => item.target_id === tokenId)
        ? 'border-blue-300 bg-blue-50 text-blue-700'
        : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200';
    },
    [alignment, pendingTargetId],
  );

  const handleRelationChange = useCallback(
    (index: number, value: string) => {
      onAlignmentChange(
        alignment.map((item, idx) =>
          idx === index ? { ...item, relation_type: value } : item,
        ),
      );
    },
    [alignment, onAlignmentChange],
  );

  const handleRemoveAlignment = useCallback(
    (index: number) => {
      onAlignmentChange(alignment.filter((_, idx) => idx !== index));
    },
    [alignment, onAlignmentChange],
  );

  const renderPosSelect = useCallback(
    (
      token: Token,
      index: number,
      type: 'source' | 'target',
      onUpdate: (index: number, token: Token) => void,
    ) => (
      <select
        value={toSelectValue(token.pos)}
        onChange={(event) =>
          onUpdate(index, {
            ...token,
            pos: event.target.value === '-' ? null : event.target.value,
          })
        }
        className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 focus:border-blue-400 focus:outline-none"
      >
        {POS_OPTIONS.map((option) => (
          <option key={`${type}-pos-${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    ),
    [],
  );

  const renderSyntaxSelect = useCallback(
    (
      token: Token,
      index: number,
      type: 'source' | 'target',
      onUpdate: (index: number, token: Token) => void,
    ) => (
      <select
        value={toSelectValue(token.syntax_role)}
        onChange={(event) =>
          onUpdate(index, {
            ...token,
            syntax_role: event.target.value === '-' ? null : event.target.value,
          })
        }
        className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 focus:border-blue-400 focus:outline-none"
      >
        {SYNTAX_OPTIONS.map((option) => (
          <option key={`${type}-syntax-${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    ),
    [],
  );

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        词汇与对齐标注
      </div>

      <div className="relative -mx-2 overflow-hidden px-2">
        <div
          ref={scrollContainerRef}
          className="relative max-w-full overflow-x-auto"
        >
          <div
            ref={contentRef}
            className="relative inline-flex min-w-max flex-col px-6 py-8"
          >
            {canvasSize.width > 0 && canvasSize.height > 0 && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                width={canvasSize.width}
                height={canvasSize.height}
              >
                {lineSegments.map((line) => (
                  <line
                    key={line.key}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                ))}
              </svg>
            )}

            <div className="flex min-w-max flex-nowrap justify-start gap-6 pb-14">
              {sourceTokens.length === 0 ? (
                <span className="text-xs text-neutral-400">暂无文言词元</span>
              ) : (
                sourceTokens.map((token, index) => {
                  const tokenId = getTokenId(token, index);
                  return (
                    <div key={tokenId} className="flex flex-col items-center gap-2">
                      <div className="flex gap-2">
                        {renderPosSelect(token, index, 'source', onUpdateSourceToken)}
                        {renderSyntaxSelect(token, index, 'source', onUpdateSourceToken)}
                      </div>
                      <button
                        ref={(element) => {
                          sourceRefs.current[tokenId] = element;
                        }}
                        onClick={() => handleSourceClick(tokenId)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition ${highlightSource(tokenId)}`}
                      >
                        {token.word || `词元 ${index + 1}`}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex min-w-max flex-nowrap justify-start gap-6 pt-14">
              {targetTokens.length === 0 ? (
                <span className="text-xs text-neutral-400">暂无白话词元</span>
              ) : (
                targetTokens.map((token, index) => {
                  const tokenId = getTokenId(token, index);
                  return (
                    <div key={tokenId} className="flex flex-col items-center gap-2">
                      <button
                        ref={(element) => {
                          targetRefs.current[tokenId] = element;
                        }}
                        onClick={() => handleTargetClick(tokenId)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition ${highlightTarget(tokenId)}`}
                      >
                        {token.word || `词元 ${index + 1}`}
                      </button>
                      <div className="flex gap-2">
                        {renderPosSelect(token, index, 'target', onUpdateTargetToken)}
                        {renderSyntaxSelect(token, index, 'target', onUpdateTargetToken)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded border border-neutral-200 bg-neutral-50 p-3">
        <div className="text-xs uppercase tracking-wide text-neutral-500">对齐列表</div>
        {alignment.length === 0 ? (
          <div className="text-xs text-neutral-400">
            暂无对齐关系，点击上方词元创建。
          </div>
        ) : (
          alignment.map((item, index) => {
            const sourceToken = sourceTokens.find(
              (token, tokenIndex) => getTokenId(token, tokenIndex) === item.source_id,
            );
            const targetToken = targetTokens.find(
              (token, tokenIndex) => getTokenId(token, tokenIndex) === item.target_id,
            );
            return (
              <div
                key={`${item.source_id}-${item.target_id}`}
                className="flex flex-wrap items-center gap-3 rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
              >
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                  {sourceToken?.word || `词元 ${item.source_id}`}
                </span>
                <span className="text-neutral-400">→</span>
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                  {targetToken?.word || `词元 ${item.target_id}`}
                </span>
                <select
                  value={item.relation_type ?? '语义'}
                  onChange={(event) => handleRelationChange(index, event.target.value)}
                  className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 focus:border-blue-400 focus:outline-none"
                >
                  {RELATION_OPTIONS.map((option) => (
                    <option key={`relation-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemoveAlignment(index)}
                  className="ml-auto rounded border border-transparent px-2 py-1 text-xs text-neutral-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  删除
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
