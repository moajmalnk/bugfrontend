import { UserAvatar } from '@/components/users/UserAvatar';
import { cn } from '@/lib/utils';
import type { Project, ProjectMemberDetail } from '@/lib/utils/projectUtils';
import { Code2, Crown, FlaskConical, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

export type ProjectTeamMember = {
  id: string;
  username: string;
  avatar?: string | null;
};

export function getProjectTeamMembers(project: Project) {
  const members = project.members_detail || [];
  const toMember = (m: ProjectMemberDetail): ProjectTeamMember => ({
    id: m.user_id,
    username: m.username || m.email || 'Unknown',
    avatar: m.avatar ?? null,
  });

  return {
    leads: members.filter((m) => m.role === 'manager').map(toMember),
    developers: members.filter((m) => m.role === 'developer').map(toMember),
    testers: members.filter((m) => m.role === 'tester').map(toMember),
  };
}

function MemberPill({ member }: { member: ProjectTeamMember }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 max-w-full min-w-0 rounded-lg border border-border/50 bg-background/80 px-1.5 py-1 shadow-sm"
      title={member.username}
    >
      <UserAvatar
        name={member.username}
        avatar={member.avatar}
        size="sm"
        alt={`${member.username} profile photo`}
      />
      <span className="text-[11px] sm:text-xs font-medium text-foreground truncate max-w-[6.5rem] sm:max-w-[8rem]">
        {member.username}
      </span>
    </div>
  );
}

function TeamRoleRow({
  label,
  icon: Icon,
  members,
  emptyLabel,
  accentClass,
}: {
  label: string;
  icon: LucideIcon;
  members: ProjectTeamMember[];
  emptyLabel: string;
  accentClass: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={cn('p-1 rounded-md shrink-0 text-white', accentClass)}>
          <Icon className="h-3 w-3" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
        {members.length === 0 ? (
          <span className="text-[11px] text-muted-foreground italic">{emptyLabel}</span>
        ) : (
          members.map((member) => <MemberPill key={member.id} member={member} />)
        )}
      </div>
    </div>
  );
}

interface ComplianceProjectTeamProps {
  project: Project;
  className?: string;
  /** compact = table cell; comfortable = mobile card */
  density?: 'compact' | 'comfortable';
}

export function ComplianceProjectTeam({
  project,
  className,
  density = 'compact',
}: ComplianceProjectTeamProps) {
  const team = useMemo(() => getProjectTeamMembers(project), [project]);

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-muted/10 min-w-0',
        density === 'compact'
          ? 'p-2.5 space-y-2.5'
          : 'p-3 sm:p-4 space-y-3 sm:grid sm:grid-cols-1 md:grid-cols-3 sm:gap-3 sm:space-y-0',
        className
      )}
    >
      <TeamRoleRow
        label="Project lead"
        icon={Crown}
        members={team.leads}
        emptyLabel="No lead assigned"
        accentClass="bg-gradient-to-br from-blue-500 to-indigo-600"
      />
      <TeamRoleRow
        label="Developers"
        icon={Code2}
        members={team.developers}
        emptyLabel="No developers assigned"
        accentClass="bg-gradient-to-br from-emerald-500 to-teal-600"
      />
      <TeamRoleRow
        label="Testers"
        icon={FlaskConical}
        members={team.testers}
        emptyLabel="No testers assigned"
        accentClass="bg-gradient-to-br from-purple-500 to-violet-600"
      />
    </div>
  );
}
