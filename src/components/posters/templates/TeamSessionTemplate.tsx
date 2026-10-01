import type { ReactNode } from 'react';
import type { PosterTemplateProps } from '../types';
import { fitFont, getDateParts, ordinalSuffix } from './posterUtils';
import { PosterFrame } from './shared';

const TEAM_SESSION_BG = '/posters/team-session-bg.webp';

const HIGHLIGHT = { green: '#3DDC5F', blue: '#4BA3FF' };

/**
 * Renders "*green*" and "_blue_" markers as the highlighted words used on the
 * CODO Team Session (debate) posters.
 */
function renderTopic(text: string): ReactNode[] {
  return text.split(/(\*[^*]+\*|_[^_]+_)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <span key={i} style={{ color: HIGHLIGHT.green }}>{part.slice(1, -1)}</span>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <span key={i} style={{ color: HIGHLIGHT.blue }}>{part.slice(1, -1)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

/** CODO Team Session (debate) poster: master artwork with topic, time and day overlaid. */
export function TeamSessionTemplate({ data, size }: PosterTemplateProps) {
  const date = getDateParts(data.dateIso);
  const topic = data.subtitle.trim();
  const plainTopic = topic.replace(/[*_]/g, '');

  return (
    <PosterFrame size={size} background="#06110D">
      <img
        src={TEAM_SESSION_BG}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {topic && (
        <div
          style={{
            position: 'absolute',
            left: 400,
            top: 640,
            width: 290,
            height: 76,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: fitFont(plainTopic, 21, 15, 70),
            fontWeight: 700,
            fontStyle: 'italic',
            lineHeight: 1.12,
            color: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          <span>{renderTopic(topic)}</span>
        </div>
      )}

      {data.time && (
        <div
          style={{
            position: 'absolute',
            left: 522,
            top: 741,
            fontSize: 27,
            fontWeight: 600,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
          }}
        >
          {data.time}
        </div>
      )}

      {date && (
        <div
          style={{
            position: 'absolute',
            left: 522,
            top: 791,
            color: '#FFFFFF',
            fontWeight: 600,
            lineHeight: 1.05,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 23 }}>{date.weekday}</div>
          <div style={{ fontSize: 21 }}>
            {date.day}
            <sup style={{ fontSize: 12 }}>{ordinalSuffix(Number(date.day))}</sup> {date.monthLong.toUpperCase()}
          </div>
        </div>
      )}
    </PosterFrame>
  );
}
