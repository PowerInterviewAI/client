import { Button } from '@/components/ui/button'
import { User, Moon, Sun } from 'lucide-react'

interface TopBarProps {
  photo: string
  userName: string
  onProfileClick: () => void
  onThemeToggle: () => void
  isDark: boolean
}

export default function TopBar({ photo, userName, onProfileClick, onThemeToggle, isDark }: TopBarProps) {
  return (
    <div className="border border-border rounded-lg bg-card p-2 shrink-0">
      <div className="flex items-center justify-between">
        {/* Left: App Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-accent shrink-0" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Power Interview</h1>
            <p className="text-xs text-muted-foreground">Interview Assistant</p>
          </div>
        </div>

        {/* Right: Theme toggle, user info and profile button */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onThemeToggle}
            className="h-9 w-9 p-0 hover:bg-muted"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onProfileClick}
            className="rounded-md hover:bg-muted h-10"
            title="Edit profile"
          >
            <div className="flex items-center gap-2 text-foreground">
              {photo ? (
                <img
                  src={photo}
                  alt="Profile preview"
                  className="w-8 h-8 rounded-full object-cover border shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground border shadow-sm">
                  {userName ? userName.charAt(0).toUpperCase() : "?"}
                </div>
              )}
              <p className="text-sm font-medium">{userName}</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}
