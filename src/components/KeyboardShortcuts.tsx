import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // // console.log('Key pressed:', e.key, 'Code:', e.code, 'Shift:', e.shiftKey, 'Ctrl:', e.ctrlKey);
      if (e.ctrlKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate("/bugs/new", { state: { from: window.location.pathname } });
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        navigate("/fixes", { state: { from: window.location.pathname } });
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
        navigate('/settings', { state: { from: window.location.pathname } });
      }
      // Shortcut for Profile: Ctrl + Shift + P
      if (e.ctrlKey && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        navigate('/profile', { state: { from: window.location.pathname } });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, theme]);

  return null;
}
