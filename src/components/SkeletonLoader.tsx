import React, { useState, useEffect } from 'react';
import { ThemeMode } from '../types';

interface ThinkingSkeletonLoaderProps {
  theme: ThemeMode;
  startTime?: number;
  compact?: boolean;
}

export const ThinkingSkeletonLoader: React.FC<ThinkingSkeletonLoaderProps> = ({
  theme,
  startTime,
  compact = false,
}) => {
  const isDark = theme === 'dark';

  const [elapsed, setElapsed] = useState(() => {
    if (!startTime) return 0;
    return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  });

  useEffect(() => {
    const start = startTime || Date.now();
    const update = () => {
      const secs = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsed(secs);
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [startTime]);

  // If thinking > 5s: "Thinking for 6 s...", "Thinking for 7 s...", etc.
  // If <= 5s: "Thinking..."
  const label = elapsed > 5 ? `Thinking for ${elapsed} s...` : 'Thinking...';

  return (
    <div id="thinking-skeleton-loader" className="w-full select-none py-1 animate-smooth-in font-sans">
      {/* Header status text: clean minimal text with dynamic timer */}
      <div className="flex items-center gap-2">
        <span
          className={`text-[13.5px] sm:text-[14px] font-medium tracking-wide transition-colors animate-pulse-subtle ${
            isDark ? 'text-neutral-300' : 'text-neutral-700'
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

export const SkeletonMessageCard: React.FC<{ theme: ThemeMode; startTime?: number }> = ({
  theme,
  startTime,
}) => {
  return <ThinkingSkeletonLoader theme={theme} startTime={startTime} />;
};
