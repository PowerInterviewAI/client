'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import useAuth from '@/hooks/use-auth';
import { Config } from '@/types/config';
import { ChevronUp, Key, LogOut, Moon, Sun, User } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface ProfileSectionProps {
  config?: Config;
  onProfileClick: () => void;
  onSignOut: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
}

export function ProfileSection({
  config,
  onProfileClick,
  onSignOut,
  onThemeToggle,
  isDark,
}: ProfileSectionProps) {
  const { changePassword, loading, error } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    try {
      await changePassword(currentPassword, newPassword);
      setIsChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      // Error is handled by the useAuth hook
      console.error('Password change failed:', err);
    }
  };
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="rounded-md hover:bg-muted h-10">
            <div className="flex items-center gap-2 text-foreground">
              {config?.profile?.photo ? (
                <Image
                  src={config?.profile?.photo}
                  alt="Profile preview"
                  className="w-8 h-8 rounded-full object-cover border"
                  width={32}
                  height={32}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground border">
                  {config?.profile?.username
                    ? config?.profile?.username.charAt(0).toUpperCase()
                    : '?'}
                </div>
              )}
              <p className="text-sm font-medium">{config?.profile?.username}</p>
              <ChevronUp className="h-4 w-4" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuItem onClick={onProfileClick}>
            <User className="mr-2 h-4 w-4" />
            Edit profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onThemeToggle}>
            {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
            <Key className="mr-2 h-4 w-4" />
            Change password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="current-password" className="text-sm font-medium">
                Current Password
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsChangePasswordOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleChangePassword}
              disabled={
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                loading
              }
            >
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
