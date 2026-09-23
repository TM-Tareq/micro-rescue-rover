import os
from dotenv import load_dotenv

load_dotenv()

DEVICE_ID = os.getenv("DEVICE_ID", "rover-01")
SIGNALING_SERVER = os.getenv("SIGNALING_SERVER", "http://localhost:4000")
ALSA_PLAYBACK_DEVICE = os.getenv("ALSA_PLAYBACK_DEVICE", "plughw:0,0")
AUDIO_SAMPLE_RATE = int(os.getenv("AUDIO_SAMPLE_RATE", "48000"))
AUDIO_CHANNELS = int(os.getenv("AUDIO_CHANNELS", "2"))
STUN_SERVER = os.getenv("STUN_SERVER", "stun:stun.l.google.com:19302")
