/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUGBOT_SHADOW_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Window interface for requestIdleCallback
interface Window {
  requestIdleCallback?: (
    callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void,
    options?: { timeout?: number }
  ) => number;
  cancelIdleCallback?: (id: number) => void;
}
