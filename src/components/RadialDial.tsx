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
          style={{ transition: dragProgress !== null ? 'none' : 'stroke-dasharray 0.8s ease' }}
        />

        {/* Dieter Rams Swiss Precision Numerals: 12, 3, 6, 9 */}
        <g opacity={0.5} fontSize={10} fontWeight={500} fontFamily="'JetBrains Mono', ui-monospace, monospace" fill={theme.subtext} textAnchor="middle" dominantBaseline="middle">
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

      {/* Center Labels */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span
          className="font-semibold tracking-tight tabular-nums"
          style={{
            color: theme.text,
            fontSize: `${34 * timeScale}px`,
            fontFamily: fontFamily === 'cyber'
              ? 'Courier New, monospace'
              : "'JetBrains Mono', ui-monospace, monospace",
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
