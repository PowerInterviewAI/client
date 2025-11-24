export interface WebRTCOptions {
  photo: string;
  swap_face: boolean;
  enhance_face: boolean;
}

export interface OfferRequest {
  sdp: string;
  type: string;
  options: WebRTCOptions;
}
