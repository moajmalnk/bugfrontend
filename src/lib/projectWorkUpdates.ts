export type StatusOption = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

export type ProjectWorkUpdate = {
  project_id: string;
  status: StatusOption;
  progress_percentage: number;
  notes: string;
  project_name?: string;
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
};

export function projectWorkStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return STATUS_LABELS[status] || String(status).replace(/_/g, ' ');
}

export function parseProjectUpdatesFromRow(raw: unknown): ProjectWorkUpdate[] {
  if (!raw) return [];
  let items: unknown = raw;
  if (typeof raw === 'string') {
    try {
      items = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const projectId = String(row.project_id || '').trim();
      if (!projectId) return null;
      const status = String(row.status || 'in_progress') as StatusOption;
      return {
        project_id: projectId,
        project_name: row.project_name ? String(row.project_name) : undefined,
        status,
        progress_percentage: Math.max(0, Math.min(100, Number(row.progress_percentage) || 0)),
        notes: String(row.notes || '').trim(),
      } satisfies ProjectWorkUpdate;
    })
    .filter(Boolean) as ProjectWorkUpdate[];
}

export function projectUpdatesToPayload(
  updates: Record<string, ProjectWorkUpdate>
): ProjectWorkUpdate[] {
  return Object.values(updates)
    .filter((u) => u.project_id)
    .map((u) => ({
      project_id: u.project_id,
      status: u.status,
      progress_percentage: Math.max(0, Math.min(100, Number(u.progress_percentage) || 0)),
      notes: (u.notes || '').trim(),
    }));
}

export function formatProjectUpdatesForText(
  updates: ProjectWorkUpdate[],
  projectNameById?: Record<string, string>
): string {
  if (!updates.length) return '';
  return updates
    .map((u) => {
      const name = u.project_name || projectNameById?.[u.project_id] || u.project_id;
      const lines = [
        `📁 ${name}`,
        `   Status: ${projectWorkStatusLabel(u.status)}`,
        `   Progress: ${u.progress_percentage}%`,
      ];
      if (u.notes) lines.push(`   Notes: ${u.notes}`);
      return lines.join('\n');
    })
    .join('\n\n');
}
