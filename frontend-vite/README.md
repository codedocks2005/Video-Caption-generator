# Frontend (Vite + React + Tailwind) — Video Caption Generator

This is a ready-to-run React (Vite) frontend for a Video Caption Generator SaaS MVP.

## Features
- Clean landing header and title
- File upload input (accepts MP4, MOV, AVI)
- Language selection (English/Hindi)
- Submit button (mocked API integration)
- Download buttons for `.srt` and `.txt` after mock transcription
- Functional components and hooks
- Responsive layout with Tailwind CSS

## Getting Started
```
cd frontend-vite
npm install
npm run dev
```
Open http://localhost:5173

## Backend Integration (later)
- Replace the mocked call in `src/App.tsx` `onSubmit` with your real API call:
```
const form = new FormData()
form.append('file', file)
form.append('language', language)
const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/upload`, { method: 'POST', body: form })
const data = await res.json()
setSegments(data.segments)
```
- Add `VITE_API_BASE_URL` in `.env` to point to your backend.

## Notes
- SRT and TXT downloads are generated on the client from the mocked transcript.
- Tailwind is configured in `tailwind.config.ts` and `postcss.config.js`.


