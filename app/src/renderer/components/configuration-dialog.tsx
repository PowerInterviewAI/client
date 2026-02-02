import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useConfigStore } from '@/hooks/use-config-store';

interface ConfigurationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConfigurationDialog({ isOpen, onOpenChange }: ConfigurationDialogProps) {
  const { config, updateConfig } = useConfigStore();

  const [photo, setPhoto] = useState('');
  const [name, setName] = useState('');
  const [profileData, setProfileData] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Initialize form values when dialog opens - runs before paint
  useEffect(() => {
    if (!isOpen) return;

    // Queue state updates in a single microtask to avoid cascading renders
    Promise.resolve().then(() => {
      if (config?.interview_conf) {
        setPhoto(config.interview_conf.photo ?? '');
        setName(config.interview_conf.username ?? '');
        setProfileData(config.interview_conf.profile_data ?? '');
        setJobDescription(config.interview_conf.job_description ?? '');
      }
    });
  }, [isOpen, config?.interview_conf]);

  const handleSave = async () => {
    const interviewConf = {
      photo: photo,
      username: name,
      profile_data: profileData,
      job_description: jobDescription,
    };
    try {
      await updateConfig({ interview_conf: interviewConf });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
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
      <DialogContent className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Configuration</DialogTitle>
          <DialogDescription>
            Update your configuration: profile photo, username, CV/resume and job description.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-2">
          <div className="space-y-5">
            <div className="flex flex-col justify-center">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Profile Photo
              </label>

              <div className="relative w-30 h-30 mx-auto">
                {photo ? (
                  <img
                    src={photo}
                    alt="Profile preview"
                    className="w-30 h-30 rounded-md object-cover border shadow-sm"
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
                        tabIndex={-1}
                        onClick={() => setPhoto('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-md p-1 shadow hover:bg-red-600 transition-colors"
                        aria-label="Remove photo"
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

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Username
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your username"
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                CV / Resume Content (Recommended)
              </label>
              <Textarea
                value={profileData}
                onChange={(e) => setProfileData(e.target.value)}
                placeholder="Enter your CV or resume content"
                className="text-sm min-h-20 max-h-40 overflow-auto"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Job Description (Optional)
              </label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Enter the job description you are targeting"
                className="text-sm min-h-20 max-h-40 overflow-auto"
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
