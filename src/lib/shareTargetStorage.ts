/** IndexedDB schema shared with service-worker.js for Web Share Target payloads. */

export const SHARE_TARGET_DB_NAME = "bugricer-share-target";
export const SHARE_TARGET_DB_VERSION = 1;
export const SHARE_TARGET_STORE = "pending";
export const SHARE_TARGET_KEY = "current";
export const MAX_SHARE_FILE_BYTES = 25 * 1024 * 1024;

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

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_TARGET_STORE, "readwrite");
    const store = tx.objectStore(SHARE_TARGET_STORE);
    const request = store.delete(key);
    request.onerror = () => reject(request.error ?? new Error("IDB delete failed"));
    request.onsuccess = () => resolve();
  });
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
