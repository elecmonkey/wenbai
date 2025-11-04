'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { RecordDetailPayload } from '@/types/dashboard';
import {
  recordImportJsonSchema,
  recordImportPrompt,
  validatePayload,
  type ValidationResult,
} from './import-record-utils';

type ImportRecordModalProps = {
  open: boolean;
  onClose: () => void;
  onImport: (payload: RecordDetailPayload) => Promise<boolean>;
};

type TimerHandleRef = { current: number | null };

const clearTimer = (ref: TimerHandleRef) => {
  if (ref.current) {
    window.clearTimeout(ref.current);
    ref.current = null;
  }
};

const triggerCopyFeedback = (
  setState: (value: 'idle' | 'success') => void,
  ref: TimerHandleRef,
) => {
  clearTimer(ref);
  setState('success');
  ref.current = window.setTimeout(() => {
    setState('idle');
    ref.current = null;
  }, 1200);
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败，尝试回退方案', error);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (execError) {
    console.error('document.execCommand copy 失败', execError);
  }

  document.body.removeChild(textarea);
  return successful;
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
  const [schemaExpanded, setSchemaExpanded] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [schemaCopyState, setSchemaCopyState] = useState<'idle' | 'success'>(
    'idle',
  );
  const [promptCopyState, setPromptCopyState] = useState<'idle' | 'success'>(
    'idle',
  );
  const schemaCopyTimerRef = useRef<number | null>(null);
  const promptCopyTimerRef = useRef<number | null>(null);

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

  const handleCopySchema = async () => {
    const success = await copyText(recordImportJsonSchema);
    if (success) {
      triggerCopyFeedback(setSchemaCopyState, schemaCopyTimerRef);
    } else {
      window.alert('复制失败，请手动选择内容复制。');
    }
  };

  const handleCopyPrompt = async () => {
    const success = await copyText(recordImportPrompt);
    if (success) {
      triggerCopyFeedback(setPromptCopyState, promptCopyTimerRef);
    } else {
      window.alert('复制失败，请手动选择内容复制。');
    }
  };

  useEffect(() => {
    return () => {
      clearTimer(schemaCopyTimerRef);
      clearTimer(promptCopyTimerRef);
    };
  }, []);

  if (!open) {
    return null;
  }

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
            粘贴符合数据结构的 JSON。成功提交后会在当前资料库中创建全新的条目并自动加载。
          </p>
          <div className="space-y-2">
            <div className="overflow-hidden rounded border border-neutral-200">
              <div className="flex items-center justify-between bg-neutral-50 px-3 py-2">
                <span className="text-sm font-medium text-neutral-700">
                  JSON Schema
                </span>
                <div className="flex items-center gap-2">
                  {schemaCopyState === 'success' ? (
                    <span className="text-xs text-green-600">已复制</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleCopySchema()}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100"
                  >
                    复制
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemaExpanded((expanded) => !expanded)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100"
                    aria-expanded={schemaExpanded}
                  >
                    {schemaExpanded ? '收起' : '展开'}
                  </button>
                </div>
              </div>
              {schemaExpanded ? (
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap bg-white px-3 py-2 text-xs leading-relaxed text-neutral-700">
                  {recordImportJsonSchema}
                </pre>
              ) : null}
            </div>
            <div className="overflow-hidden rounded border border-neutral-200">
              <div className="flex items-center justify-between bg-neutral-50 px-3 py-2">
                <span className="text-sm font-medium text-neutral-700">
                  大语言模型提示词
                </span>
                <div className="flex items-center gap-2">
                  {promptCopyState === 'success' ? (
                    <span className="text-xs text-green-600">已复制</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleCopyPrompt()}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100"
                  >
                    复制
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptExpanded((expanded) => !expanded)}
                    className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100"
                    aria-expanded={promptExpanded}
                  >
                    {promptExpanded ? '收起' : '展开'}
                  </button>
                </div>
              </div>
              {promptExpanded ? (
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap bg-white px-3 py-2 text-xs leading-relaxed text-neutral-700">
                  {recordImportPrompt}
                </pre>
              ) : null}
            </div>
          </div>
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
