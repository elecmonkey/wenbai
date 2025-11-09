import type { RecordDetailPayload } from '@/types/dashboard';

export type ValidationResult =
  | { ok: true; data: RecordDetailPayload }
  | { ok: false; error: string };

export const recordImportJsonSchema = `{
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
        "syntax_role": { "type": ["string", "null"] },
        "annotation": { "type": ["string", "null"] }
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

export const recordImportPrompt = `请根据以下要求生成严格符合 JSON Schema 的文言文-白话文对译数据：
1. 输出格式必须是单个 JSON 对象，不包含额外说明文字。
2. 字段要求：
   - source：文言原文全文（字符串，必填）。
   - target：对应的白话文译文（字符串，可为空但建议填写）。
   - meta：出处或备注（字符串，可为空）。
   - source_tokens：按原文顺序的字词分词数组，每项包含 id(从1开始递增整数)、word(字符串)、pos(词性，可为 null)、syntax_role(句法角色，可为 null)、annotation(注释，可为 null)。
   - target_tokens：按译文顺序的字词分词数组，字段同上。
   - alignment：数组，描述 source_tokens 与 target_tokens 的对应关系，每项包含 source_id、target_id、relation_type（字符串说明关系）。
3. source_tokens 拼接后的内容必须与 source 完全一致；target_tokens 拼接后需与 target 完全一致（忽略空 target 的情况）。
4. 确保 source_id、target_id 均引用各自 token 列表中存在的 id。
5. 推荐取值：pos 可选"名词""动词""形容词""副词""代词""数词""量词""连词""介词""助词""叹词""拟声词"；syntax_role 可选"主语""谓语""宾语""定语""状语""补语""并列""引用"；relation_type 可选"语义""字面""语法"。这些值仅作参考，若语料需要可填写其他明确的术语，但请避免为同一语法功能写出意思相同的多种表达。标点符号建议单独成词，但不设置词性、句法角色或对齐关系。
6. **注释使用原则**：annotation 字段用于解释词元的特殊含义、用典出处、文化背景等。**请保持克制，仅在必要时使用**，如：用典典故、特殊文化含义、通假字等场景。大多数普通词元应将 annotation 设为 null。避免为常见词汇添加注释。
示例：
{
  "id": 8,
  "source": "子曰：“不舍昼夜。”",
  "target": "孔子说：“日夜不停。”",
  "meta": "论语·子罕",
  "source_tokens": [
    { "id": 1, "word": "子", "pos": null, "syntax_role": null, "annotation": "指孔子" },
    { "id": 2, "word": "曰", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 3, "word": "：“", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 4, "word": "不", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 5, "word": "舍", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 6, "word": "昼夜", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 7, "word": "。”", "pos": null, "syntax_role": null, "annotation": null }
  ],
  "target_tokens": [
    { "id": 1, "word": "孔子", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 2, "word": "说", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 3, "word": "：“", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 4, "word": "日夜", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 5, "word": "不", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 6, "word": "停", "pos": null, "syntax_role": null, "annotation": null },
    { "id": 7, "word": "”。", "pos": null, "syntax_role": null, "annotation": null }
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

export function validatePayload(raw: string): ValidationResult {
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
      const { id, word, pos, syntax_role, annotation } = token as {
        id?: unknown;
        word?: unknown;
        pos?: unknown;
        syntax_role?: unknown;
        annotation?: unknown;
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
      if (annotation != null && typeof annotation !== 'string') {
        throw new Error(`${name}[${index}].annotation 必须是字符串或 null。`);
      }
      return {
        id,
        word,
        pos: pos ?? null,
        syntax_role: syntax_role ?? null,
        annotation: annotation ?? null,
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
    for (let index = 0; index < sorted.length; index += 1) {
      if (sorted[index] !== index + 1) {
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
