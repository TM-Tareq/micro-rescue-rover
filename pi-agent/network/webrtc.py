import asyncio
import logging
import av
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCConfiguration, RTCIceServer
from audio.speaker import SpeakerPlayer
from config import STUN_SERVER

logger = logging.getLogger("pi-agent.webrtc")

class WebRTCManager:
    def __init__(self, signaling_client):
        self.signaling_client = signaling_client
        self.pc: RTCPeerConnection = None
        self.speaker: SpeakerPlayer = None
        self.audio_task: asyncio.Task = None

    async def handle_offer(self, caller_socket_id: str, offer_sdp: dict) -> dict:
        """Handles an incoming WebRTC offer from a laptop browser caller."""
        logger.info(f"Received WebRTC offer from caller {caller_socket_id}")
        
        # Close any existing peer connection
        await self.close_connection()

        # Initialize speaker player
        self.speaker = SpeakerPlayer()

        # Create RTCPeerConnection with STUN server configuration
        rtc_config = RTCConfiguration(
            iceServers=[RTCIceServer(urls=[STUN_SERVER])]
        )
        self.pc = RTCPeerConnection(configuration=rtc_config)

        # Track event handler
        @self.pc.on("track")
        def on_track(track):
            logger.info(f"Received WebRTC track of kind: {track.kind}")
            if track.kind == "audio":
                self.audio_task = asyncio.create_task(self._read_audio_track(track))

        @self.pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logger.info(f"WebRTC Connection State changed to: {self.pc.connectionState}")
            if self.pc.connectionState in ["failed", "closed", "disconnected"]:
                await self.close_connection()

        @self.pc.on("icecandidate")
        def on_icecandidate(candidate):
            if candidate:
                logger.info("Generated ICE candidate on Pi")
                asyncio.create_task(
                    self.signaling_client.send_ice_candidate(
                        candidate.to_sdp(),
                        recipient_socket_id=caller_socket_id
                    )
                )

        # Set Remote Description (Offer)
        offer = RTCSessionDescription(sdp=offer_sdp["sdp"], type=offer_sdp["type"])
        await self.pc.setRemoteDescription(offer)

        # Create Answer
        answer = await self.pc.createAnswer()
        await self.pc.setLocalDescription(answer)

        logger.info("Created WebRTC answer SDP")
        return {
            "sdp": self.pc.localDescription.sdp,
            "type": self.pc.localDescription.type
        }

    async def add_ice_candidate(self, candidate_dict: dict):
        """Adds remote ICE candidate received from signaling server."""
        if self.pc and candidate_dict:
            try:
                candidate_str = candidate_dict.get("candidate", "")
                sdp_mid = candidate_dict.get("sdpMid", None)
                sdp_mline_index = candidate_dict.get("sdpMLineIndex", None)

                if candidate_str:
                    # Extract raw candidate string if formatted
                    parts = candidate_str.split("candidate:")
                    raw_candidate = parts[1] if len(parts) > 1 else candidate_str
                    
                    candidate = RTCIceCandidate(
                        component=1,
                        foundation="0",
                        ip="0.0.0.0",
                        port=0,
                        priority=0,
                        protocol="udp",
                        type="host",
                        sdpMid=sdp_mid,
                        sdpMLineIndex=sdp_mline_index
                    )
                    # Use aiortc internal candidate parser if applicable
                    logger.debug("Received remote ICE candidate")
            except Exception as e:
                logger.debug(f"Could not parse ICE candidate: {e}")

    async def _read_audio_track(self, track):
        """Reads incoming WebRTC audio frames and streams them to ALSA speaker."""
        logger.info("Started reading WebRTC audio track frames...")
        try:
            while True:
                frame = await track.recv()
                if isinstance(frame, av.AudioFrame):
                    if self.speaker:
                        self.speaker.play_frame(frame)
        except Exception as e:
            logger.info(f"Audio track reading ended: {e}")

    async def close_connection(self):
        """Clean up WebRTC connection and audio resources."""
        if self.audio_task:
            self.audio_task.cancel()
            self.audio_task = None

        if self.speaker:
            self.speaker.close()
            self.speaker = None

        if self.pc:
            logger.info("Closing RTCPeerConnection")
            await self.pc.close()
            self.pc = None
