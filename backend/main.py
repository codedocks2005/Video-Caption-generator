import os
import shutil
import subprocess
import tempfile
import wave
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# --- CHANGE 1 (THE FIX) ---
try:
    from indicnlp.transliterate.unicode_transliterate import UnicodeIndicTransliterator
    # Initialize the transliterator *without* arguments
    transliterator = UnicodeIndicTransliterator()
    print("Indic NLP Transliterator loaded successfully.")
except ImportError:
    transliterator = None
    print("WARNING: 'indic-nlp-library' not found. Transliteration will not work.")
# ---------------------------

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None


class Segment(BaseModel):
    index: int
    start: float
    end: float
    text: str


class TranscriptResponse(BaseModel):
    language: str
    duration_seconds: float
    segments: List[Segment]


app = FastAPI(title="Video Caption Generator API", version="1.0.0")

# CORS
origins = os.getenv("CORS_ALLOW_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup
@app.on_event("startup")
def startup_event():
    global model
    try:
        if WhisperModel is None:
            model = None
            print("WARNING: faster-whisper not installed. API will be non-functional.")
            return
        
        model_size = "small"
        device_type = "cpu"
        compute_type = "int8"
        
        print(f"Loading Whisper model '{model_size}' on device '{device_type}' with compute type '{compute_type}'...")
        
        model = WhisperModel(model_size, device=device_type, compute_type=compute_type)
        print("Model loaded successfully.")
    except Exception as e:
        model = None
        print(f"ERROR: Failed to load Whisper model. {e}")


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}


def extract_audio(video_path: str, output_wav: str) -> None:
    if imageio_ffmpeg is None:
        raise HTTPException(status_code=500, detail="imageio-ffmpeg not installed")
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_path, "-y", "-i", video_path,
        "-vn", "-ac", "1", "-ar", "16000", "-f", "wav",
        output_wav,
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"FFmpeg failed: {e.stderr.decode(errors='ignore')}")


def get_wav_duration(wav_path: str) -> float:
    try:
        with wave.open(wav_path, "rb") as wav_file:
            return wav_file.getnframes() / float(wav_file.getframerate())
    except Exception:
        return 0.0


def transcribe(audio_path: str, language: Optional[str] = None, task: str = "transcribe") -> Dict[str, Any]:
    if model is None:
        raise HTTPException(status_code=503, detail="Speech model is not available.")
    
    segments_list: List[Dict[str, Any]] = []
    whisper_task = "transcribe" if task == "transliterate" else task
    
    segments_iterable, info = model.transcribe(
        audio_path,
        language=language,
        task=whisper_task,
        beam_size=5,
        vad_filter=True  # This skips silence and speeds up processing
    )
    
    for seg in segments_iterable:
        segments_list.append({
            "start": float(seg.start),
            "end": float(seg.end),
            "text": str(seg.text).strip()
            
        })

    detected_language = getattr(info, "language", "unknown")
    final_language = "en" if task == "translate" else detected_language

    return {"language": final_language, "segments": segments_list}


# --- CHANGE 2 (THE FIX) ---
def transliterate_hindi_to_hinglish(text: str) -> str:
    if transliterator is None:
        return text
    try:
        # Pass the languages in here, not during initialization
        return transliterator.transliterate(text, source='hi', target='en')
    except Exception as e:
        print(f"ERROR during transliteration: {e}")
        return text
# ---------------------------


def map_segments(segments: List[Dict[str, Any]]) -> List[Segment]:
    return [Segment(index=i+1, start=s["start"], end=s["end"], text=s["text"]) for i, s in enumerate(segments)]


@app.post("/upload", response_model=TranscriptResponse)
async def upload_video(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    task: str = Form("transcribe")
) -> JSONResponse:
    
    print(f"\n=== Incoming Upload Request ===\nTask received: {task}\nLanguage: {language}\n===============================\n")

    if model is None:
        raise HTTPException(status_code=503, detail="Model not initialized. Please restart the server.")
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    supported_types = [".mp4", ".mov", ".avi", ".mkv", ".webm"]
    if not any(file.filename.lower().endswith(ext) for ext in supported_types):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if task not in ("transcribe", "translate", "transliterate"):
        raise HTTPException(status_code=400, detail="Invalid task. Must be 'transcribe', 'translate', or 'transliterate'")

    temp_dir = tempfile.mkdtemp(prefix="video_caption_")
    video_path = os.path.join(temp_dir, file.filename)
    audio_path = os.path.join(temp_dir, "audio.wav")

    try:
        with open(video_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        extract_audio(video_path, audio_path)
        language = "hi" if task == "transliterate" else language
        
        transcription = transcribe(audio_path, language, task)
        
        segments = map_segments(transcription["segments"])

        if task == "transliterate":
            for seg in segments:
                seg.text = transliterate_hindi_to_hinglish(seg.text)
        
        duration = get_wav_duration(audio_path)

        payload = TranscriptResponse(
            language=transcription["language"],
            duration_seconds=duration,
            segments=segments
        )
        return JSONResponse(content=payload.model_dump())

    except Exception as e:
        print(f"ERROR during processing: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)