# Snowcast Frontend

Responsive frontend for ski resort weather forecasts. Built with Create React App and designed to consume the `weather-backend` API.

## Requirements

- Node.js 18+
- Backend running (local or deployed)

## Environment

Create a `.env` using `.sample.env` as a template.

Required:

- `REACT_APP_BACKEND_URL` - base URL for the backend (e.g. `http://localhost:3001` or `https://<backend>.onrender.com`)
- `REACT_APP_BACKEND_API_KEY` - backend API key

## Local Development

```bash
npm install
npm start
```

The app runs at `http://localhost:3000`.

## Build

```bash
npm run build
```

Output goes to `build/`.

## Deploy on Render (Static Site)

Use Render Static Site:

- Build command: `npm run build`
- Publish directory: `build`
- Environment variables: `REACT_APP_BACKEND_URL`, `REACT_APP_BACKEND_API_KEY`

## Backend Configuration (CORS + Magic Link)

For magic-link auth to work in production:

- Backend CORS must allow the frontend origin.
- `FRONTEND_MAGIC_LINK_BASE_URL` should point to the backend base URL (so the link hits `/auth/verify` on the backend).
- `FRONTEND_REDIRECT_BASE_URL` should point to the frontend base URL (where the backend redirects after verification).
- `FRONTEND_COOKIE_SECURE=true` for https deployments.

If you see a CORS error like:
`Access-Control-Allow-Origin missing`, update the backend allowlist to include your frontend URL and redeploy the backend.
