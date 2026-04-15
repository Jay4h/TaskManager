'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AuraVisualizerProps {
  className?: string;
  isSpeaking?: boolean;
  volume?: number; // 0 to 1
  color?: string;
}

/**
 * AuraVisualizer - A premium reactive visualizer inspired by LiveKit Agents UI.
 * It uses multiple layered circles that undulate based on audio levels.
 */
export function AuraVisualizer({ 
  className, 
  isSpeaking = false, 
  volume = 0, 
  color = '#6366f1' // Default indigo-500
}: AuraVisualizerProps) {
  
  // Calculate wave scales based on volume
  // Scale range: 1.0 (silent) to 2.5 (very loud)
  const baseScale = 1 + (volume * 1.2);
  
  const waves = useMemo(() => [
    { delay: 0, opacity: 0.15, scaleMult: 1.0 },
    { delay: 0.2, opacity: 0.10, scaleMult: 1.4 },
    { delay: 0.4, opacity: 0.05, scaleMult: 1.8 },
  ], []);

  return (
    <div className={cn("relative flex items-center justify-center pointer-events-none", className)}>
      <AnimatePresence>
        {waves.map((wave, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              backgroundColor: color,
              width: '200px',
              height: '200px',
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ 
              scale: baseScale * wave.scaleMult,
              opacity: isSpeaking ? wave.opacity : 0.02,
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              mass: 1,
              delay: wave.delay,
            }}
          />
        ))}
      </AnimatePresence>
      
      {/* Center Glow */}
      <motion.div
        className="relative z-10 w-24 h-24 rounded-full shadow-[0_0_50px_rgba(99,102,241,0.3)] transition-all duration-500"
        style={{
          backgroundColor: color,
          opacity: isSpeaking ? 0.8 : 0.4,
          boxShadow: isSpeaking 
            ? `0 0 80px ${color}66` 
            : `0 0 40px ${color}33`,
        }}
        animate={{
          scale: 1 + (volume * 0.2),
        }}
      />
    </div>
  );
}
