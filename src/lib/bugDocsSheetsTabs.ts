/**
 * Why: My Docs/Sheets is the owner inventory; shared/all tabs are separate views.
 * Default tab + URL resolution must never send non-admins to the admin "all" tab.
 */
export function getDefaultDocsTab(isAdmin: boolean): string {
  return isAdmin ? 'all-docs' : 'my-docs';
}

export function getDefaultSheetsTab(isAdmin: boolean): string {
  return isAdmin ? 'all-sheets' : 'my-sheets';
}

export function resolveDocsTabFromUrl(urlTab: string | null, isAdmin: boolean): string {
  if (!urlTab) return getDefaultDocsTab(isAdmin);
  if (urlTab === 'all-docs' && !isAdmin) return getDefaultDocsTab(isAdmin);
  return urlTab;
}

export function resolveSheetsTabFromUrl(urlTab: string | null, isAdmin: boolean): string {
  if (!urlTab) return getDefaultSheetsTab(isAdmin);
  if (urlTab === 'all-sheets' && !isAdmin) return getDefaultSheetsTab(isAdmin);
  return urlTab;
}

export function isSharedDocsSheetsAudience(role: string): boolean {
  return role === 'developer' || role === 'tester' || role === 'creator';
}
