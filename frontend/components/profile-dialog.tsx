'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, X } from 'lucide-react'

interface ExperienceItem {
  id: string
  type: 'experience' | 'education'
  title: string
}

interface ProfileDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (name: string) => void
  initialName: string
}

export default function ProfileDialog({
  isOpen,
  onOpenChange,
  onNameChange,
  initialName,
}: ProfileDialogProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState('john.doe@example.com')
  const [phone, setPhone] = useState('+1 (555) 123-4567')
  const [experiences, setExperiences] = useState<ExperienceItem[]>([
    { id: '1', type: 'experience', title: 'Senior Product Manager at TechCorp' },
    { id: '2', type: 'education', title: 'BS in Computer Science - Stanford University' },
    { id: '3', type: 'experience', title: 'Full Stack Developer at StartupXYZ' },
  ])

  const addExperience = () => {
    const newId = Date.now().toString()
    setExperiences([...experiences, { id: newId, type: 'experience', title: 'New Experience' }])
  }

  const removeExperience = (id: string) => {
    setExperiences(experiences.filter(exp => exp.id !== id))
  }

  const updateExperience = (id: string, title: string) => {
    setExperiences(experiences.map(exp => (exp.id === id ? { ...exp, title } : exp)))
  }

  const handleSave = () => {
    onNameChange(name)
    onOpenChange(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
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
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Full Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Email Address
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  type="email"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Phone Number
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border pt-4" />

            {/* Experiences & Education Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Experience & Education</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={addExperience}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {experiences.map((exp) => (
                  <div key={exp.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <Input
                        value={exp.title}
                        onChange={(e) => updateExperience(exp.id, e.target.value)}
                        placeholder={exp.type === 'experience' ? 'Job title and company' : 'Degree and school'}
                        className="h-8 text-xs bg-background border-border"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeExperience(exp.id)}
                      className="h-8 w-8 p-0 flex-shrink-0 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-end gap-2 flex-shrink-0">
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
