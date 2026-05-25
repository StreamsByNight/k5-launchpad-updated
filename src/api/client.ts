const API_BASE = '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface AuthStatus {
  authenticated: boolean;
  oauthConfigured: boolean;
  userName: string | null;
  canvasBaseUrl: string | null;
}

export function getAuthStatus() {
  return apiFetch<AuthStatus>('/auth/status');
}

export async function getLoginUrl() {
  const { url } = await apiFetch<{ url: string }>('/auth/login');
  return url;
}

export function completeOAuth(code: string, state: string | null) {
  return apiFetch<{ ok: boolean; userName?: string }>('/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
}

export function logout() {
  return apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export function fetchTeachers() {
  return apiFetch<
    Array<{ id: string; name: string; initials: string; color: string; email: string }>
  >('/teachers');
}

export function fetchAnnouncements() {
  return apiFetch<{
    global: Array<{
      id: string;
      title: string;
      message: string;
      postedAt: string;
      readState: 'read' | 'unread';
      htmlUrl?: string;
    }>;
    courses: Array<{
      courseId: string;
      label: string;
      unread: number;
      announcements: Array<{
        id: string;
        title: string;
        message: string;
        postedAt: string;
        readState: 'read' | 'unread';
        htmlUrl?: string;
      }>;
    }>;
  }>('/announcements');
}

export function canvasGet<T>(path: string, params?: Record<string, string | string[]>) {
  let q = '';
  if (params) {
    const sp = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (Array.isArray(val)) val.forEach((v) => sp.append(key, v));
      else sp.set(key, val);
    }
    q = `?${sp}`;
  }
  return apiFetch<T>(`/canvas${path}${q}`);
}
