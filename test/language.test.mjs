/**
 * The interview language decides which speech model transcribes the audio, and that failure is
 * silent: a model does not report a language it cannot handle, it returns confident words in one
 * it can for speech that was never in that language. So the two things worth pinning are
 * that a stored language actually reaches the request bodies, and that an unknown one resolves to
 * English here rather than travelling to the backend and the ASR URL.
 */
import { readFileSync } from 'node:fs';

import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('language');

  const { Language, DEFAULT_LANGUAGE, resolveLanguage } = await loadMain('types/language.js');
  const { configStore } = await loadMain('store/config.store.js');

  check('English is the default', DEFAULT_LANGUAGE === 'en');

  // The set used to be pinned as a literal six, because that is all
  // universal-streaming-multilingual transcribes. The ceiling is now what the backend's Deepgram
  // provider streams, so the literal moved rather than the rule: the picker must never offer a
  // language the ASR cannot hear.
  check('English is in the set', Object.values(Language).includes('en'));
  check(
    'every code is a bare lowercase ISO 639-1 pair',
    Object.values(Language).every((code) => /^[a-z]{2}$/.test(code))
  );
  check(
    'no code is listed twice',
    new Set(Object.values(Language)).size === Object.values(Language).length
  );

  // The enum is mirrored into the renderer, which carries the display metadata the picker reads.
  // Drift is the failure this catches, and it is silent in both directions: an enum member with
  // no renderer entry renders a blank trigger, and a renderer entry with no enum member is an
  // option that resolves straight back to English when picked. The renderer source is read as
  // text because it is never built into electron-dist, which is all `loadMain` can reach.
  const rendererSource = readFileSync(
    new URL('../src/renderer/types/language.ts', import.meta.url),
    'utf8'
  );
  const rendererCodes = [...rendererSource.matchAll(/code: Language\.\w+, name: '/g)].length;
  const rendererEnum = [...rendererSource.matchAll(/^  \w+ = '([a-z]{2})',$/gm)].map((m) => m[1]);

  check(
    'the renderer mirrors every code in the main enum',
    JSON.stringify(rendererEnum.slice().sort()) ===
      JSON.stringify(Object.values(Language).slice().sort())
  );
  check('the picker lists every language in the enum', rendererCodes === rendererEnum.length);
  check(
    'every picker entry carries a two-character short label',
    [...rendererSource.matchAll(/short: '([^']*)'/g)].every((m) => m[1].length === 2)
  );

  // Absent, blank and unknown all resolve rather than throwing or passing through. A code this
  // build does not know reaching the ASR URL is the case that matters: the backend can only fall
  // back anyway, and in the meantime the picker renders a blank trigger.
  check('absent resolves to English', resolveLanguage(undefined) === 'en');
  check('null resolves to English', resolveLanguage(null) === 'en');
  check('empty resolves to English', resolveLanguage('') === 'en');
  check('an unknown code resolves to English', resolveLanguage('kl') === 'en');
  check('a regional variant resolves to English', resolveLanguage('en-GB') === 'en');
  check('a known code is kept', resolveLanguage('es') === 'es');
  check('case and whitespace are normalised', resolveLanguage(' ES ') === 'es');

  // The store is the single source for every consumer, so it is where an unknown code has to die.
  configStore.updateConfig({ language: 'de' });
  check('a chosen language round-trips', configStore.getConfig().language === 'de');

  // Written straight to the raw object: updateConfig is typed, and the case being covered is a
  // value some other build left on disk.
  const raw = configStore.getStoredRuntime() ?? {};
  configStore.setStoredRuntime({ ...raw, language: 'kl' });
  check(
    'getConfig resolves a stored language this build does not know',
    configStore.getConfig().language === 'en'
  );

  configStore.updateConfig({ language: 'en' });

  return failures;
}
