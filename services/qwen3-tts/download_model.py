"""One-time controlled download. Run outside the inference container, then mount the directory read-only."""

import os
from pathlib import Path
from huggingface_hub import snapshot_download

MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
REVISION = os.getenv("QWEN_MODEL_REVISION", "b611c9f8f2ad5c741ed9c7a0a6a3750e43e0dfd7")
TARGET = os.getenv("QWEN_MODEL_PATH", "./models/Qwen3-TTS-12Hz-1.7B-CustomVoice")

snapshot_download(repo_id=MODEL_ID, revision=REVISION, local_dir=TARGET)
Path(TARGET, ".jobhill-model-revision").write_text(REVISION, encoding="utf-8")
print(f"Downloaded {MODEL_ID}@{REVISION} to {TARGET}")
