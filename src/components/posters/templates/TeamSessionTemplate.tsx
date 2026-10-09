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

/**
 * Text column inside the outlined box: baked icons end at x≈512 and the box's
 * inner edge is x≈628. Row centres match the clock (y≈758) and calendar (y≈822).
 */
const META = {
  left: 522,
  width: 104,
  timeCenterY: 758,
  timeHeight: 44,
  dateCenterY: 822,
  dateHeight: 52,
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
  const timeMatch = time.match(/^(.*?)\s*(AM|PM)$/i);
  const timeMain = timeMatch ? timeMatch[1] : time;
  const timeSuffix = timeMatch ? timeMatch[2].toUpperCase() : '';

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

      {/* Time — centred on the baked clock icon, right of it. */}
      {time && (
        <div
          style={{
            position: 'absolute',
            left: META.left,
            top: META.timeCenterY - META.timeHeight / 2,
            width: META.width,
            height: META.timeHeight,
            display: 'flex',
            alignItems: 'center',
            color: '#FFFFFF',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, lineHeight: 1 }}>
            <span style={{ fontSize: fitFont(timeMain, 24, 17, 5) }}>{timeMain}</span>
            {timeSuffix && <span style={{ fontSize: 15 }}>{timeSuffix}</span>}
          </span>
        </div>
      )}

      {/* Weekday + date — centred on the baked calendar icon, right of it. */}
      {date && (
        <div
          style={{
            position: 'absolute',
            left: META.left,
            top: META.dateCenterY - META.dateHeight / 2,
            width: META.width,
            height: META.dateHeight,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 2,
            color: '#FFFFFF',
            fontWeight: 600,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: fitFont(date.weekday, 18, 15, 8) }}>{date.weekday}</div>
          <div style={{ fontSize: fitFont(dayLabel, 17, 14, 8), color: 'rgba(255,255,255,0.88)' }}>
            {dayLabel}
          </div>
        </div>
      )}
    </PosterFrame>
  );
}
