export interface WebRTCOptions {
  photo: string;
  enhance_face: boolean;
}

export interface OfferRequest {
  sdp: string;
  type: string;
  options: WebRTCOptions;
}
