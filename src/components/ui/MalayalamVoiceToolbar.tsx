import { MalayalamBadge } from '@/components/ui/DateDisplay';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { cn } from '@/lib/utils';
import { Loader2, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

interface MalayalamVoiceToolbarProps {
  englishText: string;
  showMalayalam: boolean;
  translating: boolean;
  onToggleMalayalam: () => void;
  getMalayalamText: () => Promise<string>;
  className?: string;
}

export function MalayalamVoiceToolbar({
  englishText,
  showMalayalam,
  translating,
  onToggleMalayalam,
  getMalayalamText,
  className,
}: MalayalamVoiceToolbarProps) {
  const { speak, speakingLang, supported } = useTextToSpeech();
  const [loadingLang, setLoadingLang] = useState<'en' | 'ml' | null>(null);

  const handleSpeak = async (lang: 'en' | 'ml') => {
    if (!supported) {
      toast({
        title: 'Voice not supported',
        description: 'Your browser does not support text-to-speech.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingLang(lang);
    try {
      const text =
        lang === 'en' ? englishText : await getMalayalamText();
      await speak(text, lang);
    } catch {
      toast({
        title: 'Could not read aloud',
        description:
          lang === 'ml'
            ? 'Malayalam voice could not be loaded. Try again.'
            : 'English voice could not be played.',
        variant: 'destructive',
      });
    } finally {
      setLoadingLang(null);
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => void handleSpeak('en')}
        disabled={!englishText.trim() || loadingLang !== null || translating}
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold uppercase tracking-wide transition-colors',
          'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:opacity-50',
          speakingLang === 'en'
            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            : 'border-border bg-background text-muted-foreground'
        )}
        title="Listen in English"
        aria-label="Listen in English"
      >
        {loadingLang === 'en' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
        EN
      </button>

      <button
        type="button"
        onClick={() => void handleSpeak('ml')}
        disabled={!englishText.trim() || loadingLang !== null || translating}
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold tracking-wide transition-colors',
          'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:opacity-50',
          speakingLang === 'ml'
            ? 'border-blue-500/50 bg-blue-500/15 text-blue-700 dark:text-blue-300'
            : 'border-border bg-background text-muted-foreground'
        )}
        title="മലയാളത്തിൽ കേൾക്കുക"
        aria-label="Listen in Malayalam"
      >
        {loadingLang === 'ml' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
        മ
      </button>

      <button
        type="button"
        onClick={onToggleMalayalam}
        disabled={translating}
        className="inline-flex items-center rounded-sm transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
        title={showMalayalam ? 'Show in English' : 'മലയാളത്തിൽ കാണിക്കുക'}
        aria-label={showMalayalam ? 'Show in English' : 'Show in Malayalam'}
      >
        <MalayalamBadge />
      </button>
    </div>
  );
}
