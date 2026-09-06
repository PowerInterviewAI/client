import { AlertTriangle, Loader } from 'lucide-react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInterviewLanguage } from '@/hooks/use-interview-language';
import { type Language, LANGUAGES } from '@/types/language';

/**
 * The interview language, on the configuration page and in the first-run wizard.
 *
 * Both names are shown, endonym first: someone looking for their own language recognises
 * "Deutsch" before "German", and the English name is there for anyone who has not found theirs
 * in the list yet. Same reasoning as `LanguageOption`'s two name fields.
 *
 * Carries the switching and reconnect-failed states from `useInterviewLanguage` rather than
 * dropping them, because this control is reachable mid-session: changing the language there tears
 * the ASR sockets down and re-opens them, and a reconnect that fails leaves transcription on the
 * old language while this picker shows the new one.
 */
export function LanguageField() {
  const { language, switching, reconnectFailed, setLanguage } = useInterviewLanguage();

  return (
    <div className="space-y-2">
      <Label id="language-field-label">Interview language</Label>
      <div className="flex items-center gap-2">
        <Select
          value={language}
          disabled={switching}
          onValueChange={(v) => void setLanguage(v as Language)}
        >
          <SelectTrigger aria-labelledby="language-field-label" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.nativeName}
                <span className="text-muted-foreground"> ({option.name})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {switching && (
          <Loader
            className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {reconnectFailed ? (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>
            Suggestions switched language, but transcription is still reconnecting. Stop and start
            the assistant if it does not come back.
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          What is transcribed, and what your suggestions come back in.
        </p>
      )}
    </div>
  );
}
