'use client';

import React, { useId } from 'react';

export type SoaraLogoVariant =
  | 'static'
  | 'waves'
  | 'parts'
  | 'progress'
  | 'story';

export type ExplicodeLogoVariant = SoaraLogoVariant;

interface SoaraLogoProps {
  variant?: SoaraLogoVariant;
  /** Progress from 0 to 1 (used when variant="progress") */
  progress?: number;
  className?: string;
  size?: number | string;
  title?: string;
}

export type ExplicodeLogoProps = SoaraLogoProps;

export function SoaraLogo({
  variant = 'static',
  progress = 0,
  className = 'w-6 h-6',
  size,
  title = 'Soara',
}: SoaraLogoProps) {
  const clipId = useId();
  const safeProgress = Math.max(0, Math.min(1, progress));
  const styleSize = size !== undefined ? { width: size, height: size } : undefined;

  if (variant === 'progress') {
    const yVal = 32 - 32 * safeProgress;
    const hVal = 32 * safeProgress;

    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={styleSize}
        aria-label={title}
        role="img"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y={yVal} width="32" height={hVal} />
          </clipPath>
        </defs>

        {/* Dimmed background silhouette */}
        <g opacity="0.2">
          {/* Code Chevron < */}
          <path
            d="M9.5 8.5L3.5 16L9.5 23.5"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Play Triangle ▶ */}
          <path
            d="M13.8 10.3C13.8 9.4 14.8 8.85 15.6 9.35L22.4 14.65C23.1 15.15 23.1 16.85 22.4 17.35L15.6 22.65C14.8 23.15 13.8 22.6 13.8 21.7V10.3Z"
            fill="currentColor"
          />
          {/* Sound Wave 1 (Inner) */}
          <path
            d="M24.5 11.5C25.8 12.8 26.5 14.3 26.5 16C26.5 17.7 25.8 19.2 24.5 20.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Sound Wave 2 (Outer) */}
          <path
            d="M28 8C30.2 10.3 31.5 13 31.5 16C31.5 19 30.2 21.7 28 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Active clipped portion that fills upward */}
        <g clipPath={`url(#${clipId})`}>
          <path
            d="M9.5 8.5L3.5 16L9.5 23.5"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.8 10.3C13.8 9.4 14.8 8.85 15.6 9.35L22.4 14.65C23.1 15.15 23.1 16.85 22.4 17.35L15.6 22.65C14.8 23.15 13.8 22.6 13.8 21.7V10.3Z"
            fill="currentColor"
          />
          <path
            d="M24.5 11.5C25.8 12.8 26.5 14.3 26.5 16C26.5 17.7 25.8 19.2 24.5 20.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M28 8C30.2 10.3 31.5 13 31.5 16C31.5 19 30.2 21.7 28 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  }

  if (variant === 'waves') {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={styleSize}
        aria-label={title}
        role="img"
      >
        {/* Code Chevron < */}
        <path
          d="M9.5 8.5L3.5 16L9.5 23.5"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Play Triangle ▶ with breathe animation */}
        <path
          d="M13.8 10.3C13.8 9.4 14.8 8.85 15.6 9.35L22.4 14.65C23.1 15.15 23.1 16.85 22.4 17.35L15.6 22.65C14.8 23.15 13.8 22.6 13.8 21.7V10.3Z"
          fill="currentColor"
          className="breathe"
        />
        {/* Sound Wave 1 (Inner) with wv1 animation */}
        <path
          d="M24.5 11.5C25.8 12.8 26.5 14.3 26.5 16C26.5 17.7 25.8 19.2 24.5 20.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="wv1"
        />
        {/* Sound Wave 2 (Outer) with wv2 animation */}
        <path
          d="M28 8C30.2 10.3 31.5 13 31.5 16C31.5 19 30.2 21.7 28 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="wv2"
        />
      </svg>
    );
  }

  // Static / parts / story default
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={styleSize}
      aria-label={title}
      role="img"
    >
      {/* Code Chevron < */}
      <path
        d="M9.5 8.5L3.5 16L9.5 23.5"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Play Triangle ▶ */}
      <path
        d="M13.8 10.3C13.8 9.4 14.8 8.85 15.6 9.35L22.4 14.65C23.1 15.15 23.1 16.85 22.4 17.35L15.6 22.65C14.8 23.15 13.8 22.6 13.8 21.7V10.3Z"
        fill="currentColor"
      />
      {/* Sound Wave 1 (Inner) */}
      <path
        d="M24.5 11.5C25.8 12.8 26.5 14.3 26.5 16C26.5 17.7 25.8 19.2 24.5 20.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Sound Wave 2 (Outer) */}
      <path
        d="M28 8C30.2 10.3 31.5 13 31.5 16C31.5 19 30.2 21.7 28 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const ExplicodeLogo = SoaraLogo;
export default SoaraLogo;
