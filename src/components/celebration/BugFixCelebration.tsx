import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Award } from "lucide-react";
import { Bug } from "@/types";

interface BugFixCelebrationProps {
  bug: Bug | null;
  isVisible: boolean;
  onClose: () => void;
}

const getCreditsForPriority = (priority: 'high' | 'medium' | 'low'): number => {
  switch (priority) {
    case 'high': return 20;
    case 'medium': return 15;
    case 'low': return 10;
    default: return 10;
  }
};

// Heart balloon component
const HeartBalloon = ({ 
  delay, 
  x, 
  reducedMotion 
}: { 
  delay: number; 
  x: number; 
  reducedMotion: boolean;
}) => {
  return (
    <motion.div
      className="absolute bottom-0"
      style={{ left: `${x}%` }}
      initial={{ y: 0, opacity: 0, scale: 0 }}
      animate={{ 
        y: reducedMotion ? -100 : -window.innerHeight - 200, 
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0.8],
        rotate: reducedMotion ? 0 : [0, -10, 10, -5, 0],
      }}
      transition={{
        duration: reducedMotion ? 0.1 : 4,
        delay,
        ease: "easeOut",
        opacity: {
          times: [0, 0.1, 0.8, 1],
        },
        scale: {
          times: [0, 0.2, 0.8, 1],
        },
      }}
    >
      <motion.div
        animate={reducedMotion ? {} : {
          rotate: [0, -15, 15, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Heart className="w-12 h-12 text-pink-500 fill-pink-500 drop-shadow-lg" />
      </motion.div>
    </motion.div>
  );
};

// Confetti particle component
const ConfettiParticle = ({ 
  delay, 
  angle, 
  distance,
  color,
  reducedMotion
}: { 
  delay: number; 
  angle: number; 
  distance: number;
  color: string;
  reducedMotion: boolean;
}) => {
  const radians = (angle * Math.PI) / 180;
  const x = Math.cos(radians) * distance;
  const y = Math.sin(radians) * distance;

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}`,
      }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
      animate={{
        x: reducedMotion ? 0 : x,
        y: reducedMotion ? 0 : y,
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1.2, 0],
      }}
      transition={{
        duration: reducedMotion ? 0.1 : 2.5,
        delay,
        ease: "easeOut",
        opacity: {
          times: [0, 0.1, 0.7, 1],
        },
      }}
    />
  );
};

// Elegant sparkle effect
const Sparkle = ({ 
  delay, 
  position,
  reducedMotion,
  size = 'small'
}: { 
  delay: number; 
  position: { top: string; left: string; right?: string };
  reducedMotion: boolean;
  size?: 'small' | 'medium';
}) => {
  if (reducedMotion) return null;

  const sparkleSize = size === 'medium' ? 'w-1.5 h-1.5' : 'w-1 h-1';

  return (
    <motion.div
      className={`absolute ${sparkleSize} bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-400 rounded-full`}
      style={{
        ...position,
        filter: 'blur(0.5px)',
        boxShadow: '0 0 6px rgba(251, 191, 36, 0.8)',
      }}
      initial={{ scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        scale: [0, 1.8, 0],
        opacity: [0, 1, 0.8, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        delay: delay,
        ease: "easeInOut",
      }}
    />
  );
};

// Elegant love balloon for credits display
const LoveBalloon = ({ 
  index, 
  delay,
  reducedMotion 
}: { 
  index: number; 
  delay: number;
  reducedMotion: boolean;
}) => {
  // Premium color palette with gradients
  const colorSchemes = [
    { 
      fill: 'fill-pink-400', 
      stroke: 'text-pink-500', 
      glow: 'drop-shadow-[0_0_12px_rgba(236,72,153,0.7)]',
      sparkleColor: 'rgba(236,72,153,0.4)'
    },
    { 
      fill: 'fill-rose-400', 
      stroke: 'text-rose-500', 
      glow: 'drop-shadow-[0_0_12px_rgba(251,113,133,0.7)]',
      sparkleColor: 'rgba(251,113,133,0.4)'
    },
    { 
      fill: 'fill-fuchsia-400', 
      stroke: 'text-fuchsia-500', 
      glow: 'drop-shadow-[0_0_12px_rgba(232,121,249,0.7)]',
      sparkleColor: 'rgba(232,121,249,0.4)'
    },
    { 
      fill: 'fill-pink-300', 
      stroke: 'text-pink-400', 
      glow: 'drop-shadow-[0_0_12px_rgba(249,168,212,0.7)]',
      sparkleColor: 'rgba(249,168,212,0.4)'
    },
    { 
      fill: 'fill-red-400', 
      stroke: 'text-red-500', 
      glow: 'drop-shadow-[0_0_12px_rgba(248,113,113,0.7)]',
      sparkleColor: 'rgba(248,113,113,0.4)'
    },
  ];
  const colorScheme = colorSchemes[index % colorSchemes.length];
  const sizes = [14, 16, 18, 15, 17];
  const size = sizes[index % sizes.length];

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      initial={{ scale: 0, y: 20, opacity: 0, rotate: -90 }}
      animate={{ 
        scale: 1, 
        y: 0, 
        opacity: 1,
        rotate: 0,
      }}
      transition={{
        duration: reducedMotion ? 0.1 : 0.6,
        delay: delay,
        type: "spring",
        stiffness: 180,
        damping: 18,
      }}
    >
      {/* Elegant sparkles around the heart */}
      {!reducedMotion && (
        <>
          <Sparkle 
            delay={delay + 0.3} 
            position={{ top: '-4px', left: '4px' }} 
            reducedMotion={reducedMotion}
            size="small"
          />
          <Sparkle 
            delay={delay + 0.5} 
            position={{ top: '4px', right: '-4px', left: 'auto' }} 
            reducedMotion={reducedMotion}
            size="medium"
          />
          <Sparkle 
            delay={delay + 0.7} 
            position={{ top: '50%', left: '-4px' }} 
            reducedMotion={reducedMotion}
            size="small"
          />
        </>
      )}
      
      <motion.div
        className="relative"
        animate={reducedMotion ? {} : {
          y: [0, -5, 0],
          rotate: [0, -2, 2, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: delay * 0.1,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <motion.div
          animate={reducedMotion ? {} : {
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: delay * 0.15,
            ease: "easeInOut",
          }}
        >
          <Heart 
            className={`${colorScheme.fill} ${colorScheme.stroke} ${colorScheme.glow} filter transition-all duration-500`}
            style={{ 
              width: `${size}px`, 
              height: `${size}px`,
              filter: `${colorScheme.glow.replace('drop-shadow-', 'drop-shadow')}, brightness(1.1)`,
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Premium credits display with elegant love balloons
const CreditsCounter = ({ 
  credits, 
  reducedMotion 
}: { 
  credits: number; 
  reducedMotion: boolean;
}) => {
  const [visibleBalloons, setVisibleBalloons] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleBalloons(credits);
      return;
    }

    // Elegant sequential reveal animation
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current > credits) {
        clearInterval(interval);
      } else {
        setVisibleBalloons(current);
      }
    }, 100); // Smooth, elegant timing

    return () => clearInterval(interval);
  }, [credits, reducedMotion]);

  // Premium layout - 5 hearts per row for perfect symmetry
  const balloonsPerRow = 5;
  const rows = Math.ceil(credits / balloonsPerRow);

  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0.1 : 0.7,
        delay: 0.4,
        type: "spring",
        stiffness: 150,
        damping: 20,
      }}
    >
      <motion.div
        className="relative bg-gradient-to-br from-pink-500/90 via-rose-500/90 via-purple-500/90 to-orange-500/90 rounded-3xl px-8 py-7 shadow-2xl backdrop-blur-xl border border-white/30 overflow-hidden"
        animate={reducedMotion ? {} : {
          scale: [1, 1.015, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{
          boxShadow: '0 20px 60px rgba(236, 72, 153, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Subtle background shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <div className="relative flex flex-col items-center gap-4">
          {/* Premium header */}
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={reducedMotion ? {} : {
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Award className="w-5 h-5 text-white drop-shadow-lg" />
            </motion.div>
            <span className="text-white text-xs font-semibold tracking-[0.2em] uppercase">
              Earned Credits
            </span>
          </div>
          
          {/* Elegant love balloons grid */}
          <div className="flex flex-col items-center gap-2 py-3">
            {Array.from({ length: rows }).map((_, rowIndex) => {
              const startIndex = rowIndex * balloonsPerRow;
              const rowBalloons = Math.min(balloonsPerRow, credits - startIndex);
              
              return (
                <motion.div 
                  key={rowIndex}
                  className="flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rowIndex * 0.2 }}
                >
                  {Array.from({ length: rowBalloons }).map((_, colIndex) => {
                    const balloonIndex = startIndex + colIndex;
                    const isVisible = balloonIndex < visibleBalloons;
                    
                    return isVisible ? (
                      <LoveBalloon
                        key={balloonIndex}
                        index={balloonIndex}
                        delay={balloonIndex * 0.1}
                        reducedMotion={reducedMotion}
                      />
                    ) : (
                      <div 
                        key={balloonIndex}
                        className="w-4 h-4"
                      />
                    );
                  })}
                </motion.div>
              );
            })}
          </div>

          {/* Premium credits summary */}
          <motion.div
            className="flex items-center gap-2 mt-2 px-4 py-2 bg-white/25 backdrop-blur-md rounded-full border border-white/30"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ 
              opacity: visibleBalloons === credits ? 1 : 0,
              y: visibleBalloons === credits ? 0 : 8,
              scale: visibleBalloons === credits ? 1 : 0.9,
            }}
            transition={{ 
              duration: 0.5, 
              delay: credits * 0.1 + 0.2,
              type: "spring",
              stiffness: 200,
            }}
            style={{
              boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)',
            }}
          >
            <span className="text-white text-xl font-bold tracking-tight">+{credits}</span>
            <span className="text-white/90 text-sm font-medium">credits</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const BugFixCelebration = ({ bug, isVisible, onClose }: BugFixCelebrationProps) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const credits = bug ? getCreditsForPriority(bug.priority) : 10;

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Auto-close after animation completes
    const timer = setTimeout(() => {
      onClose();
    }, reducedMotion ? 500 : 4500);

    return () => clearTimeout(timer);
  }, [isVisible, onClose, reducedMotion]);

  // Generate heart balloon positions
  const heartPositions = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.15,
    x: (i * 8) + 5 + Math.random() * 5,
  }));

  // Generate confetti particles
  const confettiColors = [
    '#FF6B9D', // Pink
    '#FFA500', // Orange
    '#9370DB', // Purple
    '#FFD700', // Gold
    '#00CED1', // Turquoise
    '#FF69B4', // Hot Pink
  ];

  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    delay: (i % 10) * 0.05,
    angle: (i * 360) / 50 + Math.random() * 30,
    distance: 300 + Math.random() * 200,
    color: confettiColors[i % confettiColors.length],
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.3 }}
          onClick={onClose}
        >
          {/* Premium gradient background with depth */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-purple-900/40 to-pink-900/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.4 }}
          />
          
          {/* Subtle animated overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-purple-500/10"
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Floating heart balloons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {heartPositions.map((pos, index) => (
              <HeartBalloon
                key={index}
                delay={pos.delay}
                x={pos.x}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          {/* Confetti particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiParticles.map((particle, index) => (
              <ConfettiParticle
                key={index}
                delay={particle.delay}
                angle={particle.angle}
                distance={particle.distance}
                color={particle.color}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          {/* Main celebration content */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center gap-10 px-6 py-8"
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{
              duration: reducedMotion ? 0.1 : 0.7,
              type: "spring",
              stiffness: 150,
              damping: 22,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Elegant success icon with premium animation */}
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                duration: reducedMotion ? 0.1 : 0.8,
                delay: 0.2,
                type: "spring",
                stiffness: 150,
                damping: 18,
              }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-green-400/30 via-emerald-400/30 to-teal-400/30 rounded-full blur-2xl"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 0.8, 0.6],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              <motion.div
                className="relative w-36 h-36 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-full flex items-center justify-center shadow-2xl"
                animate={reducedMotion ? {} : {
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{
                  boxShadow: '0 20px 60px rgba(16, 185, 129, 0.4), inset 0 0 60px rgba(255, 255, 255, 0.1)',
                }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.5,
                    duration: reducedMotion ? 0.1 : 0.4,
                    type: "spring",
                    stiffness: 200,
                  }}
                >
                  <Sparkles className="w-20 h-20 text-white drop-shadow-lg" strokeWidth={1.5} />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Elegant title with premium typography */}
            <motion.h1
              className="text-6xl md:text-7xl font-extrabold text-white text-center tracking-tight"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.4,
                duration: reducedMotion ? 0.1 : 0.6,
                type: "spring",
                stiffness: 100,
              }}
              style={{
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 255, 255, 0.1)',
                background: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Bug Fixed!
            </motion.h1>

            {/* Elegant subtitle */}
            <motion.p
              className="text-xl md:text-2xl text-gray-200 text-center max-w-lg font-medium tracking-wide"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.5,
                duration: reducedMotion ? 0.1 : 0.6,
              }}
            >
              Excellent work! Your contribution makes a difference.
            </motion.p>

            {/* Credits display */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.5,
                duration: reducedMotion ? 0.1 : 0.5,
              }}
            >
              <CreditsCounter credits={credits} reducedMotion={reducedMotion} />
            </motion.div>

            {/* Elegant close hint */}
            <motion.p
              className="text-sm text-gray-400/80 text-center mt-6 font-light tracking-wide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 1.2,
                duration: reducedMotion ? 0.1 : 0.5,
              }}
            >
              Tap anywhere to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

