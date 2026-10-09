import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodoContentLang } from '@/lib/codo/codoContentLang';
import { playbookChromeLang } from '@/lib/codo/codoContentLang';
import { CODO_TESTER_PLAYBOOK_UI, t } from '@/lib/codo/codoTesterPlaybook';

const OPTIONS: { key: CodoContentLang; en: string; ml: string }[] = [
  { key: 'en', en: 'English', ml: 'English' },
  { key: 'ml', en: 'Malayalam', ml: 'മലയാളം' },
  { key: 'both', en: 'Both', ml: 'രണ്ടും' },
];

type CodoLangToggleProps = {
  lang: CodoContentLang;
  onChange: (next: CodoContentLang) => void;
  className?: string;
};

export function CodoLangToggle({ lang, onChange, className }: CodoLangToggleProps) {
  const chrome = playbookChromeLang(lang);
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-2xl border border-border bg-background p-1',
        className
      )}
      role="group"
      aria-label={t(CODO_TESTER_PLAYBOOK_UI.langHint, chrome)}
    >
      <Languages className="ms-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {OPTIONS.map((opt) => {
        const selected = lang === opt.key;
        const label = chrome === 'ml' ? opt.ml : opt.en;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              'min-h-9 flex-1 rounded-xl px-3 text-xs font-semibold transition-colors sm:flex-none',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
            aria-pressed={selected}
            lang={opt.key === 'ml' ? 'ml' : 'en'}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
