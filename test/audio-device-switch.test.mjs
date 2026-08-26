/**
 * Microphone switching is renderer code, and the renderer has no runtime harness here - every
 * other test in this directory loads a built main-process module. So these are source-level
 * checks on `live-transcription.service.ts`, and they are worth the awkwardness because the
 * invariant they cover is an ordering one that a later tidy-up would break without any symptom
 * a type checker or a linter can see.
 *
 * The failure being guarded against: stopping the old microphone before the replacement is
 * acquired. It reads as the obvious cleanup order, it works whenever the new device is present,
 * and on the one path that matters - a device that is unplugged, held by another app, or refused
 * by permissions - it leaves the interview with no microphone at all, mid-answer, having been
 * asked only to change one.
 */
import { codeOnly, createChecker, methodBody, readSource } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('audio-device-switch');

  const source = readSource(
    new URL('../src/renderer/services/live-transcription.service.ts', import.meta.url)
  );

  const body = methodBody(source, 'async setAudioInputDevice(');
  check('setAudioInputDevice exists', body.length > 0);

  const acquire = body.indexOf('getUserMedia');
  const swap = body.indexOf('channel.setStream');
  const stopPrevious = body.indexOf('previous?.getTracks()');

  check('the replacement stream is acquired', acquire !== -1);
  check('the channel is handed the new stream', swap !== -1);
  check('the previous stream is stopped', stopPrevious !== -1);

  // The whole point. Acquire, then swap, then release - never release first.
  check('the new device is acquired before the graph is touched', acquire < swap);
  check('the old device is released only after the swap', swap < stopPrevious);

  // Without this the session goes on holding a device nobody is reading from, indicator light
  // included, because nothing else keeps a reference to the stream that was being opened.
  check(
    'a stream acquired after teardown is released rather than leaked',
    body.includes('this.micChannel !== channel')
  );

  // A no-op while stopped, rather than an error: start() resolves the device from the config
  // store itself, so a change made while nothing runs is already applied when it next reads.
  check('a device change while stopped is a no-op', /if \(!channel\) return;/.test(body));

  // The socket carries the language, not the device, so a microphone change must not reconnect.
  // Reaching for setLanguage's machinery here would reintroduce the gap this avoids.
  check(
    'switching the microphone does not reconnect the socket',
    !body.includes('connectWithRetry') && !body.includes('reportDisconnected')
  );

  // Two changes in flight resolve in completion order, not request order. Without a generation
  // token the slower one lands last, and the session ends up on a device the user already moved
  // off - with the config naming the other one. The UI disables the picker while a swap is in
  // flight, but that is a guard in a different layer from the bug.
  const bodyCode = codeOnly(body);
  check(
    'a generation is taken before the awaits',
    /const seq = \+\+this\.micSwitchSeq;/.test(bodyCode)
  );
  check(
    'the generation is taken before getUserMedia',
    bodyCode.indexOf('this.micSwitchSeq') < bodyCode.indexOf('getUserMedia')
  );
  check(
    'a superseded swap is abandoned rather than applied',
    /seq !== this\.micSwitchSeq/.test(bodyCode)
  );
  check(
    'the superseded check guards the same release path as the teardown check',
    /this\.micChannel !== channel \|\| seq !== this\.micSwitchSeq/.test(bodyCode)
  );

  const setStream = methodBody(source, 'async setStream(');
  const setStreamCode = codeOnly(setStream);
  check('setStream exists', setStream.length > 0);

  // `convertTo16kPcm` reads ctx.sampleRate, which is fixed when the context is constructed, so a
  // fresh context here would resample every frame against the wrong rate - quietly, and only for
  // users whose second device runs at a different rate than their first.
  check(
    'the existing AudioContext is reused rather than rebuilt',
    !codeOnly(setStream).includes('new AudioContext')
  );
  check(
    'the new source is wired back into the existing worklet',
    setStreamCode.includes('this.source.connect(this.workletNode)')
  );

  // start() builds `source` from `this.stream`, then awaits addModule() before assigning
  // `workletNode`. An early return covering that window leaves `source` bound to the stream the
  // caller is about to stop, and start() then wires that dead source into the graph: the socket
  // stays up, the channel relays silence, and nothing reports it. So the bail-out may test the
  // context and must not also test the node.
  const bailout = setStreamCode.slice(0, setStreamCode.indexOf('this.source?.disconnect()'));
  check('setStream bails out on a missing context', bailout.includes('if (!this.ctx) return'));
  check('the bail-out is not also gated on the worklet node', !bailout.includes('workletNode'));

  // Assigned before that bail-out, or a swap made before start() reaches a context is dropped -
  // start() reads the field, so recording it is the whole job on that path.
  check(
    'the stream is recorded before any early return',
    setStreamCode.indexOf('this.stream = stream') < setStreamCode.indexOf('if (!this.ctx) return')
  );

  // The connect is conditional for the same window: start() has its own
  // `source.connect(workletNode)` and reads `this.source`, which is the replacement by then.
  check(
    'the worklet connect is guarded rather than assumed',
    /if \(this\.workletNode\) this\.source\.connect\(this\.workletNode\)/.test(setStreamCode)
  );

  return failures;
}
