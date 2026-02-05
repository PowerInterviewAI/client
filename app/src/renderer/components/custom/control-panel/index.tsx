import { Ellipsis, Play, Square } from 'lucide-react';

import { useAssistantState } from '@/hooks/use-assistant-state';
import { useAudioInputDevices, useAudioOutputDevices } from '@/hooks/use-audio-devices';
import { useConfigStore } from '@/hooks/use-config-store';
import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import { useVideoDevices } from '@/hooks/use-video-devices';
import { RunningState } from '@/types/app-state';

import RunningIndicator from '../running-indicator';
import { AudioGroup } from './audio-group';
import { MainGroup } from './main-group';
import { ProfileGroup } from './profile-group';
import { ToolsGroup } from './tools-group';
import { VideoGroup } from './video-group';

interface ControlPanelProps {
  assistantState: RunningState;
  onProfileClick: () => void;
  onSignOut: () => void;
}

type StateConfig = {
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
  label: string;
};

export default function ControlPanel({ onProfileClick, onSignOut }: ControlPanelProps) {
  const isStealth = useIsStealthMode();
  const { runningState: assistantState, startAssistant, stopAssistant } = useAssistantState();
  const { config } = useConfigStore();

  const videoDevices = useVideoDevices();
  const audioInputDevices = useAudioInputDevices();
  const audioOutputDevices = useAudioOutputDevices();

  if (isStealth) return null;

  const stateConfig: Record<RunningState, StateConfig> = {
    [RunningState.IDLE]: {
      onClick: () => {
        if (!checkCanStart()) return;
        startAssistant();
      },
      className: 'bg-primary hover:bg-primary/90',
      icon: <Play className="h-3.5 w-3.5" />,
      label: 'Start',
    },
    [RunningState.STARTING]: {
      onClick: () => {},
      className: 'bg-primary hover:bg-primary/90',
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Starting...',
    },
    [RunningState.RUNNING]: {
      onClick: () => {
        stopAssistant();
      },
      className: 'bg-destructive hover:bg-destructive/90',
      icon: <Square className="h-3.5 w-3.5" />,
      label: 'Stop',
    },
    [RunningState.STOPPING]: {
      onClick: () => {},
      className: 'bg-destructive hover:bg-destructive/90',
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Stopping...',
    },
  };
  const { onClick, className, icon, label } = stateConfig[assistantState];

  const audioInputDeviceNotFound =
    audioInputDevices?.find((d) => d.name === config?.audio_input_device_name) === undefined;
  const videoDeviceNotFound =
    videoDevices.find((d) => d.label === config?.camera_device_name) === undefined;

  const checkCanStart = () => {
    const checks: { ok: boolean; message: string }[] = [
      { ok: !!config?.interview_conf, message: 'Profile is not set' },
      { ok: !!config?.interview_conf?.username, message: 'Username is not set' },
      { ok: !!config?.interview_conf?.photo, message: 'Photo is not set' },
      { ok: !!config?.interview_conf?.profile_data, message: 'Profile data is not set' },

      {
        ok: !audioInputDeviceNotFound,
        message: `Audio input device "${config?.audio_input_device_name}" is not found`,
      },
      // Validate video device only if face swap is enabled
      {
        ok: !config?.face_swap || !videoDeviceNotFound,
        message: `Video device "${config?.camera_device_name}" is not found`,
      },
    ];

    for (const { ok, message } of checks) {
      if (!ok) {
        alert(message);
        return false;
      }
    }

    return true;
  };

  const getDisabled = (state: RunningState, disableOnRunning: boolean = true): boolean => {
    if (disableOnRunning && state === RunningState.RUNNING) return true;
    return state === RunningState.STARTING || state === RunningState.STOPPING;
  };

  return (
    <div
      id="control-panel"
      className="flex items-center justify-between gap-2 p-1 border border-border rounded-lg bg-card"
    >
      <ProfileGroup
        config={config}
        onProfileClick={onProfileClick}
        onSignOut={onSignOut}
        getDisabled={getDisabled}
      />

      <div className="flex flex-1 justify-center gap-2 items-center">
        <AudioGroup
          audioInputDevices={audioInputDevices ?? []}
          audioInputDeviceNotFound={audioInputDeviceNotFound}
          getDisabled={getDisabled}
        />
        <VideoGroup
          videoDeviceNotFound={videoDeviceNotFound}
          audioOutputDevices={audioOutputDevices ?? []}
          getDisabled={getDisabled}
        />
        <MainGroup stateConfig={{ onClick, className, icon, label }} getDisabled={getDisabled} />
        <hr className="h-6 border border-border" />
        <ToolsGroup getDisabled={getDisabled} />
      </div>

      <RunningIndicator runningState={assistantState} />
    </div>
  );
}
