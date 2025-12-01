import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const { currentUser } = useAuth();

  // Production-safe navigation helper
  const safeNavigate = (path: string) => {
    // In production, use window.location for reliable navigation from BugDetails
    if (import.meta.env.PROD && window.location.pathname.includes('/bugs/')) {
      window.location.href = path;
    } else {
      navigate(path, { state: { from: window.location.pathname } });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // // console.log('Key pressed:', e.key, 'Code:', e.code, 'Shift:', e.shiftKey, 'Ctrl:', e.ctrlKey);
      if (e.ctrlKey && !e.shiftKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        safeNavigate(`/${currentUser?.role}/bugs/new`);
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        safeNavigate(`/${currentUser?.role}/bugs`);
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        safeNavigate(`/${currentUser?.role}/fixes`);
      }
      // Shortcut for New Update: Ctrl + U
      if (e.ctrlKey && !e.shiftKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        safeNavigate(`/${currentUser?.role}/new-update`);
      }
      // Shortcut for Updates page: Ctrl + Shift + U
      if (e.ctrlKey && e.shiftKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        safeNavigate(`/${currentUser?.role}/updates`);
      }
      if (e.shiftKey && e.code === "Space") {
        e.preventDefault();
        // // console.log('Shift+Space pressed. Toggling theme.');
        // // console.log('Current theme before toggle:', theme);
        setTheme(theme === "dark" ? "light" : "dark");
        // // console.log('Theme toggled.');
      }
      // Shortcut for Settings: Ctrl + Shift + S
      if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        safeNavigate(`/${currentUser?.role}/settings`);
      }
      // Shortcut for Profile: Ctrl + Shift + P
      if (e.ctrlKey && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        safeNavigate(`/${currentUser?.role}/profile`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, theme, currentUser?.role]);

  return null;
}
