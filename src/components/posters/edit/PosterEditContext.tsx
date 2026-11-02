import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  layerZIndex: Record<string, number>;
  data: PosterData;
  select: (id: string | null, field?: PosterFieldKey | null) => void;
  setEditing: (id: string | null) => void;
  setOffset: (id: string, x: number, y: number) => void;
  /** Register mounted layer ids so front/back can compare neighbors. */
  registerLayer: (id: string) => void;
  unregisterLayer: (id: string) => void;
  /** Absolute z-index for a layer (clamped). */
  setLayerZ: (id: string, z: number) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  updateField: (field: PosterFieldKey, value: string) => void;
  focusContentField: (field: PosterFieldKey) => void;
};

const PosterEditContext = createContext<PosterEditContextValue | null>(null);

const Z_MIN = -50;
const Z_MAX = 50;

function clampZ(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(Z_MIN, Math.min(Z_MAX, Math.round(n)));
}

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
  const layersRef = useRef<Set<string>>(new Set());

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

  const registerLayer = useCallback((id: string) => {
    layersRef.current.add(id);
  }, []);

  const unregisterLayer = useCallback((id: string) => {
    layersRef.current.delete(id);
  }, []);

  const setLayerZ = useCallback(
    (id: string, z: number) => {
      if (!enabled) return;
      const next = clampZ(z);
      onChangeData((prev) => {
        const map = { ...(prev.layerZIndex ?? {}) };
        if (next === 0) delete map[id];
        else map[id] = next;
        return { ...prev, layerZIndex: map };
      });
    },
    [enabled, onChangeData]
  );

  const rankedIds = useCallback(
    (zMap: Record<string, number>) => {
      const ids = Array.from(layersRef.current);
      return [...ids].sort((a, b) => {
        const za = zMap[a] ?? 0;
        const zb = zMap[b] ?? 0;
        if (za !== zb) return za - zb;
        return a.localeCompare(b);
      });
    },
    []
  );

  const bringForward = useCallback(
    (id: string) => {
      if (!enabled) return;
      onChangeData((prev) => {
        const zMap = { ...(prev.layerZIndex ?? {}) };
        const order = rankedIds(zMap);
        const i = order.indexOf(id);
        if (i < 0 || i >= order.length - 1) {
          zMap[id] = clampZ((zMap[id] ?? 0) + 1);
          return { ...prev, layerZIndex: zMap };
        }
        const above = order[i + 1];
        const za = zMap[id] ?? 0;
        const zb = zMap[above] ?? 0;
        if (za === zb) {
          zMap[id] = clampZ(za + 1);
        } else {
          zMap[id] = zb;
          zMap[above] = za;
        }
        if (zMap[id] === 0) delete zMap[id];
        if (zMap[above] === 0) delete zMap[above];
        return { ...prev, layerZIndex: zMap };
      });
    },
    [enabled, onChangeData, rankedIds]
  );

  const sendBackward = useCallback(
    (id: string) => {
      if (!enabled) return;
      onChangeData((prev) => {
        const zMap = { ...(prev.layerZIndex ?? {}) };
        const order = rankedIds(zMap);
        const i = order.indexOf(id);
        if (i <= 0) {
          zMap[id] = clampZ((zMap[id] ?? 0) - 1);
          return { ...prev, layerZIndex: zMap };
        }
        const below = order[i - 1];
        const za = zMap[id] ?? 0;
        const zb = zMap[below] ?? 0;
        if (za === zb) {
          zMap[id] = clampZ(za - 1);
        } else {
          zMap[id] = zb;
          zMap[below] = za;
        }
        if (zMap[id] === 0) delete zMap[id];
        if (zMap[below] === 0) delete zMap[below];
        return { ...prev, layerZIndex: zMap };
      });
    },
    [enabled, onChangeData, rankedIds]
  );

  const bringToFront = useCallback(
    (id: string) => {
      if (!enabled) return;
      onChangeData((prev) => {
        const zMap = { ...(prev.layerZIndex ?? {}) };
        const vals = Object.values(zMap);
        const max = vals.length ? Math.max(0, ...vals) : 0;
        zMap[id] = clampZ(max + 1);
        return { ...prev, layerZIndex: zMap };
      });
    },
    [enabled, onChangeData]
  );

  const sendToBack = useCallback(
    (id: string) => {
      if (!enabled) return;
      onChangeData((prev) => {
        const zMap = { ...(prev.layerZIndex ?? {}) };
        const vals = Object.values(zMap);
        const min = vals.length ? Math.min(0, ...vals) : 0;
        zMap[id] = clampZ(min - 1);
        return { ...prev, layerZIndex: zMap };
      });
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
      layerZIndex: data.layerZIndex ?? {},
      data,
      select,
      setEditing,
      setOffset,
      registerLayer,
      unregisterLayer,
      setLayerZ,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
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
      registerLayer,
      unregisterLayer,
      setLayerZ,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      updateField,
      focusContentField,
    ]
  );

  return (
    <PosterEditContext.Provider value={value}>{children}</PosterEditContext.Provider>
  );
}

const NOOP_EDIT: PosterEditContextValue = {
  enabled: false,
  suppressChrome: true,
  scale: 1,
  selectedId: null,
  editingId: null,
  layerOffsets: {},
  layerZIndex: {},
  data: EMPTY_POSTER_DATA,
  select: () => {},
  setEditing: () => {},
  setOffset: () => {},
  registerLayer: () => {},
  unregisterLayer: () => {},
  setLayerZ: () => {},
  bringForward: () => {},
  sendBackward: () => {},
  bringToFront: () => {},
  sendToBack: () => {},
  updateField: () => {},
  focusContentField: () => {},
};

export function usePosterEdit(): PosterEditContextValue {
  const ctx = useContext(PosterEditContext);
  return ctx ?? NOOP_EDIT;
}

export { Z_MIN, Z_MAX };
