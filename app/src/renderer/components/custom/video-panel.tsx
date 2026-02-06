import { UserCircle2 } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useConfigStore } from '@/hooks/use-config-store';
import { useVideoDevices } from '@/hooks/use-video-devices';
import { getElectron } from '@/lib/utils';
import { RunningState } from '@/types/app-state';

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

    const cameraDeviceName = config?.camera_device_name ?? '';
    const videoWidth = config?.video_width ?? 640;
    const videoHeight = config?.video_height ?? 480;

    const [videoMessage, setVideoMessage] = useState('Video Stream');
    const videoRef = useRef<HTMLVideoElement>(null);
    const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const captureIntervalRef = useRef<number | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    const electron = getElectron();
    if (!electron) {
      throw new Error('Electron API not available');
    }

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
          // Start capture loop to compress frames to JPEG and send to main
          startCaptureLoop();
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
      const res = await electron.webRtc.offer(offer);
      const answer = res.data;

      // Apply answer
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      setIsStreaming(true);

      // Check the active video codec
      checkActiveVideoCodec();
    };

    const startCaptureLoop = () => {
      // avoid starting multiple loops
      if (captureIntervalRef.current) return;

      const canvas = document.createElement('canvas');
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      captureCanvasRef.current = canvas;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const intervalMs = Math.max(1000 / fps, 33); // cap to ~30fps min interval

      captureIntervalRef.current = window.setInterval(async () => {
        try {
          const videoEl = videoRef.current;
          if (!videoEl || videoEl.readyState < 2) return;

          // draw current frame
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

          // convert to JPEG blob
          canvas.toBlob(
            async (blob) => {
              if (!blob) return;
              try {
                const arrayBuffer = await blob.arrayBuffer();
                // send to main process via preload API
                await electron.webRtc.putVideoFrame(arrayBuffer);
              } catch (err) {
                console.warn('Failed to send video frame to main:', err);
              }
            },
            'image/jpeg',
            jpegQuality
          );
        } catch (err) {
          console.warn('Error in capture loop:', err);
        }
      }, intervalMs) as unknown as number;
    };

    const stopCaptureLoop = () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (captureCanvasRef.current) {
        captureCanvasRef.current = null;
      }
    };

    const stopWebRTC = () => {
      // Close RTCPeerConnection
      if (pcRef.current) {
        try {
          pcRef.current.close();
          // eslint-disable-next-line no-empty
        } catch {}
        pcRef.current = null;
      }

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // stop capture loop
      stopCaptureLoop();

      setVideoMessage('Video Stream');
      setIsStreaming(false);
    };

    // Start/stop WebRTC on running state change
    useEffect(() => {
      if (runningState === RunningState.STOPPING || runningState === RunningState.IDLE) {
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
