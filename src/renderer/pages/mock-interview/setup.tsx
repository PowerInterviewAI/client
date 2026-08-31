import { useState } from 'react';
import { toast } from 'sonner';

import HeadphoneNoticeDialog from '@/components/custom/headphone-notice-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppState } from '@/hooks/use-app-state';
import { useAudioInputDevices } from '@/hooks/use-audio-devices';
import { useConfigStore } from '@/hooks/use-config-store';
import { useConfigurationDialog } from '@/hooks/use-configuration-dialog';
import { getElectron } from '@/lib/utils';
import { getLanguageOption } from '@/types/language';
import type { MockInterviewSetup } from '@/types/mock-interview';
import { MockDifficulty, MockSeniority } from '@/types/mock-interview';

const DIFFICULTIES: { value: MockDifficulty; label: string; description: string }[] = [
  {
    value: MockDifficulty.Easy,
    label: 'Warm-up',
    description: 'Straightforward questions, one clear ask each.',
  },
  {
    value: MockDifficulty.Standard,
    label: 'Standard',
    description: 'What an ordinary interviewer would actually ask.',
  },
  {
    value: MockDifficulty.Hard,
    label: 'Hard',
    description: 'Probing questions on trade-offs and edge cases.',
  },
];

const SENIORITIES: { value: MockSeniority; label: string }[] = [
  { value: MockSeniority.Junior, label: 'Junior' },
  { value: MockSeniority.Mid, label: 'Mid-level' },
  { value: MockSeniority.Senior, label: 'Senior' },
  { value: MockSeniority.Staff, label: 'Staff+' },
];

const QUESTION_COUNTS = [3, 5, 8, 12] as const;

interface SetupScreenProps {
  onStart: (setup: MockInterviewSetup) => Promise<void>;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const { appState } = useAppState();
  const { config } = useConfigStore();
  const { openConfigurationDialog } = useConfigurationDialog();
  const { devices: audioInputDevices, ready: audioDevicesReady } = useAudioInputDevices();

  const [role, setRole] = useState('');
  const [seniority, setSeniority] = useState<MockSeniority>(MockSeniority.Mid);
  const [difficulty, setDifficulty] = useState<MockDifficulty>(MockDifficulty.Standard);
  const [questionCount, setQuestionCount] = useState(8);
  const [starting, setStarting] = useState(false);
  const [headphoneNoticeOpen, setHeadphoneNoticeOpen] = useState(false);

  const language = config?.language;
  const languageOption = getLanguageOption(language);

  const selectedAudioInputDeviceName = config?.audioInputDeviceName ?? '';
  const noAudioInputDevices = audioDevicesReady && audioInputDevices.length === 0;
  const audioInputDeviceNotFound =
    audioDevicesReady &&
    audioInputDevices.length > 0 &&
    selectedAudioInputDeviceName !== '' &&
    !audioInputDevices.some((d) => d.name === selectedAudioInputDeviceName);

  const checkCanStart = (): boolean => {
    if (!appState?.interviewConfigLoaded) {
      toast.error('Could not load your saved configuration. Reconnecting - try again in a moment.');
      void getElectron()?.account?.refresh();
      return false;
    }
    if (!appState?.interviewConfig?.fullName) {
      toast.error('Full name is not set');
      openConfigurationDialog();
      return false;
    }
    if (!appState?.interviewConfig?.hasProfileData) {
      toast.error('Profile data is not set');
      openConfigurationDialog();
      return false;
    }
    if (noAudioInputDevices) {
      toast.error('No microphone was detected. Connect one and try again.');
      return false;
    }
    if (audioInputDeviceNotFound) {
      toast.error(`Audio input device "${selectedAudioInputDeviceName}" is not found`);
      return false;
    }
    if (!role.trim()) {
      toast.error('Enter the role you are practicing for');
      return false;
    }
    return true;
  };

  const startAfterNotice = async () => {
    setStarting(true);
    try {
      await onStart({
        role: role.trim(),
        seniority,
        difficulty,
        question_count: questionCount,
      });
    } catch (error) {
      console.error('Failed to start mock interview:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start the mock interview');
    } finally {
      setStarting(false);
    }
  };

  const handleStartClick = () => {
    if (!checkCanStart()) return;
    setHeadphoneNoticeOpen(true);
  };

  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          {/* CardTitle renders a <div>, not a heading, and has no `asChild` to promote it - this
              route otherwise has no landmark a screen reader's heading navigation can land on, so
              this carries CardTitle's own classes directly on a real <h1>. */}
          <h1 className="leading-none font-semibold text-xl">Mock interview</h1>
          <CardDescription>
            The AI asks, you answer out loud. Nothing is saved unless you export it.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="mock-role">Role</Label>
            <Input
              id="mock-role"
              name="role"
              autoComplete="organization-title"
              placeholder="e.g. Backend Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {/* A Radix Select trigger is a button, not a form control, so htmlFor does not
                  reach it. id + aria-labelledby is what associates the two - see llm-group.tsx. */}
              <Label id="mock-seniority-label">Seniority</Label>
              <Select value={seniority} onValueChange={(v) => setSeniority(v as MockSeniority)}>
                <SelectTrigger aria-labelledby="mock-seniority-label" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SENIORITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label id="mock-question-count-label">Questions</Label>
              <Select
                value={String(questionCount)}
                onValueChange={(v) => setQuestionCount(Number(v))}
              >
                <SelectTrigger aria-labelledby="mock-question-count-label" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_COUNTS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} questions, about {Math.round(n * 2.5)} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {/* No htmlFor: this labels the group via aria-labelledby below, not one control. */}
            <Label id="mock-difficulty-label">Difficulty</Label>
            <RadioGroup
              aria-labelledby="mock-difficulty-label"
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as MockDifficulty)}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {DIFFICULTIES.map((d) => (
                <label
                  key={d.value}
                  className="flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm has-data-[state=checked]:border-primary"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <RadioGroupItem value={d.value} />
                    {d.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{d.description}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span>{languageOption.nativeName}</span>
                <span className="text-muted-foreground">({languageOption.name})</span>
              </div>
              <Badge variant={languageOption.hasVoice ? 'secondary' : 'outline'}>
                {languageOption.hasVoice ? 'Voice' : 'Text only'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Change the interview language from the main screen&apos;s language picker.
            </p>
            {!languageOption.hasVoice && (
              <Alert>
                <AlertDescription>
                  The interviewer will write its questions instead of speaking them. You still
                  answer out loud, and the scoring is the same.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button onClick={handleStartClick} disabled={starting}>
            {starting ? 'Starting…' : 'Start mock interview'}
          </Button>
        </CardFooter>
      </Card>

      <HeadphoneNoticeDialog
        open={headphoneNoticeOpen}
        onOpenChange={setHeadphoneNoticeOpen}
        onProceed={() => void startAfterNotice()}
        variant="mock"
      />
    </div>
  );
}
