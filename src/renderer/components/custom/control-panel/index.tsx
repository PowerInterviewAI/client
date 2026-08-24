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
import { LanguageGroup } from './language-group';
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

  const { devices: audioInputDevices, ready: audioDevicesReady } = useAudioInputDevices();

  if (isStealth) return null;

  const selectedAudioInputDeviceName = config?.audioInputDeviceName ?? '';

  // Three states, not two. Until enumerateDevices() has settled the list is empty because
  // nothing has been asked yet, and a bare `find(...) === undefined` reports the configured
  // microphone as missing for the first frames after mount - a red badge on a working device,
  // and a start that is refused if the user is quick. An unset name is not "missing" either:
  // AudioGroup is picking the default at that moment.
  const noAudioInputDevices = audioDevicesReady && audioInputDevices.length === 0;
  const audioInputDeviceNotFound =
    audioDevicesReady &&
    audioInputDevices.length > 0 &&
    selectedAudioInputDeviceName !== '' &&
    !audioInputDevices.some((d) => d.name === selectedAudioInputDeviceName);

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
        ok: !noAudioInputDevices,
        message: 'No microphone was detected. Connect one and try again.',
      },
      {
        ok: !audioInputDeviceNotFound,
        message: `Audio input device "${selectedAudioInputDeviceName}" is not found`,
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
      // No stopAssistant() here. startAssistant's own catch has already torn both services down
      // and put runningState back to Idle; calling it again only walks the button through a
      // three-second "Stopping" for a session that never started, and its own failure would
      // land here as an unhandled rejection.
      console.error('Failed to start assistant:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start assistant');
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
      // The label is on screen now, so the trailing dots the icon already animates are dropped
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Starting',
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
      label: 'Stopping',
    },
  };
  const { onClick, className, icon, label } = stateConfig[runningState];

  const getDisabled = (state: RunningState, disableOnRunning: boolean = true): boolean => {
    if (disableOnRunning && state === RunningState.Running) return true;
    return state === RunningState.Starting || state === RunningState.Stopping;
  };

  return (
    <>
      {/* Reading order is the order of use: start the session, then the things that shape it.
          Grouping is carried by spacing - gap-1 inside a group, gap-4 between - rather than by a
          rule between every cluster, so the row stays quiet at 32px tall. The one hairline earns
          its place by marking the only boundary that matters, between the action and the settings.

          Zoom is held at the right edge by ml-auto: it changes how the app is viewed rather than
          what it does, and mixing it into the run would make it read as another interview control. */}
      <div id="control-panel" className="flex items-center gap-4 px-1 pb-1 pt-0.5">
        <MainGroup stateConfig={{ onClick, className, icon, label }} getDisabled={getDisabled} />

        <div className="h-5 w-px bg-border" aria-hidden="true" />

        {/* What the session runs on - all three lock while the assistant runs. Language sits
            here rather than with the presentation toggles because it is an input as much as an
            output: it picks the speech model before it picks the answer's language. */}
        <div className="flex items-center gap-1">
          <AudioGroup
            audioInputDevices={audioInputDevices}
            audioInputDeviceNotFound={audioInputDeviceNotFound}
            getDisabled={getDisabled}
          />
          <LanguageGroup getDisabled={getDisabled} />
          <LLMGroup getDisabled={getDisabled} />
        </div>

        {/* What the interview produces: how suggestions read, and what to do with the session */}
        <div className="flex items-center gap-1">
          <ProfessionalModeGroup />
          <ToolsGroup getDisabled={getDisabled} />
        </div>

        <div className="ml-auto">
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
