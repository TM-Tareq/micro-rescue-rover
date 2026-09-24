import os
from dotenv import load_dotenv


# Load variables from .env file
load_dotenv()


# ==========================================
# DEVICE / NETWORK
# ==========================================

DEVICE_ID = os.getenv(
    "DEVICE_ID",
    "rover-01"
)

SIGNALING_SERVER = os.getenv(
    "SIGNALING_SERVER",
    "http://localhost:4000"
)


# ==========================================
# AUDIO DEVICES
# ==========================================

# Raspberry Pi speaker:
# PiDuplex card 0, playback device 0
ALSA_PLAYBACK_DEVICE = os.getenv(
    "ALSA_PLAYBACK_DEVICE",
    "plughw:0,0"
)

# Raspberry Pi microphone:
# PiDuplex card 0, capture device 1
ALSA_CAPTURE_DEVICE = os.getenv(
    "ALSA_CAPTURE_DEVICE",
    "plughw:0,1"
)


# ==========================================
# AUDIO SETTINGS
# ==========================================

AUDIO_SAMPLE_RATE = int(
    os.getenv(
        "AUDIO_SAMPLE_RATE",
        "48000"
    )
)

AUDIO_CHANNELS = int(
    os.getenv(
        "AUDIO_CHANNELS",
        "2"
    )
)


# ==========================================
# WEBRTC / STUN
# ==========================================

STUN_SERVER = os.getenv(
    "STUN_SERVER",
    "stun:stun.l.google.com:19302"
)