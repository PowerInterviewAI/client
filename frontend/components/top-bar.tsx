import { Button } from '@/components/ui/button'
import { User, Moon, Sun } from 'lucide-react'

interface TopBarProps {
  userName: string
  onProfileClick: () => void
  onThemeToggle: () => void
  isDark: boolean
}

export default function TopBar({ userName, onProfileClick, onThemeToggle, isDark }: TopBarProps) {
  return (
    <div className="border-b border-border bg-card px-4 py-3 shrink-0">
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
            className="rounded-md hover:bg-muted"
            title="Edit profile"
          >
            <div className="flex items-center gap-2 text-foreground">
              <p className="text-sm font-medium">{userName}</p>
              <User className="h-4 w-4" />
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}
