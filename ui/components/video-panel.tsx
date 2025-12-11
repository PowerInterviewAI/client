'use client';

import { Card } from '@/components/ui/card';
import { useVideoDevices } from '@/hooks/video-devices';
import axiosClient from '@/lib/axiosClient';
import { RunningState } from '@/types/appState';
import { OfferRequest, WebRTCOptions } from '@/types/webrtc';
import { UserCircle2 } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface VideoPanelProps {
  runningState: RunningState;
  // Video control options
  photo: string;
  cameraDeviceName: string;
  videoWidth: number;
  videoHeight: number;
  enableFaceSwap: boolean;
  enableFaceEnhance: boolean;
  // Optional: streaming fps for websocket
  fps?: number;
  jpegQuality?: number; // 0.0 - 1.0
}

export interface VideoPanelHandle {
  startWebRTC: () => Promise<void>;
  stopWebRTC: () => void;
}

export const VideoPanel = forwardRef<VideoPanelHandle, VideoPanelProps>(
  (
    {
      runningState,
      photo,
      cameraDeviceName,
      videoWidth,
      videoHeight,
      enableFaceSwap,
      enableFaceEnhance,
      fps = 30,
      jpegQuality = 0.7,
    },
    ref,
  ) => {
    const videoDevices = useVideoDevices();

    const [videoMessage, setVideoMessage] = useState('Video Stream');
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    // WebSocket and frame loop references
    const wsRef = useRef<WebSocket | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameTimerRef = useRef<number | null>(null);

    const [isStreaming, setIsStreaming] = useState(false);

    const startWebRTC = async () => {
      if (pcRef.current) return;

      setVideoMessage('Waiting for processed video stream...');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Hold the remote stream when it arrives
      const remoteStream = new MediaStream();
      pc.ontrack = (event) => {
        // Add incoming tracks to remoteStream
        event.streams?.[0]
          ? remoteStream.addTrack(event.streams[0].getTracks()[0])
          : event.track && remoteStream.addTrack(event.track);

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
            jpegQuality,
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
        },
        audio: false,
      });
      streamRef.current = localStream;
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to server
      const res = await axiosClient.post('/webrtc/offer', {
        sdp: offer.sdp,
        type: offer.type,
        options: {
          photo,
          swap_face: enableFaceSwap,
          enhance_face: enableFaceEnhance,
        } as WebRTCOptions,
      } as OfferRequest);
      const answer = res.data;

      // Apply answer
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      setIsStreaming(true);
    };

    const startWebSocketFrameStreamingFromStream = async (
      stream: MediaStream,
      width: number,
      height: number,
      fps: number,
      quality: number,
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
      const ws = new WebSocket(`${window.location.origin}/api/webrtc/frames`);
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
      const loop = () => {
        try {
          // draw remote frame into canvas
          ctx.drawImage(feederVideo, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return;
              if (ws.readyState === WebSocket.OPEN) {
                // send ArrayBuffer for binary websocket
                blob.arrayBuffer().then((buf) => ws.send(buf));
              }
            },
            'image/jpeg',
            quality,
          );
        } catch (err) {
          // ignore transient errors (e.g., video not ready)
          console.error(err);
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
      <Card className="relative w-full h-full overflow-hidden bg-white dark:bg-black shrink-0 py-0">
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
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/70 dark:bg-black/70 backdrop-blur px-2 py-1 rounded-md">
            <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-black dark:text-white text-xs font-medium">LIVE</span>
          </div>
        )}
      </Card>
    );
  },
);

VideoPanel.displayName = 'VideoPanel';
