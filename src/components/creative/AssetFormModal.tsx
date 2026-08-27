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
import { CreativeMediaPreview } from '@/components/creative/CreativeMediaPreview';
import { cn } from '@/lib/utils';
import type {
  CreativeAsset,
  CreativeAssetPayload,
  CreativeMaterialType,
  CreativePlatform,
  CreativeReviewStatus,
  CreativeSource,
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
import { Loader2 } from 'lucide-react';
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

type ProjectOption = { id: string; name: string };

type Props = {
  open: boolean;
  assetId?: string | null;
  canManage: boolean;
  canReview: boolean;
  canCreate: boolean;
  projects: ProjectOption[];
  onClose: () => void;
  onSaved: (asset: CreativeAsset) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function AssetFormModal({
  open,
  assetId,
  canManage,
  canReview,
  canCreate,
  projects,
  onClose,
  onSaved,
  onDirtyChange,
}: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [baseline, setBaseline] = useState<FormState>(INITIAL);
  const [asset, setAsset] = useState<CreativeAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<CreativeReviewStatus>('Approved');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const isNew = !assetId || assetId === 'new';
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL);
      setBaseline(INITIAL);
      setAsset(null);
      setReviewComments('');
      setReviewStatus('Approved');
      setUnsavedOpen(false);
      return;
    }

    if (isNew) {
      setForm(INITIAL);
      setBaseline(INITIAL);
      setAsset(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
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
  const locked = !!asset && !['Draft', 'Rejected'].includes(asset.status) && !canManage;

  const requestClose = () => {
    if (dirty) {
      setUnsavedOpen(true);
      return;
    }
    onClose();
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
      onSaved(saved);
      toast({ title: submit ? 'Submitted for review' : 'Asset saved' });
      onClose();
    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err?.message || 'Could not save asset',
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
        // Why: Videos/PDFs have no image thumbnail — clear stale image previews.
        preview_thumbnail_url: uploaded.preview_thumbnail_url || '',
      }));
      toast({ title: 'File uploaded' });
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Could not upload file',
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
      onSaved(saved);
      toast({ title: 'Review saved' });
      onClose();
    } catch (err: any) {
      onSaved(prev);
      toast({
        title: 'Review not saved',
        description: err?.message || 'Could not save review',
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
      onSaved(saved);
      toast({ title: 'Asset published' });
      onClose();
    } catch (err: any) {
      toast({
        title: 'Publish failed',
        description: err?.message || 'Could not publish',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent
          className={cn(
            'flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0',
            canReview && asset ? 'max-w-[950px]' : 'max-w-[600px]'
          )}
        >
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <DialogTitle>{isNew ? 'New creative asset' : 'Creative asset'}</DialogTitle>
            <DialogDescription>
              Track posters, reels, and mockups from draft through publish.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : (
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
                  {titleError && <p className="mt-1 text-xs text-red-500">{titleError}</p>}
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
                    {linkError && <p className="mt-1 text-xs text-red-500">{linkError}</p>}
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
                    {uploading && (
                      <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>
                    )}
                  </div>
                )}

                {(form.preview_thumbnail_url || form.uploaded_file_path) ? (
                  <div className="col-span-12">
                    <CreativeMediaPreview
                      path={form.preview_thumbnail_url}
                      fallbackPath={form.uploaded_file_path}
                      alt={form.title || 'Creative preview'}
                      className="max-h-56 min-h-[12rem] rounded-xl"
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
                      onChange={(v) =>
                        setForm((p) => ({ ...p, scheduled_date: v ?? '' }))
                      }
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <Label>Published date</Label>
                  <div className="mt-1">
                    <DatePicker
                      value={form.published_date ?? ''}
                      onChange={(v) =>
                        setForm((p) => ({ ...p, published_date: v ?? '' }))
                      }
                    />
                  </div>
                </div>

                {asset?.admin_feedback ? (
                  <div className="col-span-12 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                    <p className="font-medium">Admin feedback</p>
                    <p className="mt-1 text-muted-foreground">{asset.admin_feedback}</p>
                  </div>
                ) : null}

                {canReview && asset && asset.status === 'In Review' ? (
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
                ) : null}

                {asset?.reviews?.length ? (
                  <div className="col-span-12 space-y-2">
                    <p className="font-medium">Review history</p>
                    <div className="flex flex-col gap-2">
                      {asset.reviews.map((rev) => (
                        <div key={rev.id} className="rounded-xl border p-3 text-sm">
                          <p className="font-medium">
                            {rev.status} · {rev.reviewer_name || 'Reviewer'}
                          </p>
                          {rev.comments ? (
                            <p className="mt-1 text-muted-foreground">{rev.comments}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/60 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-xl" onClick={requestClose}>
              Cancel
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
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save draft'}
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={!isValid || saving}
                  onClick={() => void handleSave(true)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for review'}
                </Button>
              </>
            ) : null}
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
