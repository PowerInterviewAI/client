import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface TopBarProps {
  photo: string;
  userName: string;
  onProfileClick: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
}

export default function TopBar({
  photo,
  userName,
  onProfileClick,
  onThemeToggle,
  isDark,
}: TopBarProps) {
  return (
    <div className="border border-border rounded-lg bg-card p-2 shrink-0">
      <div className="flex items-center justify-between">
        {/* Left: App Logo and Title */}
        <div className="flex items-center gap-3">
          {/* <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-accent shrink-0" /> */}
          <Image
            src="/logo.svg"
            alt="Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-cover"
            unoptimized
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Power Interview</h1>
            <p className="text-xs text-muted-foreground">Live AI Interview Assistant</p>
          </div>
        </div>

        {/* Right: Theme toggle, user info and profile button */}
        <div className="flex items-center gap-2">
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onProfileClick}
                className="rounded-md hover:bg-muted h-10"
              >
                <div className="flex items-center gap-2 text-foreground">
                  {photo ? (
                    <Image
                      src={photo}
                      alt="Profile preview"
                      className="w-8 h-8 rounded-full object-cover border shadow-sm"
                      width={32}
                      height={32}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground border shadow-sm">
                      {userName ? userName.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <p className="text-sm font-medium">{userName}</p>
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit profile</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
