import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface GlobalSearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  onCloseSidebar?: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function GlobalSearchProvider({
  children,
  onCloseSidebar,
}: {
  children: ReactNode;
  onCloseSidebar?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <GlobalSearchContext.Provider
      value={{ open, setOpen, toggle, onCloseSidebar }}
    >
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearchModal() {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error(
      "useGlobalSearchModal must be used within GlobalSearchProvider"
    );
  }
  return ctx;
}
