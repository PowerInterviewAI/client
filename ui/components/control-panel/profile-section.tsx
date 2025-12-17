'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Config } from '@/types/config';
import { Moon, Sun } from 'lucide-react';
import Image from 'next/image';

interface ProfileSectionProps {
  config?: Config;
  onProfileClick: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
}

export function ProfileSection({
  config,
  onProfileClick,
  onThemeToggle,
  isDark,
}: ProfileSectionProps) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onProfileClick}
            className="rounded-md hover:bg-muted h-10"
          >
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
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit profile</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onThemeToggle}
            className="h-9 w-9 p-0 hover:bg-muted"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
