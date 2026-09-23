# Rover Platform - WebRTC Audio & Control MVP

A modular monorepo for controlling a Raspberry Pi 5 rover. This MVP implements real-time low-latency audio streaming from a laptop browser microphone directly to a Raspberry Pi 5 speaker (MAX98357A I2S amplifier via ALSA `plughw:0,0`).

---

## 🏗️ System Architecture

```
                       ┌─────────────────────────┐
                       │     NestJS Server       │
                       │   Signaling (Port 4000) │
                       └───────────┬─────────────┘
                                   │ Socket.IO
                 ┌─────────────────┴─────────────────┐
                 │                                   │
        ┌────────┴────────┐                 ┌────────┴────────┐
        │ Next.js Web App │                 │ Python Pi Agent │
        │ (Laptop Browser)│                 │ (Raspberry Pi 5)│
        └────────┬────────┘                 └────────┬────────┘
                 │                                   │
                 └────────────── WebRTC ─────────────┘
                             (Direct Audio)
                                   │
                           MAX98357A I2S DAC
                                   │
                                Speaker
```

---

## 📁 Repository Structure

```
rover-platform/
│
├── server/               # NestJS Socket.IO Signaling Server
│   ├── src/
│   │   ├── devices/      # Device state registry
│   │   └── signaling/    # WebRTC signaling gateway & events
│   └── package.json
│
├── web/                  # Next.js 14 Dashboard (App Router + Tailwind CSS)
│   ├── app/              # Dashboard page & layout
│   ├── components/       # UI Components (Audio, Camera, Status, etc.)
│   ├── lib/              # Socket.IO client & WebRTC client
│   └── package.json
│
└── pi-agent/             # Python 3 Raspberry Pi Agent
    ├── main.py           # Entry point
    ├── config.py         # Environment configuration
    ├── audio/            # PyAV decoding & ALSA audio playback
    ├── network/          # Socket.IO & aiortc WebRTC receiver
    ├── camera/           # [Placeholder] Video streaming
    ├── thermal/          # [Placeholder] Heatmap telemetry
    ├── vision/           # [Placeholder] Object detection
    ├── rover/            # [Placeholder] Motor control
    └── sensors/          # [Placeholder] Distance & battery telemetry
```

---

## ⚙️ Finding Your Laptop's Local IP Address

To allow the Raspberry Pi 5 on the same Wi-Fi network to connect to the laptop signaling server, obtain the laptop's local IP address:

### Windows:
```cmd
ipconfig
```
Look for **IPv4 Address** under your Wi-Fi or Wireless LAN adapter (e.g., `192.168.1.10`).

### macOS / Linux:
```bash
ifconfig
# or
ip a
```
Look for the `inet` address on `wlan0`, `eth0`, or `en0` (e.g., `192.168.1.10`).

---

## 🚀 Quick Start Guide

### 1️⃣ Step 1: Start NestJS Signaling Server

```bash
cd rover-platform/server
npm install
npm run start:dev
```
*The signaling server starts on port `4000` (`http://localhost:4000`).*

---

### 2️⃣ Step 2: Start Next.js Dashboard

Open a second terminal window:

```bash
cd rover-platform/web
npm install
```

Configure `.env.local` if accessing from another device:
```env
NEXT_PUBLIC_SIGNALING_SERVER=http://localhost:4000
```

Start the Next.js development server:
```bash
npm run dev
```
*Open `http://localhost:3000` in your laptop browser.*

---

### 3️⃣ Step 3: Run Raspberry Pi Agent

On your Raspberry Pi 5 (or local machine for testing):

```bash
cd rover-platform/pi-agent

# Install dependencies
pip install -r requirements.txt
```

Create `.env` inside `pi-agent/`:
```env
DEVICE_ID=rover-01
SIGNALING_SERVER=http://<YOUR_LAPTOP_IP>:4000
ALSA_PLAYBACK_DEVICE=plughw:0,0
AUDIO_SAMPLE_RATE=48000
AUDIO_CHANNELS=2
```

Run the agent:
```bash
python main.py
```

---

## 🧪 Acceptance Test Procedure

1. **Verify Online Status**:
   - When `main.py` starts on the RPi, check the Next.js dashboard at `http://localhost:3000`.
   - The device status indicator for `ROVER-01` must dynamically switch to **● ONLINE**.

2. **Start Audio Stream**:
   - Click **START TALK** on the audio panel.
   - Allow browser microphone permissions.
   - The audio status will transition from `Connecting...` to `Connected` / `LIVE AUDIO`.

3. **Verify Speaker Output**:
   - Speak into the laptop microphone.
   - Voice audio will play through the MAX98357A speaker connected to ALSA `plughw:0,0` with low latency.

4. **Test Controls**:
   - Click **MUTE** → Mic state updates to `MUTED` and audio output stops without dropping WebRTC.
   - Click **UNMUTE** → Audio resumes immediately.
   - Click **STOP TALK** → Connection closes, media tracks stop, and UI returns to `Idle`.
