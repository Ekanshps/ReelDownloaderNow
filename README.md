# ReelDownloaderNow

> A mobile-first, multilingual Instagram media downloader built as a polished React PWA with a FastAPI and yt-dlp backend.

ReelDownloaderNow lets users preview and download publicly available Instagram reels, videos, photos, stories, and carousel posts. The product is designed around a simple flow: paste a public link, inspect the media, choose a format, and save it without an Instagram login.

This project was built as a complete product experience rather than a basic downloader form. It includes a responsive premium interface, realistic media preview card, dark mode, multilingual content, SEO landing pages, PWA support, API safeguards, legal pages, monitoring hooks, and container deployment configuration.

## Portfolio Summary

ReelDownloaderNow demonstrates how I designed and built a full-stack media utility from the user experience through the deployment layer. The project combines a React/TypeScript frontend, a Python API, media extraction, responsive visual design, internationalization, structured SEO, security boundaries, and production-oriented infrastructure.

### Product goals

- Make downloading public Instagram media fast and understandable.
- Keep the primary workflow usable on mobile screens.
- Avoid requiring users to share Instagram credentials.
- Clearly communicate public-content and copyright boundaries.
- Provide a foundation that can move from local development to cloud deployment.

## Features

### User experience

- Paste-to-preview workflow instead of an ambiguous single download action.
- Media preview with thumbnail, title, creator, media type, duration, file size, and item count.
- Format choices based on the detected media:
  - MP4 360p
  - MP4 720p
  - MP4 1080p
  - Original image
  - ZIP carousel
- Preparing, downloading, completed, error, and retry states.
- Real browser downloads with the correct file extension for MP4, JPG, or ZIP output.
- Copy link and native share actions.
- PWA install prompt and offline shell caching.
- Persistent dark mode with readable contrast across forms, cards, navigation, FAQ, and footer.
- English-first language selection with Hindi, Spanish, Russian, French, and Portuguese translations.
- Selected language and theme preference persist in local storage.
- Responsive layout optimized for mobile, tablet, and desktop.

### Visual design

- Editorial typography pairing using Manrope, DM Mono, and Playfair Display.
- Green, coral, and warm neutral visual system with a dedicated dark theme.
- Realistic Instagram-inspired reel card with profile row, avatar, play button, action rail, caption, likes, and metadata.
- Preview thumbnails populate the visual card when available.
- Public `Icon.png` asset used for the brand mark, favicon, Apple touch icon, and PWA manifest.

### SEO and content

- Search-focused metadata for Instagram reel, video, photo, story, and IGTV downloader intent.
- Dedicated landing routes:
  - `/instagram-reel-downloader`
  - `/instagram-video-downloader`
  - `/instagram-photo-downloader`
  - `/instagram-story-downloader`
  - `/instagram-igtv-downloader`
- Locale-aware page title, description, keywords, and HTML language attribute.
- WebApplication and FAQPage JSON-LD structured data.
- Crawlable internal links between downloader pages.
- `robots.txt` and `sitemap.xml`.
- Privacy, Terms, and Copyright/DMCA pages.
- FastAPI download endpoint for public media.
- yt-dlp integration for extraction.
- Progressive video download path that works without mandatory FFmpeg merging.
flowchart LR
  Browser[React PWA] -->|Preview / Download| Proxy[Vite or Nginx proxy]
  Proxy --> API[FastAPI API]
  API --> Extractor[yt-dlp]
  Extractor --> Instagram[Public Instagram media]
  API --> Temp[Temporary media file]
  Temp --> Browser
```

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- CSS with responsive media queries
- FastAPI
- Uvicorn
- yt-dlp
- Dedicated Python API image
- Docker Compose orchestration
- Nginx static hosting and reverse proxy
.
├── backend/
│   ├── api.py              # FastAPI preview and download API
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile.api      # Backend image
├── frontend/
│   ├── package.json        # Frontend dependencies and scripts
│   ├── vite.config.ts      # Dev API proxy
│   ├── index.html          # Frontend document shell
│   ├── public/             # PWA, SEO, and brand assets
│   └── src/                # React components, styles, translations
├── Dockerfile              # Nginx frontend image
├── docker-compose.yml      # Production service orchestration
├── nginx.conf              # SPA fallback and API reverse proxy
├── .env.example            # Safe environment variable template
└── .gitignore              # Secret, cookie, cache, and local media protection
```

## Local Development

The repository is split into two independently deployable services:

- `frontend/`: React/Vite/PWA client. It owns the browser UI, translations, SEO assets, and local API proxy.
- `backend/`: FastAPI/yt-dlp service. It owns preview, download, validation, rate limiting, timeouts, and temporary files.

### Prerequisites

- Node.js 20+
- npm
- Python 3.13+

```powershell
cd frontend
npm install
```

### Install backend dependencies

Windows example:

```powershell
cd ../backend
C:/Users/Lenovo/AppData/Local/Programs/Python/Python313/python.exe -m pip install -r requirements.txt
```

### Start the API

Run in terminal one:

```powershell
cd backend
C:/Users/Lenovo/AppData/Local/Programs/Python/Python313/python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000
```

### Start the frontend

Run in terminal two:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/).

The Vite development server proxies `/api` requests to `http://127.0.0.1:8000`.

### Verify the API

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/health
```

Expected response:

```json
{"status":"ok"}
```

## Commands

```powershell
cd frontend
npm run dev       # Start the Vite development server
npm run build     # Type-check and create the production frontend bundle
npm run lint      # Run Oxlint
npm run preview   # Preview the built frontend locally
```

Python syntax check:

```powershell
cd backend
python -m py_compile api.py
```

## Environment Variables

Copy `.env.example` to a local environment file when needed. Do not commit the real file.

```env
INSTAGRAM_COOKIES_FILE=
VITE_PLAUSIBLE_DOMAIN=reeldownloadernow.com
VITE_SENTRY_DSN=
```

- `INSTAGRAM_COOKIES_FILE`: optional local path to an exported cookies file. Never upload or commit it.
- `VITE_PLAUSIBLE_DOMAIN`: optional Plausible domain for privacy-friendly analytics.
- `VITE_SENTRY_DSN`: optional Sentry DSN for browser error monitoring.

## Deployment

### Recommended: Vercel frontend + Render API

1. Create a **private** GitHub repository and push this project. Keep `.env`, cookies, keys, and certificates out of Git.
2. In Vercel, import the repository and set **Root Directory** to `frontend`.
3. Use Vercel settings: Framework `Vite`, Build command `npm run build`, Output directory `dist`.
4. Add Vercel environment variable `VITE_API_URL=https://YOUR-API.onrender.com`.
5. In Render, create a Web Service from the same repository and set **Root Directory** to `backend`.
6. Use Render settings: Runtime `Python 3`, Build command `pip install -r requirements.txt`, Start command `uvicorn api:app --host 0.0.0.0 --port $PORT`, Health check `/api/health`.
7. Add Render environment variable `ALLOWED_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app`.
8. Copy the Render URL into Vercel as `VITE_API_URL`, redeploy Vercel, and test preview/download.
9. Add your custom HTTPS domain in Vercel. Replace the placeholder domain in `frontend/index.html` and `frontend/public/sitemap.xml` before submitting the sitemap to Google Search Console.

The included [vercel.json](frontend/vercel.json) keeps SPA routes working on direct refresh. The included [render.yaml](render.yaml) can be used for Render Blueprint deployment.

### Docker/VPS option

```powershell
docker compose up --build -d
```

The Compose setup runs the frontend and API as separate services. For significant traffic, add persistent Redis rate limiting, external temporary storage, CDN delivery, HTTPS certificates, and centralized logs.

## Security and Responsible Use

- Only public Instagram URLs are accepted.
- Private, deleted, age-restricted, or unavailable posts cannot be bypassed.
- Never store API keys, cookies, passwords, or private certificates in Git.
- The `.gitignore` excludes environment files, cookies, credentials, private keys, caches, temporary files, and downloaded media.

## Portfolio Description

**ReelDownloaderNow** is a full-stack multilingual PWA for downloading public Instagram media. I designed a mobile-first interface with dark mode, realistic media previews, responsive format selection, localized SEO landing pages, FAQ structured data, and accessible interaction states. The backend uses FastAPI and yt-dlp with validation, rate limiting, size limits, timeouts, and automatic temporary-file cleanup. The project also includes Docker and Nginx deployment configuration, optional Sentry/Plausible monitoring, and clear privacy and copyright boundaries.
