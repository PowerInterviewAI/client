/**
 * The whole app state is broadcast to the renderer on every change, and the health-check loops
 * fire every 1-5s. The interview config holds a CV and job description (up to 128k chars each),
 * so main must send a summary rather than the real thing, and must not broadcast at all when
 * nothing actually changed.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('app-state.service');

  const { appStateService } = await loadMain('services/app-state.service.js');
  const windowControl = await loadMain('services/window-control.service.js');

  const sent = [];
  windowControl.setWindowReference({
    isDestroyed: () => false,
    webContents: { send: (channel, payload) => sent.push({ channel, payload }) },
  });

  const cv = 'x'.repeat(200_000);
  const context = 'y'.repeat(150_000);
  appStateService.updateState({
    interviewConfig: { fullName: 'Jane', profileData: cv, context },
    interviewConfigLoaded: true,
  });

  // Main keeps the real values - the suggestion services read them from here.
  const state = appStateService.getState();
  check('main keeps the full CV', state.interviewConfig.profileData.length === cv.length);
  check('main keeps the full context', state.interviewConfig.context.length === context.length);

  const view = appStateService.getRendererState();
  check('renderer view exposes fullName', view.interviewConfig.fullName === 'Jane');
  check('renderer view exposes hasProfileData', view.interviewConfig.hasProfileData === true);
  check('renderer view drops profileData', !('profileData' in view.interviewConfig));
  check('renderer view drops context', !('context' in view.interviewConfig));
  check('renderer view keeps the loaded flag', view.interviewConfigLoaded === true);

  const payload = JSON.stringify(sent.at(-1).payload);
  check(`broadcast stays small (${payload.length} bytes)`, payload.length < 5_000);
  check('broadcast carries no CV', !payload.includes('xxxxxxxxxx'));

  // The ping loops re-report identical values; those must not reach the renderer. Prime both
  // updates first so the loop below carries no new information at all.
  appStateService.updateState({ isBackendLive: true });
  appStateService.updateState({ credits: 42, userRole: 'user', providedLLMModel: 'm' });
  const baseline = sent.length;
  for (let i = 0; i < 10; i++) {
    appStateService.updateState({ isBackendLive: true });
    appStateService.updateState({ credits: 42, userRole: 'user', providedLLMModel: 'm' });
  }
  check('identical updates do not broadcast', sent.length === baseline);

  appStateService.updateState({ isBackendLive: false });
  check('a real change still broadcasts', sent.length === baseline + 1);
  check('the change is applied', appStateService.getState().isBackendLive === false);

  appStateService.updateState({ interviewConfig: { fullName: 'Jane', profileData: '   ', context: '' } });
  check(
    'whitespace-only profile is not reported as set',
    appStateService.getRendererState().interviewConfig.hasProfileData === false
  );

  return failures;
}
