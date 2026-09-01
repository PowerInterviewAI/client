/**
 * The mock interviewer's playback path, where every failure is one the candidate hears rather
 * than one anything reports.
 *
 * Source-level, like `audio-device-switch.test.mjs` and `rtl-rendering.test.mjs`: this is
 * renderer code and the renderer has no runtime harness in this directory. Each of these is an
 * ordering or a condition that compiles and reads perfectly well when it is wrong.
 */
import { codeOnly, createChecker, readSource } from './helpers.mjs';

const read = (path) => codeOnly(readSource(new URL(path, import.meta.url)));

/** The body of a method, from its signature to the start of the next one at the same indent. */
function methodBody(source, signature) {
  const start = source.indexOf(signature);
  if (start === -1) return '';
  const rest = source.slice(start + signature.length);
  const end = rest.search(/\n {2}(?:private |async |\/\*\*|[a-zA-Z])/);
  return end === -1 ? rest : rest.slice(0, end);
}

export async function run() {
  const { check, failures } = createChecker('mock-tts-playback');

  const tts = read('../src/renderer/services/mock-tts.service.ts');
  const hook = read('../src/renderer/hooks/use-mock-interview.ts');

  const playQuestion = methodBody(tts, 'async playQuestion(');
  check('there is a playQuestion body to read', playQuestion.length > 0);

  // `Repeat question` is offered while the question is still being read (`canControl` covers
  // `Speaking`), and a second `playQuestion` only bumps `playSeq` - which stops the older *loop*
  // at its next check, after the chunk it is already playing has finished. Without an explicit
  // teardown two voices read the question at once, and the first element, no longer `this.audio`,
  // is unreachable by any later `stop()`.
  check('playQuestion supersedes the element already playing', playQuestion.includes('this.abortPlayback()'));

  const abortAt = playQuestion.indexOf('this.abortPlayback()');
  const acquireAt = playQuestion.indexOf('this.gate.acquire()');
  check('and does so before it takes the gate for the new question', abortAt !== -1 && acquireAt !== -1 && abortAt < acquireAt);

  // The gate must stay shut across the handover. `stop()` force-releases it, so reaching for it
  // here would open the microphone between two questions of the interviewer's own speech.
  check('playQuestion never routes that through stop()', !playQuestion.includes('this.stop()'));

  const stop = methodBody(tts, '  stop(): void {');
  check('stop tears the element down', stop.includes('this.abortPlayback()'));
  check('and opens the microphone', stop.includes('this.gate.forceReleaseNow()'));

  // `pause()` fires neither `ended` nor `error`, so the promise `playBlob` handed back settles
  // nowhere else: the object URL leaks and `playQuestion` never reaches its own `finally`.
  const abortPlayback = methodBody(tts, 'private abortPlayback(): void {');
  check('an interrupted playback is settled rather than left pending', abortPlayback.includes('this.settleStoppedPlayback?.()'));
  check('and its element is dropped', abortPlayback.includes('this.audio = null'));

  // The cache is keyed by chunk index, so a fetch that outlives its question writes the previous
  // question's audio into the new one's slot. Both writes carry the generation.
  const getChunkBlob = methodBody(tts, 'private async getChunkBlob(');
  check(
    'the chunk cache is only written for the generation that asked for it',
    (getChunkBlob.match(/seq === this\.playSeq/g) ?? []).length >= 2
  );

  // A follow-up replaces `currentQuestion` with different text under the same chunk indices, so
  // keeping the cache across one made the interviewer read the *previous* question aloud while
  // the screen showed the follow-up. Skipping the reset for follow-ups reads like an
  // optimisation, which is what makes it worth pinning.
  const resetGuard = hook.slice(hook.indexOf('resetCache') - 200, hook.indexOf('resetCache'));
  check('the chunk cache is reset for follow-ups too', !resetGuard.includes('isFollowUp'));

  // `Listening` is exempt from the state-driven belt: `playQuestion`'s own release schedules the
  // reverb tail, and `stop()` force-releasing would clear it - on the normal path, every question.
  check(
    'the belt leaves the reverb tail alone on the normal path',
    /state !== MockInterviewState\.Speaking && state !== MockInterviewState\.Listening/.test(hook)
  );

  return failures;
}
