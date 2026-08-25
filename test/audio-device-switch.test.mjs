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
import { readFileSync } from 'node:fs';

import { createChecker } from './helpers.mjs';

function methodBody(source, signature) {
  const start = source.indexOf(signature);
  if (start === -1) return '';

  // Walk braces from the signature's opening brace to its match.
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return '';
}

export async function run() {
  const { check, failures } = createChecker('audio-device-switch');

  const source = readFileSync(
    new URL('../src/renderer/services/live-transcription.service.ts', import.meta.url),
    'utf8'
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

  const setStream = methodBody(source, 'async setStream(');
  check('setStream exists', setStream.length > 0);

  // `convertTo16kPcm` reads ctx.sampleRate, which is fixed when the context is constructed, so a
  // fresh context here would resample every frame against the wrong rate - quietly, and only for
  // users whose second device runs at a different rate than their first.
  check(
    'the existing AudioContext is reused rather than rebuilt',
    !setStream.includes('new AudioContext')
  );
  check(
    'the new source is wired back into the existing worklet',
    setStream.includes('this.source.connect(this.workletNode)')
  );

  return failures;
}
