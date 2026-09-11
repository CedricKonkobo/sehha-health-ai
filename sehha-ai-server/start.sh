#!/bin/bash
# Démarrage du serveur STT SEHHA

export WHISPER_MODEL="${WHISPER_MODEL:-medium}"
export WHISPER_DEVICE="${WHISPER_DEVICE:-auto}"
export WHISPER_COMPUTE="${WHISPER_COMPUTE:-int8}"
export WHISPER_LANGUAGE="${WHISPER_LANGUAGE:-fr}"
export WHISPER_PORT="${WHISPER_PORT:-8002}"

echo "[SEHHA] Démarrage Faster Whisper — modèle: $WHISPER_MODEL, port: $WHISPER_PORT"

source venv/bin/activate
python stt_server.py