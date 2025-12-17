'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Config } from '@/types/config';
import { ChevronUp, LogOut, Moon, Sun, User } from 'lucide-react';
import Image from 'next/image';

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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
