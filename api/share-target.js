/**
 * Server-side Web Share Target handler (Vercel Edge).
 * Android share launches POST /share-target before the service worker can intercept,
 * so static hosting returns HTTP 405. This endpoint parses the share payload and
 * returns a bridge HTML page that merges into IndexedDB then opens Report Bug.
 */

export const config = {
  runtime: "edge",
};

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB — Vercel edge/serverless body limit
const SERVERLESS_SAFE_BYTES = 2 * 1024 * 1024;
const DB_NAME = "bugricer-share-target";
const DB_STORE = "pending";
const DB_KEY = "current";

function uint8ToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function dedupeFiles(files) {
  const seen = new Set();
  const result = [];
  for (const file of files) {
    const key = `${file.name}:${file.lastModified}:${file.base64.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(file);
  }
  return result;
}

async function extractPayload(formData) {
  const title = String(formData.get("title") || "");
  const text = String(formData.get("text") || "");
  const url = String(formData.get("url") || "");
  const files = [];
  const mediaEntries = formData.getAll("media");

  for (let i = 0; i < mediaEntries.length; i += 1) {
    const entry = mediaEntries[i];
    if (!entry || typeof entry.arrayBuffer !== "function") {
      continue;
    }
    const buffer = await entry.arrayBuffer();
    if (buffer.byteLength > MAX_FILE_BYTES) {
      continue;
    }
    const bytes = new Uint8Array(buffer);
    files.push({
      name: entry.name || `shared-${i + 1}`,
      type: entry.type || "application/octet-stream",
      lastModified: entry.lastModified || Date.now(),
      base64: uint8ToBase64(bytes),
    });
  }

  return { title, text, url, files };
}

function buildBridgeHtml(incoming, origin) {
  const safeJson = JSON.stringify(incoming)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Opening BugRicer…</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
    p { font-size: 1rem; }
  </style>
</head>
<body>
  <p>Importing shared content…</p>
  <script>
    (async function () {
      const incoming = ${safeJson};

      function dedupeStored(files) {
        const seen = new Set();
        const out = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const key = f.name + ':' + f.lastModified + ':' + (f.buffer ? f.buffer.byteLength : 0);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(f);
        }
        return out;
      }

      const incomingFiles = (incoming.files || []).map(function (f) {
        const binary = atob(f.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return {
          name: f.name,
          type: f.type,
          lastModified: f.lastModified,
          buffer: bytes.buffer,
        };
      });

      const existing = await new Promise(function (resolve) {
        const req = indexedDB.open("${DB_NAME}", 1);
        req.onupgradeneeded = function () {
          const db = req.result;
          if (!db.objectStoreNames.contains("${DB_STORE}")) {
            db.createObjectStore("${DB_STORE}");
          }
        };
        req.onsuccess = function () {
          const db = req.result;
          const tx = db.transaction("${DB_STORE}", "readonly");
          const getReq = tx.objectStore("${DB_STORE}").get("${DB_KEY}");
          getReq.onsuccess = function () {
            db.close();
            resolve(getReq.result || null);
          };
          getReq.onerror = function () {
            db.close();
            resolve(null);
          };
        };
        req.onerror = function () { resolve(null); };
      });

      const textParts = [];
      if (existing && existing.text) textParts.push(String(existing.text).trim());
      if (incoming.text) textParts.push(String(incoming.text).trim());

      const payload = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),
        title: (incoming.title || (existing && existing.title) || '').trim(),
        text: textParts.filter(Boolean).join('\\n\\n'),
        url: (incoming.url || (existing && existing.url) || '').trim(),
        files: dedupeStored([].concat(existing && existing.files ? existing.files : [], incomingFiles)),
        createdAt: Date.now(),
      };

      await new Promise(function (resolve, reject) {
        const req = indexedDB.open("${DB_NAME}", 1);
        req.onupgradeneeded = function () {
          const db = req.result;
          if (!db.objectStoreNames.contains("${DB_STORE}")) {
            db.createObjectStore("${DB_STORE}");
          }
        };
        req.onsuccess = function () {
          const db = req.result;
          const tx = db.transaction("${DB_STORE}", "readwrite");
          tx.objectStore("${DB_STORE}").put(payload, "${DB_KEY}");
          tx.oncomplete = function () { db.close(); resolve(); };
          tx.onerror = function () { reject(tx.error); };
        };
        req.onerror = function () { reject(req.error); };
      });

      location.replace("${origin}/bugs/new?shared=1&sid=" + encodeURIComponent(payload.id));
    })().catch(function () {
      location.replace("${origin}/bugs/new?shared=1");
    });
  </script>
</body>
</html>`;
}

export default async function handler(request) {
  const url = new URL(request.url);
  const origin = url.origin;

  if (request.method === "GET") {
    return Response.redirect(`${origin}/bugs/new?shared=1`, 302);
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > SERVERLESS_SAFE_BYTES) {
    return Response.redirect(`${origin}/bugs/new?shareErr=large`, 303);
  }

  try {
    const formData = await request.formData();
    const incoming = await extractPayload(formData);
    const html = buildBridgeHtml(incoming, origin);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.redirect(`${origin}/bugs/new?shared=1`, 303);
  }
}
