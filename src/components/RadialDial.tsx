import React, { useRef, useState, useCallback } from 'react';
import { ThemeColors } from '../types';

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
  showTicks = true,
  tickLength = 'normal',
  fontFamily = 'system-ui',
  timeScale = 1.0,
  stylePreset = 'neon',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  const radius = size / 2;
  const strokeWidth = 5;
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
    } catch {}
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
    } catch {}
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
          <radialGradient id="dialInnerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#000000" stopOpacity="0.4" />
            <stop offset="100%" stopColor={theme.accent} stopOpacity="0.08" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Inner shadow/glow circle */}
        <circle
          cx={radius}
          cy={radius}
          r={dialRadius - 2}
          fill="url(#dialInnerGlow)"
        />

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
              stroke={t.isActive ? theme.accent : "#ffffff"}
              strokeWidth={t.isMajor ? 2.0 : 0.9}
              strokeOpacity={t.isActive ? 1.0 : t.isMajor ? 0.45 : 0.20}
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
          filter="url(#glow)"
          style={{ transition: dragProgress !== null ? 'none' : 'stroke-dasharray 0.8s ease' }}
        />

        {/* Dieter Rams Swiss Precision Numerals: 12, 3, 6, 9 */}
        <g opacity={0.45} fontSize={11} fontWeight={600} fontFamily="Inter, -apple-system, sans-serif" fill="#ffffff" textAnchor="middle" dominantBaseline="middle">
          <text x={radius} y={radius - dialRadius + 22}>12</text>
          <text x={radius + dialRadius - 22} y={radius}>3</text>
          <text x={radius} y={radius + dialRadius - 22}>6</text>
          <text x={radius - dialRadius + 22} y={radius}>9</text>
        </g>

        {/* Reference marker at 9 o'clock (square indicator) */}
        {stylePreset !== 'vintage' && (
          <rect
            x={markerX - 4}
            y={markerY - 4}
            width={8}
            height={8}
            fill="#9ba3b4"
            opacity={0.7}
            rx={1}
          />
        )}

        {/* Active Draggable Circular Knob Handle */}
        <circle
          cx={knobX}
          cy={knobY}
          r={7.5}
          fill="#e2e8f0"
          stroke={theme.accent}
          strokeWidth={2.5}
          className="transition-transform duration-75 shadow-lg"
          style={{
            filter: `drop-shadow(0 0 6px ${theme.accentGlow})`,
          }}
        />
      </svg>

      {/* Center Labels */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span
          className="font-extrabold tracking-tight"
          style={{
            color: theme.text,
            fontSize: `${36 * timeScale}px`,
            fontFamily:
              fontFamily === 'mono'
                ? 'ui-monospace, monospace'
                : fontFamily === 'cyber'
                ? 'Courier New, monospace'
                : 'system-ui, -apple-system, sans-serif',
          }}
        >
          {primaryText}
        </span>
        {secondaryText && (
          <span
            className="font-mono font-medium tracking-widest mt-1 opacity-80"
            style={{
              color: theme.subtext,
              fontSize: `${12 * timeScale}px`,
            }}
          >
            {secondaryText}
          </span>
        )}
      </div>
    </div>
  );
};
