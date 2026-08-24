/**
 * The interview language decides which speech model transcribes the audio, and that failure is
 * silent: universal-streaming-english does not report a language it cannot handle, it returns
 * confident English words for speech that was never English. So the two things worth pinning are
 * that a stored language actually reaches the request bodies, and that an unknown one resolves to
 * English here rather than travelling to the backend and the ASR URL.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('language');

  const { Language, DEFAULT_LANGUAGE, resolveLanguage } = await loadMain('types/language.js');
  const { configStore } = await loadMain('store/config.store.js');

  check('English is the default', DEFAULT_LANGUAGE === 'en');
  check(
    'the set is the six universal-streaming-multilingual covers',
    JSON.stringify(Object.values(Language).sort()) ===
      JSON.stringify(['de', 'en', 'es', 'fr', 'it', 'pt'])
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
