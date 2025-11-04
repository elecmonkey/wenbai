'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { RecordDetailPayload } from '@/types/dashboard';

type ImportRecordModalProps = {
  open: boolean;
  onClose: () => void;
  onImport: (payload: RecordDetailPayload) => Promise<boolean>;
};

type ValidationResult =
  | { ok: true; data: RecordDetailPayload }
  | { ok: false; error: string };

const recordImportJsonSchema = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["source", "source_tokens", "target_tokens"],
  "properties": {
    "id": { "type": "integer" },
    "source": { "type": "string", "minLength": 1 },
    "target": { "type": ["string", "null"] },
    "meta": { "type": ["string", "null"] },
    "source_tokens": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/token" }
    },
    "target_tokens": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/token" }
    },
    "alignment": {
      "type": "array",
      "items": { "$ref": "#/definitions/alignment" }
    }
  },
  "additionalProperties": false,
  "definitions": {
    "token": {
      "type": "object",
      "required": ["id", "word"],
      "properties": {
        "id": { "type": "integer", "minimum": 1 },
        "word": { "type": "string", "minLength": 1 },
        "pos": { "type": ["string", "null"] },
        "syntax_role": { "type": ["string", "null"] }
      },
      "additionalProperties": false
    },
    "alignment": {
      "type": "object",
      "required": ["source_id", "target_id", "relation_type"],
      "properties": {
        "source_id": { "type": "integer", "minimum": 1 },
        "target_id": { "type": "integer", "minimum": 1 },
        "relation_type": { "type": "string", "minLength": 1 }
      },
      "additionalProperties": false
    }
  }
}`;

const recordImportPrompt = `请根据以下要求生成严格符合 JSON Schema 的文言文-白话文对译数据：
1. 输出格式必须是单个 JSON 对象，不包含额外说明文字。
2. 字段要求：
   - source：文言原文全文（字符串，必填）。
   - target：对应的白话文译文（字符串，可为空但建议填写）。
   - meta：出处或备注（字符串，可为空）。
   - source_tokens：按原文顺序的字词分词数组，每项包含 id(从1开始递增整数)、word(字符串)、pos(词性，可为 null)、syntax_role(句法角色，可为 null)。
   - target_tokens：按译文顺序的字词分词数组，字段同上。
   - alignment：数组，描述 source_tokens 与 target_tokens 的对应关系，每项包含 source_id、target_id、relation_type（字符串说明关系）。
3. source_tokens 拼接后的内容必须与 source 完全一致；target_tokens 拼接后需与 target 完全一致（忽略空 target 的情况）。
4. 确保 source_id、target_id 均引用各自 token 列表中存在的 id。
5. 推荐取值：pos 可选“名词”“动词”“形容词”“副词”“代词”“数词”“量词”“连词”“介词”“助词”“叹词”“拟声词”；syntax_role 可选“主语”“谓语”“宾语”“定语”“状语”“补语”“并列”“引用”；relation_type 可选“语义”“字面”“语法”。这些值仅作参考，若语料需要可填写其他明确的术语，但请避免为同一语法功能写出意思相同的多种表达。标点符号建议单独成词，但不设置词性、句法角色或对齐关系。
示例：
{
  "id": 8,
  "source": "子曰：“不舍昼夜。”",
  "target": "孔子说：“日夜不停”。",
  "meta": "论语·子罕",
  "source_tokens": [
    { "id": 1, "word": "子", "pos": null, "syntax_role": null },
    { "id": 2, "word": "曰", "pos": null, "syntax_role": null },
    { "id": 3, "word": "：“", "pos": null, "syntax_role": null },
    { "id": 4, "word": "不", "pos": null, "syntax_role": null },
    { "id": 5, "word": "舍", "pos": null, "syntax_role": null },
    { "id": 6, "word": "昼夜", "pos": null, "syntax_role": null },
    { "id": 7, "word": "。”", "pos": null, "syntax_role": null }
  ],
  "target_tokens": [
    { "id": 1, "word": "孔子", "pos": null, "syntax_role": null },
    { "id": 2, "word": "说", "pos": null, "syntax_role": null },
    { "id": 3, "word": "：“", "pos": null, "syntax_role": null },
    { "id": 4, "word": "日夜", "pos": null, "syntax_role": null },
    { "id": 5, "word": "不", "pos": null, "syntax_role": null },
    { "id": 6, "word": "停", "pos": null, "syntax_role": null },
    { "id": 7, "word": "”。", "pos": null, "syntax_role": null }
  ],
  "alignment": [
    { "source_id": 1, "target_id": 1, "relation_type": "语义" },
    { "source_id": 2, "target_id": 2, "relation_type": "语义" },
    { "source_id": 6, "target_id": 4, "relation_type": "语义" },
    { "source_id": 4, "target_id": 5, "relation_type": "语义" },
    { "source_id": 5, "target_id": 6, "relation_type": "语义" }
  ]
}
请生成如下内容：`;

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
