'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import { useAuthStore } from '@/app/_stores/auth-store';
import {
  useRecordDetailQuery,
  useUpdateRecordMutation,
} from '@/app/_queries/records';
import { ApiError } from '@/lib/api-client';
import type { Alignment, RecordDetailPayload, Token } from '@/types/dashboard';
import { TokenAlignmentEditor } from './token-alignment-editor';

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
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const requireAuth = useAuthStore((state) => state.requireAuth);
  const handleUnauthorized = useAuthStore((state) => state.handleUnauthorized);

  const recordQuery = useRecordDetailQuery(activeRepoId, activeRecordId);
  const updateRecord = useUpdateRecordMutation();

  const [metaValue, setMetaValue] = useState('');
  const [sourceValue, setSourceValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [sourceTokens, setSourceTokens] = useState<Token[]>([]);
  const [targetTokens, setTargetTokens] = useState<Token[]>([]);
  const [alignment, setAlignment] = useState<Alignment[]>([]);
  const [copySourceFeedback, setCopySourceFeedback] = useState<'idle' | 'success'>('idle');
  const [copyTargetFeedback, setCopyTargetFeedback] = useState<'idle' | 'success'>('idle');

  const lastLoadedRecordId = useRef<number | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const copySourceTimerRef = useRef<number | null>(null);
  const copyTargetTimerRef = useRef<number | null>(null);

  const showCopySourceSuccess = useCallback(() => {
    if (copySourceTimerRef.current) {
      window.clearTimeout(copySourceTimerRef.current);
    }
    setCopySourceFeedback('success');
    copySourceTimerRef.current = window.setTimeout(() => {
      setCopySourceFeedback('idle');
      copySourceTimerRef.current = null;
    }, 600);
  }, []);

  const showCopyTargetSuccess = useCallback(() => {
    if (copyTargetTimerRef.current) {
      window.clearTimeout(copyTargetTimerRef.current);
    }
    setCopyTargetFeedback('success');
    copyTargetTimerRef.current = window.setTimeout(() => {
      setCopyTargetFeedback('idle');
      copyTargetTimerRef.current = null;
    }, 600);
  }, []);

  useEffect(() => {
    return () => {
      if (copySourceTimerRef.current) {
        window.clearTimeout(copySourceTimerRef.current);
      }
      if (copyTargetTimerRef.current) {
        window.clearTimeout(copyTargetTimerRef.current);
      }
    };
  }, []);

  const applyRecordData = useCallback(
    (detail: RecordDetailPayload | null) => {
      if (!detail) {
        setMetaValue('');
        setSourceValue('');
        setTargetValue('');
        setSourceTokens([]);
        setTargetTokens([]);
        setAlignment([]);
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
      setSourceTokens(
        detail.source_tokens ?? buildTokensFromValue(displaySource, []),
      );
      setTargetTokens(
        detail.target_tokens ?? buildTokensFromValue(displayTarget, []),
      );
      setAlignment(detail.alignment ?? []);
      setRecordDirty(false);
      lastLoadedRecordId.current = detail.id;
    },
    [setRecordDirty],
  );

  useEffect(() => {
    if (!recordQuery.isSuccess) {
      return;
    }

    if (
      recordDirty &&
      lastLoadedRecordId.current === recordQuery.data.id
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      applyRecordData(recordQuery.data);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [applyRecordData, recordDirty, recordQuery.data, recordQuery.isSuccess]);

  useEffect(() => {
    setRecordSaving(updateRecord.isPending);
  }, [setRecordSaving, updateRecord.isPending]);

  const setDirty = () => {
    if (!isAuthenticated) {
      return;
    }
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

  const showSaveError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status !== 401) {
      window.alert(error.message);
      return;
    }
    if (error instanceof Error) {
      window.alert(error.message);
      return;
    }
    window.alert('保存失败，请稍后再试。');
  }, []);

  const executeSave = useCallback(async () => {
    if (!activeRepoId || !activeRecordId) {
      throw new Error('未选择条目，无法保存。');
    }

    const sanitizedSource = stripSlashes(sourceValue).trim();
    if (!sanitizedSource) {
      throw new Error('文言原文不能为空。');
    }

    const sanitizedTarget = stripSlashes(targetValue).trim();
    const sanitizedMeta = metaValue.trim();

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
        meta: sanitizedMeta ? sanitizedMeta : null,
        source_tokens: nextSourceTokens,
        target_tokens: nextTargetTokens,
        alignment,
      },
    });

    setSourceTokens(nextSourceTokens);
    setTargetTokens(nextTargetTokens);
    setRecordDirty(false);
  }, [
    activeRecordId,
    activeRepoId,
    alignment,
    metaValue,
    sourceTokens,
    sourceValue,
    targetTokens,
    targetValue,
    updateRecord,
    setRecordDirty,
    setSourceTokens,
    setTargetTokens,
  ]);

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
      if (!isAuthenticated) {
        await requireAuth(async () => {
          try {
            await executeSave();
          } catch (error) {
            showSaveError(error);
          }
        });
        return false;
      }

      try {
        await executeSave();
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleUnauthorized(async () => {
            try {
              await executeSave();
            } catch (retryError) {
              showSaveError(retryError);
            }
          });
          return false;
        }

        showSaveError(error);
        return false;
      }
    })();

    savePromiseRef.current = promise.finally(() => {
      savePromiseRef.current = null;
    });

    return promise;
  }, [
    activeRecordId,
    activeRepoId,
    recordDirty,
    executeSave,
    isAuthenticated,
    requireAuth,
    handleUnauthorized,
    showSaveError,
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
          disabled={!recordDirty || updateRecord.isPending || !isAuthenticated}
          title={!isAuthenticated ? '请登录后保存修改' : undefined}
          className="rounded bg-emerald-500 px-3 py-1 font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          保存
        </button>
        <button
          onClick={handleReset}
          disabled={!recordDirty || !isAuthenticated}
          title={!isAuthenticated ? '请登录后撤销修改' : undefined}
          className="rounded border border-neutral-300 px-3 py-1 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          撤销更改
        </button>
        <span className="ml-auto text-xs text-neutral-500">
          当前条目：{sourceValue ? stripSlashes(sourceValue) : '未命名'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6 text-sm">
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-wide text-neutral-500">
                文言原文
              </label>
              <button
                type="button"
                onClick={() => {
                  const plain = stripSlashes(sourceValue).trim();
                  if (!plain) return;
                  void navigator.clipboard
                    .writeText(plain)
                    .then(() => {
                      showCopySourceSuccess();
                    })
                    .catch((error) => {
                      console.error('复制文言原文失败', error);
                    });
                }}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                {copySourceFeedback === 'success' ? '复制成功' : '复制原文'}
              </button>
            </div>
            <textarea
              value={sourceValue}
              readOnly={!isAuthenticated}
              onFocus={(event) => {
                if (!isAuthenticated) {
                  event.currentTarget.blur();
                }
              }}
              onChange={(event) => {
                if (!isAuthenticated) return;
                const nextValue = event.target.value;
                setSourceValue(nextValue);
                const nextTokens = buildTokensFromValue(
                  nextValue,
                  sourceTokens,
                );
                setSourceTokens(nextTokens);
                setAlignment((prev) =>
                  prev.filter((item) =>
                    nextTokens.some((token) => token.id === item.source_id),
                  ),
                );
                setDirty();
              }}
              rows={3}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-wide text-neutral-500">
                白话译文
              </label>
              <button
                type="button"
                onClick={() => {
                  const plain = stripSlashes(targetValue).trim();
                  if (!plain) return;
                  void navigator.clipboard
                    .writeText(plain)
                    .then(() => {
                      showCopyTargetSuccess();
                    })
                    .catch((error) => {
                      console.error('复制白话译文失败', error);
                    });
                }}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                {copyTargetFeedback === 'success' ? '复制成功' : '复制译文'}
              </button>
            </div>
            <textarea
              value={targetValue}
              readOnly={!isAuthenticated}
              onFocus={(event) => {
                if (!isAuthenticated) {
                  event.currentTarget.blur();
                }
              }}
              onChange={(event) => {
                if (!isAuthenticated) return;
                const nextValue = event.target.value;
                setTargetValue(nextValue);
                const nextTokens = buildTokensFromValue(
                  nextValue,
                  targetTokens,
                );
                setTargetTokens(nextTokens);
                setAlignment((prev) =>
                  prev.filter((item) =>
                    nextTokens.some((token) => token.id === item.target_id),
                  ),
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
              readOnly={!isAuthenticated}
              onFocus={(event) => {
                if (!isAuthenticated) {
                  event.currentTarget.blur();
                }
              }}
              onChange={(event) => {
                if (!isAuthenticated) return;
                setMetaValue(event.target.value);
                setDirty();
              }}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="如：《论语·学而》"
            />
          </section>

          <section className="pb-12">
            <TokenAlignmentEditor
              sourceTokens={sourceTokens}
              targetTokens={targetTokens}
              alignment={alignment}
              readOnly={!isAuthenticated}
              onUpdateSourceToken={(index, token) => {
                if (!isAuthenticated) return;
                setSourceTokens((prev) => {
                  const next = [...prev];
                  next[index] = token;
                  return next;
                });
                setRecordDirty(true);
              }}
              onUpdateTargetToken={(index, token) => {
                if (!isAuthenticated) return;
                setTargetTokens((prev) => {
                  const next = [...prev];
                  next[index] = token;
                  return next;
                });
                setRecordDirty(true);
              }}
              onAlignmentChange={(nextAlignment) => {
                if (!isAuthenticated) return;
                setAlignment(nextAlignment);
                setRecordDirty(true);
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
