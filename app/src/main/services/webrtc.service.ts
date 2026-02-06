/**
 * WebRTC Service
 * Manages media service for screen sharing
 */

import { ApiClient } from '../api/client.js';
import { configStore } from '../store/config.store.js';
import { OfferRequest, WebRTCOptions } from '../types/webrtc.js';

class WebRTCService {
  private serviceActive = false;

  /**
   * Offer WebRTC connection for media streaming
   */
  // eslint-disable-next-line
  async offer(offer: any): Promise<any> {
    const conf = configStore.getConfig();

    const apiClient = new ApiClient();
    const res = await apiClient.post('/api/video/offer', {
      sdp: offer.sdp,
      type: offer.type,
      options: {
        photo: conf.interview_conf.photo,
        enhance_face: conf.enable_face_enhance,
      } as WebRTCOptions,
    } as OfferRequest);
    return res;
  }

  /**
   * Start media service
   */
  async startAgents(): Promise<void> {
    if (this.serviceActive) {
      console.log('WebRTC service already active');
      return;
    }

    console.log('Starting WebRTC service...');
    this.serviceActive = true;

    // TODO: Implement actual service logic
    // - Initialize media service device
    // - Setup video stream capture
    // - Start frame processing/forwarding
  }

  /**
   * Stop media service
   */
  async stopAgents(): Promise<void> {
    if (!this.serviceActive) {
      console.log('WebRTC service not active');
      return;
    }

    console.log('Stopping WebRTC service...');
    this.serviceActive = false;

    // TODO: Implement cleanup logic
    // - Stop video stream
    // - Clean up media service resources
    // - Release device handles
  }

  async putVideoFrame(frameData: ArrayBuffer): Promise<void> {
    if (!this.serviceActive) {
      console.warn('WebRTC service not active. Cannot send video frame.');
      return;
    }
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      serviceActive: this.serviceActive,
    };
  }
}

export const webRtcService = new WebRTCService();
