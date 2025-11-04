'use client';

import { useState, type ChangeEvent } from 'react';
import type { RecordDetailPayload } from '@/types/dashboard';

type ImportRecordModalProps = {
  open: boolean;
  onClose: () => void;
  onImport: (payload: RecordDetailPayload) => Promise<boolean>;
};

type ValidationResult =
  | { ok: true; data: RecordDetailPayload }
  | { ok: false; error: string };


function validatePayload(raw: string): ValidationResult {
  if (!raw.trim()) {
    return { ok: false, error: '请输入 JSON 数据。' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON 解析失败，请确认格式。' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'JSON 顶层必须是对象。' };
  }

  const record = parsed as Partial<RecordDetailPayload>;

  if (typeof record.source !== 'string' || !record.source.trim()) {
    return { ok: false, error: 'source 必须是非空字符串。' };
  }
  if (record.target != null && typeof record.target !== 'string') {
    return { ok: false, error: 'target 必须是字符串或 null。' };
  }
  if (record.meta != null && typeof record.meta !== 'string') {
    return { ok: false, error: 'meta 必须是字符串或 null。' };
  }

  if (!Array.isArray(record.source_tokens) || record.source_tokens.length === 0) {
    return { ok: false, error: 'source_tokens 必须是非空数组。' };
  }
  if (!Array.isArray(record.target_tokens) || record.target_tokens.length === 0) {
    return { ok: false, error: 'target_tokens 必须是非空数组。' };
  }

  const normalizeTokens = (
    tokens: RecordDetailPayload['source_tokens'],
    name: 'source_tokens' | 'target_tokens',
  ) => {
    return tokens.map((token, index) => {
      if (typeof token !== 'object' || token === null) {
        throw new Error(`${name}[${index}] 必须是对象。`);
      }
      const { id, word, pos, syntax_role } = token as {
        id?: unknown;
        word?: unknown;
        pos?: unknown;
        syntax_role?: unknown;
      };
      if (typeof id !== 'number') {
        throw new Error(`${name}[${index}].id 必须是数字。`);
      }
      if (typeof word !== 'string') {
        throw new Error(`${name}[${index}].word 必须是字符串。`);
      }
      if (pos != null && typeof pos !== 'string') {
        throw new Error(`${name}[${index}].pos 必须是字符串或 null。`);
      }
      if (syntax_role != null && typeof syntax_role !== 'string') {
        throw new Error(`${name}[${index}].syntax_role 必须是字符串或 null。`);
      }
      return {
        id,
        word,
        pos: pos ?? null,
        syntax_role: syntax_role ?? null,
      };
    });
  };

  let normalizedSourceTokens;
  let normalizedTargetTokens;
  try {
    normalizedSourceTokens = normalizeTokens(record.source_tokens, 'source_tokens');
    normalizedTargetTokens = normalizeTokens(record.target_tokens, 'target_tokens');
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const ensureSequential = (tokens: { id: number }[], name: string) => {
    const ids = tokens.map((token) => token.id);
    const sorted = [...ids].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i] !== i + 1) {
        throw new Error(`${name} 的 id 必须从 1 开始连续递增。`);
      }
    }
  };

  try {
    ensureSequential(normalizedSourceTokens, 'source_tokens');
    ensureSequential(normalizedTargetTokens, 'target_tokens');
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const joinWords = (tokens: { word: string }[]) =>
    tokens.map((token) => token.word).join('');

  if (joinWords(normalizedSourceTokens) !== record.source) {
    return { ok: false, error: 'source_tokens 组合后与 source 不一致。' };
  }
  if (record.target != null && joinWords(normalizedTargetTokens) !== record.target) {
    return { ok: false, error: 'target_tokens 组合后与 target 不一致。' };
  }

  const alignments = Array.isArray(record.alignment) ? record.alignment : [];
  const sourceIdSet = new Set(normalizedSourceTokens.map((token) => token.id));
  const targetIdSet = new Set(normalizedTargetTokens.map((token) => token.id));

  for (let index = 0; index < alignments.length; index += 1) {
    const alignment = alignments[index];
    if (typeof alignment !== 'object' || alignment === null) {
      return { ok: false, error: `alignment[${index}] 必须是对象。` };
    }
    const { source_id, target_id, relation_type } = alignment as {
      source_id?: unknown;
      target_id?: unknown;
      relation_type?: unknown;
    };
    if (typeof source_id !== 'number' || !sourceIdSet.has(source_id)) {
      return { ok: false, error: `alignment[${index}].source_id 不存在于 source_tokens。` };
    }
    if (typeof target_id !== 'number' || !targetIdSet.has(target_id)) {
      return { ok: false, error: `alignment[${index}].target_id 不存在于 target_tokens。` };
    }
    if (typeof relation_type !== 'string' || relation_type.trim() === '') {
      return { ok: false, error: `alignment[${index}].relation_type 必须是字符串。` };
    }
  }

  return {
    ok: true,
    data: {
      id: typeof record.id === 'number' ? record.id : 0,
      source: record.source,
      target: record.target ?? null,
      meta: record.meta ?? null,
      source_tokens: normalizedSourceTokens,
      target_tokens: normalizedTargetTokens,
      alignment: alignments as RecordDetailPayload['alignment'],
    },
  };
}

export function ImportRecordModal({
  open,
  onClose,
  onImport,
}: ImportRecordModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [validation, setValidation] = useState<ValidationResult>({
    ok: false,
    error: '请输入 JSON 数据。',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (isSubmitting) return;
    const value = event.target.value;
    setInputValue(value);
    setValidation(validatePayload(value));
  };

  const handleSubmit = async () => {
    if (!validation.ok || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onImport(validation.data);
      if (success) {
        setInputValue('');
        setValidation({
          ok: false,
          error: '请输入 JSON 数据。',
        });
      }
    } catch (error) {
      console.error('导入失败', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-50 w-full max-w-2xl rounded-lg border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">导入条目数据</h2>
          <button
            onClick={onClose}
            className="rounded border border-transparent px-2 py-1 text-xs text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-700"
          >
            关闭
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm text-neutral-700">
          <p>
            粘贴符合数据结构的 JSON（例如{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5">
              {"{\"source\":\"...\",\"target\":\"...\",\"source_tokens\":[...],\"target_tokens\":[...],\"alignment\":[...]}"}
            </code>
            ）。成功提交后会在当前资料库中创建全新的条目并自动加载。
          </p>
          <textarea
            value={inputValue}
            onChange={handleChange}
            rows={18}
            placeholder='{"source":"...","target":"...","meta":"...","source_tokens":[...],"target_tokens":[...],"alignment":[...]}'
            disabled={isSubmitting}
            className={`w-full rounded border px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-neutral-100 ${validation.ok ? 'border-neutral-300 focus:border-blue-400' : 'border-red-400 focus:border-red-500'}`}
          />
          {!validation.ok && validation.error ? (
            <p className="text-xs text-red-500">{validation.error}</p>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-2 text-sm">
          <button
            onClick={onClose}
            className="rounded border border-neutral-300 px-3 py-1 text-neutral-600 transition hover:bg-neutral-100"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!validation.ok || isSubmitting}
            className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {isSubmitting ? (
              <>
                <span
                  className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
                导入中…
              </>
            ) : (
              '导入'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
