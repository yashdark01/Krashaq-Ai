'use client';

import { getBrowserApiBaseUrl } from '@/lib/api/base-url';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

let refreshPromise: Promise<string | null> | null = null;

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  window.dispatchEvent(new CustomEvent('krashaq:auth-tokens-updated'));
}

export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('user');
}

async function refreshTokensOnce(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${getBrowserApiBaseUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearStoredTokens();
    return null;
  }

  const data = await res.json();
  if (data.access_token && data.refresh_token) {
    storeTokens(data.access_token, data.refresh_token);
    return data.access_token as string;
  }
  return null;
}

export async function refreshAccessTokenClient(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshTokensOnce().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export interface AuthenticatedFetchOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

/**
 * Fetch with Bearer token; on 401 attempts one refresh + retry.
 */
export async function authenticatedFetch(
  input: string,
  init: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { skipAuth, skipRefresh, headers, ...rest } = init;
  const url = input.startsWith('http') ? input : `${getBrowserApiBaseUrl()}${input}`;

  const buildHeaders = (token: string | null) => {
    const h = new Headers(headers);
    if (!skipAuth && token) {
      h.set('Authorization', `Bearer ${token}`);
    }
    if (!h.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
      h.set('Content-Type', 'application/json');
    }
    return h;
  };

  let accessToken = skipAuth ? null : getStoredAccessToken();
  let response = await fetch(url, { ...rest, headers: buildHeaders(accessToken) });

  if (response.status === 401 && !skipAuth && !skipRefresh) {
    const newToken = await refreshAccessTokenClient();
    if (newToken) {
      response = await fetch(url, { ...rest, headers: buildHeaders(newToken) });
    }
  }

  return response;
}

/** Proactive refresh at 80% of access token TTL (default 30 min → refresh at 24 min) */
export function scheduleProactiveRefresh(expireMinutes = 30) {
  if (typeof window === 'undefined') return () => {};
  const intervalMs = Math.max(60_000, expireMinutes * 60_000 * 0.8);
  const id = window.setInterval(() => {
    if (getStoredRefreshToken()) {
      refreshAccessTokenClient().catch(console.error);
    }
  }, intervalMs);
  return () => window.clearInterval(id);
}
