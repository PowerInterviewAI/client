/**
 * Two silent data-loss paths in the account sync.
 *
 * Both only bite when a pull fails or a second account signs in, so nothing surfaces in normal
 * use: the dialog would enable Save over a copy it failed to refresh (overwriting a newer config
 * saved on another device), and a pull for one account would delete another account's
 * not-yet-migrated CV off a shared machine.
 */
import { createChecker, loadMain } from './helpers.mjs';

const account = (id, config) => ({
  data: {
    _id: id,
    username: 'jane',
    email: 'jane@example.com',
    role: 'user',
    status: 'active',
    credits: 0,
    interview_config: config,
    created_at: 0,
    updated_at: null,
  },
});

const CONFIG = { full_name: 'Jane', profile_data: 'SERVER CV', context: 'SERVER JD' };

export async function run() {
  const { check, failures } = createChecker('account.service');

  const store = await loadMain('store/config.store.js');
  const { accountService } = await loadMain('services/account.service.js');
  const { appStateService } = await loadMain('services/app-state.service.js');
  const windowControl = await loadMain('services/window-control.service.js');

  windowControl.setWindowReference({ isDestroyed: () => true, webContents: { send: () => {} } });

  // Stand in for UsersApi. `private` is erased at runtime, so the singleton's client is swappable.
  let getMe = async () => account('account-A', CONFIG);
  accountService.client = {
    getMe: () => getMe(),
    updateInterviewConfig: async () => ({ error: { code: 'NETWORK_ERROR', message: 'offline' } }),
  };

  // A good pull first, so the session has a loaded config to go stale.
  const pulled = await accountService.pullFromBackend();
  check('pull succeeds', pulled.success === true);
  check(
    'pull loads the config',
    appStateService.getState().interviewConfig.profileData === 'SERVER CV'
  );
  check('pull sets the loaded flag', appStateService.getState().interviewConfigLoaded === true);

  // The dialog refresh now fails. The loaded flag deliberately survives (it gates Start), so
  // reporting success off it alone is what would enable Save over a stale copy.
  getMe = async () => ({ error: { code: 'NETWORK_ERROR', message: 'offline' } });
  const editable = await accountService.getEditableConfig();
  check('stale refresh is not reported as loaded', editable.success === false);
  check(
    'stale refresh reports an error',
    typeof editable.error === 'string' && editable.error !== ''
  );
  check('stale refresh still returns values to display', editable.data.profileData === 'SERVER CV');
  check(
    'Start is not blocked by a failed dialog refresh',
    appStateService.getState().interviewConfigLoaded === true
  );

  // A fresh refresh is safe to save over again.
  getMe = async () => account('account-A', CONFIG);
  check(
    'fresh refresh is reported as loaded',
    (await accountService.getEditableConfig()).success === true
  );

  // Ownership: a copy claimed by another account is mid-migration and must outlive this pull.
  store.claimLegacyInterviewConf('account-A');
  getMe = async () => account('account-B', CONFIG);
  await accountService.pullFromBackend();
  check(
    "another account's claim survives the pull",
    store.getLegacyInterviewConfOwner() === 'account-A'
  );

  // The owning account may discard it: its account now carries the config.
  getMe = async () => account('account-A', CONFIG);
  await accountService.pullFromBackend();
  check('the owning account drops the claim', store.getLegacyInterviewConfOwner() === null);

  return failures;
}
