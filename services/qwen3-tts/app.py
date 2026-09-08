from __future__ import annotations

import asyncio
import io
import os
import secrets
import subprocess
import unicodedata
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import soundfile as sf
from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field

MODEL_ID = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
MODEL_PATH = os.getenv("QWEN_MODEL_PATH", "/models/Qwen3-TTS-12Hz-0.6B-Base")
MODEL_REVISION = os.getenv(
    "QWEN_MODEL_REVISION", "5d83992436eae1d760afd27aff78a71d676296fc"
)
VOICE_ID = "jobnkill-professor-01"
REFERENCE_AUDIO_PATH = os.getenv(
    "VOICE_REFERENCE_AUDIO_PATH", "/voices/jobnkill-professor-01/reference.wav"
)
REFERENCE_TEXT_PATH = os.getenv(
    "VOICE_REFERENCE_TEXT_PATH", "/voices/jobnkill-professor-01/reference.txt"
)
MAX_TEXT_BYTES = 4_096
MAX_AUDIO_BYTES = 8 * 1024 * 1024
MAX_REFERENCE_BYTES = 5 * 1024 * 1024
MIN_REFERENCE_SECONDS = 3.0
MAX_REFERENCE_SECONDS = 30.0
QUEUE_TIMEOUT_SECONDS = float(os.getenv("TTS_QUEUE_TIMEOUT_SECONDS", "1.5"))
MAX_CONCURRENCY = max(1, min(2, int(os.getenv("TTS_MAX_CONCURRENCY", "1"))))

_model = None
_voice_prompt = None
_slots = asyncio.Semaphore(MAX_CONCURRENCY)


class TTSRequest(BaseModel):
    model: Literal["Qwen/Qwen3-TTS-12Hz-0.6B-Base"] = MODEL_ID
    text: str = Field(min_length=1, max_length=800)
    voice: Literal["jobnkill-professor-01"] = VOICE_ID
    lang: Literal["ko"] = "ko"
    speed: float = Field(default=1.02, ge=0.9, le=1.08)
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
    text = "".join(
        ""
        if unicodedata.category(char) == "Cf"
        else " "
        if unicodedata.category(char) == "Cc"
        else char
        for char in text
    )
    text = " ".join(text.split()).strip()
    if not text or len(text.encode("utf-8")) > MAX_TEXT_BYTES:
        raise HTTPException(status_code=422, detail="TTS_INVALID_INPUT")
    return text


def _load_reference() -> tuple[str, str]:
    audio_path = Path(REFERENCE_AUDIO_PATH)
    text_path = Path(REFERENCE_TEXT_PATH)
    if not audio_path.is_file() or not text_path.is_file():
        raise RuntimeError("Private voice reference files are unavailable")
    if not 44 <= audio_path.stat().st_size <= MAX_REFERENCE_BYTES:
        raise RuntimeError("Private voice reference audio size is invalid")

    try:
        info = sf.info(str(audio_path))
    except (OSError, RuntimeError) as exc:
        raise RuntimeError("Private voice reference audio is invalid") from exc
    duration = info.frames / info.samplerate if info.samplerate else 0
    if (
        info.channels != 1
        or info.samplerate != 24_000
        or duration < MIN_REFERENCE_SECONDS
        or duration > MAX_REFERENCE_SECONDS
    ):
        raise RuntimeError("Private voice reference must be 24 kHz mono and 3-30 seconds")

    try:
        reference_text = _normalize_text(text_path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise RuntimeError("Private voice reference transcript is unavailable") from exc
    return str(audio_path), reference_text


def _load_model() -> None:
    global _model, _voice_prompt
    model_dir = Path(MODEL_PATH)
    if not model_dir.is_dir():
        raise RuntimeError("Pinned Qwen3-TTS model directory is unavailable")
    revision_file = model_dir / ".jobhill-model-revision"
    if (
        not revision_file.is_file()
        or revision_file.read_text(encoding="utf-8").strip() != MODEL_REVISION
    ):
        raise RuntimeError("Qwen3-TTS model revision does not match the configured pin")

    reference_audio, reference_text = _load_reference()

    import torch
    from qwen_tts import Qwen3TTSModel

    device = os.getenv("QWEN_DEVICE", "cuda:0")
    if device.startswith("cuda") and not torch.cuda.is_available():
        raise RuntimeError("CUDA is required for the configured Qwen3-TTS device")
    dtype = torch.bfloat16 if device.startswith("cuda") else torch.float32
    model = Qwen3TTSModel.from_pretrained(
        str(model_dir),
        device_map=device,
        dtype=dtype,
        attn_implementation=os.getenv("QWEN_ATTENTION", "sdpa"),
        local_files_only=True,
    )
    prompt = model.create_voice_clone_prompt(
        ref_audio=reference_audio,
        ref_text=reference_text,
        x_vector_only_mode=False,
    )
    _model = model
    _voice_prompt = prompt


def _adjust_tempo(wav: bytes, speed: float) -> bytes:
    if abs(speed - 1.0) < 0.005:
        return wav
    try:
        completed = subprocess.run(
            [
                "sox",
                "-t",
                "wav",
                "-",
                "-t",
                "wav",
                "-",
                "tempo",
                f"{speed:.3f}",
            ],
            input=wav,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=15,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise RuntimeError("TTS tempo adjustment failed") from exc
    return completed.stdout


def _synthesize(request: TTSRequest) -> bytes:
    if _model is None or _voice_prompt is None:
        raise RuntimeError("TTS model is not ready")
    wavs, sample_rate = _model.generate_voice_clone(
        text=_normalize_text(request.text),
        language="Korean",
        voice_clone_prompt=_voice_prompt,
    )
    output = io.BytesIO()
    sf.write(output, wavs[0], sample_rate, format="WAV", subtype="PCM_16")
    audio = _adjust_tempo(output.getvalue(), request.speed)
    if (
        len(audio) < 44
        or len(audio) > MAX_AUDIO_BYTES
        or audio[:4] != b"RIFF"
        or audio[8:12] != b"WAVE"
    ):
        raise RuntimeError("TTS model returned invalid audio")
    return audio


@asynccontextmanager
async def lifespan(_: FastAPI):
    if len(_service_token()) < 32:
        raise RuntimeError("TTS service token must contain at least 32 characters")
    await asyncio.to_thread(_load_model)
    yield


app = FastAPI(
    title="JOB&KILL private Qwen3-TTS",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


@app.get("/healthz")
async def healthz():
    ready = _model is not None and _voice_prompt is not None
    return {
        "status": "ready" if ready else "starting",
        "model": MODEL_ID,
        "revision": MODEL_REVISION,
        "voice": VOICE_ID,
    }


@app.post("/v1/tts")
async def synthesize(
    request: TTSRequest, authorization: str | None = Header(default=None)
):
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
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "CDN-Cache-Control": "no-store",
        },
    )
