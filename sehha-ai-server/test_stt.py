#!/usr/bin/env python3
"""
Test du serveur STT - place ton fichier audio dans le même dossier.
"""

import requests
import os
import sys

# ── Config ────────────────────────────────────────────────────────────────────
SERVER_URL  = "http://localhost:8002"
AUDIO_FILE  = "test.wav"          
LANGUAGE    = "fr"
WORD_TIMESTAMPS = True           # True pour avoir les timestamps par mot
# ──────────────────────────────────────────────────────────────────────────────


def check_health():
    print("Vérification du serveur...")
    try:
        r = requests.get(f"{SERVER_URL}/health", timeout=5)
        data = r.json()
        print(f"   Serveur OK — modèle: {data['model']} | device: {data['device']}")
        return True
    except requests.exceptions.ConnectionError:
        print("   Serveur non joignable. Lance d'abord : python stt_server.py")
        return False


def transcribe(filepath: str):
    print(f"\nEnvoi de '{filepath}'...")

    filename = os.path.basename(filepath)
    extension = os.path.splitext(filename)[1].lower()

    # Détermine le bon content-type
    mime_map = {
        ".wav":  "audio/wav",
        ".mp3":  "audio/mpeg",
        ".m4a":  "audio/mp4",
        ".ogg":  "audio/ogg",
        ".flac": "audio/flac",
        ".webm": "audio/webm",
    }
    mime = mime_map.get(extension, "application/octet-stream")

    with open(filepath, "rb") as f:
        response = requests.post(
            f"{SERVER_URL}/v1/transcribe",
            params={
                "language": LANGUAGE,
                "word_timestamps": str(WORD_TIMESTAMPS).lower(),
            },
            files={"audio": (filename, f, mime)},
            timeout=120,   # 2 min max pour les longs fichiers
        )

    if response.status_code == 200:
        data = response.json()["data"]
        meta = response.json()["meta"]

        print("\n" + "─" * 60)
        print(" TRANSCRIPTION :")
        print(f"   {data['text']}")
        print("─" * 60)
        print(f" Langue détectée  : {data['language']} ({data['language_probability']*100:.1f}%)")
        print(f" Durée audio      : {data['duration']}s")
        print(f" Modèle utilisé   : {meta['model']} ({meta['device']})")

        if data.get("words"):
            print(f"\n Timestamps ({len(data['words'])} mots) :")
            for w in data["words"][:10]:   # Affiche les 10 premiers
                print(f"   [{w['start']:.2f}s → {w['end']:.2f}s] {w['word']}")
            if len(data["words"]) > 10:
                print(f"   ... et {len(data['words']) - 10} autres mots")

    else:
        print(f"\n Erreur {response.status_code} :")
        print(f"   {response.json()}")


if __name__ == "__main__":
    # Permet de passer le fichier en argument : python test_stt.py monFichier.wav
    audio_path = sys.argv[1] if len(sys.argv) > 1 else AUDIO_FILE

    if not os.path.exists(audio_path):
        print(f" Fichier introuvable : '{audio_path}'")
        print(f"   Place ton fichier audio dans le même dossier et vérifie le nom.")
        sys.exit(1)

    if check_health():
        transcribe(audio_path)