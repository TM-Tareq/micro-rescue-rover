import { Socket } from 'socket.io-client';


export type AudioState =
  | 'Idle'
  | 'Connecting'
  | 'Connected'
  | 'Muted'
  | 'Error';


export type MicState =
  | 'Off'
  | 'On'
  | 'Muted';


export interface WebRTCCallbacks {
  onAudioStateChange: (state: AudioState) => void;
  onMicStateChange: (state: MicState) => void;
  onError: (errorMessage: string) => void;
}


/*
 * TEMPORARY DEBUG MODE
 *
 * true:
 * Laptop microphone is completely disabled.
 *
 * This allows us to test only:
 *
 * Pi Mic
 *   ↓
 * WebRTC
 *   ↓
 * Laptop Speaker
 *
 * Pi Speaker should receive DIGITAL SILENCE.
 */
const DEBUG_HARD_MUTE_LAPTOP_MIC = true;


export class WebRTCClient {

  private pc: RTCPeerConnection | null = null;

  private localStream: MediaStream | null = null;

  private remoteAudio: HTMLAudioElement | null = null;

  private socket: Socket;

  private targetDeviceId: string;

  private callbacks: WebRTCCallbacks;

  private isMuted: boolean = false;


  constructor(
    socket: Socket,
    targetDeviceId: string = 'rover-01',
    callbacks: WebRTCCallbacks
  ) {

    this.socket = socket;
    this.targetDeviceId = targetDeviceId;
    this.callbacks = callbacks;

    this.setupSocketListeners();
  }


  // ==========================================================
  // SIGNALING
  // ==========================================================

  private setupSocketListeners() {

    // ----------------------------------------------------------
    // ANSWER FROM RASPBERRY PI
    // ----------------------------------------------------------

    this.socket.on(
      'webrtc:answer',
      async (
        data: {
          sdp: RTCSessionDescriptionInit;
        }
      ) => {

        try {

          if (
            !this.pc ||
            !data.sdp
          ) {
            return;
          }


          console.log(
            '[WebRTC] Received answer SDP from Pi'
          );


          await this.pc.setRemoteDescription(
            new RTCSessionDescription(
              data.sdp
            )
          );


          console.log(
            '[WebRTC] Pi answer applied successfully'
          );


        } catch (err) {

          console.error(
            '[WebRTC] Failed to apply Pi answer:',
            err
          );


          this.callbacks.onAudioStateChange(
            'Error'
          );


          this.callbacks.onError(
            'Failed to handle WebRTC answer from Raspberry Pi'
          );
        }
      }
    );


    // ----------------------------------------------------------
    // REMOTE ICE CANDIDATE
    // ----------------------------------------------------------

    this.socket.on(
      'webrtc:ice-candidate',
      async (
        data: {
          candidate: RTCIceCandidateInit;
        }
      ) => {

        try {

          if (
            !this.pc ||
            !data.candidate
          ) {
            return;
          }


          console.log(
            '[WebRTC] Received ICE candidate'
          );


          await this.pc.addIceCandidate(
            new RTCIceCandidate(
              data.candidate
            )
          );


        } catch (err) {

          console.error(
            '[WebRTC] ICE candidate error:',
            err
          );
        }
      }
    );


    // ----------------------------------------------------------
    // CALL ERROR
    // ----------------------------------------------------------

    this.socket.on(
      'call:error',
      (
        data: {
          message: string;
        }
      ) => {

        console.error(
          '[WebRTC] Call error:',
          data.message
        );


        this.callbacks.onError(
          data.message
        );


        this.stopTalk();
      }
    );


    // ----------------------------------------------------------
    // REMOTE END
    // ----------------------------------------------------------

    this.socket.on(
      'call:ended',
      () => {

        console.log(
          '[WebRTC] Call ended by remote'
        );


        this.stopTalk();
      }
    );
  }


  // ==========================================================
  // START AUDIO
  // ==========================================================

  async startTalk(): Promise<void> {

    try {

      // Avoid duplicate peer connections
      if (this.pc) {

        console.log(
          '[WebRTC] Existing connection found, closing it'
        );

        this.stopTalk();
      }


      this.callbacks.onAudioStateChange(
        'Connecting'
      );


      // ========================================================
      // 1. GET LAPTOP MICROPHONE
      // ========================================================

      this.localStream =
        await navigator.mediaDevices.getUserMedia({

          audio: {

            echoCancellation: true,

            noiseSuppression: true,

            autoGainControl: true,
          },

          video: false,
        });


      // ========================================================
      // 2. HARD MUTE LAPTOP MIC FOR DEBUG
      // ========================================================

      if (
        DEBUG_HARD_MUTE_LAPTOP_MIC
      ) {

        this.localStream
          .getAudioTracks()
          .forEach(
            (
              track
            ) => {

              track.enabled = false;


              console.log(
                '[TEST] Laptop microphone HARD MUTED:',
                track.enabled
              );
            }
          );


        this.isMuted = true;


        this.callbacks.onMicStateChange(
          'Muted'
        );


        console.log(
          '[TEST] Laptop -> Pi audio should now be SILENCE'
        );


      } else {

        this.isMuted = false;


        this.callbacks.onMicStateChange(
          'On'
        );
      }


      // ========================================================
      // 3. CREATE PEER CONNECTION
      // ========================================================

      const rtcConfig: RTCConfiguration = {

        iceServers: [

          {
            urls:
              process.env.NEXT_PUBLIC_STUN_SERVER ||
              'stun:stun.l.google.com:19302',
          },

        ],
      };


      this.pc =
        new RTCPeerConnection(
          rtcConfig
        );


      // ========================================================
      // 4. PREPARE LAPTOP SPEAKER
      //
      // Pi Mic
      //   ↓
      // WebRTC
      //   ↓
      // Laptop Speaker
      // ========================================================

      this.remoteAudio =
        new Audio();


      this.remoteAudio.autoplay =
        true;


      this.remoteAudio.volume =
        1.0;


      // ========================================================
      // 5. RECEIVE PI MICROPHONE
      // ========================================================

      this.pc.ontrack =
        (
          event: RTCTrackEvent
        ) => {

          console.log(
            '[WebRTC] Remote track received:',
            event.track.kind
          );


          if (
            event.track.kind !== 'audio' ||
            !this.remoteAudio
          ) {
            return;
          }


          console.log(
            '[WebRTC] Pi microphone audio received'
          );


          let remoteStream: MediaStream;


          if (
            event.streams &&
            event.streams.length > 0
          ) {

            remoteStream =
              event.streams[0];

          } else {

            remoteStream =
              new MediaStream(
                [
                  event.track
                ]
              );
          }


          this.remoteAudio.srcObject =
            remoteStream;


          this.remoteAudio
            .play()
            .then(
              () => {

                console.log(
                  '[WebRTC] Pi microphone playing through laptop speaker'
                );
              }
            )
            .catch(
              (
                err
              ) => {

                console.error(
                  '[WebRTC] Remote audio play error:',
                  err
                );
              }
            );
        };


      // ========================================================
      // 6. CONNECTION STATE
      // ========================================================

      this.pc.onconnectionstatechange =
        () => {

          if (!this.pc) {
            return;
          }


          const state =
            this.pc.connectionState;


          console.log(
            '[WebRTC] Connection state:',
            state
          );


          if (
            state === 'connected'
          ) {

            this.callbacks.onAudioStateChange(
              'Connected'
            );


          } else if (
            state === 'failed' ||
            state === 'disconnected'
          ) {

            this.callbacks.onAudioStateChange(
              'Error'
            );


            this.callbacks.onError(
              'WebRTC connection failed or disconnected'
            );
          }
        };


      // ========================================================
      // 7. SEND LOCAL ICE CANDIDATES
      // ========================================================

      this.pc.onicecandidate =
        (
          event
        ) => {

          if (
            !event.candidate
          ) {
            return;
          }


          this.socket.emit(
            'webrtc:ice-candidate',
            {

              targetDeviceId:
                this.targetDeviceId,

              candidate:
                event.candidate,
            }
          );
        };


      // ========================================================
      // 8. ADD LAPTOP MICROPHONE TRACK
      //
      // Track is still added because we need a SENDRECV
      // audio transceiver.
      //
      // But track.enabled = false.
      //
      // Therefore Pi should receive SILENCE.
      // ========================================================

      this.localStream
        .getAudioTracks()
        .forEach(
          (
            track
          ) => {

            if (
              !this.pc ||
              !this.localStream
            ) {
              return;
            }


            if (
              DEBUG_HARD_MUTE_LAPTOP_MIC
            ) {

              track.enabled =
                false;
            }


            this.pc.addTrack(
              track,
              this.localStream
            );


            console.log(
              '[WebRTC] Laptop audio track added. Enabled:',
              track.enabled
            );
          }
        );


      // ========================================================
      // 9. CREATE TWO-WAY OFFER
      // ========================================================

      const offer =
        await this.pc.createOffer({

          offerToReceiveAudio:
            true,

          offerToReceiveVideo:
            false,
        });


      await this.pc.setLocalDescription(
        offer
      );


      // ========================================================
      // 10. START CALL
      // ========================================================

      this.socket.emit(
        'call:start',
        {

          targetDeviceId:
            this.targetDeviceId,
        }
      );


      // ========================================================
      // 11. SEND OFFER
      // ========================================================

      this.socket.emit(
        'webrtc:offer',
        {

          targetDeviceId:
            this.targetDeviceId,

          sdp:
            offer,
        }
      );


      console.log(
        '[WebRTC] Two-way audio offer sent to:',
        this.targetDeviceId
      );


    } catch (err: any) {

      console.error(
        '[WebRTC] Start error:',
        err
      );


      const message =

        err?.name ===
        'NotAllowedError'

          ? 'Microphone permission denied'

          : (
              err?.message ||
              'Failed to start WebRTC audio'
            );


      this.callbacks.onError(
        message
      );


      this.callbacks.onAudioStateChange(
        'Error'
      );


      this.stopTalk();
    }
  }


  // ==========================================================
  // MUTE BUTTON
  // ==========================================================

  toggleMute(): void {

    // During this test the laptop microphone
    // must NEVER be enabled.

    if (
      DEBUG_HARD_MUTE_LAPTOP_MIC
    ) {

      if (
        this.localStream
      ) {

        this.localStream
          .getAudioTracks()
          .forEach(
            (
              track
            ) => {

              track.enabled =
                false;
            }
          );
      }


      this.isMuted =
        true;


      this.callbacks.onMicStateChange(
        'Muted'
      );


      console.log(
        '[TEST] Laptop microphone remains HARD MUTED'
      );


      return;
    }


    // Normal mode
    if (
      !this.localStream
    ) {
      return;
    }


    this.isMuted =
      !this.isMuted;


    this.localStream
      .getAudioTracks()
      .forEach(
        (
          track
        ) => {

          track.enabled =
            !this.isMuted;
        }
      );


    this.callbacks.onMicStateChange(
      this.isMuted
        ? 'Muted'
        : 'On'
    );
  }


  // ==========================================================
  // STOP AUDIO
  // ==========================================================

  stopTalk(): void {

    console.log(
      '[WebRTC] Stopping two-way audio'
    );


    // ----------------------------------------------------------
    // Inform Pi
    // ----------------------------------------------------------

    if (
      this.socket.connected
    ) {

      this.socket.emit(
        'call:end',
        {

          targetDeviceId:
            this.targetDeviceId,
        }
      );
    }


    // ----------------------------------------------------------
    // Stop laptop microphone
    // ----------------------------------------------------------

    if (
      this.localStream
    ) {

      this.localStream
        .getTracks()
        .forEach(
          (
            track
          ) => {

            track.stop();
          }
        );


      this.localStream =
        null;
    }


    // ----------------------------------------------------------
    // Stop laptop playback of Pi microphone
    // ----------------------------------------------------------

    if (
      this.remoteAudio
    ) {

      this.remoteAudio.pause();


      this.remoteAudio.srcObject =
        null;


      this.remoteAudio =
        null;
    }


    // ----------------------------------------------------------
    // Close PeerConnection
    // ----------------------------------------------------------

    if (
      this.pc
    ) {

      this.pc.ontrack =
        null;


      this.pc.onicecandidate =
        null;


      this.pc.onconnectionstatechange =
        null;


      this.pc.close();


      this.pc =
        null;
    }


    this.isMuted =
      false;


    this.callbacks.onMicStateChange(
      'Off'
    );


    this.callbacks.onAudioStateChange(
      'Idle'
    );
  }


  // ==========================================================
  // DESTROY
  // ==========================================================

  destroy(): void {

    this.stopTalk();


    this.socket.off(
      'webrtc:answer'
    );


    this.socket.off(
      'webrtc:ice-candidate'
    );


    this.socket.off(
      'call:error'
    );


    this.socket.off(
      'call:ended'
    );
  }
}