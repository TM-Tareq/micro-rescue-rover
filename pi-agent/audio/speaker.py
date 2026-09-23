import logging
import av
import numpy as np
from config import ALSA_PLAYBACK_DEVICE, AUDIO_SAMPLE_RATE, AUDIO_CHANNELS

logger = logging.getLogger("pi-agent.audio")

# Attempt ALSA import (available on Linux RPi)
try:
    import alsaaudio
    ALSA_AVAILABLE = True
except ImportError:
    ALSA_AVAILABLE = False
    logger.warning("pyalsaaudio not installed or platform is not Linux. Audio will run in mock mode.")


class SpeakerPlayer:
    def __init__(self, device_name: str = ALSA_PLAYBACK_DEVICE, sample_rate: int = AUDIO_SAMPLE_RATE, channels: int = AUDIO_CHANNELS):
        self.device_name = device_name
        self.sample_rate = sample_rate
        self.channels = channels
        self.pcm = None
        self.resampler = None
        self._init_alsa()
        self._init_resampler()

    def _init_alsa(self):
        if not ALSA_AVAILABLE:
            logger.info("Using Dummy Speaker Player (Mock mode)")
            return

        try:
            logger.info(f"Opening ALSA playback device: {self.device_name} ({self.sample_rate}Hz, {self.channels}ch, S16_LE)")
            self.pcm = alsaaudio.PCM(
                type=alsaaudio.PCM_PLAYBACK,
                mode=alsaaudio.PCM_NORMAL,
                device=self.device_name
            )
            self.pcm.setchannels(self.channels)
            self.pcm.setrate(self.sample_rate)
            self.pcm.setformat(alsaaudio.PCM_FORMAT_S16_LE)
            self.pcm.setperiodsize(480)
            logger.info(f"ALSA playback device '{self.device_name}' initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize ALSA device '{self.device_name}': {e}. Falling back to mock audio.")
            self.pcm = None

    def _init_resampler(self):
        try:
            # Resample incoming frames to 48000Hz, s16 (16-bit PCM), stereo layout
            layout = "stereo" if self.channels == 2 else "mono"
            self.resampler = av.AudioResampler(
                format="s16",
                layout=layout,
                rate=self.sample_rate
            )
        except Exception as e:
            logger.error(f"Failed to initialize PyAV AudioResampler: {e}")
            self.resampler = None

    def play_frame(self, frame: av.AudioFrame):
        """Processes an incoming WebRTC audio frame and writes to ALSA playback device."""
        try:
            if self.resampler:
                resampled_frames = self.resampler.resample(frame)
                for r_frame in resampled_frames:
                    # Convert to raw PCM bytes (s16le)
                    pcm_bytes = r_frame.to_ndarray().tobytes()
                    self._write_pcm(pcm_bytes)
            else:
                # Direct byte extraction fallback
                pcm_bytes = frame.to_ndarray().tobytes()
                self._write_pcm(pcm_bytes)
        except Exception as e:
            logger.error(f"Error processing audio frame: {e}")

    def _write_pcm(self, pcm_data: bytes):
        if self.pcm:
            try:
                self.pcm.write(pcm_data)
            except Exception as e:
                logger.error(f"ALSA PCM write error: {e}")
        else:
            # Mock mode - log frame size periodically
            pass

    def close(self):
        if self.pcm:
            try:
                self.pcm.close()
                self.pcm = None
                logger.info("ALSA PCM device closed.")
            except Exception as e:
                logger.error(f"Error closing ALSA PCM device: {e}")
