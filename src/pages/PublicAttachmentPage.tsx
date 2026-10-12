import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENV } from "@/lib/env";
import {
  buildCursorAttachmentPrompt,
  copyShareText,
  publicAttachmentMediaUrl,
  publicAttachmentPreviewUrl,
  type AttachmentShareKind,
} from "@/lib/attachmentShare";

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      fileName: string;
      kind: AttachmentShareKind;
      size: number;
    };

function isKind(value: unknown): value is AttachmentShareKind {
  return (
    value === "image" ||
    value === "video" ||
    value === "audio" ||
    value === "pdf" ||
    value === "text" ||
    value === "file"
  );
}

function PreviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 w-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="aspect-video w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function MediaPreview({
  kind,
  fileName,
  mediaUrl,
}: {
  kind: AttachmentShareKind;
  fileName: string;
  mediaUrl: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [textFailed, setTextFailed] = useState(false);

  useEffect(() => {
    if (kind !== "text") return;
    const controller = new AbortController();
    setText(null);
    setTextFailed(false);
    void fetch(mediaUrl, { credentials: "omit", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("bad response");
        return response.text();
      })
      .then((value) => setText(value.slice(0, 100_000)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTextFailed(true);
      });
    return () => controller.abort();
  }, [kind, mediaUrl]);

  if (kind === "image") {
    return (
      <img
        src={mediaUrl}
        alt={fileName}
        className="max-h-[70vh] w-full rounded-2xl bg-black/80 object-contain"
      />
    );
  }

  if (kind === "video") {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        src={mediaUrl}
        className="max-h-[70vh] w-full rounded-2xl bg-black"
      >
        Your browser cannot play this video.
      </video>
    );
  }

  if (kind === "audio") {
    return (
      <audio controls preload="metadata" src={mediaUrl} className="w-full rounded-xl">
        Your browser cannot play this audio.
      </audio>
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        title={fileName}
        src={mediaUrl}
        className="h-[70vh] w-full rounded-2xl border bg-background"
      />
    );
  }

  if (kind === "text") {
    if (textFailed) {
      return (
        <p className="text-sm text-muted-foreground">
          Open the file to read it.
        </p>
      );
    }
    if (text === null) {
      return <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />;
    }
    return (
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-2xl border bg-muted/40 p-4 text-xs sm:text-sm">
        {text}
      </pre>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      This file opens in a new tab or downloads.
    </p>
  );
}

export default function PublicAttachmentPage() {
  const { token: rawToken = "" } = useParams<{ token: string }>();
  const token = rawToken.toLowerCase();
  const tokenValid = /^[a-f0-9]{32,64}$/.test(token);
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [copied, setCopied] = useState<"preview" | "cursor" | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Shared preview · BugRicer";
    let robots = document.querySelector('meta[name="robots"]');
    const created = !robots;
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    const previousRobots = robots.getAttribute("content");
    robots.setAttribute("content", "noindex, nofollow");
    return () => {
      document.title = previousTitle;
      if (created && robots) {
        robots.remove();
      } else if (robots) {
        if (previousRobots) robots.setAttribute("content", previousRobots);
        else robots.removeAttribute("content");
      }
    };
  }, []);

  useEffect(() => {
    if (!tokenValid) {
      setState({ status: "error", message: "This preview link is unavailable." });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    const url = `${ENV.API_URL.replace(/\/$/, "")}/public/attachment.php?token=${encodeURIComponent(token)}`;

    void fetch(url, {
      credentials: "omit",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          success?: boolean;
          message?: string;
          data?: { file_name?: string; kind?: string; size?: number };
        } | null;
        if (!response.ok || !body?.success || !body.data) {
          throw new Error(body?.message || "Preview link not found");
        }
        const kind = isKind(body.data.kind) ? body.data.kind : "file";
        setState({
          status: "ready",
          fileName: body.data.file_name || "attachment",
          kind,
          size: Number(body.data.size) || 0,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message =
          error instanceof Error && error.message
            ? error.message
            : "This preview link is unavailable.";
        setState({ status: "error", message });
      });

    return () => controller.abort();
  }, [token, tokenValid]);

  const mediaUrl = publicAttachmentMediaUrl(token);
  const previewUrl = publicAttachmentPreviewUrl(token);
  const fileName = state.status === "ready" ? state.fileName : "attachment";
  const cursorPrompt = buildCursorAttachmentPrompt({
    fileName,
    previewUrl,
    mediaUrl,
  });

  const copy = async (kind: "preview" | "cursor") => {
    try {
      await copyShareText(kind === "preview" ? previewUrl : cursorPrompt);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">BugRicer</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Shared preview
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Anyone with this link can preview the file. Copy it into Cursor to refer
          to the recording while fixing the bug.
        </p>

        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
          {state.status === "loading" && <PreviewSkeleton />}

          {state.status === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {state.message}
            </div>
          )}

          {state.status === "ready" && (
            <div className="space-y-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-medium text-slate-900 dark:text-white">
                  {state.fileName}
                </h2>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {state.kind}
                </p>
              </div>
              <MediaPreview kind={state.kind} fileName={state.fileName} mediaUrl={mediaUrl} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void copy("preview")}
                >
                  {copied === "preview" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied === "preview" ? "Link copied" : "Copy preview link"}
                </Button>
                <Button type="button" className="rounded-xl" onClick={() => void copy("cursor")}>
                  {copied === "cursor" ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copied === "cursor" ? "Cursor note copied" : "Copy for Cursor"}
                </Button>
                <Button type="button" variant="secondary" className="rounded-xl" asChild>
                  <a href={publicAttachmentMediaUrl(token, true)}>Download</a>
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
