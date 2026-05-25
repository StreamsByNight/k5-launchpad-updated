import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

const PRODUCTION_URL = 'https://k5-launchpad-updated.onrender.com';

export const config = {
  canvasBaseUrl: (process.env.CANVAS_BASE_URL ?? '').replace(/\/$/, ''),
  clientId: process.env.CANVAS_CLIENT_ID ?? '',
  clientSecret: process.env.CANVAS_CLIENT_SECRET ?? '',
  // --- FIXED: Re-targeted back to the frontend route ---
  redirectUri: process.env.CANVAS_REDIRECT_URI ?? `${PRODUCTION_URL}/oauth/callback`,
  scopes: process.env.CANVAS_SCOPES ?? 'url:GET|/api/v1/courses url:GET|/api/v1/calendar_events url:GET|/api/v1/users/self',
  apiPort: Number(process.env.API_PORT ?? 3001),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
  frontendUrl: process.env.FRONTEND_URL ?? PRODUCTION_URL,
};

export function isOAuthConfigured(): boolean {
  return Boolean(config.canvasBaseUrl && config.clientId && config.clientSecret);
}
