from __future__ import annotations

import asyncio
import io
import os
import secrets
import unicodedata
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import soundfile as sf
from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field

MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
MODEL_PATH = os.getenv("QWEN_MODEL_PATH", "/models/Qwen3-TTS-12Hz-1.7B-CustomVoice")
MODEL_REVISION = os.getenv("QWEN_MODEL_REVISION", "b611c9f8f2ad5c741ed9c7a0a6a3750e43e0dfd7")
SPEAKER = "Sohee"
MAX_TEXT_BYTES = 4_096
MAX_AUDIO_BYTES = 8 * 1024 * 1024
QUEUE_TIMEOUT_SECONDS = float(os.getenv("TTS_QUEUE_TIMEOUT_SECONDS", "1.5"))
MAX_CONCURRENCY = max(1, min(2, int(os.getenv("TTS_MAX_CONCURRENCY", "1"))))

_model = None
_slots = asyncio.Semaphore(MAX_CONCURRENCY)


class TTSRequest(BaseModel):
    model: Literal[MODEL_ID] = MODEL_ID
    text: str = Field(min_length=1, max_length=800)
    voice: Literal["Sohee"] = SPEAKER
    lang: Literal["ko"] = "ko"
    speed: float = Field(default=0.98, ge=0.9, le=1.05)
    response_format: Literal["wav"] = "wav"


def _service_token() -> str:
    token_file = os.getenv("TTS_SERVICE_TOKEN_FILE", "").strip()
    if token_file:
        try:
            return Path(token_file).read_text(encoding="utf-8").strip()
        except OSError as exc:
            raise RuntimeError("TTS service token file is unavailable") from exc
    return os.getenv("TTS_SERVICE_TOKEN", "").strip()


def _normalize_text(value: str) -> str:
    text = " ".join(unicodedata.normalize("NFC", value).split())
    text = "".join("" if unicodedata.category(char) == "Cf" else " " if unicodedata.category(char) == "Cc" else char for char in text)
    text = " ".join(text.split()).strip()
    if not text or len(text.encode("utf-8")) > MAX_TEXT_BYTES:
        raise HTTPException(status_code=422, detail="TTS_INVALID_INPUT")
    return text


def _instruction(speed: float) -> str:
    pace = "조금 느린 속도로" if speed < 0.96 else "자연스러운 보통 속도로" if speed <= 1.02 else "조금 빠른 속도로"
    return (
        f"차분하고 전문적인 한국인 면접관처럼 {pace} 질문합니다. "
        "감정을 과장하지 않고 문장 끝을 또렷하게 처리하며, 회사명과 수치와 영문 약어를 정확히 발음합니다."
    )


def _load_model():
    global _model
    model_dir = Path(MODEL_PATH)
    if not model_dir.is_dir():
        raise RuntimeError("Pinned Qwen3-TTS model directory is unavailable")
    revision_file = model_dir / ".jobhill-model-revision"
    if not revision_file.is_file() or revision_file.read_text(encoding="utf-8").strip() != MODEL_REVISION:
        raise RuntimeError("Qwen3-TTS model revision does not match the configured pin")

    import torch
    from qwen_tts import Qwen3TTSModel

    device = os.getenv("QWEN_DEVICE", "cuda:0")
    if device.startswith("cuda") and not torch.cuda.is_available():
        raise RuntimeError("CUDA is required for the configured Qwen3-TTS device")
    dtype = torch.bfloat16 if device.startswith("cuda") else torch.float32
    _model = Qwen3TTSModel.from_pretrained(
        str(model_dir),
        device_map=device,
        dtype=dtype,
        attn_implementation=os.getenv("QWEN_ATTENTION", "sdpa"),
        local_files_only=True,
    )


def _synthesize(request: TTSRequest) -> bytes:
    if _model is None:
        raise RuntimeError("TTS model is not ready")
    wavs, sample_rate = _model.generate_custom_voice(
        text=_normalize_text(request.text),
        language="Korean",
        speaker=SPEAKER,
        instruct=_instruction(request.speed),
    )
    output = io.BytesIO()
    sf.write(output, wavs[0], sample_rate, format="WAV", subtype="PCM_16")
    audio = output.getvalue()
    if len(audio) < 44 or len(audio) > MAX_AUDIO_BYTES or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        raise RuntimeError("TTS model returned invalid audio")
    return audio


@asynccontextmanager
async def lifespan(_: FastAPI):
    if len(_service_token()) < 32:
        raise RuntimeError("TTS service token must contain at least 32 characters")
    await asyncio.to_thread(_load_model)
    yield


app = FastAPI(title="JobHill private Qwen3-TTS", docs_url=None, redoc_url=None, lifespan=lifespan)


@app.get("/healthz")
async def healthz():
    return {"status": "ready" if _model is not None else "starting", "model": MODEL_ID, "revision": MODEL_REVISION}


@app.post("/v1/tts")
async def synthesize(request: TTSRequest, authorization: str | None = Header(default=None)):
    expected = _service_token()
    supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not expected or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="TTS_UNAUTHORIZED")

    try:
        await asyncio.wait_for(_slots.acquire(), timeout=QUEUE_TIMEOUT_SECONDS)
    except TimeoutError as exc:
        raise HTTPException(status_code=503, detail="TTS_BUSY") from exc

    try:
        audio = await asyncio.to_thread(_synthesize, request)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="TTS_UNAVAILABLE") from exc
    finally:
        _slots.release()

    return Response(
        content=audio,
        media_type="audio/wav",
        headers={"Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store"},
    )
