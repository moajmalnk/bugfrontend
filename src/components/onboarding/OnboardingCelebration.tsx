import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface OnboardingCelebrationProps {
  name: string;
  isVisible: boolean;
  onDone: () => void;
}

/**
 * Why: Brief celebratory handoff after mandatory onboarding so the unlock
 * into the dashboard feels intentional rather than an abrupt modal dismiss.
 */
export function OnboardingCelebration({
  name,
  isVisible,
  onDone,
}: OnboardingCelebrationProps) {
  useEffect(() => {
    if (!isVisible) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion) {
      const end = Date.now() + 1800;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#2563eb", "#22c55e", "#f59e0b", "#ec4899"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#2563eb", "#22c55e", "#f59e0b", "#ec4899"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }

    const timer = window.setTimeout(() => onDone(), 2500);
    return () => window.clearTimeout(timer);
  }, [isVisible, onDone]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="px-6 text-center"
            initial={{ scale: 0.85, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Workspace ready
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground text-balance">
              Welcome to the Team, {name}!
            </h1>
            <p className="mt-4 text-muted-foreground">
              Taking you to your BugRicer dashboard…
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
