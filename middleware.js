/**
 * Vercel Edge Middleware — runs before rewrites.
 * Large share payloads (PDFs) must be handled by the installed PWA service worker.
 * Sending them to the serverless bridge causes FUNCTION_PAYLOAD_TOO_LARGE (413).
 */

export const config = {
  matcher: "/share-target",
};

/** Stay under Vercel serverless ingress (~4.5MB); base64 in bridge adds overhead. */
const SERVERLESS_SAFE_BYTES = 2_000_000;

export default function middleware(request) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    return Response.redirect(`${url.origin}/bugs/new?shared=1`, 302);
  }

  if (request.method === "POST") {
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > SERVERLESS_SAFE_BYTES) {
      return Response.redirect(`${url.origin}/bugs/new?shareErr=large`, 303);
    }

    // Small payloads fall through to vercel.json rewrite → /api/share-target
    return;
  }

  return new Response("Method Not Allowed", { status: 405 });
}
