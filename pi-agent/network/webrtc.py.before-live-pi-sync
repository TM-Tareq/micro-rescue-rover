import asyncio
import logging

import av

from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    RTCConfiguration,
    RTCIceServer,
)

from audio.speaker import SpeakerPlayer
from audio.microphone import MicrophoneTrack

from config import STUN_SERVER


logger = logging.getLogger("pi-agent.webrtc")


class WebRTCManager:

    def __init__(self, signaling_client):

        self.signaling_client = signaling_client

        self.pc = None

        # Laptop Mic -> Pi Speaker
        self.speaker = None
        self.audio_task = None

        # Pi Mic -> Laptop Speaker
        self.microphone = None


    # ==========================================================
    # HANDLE WEBRTC OFFER
    # ==========================================================

    async def handle_offer(
        self,
        caller_socket_id: str,
        offer_sdp: dict,
    ) -> dict:

        logger.info(
            f"Received WebRTC offer from caller "
            f"{caller_socket_id}"
        )

        # Close previous call/session if any
        await self.close_connection()


        # ======================================================
        # 1. INITIALIZE PI SPEAKER
        #
        # Laptop Mic
        #     ↓
        # WebRTC
        #     ↓
        # Pi Speaker
        # ======================================================

        logger.info(
            "Initializing Raspberry Pi speaker..."
        )

        self.speaker = SpeakerPlayer()


        # ======================================================
        # 2. CREATE PEER CONNECTION
        # ======================================================

        rtc_config = RTCConfiguration(
            iceServers=[
                RTCIceServer(
                    urls=[STUN_SERVER]
                )
            ]
        )

        self.pc = RTCPeerConnection(
            configuration=rtc_config
        )


        # ======================================================
        # 3. RECEIVE LAPTOP MICROPHONE
        # ======================================================

        @self.pc.on("track")
        def on_track(track):

            logger.info(
                f"Received WebRTC track "
                f"of kind: {track.kind}"
            )

            if track.kind == "audio":

                logger.info(
                    "Laptop microphone audio track received"
                )

                self.audio_task = asyncio.create_task(
                    self._read_audio_track(
                        track
                    )
                )


        # ======================================================
        # 4. CONNECTION STATE
        # ======================================================

        @self.pc.on(
            "connectionstatechange"
        )
        async def on_connectionstatechange():

            if not self.pc:
                return

            state = (
                self.pc.connectionState
            )

            logger.info(
                f"WebRTC Connection State changed to: "
                f"{state}"
            )

            if state in [
                "failed",
                "closed",
                "disconnected",
            ]:

                await self.close_connection()


        # ======================================================
        # 5. LOCAL ICE CANDIDATES
        # ======================================================

        @self.pc.on("icecandidate")
        def on_icecandidate(candidate):

            if candidate:

                logger.info(
                    "Generated ICE candidate on Pi"
                )

                asyncio.create_task(
                    self.signaling_client.send_ice_candidate(
                        candidate.to_sdp(),
                        recipient_socket_id=caller_socket_id,
                    )
                )


        # ======================================================
        # 6. APPLY BROWSER OFFER
        # ======================================================

        offer = RTCSessionDescription(
            sdp=offer_sdp["sdp"],
            type=offer_sdp["type"],
        )

        await self.pc.setRemoteDescription(
            offer
        )

        logger.info(
            "Browser WebRTC offer applied"
        )


        # ======================================================
        # 7. INITIALIZE PI MICROPHONE
        #
        # Pi Mic
        #    ↓
        # microphone.py
        #    ↓
        # WebRTC
        #    ↓
        # Laptop Speaker
        # ======================================================

        try:

            logger.info(
                "Initializing Raspberry Pi microphone..."
            )

            self.microphone = (
                MicrophoneTrack()
            )

            self.pc.addTrack(
                self.microphone
            )

            logger.info(
                "Pi microphone added as outgoing "
                "WebRTC audio track"
            )

        except Exception as e:

            logger.exception(
                f"Could not initialize Pi microphone: {e}"
            )

            await self.close_connection()

            raise


        # ======================================================
        # 8. CREATE ANSWER
        # ======================================================

        answer = (
            await self.pc.createAnswer()
        )

        await self.pc.setLocalDescription(
            answer
        )

        logger.info(
            "Created WebRTC answer SDP"
        )

        return {
            "sdp":
                self.pc.localDescription.sdp,

            "type":
                self.pc.localDescription.type,
        }


    # ==========================================================
    # REMOTE ICE CANDIDATE
    # ==========================================================

    async def add_ice_candidate(
        self,
        candidate_dict: dict,
    ):

        if not self.pc:
            return

        if not candidate_dict:
            return

        try:

            candidate_str = (
                candidate_dict.get(
                    "candidate",
                    ""
                )
            )

            sdp_mid = (
                candidate_dict.get(
                    "sdpMid",
                    None
                )
            )

            sdp_mline_index = (
                candidate_dict.get(
                    "sdpMLineIndex",
                    None
                )
            )

            if candidate_str:

                logger.debug(
                    "Received remote ICE candidate "
                    f"(mid={sdp_mid}, "
                    f"mline={sdp_mline_index})"
                )

        except Exception as e:

            logger.debug(
                f"Could not process "
                f"ICE candidate: {e}"
            )


    # ==========================================================
    # LAPTOP MIC -> PI SPEAKER
    # ==========================================================

    async def _read_audio_track(
        self,
        track,
    ):

        logger.info(
            "Started reading incoming "
            "WebRTC audio frames..."
        )

        try:

            while True:

                # Receive decoded WebRTC audio
                frame = await track.recv()


                if not isinstance(
                    frame,
                    av.AudioFrame,
                ):
                    continue


                if not self.speaker:
                    continue


                # ==============================================
                # IMPORTANT FIX
                #
                # speaker.play_frame()
                # eventually calls ALSA pcm.write()
                #
                # pcm.write() is BLOCKING.
                #
                # Previously it was running directly inside
                # the asyncio event loop.
                #
                # That could block:
                #
                # Pi Mic -> WebRTC sender
                #
                # causing 80ms / 180ms / 240ms frame gaps.
                #
                # Now speaker playback runs in a worker thread.
                # ==============================================

                await asyncio.to_thread(
                    self.speaker.play_frame,
                    frame,
                )


        except asyncio.CancelledError:

            logger.info(
                "Incoming audio task cancelled"
            )

            raise


        except Exception as e:

            logger.info(
                f"Incoming audio track ended: {e}"
            )


    # ==========================================================
    # CLOSE CONNECTION
    # ==========================================================

    async def close_connection(
        self
    ):

        # ======================================================
        # 1. STOP LAPTOP -> PI AUDIO TASK
        # ======================================================

        if self.audio_task:

            self.audio_task.cancel()

            try:

                await self.audio_task

            except asyncio.CancelledError:
                pass

            except Exception:
                pass

            self.audio_task = None


        # ======================================================
        # 2. STOP PI MICROPHONE
        # ======================================================

        if self.microphone:

            try:

                self.microphone.stop()

            except Exception as e:

                logger.error(
                    f"Error stopping microphone: {e}"
                )

            self.microphone = None


        # ======================================================
        # 3. CLOSE PI SPEAKER
        # ======================================================

        if self.speaker:

            try:

                self.speaker.close()

            except Exception as e:

                logger.error(
                    f"Error closing speaker: {e}"
                )

            self.speaker = None


        # ======================================================
        # 4. CLOSE WEBRTC PEER CONNECTION
        # ======================================================

        if self.pc:

            pc = self.pc

            self.pc = None

            logger.info(
                "Closing RTCPeerConnection"
            )

            try:

                await pc.close()

            except Exception as e:

                logger.error(
                    f"Error closing WebRTC connection: {e}"
                )