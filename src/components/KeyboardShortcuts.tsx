import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate("/bugs/new", { state: { from: window.location.pathname } });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return null;
}
