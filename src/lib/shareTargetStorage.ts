/** IndexedDB schema shared with service-worker.js for Web Share Target payloads. */

export const SHARE_TARGET_DB_NAME = "bugricer-share-target";
export const SHARE_TARGET_DB_VERSION = 1;
export const SHARE_TARGET_STORE = "pending";
export const SHARE_TARGET_KEY = "current";
export const MAX_SHARE_FILE_BYTES = 25 * 1024 * 1024;
export const SHARE_IMPORTED_FILES_KEY = "bugricer_share_imported_file_keys";

export interface StoredShareFile {
  name: string;
  type: string;
  lastModified: number;
  buffer: ArrayBuffer;
}

export interface SharePayload {
  id: string;
  title: string;
  text: string;
  url: string;
  files: StoredShareFile[];
  createdAt: number;
}

export interface RoutedShareContent {
  screenshots: File[];
  attachments: File[];
  title?: string;
  description?: string;
}

function openShareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_TARGET_DB_NAME, SHARE_TARGET_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open share DB"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHARE_TARGET_STORE)) {
        db.createObjectStore(SHARE_TARGET_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_TARGET_STORE, "readonly");
    const store = tx.objectStore(SHARE_TARGET_STORE);
    const request = store.get(key);
    request.onerror = () => reject(request.error ?? new Error("IDB get failed"));
    request.onsuccess = () => resolve(request.result as T | undefined);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_TARGET_STORE, "readwrite");
    const store = tx.objectStore(SHARE_TARGET_STORE);
    const request = store.put(value, key);
    request.onerror = () => reject(request.error ?? new Error("IDB put failed"));
    request.onsuccess = () => resolve();
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_TARGET_STORE, "readwrite");
    const store = tx.objectStore(SHARE_TARGET_STORE);
    const request = store.delete(key);
    request.onerror = () => reject(request.error ?? new Error("IDB delete failed"));
    request.onsuccess = () => resolve();
  });
}

export function storedFileKey(file: Pick<StoredShareFile, "name" | "lastModified" | "buffer">): string {
  return `${file.name}:${file.lastModified}:${file.buffer.byteLength}`;
}

export function fileImportKey(file: Pick<File, "name" | "lastModified" | "size">): string {
  return `${file.name}:${file.lastModified}:${file.size}`;
}

function getImportedFileKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SHARE_IMPORTED_FILES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markFilesImported(keys: string[]): void {
  if (keys.length === 0) return;
  const merged = getImportedFileKeys();
  keys.forEach((key) => merged.add(key));
  try {
    sessionStorage.setItem(SHARE_IMPORTED_FILES_KEY, JSON.stringify([...merged]));
  } catch {
    // ignore quota errors
  }
}

export function clearShareImportSession(): void {
  try {
    sessionStorage.removeItem(SHARE_IMPORTED_FILES_KEY);
  } catch {
    // ignore
  }
}

function dedupeStoredFiles(files: StoredShareFile[]): StoredShareFile[] {
  const seen = new Set<string>();
  const result: StoredShareFile[] = [];
  for (const file of files) {
    const key = storedFileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(file);
  }
  return result;
}

function storedFileToFile(stored: StoredShareFile): File {
  return new File([stored.buffer], stored.name, {
    type: stored.type || "application/octet-stream",
    lastModified: stored.lastModified || Date.now(),
  });
}

export function routeSharedContent(payload: SharePayload): RoutedShareContent {
  const screenshots: File[] = [];
  const attachments: File[] = [];

  for (const stored of payload.files) {
    if (stored.buffer.byteLength > MAX_SHARE_FILE_BYTES) {
      continue;
    }
    const file = storedFileToFile(stored);
    if (file.type.startsWith("image/")) {
      screenshots.push(file);
    } else {
      attachments.push(file);
    }
  }

  const descriptionParts: string[] = [];
  const trimmedText = (payload.text || "").trim();
  const trimmedUrl = (payload.url || "").trim();
  const trimmedTitle = (payload.title || "").trim();

  if (trimmedText) {
    descriptionParts.push(trimmedText);
  }
  if (trimmedUrl && trimmedUrl !== trimmedText) {
    descriptionParts.push(trimmedUrl);
  }

  const description =
    descriptionParts.length > 0 ? descriptionParts.join("\n\n") : undefined;

  return {
    screenshots,
    attachments,
    title: trimmedTitle || undefined,
    description,
  };
}

/** Return only share files that have not yet been imported into the form. */
export function getUnimportedShareContent(payload: SharePayload): RoutedShareContent & {
  importedKeys: string[];
} {
  const imported = getImportedFileKeys();
  const newStored: StoredShareFile[] = [];
  const importedKeys: string[] = [];

  for (const stored of payload.files) {
    const key = storedFileKey(stored);
    if (imported.has(key)) continue;
    newStored.push(stored);
    importedKeys.push(key);
  }

  const routed = routeSharedContent({ ...payload, files: newStored });
  return { ...routed, importedKeys };
}

export async function getPendingSharePayload(): Promise<SharePayload | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let db: IDBDatabase | null = null;
  try {
    db = await openShareDb();
    const payload = await idbGet<SharePayload>(db, SHARE_TARGET_KEY);
    if (!payload || !payload.id) {
      return null;
    }
    return payload;
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

/** Merge incoming share files into the pending queue instead of replacing. */
export async function mergePendingSharePayload(
  incoming: Pick<SharePayload, "title" | "text" | "url" | "files">
): Promise<string> {
  if (typeof indexedDB === "undefined") {
    return "";
  }

  let db: IDBDatabase | null = null;
  try {
    db = await openShareDb();
    const existing = await idbGet<SharePayload>(db, SHARE_TARGET_KEY);
    const mergedFiles = dedupeStoredFiles([...(existing?.files ?? []), ...incoming.files]);
    const textParts = [existing?.text, incoming.text].map((v) => (v || "").trim()).filter(Boolean);

    const payload: SharePayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: (incoming.title || existing?.title || "").trim(),
      text: textParts.join("\n\n"),
      url: (incoming.url || existing?.url || "").trim(),
      files: mergedFiles,
      createdAt: Date.now(),
    };

    await idbPut(db, SHARE_TARGET_KEY, payload);
    return payload.id;
  } finally {
    db?.close();
  }
}

export async function clearPendingSharePayload(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  let db: IDBDatabase | null = null;
  try {
    db = await openShareDb();
    await idbDelete(db, SHARE_TARGET_KEY);
  } catch {
    // ignore cleanup errors
  } finally {
    db?.close();
  }
}

export async function finalizeShareTargetSession(): Promise<void> {
  await clearPendingSharePayload();
  clearShareImportSession();
}
