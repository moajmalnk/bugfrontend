import { normalizeYmdDateString } from "@/lib/dateUtils";
import type { PeriodDetailFilters } from "@/components/users/PeriodDetailsFilterBar";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsePlannedProjectIds(submission: Record<string, unknown>): string[] {
  const raw = submission.planned_projects;
  if (!raw) return [];

  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function buildProjectNameLookup(
  sources: Array<
    Record<string, string> | Map<string, string> | Array<{ id: string; name: string }> | null | undefined
  >
): Map<string, string> {
  const map = new Map<string, string>();

  const add = (id: string, name: string) => {
    const key = String(id).trim();
    const label = String(name).trim();
    if (!key || !label) return;
    map.set(key, label);
    map.set(key.toLowerCase(), label);
  };

  for (const source of sources) {
    if (!source) continue;
    if (source instanceof Map) {
      source.forEach((name, id) => add(String(id), String(name)));
      continue;
    }
    if (Array.isArray(source)) {
      source.forEach((project) => add(project.id, project.name));
      continue;
    }
    Object.entries(source).forEach(([id, name]) => add(id, name));
  }

  return map;
}

export function lookupProjectName(idOrName: string, projectNameById: Map<string, string>): string {
  const raw = String(idOrName).trim();
  if (!raw) return raw;

  const direct = projectNameById.get(raw) ?? projectNameById.get(raw.toLowerCase());
  if (direct) return direct;

  if (!UUID_RE.test(raw)) return raw;
  return raw;
}

export function resolveSubmissionProjectNames(
  submission: Record<string, unknown>,
  projectNameById: Map<string, string>
): string[] {
  const ids = parsePlannedProjectIds(submission);
  const sourceIds = ids.length > 0 ? ids : [];

  if (sourceIds.length === 0) {
    const fromApi = submission.project_names;
    if (Array.isArray(fromApi) && fromApi.length > 0) {
      sourceIds.push(...fromApi.map((name) => String(name).trim()).filter(Boolean));
    }
  }

  const names = sourceIds
    .map((id) => lookupProjectName(id, projectNameById))
    .filter((name) => name && !UUID_RE.test(name));

  return [...new Set(names)];
}

export function enrichSubmission(
  submission: Record<string, any>,
  projectNameById: Map<string, string>
) {
  return {
    ...submission,
    project_names: resolveSubmissionProjectNames(submission, projectNameById),
  };
}

export function submissionMatchesFilters(
  submission: Record<string, any>,
  filters: PeriodDetailFilters,
  projectNameById: Map<string, string>
): boolean {
  const enriched = enrichSubmission(submission, projectNameById);
  const day = normalizeYmdDateString(submission.date ?? submission.submission_date);

  if (filters.userId !== "all" && String(submission.user_id ?? "") !== filters.userId) {
    return false;
  }
  if (filters.day !== "all" && day !== filters.day) return false;
  if (
    filters.role !== "all" &&
    String(submission.role ?? "").toLowerCase() !== filters.role.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.project !== "all" &&
    !enriched.project_names.some((name) => name === filters.project)
  ) {
    return false;
  }

  const q = filters.search.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    submission.username,
    submission.role,
    day,
    ...enriched.project_names,
    submission.completed_tasks,
    submission.pending_tasks,
    submission.ongoing_tasks,
    submission.upcoming_tasks,
    submission.notes,
    submission.planned_work,
    submission.planned_work_notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function taskMatchesFilteredSubmissions(
  item: { date?: string; task?: string; username?: string },
  filteredSubmissions: Array<Record<string, any>>,
  viewScope: "user" | "team",
  searchQuery: string
): boolean {
  const day = normalizeYmdDateString(item.date);
  const q = searchQuery.trim().toLowerCase();

  if (q && String(item.task ?? "").toLowerCase().includes(q)) return true;

  return filteredSubmissions.some((submission) => {
    const sDay = normalizeYmdDateString(submission.date ?? submission.submission_date);
    if (sDay !== day) return false;
    if (viewScope === "team" && item.username && submission.username !== item.username) {
      return false;
    }
    return true;
  });
}

export function noteMatchesFilteredSubmissions(
  item: { date?: string; note?: string; username?: string },
  filteredSubmissions: Array<Record<string, any>>,
  viewScope: "user" | "team",
  searchQuery: string
): boolean {
  const day = normalizeYmdDateString(item.date);
  const q = searchQuery.trim().toLowerCase();

  if (q && String(item.note ?? "").toLowerCase().includes(q)) return true;

  return filteredSubmissions.some((submission) => {
    const sDay = normalizeYmdDateString(submission.date ?? submission.submission_date);
    if (sDay !== day) return false;
    if (viewScope === "team" && item.username && submission.username !== item.username) {
      return false;
    }
    return true;
  });
}
