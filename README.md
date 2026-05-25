# K5 Launchpad — K12 Dashboard

Interactive K5 Dashboard with **Canvas OAuth2** sign-in and **live data** (courses, agenda, announcements, modules). Dates use the **current day** in your chosen timezone from Settings.

## Features

- Canvas OAuth2 login (authorization code flow)
- Live courses, calendar/agenda, announcements, modules
- Real “today” and date navigation (timezone-aware)
- Requires Canvas sign-in (no demo data)
- Settings: timezone, home page, visual themes

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Canvas OAuth

1. In Canvas Admin → **Developer Keys**, create a key.
2. Set **Redirect URI** to: `http://localhost:5173/oauth/callback`
3. Copy `.env.example` to `.env` and fill in:

```env
CANVAS_BASE_URL=https://your-school.instructure.com
CANVAS_CLIENT_ID=...
CANVAS_CLIENT_SECRET=...
CANVAS_REDIRECT_URI=http://localhost:5173/oauth/callback
SESSION_SECRET=your-long-random-secret
```

Adjust `CANVAS_SCOPES` if your developer key uses different API permissions.

### 3. Run (frontend + API server)

```bash
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:3001  

Click **Sign in** (header) or open `/login` to connect Canvas.

## Architecture

| Layer | Role |
|-------|------|
| `server/` | OAuth token exchange, session cookie, Canvas API proxy |
| `src/api/` | Frontend calls `/api/*` (proxied in dev) |
| `src/services/canvasMappers.ts` | Canvas → dashboard models |
| `src/utils/dates.ts` | Real dates in user timezone |

Tokens stay on the server in an httpOnly cookie; the browser never sees the client secret.

Teacher emails use the Stride format `firstletteroffirstname+lastname@stridek12learning.org` (e.g. Ashlee Deal → `adeal@stridek12learning.org`).

## Production notes

- Set `FRONTEND_URL` and `CANVAS_REDIRECT_URI` to your production URLs.
- Use HTTPS and `secure: true` cookies.
- Register the production redirect URI on the Canvas developer key.
