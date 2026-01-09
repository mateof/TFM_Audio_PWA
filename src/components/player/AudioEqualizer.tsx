import { useEffect, useRef, useCallback } from 'react';

interface AudioEqualizerProps {
  isPlaying: boolean;
}

export function AudioEqualizer({ isPlaying }: AudioEqualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>([]);
  const targetBarsRef = useRef<number[]>([]);
  const timeRef = useRef<number>(0);

  const BAR_COUNT = 24;

  // Initialize bars
  useEffect(() => {
    barsRef.current = Array(BAR_COUNT).fill(0);
    targetBarsRef.current = Array(BAR_COUNT).fill(0);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update time
    timeRef.current += 0.05;

    // Calculate bar dimensions
    const barWidth = (width / BAR_COUNT) - 3;
    const barGap = 3;
    const maxBarHeight = height - 30;

    // Update target values when playing
    if (isPlaying) {
      for (let i = 0; i < BAR_COUNT; i++) {
        // Create more natural frequency distribution
        // Lower frequencies (left) should be more prominent but not overwhelming
        // Mid frequencies should have good presence
        // High frequencies should be more subtle

        const normalizedIndex = i / BAR_COUNT;

        // Base amplitude varies by frequency band
        let baseAmplitude;
        if (normalizedIndex < 0.15) {
          // Sub-bass and bass (left bars) - moderate height
          baseAmplitude = 0.5 + Math.random() * 0.35;
        } else if (normalizedIndex < 0.4) {
          // Low-mid frequencies - highest activity
          baseAmplitude = 0.6 + Math.random() * 0.4;
        } else if (normalizedIndex < 0.7) {
          // Mid frequencies - good presence
          baseAmplitude = 0.4 + Math.random() * 0.45;
        } else {
          // High frequencies - more subtle
          baseAmplitude = 0.2 + Math.random() * 0.4;
        }

        // Add some wave motion for visual interest
        const wave = Math.sin(timeRef.current * 2 + i * 0.3) * 0.15;
        const wave2 = Math.sin(timeRef.current * 3.7 + i * 0.5) * 0.1;

        targetBarsRef.current[i] = Math.max(0.05, Math.min(1, baseAmplitude + wave + wave2));
      }
    } else {
      // When paused, bars should go down
      for (let i = 0; i < BAR_COUNT; i++) {
        targetBarsRef.current[i] = 0.02;
      }
    }

    // Smooth interpolation towards target values
    const smoothing = isPlaying ? 0.15 : 0.08;
    for (let i = 0; i < BAR_COUNT; i++) {
      barsRef.current[i] += (targetBarsRef.current[i] - barsRef.current[i]) * smoothing;
    }

    // Draw bars
    for (let i = 0; i < BAR_COUNT; i++) {
      const barHeight = Math.max(4, barsRef.current[i] * maxBarHeight);
      const x = i * (barWidth + barGap) + barGap;
      const y = height - barHeight - 10;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, y, x, height - 10);

      // Color intensity based on height
      const intensity = barsRef.current[i];
      if (intensity > 0.7) {
        gradient.addColorStop(0, '#34d399'); // emerald-400
        gradient.addColorStop(0.5, '#10b981'); // emerald-500
        gradient.addColorStop(1, '#059669'); // emerald-600
      } else if (intensity > 0.4) {
        gradient.addColorStop(0, '#10b981'); // emerald-500
        gradient.addColorStop(1, '#047857'); // emerald-700
      } else {
        gradient.addColorStop(0, '#059669'); // emerald-600
        gradient.addColorStop(1, '#065f46'); // emerald-800
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      ctx.fill();
    }

    // Draw reflection (subtle)
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < BAR_COUNT; i++) {
      const barHeight = Math.max(2, barsRef.current[i] * maxBarHeight * 0.3);
      const x = i * (barWidth + barGap) + barGap;
      const y = height - 8;

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
    ctx.globalAlpha = 1;

    animationRef.current = requestAnimationFrame(draw);
  }, [isPlaying]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      <p className="text-xs text-slate-400 mt-2">Audio Visualizer</p>
    </div>
  );
}
