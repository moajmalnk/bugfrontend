import { DocumentPreviewBody } from '@/components/attachments/DocumentPreviewBody';
import { Button } from '@/components/ui/button';
import { buildAttachmentUrl } from '@/lib/attachmentUtils';
import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const DocumentPreviewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'admin';

  const filePath = searchParams.get('path') || '';
  const fileName = searchParams.get('name') || 'Document';
  const returnTo = searchParams.get('return') || `/${role}/projects`;

  if (!filePath) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-muted-foreground">No document was specified.</p>
          <Button asChild variant="outline">
            <Link to={returnTo}>Go back</Link>
          </Button>
        </div>
      </main>
    );
  }

  const url = buildAttachmentUrl(filePath, fileName);

  const download = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-6">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50/40 via-transparent to-indigo-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-indigo-950/15" />
          <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={() => navigate(returnTo)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
                    {fileName}
                  </h1>
                  <p className="text-sm text-muted-foreground">Document preview</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in new tab
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={download}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 dark:border-gray-800/60 dark:bg-gray-900/80">
          <DocumentPreviewBody url={url} fileName={fileName} />
        </div>
      </section>
    </main>
  );
};

export default DocumentPreviewPage;
