/**
 * The remember-me write in `changePassword`, and the one way it can misreport.
 *
 * By the time that write runs the password has already changed on the server. If a disk
 * failure is allowed to decide the return value, the user is told the change failed while it
 * actually went through, and the dialog then asks them to retry with a "current password" that
 * is no longer current - so the retry fails too, and nothing on screen ever says the change
 * succeeded. `login.tsx` draws the same line for the same reason, and `resetPassword` was
 * fixed for it in #103.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('change-password');

  const { configStore } = await loadMain('store/config.store.js');
  const { authService } = await loadMain('services/auth.service.js');

  // Stand in for AuthApi. `private` is erased at runtime, so the singleton's client is swappable.
  let response = {};
  authService.client = {
    changePassword: async () => response,
  };

  response = {};

  configStore.updateConfig({ rememberMe: false, email: '', password: '' });
  check(
    'changePassword succeeds without rememberMe',
    (await authService.changePassword('old', 'brand-new')).success === true
  );
  check('no password is written when the user did not opt in', configStore.getConfig().password === '');

  configStore.updateConfig({ rememberMe: true, email: 'a@b.c', password: 'stale' });
  await authService.changePassword('old', 'brand-new');
  check(
    'the stored password is replaced when rememberMe is on',
    configStore.getConfig().password === 'brand-new'
  );

  // A rejected change must not touch the store: the old password is still the live one.
  configStore.updateConfig({ rememberMe: true, email: 'a@b.c', password: 'still-valid' });
  response = { error: { code: 'BAD_REQUEST', message: 'Current password is incorrect' } };
  const rejected = await authService.changePassword('wrong', 'never-set');
  check('a rejected change reports failure', rejected.success === false);
  check(
    'a rejected change leaves the stored password alone',
    configStore.getConfig().password === 'still-valid'
  );

  // The regression this file exists for.
  configStore.updateConfig({ rememberMe: true, email: 'a@b.c', password: 'stale' });
  response = {};
  const realUpdate = configStore.updateConfig.bind(configStore);
  configStore.updateConfig = () => {
    throw new Error('disk full');
  };
  let survived;
  try {
    survived = await authService.changePassword('old', 'brand-new');
  } finally {
    configStore.updateConfig = realUpdate;
  }
  check('a change still succeeds when the store write throws', survived.success === true);
  check('and reports no error', survived.error === undefined);

  configStore.updateConfig({ rememberMe: false, email: '', password: '' });

  return failures;
}
