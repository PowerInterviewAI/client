export interface ClientPingRequest {
  is_gpu_alive: boolean;
  is_assistant_running: boolean;
}

export interface ClientPingResponse {
  credits: number;
}
