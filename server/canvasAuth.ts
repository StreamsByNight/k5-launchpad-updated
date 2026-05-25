import { config } from './config.js';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: number; name: string };
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    state,
    scope: config.scopes,
  });
  return `${config.canvasBaseUrl}/login/oauth2/auth?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const res = await fetch(`${config.canvasBaseUrl}/login/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    refresh_token: refreshToken,
  });

  const res = await fetch(`${config.canvasBaseUrl}/login/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function canvasFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith('http') ? path : `${config.canvasBaseUrl}/api/v1${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canvas API ${res.status}: ${text.slice(0, 200)}`);
  }

  const linkHeader = res.headers.get('Link');
  const data = (await res.json()) as T;

  if (linkHeader?.includes('rel="next"')) {
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch && Array.isArray(data)) {
      const next = await canvasFetch<unknown[]>(nextMatch[1], accessToken);
      return [...data, ...next] as T;
    }
  }

  return data;
}
