'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Config } from '@/types/config';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface ProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhoto: string;
  initialName: string;
  initialProfileData: string;
  updateConfig: (config: Partial<Config>) => void;
}

export default function ProfileDialog({
  isOpen,
  onOpenChange,
  initialPhoto,
  initialName,
  initialProfileData,
  updateConfig,
}: ProfileDialogProps) {
  const [photo, setPhoto] = useState(initialPhoto);
  const [name, setName] = useState(initialName);
  const [profileData, setProfileData] = useState(initialProfileData);

  useEffect(() => {
    if (isOpen) {
      setPhoto(initialPhoto);
      setName(initialName);
      setProfileData(initialProfileData);
    }
  }, [isOpen, initialPhoto, initialName, initialProfileData]);

  const handleSave = () => {
    updateConfig({ profile: { photo: photo, username: name, profile_data: profileData } });
    onOpenChange(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string); // base64 string
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onOpenChange(false)}
                className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Close</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Profile Photo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Profile Photo
              </label>

              <div className="relative w-30 h-30 mx-auto">
                {photo ? (
                  <Image
                    src={photo}
                    alt="Profile preview"
                    className="w-30 h-30 rounded-md object-cover border shadow-sm"
                    width={30}
                    height={30}
                  />
                ) : (
                  <div className="w-30 h-30 rounded-md bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground border shadow-sm">
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}

                {/* Overlay for change photo */}
                <label
                  htmlFor="photo-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs opacity-0 hover:opacity-100 rounded-md cursor-pointer transition-opacity"
                >
                  Change
                </label>

                {/* Remove button */}
                {photo && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setPhoto('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-md p-1 shadow hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove photo</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Hidden file input */}
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
