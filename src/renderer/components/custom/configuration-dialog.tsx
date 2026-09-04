import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ChangePasswordDialog } from '@/components/custom/change-password-dialog';
import { HotkeyCheatsheet } from '@/components/custom/hotkey-cheatsheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAppState } from '@/hooks/use-app-state';
import useAuth from '@/hooks/use-auth';
import { useProfessionalMode } from '@/hooks/use-professional-mode';
import { useTranscriptPanel } from '@/hooks/use-transcript-panel';
import { getElectron } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

// Kept in sync with the backend's MAX_PROFILE_DATA_LENGTH / MAX_CONTEXT_LENGTH (app/cfg/llm.py)
const MAX_FIELD_LENGTH = 128_000;
// Kept in sync with the backend's MAX_USERNAME_LENGTH (app/cfg/llm.py)
const MAX_NAME_LENGTH = 1_000;

/**
 * How much of a long field's budget is left, once it is close enough to matter.
 *
 * `maxLength` on a textarea truncates a paste silently, which for these two fields means a CV or
 * a job description arriving 2,000 characters shorter than the one the user copied, with nothing
 * on screen having said so. Hidden below the threshold: a counter over an empty box is noise,
 * and the limit is generous enough that most sessions never approach it.
 */
const LIMIT_NOTICE_RATIO = 0.9;

function FieldLimitNotice({ value, max }: { value: string; max: number }) {
  if (value.length < max * LIMIT_NOTICE_RATIO) return null;

  const atLimit = value.length >= max;
  return (
    <p
      className={`text-[11px] tabular-nums ${atLimit ? 'text-destructive' : 'text-muted-foreground'}`}
      // Announced when it changes rather than only on focus: the moment it matters is a paste
      // that was cut short, which is not a keystroke the user is watching the counter for.
      role="status"
    >
      {atLimit
        ? `Character limit reached (${max.toLocaleString()}). Extra text was not added.`
        : `${(max - value.length).toLocaleString()} characters left`}
    </p>
  );
}

interface ConfigurationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type ConfigTab = 'account' | 'session' | 'shortcuts' | 'billing';

export default function ConfigurationDialog({ isOpen, onOpenChange }: ConfigurationDialogProps) {
  const navigate = useNavigate();
  const { appState } = useAppState();
  const { changePassword, loading: authLoading, error: authError, setError } = useAuth();
  const { enabled: professionalMode, toggle: toggleProfessionalMode } = useProfessionalMode();
  const { visible: transcriptVisible, toggle: toggleTranscriptVisible } = useTranscriptPanel();

  const [activeTab, setActiveTab] = useState<ConfigTab>('account');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [name, setName] = useState('');
  const [profileData, setProfileData] = useState('');
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load once per open, straight from main, rather than tracking app state. A save replaces
  // the whole config, so this both refreshes what another device may have changed and keeps
  // a late-arriving update from overwriting what the user is currently typing.
  useEffect(() => {
    if (!isOpen) return;

    setActiveTab('account');

    let cancelled = false;
    setLoading(true);
    setConfigLoaded(false);

    void (async () => {
      try {
        const result = await getElectron()?.account?.get();
        if (cancelled) return;

        // Show whatever main has even when the refresh failed, so the user is not staring at a
        // blank form - but only mark it loaded (and thus safe to save over) when it succeeded.
        if (result?.data) {
          setName(result.data.fullName);
          setProfileData(result.data.profileData);
          setContext(result.data.context);
        }
        setConfigLoaded(result?.success ?? false);
      } catch (error) {
        console.error('Failed to load configuration:', error);
        if (!cancelled) setConfigLoaded(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const electron = getElectron();
      if (!electron?.account) {
        throw new Error('Electron API not available');
      }

      // Trimmed on the way out, not just validated. The Save button is already gated on the
      // trimmed name being non-empty, so a name of pure whitespace could never be saved - but a
      // name with a trailing space could, and it is the string the prompts address the candidate
      // by. The same goes for a CV pasted with a leading blank line.
      const result = await electron.account.update(name.trim(), profileData.trim(), context.trim());
      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      // Account update pushes a fresh app-state broadcast, so no manual refresh needed here
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      return await changePassword(currentPassword, newPassword);
    } catch (err) {
      console.error('Password change failed:', err);
      return false;
    }
  };

  const handleBuyCredits = () => {
    onOpenChange(false);
    navigate('/payment');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Your profile, session defaults, shortcuts, and billing - all in one place.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ConfigTab)}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="w-full">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="session">Session</TabsTrigger>
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-2">
            <TabsContent value="account" className="mt-0 space-y-5">
              <div className="grid gap-2">
                <label
                  htmlFor="config-full-name"
                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                >
                  Full Name{' '}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </label>
                <Input
                  id="config-full-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your profile name"
                  className="text-sm"
                  maxLength={MAX_NAME_LENGTH}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="config-profile"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Profile{' '}
                    <span className="text-destructive" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <FieldLimitNotice value={profileData} max={MAX_FIELD_LENGTH} />
                </div>
                <Textarea
                  id="config-profile"
                  required
                  value={profileData}
                  onChange={(e) => setProfileData(e.target.value)}
                  placeholder="Enter your profile information. (e.g. your CV/resume, LinkedIn profile, or a brief bio)"
                  className="text-sm min-h-20 max-h-40 overflow-auto"
                  maxLength={MAX_FIELD_LENGTH}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="config-context"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Context (Recommended)
                  </label>
                  <FieldLimitNotice value={context} max={MAX_FIELD_LENGTH} />
                </div>
                <Textarea
                  id="config-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Enter the context you are targeting. (e.g. the job description, role requirements or any other information)"
                  className="text-sm min-h-20 max-h-40 overflow-auto"
                  maxLength={MAX_FIELD_LENGTH}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-xs text-muted-foreground">Change your account password</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setIsChangePasswordOpen(true);
                  }}
                >
                  Change Password
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="session" className="mt-0 space-y-4">
              <p className="text-xs text-muted-foreground">
                These carry over to your next session. Both can still be toggled from the control
                bar or their hotkey while a session is running.
              </p>
              <label className="flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Professional mode</p>
                  <p className="text-xs text-muted-foreground">
                    Short hints (headline + keyword bullets) instead of full sentences
                  </p>
                </div>
                <Checkbox
                  checked={professionalMode}
                  onCheckedChange={() => toggleProfessionalMode()}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Show transcript panel</p>
                  <p className="text-xs text-muted-foreground">
                    Keep the transcription dock visible during a session
                  </p>
                </div>
                <Checkbox
                  checked={transcriptVisible}
                  onCheckedChange={() => toggleTranscriptVisible()}
                />
              </label>
            </TabsContent>

            <TabsContent value="shortcuts" className="mt-0">
              <HotkeyCheatsheet />
            </TabsContent>

            <TabsContent value="billing" className="mt-0 space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Credits</p>
                  <p className="text-xs text-muted-foreground">Your remaining balance</p>
                </div>
                <p className="text-lg font-semibold tabular-nums">{appState?.credits ?? '—'}</p>
              </div>
              <Button onClick={handleBuyCredits} className="w-full">
                Buy Credits
              </Button>
            </TabsContent>
          </div>
        </Tabs>

        {activeTab === 'account' && (
          <DialogFooter>
            <div className="flex items-center justify-end gap-2 w-full">
              {loading && <p className="mr-auto text-xs text-muted-foreground">Loading...</p>}
              {!loading && !configLoaded && (
                <p className="mr-auto text-xs text-destructive">
                  Could not load your saved configuration. Reconnect before editing.
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90"
                disabled={
                  saving ||
                  loading ||
                  !configLoaded ||
                  name.trim() === '' ||
                  profileData.trim() === ''
                }
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>

      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        onChangePassword={handleChangePassword}
        loading={authLoading}
        error={authError}
      />
    </Dialog>
  );
}
