/**
 * Why: App-wide ContextMenu lives outside BugCreative, but Move/Copy/Cut/Paste
 * for creatives belong to that page. This bridge lets BugCreative register live
 * handlers so the right-click menu can trigger the same organize actions.
 */

export type CreativeOrganizeBridge = {
  canOrganize: boolean;
  selectedCount: number;
  hasClipboard: boolean;
  busy: boolean;
  copy: (assetId?: string) => void;
  cut: (assetId?: string) => void;
  paste: () => void;
  /** Optional assetId from right-click target when selection is empty. */
  move: (assetId?: string) => void;
  /** If right-clicked asset is unselected, select it alone so Move works. */
  ensureContextTarget: (assetId: string) => void;
};

let bridge: CreativeOrganizeBridge | null = null;
const listeners = new Set<() => void>();

export function setCreativeOrganizeBridge(
  next: CreativeOrganizeBridge | null
): void {
  bridge = next;
  listeners.forEach((fn) => fn());
}

export function getCreativeOrganizeBridge(): CreativeOrganizeBridge | null {
  return bridge;
}

export function subscribeCreativeOrganizeBridge(
  listener: () => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
