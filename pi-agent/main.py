import asyncio
import logging
import sys
from config import DEVICE_ID, SIGNALING_SERVER, ALSA_PLAYBACK_DEVICE
from network.signaling import SignalingClient
from network.webrtc import WebRTCManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("pi-agent")

async def main():
    logger.info("==================================================")
    logger.info("  Raspberry Pi Rover Agent (Audio MVP)")
    logger.info("==================================================")
    logger.info(f" Device ID : {DEVICE_ID}")
    logger.info(f" Server    : {SIGNALING_SERVER}")
    logger.info(f" ALSA Out  : {ALSA_PLAYBACK_DEVICE}")
    logger.info("==================================================")

    # Instantiate signaling client & WebRTC manager
    signaling = SignalingClient(signaling_server=SIGNALING_SERVER, device_id=DEVICE_ID)
    webrtc_mgr = WebRTCManager(signaling_client=signaling)
    signaling.set_webrtc_manager(webrtc_mgr)

    # Start signaling connection task
    try:
        await signaling.start()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Stopping Pi agent...")
        await webrtc_mgr.close_connection()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Agent stopped by user.")
