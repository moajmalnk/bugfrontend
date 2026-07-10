import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CodoAckUser, CodoCommonRule } from '@/services/codoRulesService';
import {
  BarChart3,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Code2,
  FolderKanban,
  MinusCircle,
  ShieldCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';

const PHASE_LABEL: Record<string, string> = {
  developer: 'Developer',
  tester: 'Tester / QA',
  project: 'Project',
};

function formatWhen(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.includes('T') ? value : value.replace(' ', 'T');
  const d = parseISO(raw);
  const date = isValid(d) ? d : new Date(value);
  if (!isValid(date)) return null;
  return format(date, 'MMM d, yyyy · h:mm a');
}

function initials(username: string): string {
  const parts = username.replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase() || '?';
}

function MiniUser({ user, tone }: { user: CodoAckUser; tone: string }) {
  const when = formatWhen(user.acknowledged_at);
  return (
    <li className="flex items-center gap-2 py-1">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className={cn('text-[9px] font-semibold', tone)}>
          {initials(user.username)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{user.username}</p>
        {when ? <p className="text-[10px] text-muted-foreground">{when}</p> : null}
      </div>
    </li>
  );
}

type Props = {
  rules: CodoCommonRule[];
  canViewDetails: boolean;
  search?: string;
};

export function CodoAnalyticsPanel({ rules, canViewDetails, search = '' }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.rule_key.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.subtitle || '').toLowerCase().includes(q)
    );
  }, [rules, search]);

  const stats = useMemo(() => {
    let required = 0;
    let acknowledged = 0;
    let doubt = 0;
    let notRequired = 0;
    let pending = 0;
    const byPhase = {
      developer: { rules: 0, required: 0, responded: 0, pending: 0 },
      tester: { rules: 0, required: 0, responded: 0, pending: 0 },
      project: { rules: 0, required: 0, responded: 0, pending: 0 },
    };

    for (const r of filteredRules) {
      const a = r.acknowledgements;
      const phase = r.phase as keyof typeof byPhase;
      if (byPhase[phase]) byPhase[phase].rules += 1;
      if (!a || a.required_total <= 0) continue;
      required += a.required_total;
      acknowledged += a.acknowledged_count || 0;
      doubt += a.doubt_count ?? a.doubt?.length ?? 0;
      notRequired += a.not_required_count ?? a.not_required?.length ?? 0;
      pending += a.pending_count || 0;
      if (byPhase[phase]) {
        byPhase[phase].required += a.required_total;
        byPhase[phase].responded += a.responded_count ?? a.acknowledged_count ?? 0;
        byPhase[phase].pending += a.pending_count || 0;
      }
    }

    const responded = acknowledged + doubt + notRequired;
    const pct = required > 0 ? Math.round((responded / required) * 100) : 0;
    return {
      required,
      acknowledged,
      doubt,
      notRequired,
      pending,
      responded,
      pct,
      byPhase,
      ruleCount: filteredRules.length,
    };
  }, [filteredRules]);

  const summaryCards = [
    {
      label: 'Rules',
      value: stats.ruleCount,
      icon: ClipboardCheck,
      className: 'from-cyan-500 to-blue-600',
      chip: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200',
    },
    {
      label: 'Responded',
      value: `${stats.responded}/${stats.required || 0}`,
      icon: Users,
      className: 'from-emerald-500 to-teal-600',
      chip: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200',
    },
    {
      label: 'Acknowledged',
      value: stats.acknowledged,
      icon: CheckCircle2,
      className: 'from-blue-500 to-indigo-600',
      chip: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
    },
    {
      label: 'Doubt',
      value: stats.doubt,
      icon: CircleHelp,
      className: 'from-amber-500 to-orange-600',
      chip: 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200',
    },
    {
      label: 'Not required',
      value: stats.notRequired,
      icon: MinusCircle,
      className: 'from-slate-500 to-slate-700',
      chip: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: UserX,
      className: 'from-rose-500 to-red-600',
      chip: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200',
    },
  ];

  const phaseCards = [
    { key: 'developer' as const, label: 'Developer', icon: Code2, accent: 'text-blue-600 dark:text-blue-300' },
    { key: 'tester' as const, label: 'Tester / QA', icon: ShieldCheck, accent: 'text-amber-600 dark:text-amber-300' },
    { key: 'project' as const, label: 'Project', icon: FolderKanban, accent: 'text-violet-600 dark:text-violet-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">CODO Analytics</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Response overview across all rules
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/80 dark:bg-cyan-950/30 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
              Completion
            </span>
            <span className="text-2xl font-bold tabular-nums text-cyan-800 dark:text-cyan-200">
              {stats.pct}%
            </span>
          </div>
        </div>

        <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
            style={{ width: `${stats.pct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/40 p-3.5"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('p-1.5 rounded-lg bg-gradient-to-br text-white', card.className)}>
                  <card.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {card.label}
                </span>
              </div>
              <p className={cn('text-xl font-bold tabular-nums', card.chip.split(' ').slice(-2).join(' '))}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {phaseCards.map((p) => {
          const s = stats.byPhase[p.key];
          const pct = s.required > 0 ? Math.round((s.responded / s.required) * 100) : 0;
          return (
            <div
              key={p.key}
              className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <p.icon className={cn('h-4 w-4', p.accent)} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{p.label}</h3>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {s.rules} rules
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {s.responded}/{s.required} responded · {s.pending} pending · {pct}%
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white">Rule response details</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canViewDetails
              ? 'Expand a rule to see who acknowledged, marked doubt, not required, or is still pending.'
              : 'Per-rule response totals. Name lists are visible to admins only.'}
          </p>
        </div>

        {filteredRules.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No rules match your search.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            {filteredRules.map((rule) => {
              const a = rule.acknowledgements;
              const required = a?.required_total ?? 0;
              const responded = a?.responded_count ?? a?.acknowledged_count ?? 0;
              const pct = required > 0 ? Math.round((responded / required) * 100) : 0;
              const open = expandedId === rule.id;
              return (
                <li key={rule.id} className="px-4 sm:px-5 py-3.5">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() =>
                      setExpandedId((id) => (id === rule.id ? null : rule.id))
                    }
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {rule.title}
                          </p>
                          <span className="text-[10px] font-semibold uppercase tracking-wide rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                            {PHASE_LABEL[rule.phase] || rule.phase}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                          {rule.rule_key}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 sm:w-56">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              pct === 100 ? 'bg-emerald-500' : 'bg-cyan-500'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-16 text-right">
                          {responded}/{required}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
                      <span className="text-emerald-700 dark:text-emerald-300">
                        Ack {a?.acknowledged_count ?? 0}
                      </span>
                      <span className="text-amber-700 dark:text-amber-300">
                        Doubt {a?.doubt_count ?? a?.doubt?.length ?? 0}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        N/R {a?.not_required_count ?? a?.not_required?.length ?? 0}
                      </span>
                      <span className="text-rose-700 dark:text-rose-300">
                        Pending {a?.pending_count ?? 0}
                      </span>
                    </div>
                  </button>

                  {open && canViewDetails && a ? (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                      {(
                        [
                          {
                            title: 'Acknowledged',
                            users: a.acknowledged || [],
                            tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                            header: 'text-emerald-700 dark:text-emerald-300',
                          },
                          {
                            title: 'Doubt',
                            users: a.doubt || [],
                            tone: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
                            header: 'text-amber-700 dark:text-amber-300',
                          },
                          {
                            title: 'Not required',
                            users: a.not_required || [],
                            tone: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
                            header: 'text-slate-600 dark:text-slate-300',
                          },
                          {
                            title: 'Pending',
                            users: a.pending || [],
                            tone: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                            header: 'text-rose-700 dark:text-rose-300',
                          },
                        ] as const
                      ).map((col) => (
                        <div key={col.title} className="min-w-0">
                          <p
                            className={cn(
                              'text-[11px] font-semibold uppercase tracking-wide mb-1.5',
                              col.header
                            )}
                          >
                            {col.title} ({col.users.length})
                          </p>
                          {col.users.length === 0 ? (
                            <p className="text-xs text-muted-foreground">None</p>
                          ) : (
                            <ul className="max-h-40 overflow-y-auto">
                              {col.users.map((u) => (
                                <MiniUser key={u.id} user={u} tone={col.tone} />
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {open && !canViewDetails ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ask an admin to view who responded on each rule.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function computeAnalyticsCompletion(rules: CodoCommonRule[]): number {
  let required = 0;
  let responded = 0;
  for (const r of rules) {
    const a = r.acknowledgements;
    if (!a || a.required_total <= 0) continue;
    required += a.required_total;
    responded += a.responded_count ?? a.acknowledged_count ?? 0;
  }
  return required > 0 ? Math.round((responded / required) * 100) : 0;
}
