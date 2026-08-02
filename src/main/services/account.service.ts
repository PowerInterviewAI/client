import { UsersApi } from '../api/users.js';
import { clearLegacyInterviewConf, legacyInterviewConf } from '../store/config.store.js';
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

      const interviewConfig = response.data.interview_config;

      // Pre-sync builds kept this config on local disk only. If the account has none yet,
      // adopt the leftover local copy instead of presenting the user an empty profile.
      if (!interviewConfig) {
        const migration = await this.migrateLegacyConfig();
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
      if (interviewConfig) clearLegacyInterviewConf();
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
   */
  private async migrateLegacyConfig(): Promise<'migrated' | 'failed' | 'none'> {
    const fullName = legacyInterviewConf?.username ?? '';
    const profileData = legacyInterviewConf?.profileData ?? '';
    const context = legacyInterviewConf?.jobDescription ?? '';
    if (!fullName && !profileData && !context) return 'none';

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

      appStateService.updateState({
        interviewConfig: { fullName, profileData, context },
        interviewConfigLoaded: true,
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to update account' };
    }
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
