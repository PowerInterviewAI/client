'use client';

import { Card } from '@/components/ui/card';
import axiosClient from '@/lib/axiosClient';
import { OfferRequest, WebRTCOptions } from '@/types/webrtc';
import { UserCircle2 } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface VideoPanelProps {
  photo: string;
  cameraDevice: string;
  videoWidth: number;
  videoHeight: number;
  enableFaceSwap: boolean;
  enableFaceEnhance: boolean;
}

export interface VideoPanelHandle {
  startWebRTC: () => Promise<void>;
  stopWebRTC: () => void;
}

export const VideoPanel = forwardRef<VideoPanelHandle, VideoPanelProps>(
  ({ photo, cameraDevice, videoWidth, videoHeight, enableFaceSwap, enableFaceEnhance }, ref) => {
    const [videoMessage, setVideoMessage] = useState('Video Stream');
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    const startWebRTC = async () => {
      if (pcRef.current) return;

      setVideoMessage('Waiting for processed video stream...');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Attach remote stream to video element
      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Get local camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: cameraDevice ? { exact: cameraDevice } : undefined,
          width: videoWidth,
          height: videoHeight,
        },
        audio: false,
      });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to server
      const res = await axiosClient.post('/api/webrtc/offer', {
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

    const stopWebRTC = () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setVideoMessage('Video Stream');
      setIsStreaming(false);
    };

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
