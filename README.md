# SVG Art Studio — AI ပန်းချီစက်

AI SVG art generator powered by your custom OpenAI-compatible gateway (Claude N Codex).
Type a description → the chat model paints original vector art → preview, download (SVG/PNG), save to gallery.

## Run

```bash
npm install
APP_SECRET="a-long-random-secret" PORT=3101 npm start
```

Open http://localhost:3101

1. Click ⚙ Settings → paste your gateway **API Key** (stored AES-256-GCM encrypted on the server, never sent to the browser) → Test → Save.
2. Describe your artwork, pick a style + aspect, hit Generate.

## Notes

- Generation takes ~30–60s per artwork (the model draws detailed SVG).
- `APP_SECRET` env: without it the saved key won't survive a restart (ephemeral fallback with UI warning).
- Data (settings + gallery) lives in `data/app.db` (SQLite). On Render free tier this resets on redeploy — same caveat as the other Node apps.
- API: `GET /api/status`, `POST /api/generate`, `GET/POST/DELETE /api/gallery`, `GET/POST /api/settings`.

## Stack

Tech Stack 2 — Node.js + Express, node:sqlite, vanilla JS frontend (bilingual my/en, Myanmar default).
