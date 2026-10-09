import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  ImagePlus,
  Link2,
  Loader2,
  Palette,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  generateBugCreativeCard,
  getPosterCopy,
  type BugDatesCalendarItem,
  type GrowthProgramSession,
} from '@/services/bugDatesService';
import { uploadCreativeFile } from '@/services/creativeService';
import { userService } from '@/services/userService';
import { notifyAdminNavCountsChanged } from '@/lib/navCountsEvents';
import { resolveAvatarUrl } from '@/lib/avatarUrl';
import type { User } from '@/types';
import { POSTER_PALETTES, type PosterPaletteKey } from './brand/brandKit';
import { PalettePicker } from './PalettePicker';
import { LogoStylePicker } from './LogoStylePicker';
import { normalizeLogoStyle } from './brand/logoStyles';
import { loadPosterFonts } from './brand/posterFonts';
import {
  buildPosterData,
  isRealPosterAvatar,
  posterDisplayName,
  POSTER_FIELD_LABELS,
  POSTER_FIELD_LIMITS,
} from './posterData';
import {
  exportPosterNode,
  imageBlobToPosterDataUrl,
  imageUrlToPosterDataUrl,
  posterFileName,
} from './posterExport';
import {
  getPreset,
  ORIGINAL_PRESET_ID,
  presetDisplayLabel,
  resolveRenderPlan,
  sameAspect,
} from './posterSizes';
import { PosterSizePicker } from './PosterSizePicker';
import { TemplatePicker } from './TemplatePicker';
import { DiscardChangesDialog } from './DiscardChangesDialog';
import { POSTER_TEMPLATE_COMPONENTS, POSTER_TEMPLATES, templatesForCategory } from './templates/templateRegistry';
import type { PosterData, PosterFieldKey, PosterSize, PosterTemplateKey } from './types';

type Props = {
  item: BugDatesCalendarItem;
  occurrenceDate: string;
  session: GrowthProgramSession | null;
  /** Stable key already in ?poster= — used to keep Back / share URLs correct. */
  posterKey?: string | null;
  onClose: () => void;
  onSaved: (assetId: string) => void;
};

type FontState = 'loading' | 'ready' | 'error';
type BusyState = null | 'ai' | 'save' | 'download' | 'image';

const MULTILINE_FIELDS: PosterFieldKey[] = ['quote', 'tagline', 'malayalamLine'];
const THUMB_WIDTH = 96;

/** Flip when poster AI copy is wired and stable again. */
const SHOW_AI_SUGGEST_COPY = false;

const CHECKERBOARD =
  'repeating-conic-gradient(#d1d5db 0% 25%, #f9fafb 0% 50%) 50% / 16px 16px';

function ScaledPoster({
  templateKey,
  data,
  paletteKey,
  layout,
  width,
  nodeRef,
}: {
  templateKey: PosterTemplateKey;
  data: PosterData;
  paletteKey: PosterPaletteKey;
  layout: PosterSize;
  width: number;
  nodeRef?: React.Ref<HTMLDivElement>;
}) {
  const Template = POSTER_TEMPLATE_COMPONENTS[templateKey];
  const scale = width / layout.width;
  return (
    <div style={{ width, height: layout.height * scale, position: 'relative', overflow: 'hidden' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
        <div ref={nodeRef} style={{ width: layout.width, height: layout.height }}>
          <Template data={data} palette={POSTER_PALETTES[paletteKey]} size={layout} />
        </div>
      </div>
    </div>
  );
}

/**
 * Preview of the final export: when the target ratio differs from the layout,
 * mirrors the export's blurred fill + centred poster so what you see is what you get.
 */
function PosterComposite({
  templateKey,
  data,
  paletteKey,
  layout,
  target,
  width,
  nodeRef,
}: {
  templateKey: PosterTemplateKey;
  data: PosterData;
  paletteKey: PosterPaletteKey;
  layout: PosterSize;
  target: { width: number; height: number };
  width: number;
  nodeRef: React.Ref<HTMLDivElement>;
}) {
  const height = (width * target.height) / target.width;
  const transparent = POSTER_PALETTES[paletteKey].background === 'transparent';
  if (sameAspect(layout, target)) {
    return (
      <div style={{ background: transparent ? CHECKERBOARD : undefined }}>
        <ScaledPoster
          templateKey={templateKey}
          data={data}
          paletteKey={paletteKey}
          layout={layout}
          width={width}
          nodeRef={nodeRef}
        />
      </div>
    );
  }
  const containScale = Math.min(width / layout.width, height / layout.height);
  const coverScale = Math.max(width / layout.width, height / layout.height);
  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: (width - layout.width * coverScale) / 2,
          top: (height - layout.height * coverScale) / 2,
          filter: 'blur(18px) brightness(0.88)',
          transform: 'scale(1.08)',
        }}
      >
        <ScaledPoster
          templateKey={templateKey}
          data={data}
          paletteKey={paletteKey}
          layout={layout}
          width={layout.width * coverScale}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: (width - layout.width * containScale) / 2,
          top: (height - layout.height * containScale) / 2,
        }}
      >
        <ScaledPoster
          templateKey={templateKey}
          data={data}
          paletteKey={paletteKey}
          layout={layout}
          width={layout.width * containScale}
          nodeRef={nodeRef}
        />
      </div>
    </div>
  );
}

/**
 * Poster Studio: renders CODO-branded templates from BugDates data, lets the creator
 * polish copy/imagery, then exports a flat image and attaches it to a BugCreative draft.
 */
export default function PosterStudioModal({
  item,
  occurrenceDate,
  session,
  posterKey = null,
  onClose,
  onSaved,
}: Props) {
  const category = String(item.layer || item.category || 'company_event');
  const templateOrder = useMemo(() => templatesForCategory(category), [category]);
  const initialData = useMemo(
    () => buildPosterData(item, session, occurrenceDate),
    [item, session, occurrenceDate]
  );

  const [templateKey, setTemplateKey] = useState<PosterTemplateKey>(templateOrder[0]);
  const [paletteKey, setPaletteKey] = useState<PosterPaletteKey>(POSTER_TEMPLATES[templateOrder[0]].defaultPalette);
  const [presetId, setPresetId] = useState<string>(ORIGINAL_PRESET_ID);
  const [data, setData] = useState<PosterData>(initialData);
  const [baseline, setBaseline] = useState<PosterData>(initialData);
  const [fontState, setFontState] = useState<FontState>('loading');
  const [busy, setBusy] = useState<BusyState>(null);
  const [aiError, setAiError] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewWidth, setPreviewWidth] = useState(0);
  const [teammates, setTeammates] = useState<User[]>([]);
  const [teammatesLoading, setTeammatesLoading] = useState(false);
  const [teammateQuery, setTeammateQuery] = useState('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(
    session?.host_user_id ?? null
  );

  const posterRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef<BusyState>(null);
  const skipConfirmRef = useRef(false);
  const savedRef = useRef(false);
  const heroLoadedRef = useRef(false);

  const def = POSTER_TEMPLATES[templateKey];
  const plan = resolveRenderPlan(def, presetId);
  const { layout, target } = plan;
  const preset = getPreset(presetId);
  const originalTarget = resolveRenderPlan(def, ORIGINAL_PRESET_ID).target;
  const suggestion =
    preset?.suggest &&
    (preset.suggest.template !== templateKey ||
      (preset.suggest.palette !== undefined && preset.suggest.palette !== paletteKey))
      ? preset.suggest
      : null;
  const isDirty = savedRef.current ? false : JSON.stringify(data) !== JSON.stringify(baseline);
  const requiredField = def.fields[0];
  const requiredError =
    requiredField && !data[requiredField].trim()
      ? `${def.fieldLabels?.[requiredField] ?? POSTER_FIELD_LABELS[requiredField]} is required`
      : '';
  const canExport = !requiredError && fontState !== 'loading' && busy === null;
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const confirmDiscardRef = useRef(confirmDiscard);
  confirmDiscardRef.current = confirmDiscard;

  const setBusyState = (next: BusyState) => {
    busyRef.current = next;
    setBusy(next);
  };

  /**
   * Prefill genuine BugRicer photos: birthday celebrant, or Growth Glimpse host.
   * Why: posters should start from the real teammate photo, not an empty slot.
   */
  useEffect(() => {
    if (heroLoadedRef.current) return;
    const avatar =
      category === 'birthday' ? item.avatar : session?.host_avatar ?? null;
    const label =
      category === 'birthday'
        ? item.username ?? 'User'
        : session?.host_name ?? 'Speaker';
    if (!isRealPosterAvatar(avatar)) return;
    const controller = new AbortController();
    imageUrlToPosterDataUrl(resolveAvatarUrl(avatar, label), controller.signal)
      .then((url) => {
        heroLoadedRef.current = true;
        setData((prev) => (prev.heroImage ? prev : { ...prev, heroImage: url }));
        setBaseline((prev) => ({ ...prev, heroImage: url }));
        if (session?.host_user_id) setSelectedSpeakerId(session.host_user_id);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setImageError('Profile photo could not be loaded — pick a teammate or upload a photo.');
        }
      });
    return () => controller.abort();
  }, [category, item.avatar, item.username, session?.host_avatar, session?.host_name, session?.host_user_id]);

  /** Active Developers, CODO Testers, and Creators only (poster speaker pick). */
  useEffect(() => {
    if (!def.usesHeroImage) return;
    let alive = true;
    setTeammatesLoading(true);
    userService
      .getStaffDirectory()
      .then((users) => {
        if (!alive) return;
        setTeammates(users);
        if (users.length === 0) {
          setImageError('No active developers, CODO testers, or creators found — upload a photo instead.');
        }
      })
      .catch(() => {
        if (alive) setImageError('Could not load teammates — upload a photo instead.');
      })
      .finally(() => {
        if (alive) setTeammatesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [def.usesHeroImage]);

  const filteredTeammates = useMemo(() => {
    const q = teammateQuery.trim().toLowerCase();
    if (!q) return teammates;
    return teammates.filter((u) => {
      const hay = `${u.name ?? ''} ${u.username ?? ''} ${u.job_title ?? ''} ${u.role ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [teammates, teammateQuery]);

  useEffect(() => {
    let alive = true;
    loadPosterFonts()
      .then(() => alive && setFontState('ready'))
      .catch(() => alive && setFontState('error'));
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
  }, []);

  useLayoutEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const innerW = box.width - 24;
      const innerH = box.height - 24;
      const maxByHeight = innerH > 0 ? (innerH * target.width) / target.height : innerW;
      setPreviewWidth(Math.max(120, Math.floor(Math.min(innerW, maxByHeight))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [target.width, target.height]);

  /**
   * Why: Parent already pushed ?date=&poster=; we push one more identical entry so
   * Back closes the studio first while the shareable URL stays correct.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (occurrenceDate) params.set('date', occurrenceDate);
    if (posterKey) params.set('poster', posterKey);
    const qs = params.toString();
    const href = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;

    const repush = () => window.history.pushState({ modal: 'poster-studio' }, '', href);
    repush();

    const onPop = () => {
      if (!skipConfirmRef.current && !savedRef.current && busyRef.current === 'save') {
        repush();
        return;
      }
      if (!skipConfirmRef.current && !savedRef.current && dirtyRef.current) {
        // Back already popped our entry: restore it, then let the dialog decide.
        repush();
        setConfirmDiscard(true);
        return;
      }
      onClose();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [onClose, occurrenceDate, posterKey]);

  const discardAndClose = useCallback(() => {
    setConfirmDiscard(false);
    skipConfirmRef.current = true;
    window.history.back();
  }, []);

  const requestClose = useCallback(() => {
    if (busyRef.current === 'save') return;
    if (dirtyRef.current) {
      setConfirmDiscard(true);
      return;
    }
    discardAndClose();
  }, [discardAndClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmDiscardRef.current) {
        e.stopPropagation();
        setConfirmDiscard(false);
        return;
      }
      // Why: nested pickers (poster date) must close before discarding the studio.
      if (document.querySelector('[data-radix-popper-content-wrapper]')) return;
      e.stopPropagation();
      requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const updateField = (key: PosterFieldKey, value: string) => {
    setData((prev) => ({ ...prev, [key]: value.slice(0, POSTER_FIELD_LIMITS[key]) }));
  };

  const selectTemplate = useCallback((key: PosterTemplateKey) => {
    setTemplateKey(key);
    setPaletteKey(POSTER_TEMPLATES[key].defaultPalette);
  }, []);

  /** Thumbnails trail the form at low priority: 40+ full poster renders would otherwise lag every keystroke. */
  const thumbData = useDeferredValue(data);
  const renderTemplateThumb = useCallback(
    (key: PosterTemplateKey) =>
      fontState === 'loading' ? (
        <div
          className="animate-pulse bg-gray-200 dark:bg-gray-700"
          style={{ width: THUMB_WIDTH * 0.8, height: THUMB_WIDTH }}
        />
      ) : (
        <ScaledPoster
          templateKey={key}
          data={thumbData}
          paletteKey={POSTER_TEMPLATES[key].defaultPalette}
          layout={resolveRenderPlan(POSTER_TEMPLATES[key], ORIGINAL_PRESET_ID).layout}
          width={THUMB_WIDTH * 0.8}
        />
      ),
    [fontState, thumbData],
  );

  const applySuggestion = () => {
    if (!suggestion) return;
    setTemplateKey(suggestion.template);
    setPaletteKey(suggestion.palette ?? POSTER_TEMPLATES[suggestion.template].defaultPalette);
  };

  const applyImage = async (load: () => Promise<string>) => {
    if (busyRef.current) return;
    setBusyState('image');
    setImageError('');
    try {
      const dataUrl = await load();
      setData((prev) => ({ ...prev, heroImage: dataUrl }));
      setImageUrl('');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        setImageError(e instanceof Error ? e.message : 'Image could not be loaded');
      }
    } finally {
      setBusyState(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /** Apply a BugRicer teammate's name, role and genuine profile photo to the poster. */
  const applyTeammate = async (user: User) => {
    if (busyRef.current) return;
    const name = posterDisplayName(user.name || user.username);
    const role = String(user.job_title ?? '').trim();
    setSelectedSpeakerId(user.id);
    setData((prev) => ({
      ...prev,
      speakerName: name.slice(0, POSTER_FIELD_LIMITS.speakerName),
      speakerRole: role
        ? role.slice(0, POSTER_FIELD_LIMITS.speakerRole)
        : prev.speakerRole,
    }));
    if (!isRealPosterAvatar(user.avatar)) {
      setImageError(`${name} has no profile photo yet — ask them to upload one, or use Upload.`);
      return;
    }
    await applyImage(() =>
      imageUrlToPosterDataUrl(resolveAvatarUrl(user.avatar, name || user.username))
    );
  };

  const handleSuggestCopy = async () => {
    if (!item.id || busyRef.current) return;
    setBusyState('ai');
    setAiError('');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const s = await getPosterCopy(
        {
          event_id: item.id,
          occurrence_date: occurrenceDate,
          template_key: templateKey,
          agenda_topic: session?.agenda_topic ?? null,
        },
        controller.signal
      );
      setData((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : s.headline.slice(0, POSTER_FIELD_LIMITS.title),
        tagline: s.tagline_en ? s.tagline_en.slice(0, POSTER_FIELD_LIMITS.tagline) : prev.tagline,
        quote: s.quote ? s.quote.slice(0, POSTER_FIELD_LIMITS.quote) : prev.quote,
        quoteAuthor: s.quote ? s.quote_author.slice(0, POSTER_FIELD_LIMITS.quoteAuthor) : prev.quoteAuthor,
        malayalamLine: s.tagline_ml ? s.tagline_ml.slice(0, POSTER_FIELD_LIMITS.malayalamLine) : prev.malayalamLine,
        hashtag:
          templateKey !== 'speaker_session' && s.hashtag
            ? s.hashtag.slice(0, POSTER_FIELD_LIMITS.hashtag)
            : prev.hashtag,
      }));
      toast({ title: 'AI copy applied', description: 'Review and edit before saving.' });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setAiError(e instanceof Error ? e.message : 'AI copy is unavailable');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusyState(null);
    }
  };

  const renderExport = async () => {
    if (!posterRef.current) throw new Error('Preview is not ready yet');
    return exportPosterNode(posterRef.current, layout, target);
  };

  const exportName = (extension: string) =>
    posterFileName(data.title || data.subtitle || String(item.title ?? ''), data.dateIso, extension, target);
  const sizeLabel = preset ? `${preset.group} ${preset.label}` : 'Original';

  const handleDownload = async () => {
    if (!canExport || busyRef.current) return;
    setBusyState('download');
    try {
      const { blob, extension } = await renderExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportName(extension);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        title: 'Could not export poster',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setBusyState(null);
    }
  };

  const handleSave = async () => {
    if (!canExport || busyRef.current || !item.id) return;
    setBusyState('save');
    try {
      const { blob, extension } = await renderExport();
      const file = new File([blob], exportName(extension), { type: blob.type });
      const uploaded = await uploadCreativeFile(file);
      const summary = [data.subtitle, data.tagline, data.quote, data.malayalamLine]
        .map((v) => v.trim())
        .filter(Boolean)
        .join(' · ');
      const res = await generateBugCreativeCard({
        event_id: item.id,
        occurrence_date: occurrenceDate,
        title: `${String(item.title || data.title).trim()} — Poster (${sizeLabel})`.slice(0, 255),
        hook_content: `${summary || `Poster for ${item.title} on ${occurrenceDate}`}\n\nSize: ${sizeLabel} · ${target.width} × ${target.height}px`,
        material_type: 'Poster',
        uploaded_file_path: uploaded.file_path,
        preview_thumbnail_url: uploaded.preview_thumbnail_url ?? uploaded.file_path,
        template_key: templateKey,
      });
      savedRef.current = true;
      notifyAdminNavCountsChanged();
      toast({
        title: res.updated ? 'Poster updated in BugCreative' : 'Poster saved to BugCreative',
        description: 'Opening the creative card…',
      });
      skipConfirmRef.current = true;
      onSaved(res.asset_id);
    } catch (e) {
      toast({
        title: 'Poster not saved',
        description: e instanceof Error ? e.message : 'Your edits are kept — try again',
        variant: 'destructive',
      });
    } finally {
      setBusyState(null);
    }
  };

  const fieldLabel = (key: PosterFieldKey) => def.fieldLabels?.[key] ?? POSTER_FIELD_LABELS[key];

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-stretch justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={requestClose}
      role="presentation"
    >
      <div
        className="flex h-[100dvh] w-full max-w-[1180px] flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-900 sm:h-[94dvh] sm:rounded-2xl sm:border sm:border-gray-200/60 sm:dark:border-gray-700/60"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="poster-studio-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200/60 px-4 py-3 dark:border-gray-700/60 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-2 text-white shadow-md">
              <Palette className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="poster-studio-title" className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
                Poster Studio
              </h2>
              <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                {item.title} · {occurrenceDate}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl border-gray-200 dark:border-gray-700"
            onClick={requestClose}
            disabled={busy === 'save'}
            aria-label="Close poster studio"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-4 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:overflow-hidden">
          {/* Preview */}
          <section className="col-span-12 flex min-h-[340px] flex-col gap-3 lg:order-2 lg:col-span-7 lg:min-h-0">
            <div
              ref={previewBoxRef}
              className="relative flex min-h-[320px] flex-1 items-center justify-center rounded-2xl border border-gray-200/60 bg-gray-100 p-3 dark:border-gray-700/60 dark:bg-gray-800/60"
            >
              {fontState === 'loading' || previewWidth === 0 ? (
                <div
                  className="animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
                  style={{
                    width: previewWidth || 280,
                    height: ((previewWidth || 280) * target.height) / target.width,
                  }}
                  aria-label="Loading poster preview"
                />
              ) : (
                <div className="overflow-hidden rounded-xl shadow-xl">
                  <PosterComposite
                    templateKey={templateKey}
                    data={data}
                    paletteKey={paletteKey}
                    layout={layout}
                    target={target}
                    width={previewWidth}
                    nodeRef={posterRef}
                  />
                </div>
              )}
            </div>
            {fontState === 'error' && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Brand fonts could not load — the preview uses fallback fonts. Check your connection before saving.
              </p>
            )}
            <div className="grid grid-cols-12 items-end gap-4">
              <div className="col-span-12 flex min-w-0 flex-col gap-1.5 sm:col-span-8">
                <Label htmlFor="poster-size" className="text-xs font-semibold">
                  Export size
                </Label>
                <PosterSizePicker
                  id="poster-size"
                  value={presetId}
                  onChange={setPresetId}
                  originalSize={originalTarget}
                  selectedLabel={
                    preset
                      ? presetDisplayLabel(preset)
                      : `Original design (${originalTarget.width} × ${originalTarget.height})`
                  }
                />
              </div>
              <p className="col-span-12 text-xs tabular-nums text-muted-foreground sm:col-span-4 sm:text-end">
                {target.width} × {target.height}px
                {!sameAspect(layout, target) && ' · fitted with soft fill'}
              </p>
            </div>
            {preset?.note && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{preset.note}</p>
            )}
            {suggestion && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 dark:border-blue-900/60 dark:bg-blue-950/30">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
                  {POSTER_TEMPLATES[suggestion.template].label} suits this size best.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl border-blue-300 text-xs dark:border-blue-800"
                  onClick={applySuggestion}
                >
                  Use {POSTER_TEMPLATES[suggestion.template].label}
                </Button>
              </div>
            )}
          </section>

          {/* Controls */}
          <section className="col-span-12 flex min-w-0 flex-col gap-5 lg:order-1 lg:col-span-5 lg:min-h-0 lg:overflow-y-auto lg:pe-2 custom-scrollbar">
            <TemplatePicker
              order={templateOrder}
              value={templateKey}
              onChange={selectTemplate}
              renderThumb={renderTemplateThumb}
            />

            {def.palettes.length > 0 && (
              <PalettePicker
                options={def.palettes}
                value={paletteKey}
                onChange={setPaletteKey}
              />
            )}

            {templateKey === 'brand_logo' && (
              <LogoStylePicker
                value={normalizeLogoStyle(data.logoStyle)}
                onChange={(k) => setData((prev) => ({ ...prev, logoStyle: k }))}
                data={data}
                palette={POSTER_PALETTES[paletteKey]}
              />
            )}

            {SHOW_AI_SUGGEST_COPY && def.fields.length > 0 && !!item.id && (
            <div className="flex flex-col gap-2 rounded-2xl border border-indigo-200/70 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-xl border-indigo-300 bg-white font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-300"
                disabled={busy !== null || !item.id}
                onClick={handleSuggestCopy}
              >
                {busy === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="ms-2">AI suggest copy</span>
              </Button>
              <p className="text-xs text-indigo-900/70 dark:text-indigo-200/70">
                Suggests a tagline, quote, Malayalam line and hashtag from the event. Always review before saving.
              </p>
              {aiError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                  {aiError}
                </p>
              )}
            </div>
            )}

            {(def.fields.length > 0 || def.showsDate) && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Content</h3>
              {def.fields.map((key) => {
                const id = `poster-${key}`;
                const value = data[key];
                const limit = POSTER_FIELD_LIMITS[key];
                const isMl = key === 'malayalamLine';
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={id} className="text-xs font-semibold">
                        {fieldLabel(key)}
                        {key === requiredField && <span className="text-red-500"> *</span>}
                      </Label>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {value.length}/{limit}
                      </span>
                    </div>
                    {MULTILINE_FIELDS.includes(key) ? (
                      <Textarea
                        id={id}
                        lang={isMl ? 'ml' : undefined}
                        maxLength={limit}
                        value={value}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="min-h-[72px] rounded-xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                      />
                    ) : (
                      <Input
                        id={id}
                        maxLength={limit}
                        value={value}
                        onChange={(e) => updateField(key, e.target.value)}
                        aria-invalid={key === requiredField && !!requiredError}
                        className="h-10 rounded-xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                      />
                    )}
                    {key === requiredField && requiredError && (
                      <span className="text-xs text-red-500" role="alert">
                        {requiredError}
                      </span>
                    )}
                  </div>
                );
              })}

              {def.showsDate && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Poster date</Label>
                  <DatePicker
                    value={data.dateIso ?? undefined}
                    onChange={(iso) =>
                      setData((prev) => ({ ...prev, dateIso: iso.trim() ? iso : null }))
                    }
                    placeholder="Pick poster date"
                    displayFormat="d MMM yyyy"
                    className="rounded-xl"
                    fromYear={2024}
                    toYear={new Date().getFullYear() + 3}
                  />
                </div>
              )}

              {templateKey === 'heritage_hero' && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
                  <Label htmlFor="poster-contacts" className="text-xs font-semibold">
                    Show website, email and phone
                  </Label>
                  <Switch
                    id="poster-contacts"
                    checked={data.showContacts}
                    onCheckedChange={(v) => setData((prev) => ({ ...prev, showContacts: v }))}
                  />
                </div>
              )}
            </div>
            )}

            {def.usesHeroImage && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {def.heroImageLabel ?? 'Image'}
                </h3>

                <div className="flex flex-col gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/80 p-3 dark:border-gray-700/80 dark:bg-gray-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Developers, CODO testers & creators
                    </p>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {teammatesLoading
                        ? 'Loading…'
                        : `${filteredTeammates.length}${teammateQuery.trim() ? ` / ${teammates.length}` : ''} people`}
                    </span>
                  </div>
                  <Input
                    type="search"
                    placeholder="Search name, role or job title…"
                    maxLength={80}
                    value={teammateQuery}
                    onChange={(e) => setTeammateQuery(e.target.value.slice(0, 80))}
                    className="h-9 rounded-xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  />
                  <div className="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto custom-scrollbar sm:grid-cols-2">
                    {teammatesLoading && (
                      <div className="col-span-full flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading teammates…
                      </div>
                    )}
                    {!teammatesLoading &&
                      filteredTeammates.map((user) => {
                      const label = posterDisplayName(user.name || user.username);
                      const active = selectedSpeakerId === user.id;
                      const thumb = resolveAvatarUrl(user.avatar, label || user.username);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void applyTeammate(user)}
                          className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-start transition ${
                            active
                              ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/25 dark:bg-blue-950/40'
                              : 'border-transparent hover:border-gray-200 hover:bg-white dark:hover:border-gray-600 dark:hover:bg-gray-900'
                          }`}
                        >
                          <img
                            src={thumb}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full bg-muted object-cover"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-gray-900 dark:text-white">
                              {label || user.username}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {user.job_title?.trim() || user.role || user.username}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    {!teammatesLoading && filteredTeammates.length === 0 && (
                      <p className="col-span-full px-1 py-2 text-xs text-muted-foreground">
                        {teammates.length === 0
                          ? 'No active developers, CODO testers, or creators available.'
                          : 'No teammates match that search.'}
                      </p>
                    )}
                  </div>
                </div>

                {data.heroImage ? (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2 dark:border-gray-700">
                    <img
                      src={data.heroImage}
                      alt="Selected poster visual"
                      className="h-16 w-16 rounded-lg bg-gray-100 object-cover dark:bg-gray-800"
                    />
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                      {data.speakerName
                        ? `${data.speakerName}${data.speakerRole ? ` · ${data.speakerRole}` : ''}`
                        : 'Photo ready'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-xl text-red-600 hover:text-red-700"
                      onClick={() => {
                        setSelectedSpeakerId(null);
                        setData((prev) => ({ ...prev, heroImage: null }));
                      }}
                      disabled={busy !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ms-1">Remove</span>
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy !== null}
                    className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-gray-300 px-4 py-5 text-center text-xs text-gray-600 transition hover:border-blue-400 hover:bg-blue-50/40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-blue-950/20"
                  >
                    {busy === 'image' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-5 w-5" />
                    )}
                    <span className="font-semibold">Upload PNG, JPG or WebP (max 10MB)</span>
                    <span className="text-muted-foreground">
                      Optional: a transparent cut-out looks closest to the master art.
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedSpeakerId(null);
                      void applyImage(() => imageBlobToPosterDataUrl(f));
                    }
                  }}
                />
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Link2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="…or paste an image URL"
                      maxLength={2000}
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value.slice(0, 2000))}
                      className="h-10 rounded-xl border-gray-200 bg-white ps-9 dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    disabled={busy !== null || !/^https?:\/\//i.test(imageUrl.trim())}
                    onClick={() => {
                      setSelectedSpeakerId(null);
                      void applyImage(() => imageUrlToPosterDataUrl(imageUrl.trim()));
                    }}
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span className="ms-1">Use</span>
                  </Button>
                </div>
                {imageError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                    {imageError}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-gray-200/60 px-4 py-3 dark:border-gray-700/60 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl sm:w-auto"
            disabled={!canExport}
            onClick={handleDownload}
          >
            {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ms-2">Download</span>
          </Button>
          {item.id ? (
            <Button
              type="button"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-800 sm:w-auto"
              disabled={!canExport}
              onClick={handleSave}
            >
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
              <span className="ms-2">Save to BugCreative</span>
            </Button>
          ) : (
            <p className="order-first text-xs text-muted-foreground sm:order-none sm:me-auto">
              Team milestones aren&apos;t BugDates events, so this poster is download-only.
            </p>
          )}
        </footer>
      </div>
      {confirmDiscard && (
        <DiscardChangesDialog onKeepEditing={() => setConfirmDiscard(false)} onDiscard={discardAndClose} />
      )}
    </div>,
    document.body
  );
}
