import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/DatePicker';
import { toast } from '@/components/ui/use-toast';
import {
  CreativeMediaPreview,
  creativeMediaKind,
  resolveCreativeMediaUrl,
} from '@/components/creative/CreativeMediaPreview';
import { cn } from '@/lib/utils';
import type {
  CreativeAsset,
  CreativeAssetPayload,
  CreativeMaterialType,
  CreativePlatform,
  CreativeReviewStatus,
  CreativeSource,
  CreativeStatus,
} from '@/services/creativeService';
import {
  CREATIVE_MATERIALS,
  CREATIVE_PLATFORMS,
  createCreativeAsset,
  getCreativeAsset,
  reviewCreativeAsset,
  updateCreativeAsset,
  uploadCreativeFile,
} from '@/services/creativeService';
import {
  Calendar,
  ExternalLink,
  FolderOpen,
  Loader2,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const INITIAL = {
  title: '',
  material_type: 'Poster' as CreativeMaterialType,
  platform: 'Insta' as CreativePlatform,
  hook_content: '',
  asset_source: 'link' as CreativeSource,
  drive_link: '',
  uploaded_file_path: '',
  preview_thumbnail_url: '',
  project_id: '',
  scheduled_date: '',
  published_date: '',
};

type FormState = typeof INITIAL;
type ModalMode = 'view' | 'edit';

type ProjectOption = { id: string; name: string };

type Props = {
  open: boolean;
  assetId?: string | null;
  canManage: boolean;
  canReview: boolean;
  canCreate: boolean;
  /** Current user id — used to allow owner delete on Draft / In Review. */
  viewerUserId?: string | null;
  projects: ProjectOption[];
  onClose: () => void;
  onSaved: (asset: CreativeAsset) => void;
  onRequestDelete?: (asset: CreativeAsset) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

/** Why: Creators may edit their own assets in every workflow tab / status. */
const OWNER_EDITABLE_STATUSES: CreativeStatus[] = [
  'Draft',
  'In Review',
  'Completed',
  'Published',
  'Rejected',
];

const OWNER_DELETABLE_STATUSES: CreativeStatus[] = ['Draft', 'In Review'];

const STATUS_PILL: Record<CreativeStatus, string> = {
  Draft:
    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  'In Review':
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Completed:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  Published:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  Rejected:
    'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AssetFormModal({
  open,
  assetId,
  canManage,
  canReview,
  canCreate,
  viewerUserId,
  projects,
  onClose,
  onSaved,
  onRequestDelete,
  onDirtyChange,
}: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [baseline, setBaseline] = useState<FormState>(INITIAL);
  const [asset, setAsset] = useState<CreativeAsset | null>(null);
  const [mode, setMode] = useState<ModalMode>('view');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<CreativeReviewStatus>('Approved');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const isNew = !assetId || assetId === 'new';
  const dirty = mode === 'edit' && JSON.stringify(form) !== JSON.stringify(baseline);
  const isOwner =
    isNew ||
    (!!asset &&
      !!viewerUserId &&
      String(asset.creator_id) === String(viewerUserId));
  const locked =
    !!asset &&
    !OWNER_EDITABLE_STATUSES.includes(asset.status) &&
    !canManage;
  const canEdit =
    canManage || (canCreate && isOwner && (isNew || !locked));
  const ownerCanDelete =
    !!asset &&
    isOwner &&
    canCreate &&
    OWNER_DELETABLE_STATUSES.includes(asset.status);
  const showDelete =
    !isNew && !!asset && !!onRequestDelete && (canManage || ownerCanDelete);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL);
      setBaseline(INITIAL);
      setAsset(null);
      setMode('view');
      setReviewComments('');
      setReviewStatus('Approved');
      setUnsavedOpen(false);
      return;
    }

    if (isNew) {
      setForm(INITIAL);
      setBaseline(INITIAL);
      setAsset(null);
      setMode('edit');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMode('view');
    getCreativeAsset(assetId)
      .then((row) => {
        if (cancelled) return;
        const next: FormState = {
          title: row.title || '',
          material_type: row.material_type || 'Poster',
          platform: row.platform || 'Insta',
          hook_content: row.hook_content || '',
          asset_source: row.asset_source === 'upload' ? 'upload' : 'link',
          drive_link: row.drive_link || '',
          uploaded_file_path: row.uploaded_file_path || '',
          preview_thumbnail_url: row.preview_thumbnail_url || '',
          project_id: row.project_id || '',
          scheduled_date: row.scheduled_date || '',
          published_date: row.published_date || '',
        };
        setAsset(row);
        setForm(next);
        setBaseline(next);
      })
      .catch((err: Error) => {
        toast({ title: 'Could not load asset', description: err.message, variant: 'destructive' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, assetId, isNew]);

  const titleError = form.title.trim() ? '' : 'Title is required';
  const linkError =
    form.asset_source === 'link' && form.drive_link.trim() && !/^https?:\/\//i.test(form.drive_link)
      ? 'Link must start with http:// or https://'
      : '';
  const isValid = !titleError && !linkError;

  const requestClose = () => {
    if (dirty) {
      setUnsavedOpen(true);
      return;
    }
    onClose();
  };

  const startEdit = () => {
    if (!canEdit) return;
    setMode('edit');
  };

  const cancelEdit = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setForm(baseline);
    setMode(isNew ? 'edit' : 'view');
    if (isNew) onClose();
  };

  const buildPayload = (extra: Partial<CreativeAssetPayload> = {}): CreativeAssetPayload => ({
    title: form.title.trim().slice(0, 255),
    material_type: form.material_type,
    platform: form.platform,
    hook_content: form.hook_content.trim().slice(0, 2000) || null,
    asset_source: form.asset_source,
    drive_link: form.drive_link.trim() || null,
    uploaded_file_path: form.uploaded_file_path || null,
    preview_thumbnail_url: form.preview_thumbnail_url || null,
    project_id: form.project_id || null,
    scheduled_date: form.scheduled_date || null,
    published_date: form.published_date || null,
    ...extra,
  });

  const handleSave = async (submit = false) => {
    if (!isValid || saving || !canCreate) return;
    setSaving(true);
    try {
      const payload = buildPayload({ submit });
      const saved = isNew
        ? await createCreativeAsset(payload)
        : await updateCreativeAsset({ ...payload, id: assetId as string });
      setBaseline(form);
      setAsset(saved);
      onSaved(saved);
      toast({ title: submit ? 'Submitted for review' : 'Asset saved' });
      if (isNew || submit) {
        onClose();
      } else {
        setMode('view');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save asset';
      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const uploaded = await uploadCreativeFile(file);
      setForm((prev) => ({
        ...prev,
        asset_source: 'upload',
        uploaded_file_path: uploaded.file_path || '',
        preview_thumbnail_url: uploaded.preview_thumbnail_url || '',
      }));
      toast({ title: 'File uploaded' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not upload file';
      toast({
        title: 'Upload failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReview = async () => {
    if (!asset || reviewing) return;
    setReviewing(true);
    const prev = asset;
    try {
      const saved = await reviewCreativeAsset({
        asset_id: asset.id,
        status: reviewStatus,
        comments: reviewComments.trim() || null,
      });
      setAsset(saved);
      onSaved(saved);
      toast({ title: 'Review saved' });
      setMode('view');
    } catch (err: unknown) {
      onSaved(prev);
      const message = err instanceof Error ? err.message : 'Could not save review';
      toast({
        title: 'Review not saved',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setReviewing(false);
    }
  };

  const handlePublish = async () => {
    if (!asset || saving) return;
    setSaving(true);
    try {
      const saved = await updateCreativeAsset({
        ...buildPayload({ publish: true, published_date: form.published_date || undefined }),
        id: asset.id,
      });
      setAsset(saved);
      onSaved(saved);
      toast({ title: 'Asset published' });
      setMode('view');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not publish';
      toast({
        title: 'Publish failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const projectName =
    asset?.project_name ||
    projects.find((p) => p.id === (asset?.project_id || form.project_id))?.name ||
    null;
  const mediaPath = form.uploaded_file_path || form.preview_thumbnail_url;
  const mediaKind = creativeMediaKind(mediaPath);
  const fileUrl = resolveCreativeMediaUrl(mediaPath);
  const linkUrl = form.drive_link.trim();

  const reviewPanel =
    canReview && asset && asset.status === 'In Review' ? (
      <div className="col-span-12 space-y-3 rounded-xl border p-4">
        <p className="font-medium">Review</p>
        <Select
          value={reviewStatus}
          onValueChange={(v) => setReviewStatus(v as CreativeReviewStatus)}
        >
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Changes Requested">Changes requested</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          maxLength={4000}
          value={reviewComments ?? ''}
          onChange={(e) => setReviewComments(e.target.value.slice(0, 4000))}
          className="min-h-[80px] rounded-xl"
          placeholder="Comments for the creator"
        />
        <Button
          type="button"
          className="rounded-xl"
          disabled={reviewing}
          onClick={() => void handleReview()}
        >
          {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save review'}
        </Button>
      </div>
    ) : null;

  const detailView = (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 overflow-hidden rounded-2xl border bg-muted/30 lg:col-span-7">
        <div className="aspect-video w-full min-h-[220px]">
          {mediaPath || linkUrl ? (
            mediaPath ? (
              <CreativeMediaPreview
                path={form.preview_thumbnail_url}
                fallbackPath={form.uploaded_file_path}
                alt={form.title || 'Creative preview'}
                className="h-full min-h-[220px]"
                controls
              />
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
                <ExternalLink className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">External link asset</p>
                <Button asChild className="rounded-xl" variant="secondary">
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                    Open link
                  </a>
                </Button>
              </div>
            )
          ) : (
            <CreativeMediaPreview className="h-full min-h-[220px]" alt="No media" />
          )}
        </div>
        {fileUrl && mediaKind !== 'image' && mediaKind !== 'video' ? (
          <div className="border-t p-3">
            <Button asChild variant="outline" className="h-10 w-full rounded-xl">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open {mediaKind === 'pdf' ? 'PDF' : 'file'}
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="col-span-12 flex flex-col gap-4 lg:col-span-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {asset?.status ? (
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  STATUS_PILL[asset.status]
                )}
              >
                {asset.status}
              </span>
            ) : null}
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">
              {form.material_type}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">
              {form.platform}
            </span>
          </div>
          <h2 className="text-xl font-bold leading-tight sm:text-2xl">
            {form.title || 'Untitled asset'}
          </h2>
          {form.hook_content ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {form.hook_content}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No hook / copy yet.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border p-4 text-sm">
          <div className="flex items-start gap-2 min-w-0">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Creator</p>
              <p className="truncate font-medium">{asset?.creator_name || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Project</p>
              <p className="truncate font-medium">{projectName || 'No project'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Scheduled</p>
              <p className="font-medium">{formatDate(form.scheduled_date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Published</p>
              <p className="font-medium">{formatDate(form.published_date)}</p>
            </div>
          </div>
          {linkUrl ? (
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Drive / link</p>
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{linkUrl}</span>
              </a>
            </div>
          ) : null}
          {form.uploaded_file_path ? (
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Uploaded file</p>
              <p className="truncate font-medium">
                {form.uploaded_file_path.split('/').pop()}
              </p>
            </div>
          ) : null}
        </div>

        {asset?.admin_feedback ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="font-medium">Admin feedback</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {asset.admin_feedback}
            </p>
          </div>
        ) : null}

        {reviewPanel}

        {asset?.reviews?.length ? (
          <div className="space-y-2">
            <p className="font-medium">Review history</p>
            <div className="flex flex-col gap-2">
              {asset.reviews.map((rev) => (
                <div key={rev.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">
                    {rev.status} · {rev.reviewer_name || 'Reviewer'}
                  </p>
                  {rev.comments ? (
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {rev.comments}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const editView = (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Label htmlFor="creative-title">Title</Label>
        <Input
          id="creative-title"
          maxLength={255}
          value={form.title ?? ''}
          disabled={locked}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value.slice(0, 255) }))}
          className="mt-1 h-11 rounded-xl"
        />
        {titleError ? <p className="mt-1 text-xs text-red-500">{titleError}</p> : null}
      </div>

      <div className="col-span-12 md:col-span-6">
        <Label>Material type</Label>
        <Select
          value={form.material_type}
          disabled={locked}
          onValueChange={(v) =>
            setForm((p) => ({ ...p, material_type: v as CreativeMaterialType }))
          }
        >
          <SelectTrigger className="mt-1 h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREATIVE_MATERIALS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-12 md:col-span-6">
        <Label>Platform</Label>
        <Select
          value={form.platform}
          disabled={locked}
          onValueChange={(v) =>
            setForm((p) => ({ ...p, platform: v as CreativePlatform }))
          }
        >
          <SelectTrigger className="mt-1 h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREATIVE_PLATFORMS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-12">
        <Label htmlFor="creative-hook">Hook / copy</Label>
        <Textarea
          id="creative-hook"
          maxLength={2000}
          value={form.hook_content ?? ''}
          disabled={locked}
          onChange={(e) =>
            setForm((p) => ({ ...p, hook_content: e.target.value.slice(0, 2000) }))
          }
          className="mt-1 min-h-[90px] rounded-xl"
        />
      </div>

      <div className="col-span-12">
        <Label>Project</Label>
        <Select
          value={form.project_id || 'none'}
          disabled={locked}
          onValueChange={(v) =>
            setForm((p) => ({ ...p, project_id: v === 'none' ? '' : v }))
          }
        >
          <SelectTrigger className="mt-1 h-11 rounded-xl">
            <SelectValue placeholder="Optional project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No project</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-12 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={form.asset_source === 'link' ? 'default' : 'outline'}
          className="rounded-xl"
          disabled={locked}
          onClick={() => setForm((p) => ({ ...p, asset_source: 'link' }))}
        >
          Drive / link
        </Button>
        <Button
          type="button"
          variant={form.asset_source === 'upload' ? 'default' : 'outline'}
          className="rounded-xl"
          disabled={locked}
          onClick={() => setForm((p) => ({ ...p, asset_source: 'upload' }))}
        >
          Upload
        </Button>
      </div>

      {form.asset_source === 'link' ? (
        <div className="col-span-12">
          <Label htmlFor="creative-link">Asset link</Label>
          <Input
            id="creative-link"
            value={form.drive_link ?? ''}
            disabled={locked}
            onChange={(e) => setForm((p) => ({ ...p, drive_link: e.target.value }))}
            className="mt-1 h-11 rounded-xl"
            placeholder="https://drive.google.com/..."
          />
          {linkError ? <p className="mt-1 text-xs text-red-500">{linkError}</p> : null}
        </div>
      ) : (
        <div className="col-span-12">
          <Label htmlFor="creative-file">Upload file</Label>
          <Input
            id="creative-file"
            type="file"
            disabled={locked || uploading}
            accept=".webp,.jpg,.jpeg,.png,.gif,.pdf,.mp4,.zip"
            className="mt-1 h-11 rounded-xl"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = '';
            }}
          />
          {uploading ? (
            <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>
          ) : null}
        </div>
      )}

      {form.preview_thumbnail_url || form.uploaded_file_path ? (
        <div className="col-span-12">
          <CreativeMediaPreview
            path={form.preview_thumbnail_url}
            fallbackPath={form.uploaded_file_path}
            alt={form.title || 'Creative preview'}
            className="max-h-56 min-h-[12rem] rounded-xl"
            controls
          />
          {form.uploaded_file_path ? (
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {form.uploaded_file_path.split('/').pop()}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="col-span-12 md:col-span-6">
        <Label>Scheduled date</Label>
        <div className="mt-1">
          <DatePicker
            value={form.scheduled_date ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, scheduled_date: v ?? '' }))}
          />
        </div>
      </div>
      <div className="col-span-12 md:col-span-6">
        <Label>Published date</Label>
        <div className="mt-1">
          <DatePicker
            value={form.published_date ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, published_date: v ?? '' }))}
          />
        </div>
      </div>

      {reviewPanel}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent
          className={cn(
            'flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0',
            mode === 'view' || (canReview && asset)
              ? 'max-w-[950px]'
              : 'max-w-[600px]'
          )}
        >
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <DialogTitle>
              {isNew
                ? 'New creative asset'
                : mode === 'view'
                  ? form.title || 'Creative asset'
                  : 'Edit creative asset'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'view'
                ? 'Preview media, status, and review history.'
                : 'Track posters, reels, and mockups from draft through publish.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : mode === 'view' && !isNew ? (
              detailView
            ) : (
              editView
            )}
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-border/60 px-6 py-4 sm:flex-row sm:justify-end">
            {mode === 'view' && !isNew ? (
              <>
                {showDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
                    onClick={() => asset && onRequestDelete?.(asset)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={requestClose}
                >
                  Close
                </Button>
                {asset && (asset.status === 'Completed' || canManage) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl"
                    disabled={saving}
                    onClick={() => void handlePublish()}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button type="button" className="rounded-xl" onClick={startEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                {showDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
                    onClick={() => asset && onRequestDelete?.(asset)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={isNew ? requestClose : cancelEdit}
                >
                  {isNew ? 'Cancel' : 'Back to details'}
                </Button>
                {asset && (asset.status === 'Completed' || canManage) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl"
                    disabled={saving}
                    onClick={() => void handlePublish()}
                  >
                    Publish
                  </Button>
                ) : null}
                {!locked && canCreate ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-xl"
                      disabled={!isValid || saving}
                      onClick={() => void handleSave(false)}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save draft'
                      )}
                    </Button>
                    <Button
                      type="button"
                      className="rounded-xl"
                      disabled={!isValid || saving}
                      onClick={() => void handleSave(true)}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Submit for review'
                      )}
                    </Button>
                  </>
                ) : null}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Close anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={() => {
                setUnsavedOpen(false);
                onClose();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
