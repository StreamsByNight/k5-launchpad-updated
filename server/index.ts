import { randomBytes } from 'crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  canvasFetch,
  exchangeCodeForToken,
  getAuthorizationUrl,
  refreshAccessToken,
} from './canvasAuth.js';
import { fetchAnnouncementsForUser } from './announcements.js';
import { fetchTeachersForUser } from './teachers.js';
import { config, isOAuthConfigured } from './config.js';
import { createSession, deleteSession, getSession, updateSession } from './session.js';

// Resolve directory names for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const SESSION_COOKIE = 'k5_session';
const oauthStates = new Map<string, number>();

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

function getSessionId(req: express.Request): string | undefined {
  return req.cookies[SESSION_COOKIE];
}

async function getValidAccessToken(req: express.Request): Promise<string | null> {
  const sid = getSessionId(req);
  if (!sid) return null;

  let session = getSession(sid);
  if (!session) return null;

  if (Date.now() > session.expiresAt - 60_000 && session.refreshToken) {
    try {
      const tokens = await refreshAccessToken(session.refreshToken);
      updateSession(sid, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? session.refreshToken,
        expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      });
      session = getSession(sid)!;
    } catch {
      deleteSession(sid);
      return null;
    }
  }

  return session.accessToken;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, oauthConfigured: isOAuthConfigured() });
});

app.get('/api/auth/status', (req, res) => {
  const sid = getSessionId(req);
  const session = sid ? getSession(sid) : undefined;
  res.json({
    authenticated: Boolean(session),
    oauthConfigured: isOAuthConfigured(),
    userName: session?.userName ?? null,
    canvasBaseUrl: config.canvasBaseUrl || null,
  });
});

app.get('/api/auth/login', (_req, res) => {
  if (!isOAuthConfigured()) {
    res.status(503).json({ error: 'OAuth not configured. Copy .env.example to .env and set Canvas credentials.' });
    return;
  }
  const state = randomBytes(16).toString('hex');
  oauthStates.set(state, Date.now());
  res.json({ url: getAuthorizationUrl(state) });
});

app.post('/api/auth/callback', async (req, res) => {
  const { code, state } = req.body as { code?: string; state?: string };
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }
  if (state && oauthStates.has(state)) {
    oauthStates.delete(state);
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    let userName = tokens.user?.name;

    if (!userName) {
      try {
        const profile = await canvasFetch<{ name: string; short_name: string }>(
          '/users/self/profile',
          tokens.access_token
        );
        userName = profile.short_name || profile.name;
      } catch {
        userName = 'Student';
      }
    }

    const sessionId = createSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in ?? 3600,
      canvasUserId: tokens.user?.id,
      userName,
    });

    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ ok: true, userName });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'OAuth failed' });
  }
});

app.get('/api/announcements', async (req, res) => {
  const token = await getValidAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const data = await fetchAnnouncementsForUser(token);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to load announcements' });
  }
});

app.get('/api/teachers', async (req, res) => {
  const token = await getValidAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const teachers = await fetchTeachersForUser(token);
    res.json(teachers);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to load teachers' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const sid = getSessionId(req);
  if (sid) deleteSession(sid);
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

app.use('/api/canvas', async (req, res) => {
  const token = await getValidAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  const canvasPath = `${req.path}${query ? `?${query}` : ''}`;

  try {
    const data = await canvasFetch(canvasPath, token, { method: req.method });
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Canvas request failed' });
  }
});

// --- SERVE FRONTEND STATIC FILES ---
// Tells Express to look inside the compiled frontend folder
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback routing so React Router links can load directly
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(config.apiPort, () => {
  console.log(`K5 API server http://localhost:${config.apiPort}`);
  if (!isOAuthConfigured()) {
    console.warn('OAuth not configured — set CANVAS_* variables in .env');
  }
});
