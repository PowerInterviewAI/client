import { useVideoDevices } from '@/hooks/video-devices';
import axiosClient from '@/lib/axiosClient';
import { RunningState } from '@/types/appState';
import { type OfferRequest, type WebRTCOptions } from '@/types/webrtc';
import { UserCircle2 } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useConfigStore } from '@/hooks/use-config-store';

interface VideoPanelProps {
  runningState: RunningState;
  // Optional: streaming fps for websocket
  fps?: number;
  jpegQuality?: number; // 0.0 - 1.0
}

export interface VideoPanelHandle {
  startWebRTC: () => Promise<void>;
  stopWebRTC: () => void;
}

export const VideoPanel = forwardRef<VideoPanelHandle, VideoPanelProps>(
  ({ runningState, fps = 30, jpegQuality = 0.8 }, ref) => {
    const { config } = useConfigStore();
    const videoDevices = useVideoDevices();

    const photo = config?.interview_conf?.photo ?? '';
    const cameraDeviceName = config?.camera_device_name ?? '';
    const videoWidth = config?.video_width ?? 640;
    const videoHeight = config?.video_height ?? 480;
    const enableFaceEnhance = config?.enable_face_enhance ?? false;

    const [videoMessage, setVideoMessage] = useState('Video Stream');
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    // WebSocket and frame loop references
    const wsRef = useRef<WebSocket | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameTimerRef = useRef<number | null>(null);
    const sendingRef = useRef(false);
    const droppedRef = useRef(0);

    const [isStreaming, setIsStreaming] = useState(false);

    const checkActiveVideoCodec = () => {
      if (!pcRef.current) return;

      try {
        const videoTransceiver = pcRef.current
          .getTransceivers()
          .find((t) => t.receiver.track?.kind === 'video');
        if (videoTransceiver) {
          const receiverParams = videoTransceiver.receiver.getParameters();
          const activeCodec = receiverParams.codecs?.[0];

          if (activeCodec) {
            console.log('Active video codec:', activeCodec);
            setVideoMessage(`Active codec: ${activeCodec.mimeType} (${activeCodec.clockRate}Hz)`);
          } else {
            console.log('No active video codec found');
          }
        }
      } catch (error) {
        console.error('Error checking active codec:', error);
      }
    };

    const checkSupportedVideoCodecs = () => {
      try {
        const videoCapabilities = RTCRtpSender.getCapabilities('video');
        console.log('Supported video codecs:', videoCapabilities?.codecs);
      } catch (error) {
        console.error('Error getting video capabilities:', error);
      }
    };

    // Check supported codecs on mount
    useEffect(() => {
      checkSupportedVideoCodecs();
    }, []);

    const startWebRTC = async () => {
      if (pcRef.current) return;

      setVideoMessage('Waiting for processed video stream...');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Hold the remote stream when it arrives
      const remoteStream = new MediaStream();
      pc.ontrack = (event) => {
        // Add incoming tracks to remoteStream
        if (event.streams?.[0]) {
          const firstTrack = event.streams[0].getTracks()[0];
          if (firstTrack) remoteStream.addTrack(firstTrack);
        } else if (event.track) {
          remoteStream.addTrack(event.track);
        }

        // Attach remote stream to visible video element
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play().catch(() => {});
        }

        // Start sending frames from the remote stream to the backend
        // Only start once (guard)
        if (!wsRef.current) {
          startWebSocketFrameStreamingFromStream(
            remoteStream,
            videoWidth,
            videoHeight,
            fps,
            jpegQuality
          ).catch((err) => console.error('Frame streaming failed', err));
        }
      };

      // Find video device id from name
      const videoDeviceId = videoDevices.find((d) => d.label === cameraDeviceName)?.deviceId;
      console.log('Video device id', videoDevices, cameraDeviceName, videoDeviceId);

      // Acquire local camera only if you still want to send local tracks to the peer
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
          width: { ideal: videoWidth },
          height: { ideal: videoHeight },
          frameRate: { ideal: fps, max: fps },
        },
        audio: false,
      });
      streamRef.current = localStream;

      // Get capabilities and prefer H264 first
      const caps = RTCRtpSender.getCapabilities('video');
      if (!caps) {
        toast.warning('Unable to get video capabilities');
        console.warn('No video capabilities available');
        return;
      }
      const h264Codecs = caps.codecs.filter(
        (c) =>
          c.mimeType.toLowerCase() === 'video/h264' &&
          c.sdpFmtpLine?.includes('profile-level-id=42c01e') // Constrained Baseline L3.0
      );
      const preferredCodecs = [...h264Codecs];

      // Create transceiver BEFORE attaching track
      const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
      videoTransceiver.setCodecPreferences(preferredCodecs);

      // Attach camera track to transceiver
      const videoTrack = localStream.getVideoTracks()[0];
      await videoTransceiver.sender.replaceTrack(videoTrack);

      const sender = videoTransceiver.sender;
      const params = sender.getParameters();

      let maxBitrate;
      if (videoWidth >= 1920) {
        maxBitrate = 3_500_000; // 1080p
      } else if (videoWidth >= 1280) {
        maxBitrate = 1_800_000; // 720p
      } else {
        maxBitrate = 500_000; // 640x480
      }

      params.encodings = [
        {
          maxBitrate,
          maxFramerate: fps,
        },
      ];

      params.degradationPreference = 'maintain-framerate';

      await sender.setParameters(params);

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to server with face swap always enabled
      const res = await axiosClient.post('/video/offer', {
        sdp: offer.sdp,
        type: offer.type,
        options: {
          photo,
          enhance_face: enableFaceEnhance,
        } as WebRTCOptions,
      } as OfferRequest);
      const answer = res.data;

      // Apply answer
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      setIsStreaming(true);

      // Check the active video codec
      checkActiveVideoCodec();
    };

    const startWebSocketFrameStreamingFromStream = async (
      stream: MediaStream,
      width: number,
      height: number,
      fps: number,
      quality: number
    ) => {
      // Create canvas and hidden video feeder
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      const feederVideo = document.createElement('video');
      feederVideo.playsInline = true;
      feederVideo.muted = true;
      feederVideo.autoplay = true;
      feederVideo.srcObject = stream;

      // Ensure the remote video is playing before drawing frames
      await feederVideo.play().catch(() => {
        // play() may fail if autoplay blocked; user interaction may be required
      });

      // Open WebSocket
      const ws = new WebSocket(`${window.location.origin}/api/video/frames`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Start frame loop
      };

      ws.onclose = () => {
        // cleanup handled elsewhere
      };

      ws.onerror = (ev) => {
        console.error('WebSocket error', ev);
      };

      // Frame loop
      const intervalMs = Math.round(1000 / fps);
      const BUFFERED_AMOUNT_MAX = 2_000_000; // bytes (2 MB)

      const loop = () => {
        try {
          // Backpressure: if a send/encode is in progress or socket bufferedAmount is high, drop frame
          if (
            sendingRef.current ||
            ws.readyState !== WebSocket.OPEN ||
            (ws.bufferedAmount && ws.bufferedAmount > BUFFERED_AMOUNT_MAX)
          ) {
            droppedRef.current += 1;
            return;
          }

          // mark busy (covers encode + send)
          sendingRef.current = true;

          // draw remote frame into canvas
          ctx.drawImage(feederVideo, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                sendingRef.current = false;
                return;
              }
              if (ws.readyState === WebSocket.OPEN) {
                // send ArrayBuffer for binary websocket
                blob
                  .arrayBuffer()
                  .then((buf) => {
                    try {
                      ws.send(buf);
                    } catch (e) {
                      console.error('WebSocket send error', e);
                    }
                  })
                  .finally(() => {
                    sendingRef.current = false;
                  });
              } else {
                sendingRef.current = false;
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          // ignore transient errors (e.g., video not ready)
          console.error(err);
          sendingRef.current = false;
        }
      };

      frameTimerRef.current = window.setInterval(loop, intervalMs);
    };

    const stopWebRTC = () => {
      // Stop frame loop
      if (frameTimerRef.current !== null) {
        window.clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }

      // Close WebSocket
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }

      // Close RTCPeerConnection
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {}
        pcRef.current = null;
      }

      // Stop media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Clear canvas
      canvasRef.current = null;

      setVideoMessage('Video Stream');
      setIsStreaming(false);
    };

    // Start/stop WebRTC on running state change
    useEffect(() => {
      if (
        runningState === RunningState.STOPPING ||
        runningState === RunningState.STOPPED ||
        runningState === RunningState.IDLE
      ) {
        stopWebRTC();
      }
    }, [runningState]);

    // cleanup on unmount
    useEffect(() => {
      return () => stopWebRTC();
    }, []);

    // ⚡ Expose functions to parent via ref
    useImperativeHandle(ref, () => ({
      startWebRTC,
      stopWebRTC,
    }));

    return (
      <div className="relative w-full h-full border rounded-xl overflow-hidden bg-white dark:bg-black shrink-0 py-0">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-linear-to-b from-gray-200 to-white dark:from-slate-900 dark:to-black">
            <div className="text-center">
              <UserCircle2 className="mx-auto h-12 w-12 font-thin text-gray-500 dark:text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 text-xs">{videoMessage}</p>
            </div>
          </div>
        )}

        {isStreaming && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/70 dark:bg-black/70 backdrop-blur px-2 py-1">
            <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-black dark:text-white text-xs font-medium">LIVE</span>
          </div>
        )}
      </div>
    );
  }
);

VideoPanel.displayName = 'VideoPanel';
