import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { EMPTY_POSTER_DATA } from '../posterData';
import type { PosterData, PosterFieldKey } from '../types';

export type PosterLayerRole = 'group' | 'text' | 'chrome';

type PosterEditContextValue = {
  enabled: boolean;
  /** Hide selection rings while exporting so they never bake into PNG/WebP. */
  suppressChrome: boolean;
  /** Preview CSS scale (previewWidth / layout.width). Drag deltas ÷ scale → poster px. */
  scale: number;
  selectedId: string | null;
  editingId: string | null;
  layerOffsets: Record<string, { x: number; y: number }>;
  data: PosterData;
  select: (id: string | null, field?: PosterFieldKey | null) => void;
  setEditing: (id: string | null) => void;
  setOffset: (id: string, x: number, y: number) => void;
  updateField: (field: PosterFieldKey, value: string) => void;
  focusContentField: (field: PosterFieldKey) => void;
};

const PosterEditContext = createContext<PosterEditContextValue | null>(null);

type ProviderProps = {
  enabled: boolean;
  suppressChrome?: boolean;
  scale: number;
  data: PosterData;
  onChangeData: (updater: (prev: PosterData) => PosterData) => void;
  onFocusField?: (field: PosterFieldKey) => void;
  children: ReactNode;
};

export function PosterEditProvider({
  enabled,
  suppressChrome = false,
  scale,
  data,
  onChangeData,
  onFocusField,
  children,
}: ProviderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const select = useCallback(
    (id: string | null, field?: PosterFieldKey | null) => {
      if (!enabled) return;
      setSelectedId(id);
      if (id === null) setEditingId(null);
      if (field && onFocusField) onFocusField(field);
    },
    [enabled, onFocusField]
  );

  const setEditing = useCallback(
    (id: string | null) => {
      if (!enabled) return;
      setEditingId(id);
      if (id) setSelectedId(id);
    },
    [enabled]
  );

  const setOffset = useCallback(
    (id: string, x: number, y: number) => {
      if (!enabled) return;
      onChangeData((prev) => ({
        ...prev,
        layerOffsets: {
          ...(prev.layerOffsets ?? {}),
          [id]: { x: Math.round(x), y: Math.round(y) },
        },
      }));
    },
    [enabled, onChangeData]
  );

  const updateField = useCallback(
    (field: PosterFieldKey, value: string) => {
      onChangeData((prev) => ({ ...prev, [field]: value }));
    },
    [onChangeData]
  );

  const focusContentField = useCallback(
    (field: PosterFieldKey) => {
      onFocusField?.(field);
    },
    [onFocusField]
  );

  const value = useMemo<PosterEditContextValue>(
    () => ({
      enabled,
      suppressChrome,
      scale: scale > 0 ? scale : 1,
      selectedId,
      editingId,
      layerOffsets: data.layerOffsets ?? {},
      data,
      select,
      setEditing,
      setOffset,
      updateField,
      focusContentField,
    }),
    [
      enabled,
      suppressChrome,
      scale,
      selectedId,
      editingId,
      data,
      select,
      setEditing,
      setOffset,
      updateField,
      focusContentField,
    ]
  );

  return (
    <PosterEditContext.Provider value={value}>{children}</PosterEditContext.Provider>
  );
}

export function usePosterEdit(): PosterEditContextValue {
  const ctx = useContext(PosterEditContext);
  if (!ctx) {
    return {
      enabled: false,
      suppressChrome: true,
      scale: 1,
      selectedId: null,
      editingId: null,
      layerOffsets: {},
      data: EMPTY_POSTER_DATA,
      select: () => {},
      setEditing: () => {},
      setOffset: () => {},
      updateField: () => {},
      focusContentField: () => {},
    };
  }
  return ctx;
}
