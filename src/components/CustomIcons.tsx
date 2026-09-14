import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

// Custom hand-drawn hourglass with organic strokes
export const HandHourglass: React.FC<IconProps> = ({ size = 16, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 3.5h14" />
    <path d="M5 20.5h14" />
    <path d="M6 3.5c0 6 5.5 8.5 6 8.5-0.5 0-6 2.5-6 8.5" />
    <path d="M18 3.5c0 6-5.5 8.5-6 8.5 0.5 0 6 2.5 6 8.5" />
    <circle cx="12" cy="16" r="0.8" fill={color} stroke="none" />
    <circle cx="11.2" cy="18" r="0.7" fill={color} stroke="none" />
    <circle cx="12.8" cy="18.2" r="0.6" fill={color} stroke="none" />
  </svg>
);

// Custom hand-drawn ink spark / star
export const HandSparkle: React.FC<IconProps> = ({ size = 16, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2.5c0 4.5 1.5 8 5.5 9.5-4 1.5-5.5 5-5.5 9.5 0-4.5-1.5-8-5.5-9.5 4-1.5 5.5-5 5.5-9.5z" />
    <circle cx="19" cy="5" r="1" fill={color} stroke="none" />
  </svg>
);

// Custom hand-drawn clock timer
export const HandClock: React.FC<IconProps> = ({ size = 16, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6.5v5.5l3.8 2.2" />
    <path d="M10.5 2h3" />
  </svg>
);

// Custom hand-drawn gear / settings
export const HandGear: React.FC<IconProps> = ({ size = 16, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// Custom hand-drawn arrow send
export const HandSend: React.FC<IconProps> = ({ size = 16, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.5 2.5L10 14" />
    <path d="M21.5 2.5L14.5 21.5 10 14 2.5 9.5 21.5 2.5z" />
  </svg>
);

// Custom hand-drawn close cross
export const HandClose: React.FC<IconProps> = ({ size = 16, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

// Custom hand-drawn checkmark
export const HandCheck: React.FC<IconProps> = ({ size = 16, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
