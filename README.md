## Video Caption Generator — Minimal SaaS MVP

This repository contains a minimal, production-ready MVP for a SaaS that generates captions for uploaded videos using OpenAI Whisper.

### What you get
- Frontend: Next.js (React + Tailwind), Vercel-ready.
- Backend: FastAPI (Python), Render/Railway-ready.
- Users upload a video (mp4/mov), preview it, click "Generate Captions", and receive timestamped captions.
- Captions are displayed under the video and also rendered as subtitles via a `<track>` overlay (WebVTT).

---

## Architecture
- Frontend (`frontend/`): Next.js App Router, Tailwind UI.
- Backend (`backend/`): FastAPI with an `/upload` endpoint.
- Audio extraction: ffmpeg (bundled via `imageio-ffmpeg`, no system install needed).
- Transcription: OpenAI Whisper API (`whisper-1`) with `response_format=verbose_json` for timestamped segments.

---

## Prerequisites
- Node.js >= 18
- Python >= 3.9
- OpenAI API key

---

## Local Setup

### 1) Backend (FastAPI)
```
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set your API key in your shell (recommended)
export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

### 2) Frontend (Next.js)
```
cd frontend
npm install

# Configure the backend URL
cp .env.local.example .env.local
# Edit .env.local if needed (defaults to http://localhost:8000)

npm run dev
```

The app will be available at `http://localhost:3000`.

---

## How it works
1. User selects a video (mp4 or mov) and sees a preview.
2. Clicking "Generate Captions" uploads the file to the FastAPI `/upload` endpoint.
3. Backend saves the video temporarily, extracts audio to WAV using ffmpeg, sends audio to OpenAI Whisper (`whisper-1`) with `response_format=verbose_json`.
4. Backend returns JSON with `segments` (start, end, text).
5. Frontend shows the text under the video and renders a WebVTT `<track>` overlay for subtitles.

---

## Environment Variables
- Backend
  - `OPENAI_API_KEY`: Your OpenAI API key. Set this on Render/Railway dashboard for the service.
  - Optional: `CORS_ALLOW_ORIGINS` (comma-separated, e.g. `http://localhost:3000,https://yourapp.vercel.app`). Defaults to `*` for MVP.

- Frontend
  - `NEXT_PUBLIC_API_BASE_URL`: Base URL of the backend. Locally defaults to `http://localhost:8000` (see `.env.local.example`).

---

## Deployment

### Deploy Backend on Render (Free Tier)
1. Push this repo to GitHub.
2. Create a new Render Web Service:
   - Runtime: Python 3.11 (or compatible)
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `backend`
3. Add Environment Variable: `OPENAI_API_KEY`.
4. (Optional) Add `CORS_ALLOW_ORIGINS` to allow your Vercel domain.
5. Deploy. Note your Render URL (e.g., `https://your-backend.onrender.com`).

### Deploy Backend on Railway (Free Tier)
1. Create a new Railway project from this repo.
2. Set Service root to `backend/`.
3. Set `OPENAI_API_KEY` in Variables.
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Deploy. Note your Railway domain.

### Deploy Frontend on Vercel
1. Import the repo in Vercel.
2. Project root: `frontend`.
3. Environment Variable: `NEXT_PUBLIC_API_BASE_URL` → your Render/Railway backend URL.
4. Deploy.

---

## API
### POST `/upload`
Multipart form-data with field `file` (mp4/mov).

Response (JSON):
```
{
  "language": "en",
  "duration_seconds": 12.34,
  "segments": [
    { "index": 1, "start": 0.0, "end": 2.34, "text": "Hello" },
    { "index": 2, "start": 2.34, "end": 5.67, "text": "world" }
  ]
}
```

---

## Notes
- Keep videos short for the free tiers.
- ffmpeg is provided via `imageio-ffmpeg` so you don't need any system packages.
- The code is structured to swap storage later (e.g., Cloudinary/Supabase) by replacing the temporary file handling.

---

## Troubleshooting
- 400 Unsupported file type: ensure the input is mp4 or mov.
- 500 OpenAI errors: verify `OPENAI_API_KEY`, check Whisper availability.
- CORS errors: set `CORS_ALLOW_ORIGINS` on backend to your frontend domain.

