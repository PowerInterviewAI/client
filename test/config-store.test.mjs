/**
 * Interview config was moved off local disk to the backend account. Two invariants matter and
 * both fail silently: a leftover pre-sync config must survive ordinary config writes until it
 * has been migrated (otherwise upgrading users lose their CV), and it must never ride along to
 * the renderer in `config:get`.
 */
import fs from 'node:fs';
import path from 'node:path';

import { createChecker, loadMain } from './helpers.mjs';

export async function run(userDataDir) {
  const { check, failures } = createChecker('config.store');
  const configFile = path.join(userDataDir, 'config.json');

  // Seed the file exactly as a pre-sync install would have left it.
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      runtime: {
        language: 'en',
        email: 'a@b.c',
        autoScrollTranscript: false,
        interviewConf: { username: 'Jane', profileData: 'MY CV', jobDescription: 'MY JD' },
        // Leftover from the removed bring-your-own-API-key feature. Seeded here, never written
        // by anything in this test, to pin that the scrub IIFE at import time actually removes
        // it rather than merely that RuntimeConfig no longer declares the field.
        llmConf: { provider: 'openai', apikey: 'sk-leftover-secret', model: 'gpt-4o' },
        // Leftover from the retired "don't show again" headphone notice preference - same scrub
        // mechanism (scrubRetiredKey), a different retired key.
        headphoneNoticeAcknowledged: true,
      },
    })
  );

  const store = await loadMain('store/config.store.js');

  check(
    'legacy conf is readable for migration',
    store.getLegacyInterviewConf()?.profileData === 'MY CV'
  );

  const cfg = store.configStore.getConfig();
  check('getConfig omits interviewConf', !('interviewConf' in cfg));
  check(
    'getConfig keeps real settings',
    cfg.email === 'a@b.c' && cfg.autoScrollTranscript === false
  );

  // The data-loss trap: an unrelated write must not drop the not-yet-migrated copy.
  store.configStore.updateConfig({ sessionToken: 'tok' });
  const afterWrite = store.configStore.getStoredRuntime();
  check('interviewConf survives updateConfig', afterWrite?.interviewConf?.profileData === 'MY CV');
  check('updateConfig applied the change', afterWrite?.sessionToken === 'tok');
  check('updateConfig preserved untouched keys', afterWrite?.autoScrollTranscript === false);

  // The claim must outlive a restart, or a second user signing in first inherits the CV.
  check('no owner before claim', store.getLegacyInterviewConfOwner() === null);
  store.claimLegacyInterviewConf('account-A');
  check('owner claim readable', store.getLegacyInterviewConfOwner() === 'account-A');
  check(
    'owner claim persisted to disk',
    JSON.parse(fs.readFileSync(configFile, 'utf8')).legacyInterviewConfOwner === 'account-A'
  );

  store.clearLegacyInterviewConf();
  check('clear drops the in-memory copy', store.getLegacyInterviewConf() === null);
  check(
    'clear drops the disk copy',
    !('interviewConf' in (store.configStore.getStoredRuntime() ?? {}))
  );
  check('clear drops the owner claim', store.getLegacyInterviewConfOwner() === null);
  check('clear leaves other settings intact', store.configStore.getConfig().email === 'a@b.c');

  // Professional mode is opt-in: the seeded runtime above predates the key, and an upgrading
  // install must not silently start emitting hints instead of prose.
  //
  // Two independent mechanisms deliver this - the DEFAULT_RUNTIME_CONFIG spread in getConfig,
  // and the migration IIFE, which pins false rather than the default. That redundancy is the
  // point: should professional mode ever become the default for new installs, the migration is
  // what keeps existing users on prose. No single assertion can isolate one mechanism while
  // both hold, so this asserts the invariant itself.
  check('professionalMode reads off on upgrade', cfg.professionalMode === false);

  store.configStore.updateConfig({ professionalMode: true });
  check(
    'professionalMode is persisted',
    store.configStore.getStoredRuntime()?.professionalMode === true
  );

  store.configStore.updateConfig({ sessionToken: 'tok2' });
  check(
    'professionalMode survives an unrelated write',
    store.configStore.getConfig().professionalMode === true
  );

  // Which session the control bar's primary Start button launches without going through its
  // dropdown. A product decision rather than a convenience default - a first-time user is far
  // likelier to be trying the app out than walking into a real call - and one that a later edit
  // could flip with no symptom other than Start quietly doing the other thing.
  check('lastSessionMode defaults to mock', store.configStore.getConfig().lastSessionMode === 'mock');

  store.configStore.updateConfig({ lastSessionMode: 'live' });
  check(
    'the last session mode is remembered across reads',
    store.configStore.getConfig().lastSessionMode === 'live'
  );

  store.configStore.updateConfig({ sessionToken: 'tok3' });
  check(
    'and survives an unrelated write',
    store.configStore.getConfig().lastSessionMode === 'live'
  );

  store.configStore.updateConfig({ lastSessionMode: 'mock' });

  // Security cleanup: llmConf could hold a real provider API key in plaintext. Removing the
  // field from RuntimeConfig does not erase it from an existing install's disk - the scrub IIFE
  // at the bottom of the store has to actually delete it, and the write has to reach the file,
  // not just the in-memory store, or the key survives the next getConfig/updateConfig spread.
  check(
    'a pre-upgrade install with a stored llmConf has it scrubbed on load',
    !('llmConf' in (store.configStore.getStoredRuntime() ?? {}))
  );
  check(
    'the scrub is written back to disk, not just held in memory',
    !('llmConf' in (JSON.parse(fs.readFileSync(configFile, 'utf8')).runtime ?? {}))
  );

  // Same scrub, a second retired key - not sensitive like llmConf, but nothing else will ever
  // remove it either, so it would otherwise sit on disk forever on an upgraded install.
  check(
    'a pre-upgrade install with a stored headphoneNoticeAcknowledged has it scrubbed on load',
    !('headphoneNoticeAcknowledged' in (store.configStore.getStoredRuntime() ?? {}))
  );

  return failures;
}
