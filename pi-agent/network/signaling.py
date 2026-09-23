import asyncio
import logging
import socketio
from config import DEVICE_ID, SIGNALING_SERVER

logger = logging.getLogger("pi-agent.signaling")

class SignalingClient:
    def __init__(self, signaling_server: str = SIGNALING_SERVER, device_id: str = DEVICE_ID):
        self.server_url = signaling_server
        self.device_id = device_id
        self.sio = socketio.AsyncClient(reconnection=True, reconnection_delay=2)
        self.webrtc_manager = None

        self._setup_event_handlers()

    def set_webrtc_manager(self, manager):
        self.webrtc_manager = manager

    def _setup_event_handlers(self):
        @self.sio.event
        async def connect():
            logger.info(f"Connected to NestJS signaling server at {self.server_url}")
            await self.register_device()

        @self.sio.event
        async def disconnect():
            logger.warning("Disconnected from NestJS signaling server. Attempting reconnection...")
            if self.webrtc_manager:
                await self.webrtc_manager.close_connection()

        @self.sio.on("webrtc:offer")
        async def on_offer(data):
            logger.info("Received 'webrtc:offer' event from signaling server")
            caller_socket_id = data.get("callerSocketId")
            sdp_offer = data.get("sdp")

            if self.webrtc_manager and caller_socket_id and sdp_offer:
                try:
                    answer_sdp = await self.webrtc_manager.handle_offer(caller_socket_id, sdp_offer)
                    await self.sio.emit("webrtc:answer", {
                        "targetDeviceId": self.device_id,
                        "callerSocketId": caller_socket_id,
                        "sdp": answer_sdp
                    })
                    logger.info("Sent 'webrtc:answer' back to caller")
                except Exception as e:
                    logger.error(f"Error generating WebRTC answer: {e}")

        @self.sio.on("webrtc:ice-candidate")
        async def on_ice_candidate(data):
            candidate = data.get("candidate")
            if self.webrtc_manager and candidate:
                await self.webrtc_manager.add_ice_candidate(candidate)

        @self.sio.on("call:ended")
        async def on_call_ended(data):
            logger.info("Received call:ended signal")
            if self.webrtc_manager:
                await self.webrtc_manager.close_connection()

    async def register_device(self):
        payload = {
            "deviceId": self.device_id,
            "type": "raspberry-pi"
        }
        logger.info(f"Registering device '{self.device_id}' with server...")
        await self.sio.emit("device:register", payload)

    async def send_ice_candidate(self, candidate_sdp: str, recipient_socket_id: str):
        if self.sio.connected:
            await self.sio.emit("webrtc:ice-candidate", {
                "recipientSocketId": recipient_socket_id,
                "candidate": candidate_sdp
            })

    async def start(self):
        while True:
            try:
                logger.info(f"Connecting to signaling server at {self.server_url}...")
                await self.sio.connect(self.server_url, transports=["websocket", "polling"])
                await self.sio.wait()
            except Exception as e:
                logger.error(f"Signaling connection error: {e}. Retrying in 5 seconds...")
                await asyncio.sleep(5)
