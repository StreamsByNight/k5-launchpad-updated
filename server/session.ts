import { randomBytes } from 'crypto';

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  canvasUserId?: number;
  userName?: string;
}

const sessions = new Map<string, SessionData>();

export function createSession(data: Omit<SessionData, 'expiresAt'> & { expiresIn?: number }): string {
  const id = randomBytes(24).toString('hex');
  const expiresIn = data.expiresIn ?? 3600;
  sessions.set(id, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    canvasUserId: data.canvasUserId,
    userName: data.userName,
  });
  return id;
}

export function getSession(id: string): SessionData | undefined {
  const s = sessions.get(id);
  if (!s) return undefined;
  if (Date.now() > s.expiresAt) {
    sessions.delete(id);
    return undefined;
  }
  return s;
}

export function updateSession(id: string, patch: Partial<SessionData>): void {
  const s = sessions.get(id);
  if (s) sessions.set(id, { ...s, ...patch });
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}
