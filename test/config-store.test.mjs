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

  return failures;
}
