import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#FBBF24', '#F87171', '#60A5FA', '#34D399', '#A78BFA', '#F472B6'];

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

export const MotionConfetti: React.FC<{ active: boolean }> = ({ active }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage
        y: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 6 + 6,
        rotation: Math.random() * 360
      }));
      setPieces(newPieces);

      // Clean up after animation
      const timer = setTimeout(() => {
        setPieces([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active && pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 1, 
              x: 0,
              y: 0,
              scale: 0,
              rotate: 0 
            }}
            animate={{ 
              opacity: 0,
              x: (Math.random() - 0.5) * 400, // explode outwards
              y: (Math.random() - 0.5) * 400 + 200, // explode and fall down
              scale: 1,
              rotate: p.rotation + 360 
            }}
            transition={{ 
              duration: 1.5 + Math.random(), 
              ease: "easeOut" 
            }}
            className="absolute rounded-sm"
            style={{
              backgroundColor: p.color,
              width: p.size,
              height: p.size,
              left: '50%',
              top: '50%',
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
