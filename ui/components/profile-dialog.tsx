'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Config } from '@/types/config';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from './ui/dialog';
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg">
        <DialogTitle>Edit Profile</DialogTitle>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5">
            <div className="flex flex-col justify-center">
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

                <label
                  htmlFor="photo-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs opacity-0 hover:opacity-100 rounded-md cursor-pointer transition-opacity"
                >
                  Change
                </label>

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

              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <p className="text-xs mx-auto pt-2 text-muted-foreground">
                Your face will be replaced into this photo under video control.
              </p>
            </div>

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

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                CV / Resume Content
              </label>
              <Textarea
                value={profileData}
                onChange={(e) => setProfileData(e.target.value)}
                placeholder="Enter your CV or resume content"
                className="text-sm min-h-[100px] max-h-[200px] overflow-auto"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90">
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
