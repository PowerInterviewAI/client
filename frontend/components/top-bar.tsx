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
    <div className="border-b border-border bg-card px-4 py-3 shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Left: App Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex-shrink-0" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Power Interview</h1>
            <p className="text-xs text-muted-foreground">Interview Assistant</p>
          </div>
        </div>

        {/* Right: Theme toggle, user info and profile button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onThemeToggle}
            className="h-9 w-9 p-0 hover:bg-muted"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onProfileClick}
            className="h-9 w-9 p-0 rounded-full hover:bg-muted"
            title="Edit profile"
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
