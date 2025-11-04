import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from './prisma';

export const AUTH_COOKIE_NAME = 'wenbai_token';
export const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

let cachedSecret: string | null = null;

type TokenPayload = {
  sub: string;
  username: string;
  displayName?: string | null;
};

export type AuthUser = {
  id: number;
  username: string;
  displayName: string | null;
};

function isTokenPayload(value: unknown): value is TokenPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const payload = value as Partial<TokenPayload>;
  return (
    typeof payload.sub === 'string' &&
    typeof payload.username === 'string'
  );
}

const JWT_ALG = 'HS256';

async function getAuthSecret() {
  if (cachedSecret) {
    return cachedSecret;
  }
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('Missing AUTH_SECRET environment variable');
  }
  cachedSecret = secret;
  return secret;
}

export function signAuthToken(user: AuthUser) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('Missing AUTH_SECRET environment variable');
  }
  const payload: TokenPayload = {
    sub: String(user.id),
    username: user.username,
    displayName: user.displayName,
  };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SEVEN_DAYS_IN_SECONDS;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));
}

async function readToken(request?: NextRequest | Request | null) {
  if (request && 'cookies' in request) {
    const nextRequest = request as NextRequest;
    return nextRequest.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
  }

  try {
    const store = await cookies();
    return store.get(AUTH_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getAuthUser(
  request?: NextRequest | Request | null,
): Promise<AuthUser | null> {
  const token = await readToken(request);
  if (!token) {
    return null;
  }

  try {
    const secret = await getAuthSecret();
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: [JWT_ALG],
      },
    );
    if (!isTokenPayload(payload)) {
      return null;
    }

    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      cacheStrategy: { ttl: 0 },
      select: { id: true, username: true, displayName: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? null,
    };
  } catch (error) {
    console.error('Failed to verify auth token', error);
    return null;
  }
}

export const AUTH_COOKIE_BASE = {
  name: AUTH_COOKIE_NAME,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;
