'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X } from 'lucide-react'
import { Config } from '@/types/config'

interface ProfileDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  initialName: string
  initialProfileData: string
  updateConfig: (config: Partial<Config>) => void
}

export default function ProfileDialog({
  isOpen,
  onOpenChange,
  initialName,
  initialProfileData,
  updateConfig,
}: ProfileDialogProps) {
  const [name, setName] = useState(initialName)
  const [profileData, setProfileData] = useState(initialProfileData)

  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setProfileData(initialProfileData)
    }
  }, [isOpen, initialName, initialProfileData])

  const handleSave = () => {
    updateConfig({ profile: { username: name, profile_data: profileData } })
    onOpenChange(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Username */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Username
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your username"
                className="h-9 text-sm"
              />
            </div>

            {/* Profile Data (multiline) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Profile Data
              </label>
              <Textarea
                value={profileData}
                onChange={(e) => setProfileData(e.target.value)}
                placeholder="Enter profile details"
                className="text-sm min-h-[100px] max-h-[200px] overflow-auto"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-end gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
