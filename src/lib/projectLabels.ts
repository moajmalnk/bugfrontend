/**
 * Why: Sheet/doc project_id may be a UUID, comma-separated UUIDs, or sentinels
 * like "no-project". Cards must show human names — never raw IDs.
 */

const PROJECT_ID_SENTINELS = new Set([
  "",
  "no-project",
  "none",
  "null",
  "undefined",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProjectIdSentinel(value: string | null | undefined): boolean {
  if (value == null) return true;
  return PROJECT_ID_SENTINELS.has(value.trim().toLowerCase());
}

export function looksLikeProjectUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

type ProjectLike = { id: string; name: string };

/**
 * Resolve display labels for one or more project ids.
 * Prefers lookup map, then API project_name, never returns raw UUIDs.
 */
export function resolveProjectLabels(
  projectId: string | null | undefined,
  projects: ProjectLike[],
  projectName?: string | null
): string[] {
  const nameById = new Map(
    projects.map((p) => [String(p.id).trim().toLowerCase(), p.name] as const)
  );

  const apiNames = (projectName || "")
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n && !isProjectIdSentinel(n) && !looksLikeProjectUuid(n));

  if (isProjectIdSentinel(projectId)) {
    return apiNames;
  }

  const ids = String(projectId)
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id && !isProjectIdSentinel(id));

  if (ids.length === 0) {
    return apiNames;
  }

  return ids.map((id, index) => {
    const fromMap = nameById.get(id.toLowerCase());
    if (fromMap) return fromMap;

    if (apiNames[index]) return apiNames[index];

    if (ids.length === 1 && apiNames[0]) return apiNames[0];

    // Last resort — never show UUID in the UI
    return looksLikeProjectUuid(id) ? "Unknown project" : id;
  });
}
