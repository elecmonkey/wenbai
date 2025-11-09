import type { Token } from '@/types/dashboard';

export const joinTokensWithSlash = (tokens: Token[] | undefined, fallback: string) => {
  if (tokens && tokens.length > 0) {
    return tokens
      .map((token) => (typeof token.word === 'string' ? token.word : ''))
      .filter(Boolean)
      .join('/');
  }
  return fallback ?? '';
};

export const normalizeWords = (raw: string) =>
  raw
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

export const buildTokensFromValue = (value: string, previous: Token[]) => {
  const words = normalizeWords(value);
  return words.map((word, index) => {
    const prev = previous[index];
    return {
      id: index + 1,
      word,
      pos: prev?.pos ?? null,
      syntax_role: prev?.syntax_role ?? null,
      annotation: prev?.annotation ?? null,
    };
  });
};

export const stripSlashes = (value: string) => value.replaceAll('/', '');
