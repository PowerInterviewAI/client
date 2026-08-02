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
        const migrated = await this.migrateLegacyConfig();
        if (migrated) return { success: true };
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
   */
  private async migrateLegacyConfig(): Promise<boolean> {
    const fullName = legacyInterviewConf?.username ?? '';
    const profileData = legacyInterviewConf?.profileData ?? '';
    const context = legacyInterviewConf?.jobDescription ?? '';
    if (!fullName && !profileData && !context) return false;

    const result = await this.updateConfig(fullName, profileData, context);
    if (!result.success) return false;

    clearLegacyInterviewConf();
    return true;
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
}

export const accountService = new AccountService();
