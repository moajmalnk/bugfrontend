import type { ReactNode } from 'react';
import type { PosterTemplateProps } from '../types';
import { fitFont, getDateParts, ordinalSuffix } from './posterUtils';
import { PosterFrame } from './shared';

const TEAM_SESSION_BG = '/posters/team-session-bg.webp';

const HIGHLIGHT = { green: '#3DDC5F', blue: '#4BA3FF' };

/**
 * Measured slots on team-session-bg.webp (1080 × 1080).
 * Why: topic must sit under baked "TOPIC :" (≈ y 610–620) and above the
 * outlined clock/calendar box (≈ y 729); meta text must centre on each icon row.
 */
const TOPIC_SLOT = {
  left: 400,
  top: 628,
  width: 280,
  height: 92,
} as const;

const META = {
  left: 498,
  top: 735,
  width: 168,
  /** Matches the outlined box height so rows track clock + calendar icons. */
  height: 112,
  timeRow: 48,
  dateRow: 64,
} as const;

/**
 * Renders "*green*" and "_blue_" markers as the highlighted words used on the
 * CODO Team Session (debate) posters.
 */
function renderTopic(text: string): ReactNode[] {
  return text
    .split(/(\*[^*]+\*|_[^_]+_)/g)
    .filter(Boolean)
    .map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <span key={i} style={{ color: HIGHLIGHT.green }}>
            {part.slice(1, -1)}
          </span>
        );
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return (
          <span key={i} style={{ color: HIGHLIGHT.blue }}>
            {part.slice(1, -1)}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
}

/**
 * CODO Team Session (debate) poster: master artwork with topic, time and day
 * overlaid into the measured glass-panel slots.
 */
export function TeamSessionTemplate({ data, size }: PosterTemplateProps) {
  const date = getDateParts(data.dateIso);
  const topic = data.subtitle.trim();
  const plainTopic = topic.replace(/[*_]/g, '');
  const time = data.time.trim();
  const dayLabel = date
    ? `${date.day}${ordinalSuffix(Number(date.day))} ${date.monthShort.toUpperCase()}`
    : '';
  const topicSize = fitFont(plainTopic, 24, 13, 28);

  return (
    <PosterFrame size={size} background="#06110D">
      <img
        src={TEAM_SESSION_BG}
        alt=""
        crossOrigin="anonymous"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* Topic — gap under "TOPIC :" only; never covers the baked label. */}
      {topic && (
        <div
          style={{
            position: 'absolute',
            left: TOPIC_SLOT.left,
            top: TOPIC_SLOT.top,
            width: TOPIC_SLOT.width,
            height: TOPIC_SLOT.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: topicSize,
            fontWeight: 700,
            fontStyle: 'italic',
            lineHeight: 1.2,
            color: '#FFFFFF',
            overflow: 'hidden',
            padding: '0 10px',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
              maxWidth: '100%',
            }}
          >
            {renderTopic(topic)}
          </span>
        </div>
      )}

      {/* Time + date — one row per baked icon, vertically centred. */}
      {(time || date) && (
        <div
          style={{
            position: 'absolute',
            left: META.left,
            top: META.top,
            width: META.width,
            height: META.height,
            display: 'flex',
            flexDirection: 'column',
            color: '#FFFFFF',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              height: META.timeRow,
              display: 'flex',
              alignItems: 'center',
              fontSize: fitFont(time || ' ', 26, 18, 10),
              fontWeight: 600,
              letterSpacing: 0.2,
              whiteSpace: 'nowrap',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {time || '\u00a0'}
          </div>
          <div
            style={{
              height: META.dateRow,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 1,
              lineHeight: 1.15,
              overflow: 'hidden',
            }}
          >
            {date ? (
              <>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {date.weekday}
                </div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {dayLabel}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </PosterFrame>
  );
}
