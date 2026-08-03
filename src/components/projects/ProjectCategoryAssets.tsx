import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type {
  AppPublisherMeta,
  CategoryAssetLinks,
  ProjectAttachment,
  ProjectCategory,
  TaggedProjectFile,
} from '@/lib/utils/projectUtils';
import { File, FolderOpen, Link2, Paperclip, X } from 'lucide-react';
import { ChangeEvent, useRef } from 'react';

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function matchesSlotKey(fileName: string, slotKey?: string): boolean {
  if (!slotKey) return true;
  const n = fileName.toLowerCase();
  if (slotKey === 'web_env') {
    return n === '.env' || n.startsWith('.env.') || n.endsWith('.env');
  }
  if (slotKey === 'web_json') {
    return n.endsWith('.json');
  }
  if (slotKey === 'web_readme') {
    return n === 'readme' || n === 'readme.md' || n === 'readme.txt' || n.startsWith('readme.');
  }
  if (slotKey === 'mac_ipa') {
    return n.endsWith('.ipa');
  }
  if (slotKey === 'android_builds') {
    return !n.endsWith('.ipa');
  }
  return true;
}

function tagFiles(
  list: FileList | null,
  category: ProjectCategory,
  folder: string,
  slotKey?: string
): TaggedProjectFile[] {
  if (!list?.length) return [];
  return Array.from(list).map((file) => {
    const tagged = file as TaggedProjectFile;
    tagged.category = category;
    tagged.folder = folder;
    if (slotKey) tagged.slotKey = slotKey;
    return tagged;
  });
}

/** One Drive/cloud folder link per category — paste a link or upload files below. */
function CategoryDriveLink({
  category,
  value,
  onChange,
  requiredHint,
}: {
  category: ProjectCategory;
  value: string;
  onChange: (url: string) => void;
  requiredHint?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          Drive folder link
          {requiredHint ? <span className="text-red-500">*</span> : null}
        </span>
        <span className="font-normal text-muted-foreground/80">or upload files below</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/…"
          className="h-9 text-sm"
          aria-label={`${category} Drive folder link`}
        />
        {value.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            onClick={() => onChange('')}
            aria-label="Clear Drive link"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FileSlot({
  title,
  hint,
  accept,
  required,
  category,
  folder,
  slotKey,
  directory,
  pending,
  existing,
  onAdd,
  onRemovePending,
}: {
  title: string;
  hint: string;
  accept?: string;
  required?: boolean;
  category: ProjectCategory;
  folder: string;
  slotKey?: string;
  directory?: boolean;
  pending: TaggedProjectFile[];
  existing: ProjectAttachment[];
  onAdd: (files: TaggedProjectFile[]) => void;
  onRemovePending: (file: TaggedProjectFile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const slotPending = pending.filter(
    (f) =>
      f.category === category &&
      f.folder === folder &&
      (!slotKey || f.slotKey === slotKey)
  );
  const slotExisting = existing.filter((f) => {
    if (String(f.category || '').toUpperCase() !== category) return false;
    const folderOk = !f.folder || String(f.folder) === folder;
    if (!folderOk) return false;
    return matchesSlotKey(f.file_name, slotKey);
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onAdd(tagFiles(e.target.files, category, folder, slotKey));
    e.target.value = '';
  };

  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {title}
            {required ? <span className="text-red-500 ml-1">*</span> : null}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-lg"
          onClick={() => inputRef.current?.click()}
        >
          {directory ? (
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <Paperclip className="h-3.5 w-3.5 mr-1.5" />
          )}
          {directory ? 'Folder' : 'Upload'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple
          // @ts-expect-error webkitdirectory is non-standard but widely supported
          webkitdirectory={directory ? '' : undefined}
          directory={directory ? '' : undefined}
          onChange={handleChange}
        />
      </div>

      {(slotExisting.length > 0 || slotPending.length > 0) && (
        <ul className="space-y-1.5">
          {slotExisting.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-xs"
            >
              <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium flex-1">{att.file_name}</span>
              <span className="text-muted-foreground shrink-0">Saved</span>
            </li>
          ))}
          {slotPending.map((file, idx) => (
            <li
              key={`${file.name}-${file.folder}-${idx}`}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-xs"
            >
              <File className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-medium flex-1">
                {(file as File & { webkitRelativePath?: string }).webkitRelativePath ||
                  file.name}
              </span>
              <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="p-1 rounded hover:bg-muted"
                onClick={() => onRemovePending(file)}
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const APP_META_FIELDS: {
  key: keyof AppPublisherMeta;
  label: string;
  placeholder: string;
}[] = [
  { key: 'account', label: 'Account', placeholder: 'Publisher account name' },
  { key: 'company_name', label: 'Company name', placeholder: 'Legal company name' },
  { key: 'mail_id', label: 'Mail Id', placeholder: 'publisher@email.com' },
  { key: 'contact_number', label: 'Contact number', placeholder: '+91…' },
  { key: 'duns_number', label: 'DUNS Number', placeholder: 'D-U-N-S number' },
  { key: 'account_id', label: 'Account ID', placeholder: 'Developer account ID' },
  {
    key: 'play_store_transaction_id',
    label: 'Play store transaction ID',
    placeholder: 'PDS.…',
  },
  {
    key: 'app_published_name',
    label: 'App published name',
    placeholder: 'Store listing name',
  },
  {
    key: 'app_package_id',
    label: 'Package ID',
    placeholder: 'com.example.app',
  },
];

type ProjectCategoryAssetsProps = {
  categories: ProjectCategory[];
  appMeta: AppPublisherMeta;
  onAppMetaChange: (meta: AppPublisherMeta) => void;
  assetLinks: CategoryAssetLinks;
  onAssetLinksChange: (links: CategoryAssetLinks) => void;
  pendingFiles: TaggedProjectFile[];
  onPendingFilesChange: (files: TaggedProjectFile[]) => void;
  existingAttachments: ProjectAttachment[];
};

export function ProjectCategoryAssets({
  categories,
  appMeta,
  onAppMetaChange,
  assetLinks,
  onAssetLinksChange,
  pendingFiles,
  onPendingFilesChange,
  existingAttachments,
}: ProjectCategoryAssetsProps) {
  const addFiles = (files: TaggedProjectFile[]) => {
    if (!files.length) return;
    onPendingFilesChange([...pendingFiles, ...files]);
  };

  const removePending = (target: TaggedProjectFile) => {
    onPendingFilesChange(pendingFiles.filter((f) => f !== target));
  };

  const setLink = (category: ProjectCategory, url: string) => {
    onAssetLinksChange({ ...assetLinks, [category]: url });
  };

  if (categories.length === 0) return null;

  return (
    <div className="space-y-5">
      {categories.includes('WEB') && (
        <div className="space-y-3 rounded-2xl border border-sky-200/60 dark:border-sky-800/40 bg-sky-50/40 dark:bg-sky-950/15 p-4 sm:p-5">
          <div>
            <h4 className="text-sm font-bold text-sky-800 dark:text-sky-200">WEB assets</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Required: Drive folder link, or <code className="text-[11px]">.env</code> +{' '}
              <code className="text-[11px]">.json</code> + README uploads
            </p>
          </div>
          <CategoryDriveLink
            category="WEB"
            value={assetLinks.WEB || ''}
            onChange={(url) => setLink('WEB', url)}
            requiredHint
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FileSlot
              title=".env"
              hint="Environment variables (prefer sanitized examples)"
              accept=".env,.env.*,text/plain"
              required
              category="WEB"
              folder="config"
              slotKey="web_env"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="JSON config"
              hint="package.json, firebase, or other config"
              accept=".json,application/json"
              required
              category="WEB"
              folder="config"
              slotKey="web_json"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="README"
              hint="readme.md or README.txt"
              accept=".md,.txt,text/plain,text/markdown"
              required
              category="WEB"
              folder="docs"
              slotKey="web_readme"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
          </div>
        </div>
      )}

      {categories.includes('APP') && (
        <div className="space-y-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/15 p-4 sm:p-5">
          <div>
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              APP publisher & files
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Play Store / developer account details and folder-based assets (recommended)
            </p>
          </div>

          <CategoryDriveLink
            category="APP"
            value={assetLinks.APP || ''}
            onChange={(url) => setLink('APP', url)}
          />

          <div className="overflow-hidden rounded-xl border border-border/60 bg-background/70">
            <div className="divide-y divide-border/50">
              {APP_META_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-1 sm:gap-3 px-3 py-2.5"
                >
                  <Label className="text-xs font-semibold text-muted-foreground self-center">
                    {field.label}
                  </Label>
                  <Input
                    value={appMeta[field.key] || ''}
                    onChange={(e) =>
                      onAppMetaChange({ ...appMeta, [field.key]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FileSlot
              title="app files"
              hint="local.properties, key.properties, google-services.json"
              accept=".properties,.json,.txt,*"
              category="APP"
              folder="app_files"
              directory
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="key_store"
              hint="upload-keystore.jks and signing configs"
              accept=".jks,.keystore,.properties,.json,*"
              category="APP"
              folder="key_store"
              directory
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="builds"
              hint="Android .apk / .aab (version folders welcome)"
              accept=".apk,.aab,*"
              category="APP"
              folder="builds"
              slotKey="android_builds"
              directory
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="Mac / iOS IPA"
              hint="Upload .ipa package (e.g. app.ipa)"
              accept=".ipa,application/octet-stream"
              category="APP"
              folder="builds"
              slotKey="mac_ipa"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
          </div>
        </div>
      )}

      {categories.includes('PWA') && (
        <div className="space-y-3 rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/40 dark:bg-violet-950/15 p-4 sm:p-5">
          <div>
            <h4 className="text-sm font-bold text-violet-800 dark:text-violet-200">PWA assets</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manifest, service worker, and icons (recommended)
            </p>
          </div>
          <CategoryDriveLink
            category="PWA"
            value={assetLinks.PWA || ''}
            onChange={(url) => setLink('PWA', url)}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FileSlot
              title="manifest.json"
              hint="Web app manifest"
              accept=".json,application/json"
              category="PWA"
              folder="pwa"
              slotKey="pwa_manifest"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="Service worker"
              hint="sw.js / service-worker.js"
              accept=".js,text/javascript"
              category="PWA"
              folder="pwa"
              slotKey="pwa_sw"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="Icons"
              hint="Icon pack or zip"
              accept="image/*,.zip"
              category="PWA"
              folder="icons"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
          </div>
        </div>
      )}

      {categories.includes('SEO') && (
        <div className="space-y-3 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/15 p-4 sm:p-5">
          <div>
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">SEO assets</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crawl rules, sitemap, keywords, and notes (recommended)
            </p>
          </div>
          <CategoryDriveLink
            category="SEO"
            value={assetLinks.SEO || ''}
            onChange={(url) => setLink('SEO', url)}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FileSlot
              title="robots.txt"
              hint="Crawl directives"
              accept=".txt,text/plain"
              category="SEO"
              folder="seo"
              slotKey="seo_robots"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="sitemap.xml"
              hint="XML sitemap"
              accept=".xml,application/xml,text/xml"
              category="SEO"
              folder="seo"
              slotKey="seo_sitemap"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="Keywords"
              hint="CSV / XLSX keyword sheet"
              accept=".csv,.xlsx,.xls,text/csv"
              category="SEO"
              folder="seo"
              slotKey="seo_keywords"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
            <FileSlot
              title="SEO notes"
              hint="md / txt brief"
              accept=".md,.txt,text/plain,text/markdown"
              category="SEO"
              folder="seo"
              slotKey="seo_notes"
              pending={pendingFiles}
              existing={existingAttachments}
              onAdd={addFiles}
              onRemovePending={removePending}
            />
          </div>
        </div>
      )}

      {categories.includes('CREATIVE') && (
        <div className="space-y-3 rounded-2xl border border-pink-200/60 dark:border-pink-800/40 bg-pink-50/40 dark:bg-pink-950/15 p-4 sm:p-5">
          <div>
            <h4 className="text-sm font-bold text-pink-800 dark:text-pink-200">
              Creative assets
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Brand kit, designs, and media (folder upload recommended)
            </p>
          </div>
          <CategoryDriveLink
            category="CREATIVE"
            value={assetLinks.CREATIVE || ''}
            onChange={(url) => setLink('CREATIVE', url)}
          />
          <FileSlot
            title="Brand / creative folder"
            hint="Images, PDF, ZIP, design exports"
            accept="image/*,.pdf,.zip,.ai,.psd,.fig,*"
            category="CREATIVE"
            folder="creative"
            directory
            pending={pendingFiles}
            existing={existingAttachments}
            onAdd={addFiles}
            onRemovePending={removePending}
          />
        </div>
      )}
    </div>
  );
}

export function groupAttachmentsByCategoryFolder(attachments: ProjectAttachment[]) {
  const groups = new Map<string, ProjectAttachment[]>();
  attachments.forEach((att) => {
    const key = `${att.category || 'GENERAL'}::${att.folder || 'general'}`;
    const list = groups.get(key) || [];
    list.push(att);
    groups.set(key, list);
  });
  return groups;
}

export function cnCategoryChip(selected: boolean) {
  return cn(
    'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all',
    selected
      ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-muted-foreground hover:border-blue-300'
  );
}
