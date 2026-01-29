import { VideoPanelHandle } from '@/components/video-panel';
import axiosClient from '@/lib/axiosClient';
import { Config } from '@/types/config';
import { APIError } from '@/types/error';
import { useMutation } from '@tanstack/react-query';
import { RefObject } from 'react';

export const useStartAssistant = (
  videoPanelRef: RefObject<VideoPanelHandle | null>,
  config?: Config,
) =>
  useMutation<void, APIError>({
    mutationFn: async () => {
      await axiosClient.get('/app/start-assistant');

      // Start WebRTC if face swap is enabled
      if (config?.face_swap) {
        await videoPanelRef.current?.startWebRTC();
      }
    },
  });

export const useStopAssistant = (videoPanelRef: RefObject<VideoPanelHandle | null>) =>
  useMutation<void, APIError>({
    mutationFn: async () => {
      await axiosClient.get('/app/stop-assistant');
      videoPanelRef.current?.stopWebRTC();
    },
  });
