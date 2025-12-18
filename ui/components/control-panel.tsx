'use client';

import { useVideoDevices } from '@/hooks/video-devices';
import { RunningState } from '@/types/appState';
import { PyAudioDevice } from '@/types/audioDevice';
import { Config } from '@/types/config';
import { APIError } from '@/types/error';
import { UseMutationResult } from '@tanstack/react-query';
import { Ellipsis, Play, Square } from 'lucide-react';
import {
  AudioControlSection,
  MainControls,
  ProfileSection,
  StatusIndicator,
  TranscriptionOptions,
  VideoControlSection,
} from './control-panel/';

interface ControlPanelProps {
  runningState: RunningState;
  audioInputDevices: PyAudioDevice[];
  audioOutputDevices: PyAudioDevice[];
  startMutation: UseMutationResult<void, APIError, void, unknown>;
  stopMutation: UseMutationResult<void, APIError, void, unknown>;

  onProfileClick: () => void;
  onSignOut: () => void;
  onThemeToggle: () => void;
  isDark: boolean;

  config?: Config;
  updateConfig: (config: Partial<Config>) => void;
}

type StateConfig = {
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
  label: string;
};

type IndicatorConfig = {
  dotClass: string;
  label: string;
};

export default function ControlPanel({
  runningState,
  audioInputDevices,
  audioOutputDevices,
  startMutation,
  stopMutation,

  onProfileClick,
  onSignOut,
  onThemeToggle,
  isDark,

  config,
  updateConfig,
}: ControlPanelProps) {
  const stateConfig: Record<RunningState, StateConfig> = {
    [RunningState.IDLE]: {
      onClick: () => {
        if (!checkCanStart()) return;
        startMutation.mutate();
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
      onClick: () => stopMutation.mutate(),
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
    [RunningState.STOPPED]: {
      onClick: () => {
        if (!checkCanStart()) return;
        startMutation.mutate();
      },
      className: 'bg-primary hover:bg-primary/90',
      icon: <Play className="h-3.5 w-3.5" />,
      label: 'Start',
    },
  };
  const { onClick, className, icon, label } = stateConfig[runningState];

  const indicatorConfig: Record<RunningState, IndicatorConfig> = {
    [RunningState.IDLE]: {
      dotClass: 'bg-muted-foreground',
      label: 'Idle',
    },
    [RunningState.STARTING]: {
      dotClass: 'bg-primary animate-pulse',
      label: 'Starting',
    },
    [RunningState.RUNNING]: {
      dotClass: 'bg-destructive animate-pulse',
      label: 'Running',
    },
    [RunningState.STOPPING]: {
      dotClass: 'bg-destructive animate-pulse',
      label: 'Stopping',
    },
    [RunningState.STOPPED]: {
      dotClass: 'bg-muted-foreground',
      label: 'Stopped',
    },
  };
  const { dotClass: indicatorDotClass, label: indicatorLabel } = indicatorConfig[runningState];

  const videoDevices = useVideoDevices();

  const audioInputDeviceNotFound =
    audioInputDevices.find((d) => d.name === config?.audio_input_device_name) === undefined;
  const audioControlDeviceNotFound =
    audioOutputDevices.find((d) => d.name === config?.audio_control_device_name) === undefined;
  const videoDeviceNotFound =
    videoDevices.find((d) => d.label === config?.camera_device_name) === undefined;

  const checkCanStart = () => {
    const checks: { ok: boolean; message: string }[] = [
      { ok: !!config?.profile, message: 'Profile is not set' },
      { ok: !!config?.profile?.username, message: 'Username is not set' },
      { ok: !!config?.profile?.photo, message: 'Photo is not set' },
      { ok: !!config?.profile?.profile_data, message: 'Profile data is not set' },

      {
        ok: !audioInputDeviceNotFound,
        message: `Audio input device "${config?.audio_input_device_name}" is not found`,
      },
      {
        ok: !config?.enable_audio_control || !audioControlDeviceNotFound,
        message: `Audio control device "${config?.audio_control_device_name}" is not found`,
      },
      {
        ok: !config?.enable_video_control || !videoDeviceNotFound,
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
    <div className="flex items-center justify-between gap-2 p-1">
      <ProfileSection
        config={config}
        onProfileClick={onProfileClick}
        onSignOut={onSignOut}
        onThemeToggle={onThemeToggle}
        isDark={isDark}
      />

      <div className="flex flex-1 justify-center gap-2 items-center">
        <TranscriptionOptions
          runningState={runningState}
          audioInputDevices={audioInputDevices}
          config={config}
          updateConfig={updateConfig}
          audioInputDeviceNotFound={audioInputDeviceNotFound}
          getDisabled={getDisabled}
        />

        <AudioControlSection
          runningState={runningState}
          audioOutputDevices={audioOutputDevices}
          config={config}
          updateConfig={updateConfig}
          audioControlDeviceNotFound={audioControlDeviceNotFound}
          getDisabled={getDisabled}
        />

        <VideoControlSection
          runningState={runningState}
          config={config}
          updateConfig={updateConfig}
          videoDeviceNotFound={videoDeviceNotFound}
          getDisabled={getDisabled}
        />

        <MainControls
          runningState={runningState}
          stateConfig={{ onClick, className, icon, label }}
          getDisabled={getDisabled}
        />
      </div>

      <StatusIndicator indicatorConfig={{ dotClass: indicatorDotClass, label: indicatorLabel }} />
    </div>
  );
}
