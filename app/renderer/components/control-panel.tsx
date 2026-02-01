import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import { useVideoDevices } from '@/hooks/video-devices';
import { RunningState } from '@/types/appState';
import { type Config } from '@/types/config';
import { Ellipsis, Play, Square } from 'lucide-react';
import { AudioOptions } from './control-panel/audio-options';
import { MainControls } from './control-panel/main-controls';
import { ProfileSection } from './control-panel/profile-section';
import { VideoOptions } from './control-panel/video-options';
import RunningIndicator from './running-indicator';
import { useAudioInputDevices, useAudioOutputDevices } from '@/hooks/audio-devices';
import { useAssistantState } from '@/hooks/use-assistant-state';

interface ControlPanelProps {
  runningState: RunningState;
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

export default function ControlPanel({
  onProfileClick,
  onSignOut,
  onThemeToggle,
  isDark,

  config,
  updateConfig,
}: ControlPanelProps) {
  const isStealth = useIsStealthMode();
  const { runningState, startAssistant, stopAssistant } = useAssistantState();

  const videoDevices = useVideoDevices();
  const { data: audioInputDevices } = useAudioInputDevices(1000);
  const { data: audioOutputDevices } = useAudioOutputDevices(1000);

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
    [RunningState.STOPPED]: {
      onClick: () => {
        if (!checkCanStart()) return;
        startAssistant();
      },
      className: 'bg-primary hover:bg-primary/90',
      icon: <Play className="h-3.5 w-3.5" />,
      label: 'Start',
    },
  };
  const { onClick, className, icon, label } = stateConfig[runningState];

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
      <ProfileSection
        config={config}
        onProfileClick={onProfileClick}
        onSignOut={onSignOut}
        onThemeToggle={onThemeToggle}
        isDark={isDark}
        runningState={runningState}
        getDisabled={getDisabled}
      />

      <div className="flex flex-1 justify-center gap-2 items-center">
        <AudioOptions
          runningState={runningState}
          audioInputDevices={audioInputDevices ?? []}
          config={config}
          updateConfig={updateConfig}
          audioInputDeviceNotFound={audioInputDeviceNotFound}
          getDisabled={getDisabled}
        />
        <VideoOptions
          runningState={runningState}
          config={config}
          updateConfig={updateConfig}
          videoDeviceNotFound={videoDeviceNotFound}
          audioOutputDevices={audioOutputDevices ?? []}
          getDisabled={getDisabled}
        />

        <MainControls
          runningState={runningState}
          stateConfig={{ onClick, className, icon, label }}
          getDisabled={getDisabled}
        />
      </div>

      <RunningIndicator runningState={runningState} />
    </div>
  );
}
