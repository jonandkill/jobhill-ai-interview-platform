"""One-time controlled download. Mount the downloaded directory read-only."""

import os
from pathlib import Path

from huggingface_hub import snapshot_download

MODEL_ID = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
REVISION = os.getenv(
    "QWEN_MODEL_REVISION", "5d83992436eae1d760afd27aff78a71d676296fc"
)
TARGET = os.getenv("QWEN_MODEL_PATH", "./models/Qwen3-TTS-12Hz-0.6B-Base")

snapshot_download(repo_id=MODEL_ID, revision=REVISION, local_dir=TARGET)
Path(TARGET, ".jobhill-model-revision").write_text(REVISION, encoding="utf-8")
print(f"Downloaded {MODEL_ID}@{REVISION} to {TARGET}")
