import { UsersApi } from '../api/users.js';
import {
  claimLegacyInterviewConf,
  clearLegacyInterviewConf,
  getLegacyInterviewConf,
  getLegacyInterviewConfOwner,
} from '../store/config.store.js';
import { InterviewConfig } from '../types/app-state.js';
import { appStateService } from './app-state.service.js';

/**
 * AccountService
 * Keeps the in-memory interview config (full name, profile, context) in sync with
 * the account persisted on the backend. Not written to local disk - the backend is
 * the only durable store, so this always reflects whatever was last fetched/saved
 * this session.
 */
export class AccountService {
  private client = new UsersApi();

  /**
   * Pull the authenticated user's persisted interview config from the backend
   * into app state. Called after login so a device shows the same config the
   * user last saved anywhere.
   */
  async pullFromBackend(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.getMe();
      if (response.error || !response.data) {
        return { success: false, error: response.error?.message || 'Failed to fetch account' };
      }

      const account = response.data;
      const interviewConfig = account.interview_config;

      // Pre-sync builds kept this config on local disk only. If the account has none yet,
      // adopt the leftover local copy instead of presenting the user an empty profile.
      if (!interviewConfig) {
        const migration = await this.migrateLegacyConfig(account._id);
        if (migration === 'migrated') return { success: true };
        if (migration === 'failed') {
          return { success: false, error: 'Failed to migrate local configuration' };
        }
      }

      appStateService.updateState({
        interviewConfig: {
          fullName: interviewConfig?.full_name ?? '',
          profileData: interviewConfig?.profile_data ?? '',
          context: interviewConfig?.context ?? '',
        },
        interviewConfigLoaded: true,
      });
      if (interviewConfig) this.discardLegacyConfigIfOwned(account._id);
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to fetch account' };
    }
  }

  /**
   * Push a pre-sync local config up to the account, once. The local copy is only
   * dropped after the backend confirms the write, so a failed migration is retried
   * on the next launch rather than losing the user's profile.
   *
   * 'none' means there was nothing local to migrate, which is distinct from a push
   * that failed: only the former should leave the user looking at a blank profile.
   *
   * The leftover copy is device-scoped, not account-scoped, so the first account offered
   * it claims it and it is never pushed anywhere else. Without that claim, a second
   * sign-in - a new signup, or another user on a shared machine - would inherit the first
   * user's CV, because a failed push deliberately keeps the copy around for retry. The
   * claim is persisted, since that retry can happen in a later run of the app.
   */
  private async migrateLegacyConfig(accountId: string): Promise<'migrated' | 'failed' | 'none'> {
    const legacy = getLegacyInterviewConf();
    const fullName = legacy?.username ?? '';
    const profileData = legacy?.profileData ?? '';
    const context = legacy?.jobDescription ?? '';
    if (!fullName && !profileData && !context) return 'none';

    const owner = getLegacyInterviewConfOwner();
    if (owner === null) {
      claimLegacyInterviewConf(accountId);
    } else if (owner !== accountId) {
      return 'none';
    }

    const result = await this.updateConfig(fullName, profileData, context);
    if (!result.success) {
      // Surface the local copy rather than an empty form, but leave it unloaded so the
      // dialog keeps Save disabled and retries the pull instead of letting the user
      // overwrite the account from a half-migrated state.
      appStateService.updateState({
        interviewConfig: { fullName, profileData, context },
        interviewConfigLoaded: false,
      });
      return 'failed';
    }

    clearLegacyInterviewConf();
    return 'migrated';
  }

  /**
   * Drop the pre-sync copy now that this account carries its own config.
   *
   * Gated on the claim: an unclaimed copy belongs to the first account offered it, same rule
   * migrateLegacyConfig applies, so this account may discard it. A copy claimed by a different
   * account is a migration that has not finished - a failed push deliberately keeps it for
   * retry - and deleting it here would lose that user's CV on a shared machine.
   */
  private discardLegacyConfigIfOwned(accountId: string): void {
    const owner = getLegacyInterviewConfOwner();
    if (owner !== null && owner !== accountId) return;
    clearLegacyInterviewConf();
  }

  /**
   * Push local interview config changes to the backend, then mirror the
   * saved values into app state.
   */
  async updateConfig(
    fullName: string,
    profileData: string,
    context: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.updateInterviewConfig({
        full_name: fullName,
        profile_data: profileData,
        context,
      });
      if (response.error) {
        return { success: false, error: response.error.message || 'Failed to update account' };
      }

      // Mirror what the backend stored, not what was sent: it truncates oversized fields,
      // so echoing the request would leave the app showing a value the account does not have.
      const saved = response.data?.interview_config;
      appStateService.updateState({
        interviewConfig: {
          fullName: saved?.full_name ?? fullName,
          profileData: saved?.profile_data ?? profileData,
          context: saved?.context ?? context,
        },
        interviewConfigLoaded: true,
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to update account' };
    }
  }

  /**
   * Full interview config for the configuration dialog.
   *
   * Always refreshes first: a save replaces the whole config, so editing a copy another device
   * has since changed would silently discard that change. `success` reports whether the values
   * are safe to save over, and requires *this* refresh to have succeeded - not just that
   * something was loaded earlier in the session. `interviewConfigLoaded` survives a failed pull
   * by design (it gates Start, which should keep working on a blip), so trusting it alone would
   * hand the dialog a stale copy with Save enabled and no warning, which is exactly how a newer
   * config saved on another device gets overwritten.
   */
  async getEditableConfig(): Promise<{
    success: boolean;
    data: InterviewConfig;
    error?: string;
  }> {
    const pull = await this.pullFromBackend();
    const state = appStateService.getState();
    const fresh = pull.success && state.interviewConfigLoaded;

    return {
      success: fresh,
      data: state.interviewConfig,
      error: fresh ? undefined : pull.error || 'Failed to load configuration',
    };
  }

  /**
   * Drop the signed-out account's config from memory. Nothing else resets it, so
   * without this the next user on this device inherits the previous user's profile
   * whenever their post-login pull fails, and can overwrite their own account with it.
   */
  clearState(): void {
    appStateService.updateState({
      interviewConfig: { fullName: '', profileData: '', context: '' },
      interviewConfigLoaded: false,
    });
  }
}

export const accountService = new AccountService();
