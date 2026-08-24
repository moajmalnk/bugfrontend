import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { documentPreviewKind, fetchAttachmentBlob } from '@/lib/attachmentUtils';
import { Button } from '@/components/ui/button';

function DocumentTextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setFailed(false);

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('bad response');
        return response.text();
      })
      .then((value) => {
        if (!cancelled) setText(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Could not load a text preview. Use “Open in new tab” or Download.
      </p>
    );
  }

  if (text === null) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <pre className="m-3 max-h-[calc(100vh-12rem)] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-4 font-mono text-xs sm:text-sm">
      {text}
    </pre>
  );
}

/**
 * Why: Pointing an iframe at get_attachment.php makes mobile browsers show a
 * PHP filename stub instead of the PDF. Blob URLs keep application/pdf and
 * render (or open cleanly) on iOS/Android.
 */
function PdfPreview({ url, fileName }: { url: string; fileName: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setFailed(false);
    setLoading(true);

    void (async () => {
      try {
        const blob = await fetchAttachmentBlob(url);
        if (cancelled) return;
        const typed =
          blob.type && blob.type !== 'application/octet-stream'
            ? blob
            : new Blob([blob], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(typed);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-3 px-4 py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading PDF…</p>
      </div>
    );
  }

  if (failed || !blobUrl) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <FileText className="h-12 w-12 text-muted-foreground opacity-60" />
        <p className="max-w-sm text-sm text-muted-foreground">
          Could not preview this PDF here. Open it in a new tab.
        </p>
        <Button
          type="button"
          className="rounded-xl"
          onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open PDF
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-12rem)] w-full bg-background">
      {/* object/embed renders more reliably than iframe on mobile Safari */}
      <object
        data={`${blobUrl}#toolbar=1&navpanes=0`}
        type="application/pdf"
        aria-label={fileName}
        className="min-h-[calc(100vh-12rem)] w-full border-0"
      >
        <iframe
          title={fileName}
          src={`${blobUrl}#toolbar=1&navpanes=0`}
          className="min-h-[calc(100vh-12rem)] w-full border-0 bg-background"
        />
      </object>
    </div>
  );
}

export function DocumentPreviewBody({ url, fileName }: { url: string; fileName: string }) {
  const kind = documentPreviewKind(fileName);

  if (kind === 'pdf') {
    return <PdfPreview url={url} fileName={fileName} />;
  }

  if (kind === 'image') {
    return (
      <div className="flex justify-center p-3 sm:p-6">
        <img
          src={url}
          alt={fileName}
          className="max-h-[calc(100vh-12rem)] max-w-full rounded-md object-contain"
        />
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="flex justify-center p-3 sm:p-6">
        <video
          src={url}
          controls
          className="max-h-[calc(100vh-12rem)] max-w-full rounded-md bg-black"
        />
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="flex justify-center p-6">
        <audio src={url} controls className="w-full max-w-md" />
      </div>
    );
  }

  if (kind === 'text') {
    return <DocumentTextPreview url={url} />;
  }

  return (
    <div className="space-y-3 px-4 py-10 text-center">
      <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-60" />
      <p className="text-sm text-muted-foreground">
        No inline preview for this file type. Open in a new tab or download.
      </p>
    </div>
  );
}
