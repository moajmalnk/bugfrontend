import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { documentPreviewKind } from '@/lib/attachmentUtils';

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

export function DocumentPreviewBody({ url, fileName }: { url: string; fileName: string }) {
  const kind = documentPreviewKind(fileName);

  if (kind === 'pdf') {
    return (
      <iframe
        title={fileName}
        src={`${url}#navpanes=0`}
        className="min-h-[calc(100vh-12rem)] w-full border-0 bg-background"
      />
    );
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
