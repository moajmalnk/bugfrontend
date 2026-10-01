import type { CSSProperties, ReactNode } from 'react';
import { Facebook, Instagram, Mail, Paperclip, Phone, Twitter } from 'lucide-react';
import { CODO_BRAND } from '../brand/brandKit';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import type { PosterSize } from '../types';

export function PosterFrame({
  size,
  background,
  children,
  style,
}: {
  size: PosterSize;
  background: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      data-poster-root
      style={{
        position: 'relative',
        width: size.width,
        height: size.height,
        overflow: 'hidden',
        background,
        fontFamily: POSTER_FONT_STACK.body,
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function WebsiteTag({ color, fontSize = 26 }: { color: string; fontSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color, fontSize, fontWeight: 400 }}>
      <Paperclip size={fontSize} strokeWidth={2} style={{ transform: 'rotate(-45deg)' }} />
      <span>{CODO_BRAND.website}</span>
    </div>
  );
}

export function SocialIcons({ color, size = 30 }: { color: string; size?: number }) {
  const icons = [Facebook, Twitter, Instagram];
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {icons.map((Icon, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size,
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={size * 0.55} color="#FFFFFF" fill={i === 1 ? '#FFFFFF' : 'none'} strokeWidth={2} />
        </div>
      ))}
    </div>
  );
}

export function ContactBlock({ color, align = 'right' }: { color: string; align?: 'left' | 'right' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
        gap: 6,
        color,
        fontSize: 26,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Mail size={22} />
        <span>{CODO_BRAND.email}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
        <Phone size={22} />
        <span>{CODO_BRAND.phone}</span>
      </div>
    </div>
  );
}

export function HeroImage({
  src,
  alt,
  style,
  grayscale = false,
  fit = 'contain',
}: {
  src: string;
  alt: string;
  style?: CSSProperties;
  grayscale?: boolean;
  fit?: 'contain' | 'cover';
}) {
  return (
    <img
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      style={{
        display: 'block',
        objectFit: fit,
        filter: grayscale ? 'grayscale(1) contrast(1.05)' : undefined,
        ...style,
      }}
    />
  );
}
