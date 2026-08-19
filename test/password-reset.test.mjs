/**
 * The two ways the reset wrappers can be wrong without anything looking wrong.
 *
 * The login form pre-fills email and password from the config store when rememberMe is on, so a
 * reset that does not update the store leaves the user staring at a filled-in password that has
 * just stopped working, with no indication why. The opposite mistake is quieter still: writing
 * the password when the user did *not* opt in puts credentials on disk behind their back, and
 * login/logout deliberately leave that store empty.
 *
 * `forgotPassword` gets one check of its own, because the whole point of the endpoint is that it
 * answers the same for a registered and an unregistered address. A wrapper that inferred
 * anything more than "the request went through" would hand the enumeration back over the UI.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('password-reset');

  const { configStore } = await loadMain('store/config.store.js');
  const { authService } = await loadMain('services/auth.service.js');

  // Stand in for AuthApi. `private` is erased at runtime, so the singleton's client is swappable.
  let response = {};
  authService.client = {
    forgotPassword: async () => response,
    verifyPasswordResetCode: async () => response,
    resetPassword: async () => response,
  };

  // --- forgotPassword ---------------------------------------------------------------

  response = {};
  check(
    'forgotPassword succeeds for any address',
    (await authService.forgotPassword('a@b.c')).success === true
  );

  response = { error: { code: 'NETWORK_ERROR', message: 'offline' } };
  const offline = await authService.forgotPassword('a@b.c');
  check('forgotPassword surfaces a transport failure', offline.success === false);
  check(
    'forgotPassword carries an error message',
    typeof offline.error === 'string' && offline.error !== ''
  );

  // --- resetPassword and the remember-me store --------------------------------------

  response = {};

  configStore.updateConfig({ rememberMe: false, email: '', password: '' });
  check(
    'resetPassword succeeds without rememberMe',
    (await authService.resetPassword('a@b.c', 'code', 'brand-new')).success === true
  );
  check(
    'no password is written when the user did not opt in',
    configStore.getConfig().password === ''
  );
  check('no email is written when the user did not opt in', configStore.getConfig().email === '');

  configStore.updateConfig({ rememberMe: true, email: 'a@b.c', password: 'stale' });
  await authService.resetPassword('a@b.c', 'code', 'brand-new');
  check(
    'the stored password is replaced when rememberMe is on',
    configStore.getConfig().password === 'brand-new'
  );
  check('the stored email is left as it was', configStore.getConfig().email === 'a@b.c');

  // Case differences between what was typed at login and what was typed here are not a
  // different account.
  configStore.updateConfig({ rememberMe: true, email: 'a@b.c', password: 'stale' });
  await authService.resetPassword('A@B.C', 'code', 'brand-new');
  check(
    'the remembered account is matched case-insensitively',
    configStore.getConfig().password === 'brand-new'
  );

  // Reset is the only password flow that runs signed out, so it can be run for an account
  // other than the remembered one. That must not clobber the remembered one.
  configStore.updateConfig({ rememberMe: true, email: 'mine@b.c', password: 'mine' });
  await authService.resetPassword('someone-else@b.c', 'code', 'their-new-password');
  check(
    'resetting another account leaves the remembered password alone',
    configStore.getConfig().password === 'mine'
  );
  check(
    'resetting another account leaves the remembered email alone',
    configStore.getConfig().email === 'mine@b.c'
  );

  // A failed reset must not touch the store: the old password is still the live one.
  configStore.updateConfig({ rememberMe: true, email: 'a@b.c', password: 'still-valid' });
  response = { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired verification code' } };
  const rejected = await authService.resetPassword('a@b.c', 'wrong-code', 'never-set');
  check('a rejected reset reports failure', rejected.success === false);
  check(
    'a rejected reset leaves the stored password alone',
    configStore.getConfig().password === 'still-valid'
  );

  // A store that cannot be written must not turn a completed reset into a reported failure.
  // By the time the write runs the password has changed and the code is spent, so "failed"
  // sends the user to retry with a code that can no longer work.
  configStore.updateConfig({ rememberMe: true, email: 'a@b.c', password: 'stale' });
  response = {};
  const realUpdate = configStore.updateConfig.bind(configStore);
  configStore.updateConfig = () => {
    throw new Error('disk full');
  };
  let survived;
  try {
    survived = await authService.resetPassword('a@b.c', 'code', 'brand-new');
  } finally {
    configStore.updateConfig = realUpdate;
  }
  check('a reset still succeeds when the store write throws', survived.success === true);
  check('and reports no error', survived.error === undefined);

  // --- verifyPasswordResetCode ------------------------------------------------------

  response = {};
  check(
    'verifyPasswordResetCode passes a good code',
    (await authService.verifyPasswordResetCode('a@b.c', 'code')).success === true
  );

  response = { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired verification code' } };
  check(
    'verifyPasswordResetCode rejects a bad code',
    (await authService.verifyPasswordResetCode('a@b.c', 'bad')).success === false
  );

  configStore.updateConfig({ rememberMe: false, email: '', password: '' });

  return failures;
}
