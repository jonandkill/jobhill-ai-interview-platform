FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    HF_HUB_DISABLE_TELEMETRY=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends git libsndfile1 sox \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/tts
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y git \
    && apt-get autoremove -y \
    && rm -rf /root/.cache/pip

COPY app.py ./
RUN useradd --system --uid 10001 --home /nonexistent --shell /usr/sbin/nologin tts \
    && chown -R tts:tts /srv/tts

USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--workers", "1"]
