export interface WebRTCOptions {
  photo: string;
  swap_face: boolean;
  background_blur: boolean;
  enhance_face: boolean;
}

export interface OfferRequest {
  sdp: string;
  type: string;
  options: WebRTCOptions;
}
