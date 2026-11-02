import { useCallback, useEffect, useRef, useState } from 'react';
import type { PosterPaletteKey } from '../brand/brandKit';
import type { PosterData, PosterTemplateKey } from '../types';

export type PosterStudioSnapshot = {
  data: PosterData;
  templateKey: PosterTemplateKey;
  paletteKey: PosterPaletteKey;
};

type SetDataOptions = {
  /** Skip undo recording (auto-prefill, remote load). Default true. */
  record?: boolean;
};

const MAX_HISTORY = 40;
const COALESCE_MS = 400;

function cloneSnapshot(s: PosterStudioSnapshot): PosterStudioSnapshot {
  return {
    data: structuredClone(s.data),
    templateKey: s.templateKey,
    paletteKey: s.paletteKey,
  };
}

/**
 * Why: Drag and typing fire many setState calls — coalesce into one undo step
 * so Cmd/Ctrl+Z restores a meaningful edit, not a single pixel of drag.
 */
export function usePosterHistory(initial: PosterStudioSnapshot) {
  const [data, setDataRaw] = useState<PosterData>(initial.data);
  const [templateKey, setTemplateKeyRaw] = useState<PosterTemplateKey>(initial.templateKey);
  const [paletteKey, setPaletteKeyRaw] = useState<PosterPaletteKey>(initial.paletteKey);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const snapRef = useRef<PosterStudioSnapshot>(initial);
  snapRef.current = { data, templateKey, paletteKey };

  const pastRef = useRef<PosterStudioSnapshot[]>([]);
  const futureRef = useRef<PosterStudioSnapshot[]>([]);
  /** First state in the current coalesce window (pre-edit). */
  const coalesceBaseRef = useRef<PosterStudioSnapshot | null>(null);
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncButtons = useCallback(() => {
    setCanUndo(pastRef.current.length > 0 || coalesceBaseRef.current != null);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const clearCoalesceTimer = () => {
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
  };

  const commitCoalesce = useCallback(() => {
    clearCoalesceTimer();
    const base = coalesceBaseRef.current;
    if (!base) return;
    coalesceBaseRef.current = null;
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), base];
    futureRef.current = [];
    syncButtons();
  }, [syncButtons]);

  const scheduleRecord = useCallback(() => {
    if (!coalesceBaseRef.current) {
      coalesceBaseRef.current = cloneSnapshot(snapRef.current);
      setCanUndo(true);
      setCanRedo(false);
      futureRef.current = [];
    }
    clearCoalesceTimer();
    coalesceTimerRef.current = setTimeout(() => {
      commitCoalesce();
    }, COALESCE_MS);
  }, [commitCoalesce]);

  useEffect(() => () => clearCoalesceTimer(), []);

  const setData = useCallback(
    (updater: PosterData | ((prev: PosterData) => PosterData), opts?: SetDataOptions) => {
      if (opts?.record !== false) scheduleRecord();
      setDataRaw((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    },
    [scheduleRecord]
  );

  const setTemplateKey = useCallback(
    (key: PosterTemplateKey, opts?: SetDataOptions) => {
      if (opts?.record !== false) scheduleRecord();
      setTemplateKeyRaw(key);
    },
    [scheduleRecord]
  );

  const setPaletteKey = useCallback(
    (key: PosterPaletteKey, opts?: SetDataOptions) => {
      if (opts?.record !== false) scheduleRecord();
      setPaletteKeyRaw(key);
    },
    [scheduleRecord]
  );

  /** Apply template + palette together as one undo step. */
  const applyTemplate = useCallback(
    (
      nextTemplate: PosterTemplateKey,
      nextPalette: PosterPaletteKey,
      nextData?: (prev: PosterData) => PosterData,
      opts?: SetDataOptions
    ) => {
      if (opts?.record !== false) scheduleRecord();
      setTemplateKeyRaw(nextTemplate);
      setPaletteKeyRaw(nextPalette);
      if (nextData) setDataRaw(nextData);
    },
    [scheduleRecord]
  );

  const undo = useCallback(() => {
    commitCoalesce();
    const prev = pastRef.current.pop();
    if (!prev) {
      syncButtons();
      return;
    }
    futureRef.current = [
      ...futureRef.current,
      cloneSnapshot(snapRef.current),
    ].slice(-MAX_HISTORY);
    setDataRaw(prev.data);
    setTemplateKeyRaw(prev.templateKey);
    setPaletteKeyRaw(prev.paletteKey);
    syncButtons();
  }, [commitCoalesce, syncButtons]);

  const redo = useCallback(() => {
    clearCoalesceTimer();
    coalesceBaseRef.current = null;
    const next = futureRef.current.pop();
    if (!next) {
      syncButtons();
      return;
    }
    pastRef.current = [
      ...pastRef.current,
      cloneSnapshot(snapRef.current),
    ].slice(-MAX_HISTORY);
    setDataRaw(next.data);
    setTemplateKeyRaw(next.templateKey);
    setPaletteKeyRaw(next.paletteKey);
    syncButtons();
  }, [syncButtons]);

  const resetHistory = useCallback(() => {
    clearCoalesceTimer();
    coalesceBaseRef.current = null;
    pastRef.current = [];
    futureRef.current = [];
    syncButtons();
  }, [syncButtons]);

  return {
    data,
    setData,
    templateKey,
    setTemplateKey,
    paletteKey,
    setPaletteKey,
    applyTemplate,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  };
}
