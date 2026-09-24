import asyncio
import logging
import threading
from fractions import Fraction

import av
import alsaaudio
import numpy as np

from aiortc import MediaStreamTrack
from aiortc.mediastreams import MediaStreamError

from config import (
    ALSA_CAPTURE_DEVICE,
    AUDIO_SAMPLE_RATE,
)


logger = logging.getLogger("pi-agent.microphone")


class MicrophoneTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(
        self,
        device_name=ALSA_CAPTURE_DEVICE,
        sample_rate=AUDIO_SAMPLE_RATE,
    ):
        super().__init__()

        self.device_name = device_name
        self.sample_rate = sample_rate

        # 20 ms @ 48 kHz
        self.frame_samples = 960
        self.frame_duration = (
            self.frame_samples / self.sample_rate
        )

        self.timestamp = 0

        # =====================================================
        # FILTER
        # =====================================================

        self.filter_size = 4

        self.kernel = (
            np.ones(
                self.filter_size,
                dtype=np.float64,
            )
            / self.filter_size
        )

        self.filter_history = np.zeros(
            self.filter_size - 1,
            dtype=np.float64,
        )

        self.output_gain = 1.15


        # =====================================================
        # SMALL REAL-TIME BUFFER
        #
        # 5 frames = only ~100 ms maximum.
        #
        # We do NOT want seconds of old microphone audio.
        # =====================================================

        self.audio_queue = asyncio.Queue(
            maxsize=5
        )

        self.loop = asyncio.get_running_loop()

        # Capture-side accumulation in case ALSA ever
        # returns a different size.
        self.capture_pending = np.empty(
            0,
            dtype=np.int16,
        )


        # =====================================================
        # THREAD
        # =====================================================

        self.stop_event = threading.Event()

        self.capture_thread = None
        self.pcm = None
        self.stop_called = False


        # =====================================================
        # WEBRTC PACING
        # =====================================================

        self.next_send_time = None


        # =====================================================
        # DEBUG
        # =====================================================

        self.capture_reads = 0
        self.captured_frames = 0
        self.sent_frames = 0

        self.stale_drops = 0
        self.queue_full_drops = 0


        self._open_microphone()
        self._start_capture_thread()


    # =========================================================
    # OPEN ALSA
    # =========================================================

    def _open_microphone(self):

        logger.info(
            f"Opening ALSA capture device: "
            f"{self.device_name}"
        )

        self.pcm = alsaaudio.PCM(
            type=alsaaudio.PCM_CAPTURE,
            mode=alsaaudio.PCM_NORMAL,
            device=self.device_name,
        )

        self.pcm.setchannels(2)

        self.pcm.setrate(
            self.sample_rate
        )

        self.pcm.setformat(
            alsaaudio.PCM_FORMAT_S16_LE
        )

        self.pcm.setperiodsize(
            self.frame_samples
        )

        logger.info(
            "Pi microphone initialized successfully"
        )

        logger.info(
            "Using LEFT I2S microphone channel"
        )

        logger.info(
            "4-sample moving-average filter enabled"
        )

        logger.info(
            f"Microphone output gain: "
            f"{self.output_gain}"
        )


    # =========================================================
    # START CAPTURE THREAD
    # =========================================================

    def _start_capture_thread(self):

        self.capture_thread = threading.Thread(
            target=self._capture_loop,
            name="pi-microphone-capture",
            daemon=True,
        )

        self.capture_thread.start()

        logger.info(
            "Dedicated microphone capture thread started"
        )


    # =========================================================
    # CAPTURE LOOP
    # =========================================================

    def _capture_loop(self):

        logger.info(
            "Microphone capture loop running"
        )

        try:

            while not self.stop_event.is_set():

                pcm = self.pcm

                if pcm is None:
                    break

                try:

                    length, data = pcm.read()

                except Exception as e:

                    if not self.stop_event.is_set():

                        logger.error(
                            f"ALSA microphone read error: {e}"
                        )

                    break


                if length <= 0 or not data:
                    continue


                self.capture_reads += 1


                # =============================================
                # S16 stereo
                #
                # L R L R L R...
                # =============================================

                stereo = np.frombuffer(
                    data,
                    dtype="<i2",
                )


                if stereo.size < 2:
                    continue


                # LEFT is our actual INMP441 microphone.
                left = stereo[
                    0::2
                ].copy()


                if left.size == 0:
                    continue


                # Accumulate in case ALSA ever gives
                # something other than exactly 960 samples.
                self.capture_pending = np.concatenate(
                    (
                        self.capture_pending,
                        left,
                    )
                )


                while (
                    self.capture_pending.size
                    >= self.frame_samples
                ):

                    block = self.capture_pending[
                        :self.frame_samples
                    ].astype(
                        np.float64
                    )


                    self.capture_pending = (
                        self.capture_pending[
                            self.frame_samples:
                        ]
                    )


                    # =========================================
                    # 4-SAMPLE STATEFUL FILTER
                    # =========================================

                    combined = np.concatenate(
                        (
                            self.filter_history,
                            block,
                        )
                    )


                    filtered = np.convolve(
                        combined,
                        self.kernel,
                        mode="valid",
                    )


                    self.filter_history = combined[
                        -(self.filter_size - 1):
                    ].copy()


                    filtered *= (
                        self.output_gain
                    )


                    filtered = np.clip(
                        filtered,
                        -32768,
                        32767,
                    ).astype(
                        np.int16
                    )


                    self.captured_frames += 1


                    try:

                        self.loop.call_soon_threadsafe(
                            self._enqueue_frame,
                            filtered.tobytes(),
                        )

                    except RuntimeError:

                        return


        finally:

            logger.info(
                "Microphone capture thread stopping"
            )


            if self.pcm is not None:

                try:
                    self.pcm.close()

                except Exception as e:

                    logger.error(
                        f"Microphone ALSA close error: {e}"
                    )

                self.pcm = None


            try:

                self.loop.call_soon_threadsafe(
                    self._enqueue_end
                )

            except RuntimeError:

                pass


            logger.info(
                "Microphone capture thread stopped"
            )


    # =========================================================
    # ENQUEUE ONE COMPLETE 20 MS FRAME
    # =========================================================

    def _enqueue_frame(
        self,
        frame_bytes,
    ):

        if self.stop_event.is_set():
            return


        # Never allow a huge backlog.
        if self.audio_queue.full():

            try:

                self.audio_queue.get_nowait()

                self.queue_full_drops += 1

            except asyncio.QueueEmpty:

                pass


        try:

            self.audio_queue.put_nowait(
                frame_bytes
            )

        except asyncio.QueueFull:

            self.queue_full_drops += 1


    # =========================================================
    # END MARKER
    # =========================================================

    def _enqueue_end(self):

        if self.audio_queue.full():

            try:
                self.audio_queue.get_nowait()
            except asyncio.QueueEmpty:
                pass


        try:

            self.audio_queue.put_nowait(
                None
            )

        except asyncio.QueueFull:

            pass


    # =========================================================
    # KEEP ONLY FRESH AUDIO
    # =========================================================

    def _drop_stale_audio(self):

        # Keep at most ~2 frames buffered:
        #
        # 2 × 20 ms = ~40 ms
        #
        # This is much better for a live intercom than
        # sending audio from 1-2 seconds ago.

        while self.audio_queue.qsize() > 2:

            try:

                item = self.audio_queue.get_nowait()

            except asyncio.QueueEmpty:

                break


            if item is None:

                try:
                    self.audio_queue.put_nowait(None)
                except asyncio.QueueFull:
                    pass

                break


            self.stale_drops += 1


    # =========================================================
    # WEBRTC 20 MS PACER
    # =========================================================

    async def _pace(self):

        now = self.loop.time()


        if self.next_send_time is None:

            self.next_send_time = now

            return


        self.next_send_time += (
            self.frame_duration
        )


        now = self.loop.time()


        # If event loop was badly delayed,
        # DO NOT try to send 10 packets instantly
        # to "catch up".
        #
        # Reset timing instead.
        if (
            now - self.next_send_time
            > 0.060
        ):

            self.next_send_time = now

            return


        delay = (
            self.next_send_time
            - now
        )


        if delay > 0:

            await asyncio.sleep(
                delay
            )


    # =========================================================
    # WEBRTC RECV
    # =========================================================

    async def recv(self):

        # Stable RTP pacing.
        await self._pace()


        # Throw away old microphone audio if sender
        # temporarily fell behind.
        self._drop_stale_audio()


        item = await self.audio_queue.get()


        if item is None:

            raise MediaStreamError


        mono = np.frombuffer(
            item,
            dtype="<i2",
        )


        if mono.size != self.frame_samples:

            logger.warning(
                f"Unexpected microphone frame size: "
                f"{mono.size}"
            )

            raise MediaStreamError


        # =============================================
        # MONO -> STEREO
        # =============================================

        stereo = np.empty(
            self.frame_samples * 2,
            dtype=np.int16,
        )


        stereo[0::2] = mono
        stereo[1::2] = mono


        # =============================================
        # PYAV / WEBRTC FRAME
        # =============================================

        frame = av.AudioFrame(
            format="s16",
            layout="stereo",
            samples=self.frame_samples,
        )


        frame.planes[0].update(
            stereo.tobytes()
        )


        frame.sample_rate = (
            self.sample_rate
        )


        frame.pts = (
            self.timestamp
        )


        frame.time_base = Fraction(
            1,
            self.sample_rate,
        )


        self.timestamp += (
            self.frame_samples
        )


        self.sent_frames += 1


        if (
            self.sent_frames % 100
            == 0
        ):

            logger.info(
                f"Mic OK | "
                f"sent={self.sent_frames} | "
                f"captured={self.captured_frames} | "
                f"queue={self.audio_queue.qsize()} | "
                f"stale_drops={self.stale_drops} | "
                f"full_drops={self.queue_full_drops}"
            )


        return frame


    # =========================================================
    # STOP
    # =========================================================

    def stop(self):

        if self.stop_called:
            return


        self.stop_called = True


        logger.info(
            "Stopping Pi microphone"
        )


        self.stop_event.set()


        try:

            self.loop.call_soon_threadsafe(
                self._enqueue_end
            )

        except RuntimeError:

            pass


        super().stop()