import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { POSTER_FIELD_LIMITS } from '../posterData';
import type { PosterFieldKey } from '../types';
import { usePosterEdit, type PosterLayerRole } from './PosterEditContext';

const MULTILINE: PosterFieldKey[] = ['quote', 'tagline', 'malayalamLine'];
const DRAG_THRESHOLD_PX = 4;

type Props = {
  id: string;
  field?: PosterFieldKey;
  role?: PosterLayerRole;
  style?: CSSProperties;
  className?: string;
  /** Optional for chrome/group shells that are only a positioned hit target. */
  children?: ReactNode;
};

/**
 * Why: Studio freeform editing needs stable layer ids across 300+ templates.
 * Offsets are poster-pixel translates so export captures the moved DOM as-is.
 */
export function PosterElement({
  id,
  field,
  role = field ? 'text' : 'chrome',
  style,
  className,
  children,
}: Props) {
  const {
    enabled,
    suppressChrome,
    scale,
    selectedId,
    editingId,
    layerOffsets,
    data,
    select,
    setEditing,
    setOffset,
    updateField,
  } = usePosterEdit();

  const offset = layerOffsets[id] ?? { x: 0, y: 0 };
  const selected = enabled && !suppressChrome && selectedId === id;
  const editing = enabled && !suppressChrome && editingId === id && Boolean(field);
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!editing || !field) return;
    setDraft(String(data[field] ?? ''));
    const el = nodeRef.current?.querySelector('[data-poster-inline-edit]') as HTMLElement | null;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing, field, data]);

  const commitInline = useCallback(() => {
    if (!field) return;
    const limit = POSTER_FIELD_LIMITS[field];
    const next = draft.slice(0, limit);
    updateField(field, next);
    setEditing(null);
  }, [draft, field, setEditing, updateField]);

  const cancelInline = useCallback(() => {
    setEditing(null);
  }, [setEditing]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || editing || e.button !== 0) return;
    // Nested layers: only the deepest PosterElement should start a drag.
    const target = e.target as HTMLElement | null;
    const nearest = target?.closest?.('[data-poster-layer]') as HTMLElement | null;
    if (nearest && nearest !== nodeRef.current) return;

    e.stopPropagation();
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    };
    nodeRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !enabled || editing) return;
    const dxScreen = e.clientX - drag.startClientX;
    const dyScreen = e.clientY - drag.startClientY;
    if (!drag.moved) {
      if (Math.hypot(dxScreen, dyScreen) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      select(id, field ?? null);
    }
    e.preventDefault();
    const s = scale > 0 ? scale : 1;
    setOffset(id, drag.originX + dxScreen / s, drag.originY + dyScreen / s);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      nodeRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (!drag.moved) {
      select(id, field ?? null);
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!enabled || !field) return;
    e.stopPropagation();
    e.preventDefault();
    setEditing(id);
  };

  const combinedStyle: CSSProperties = {
    ...style,
    transform: `translate(${offset.x}px, ${offset.y}px)${
      style?.transform ? ` ${style.transform}` : ''
    }`,
    cursor: enabled ? (editing ? 'text' : 'grab') : style?.cursor,
    outline: selected && !editing ? '2px solid rgba(37, 99, 235, 0.85)' : style?.outline,
    outlineOffset: selected && !editing ? 4 : style?.outlineOffset,
    touchAction: enabled ? 'none' : style?.touchAction,
    userSelect: editing ? 'text' : enabled ? 'none' : style?.userSelect,
    position: style?.position ?? (role === 'group' ? undefined : style?.position),
  };

  return (
    <div
      ref={nodeRef}
      data-poster-layer={id}
      data-poster-role={role}
      data-poster-field={field || undefined}
      className={className}
      style={combinedStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      {editing && field ? (
        <div
          data-poster-inline-edit
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={`Edit ${field}`}
          style={{
            font: 'inherit',
            color: 'inherit',
            letterSpacing: 'inherit',
            lineHeight: 'inherit',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            textAlign: 'inherit',
            outline: '2px solid rgba(37, 99, 235, 0.9)',
            outlineOffset: 2,
            minWidth: '1ch',
            whiteSpace: MULTILINE.includes(field) ? 'pre-wrap' : 'nowrap',
            cursor: 'text',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onInput={(e) => {
            const text = (e.currentTarget.textContent ?? '').slice(
              0,
              POSTER_FIELD_LIMITS[field]
            );
            setDraft(text);
            if ((e.currentTarget.textContent ?? '').length > POSTER_FIELD_LIMITS[field]) {
              e.currentTarget.textContent = text;
            }
          }}
          onBlur={commitInline}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelInline();
              return;
            }
            if (e.key === 'Enter' && !MULTILINE.includes(field) && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget as HTMLElement).blur();
            }
          }}
        >
          {draft}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
