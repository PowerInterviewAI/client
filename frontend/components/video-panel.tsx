'use client';

import { Card } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';

interface VideoPanelProps {
  photo: string;
  cameraDevice: string;
  videoWidth: number;
  videoHeight: number;
  enableFaceSwap: boolean;
  enableFaceEnhance: boolean;
}

export default function VideoPanel({
  photo,
  cameraDevice,
  videoWidth,
  videoHeight,
  enableFaceSwap,
  enableFaceEnhance,
}: VideoPanelProps) {
  const offerUrl = 'http://localhost:8000/offer';
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const startWebRTC = async () => {
    if (pcRef.current) return;
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
    const res = await fetch(offerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sdp: offer.sdp,
        type: offer.type,
        options: { photo, enableFaceSwap, enableFaceEnhance },
      }),
    });
    const answer = await res.json();

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
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => stopWebRTC();
  }, []);

  return (
    <Card className="relative w-full h-full overflow-hidden bg-black shrink-0">
      {/* Video element */}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-b from-slate-900 to-black">
          <div className="text-center">
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-700" />
            <p className="text-gray-400 text-xs">Waiting for stream...</p>
          </div>
        </div>
      )}

      {/* Video info overlay */}
      {isStreaming && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur px-2 py-1 rounded-md">
          <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white text-xs font-medium">LIVE</span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        <button
          onClick={startWebRTC}
          disabled={isStreaming}
          className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition"
        >
          Start
        </button>
        <button
          onClick={stopWebRTC}
          disabled={!isStreaming}
          className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition"
        >
          Stop
        </button>
      </div>
    </Card>
  );
}
