import React, { useRef, useState, useCallback } from 'react';
import { ThemeColors, ClockStyle } from '../types';

interface RadialDialProps {
  theme: ThemeColors;
  progress: number; // 0 to 1
  primaryText: string;
  secondaryText?: string;
  isInteractive?: boolean;
  onProgressChange?: (newProgress: number) => void;
  onProgressCommit?: (finalProgress: number) => void;
  size?: number;
  showTicks?: boolean;
  tickLength?: 'short' | 'normal' | 'long';
  fontFamily?: string;
  timeScale?: number;
  stylePreset?: 'neon' | 'vintage' | 'chronograph' | 'minimal';
  /** Halo strength around the progress arc; 'none' keeps it flat. */
  glowIntensity?: 'none' | 'subtle' | 'high';
  clockStyle?: ClockStyle;
}

export const RadialDial: React.FC<RadialDialProps> = ({
  theme,
  progress,
  primaryText,
  secondaryText,
  isInteractive = true,
  onProgressChange,
  onProgressCommit,
  size = 180,
  showTicks = false,
  tickLength = 'normal',
  fontFamily = 'system-ui',
  timeScale = 1.0,
  stylePreset = 'neon',
  glowIntensity = 'none',
  clockStyle = 'digital',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  const radius = size / 2;
  // Winter uses hairline geometry: the ring reads as a drawn line, not a tube.
  const strokeWidth = stylePreset === 'minimal' ? 2 : 5;
  const dialRadius = radius - 18;
  const circumference = 2 * Math.PI * dialRadius;
  const activeProgress = dragProgress !== null ? dragProgress : Math.max(0, Math.min(1, progress));
  // SVG strokeDasharray and strokeDashoffset:
  // When activeProgress = 0.5 (30m), dasharray is [halfCircumference, circumference]
  const arcLength = activeProgress * circumference;
  // Knob coordinate calculations (-90 deg offset so 0 starts at top)
  const angle = activeProgress * 2 * Math.PI - Math.PI / 2;
  const knobX = radius + dialRadius * Math.cos(angle);
  const knobY = radius + dialRadius * Math.sin(angle);

  // Secondary marker (as in reference image at 270 deg / 9 o'clock position)
  const markerAngle = Math.PI; // 9 o'clock
  const markerX = radius + dialRadius * Math.cos(markerAngle);
  const markerY = radius + dialRadius * Math.sin(markerAngle);

  // Convert mouse/touch event into 0..1 circular progress
  const calculateProgressFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // atan2 returns angle in [-PI, PI], 0 is at (1, 0)
      let theta = Math.atan2(dy, dx) + Math.PI / 2;
      if (theta < 0) theta += 2 * Math.PI;
      const p = Math.max(0, Math.min(1, theta / (2 * Math.PI)));
      setDragProgress(p);
      onProgressChange?.(p);
    },
    [onProgressChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isInteractive) return;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort: dragging still works without it.
    }
    calculateProgressFromEvent(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragProgress === null || !isInteractive) return;
    calculateProgressFromEvent(e.clientX, e.clientY);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragProgress !== null) {
      const finalP = dragProgress;
      onProgressCommit?.(finalP);
      setDragProgress(null);
    }
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // Capture may already be gone if the pointer left the window.
    }
  };

  // Generate 60 tick marks radiating inward
  const totalTicks = 60;
  const ticks = Array.from({ length: totalTicks }, (_, i) => {
    const tickAngle = (i / totalTicks) * 2 * Math.PI - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const tickOffset = tickLength === 'short' ? 8 : tickLength === 'long' ? 26 : 18;
    const outerR = dialRadius - 6;
    const innerR = isMajor ? dialRadius - tickOffset : dialRadius - Math.max(6, tickOffset - 8);

    const x1 = radius + outerR * Math.cos(tickAngle);
    const y1 = radius + outerR * Math.sin(tickAngle);
    const x2 = radius + innerR * Math.cos(tickAngle);
    const y2 = radius + innerR * Math.sin(tickAngle);

    const tickProgress = i / totalTicks;
    const isActive = tickProgress <= activeProgress;

    return {
      id: i,
      x1,
      y1,
      x2,
      y2,
      isMajor,
      isActive,
    };
  });

  return (
    <div className="relative flex items-center justify-center select-none">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className={`touch-none ${isInteractive ? 'cursor-pointer' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          {/* A real blur filter rather than a CSS shadow, so the halo follows
              the arc's own geometry at any dial size. */}
          {glowIntensity !== 'none' && (
            <filter id="alarmer-dial-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur
                stdDeviation={glowIntensity === 'high' ? 4 : 2}
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Outer Background Track */}
        <circle
          cx={radius}
          cy={radius}
          r={dialRadius}
          stroke={theme.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Ticks radiating inward */}
        {showTicks &&
          ticks.map((t) => (
            <line
              key={t.id}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={theme.ticks}
              strokeWidth={t.isMajor ? 1.2 : 0.75}
              strokeOpacity={t.isActive ? (t.isMajor ? 0.85 : 0.5) : t.isMajor ? 0.4 : 0.18}
              strokeLinecap="round"
            />
          ))}

        {/* Progress Arc */}
        <circle
          cx={radius}
          cy={radius}
          r={dialRadius}
          stroke={theme.ringProgress}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${radius} ${radius})`}
          filter={glowIntensity !== 'none' ? 'url(#alarmer-dial-glow)' : undefined}
          style={{ transition: dragProgress !== null ? 'none' : 'stroke-dasharray 0.8s ease' }}
        />

        {/* Dieter Rams Swiss Precision Numerals: 12, 3, 6, 9 (only when showTicks) */}
        {showTicks && (
          <g opacity={0.5} fontSize={10} fontWeight={500} fontFamily="'JetBrains Mono', ui-monospace, monospace" fill={theme.subtext} textAnchor="middle" dominantBaseline="middle">
            <text x={radius} y={radius - dialRadius + 22}>12</text>
            <text x={radius + dialRadius - 22} y={radius}>3</text>
            <text x={radius} y={radius + dialRadius - 22}>6</text>
            <text x={radius - dialRadius + 22} y={radius}>9</text>
          </g>
        )}

        {/* Reference marker at 9 o'clock (square indicator) */}
        {showTicks && stylePreset !== 'vintage' && (
          <rect
            x={markerX - 4}
            y={markerY - 4}
            width={8}
            height={8}
            fill={theme.subtext}
            opacity={0.55}
            rx={1}
          />
        )}

        {/* Active Draggable Circular Knob Handle */}
        <circle
          cx={knobX}
          cy={knobY}
          r={7.5}
          fill={theme.bg}
          stroke={theme.accent}
          strokeWidth={2}
          className="transition-transform duration-75"
        />
      </svg>

      {/* Center Display according to clockStyle */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none">
        {clockStyle === 'digital' && (
          <div className="flex flex-col items-center justify-center transition-transform duration-300 transform scale-100">
            <span
              className="font-semibold tracking-tight tabular-nums animate-pulse-subtle"
              style={{
                color: theme.text,
                fontSize: `${36 * timeScale}px`,
                fontFamily: fontFamily === 'cyber'
                  ? 'Courier New, monospace'
                  : "'JetBrains Mono', ui-monospace, monospace",
              }}
            >
              {primaryText}
            </span>
            {secondaryText && (
              <span
                className="font-mono font-medium tracking-widest mt-1 opacity-70"
                style={{
                  color: theme.subtext,
                  fontSize: `${12 * timeScale}px`,
                }}
              >
                {secondaryText}
              </span>
            )}
          </div>
        )}

        {clockStyle === 'classic' && (
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            {/* Clock hands */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${size} ${size}`}>
              {/* Hour hand */}
              <line
                x1={radius}
                y1={radius}
                x2={radius + 35 * Math.sin(((activeProgress * 360) / 12) * (Math.PI / 180))}
                y2={radius - 35 * Math.cos(((activeProgress * 360) / 12) * (Math.PI / 180))}
                stroke={theme.subtext}
                strokeWidth={3.5}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
              {/* Minute hand */}
              <line
                x1={radius}
                y1={radius}
                x2={radius + 55 * Math.sin((activeProgress * 360) * (Math.PI / 180))}
                y2={radius - 55 * Math.cos((activeProgress * 360) * (Math.PI / 180))}
                stroke={theme.accent}
                strokeWidth={2.5}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
              {/* Center pivot point */}
              <circle cx={radius} cy={radius} r={4.5} fill={theme.accent} />
            </svg>
            <div className="z-10 mt-14 flex flex-col items-center">
              <span
                className="font-mono text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${theme.cardBg}cc`, color: theme.text }}
              >
                {primaryText}
              </span>
            </div>
          </div>
        )}

        {clockStyle === 'sand' && (
          <div className="flex flex-col items-center justify-center transition-all duration-300">
            {/* Hourglass Sand animation representation */}
            <div className="relative w-14 h-16 flex flex-col items-center justify-between mb-1">
              {/* Top glass cone */}
              <div
                className="w-12 h-7 border-t-2 border-l-2 border-r-2 rounded-t-xl overflow-hidden relative"
                style={{ borderColor: theme.border }}
              >
                <div
                  className="absolute bottom-0 inset-x-0 transition-all duration-500 ease-linear"
                  style={{
                    height: `${Math.max(0, activeProgress) * 100}%`,
                    backgroundColor: theme.accent,
                    opacity: 0.85,
                  }}
                />
              </div>
              {/* Middle trickle */}
              <div
                className="w-0.5 h-2 transition-opacity duration-300"
                style={{
                  backgroundColor: theme.accent,
                  opacity: activeProgress > 0 ? 0.9 : 0,
                }}
              />
              {/* Bottom glass cone */}
              <div
                className="w-12 h-7 border-b-2 border-l-2 border-r-2 rounded-b-xl overflow-hidden relative"
                style={{ borderColor: theme.border }}
              >
                <div
                  className="absolute bottom-0 inset-x-0 transition-all duration-500 ease-linear"
                  style={{
                    height: `${Math.max(0, 1 - activeProgress) * 100}%`,
                    backgroundColor: theme.accent,
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
            <span
              className="font-mono text-sm font-semibold tabular-nums tracking-wider mt-1"
              style={{ color: theme.text }}
            >
              {primaryText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
