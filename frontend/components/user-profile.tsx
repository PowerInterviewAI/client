'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface ExperienceItem {
  id: string
  type: 'experience' | 'education'
  title: string
}

export default function UserProfile() {
  const [name, setName] = useState('Your Name')
  const [email, setEmail] = useState('your.email@example.com')
  const [phone, setPhone] = useState('+1 (555) 000-0000')
  const [experiences, setExperiences] = useState<ExperienceItem[]>([
    { id: '1', type: 'experience', title: 'Senior Product Manager' },
    { id: '2', type: 'education', title: 'BS in Computer Science' },
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

  return (
    <Card className="bg-card p-4">
      <div className="space-y-4">
        {/* Header */}
        <h2 className="text-sm font-semibold text-foreground">Profile Information</h2>

        {/* Basic Info Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              type="email"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Experiences/Education Section */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">Experiences & Education</label>
            <Button
              size="sm"
              variant="ghost"
              onClick={addExperience}
              className="h-6 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {experiences.map((exp) => (
              <div key={exp.id} className="flex items-center gap-2">
                <Input
                  value={exp.title}
                  onChange={(e) => updateExperience(exp.id, e.target.value)}
                  placeholder={exp.type === 'experience' ? 'Experience' : 'Education'}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeExperience(exp.id)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
