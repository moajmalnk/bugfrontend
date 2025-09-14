import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const { currentUser } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // // console.log('Key pressed:', e.key, 'Code:', e.code, 'Shift:', e.shiftKey, 'Ctrl:', e.ctrlKey);
      if (e.ctrlKey && !e.shiftKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate(`/${currentUser?.role}/bugs/new`, { state: { from: window.location.pathname } });
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        navigate(`/${currentUser?.role}/bugs`, { state: { from: window.location.pathname } });
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        navigate(`/${currentUser?.role}/fixes`, { state: { from: window.location.pathname } });
      }
      // Shortcut for New Update: Ctrl + U
      if (e.ctrlKey && !e.shiftKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        navigate(`/${currentUser?.role}/new-update`, { state: { from: window.location.pathname } });
      }
      // Shortcut for Updates page: Ctrl + Shift + U
      if (e.ctrlKey && e.shiftKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        navigate(`/${currentUser?.role}/updates`, { state: { from: window.location.pathname } });
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
        navigate(`/${currentUser?.role}/settings`, { state: { from: window.location.pathname } });
      }
      // Shortcut for Profile: Ctrl + Shift + P
      if (e.ctrlKey && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        navigate(`/${currentUser?.role}/profile`, { state: { from: window.location.pathname } });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, theme, currentUser?.role]);

  return null;
}
