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
import { TokenAlignmentEditor } from '@/app/_components/dashboard/token-alignment/token-alignment-editor';
import { RecordEditorToolbar } from './components/toolbar';
import { RecordEditorTextSection } from './components/text-section';
import { RecordEditorMetaField } from './components/meta-field';
import {
  buildTokensFromValue,
  joinTokensWithSlash,
  stripSlashes,
} from './utils';

export function RecordEditor() {
  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const activeRecordId = useDashboardStore((state) => state.activeRecordId);
  const recordDirty = useDashboardStore((state) => state.recordDirty);
  const recordSaving = useDashboardStore((state) => state.recordSaving);
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
  const [copyMetaFeedback, setCopyMetaFeedback] = useState<'idle' | 'success'>('idle');

  const lastLoadedRecordId = useRef<number | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const copySourceTimerRef = useRef<number | null>(null);
  const copyTargetTimerRef = useRef<number | null>(null);
  const copyMetaTimerRef = useRef<number | null>(null);
  const refreshing =
    recordQuery.isRefetching ||
    (recordQuery.isFetching && !recordQuery.isLoading);

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

  const showCopyMetaSuccess = useCallback(() => {
    if (copyMetaTimerRef.current) {
      window.clearTimeout(copyMetaTimerRef.current);
    }
    setCopyMetaFeedback('success');
    copyMetaTimerRef.current = window.setTimeout(() => {
      setCopyMetaFeedback('idle');
      copyMetaTimerRef.current = null;
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
      if (copyMetaTimerRef.current) {
        window.clearTimeout(copyMetaTimerRef.current);
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
    if (!recordQuery.isSuccess || recordQuery.isFetching) {
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
  }, [
    applyRecordData,
    recordDirty,
    recordQuery.data,
    recordQuery.isFetching,
    recordQuery.isSuccess,
  ]);

  useEffect(() => {
    setRecordSaving(updateRecord.isPending);
  }, [setRecordSaving, updateRecord.isPending]);

  const markDirty = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }
    if (!recordDirty) {
      setRecordDirty(true);
    }
  }, [isAuthenticated, recordDirty, setRecordDirty]);

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

  const handleRefresh = () => {
    void recordQuery.refetch();
  };

  const handleSourceChange = useCallback(
    (nextValue: string) => {
      if (!isAuthenticated) return;
      setSourceValue(nextValue);
      setSourceTokens((prevTokens) => {
        const nextTokens = buildTokensFromValue(nextValue, prevTokens);
        setAlignment((prevAlignment) =>
          prevAlignment.filter((item) =>
            nextTokens.some((token) => token.id === item.source_id),
          ),
        );
        return nextTokens;
      });
      markDirty();
    },
    [isAuthenticated, markDirty, setAlignment],
  );

  const handleTargetChange = useCallback(
    (nextValue: string) => {
      if (!isAuthenticated) return;
      setTargetValue(nextValue);
      setTargetTokens((prevTokens) => {
        const nextTokens = buildTokensFromValue(nextValue, prevTokens);
        setAlignment((prevAlignment) =>
          prevAlignment.filter((item) =>
            nextTokens.some((token) => token.id === item.target_id),
          ),
        );
        return nextTokens;
      });
      markDirty();
    },
    [isAuthenticated, markDirty, setAlignment],
  );

  const handleMetaChange = useCallback(
    (nextValue: string) => {
      if (!isAuthenticated) return;
      setMetaValue(nextValue);
      markDirty();
    },
    [isAuthenticated, markDirty],
  );

  const handleCopySource = useCallback(() => {
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
  }, [showCopySourceSuccess, sourceValue]);

  const handleCopyTarget = useCallback(() => {
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
  }, [showCopyTargetSuccess, targetValue]);

  const handleCopyMeta = useCallback(() => {
    const plain = metaValue.trim();
    if (!plain) return;
    void navigator.clipboard
      .writeText(plain)
      .then(() => {
        showCopyMetaSuccess();
      })
      .catch((error) => {
        console.error('复制元信息失败', error);
      });
  }, [metaValue, showCopyMetaSuccess]);

  const handleUpdateSourceToken = useCallback(
    (index: number, token: Token) => {
      if (!isAuthenticated) return;
      setSourceTokens((prev) => {
        const next = [...prev];
        next[index] = token;
        return next;
      });
      markDirty();
    },
    [isAuthenticated, markDirty],
  );

  const handleUpdateTargetToken = useCallback(
    (index: number, token: Token) => {
      if (!isAuthenticated) return;
      setTargetTokens((prev) => {
        const next = [...prev];
        next[index] = token;
        return next;
      });
      markDirty();
    },
    [isAuthenticated, markDirty],
  );

  const handleAlignmentChange = useCallback(
    (nextAlignment: Alignment[]) => {
      if (!isAuthenticated) return;
      setAlignment(nextAlignment);
      markDirty();
    },
    [isAuthenticated, markDirty],
  );

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

  const readOnly = !isAuthenticated;
  const currentTitle = stripSlashes(sourceValue).trim();
  const canSave = recordDirty && !updateRecord.isPending && isAuthenticated;
  const canReset = recordDirty && isAuthenticated;
  const canRefresh = !recordDirty && !recordSaving && !refreshing;

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
      <RecordEditorToolbar
        onSave={handleSave}
        onReset={handleReset}
        onRefresh={handleRefresh}
        canSave={canSave}
        canReset={canReset}
        canRefresh={canRefresh}
        refreshing={refreshing}
        isAuthenticated={isAuthenticated}
        currentTitle={currentTitle}
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6 text-sm">
          <RecordEditorTextSection
            label="文言原文"
            value={sourceValue}
            readOnly={readOnly}
            copyFeedback={copySourceFeedback}
            copyIdleLabel="复制原文"
            copySuccessLabel="复制成功"
            onCopy={handleCopySource}
            onChange={handleSourceChange}
          />

          <RecordEditorTextSection
            label="白话译文"
            value={targetValue}
            readOnly={readOnly}
            copyFeedback={copyTargetFeedback}
            copyIdleLabel="复制译文"
            copySuccessLabel="复制成功"
            onCopy={handleCopyTarget}
            onChange={handleTargetChange}
          />

          <RecordEditorMetaField
            value={metaValue}
            readOnly={readOnly}
            copyFeedback={copyMetaFeedback}
            onCopy={handleCopyMeta}
            onChange={handleMetaChange}
          />

          <section className="pb-12">
            <TokenAlignmentEditor
              sourceTokens={sourceTokens}
              targetTokens={targetTokens}
              alignment={alignment}
              readOnly={readOnly}
              onUpdateSourceToken={handleUpdateSourceToken}
              onUpdateTargetToken={handleUpdateTargetToken}
              onAlignmentChange={handleAlignmentChange}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
