/**
 * Why: Browsers cannot silently post to LinkedIn/Instagram/Facebook without each
 * network’s OAuth API. This module uses Web Share + official share intents so
 * creators get a Premagic-style picker without storing social tokens.
 */

export type PosterSharePlatform =
  | 'linkedin'
  | 'instagram'
  | 'x'
  | 'facebook'
  | 'whatsapp'
  | 'email'
  | 'download';

export const POSTER_SHARE_PLATFORMS: {
  id: PosterSharePlatform;
  label: string;
  actionLabel: string;
}[] = [
  { id: 'linkedin', label: 'LinkedIn', actionLabel: 'Share on LinkedIn' },
  { id: 'instagram', label: 'Instagram', actionLabel: 'Share to Instagram' },
  { id: 'x', label: 'X', actionLabel: 'Share on X' },
  { id: 'facebook', label: 'Facebook', actionLabel: 'Share on Facebook' },
  { id: 'whatsapp', label: 'WhatsApp', actionLabel: 'Share on WhatsApp' },
  { id: 'email', label: 'Email', actionLabel: 'Share via email' },
  { id: 'download', label: 'Download', actionLabel: 'Download poster' },
];

export function buildPosterShareCaption(input: {
  title: string;
  dateLabel?: string;
  hashtag?: string;
  tagline?: string;
}): string {
  const title = input.title.trim() || 'CODO poster';
  const bits = [`I’m sharing: ${title}`];
  if (input.dateLabel?.trim()) bits.push(input.dateLabel.trim());
  if (input.tagline?.trim()) bits.push(input.tagline.trim());
  const tags = [input.hashtag?.trim(), '#CODO', '#BugRicer'].filter(Boolean);
  bits.push(tags.join(' '));
  return bits.filter(Boolean).join('\n\n');
}

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function tryWebShareFile(file: File, text?: string): Promise<'shared' | 'unsupported' | 'aborted'> {
  if (typeof navigator.share !== 'function') return 'unsupported';
  // Prefer file-only — Safari often duplicates when text+file are combined.
  const fileOnly: ShareData = { files: [file] };
  if (navigator.canShare?.(fileOnly)) {
    try {
      await navigator.share(fileOnly);
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'aborted';
    }
  }
  if (text) {
    const withText: ShareData = { files: [file], text, title: file.name };
    if (navigator.canShare?.(withText)) {
      try {
        await navigator.share(withText);
        return 'shared';
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'aborted';
      }
    }
  }
  return 'unsupported';
}

export type PosterShareResult =
  | { ok: true; mode: 'shared' | 'downloaded' | 'opened'; hint?: string }
  | { ok: false; aborted?: boolean; message: string };

export async function sharePosterToPlatform(args: {
  platform: PosterSharePlatform;
  file: File;
  blob: Blob;
  caption: string;
  download: (blob: Blob, filename: string) => void;
}): Promise<PosterShareResult> {
  const { platform, file, blob, caption, download } = args;

  if (platform === 'download') {
    download(blob, file.name);
    return { ok: true, mode: 'downloaded' };
  }

  if (platform === 'whatsapp') {
    const shared = await tryWebShareFile(file, caption);
    if (shared === 'shared') return { ok: true, mode: 'shared' };
    if (shared === 'aborted') return { ok: false, aborted: true, message: 'Cancelled' };
    await copyText(caption);
    openUrl(`https://wa.me/?text=${encodeURIComponent(caption)}`);
    download(blob, file.name);
    return {
      ok: true,
      mode: 'opened',
      hint: 'Caption copied and poster downloaded — attach the image in WhatsApp.',
    };
  }

  if (platform === 'x') {
    const shared = await tryWebShareFile(file, caption);
    if (shared === 'shared') return { ok: true, mode: 'shared' };
    if (shared === 'aborted') return { ok: false, aborted: true, message: 'Cancelled' };
    await copyText(caption);
    openUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption.slice(0, 260))}`);
    download(blob, file.name);
    return {
      ok: true,
      mode: 'opened',
      hint: 'Caption ready on X — attach the downloaded poster to your post.',
    };
  }

  if (platform === 'facebook') {
    const shared = await tryWebShareFile(file, caption);
    if (shared === 'shared') return { ok: true, mode: 'shared' };
    if (shared === 'aborted') return { ok: false, aborted: true, message: 'Cancelled' };
    await copyText(caption);
    openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`);
    download(blob, file.name);
    return {
      ok: true,
      mode: 'opened',
      hint: 'Poster downloaded and caption copied — attach the image on Facebook.',
    };
  }

  if (platform === 'instagram') {
    const shared = await tryWebShareFile(file, caption);
    if (shared === 'shared') return { ok: true, mode: 'shared' };
    if (shared === 'aborted') return { ok: false, aborted: true, message: 'Cancelled' };
    await copyText(caption);
    download(blob, file.name);
    return {
      ok: true,
      mode: 'downloaded',
      hint: 'Instagram needs the mobile app — caption copied; open Instagram and post the downloaded image.',
    };
  }

  if (platform === 'linkedin') {
    // True “post for me” needs LinkedIn OAuth + UGC API. Browser share / compose is the
    // zero-credential path Premagic-style apps use when no LinkedIn app is configured.
    const shared = await tryWebShareFile(file, caption);
    if (shared === 'shared') return { ok: true, mode: 'shared' };
    if (shared === 'aborted') return { ok: false, aborted: true, message: 'Cancelled' };
    await copyText(caption);
    openUrl('https://www.linkedin.com/feed/?shareActive=true');
    download(blob, file.name);
    return {
      ok: true,
      mode: 'opened',
      hint: 'LinkedIn opened — paste the copied caption and attach the downloaded poster.',
    };
  }

  if (platform === 'email') {
    const shared = await tryWebShareFile(file, caption);
    if (shared === 'shared') return { ok: true, mode: 'shared' };
    if (shared === 'aborted') return { ok: false, aborted: true, message: 'Cancelled' };
    download(blob, file.name);
    openUrl(
      `mailto:?subject=${encodeURIComponent('CODO poster')}&body=${encodeURIComponent(caption)}`
    );
    return {
      ok: true,
      mode: 'opened',
      hint: 'Email draft opened — attach the downloaded poster.',
    };
  }

  return { ok: false, message: 'Unknown platform' };
}
