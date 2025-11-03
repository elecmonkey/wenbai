'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import {
  useRecordDetailQuery,
  useUpdateRecordMutation,
} from '@/app/_queries/records';
import { ApiError } from '@/lib/api-client';
import type { RecordDetailPayload, Token } from '@/types/dashboard';

const emptyJson = '[]';

const joinTokensWithSlash = (tokens: Token[] | undefined, fallback: string) => {
  if (tokens && tokens.length > 0) {
    return tokens
      .map((token) => (typeof token.word === 'string' ? token.word : ''))
      .filter(Boolean)
      .join('/');
  }
  return fallback ?? '';
};

const normalizeWords = (raw: string) =>
  raw
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const buildTokensFromValue = (value: string, previous: Token[]) => {
  const words = normalizeWords(value);
  return words.map((word, index) => {
    const prev = previous[index];
    return {
      id: index + 1,
      word,
      pos: prev?.pos ?? null,
      syntax_role: prev?.syntax_role ?? null,
    };
  });
};

const tokensToJson = (tokens: Token[]) =>
  JSON.stringify(tokens ?? [], null, 2);

const stripSlashes = (value: string) => value.replaceAll('/', '');

export function RecordEditor() {
  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const activeRecordId = useDashboardStore((state) => state.activeRecordId);
  const recordDirty = useDashboardStore((state) => state.recordDirty);
  const setRecordDirty = useDashboardStore((state) => state.setRecordDirty);
  const setRecordSaving = useDashboardStore((state) => state.setRecordSaving);
  const registerSaveHandler = useDashboardStore(
    (state) => state.registerSaveHandler,
  );

  const recordQuery = useRecordDetailQuery(activeRepoId, activeRecordId);
  const updateRecord = useUpdateRecordMutation();

  const [metaValue, setMetaValue] = useState('');
  const [sourceValue, setSourceValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [sourceTokens, setSourceTokens] = useState<Token[]>([]);
  const [targetTokens, setTargetTokens] = useState<Token[]>([]);
  const [alignmentValue, setAlignmentValue] = useState<string>(emptyJson);

  const lastLoadedRecordId = useRef<number | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);

  const applyRecordData = useCallback(
    (detail: RecordDetailPayload | null) => {
      if (!detail) {
        setMetaValue('');
        setSourceValue('');
        setTargetValue('');
        setSourceTokens([]);
        setTargetTokens([]);
        setAlignmentValue(emptyJson);
        setRecordDirty(false);
        lastLoadedRecordId.current = null;
        return;
      }

      setMetaValue(detail.meta ?? '');
      const displaySource = joinTokensWithSlash(
        detail.source_tokens ?? undefined,
        detail.source ?? '',
      );
      const displayTarget = joinTokensWithSlash(
        detail.target_tokens ?? undefined,
        detail.target ?? '',
      );
      setSourceValue(displaySource);
      setTargetValue(displayTarget);
      setSourceTokens(detail.source_tokens ?? buildTokensFromValue(displaySource, []));
      setTargetTokens(detail.target_tokens ?? buildTokensFromValue(displayTarget, []));
      setAlignmentValue(JSON.stringify(detail.alignment ?? [], null, 2));
      setRecordDirty(false);
      lastLoadedRecordId.current = detail.id;
    },
    [setRecordDirty],
  );

  useEffect(() => {
    if (!recordQuery.isSuccess) {
      if (!recordQuery.isFetching && !recordQuery.data) {
        applyRecordData(null);
      }
      return;
    }

    if (
      recordDirty &&
      lastLoadedRecordId.current === recordQuery.data.id
    ) {
      return;
    }

    applyRecordData(recordQuery.data);
  }, [
    applyRecordData,
    recordDirty,
    recordQuery.data,
    recordQuery.isFetching,
    recordQuery.isSuccess,
  ]);

  useEffect(() => {
    if (!activeRecordId) {
      applyRecordData(null);
    }
  }, [activeRecordId, applyRecordData]);

  useEffect(() => {
    setRecordSaving(updateRecord.isPending);
  }, [setRecordSaving, updateRecord.isPending]);

  const setDirty = () => {
    if (!recordDirty) {
      setRecordDirty(true);
    }
  };

  const disabledReason = useMemo(() => {
    if (!activeRepoId) {
      return '请选择一个资料库开始编辑。';
    }
    if (!activeRecordId) {
      return '当前资料库暂无条目，需要先创建。';
    }
    return null;
  }, [activeRecordId, activeRepoId]);

  const parseAlignmentJson = useCallback((raw: string) => {
    if (!raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('对齐关系必须是数组。');
      }
      return parsed;
    } catch (error) {
      throw new Error(
        `对齐关系解析失败：${(error as Error).message}`,
      );
    }
  }, []);

  const performSave = useCallback((): Promise<boolean> => {
    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }

    if (!activeRepoId || !activeRecordId) {
      return Promise.resolve(true);
    }

    if (!recordDirty) {
      return Promise.resolve(true);
    }

    const promise = (async () => {
      try {
        const alignment = parseAlignmentJson(alignmentValue);

        const sanitizedSource = stripSlashes(sourceValue).trim();
        if (!sanitizedSource) {
          window.alert('文言原文不能为空。');
          return false;
        }

        const sanitizedTarget = stripSlashes(targetValue).trim();

        const nextSourceTokens = buildTokensFromValue(
          sourceValue,
          sourceTokens,
        );
        const nextTargetTokens = buildTokensFromValue(
          targetValue,
          targetTokens,
        );

        await updateRecord.mutateAsync({
          repoId: activeRepoId,
          recordId: activeRecordId,
          data: {
            source: sanitizedSource,
            target: sanitizedTarget ? sanitizedTarget : null,
            meta: metaValue.trim() ? metaValue : null,
            source_tokens: nextSourceTokens,
            target_tokens: nextTargetTokens,
            alignment,
          },
        });

        setSourceTokens(nextSourceTokens);
        setTargetTokens(nextTargetTokens);
        setRecordDirty(false);
        return true;
      } catch (error) {
        if (error instanceof Error) {
          window.alert(error.message);
        } else {
          window.alert('保存失败，请稍后再试。');
        }
        return false;
      }
    })();

    savePromiseRef.current = promise.finally(() => {
      savePromiseRef.current = null;
    });

    return savePromiseRef.current;
  }, [
    activeRecordId,
    activeRepoId,
    alignmentValue,
    metaValue,
    parseAlignmentJson,
    recordDirty,
    sourceTokens,
    sourceValue,
    targetTokens,
    targetValue,
    updateRecord,
    setRecordDirty,
    setSourceTokens,
    setTargetTokens,
  ]);

  const handleSave = useCallback(() => performSave(), [performSave]);

  const handleReset = () => {
    applyRecordData(recordQuery.data ?? null);
  };

  useEffect(() => {
    registerSaveHandler(() => performSave());
    return () => {
      registerSaveHandler(null);
    };
  }, [performSave, registerSaveHandler]);

  useEffect(() => {
    if (!activeRepoId || !activeRecordId) {
      return;
    }
    const timer = window.setInterval(() => {
      void performSave();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [activeRepoId, activeRecordId, performSave]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void performSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [performSave]);

  if (disabledReason) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
        {disabledReason}
      </div>
    );
  }

  if (recordQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
        正在加载条目详情…
      </div>
    );
  }

  if (recordQuery.isError) {
    const message =
      recordQuery.error instanceof ApiError
        ? recordQuery.error.message
        : '无法获取条目详情。';
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-red-400">
        {message}
      </div>
    );
  }

  if (!recordQuery.data) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
        未找到条目详情。
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3 text-sm">
        <button
          onClick={handleSave}
          disabled={!recordDirty || updateRecord.isPending}
          className="rounded bg-emerald-500 px-3 py-1 font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-200"
        >
          保存
        </button>
        <button
          onClick={handleReset}
          disabled={!recordDirty}
          className="rounded border border-neutral-300 px-3 py-1 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          撤销更改
        </button>
        <span className="ml-auto text-xs text-neutral-500">
          当前条目：{sourceValue ? stripSlashes(sourceValue) : '未命名'}
        </span>
      </div>

      <div className="grid flex-1 grid-rows-[auto_auto_auto_1fr] gap-4 overflow-y-auto px-6 py-6 text-sm">
        <section className="space-y-2">
          <label className="block text-xs uppercase tracking-wide text-neutral-500">
            文言原文
          </label>
          <textarea
            value={sourceValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSourceValue(nextValue);
              setSourceTokens((prev) =>
                buildTokensFromValue(nextValue, prev),
              );
              setDirty();
            }}
            rows={3}
            className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </section>

        <section className="space-y-2">
          <label className="block text-xs uppercase tracking-wide text-neutral-500">
            白话译文
          </label>
          <textarea
            value={targetValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              setTargetValue(nextValue);
              setTargetTokens((prev) =>
                buildTokensFromValue(nextValue, prev),
              );
              setDirty();
            }}
            rows={3}
            className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </section>

        <section className="space-y-2">
          <label className="block text-xs uppercase tracking-wide text-neutral-500">
            元信息
          </label>
          <input
            value={metaValue}
            onChange={(event) => {
              setMetaValue(event.target.value);
              setDirty();
            }}
            className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="如：《论语·学而》"
          />
        </section>

        <section className="flex flex-col gap-4 pb-12">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs uppercase tracking-wide text-neutral-500">
              <span>词汇与对齐标注</span>
            </div>
            <div className="text-xs text-neutral-400">
              使用 JSON 数组格式进行编辑
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col rounded border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-3 py-2 text-xs uppercase tracking-wide text-neutral-500">
                文言词汇
              </div>
              <textarea
                value={tokensToJson(sourceTokens)}
                readOnly
                className="h-48 w-full flex-1 rounded-b bg-transparent px-3 py-2 text-xs leading-relaxed text-neutral-800 outline-none"
              />
            </div>

            <div className="flex flex-col rounded border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-3 py-2 text-xs uppercase tracking-wide text-neutral-500">
                白话词汇
              </div>
              <textarea
                value={tokensToJson(targetTokens)}
                readOnly
                className="h-48 w-full flex-1 rounded-b bg-transparent px-3 py-2 text-xs leading-relaxed text-neutral-800 outline-none"
              />
            </div>

            <div className="flex flex-col rounded border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-3 py-2 text-xs uppercase tracking-wide text-neutral-500">
                对齐关系
              </div>
              <textarea
                value={alignmentValue}
                onChange={(event) => {
                  setAlignmentValue(event.target.value);
                  setDirty();
                }}
                className="h-48 w-full flex-1 rounded-b bg-transparent px-3 py-2 text-xs leading-relaxed text-neutral-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
