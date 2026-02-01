/**
 * WebRTC Types
 */

export interface WebRtcConfig {
  iceServers: RTCIceServer[];
  mediaConstraints: MediaStreamConstraints;
}

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  dataChannel?: RTCDataChannel;
}

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  groupId: string;
}
