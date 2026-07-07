import { MalayalamBadge } from '@/components/ui/DateDisplay';
import { useMalayalamToggle } from '@/hooks/useMalayalamToggle';
import { formatLocalDate } from '@/lib/utils/dateUtils';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, User } from 'lucide-react';

interface ComplianceCheckRowProps {
  title: string;
  subtitle?: string;
  description: string;
  verified: boolean;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  disabled?: boolean;
  onToggle?: () => void;
}

function TranslatableField({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const { displayText, toggle, loading, showMalayalam } = useMalayalamToggle(text);

  if (!text.trim()) return null;

  return (
    <div className={cn('flex items-start gap-2 min-w-0', className)}>
      <p className="min-w-0 flex-1 break-words">{loading ? '…' : displayText}</p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        disabled={loading}
        className="inline-flex shrink-0 items-center rounded-sm transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
        title={showMalayalam ? `Show ${label} in English` : `മലയാളത്തിൽ ${label} കാണിക്കുക`}
        aria-label={showMalayalam ? `Show ${label} in English` : `Show ${label} in Malayalam`}
      >
        <MalayalamBadge />
      </button>
    </div>
  );
}

export function ComplianceCheckRow({
  title,
  subtitle,
  description,
  verified,
  verifiedAt,
  verifiedBy,
  disabled = false,
  onToggle,
}: ComplianceCheckRowProps) {
  const canToggle = !disabled && !!onToggle;

  const handleCardClick = () => {
    if (canToggle) onToggle?.();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (!canToggle) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle?.();
    }
  };

  return (
    <div
      role={canToggle ? 'button' : undefined}
      tabIndex={canToggle ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={
        canToggle
          ? verified
            ? `Unverify: ${title}`
            : `Verify: ${title}`
          : undefined
      }
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border p-4 sm:p-5 text-left transition-all duration-300',
        'border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm',
        verified &&
          'border-emerald-300/60 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20',
        canToggle &&
          'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300/50 dark:hover:border-blue-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
        disabled && 'cursor-not-allowed opacity-70'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40 dark:from-blue-950/10 dark:via-transparent dark:to-emerald-950/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200',
            verified
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-400'
          )}
          aria-hidden
        >
          {verified ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-current" />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <TranslatableField
            text={title}
            label="title"
            className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white"
          />
          {subtitle && (
            <TranslatableField
              text={subtitle}
              label="subtitle"
              className="text-xs font-medium text-gray-500 dark:text-gray-400"
            />
          )}
          <TranslatableField
            text={description}
            label="description"
            className="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
          />
          {verified && (verifiedBy || verifiedAt) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/30 text-xs text-emerald-700 dark:text-emerald-300">
              {verifiedBy && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Verified by <span className="font-semibold">{verifiedBy}</span>
                  </span>
                </span>
              )}
              {verifiedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <time dateTime={verifiedAt}>{formatLocalDate(verifiedAt, 'datetime')}</time>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
