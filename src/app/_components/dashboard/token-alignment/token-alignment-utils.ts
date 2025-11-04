import type { Token } from '@/types/dashboard';

export const POS_SUGGESTIONS = [
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
];

export const SYNTAX_SUGGESTIONS = [
  '主语',
  '谓语',
  '宾语',
  '定语',
  '状语',
  '补语',
  '并列',
  '引用',
];

export const RELATION_SUGGESTIONS = ['语义', '字面', '语法'];

export const getTokenId = (token: Token, index: number) =>
  token.id ?? index + 1;

export const normalizeTokenAttribute = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeRelationValue = (value: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};
