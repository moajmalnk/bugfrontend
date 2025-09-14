import React from "react";

export function PrivacyOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9999,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backdropFilter: "blur(12px)",
        background: "rgba(0,0,0,0.2)",
        pointerEvents: "auto",
      }}
      tabIndex={-1}
      aria-label="Privacy Mode On"
    />
  );
}
