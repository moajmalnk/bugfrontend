import { MalayalamBadge } from '@/components/ui/DateDisplay';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { isSpeechPaused } from '@/lib/textToSpeech';
import { cn } from '@/lib/utils';
import { Loader2, Pause, Play, Square, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

function speechErrorMessage(lang: 'en' | 'ml', error: unknown): string {
  const code =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  if (lang === 'ml') {
    if (code === 'not_malayalam') {
      return 'Could not translate this text to Malayalam for voice playback.';
    }
    if (code === 'no_ml_voice' || code === 'tts_fetch_failed') {
      return 'Malayalam voice could not be played. Check your connection and try again.';
    }
    if (code === 'tts_unauthorized') {
      return 'Please sign in again to use Malayalam voice.';
    }
    return 'Malayalam voice could not be played. Try again in a moment.';
  }

  return 'English voice could not be played.';
}

interface MalayalamVoiceToolbarProps {
  englishText: string;
  showMalayalam: boolean;
  translating: boolean;
  onToggleMalayalam: () => void;
  getMalayalamText: () => Promise<string>;
  className?: string;
}

function VoiceLangButton({
  lang,
  label,
  activeClassName,
  title,
  ariaLabel,
  speakingLang,
  isPaused,
  loadingLang,
  disabled,
  onClick,
}: {
  lang: 'en' | 'ml';
  label: string;
  activeClassName: string;
  title: string;
  ariaLabel: string;
  speakingLang: 'en' | 'ml' | null;
  isPaused: boolean;
  loadingLang: 'en' | 'ml' | null;
  disabled: boolean;
  onClick: () => void;
}) {
  const isActive = speakingLang === lang;
  const isPlaying = isActive && !isPaused;
  const isPausedActive = isActive && isPaused;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold tracking-wide transition-colors',
        'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:opacity-50',
        isActive ? activeClassName : 'border-border bg-background text-muted-foreground'
      )}
      title={
        isPlaying
          ? `Pause ${title}`
          : isPausedActive
            ? `Resume ${title}`
            : title
      }
      aria-label={
        isPlaying
          ? `Pause ${ariaLabel}`
          : isPausedActive
            ? `Resume ${ariaLabel}`
            : ariaLabel
      }
    >
      {loadingLang === lang ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isPlaying ? (
        <Pause className="h-3 w-3" />
      ) : isPausedActive ? (
        <Play className="h-3 w-3" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}

export function MalayalamVoiceToolbar({
  englishText,
  showMalayalam,
  translating,
  onToggleMalayalam,
  getMalayalamText,
  className,
}: MalayalamVoiceToolbarProps) {
  const { speak, restart, stop, togglePause, speakingLang, isPaused, supported, isActive } =
    useTextToSpeech();
  const [loadingLang, setLoadingLang] = useState<'en' | 'ml' | null>(null);

  const handleLangClick = async (lang: 'en' | 'ml') => {
    if (!supported) {
      toast({
        title: 'Voice not supported',
        description: 'Your browser does not support text-to-speech.',
        variant: 'destructive',
      });
      return;
    }

    if (speakingLang === lang) {
      if (isPaused || isSpeechPaused()) {
        togglePause();
        return;
      }
      if (isActive()) {
        togglePause();
        return;
      }
      // Stuck UI – restart from the beginning
      setLoadingLang(lang);
      try {
        const text = lang === 'en' ? englishText : await getMalayalamText();
        await restart(text, lang);
      } catch (error) {
        toast({
          title: 'Could not read aloud',
          description: speechErrorMessage(lang, error),
          variant: 'destructive',
        });
      } finally {
        setLoadingLang(null);
      }
      return;
    }

    setLoadingLang(lang);
    try {
      const text = lang === 'en' ? englishText : await getMalayalamText();
      await speak(text, lang);
    } catch (error) {
      toast({
        title: 'Could not read aloud',
        description: speechErrorMessage(lang, error),
        variant: 'destructive',
      });
    } finally {
      setLoadingLang(null);
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <VoiceLangButton
        lang="en"
        label="EN"
        activeClassName="border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        title="Listen in English"
        ariaLabel="Listen in English"
        speakingLang={speakingLang}
        isPaused={isPaused}
        loadingLang={loadingLang}
        disabled={!englishText.trim() || loadingLang !== null || translating}
        onClick={() => void handleLangClick('en')}
      />

      <VoiceLangButton
        lang="ml"
        label="മ"
        activeClassName="border-blue-500/50 bg-blue-500/15 text-blue-700 dark:text-blue-300"
        title="മലയാളത്തിൽ കേൾക്കുക"
        ariaLabel="Listen in Malayalam"
        speakingLang={speakingLang}
        isPaused={isPaused}
        loadingLang={loadingLang}
        disabled={!englishText.trim() || loadingLang !== null || translating}
        onClick={() => void handleLangClick('ml')}
      />

      {speakingLang && (
        <button
          type="button"
          onClick={stop}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors',
            'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
          )}
          title="Stop voice"
          aria-label="Stop voice playback"
        >
          <Square className="h-3 w-3 fill-current" />
        </button>
      )}

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
