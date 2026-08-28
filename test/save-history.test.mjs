/**
 * Everything that destroys the interview asks to save it first, and the question is only worth
 * asking about a real one. The panels are seeded with placeholder copy on launch and again
 * after every Clear, so `transcripts.length` is never zero and cannot be the test.
 *
 * `hasHistory` is what the prompt and the export guard both read. These pin that it follows the
 * writes rather than the array lengths, and that an export refuses the placeholder - which the
 * length check let through, producing a billed summary of "Transcripts will be here".
 */
import { createChecker, loadMain, readSource } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('save-history');

  const { appStateService } = await loadMain('services/app-state.service.js');
  const { toolsService } = await loadMain('services/tools.service.js');

  appStateService.setPlaceholderState();
  const placeholder = appStateService.getState();
  check(
    'the placeholder fills the panels',
    placeholder.transcripts.length > 0 && placeholder.liveSuggestions.length > 0
  );
  check('the placeholder is not history', placeholder.hasHistory === false);
  check(
    'the renderer is told the same',
    appStateService.getRendererState().hasHistory === false
  );

  let exportError = null;
  try {
    await toolsService.exportTranscript('md');
  } catch (e) {
    exportError = e;
  }
  check('exporting the placeholder is refused', exportError !== null);
  check(
    'and says why rather than failing on the request',
    /nothing to export/i.test(exportError?.message ?? '')
  );

  // A real ingest writes one array. The other two still hold the placeholder at that moment, and
  // an interview carrying two lines of sample suggestion copy into an exported report is the
  // failure that shape produces.
  appStateService.updateState({
    transcripts: [
      { timestamp: 1, text: 'Tell me about a hard bug.', speaker: 'other', isFinal: true },
    ],
  });
  const real = appStateService.getState();
  check('a real transcript is history', real.hasHistory === true);
  check('the placeholder suggestions go with it', real.liveSuggestions.length === 0);
  check('so do the placeholder action suggestions', real.actionSuggestions.length === 0);

  // Clear empties all three; the flag has to come back down or the next Clear asks about
  // nothing, which is exactly the prompt fatigue that makes people stop reading it.
  appStateService.updateState({ transcripts: [] });
  appStateService.updateState({ liveSuggestions: [] });
  appStateService.updateState({ actionSuggestions: [] });
  check('clearing drops the flag', appStateService.getState().hasHistory === false);

  appStateService.updateState({
    liveSuggestions: [{ timestamp: 2, last_question: 'q', answer: 'a' }],
  });
  check('a suggestion alone is history too', appStateService.getState().hasHistory === true);

  appStateService.setPlaceholderState();
  check(
    're-seeding the placeholder is not history again',
    appStateService.getState().hasHistory === false
  );

  // Source-level, like the renderer checks in this directory: the close is vetoed in main and
  // the window is only closed by the renderer's answer, so dropping either reply leaves an app
  // that cannot be closed at all. There is no runtime harness that would catch that.
  const guard = readSource(new URL('../src/main/window-close-guard.ts', import.meta.url));
  check('the close is vetoed', guard.includes('event.preventDefault()'));
  check('the renderer is asked', guard.includes("wc.send('app:save-history-prompt')"));
  check(
    'a confirmed close is not vetoed twice',
    guard.includes('if (closeConfirmed ||') && guard.includes('closeConfirmed = true')
  );
  check(
    'a quit that was vetoed is restarted rather than left half-done',
    guard.includes('if (quitting) {') && guard.includes('app.quit()')
  );
  check(
    'a crashed renderer cannot hold the window open',
    guard.includes('wc.isDestroyed() || wc.isCrashed()')
  );

  return failures;
}
