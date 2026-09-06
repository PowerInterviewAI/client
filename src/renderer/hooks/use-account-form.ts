import { useCallback, useEffect, useState } from 'react';

import { getElectron } from '@/lib/utils';

/**
 * The account's interview identity - full name, profile (CV) and job context - loaded from main
 * and saved back as one unit.
 *
 * Shared by the account page and the first-run wizard, which collect exactly the same three
 * fields and write them through the same `account.update`. The wizard splits them across two
 * steps, so it needs the state to outlive each step's own component; keeping the state here also
 * means neither surface can drift from the other on what counts as valid or what gets trimmed.
 */
export function useAccountForm() {
  const [fullName, setFullName] = useState('');
  const [profileData, setProfileData] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Only true once the fetch actually succeeds. A late failure that left this true would let Save
  // overwrite a perfectly good saved profile with the empty form the user is looking at.
  const [loaded, setLoaded] = useState(false);

  // Loaded straight from main rather than from the tracked app state: that carries only a summary
  // (`InterviewConfigSummary`), and this also picks up what another device may have changed.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoaded(false);

    void (async () => {
      try {
        const result = await getElectron()?.account?.get();
        if (cancelled) return;

        if (result?.data) {
          setFullName(result.data.fullName);
          setProfileData(result.data.profileData);
          setContext(result.data.context);
        }
        setLoaded(result?.success ?? false);
      } catch (error) {
        console.error('Failed to load your account details:', error);
        if (!cancelled) setLoaded(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Whether there is enough here to run an interview. Mirrors the control bar's start checks. */
  const isComplete = fullName.trim() !== '' && profileData.trim() !== '';

  /**
   * Persist all three fields. Throws on failure so each caller can decide what to do next - the
   * account page reports it and stays put, the wizard reports it and does not advance.
   *
   * Trimmed on the way out, not merely validated: `isComplete` already rejects a name of pure
   * whitespace, but a name with a trailing space would otherwise be saved as-is, and it is the
   * string the prompts address the candidate by. The same goes for a CV pasted with a leading
   * blank line.
   */
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const electron = getElectron();
      if (!electron?.account) {
        throw new Error('Electron API not available');
      }

      const result = await electron.account.update(
        fullName.trim(),
        profileData.trim(),
        context.trim()
      );
      if (!result.success) {
        throw new Error(result.error || 'Failed to save your account details');
      }
    } finally {
      setSaving(false);
    }
  }, [fullName, profileData, context]);

  return {
    fullName,
    setFullName,
    profileData,
    setProfileData,
    context,
    setContext,
    loading,
    loaded,
    saving,
    isComplete,
    save,
  };
}

export type AccountForm = ReturnType<typeof useAccountForm>;
