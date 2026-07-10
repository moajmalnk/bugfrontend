import { cn } from '@/lib/utils';
import type { User, UserRole } from '@/types';

/** Core BugRicer team roles — treated as full-fledged / verified accounts. */
const FULL_FLEDGED_ROLES: ReadonlySet<string> = new Set([
  'admin',
  'developer',
  'tester',
]);

export function isFullFledgedUser(
  user?: Pick<User, 'role' | 'account_active'> | { role?: string | null; account_active?: number | null } | null
): boolean {
  if (!user) return false;
  if (user.account_active != null && Number(user.account_active) === 0) return false;
  const role = String(user.role || '').toLowerCase() as UserRole | string;
  return FULL_FLEDGED_ROLES.has(role);
}

type VerifiedBlueTickProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
};

const SIZE_CLASS = {
  sm: 'h-3.5 w-3.5',
  md: 'h-[1.125rem] w-[1.125rem]',
  lg: 'h-5 w-5 sm:h-6 sm:w-6',
} as const;

/**
 * WhatsApp / Instagram style verified blue tick.
 */
export function VerifiedBlueTick({
  className,
  size = 'md',
  title = 'Verified · Full-fledged BugRicer team member',
}: VerifiedBlueTickProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center align-middle',
        SIZE_CLASS[size],
        className
      )}
      title={title}
      aria-label={title}
      role="img"
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
        <path
          d="M10.1 15.9 6.7 12.5l1.4-1.4 2 2 5.1-5.1 1.4 1.4-6.5 6.5z"
          fill="#fff"
        />
      </svg>
    </span>
  );
}
