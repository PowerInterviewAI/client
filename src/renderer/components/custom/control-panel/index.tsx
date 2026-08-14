import { Ellipsis, Play, Square } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAppState } from '@/hooks/use-app-state';
import { useAssistantService } from '@/hooks/use-assistant-service';
import { useAudioInputDevices } from '@/hooks/use-audio-devices';
import { useConfigStore } from '@/hooks/use-config-store';
import { useConfigurationDialog } from '@/hooks/use-configuration-dialog';
import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import { isMac } from '@/lib/consts';
import { getElectron } from '@/lib/utils';
import { RunningState } from '@/types/app-state';

import PermissionGateDialog from '../permission-gate-dialog';
import ZoomControl from '../zoom-control';
import { AudioGroup } from './audio-group';
import { LLMGroup } from './llm-group';
import { MainGroup } from './main-group';
import { ProfessionalModeGroup } from './professional-mode-group';
import { ToolsGroup } from './tools-group';

type StateConfig = {
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
  label: string;
};

export default function ControlPanel() {
  const isStealth = useIsStealthMode();
  const { startAssistant, stopAssistant } = useAssistantService();
  const { runningState, appState } = useAppState();
  const { config } = useConfigStore();
  const { openConfigurationDialog } = useConfigurationDialog();
  const [permGateOpen, setPermGateOpen] = useState(false);

  const audioInputDevices = useAudioInputDevices();

  if (isStealth) return null;

  const checkCanStart = () => {
    const checks: { ok: boolean; message: string; onFail?: () => void }[] = [
      // Checked first: an unsynced config reads as empty, and blaming the user for not
      // setting a name they did set sends them into a dialog that cannot save either.
      {
        ok: appState?.interviewConfigLoaded ?? false,
        message: 'Could not load your saved configuration. Reconnecting - try again in a moment.',
        // Nothing else re-pulls after a failed startup fetch, so "try again" has to actually
        // retry: without this the same toast repeats forever however often Start is pressed.
        onFail: () => void getElectron()?.account?.refresh(),
      },
      {
        ok: !!appState?.interviewConfig?.fullName,
        message: 'Full name is not set',
        onFail: openConfigurationDialog,
      },
      {
        ok: appState?.interviewConfig?.hasProfileData ?? false,
        message: 'Profile data is not set',
        onFail: openConfigurationDialog,
      },
      {
        ok: !audioInputDeviceNotFound,
        message: `Audio input device "${config?.audioInputDeviceName}" is not found`,
      },
    ];

    for (const { ok, message, onFail } of checks) {
      if (!ok) {
        toast.error(message);
        onFail?.();
        return false;
      }
    }
    return true;
  };

  const doStart = async () => {
    try {
      await startAssistant();
    } catch (error) {
      console.error('Failed to start assistant:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start assistant');
      await stopAssistant();
    }
  };

  const handleStartClick = async () => {
    if (!checkCanStart()) return;

    if (isMac) {
      const electron = getElectron();
      if (electron) {
        const perms = await electron.permissions.checkAll();
        const micOk = perms.mic === 'granted';
        const screenOk =
          (perms.screen === 'granted' || perms.screen === 'not-determined') &&
          !perms.screenNeedsRelaunch;
        if (!micOk || !screenOk) {
          setPermGateOpen(true);
          return;
        }
      }
    }

    await doStart();
  };

  const stateConfig: Record<RunningState, StateConfig> = {
    [RunningState.Idle]: {
      onClick: handleStartClick,
      className: 'bg-blue-600 hover:bg-blue-600/90',
      icon: <Play className="h-3.5 w-3.5" />,
      label: 'Start',
    },
    [RunningState.Starting]: {
      onClick: () => {},
      className: 'bg-blue-600 hover:bg-blue-600/90',
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Starting...',
    },
    [RunningState.Running]: {
      onClick: async () => {
        await stopAssistant();
      },
      className: 'bg-destructive hover:bg-destructive/90 animate-pulse',
      icon: <Square className="h-3.5 w-3.5" />,
      label: 'Stop',
    },
    [RunningState.Stopping]: {
      onClick: () => {},
      className: 'bg-destructive hover:bg-destructive/90',
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Stopping...',
    },
  };
  const { onClick, className, icon, label } = stateConfig[runningState];

  const audioInputDeviceNotFound =
    audioInputDevices?.find((d) => d.name === config?.audioInputDeviceName) === undefined;

  const getDisabled = (state: RunningState, disableOnRunning: boolean = true): boolean => {
    if (disableOnRunning && state === RunningState.Running) return true;
    return state === RunningState.Starting || state === RunningState.Stopping;
  };

  return (
    <>
      {/* Equal-basis side columns keep Start/Stop on the panel's centre line whatever they hold. */}
      <div id="control-panel" className="flex items-center gap-2 pr-1 pb-0.5">
        <div className="flex flex-1 basis-0 min-w-0 items-center justify-end gap-2">
          <AudioGroup
            audioInputDevices={audioInputDevices ?? []}
            audioInputDeviceNotFound={audioInputDeviceNotFound}
            getDisabled={getDisabled}
          />
          <LLMGroup getDisabled={getDisabled} />
        </div>

        <MainGroup stateConfig={{ onClick, className, icon, label }} getDisabled={getDisabled} />

        <div className="flex flex-1 basis-0 min-w-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ProfessionalModeGroup />
            <ToolsGroup getDisabled={getDisabled} />
          </div>
          <ZoomControl />
        </div>
      </div>

      {isMac && (
        <PermissionGateDialog
          open={permGateOpen}
          onOpenChange={setPermGateOpen}
          onProceed={doStart}
        />
      )}
    </>
  );
}
