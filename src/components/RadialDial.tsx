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
          <div className="flex flex-col items-center justify-center select-none">
            {/* Sleek SVG Hourglass */}
            <div className="relative w-20 h-24 flex items-center justify-center">
              <svg width="72" height="88" viewBox="0 0 72 88" fill="none" className="overflow-visible">
                <defs>
                  {/* Glass reflections & gradients */}
                  <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                    <stop offset="40%" stopColor="#ffffff" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
                  </linearGradient>

                  <linearGradient id="sandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={theme.accent} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={theme.accent} stopOpacity="0.75" />
                  </linearGradient>

                  {/* Top bulb clip path */}
                  <clipPath id="topBulbClip">
                    <path d="M 12 12 Q 12 36, 34 43 L 38 43 Q 60 36, 60 12 Z" />
                  </clipPath>

                  {/* Bottom bulb clip path */}
                  <clipPath id="bottomBulbClip">
                    <path d="M 34 45 L 38 45 Q 60 52, 60 76 L 12 76 Q 12 52, 34 45 Z" />
                  </clipPath>

                  {/* Filter for glowing sand */}
                  <filter id="sandGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Top and Bottom Caps (Metallic frames) */}
                <rect x="8" y="7" width="56" height="4" rx="2" fill={theme.text} opacity="0.4" />
                <rect x="8" y="77" width="56" height="4" rx="2" fill={theme.text} opacity="0.4" />

                {/* Side Support Pillars */}
                <line x1="10" y1="10" x2="10" y2="78" stroke={theme.text} strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
                <line x1="62" y1="10" x2="62" y2="78" stroke={theme.text} strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />

                {/* Outer Glass Flask Body */}
                <path
                  d="M 12 11 Q 12 37, 34 44 L 38 44 Q 60 37, 60 11 Z
                     M 34 44 L 38 44 Q 60 51, 60 77 L 12 77 Q 12 51, 34 44 Z"
                  fill="url(#glassGrad)"
                  stroke={theme.text}
                  strokeWidth="1.5"
                  strokeOpacity="0.35"
                  strokeLinejoin="round"
                />

                {/* Inner sand top bulb (drains down) */}
                <g clipPath="url(#topBulbClip)">
                  <rect
                    x="10"
                    y={11 + (1 - Math.max(0, Math.min(1, activeProgress))) * 33}
                    width="52"
                    height="35"
                    fill="url(#sandGrad)"
                    filter="url(#sandGlow)"
                    className="transition-all duration-300"
                  />
                </g>

                {/* Sand trickle stream (animated falling sand) */}
                {activeProgress > 0 && activeProgress < 1 && (
                  <>
                    <line
                      x1="36"
                      y1="43"
                      x2="36"
                      y2="76"
                      stroke={theme.accent}
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                    <circle cx="36" cy="50" r="1.2" fill="#ffffff" opacity="0.8">
                      <animate attributeName="cy" values="44;74" dur="0.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0.2" dur="0.6s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="36" cy="60" r="1" fill="#ffffff" opacity="0.7">
                      <animate attributeName="cy" values="44;74" dur="0.8s" begin="0.3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.1" dur="0.8s" begin="0.3s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}

                {/* Inner sand bottom bulb (piles up in an organic mound) */}
                <g clipPath="url(#bottomBulbClip)">
                  {/* Base sand level */}
                  <rect
                    x="10"
                    y={77 - (1 - Math.max(0, Math.min(1, activeProgress))) * 32}
                    width="52"
                    height="35"
                    fill="url(#sandGrad)"
                    filter="url(#sandGlow)"
                    className="transition-all duration-300"
                  />
                  {/* Organic cone mound in center */}
                  {activeProgress < 0.98 && (
                    <ellipse
                      cx="36"
                      cy={77 - (1 - Math.max(0, Math.min(1, activeProgress))) * 32}
                      rx="16"
                      ry="4"
                      fill={theme.accent}
                      opacity="0.9"
                    />
                  )}
                </g>

                {/* Glass highlight glare reflection */}
                <path
                  d="M 16 16 Q 16 32, 28 39"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.25"
                />
                <path
                  d="M 16 72 Q 16 56, 28 49"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.18"
                />
              </svg>
            </div>

            {/* Clean time badge below */}
            <span
              className="font-mono text-base font-bold tabular-nums tracking-wider mt-1 px-3 py-0.5 rounded-full shadow-sm"
              style={{
                color: theme.text,
                backgroundColor: `${theme.cardBg}ee`,
              }}
            >
              {primaryText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
