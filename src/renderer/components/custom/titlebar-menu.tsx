import {
  BookOpen,
  CreditCard,
  EyeOff,
  Key,
  LogOut,
  Mail,
  Menu,
  Moon,
  SettingsIcon,
  Sun,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import ConfigurationDialog from '@/components/custom/configuration-dialog';
import DocumentationDialog from '@/components/custom/documentation-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState } from '@/hooks/use-app-state';
import useAuth from '@/hooks/use-auth';
import { useConfigStore } from '@/hooks/use-config-store';
import { useThemeStore } from '@/hooks/use-theme-store';
import { Hotkey, HOTKEYS } from '@/lib/hotkeys';
import { getElectron } from '@/lib/utils';
import { RunningState } from '@/types/app-state';

import { ChangePasswordDialog } from './change-password-dialog';

export default function TitlebarMenu({ style }: { style?: React.CSSProperties }) {
  const navigate = useNavigate();
  const { appState, runningState } = useAppState();
  const { config } = useConfigStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { logout, changePassword, loading, error, setError } = useAuth();
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const isLoggedIn = appState?.isLoggedIn ?? false;
  // Account actions rewrite state the running assistant depends on; theme, docs and stealth do not.
  const disabled = runningState !== RunningState.Idle;

  const handleToggleStealth = () => {
    const electron = getElectron();
    if (electron) {
      electron.toggleStealth();
    } else {
      console.warn('Electron API not available for toggling stealth mode');
    }
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    let res = false;
    try {
      if (await changePassword(currentPassword, newPassword)) {
        res = true;
      }
    } catch (err) {
      // Error is handled by the useAuth hook
      console.error('Password change failed:', err);
    }
    return res;
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      // Read the message off the caught error rather than the `error` state above - `logout`
      // sets it and throws in the same tick, so this closure's `error` is still last render's
      // (stale) value.
      console.error('Sign out failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  return (
    <>
      {/* Non-modal: a modal menu locks body pointer events, and items here change route or open a
          dialog, either of which can unmount the menu before it releases the lock. */}
      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Menu"
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
                style={style}
              >
                <Menu className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Menu</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" side="bottom">
          {isLoggedIn && (
            <>
              <DropdownMenuLabel className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                {config?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => !disabled && setIsConfigOpen(true)}
                disabled={disabled}
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Configuration
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (disabled) return;
                  setError(null);
                  setIsChangePasswordOpen(true);
                }}
                disabled={disabled}
              >
                <Key className="mr-2 h-4 w-4" />
                Change password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/payment')} disabled={disabled}>
                <CreditCard className="mr-2 h-4 w-4" />
                Buy Credits
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleStealth}>
                <EyeOff className="mr-2 h-4 w-4" />
                Stealth mode ({HOTKEYS[Hotkey.ToggleStealth].combo})
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={() => toggleTheme()}>
            {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDocsOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Documentation
          </DropdownMenuItem>

          {isLoggedIn && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => !disabled && void handleSignOut()}
                disabled={disabled}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rendered unconditionally: gating these on isLoggedIn would unmount an open dialog the
          moment a session ends, stranding the pointer-events lock it holds. */}
      <DocumentationDialog open={isDocsOpen} onOpenChange={setIsDocsOpen} />

      <ConfigurationDialog isOpen={isConfigOpen} onOpenChange={setIsConfigOpen} />

      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        onChangePassword={handleChangePassword}
        loading={loading}
        error={error}
      />
    </>
  );
}
