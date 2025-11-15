🎬 CAPTIQ — AI Video Caption Generator

CAPTIQ is a full-stack, AI-powered web application that generates timestamped captions for video files.
Built using a 100% free tech stack — Vercel (frontend) + Hugging Face (backend).

🔗 Live Project: https://captiq.vercel.app/

⚠️ Performance Notice

This project uses a free CPU-only Hugging Face Space.
⏳ As a result, transcription can be slow — a 1-minute video may take 5–10 minutes.
This is a purposeful design choice to demonstrate a zero-cost AI architecture.

🚀 Features

🔐 User Authentication — Powered by Clerk

🎞️ Video/Audio Upload — Drag-and-drop UI (React Dropzone)

🤖 AI Transcription — Whisper “base” model

🌍 AI Translation — Convert any language to English

⚛️ Modern Frontend — Vite, React, TypeScript, TailwindCSS

🎨 Animated UI — 3D background using Spline

📄 Export Options — Download captions as .srt or .txt

🏗️ Architecture Overview
🌐 Frontend — Vercel

React + Vite static frontend

Clerk auth

File upload & UI

Direct API calls to backend (no Vercel functions)

🔧 Backend — Hugging Face (Gradio + FastAPI)

Hosted as a Space

Provides /upload endpoint

Runs Whisper on CPU basic (free tier)

CORS enabled for browser access

🧩 Local Setup
Prerequisites

Node.js v18+

Free Clerk account

Free Hugging Face account

1️⃣ Backend Setup (Hugging Face)

The backend is designed to run on Hugging Face, not locally.

Create a new Space

Choose Gradio SDK

Select CPU basic hardware

Add:

📄 requirements.txt
fastapi
uvicorn
python-multipart
openai-whisper
torch
indic-transliteration
gradio

📄 app.py

Paste your backend Python code here.

Wait for build (5–10 minutes)

Copy your Space URL:
👉 https://yourname-yourspace.hf.space

2️⃣ Frontend Setup (Local)

Clone project

Install dependencies:

cd frontend-vite
npm install


Create environment file:

cp .env.local.example .env.local


Add Clerk publishable key:

VITE_CLERK_PUBLISHABLE_KEY=pk_test_...


Update backend URL in src/App.tsx:

const HF_API_URL = "https://yourname-yourspace.hf.space/upload";


Run locally:

npm run dev

🚀 Deploying to Vercel

Push repository to GitHub

Import repo into Vercel

Add environment variable:

VITE_CLERK_PUBLISHABLE_KEY

Deploy — Vercel auto-detects Vite

📚 What I Learned

🧩 Connecting a full-stack React + Python architecture

🔥 Why Vercel functions fail for long-running AI tasks

🔄 How to shift to a browser → Hugging Face model

🐢 Handling slow CPU Whisper performance

🛠️ Debugging npm issues, Python imports, and CORS configs
