'use client';

import DocumentationDialog from '@/components/documentation-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useAuth from '@/hooks/use-auth';
import { RunningState } from '@/types/appState';
import { Config } from '@/types/config';
import { ChevronUp, Key, LogOut, Moon, SettingsIcon, Sun } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { ChangePasswordDialog } from './change-password-dialog';

interface ProfileSectionProps {
  config?: Config;
  onProfileClick: () => void;
  onSignOut: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
  runningState: RunningState;
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function ProfileSection({
  config,
  onProfileClick,
  onSignOut,
  onThemeToggle,
  isDark,
  runningState,
  getDisabled,
}: ProfileSectionProps) {
  const { changePassword, loading, error, setError } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false);

  const disabled = getDisabled(runningState, true);

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await changePassword(currentPassword, newPassword);
      setIsChangePasswordOpen(false);
    } catch (err) {
      // Error is handled by the useAuth hook
      console.error('Password change failed:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled}
            variant="ghost"
            size="sm"
            className="rounded-md hover:bg-muted h-10"
          >
            <div className="flex items-center gap-2 text-foreground">
              {config?.interview_conf?.photo ? (
                <Image
                  src={config?.interview_conf?.photo}
                  alt="Profile preview"
                  className="w-8 h-8 rounded-full object-cover border"
                  width={32}
                  height={32}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground border">
                  {config?.interview_conf?.username
                    ? config?.interview_conf?.username.charAt(0).toUpperCase()
                    : '?'}
                </div>
              )}
              <p className="text-sm font-medium">{config?.interview_conf?.username}</p>
              <ChevronUp className="h-4 w-4" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuItem onClick={() => !disabled && onProfileClick()} disabled={disabled}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            Configuration
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => !disabled && onThemeToggle()}>
            {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (disabled) return;
              setError(null);
              setIsChangePasswordOpen(true);
            }}
          >
            <Key className="mr-2 h-4 w-4" />
            Change password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => !disabled && onSignOut()} disabled={disabled}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        onChangePassword={handleChangePassword}
        loading={loading}
        error={error}
      />
      <DocumentationDialog open={isDocumentationOpen} onOpenChange={setIsDocumentationOpen} />
    </div>
  );
}
