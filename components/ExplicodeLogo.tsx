'use client';

import React, { useId } from 'react';

export type ExplicodeLogoVariant =
  | 'static'
  | 'waves'
  | 'parts'
  | 'progress'
  | 'story';

interface ExplicodeLogoProps {
  variant?: ExplicodeLogoVariant;
  /** Progress from 0 to 1 (used when variant="progress") */
  progress?: number;
  className?: string;
  size?: number | string;
  title?: string;
}

const PATH_TOP =
  'M12.15 5.96C12.11 5.84 11.79 5.12 11.67 4.92C11.55 4.71 11.5 4.67 11.12 4.45C10.93 4.33 10.67 4.18 10.53 4.1C10.39 4.01 10.1 3.84 9.89 3.72C9.67 3.59 9.43 3.45 9.36 3.4C9.29 3.36 8.97 3.17 8.65 2.98L8.08 2.64L7.87 2.77C7.76 2.83 7.6 2.93 7.52 2.98C7.43 3.03 7.15 3.2 6.89 3.35C6.45 3.61 6.09 3.83 5.42 4.22C5.29 4.3 4.95 4.5 4.66 4.67L4.14 4.98L3.82 4.98L3.49 4.98L3.49 4.65L3.49 4.31L3.62 4.24C3.69 4.2 3.97 4.03 4.25 3.86C4.53 3.7 5.09 3.36 5.51 3.11C5.92 2.87 6.63 2.44 7.09 2.17C7.54 1.9 7.95 1.65 7.99 1.63C8.04 1.6 8.07 1.58 8.08 1.58C8.08 1.58 8.68 1.93 9.4 2.37C10.97 3.31 12.14 4.01 12.42 4.17C12.53 4.23 12.63 4.3 12.65 4.31L12.68 4.33L12.68 5.07L12.67 5.8L12.56 5.81C12.43 5.82 12.33 5.86 12.23 5.95C12.16 6.01 12.16 6.01 12.15 5.96Z';

const PATH_BODY =
  'M6.87 13.91C5.22 12.81 4.57 12.31 3.82 11.56L3.52 11.26L4.22 11.26L4.92 11.25L5.11 11.42C5.69 11.93 6.54 12.54 7.46 13.09L7.65 13.21L7.75 13.15C7.8 13.11 7.96 13.01 8.1 12.92C9.93 11.71 11.19 10.26 11.45 9.07C11.5 8.85 11.5 8.43 11.45 8.23C11.28 7.53 10.69 6.88 9.78 6.38C8.71 5.81 7.55 5.72 6.41 6.14C5.69 6.4 5.05 6.8 4.02 7.63C3.84 7.78 3.68 7.91 3.67 7.91C3.66 7.92 3.65 7.92 3.64 7.92C3.62 7.9 3.74 7.69 3.88 7.49C4.73 6.29 6 5.36 7.27 5C7.7 4.87 8.08 4.87 8.62 4.99C9.75 5.24 11.14 6.09 11.9 7C12.49 7.69 12.69 8.47 12.47 9.16C12.41 9.36 12.37 9.42 12.17 9.7C12.05 9.87 12.06 10.15 12.19 10.29L12.23 10.33L12.17 10.4C11.37 11.52 10.31 12.5 8.44 13.86C7.91 14.25 7.67 14.42 7.64 14.42C7.63 14.42 7.28 14.19 6.87 13.91Z';

const PATH_LID =
  'M7.3 11.45C6.89 11.38 5.94 10.83 5.23 10.25C4.53 9.68 3.8 8.79 3.65 8.31C3.59 8.14 3.62 8.15 3.91 8.39C5.15 9.44 6.12 9.98 7.05 10.13C7.28 10.17 7.85 10.17 8.09 10.12C9.01 9.97 9.8 9.55 10.71 8.75C11.03 8.46 11.04 8.46 10.9 8.69C10.31 9.64 9.11 10.77 8.22 11.22C7.81 11.42 7.55 11.49 7.3 11.45Z';

const PATH_CHEV =
  'M3.28 10.88C3.19 10.77 2.97 10.49 2.78 10.27C2.39 9.78 1.86 9.13 1.36 8.51C1.16 8.25 1 8.04 1 8.03C1 8.01 1.18 7.78 1.46 7.45C2.62 6.05 3.16 5.4 3.25 5.29L3.36 5.16L4.07 5.16C4.52 5.16 4.79 5.16 4.78 5.17C4.78 5.18 4.54 5.47 4.25 5.82C3.96 6.17 3.5 6.72 3.23 7.04C2.96 7.36 2.67 7.71 2.58 7.82C2.49 7.92 2.42 8.01 2.41 8.02C2.41 8.03 2.53 8.18 3.33 9.16C3.59 9.48 3.84 9.79 3.89 9.85C3.94 9.91 4.07 10.08 4.19 10.22C4.3 10.36 4.47 10.57 4.57 10.69C4.78 10.95 4.86 11.05 4.86 11.06C4.86 11.07 4.54 11.08 4.14 11.08L3.43 11.08L3.28 10.88Z';

const PATH_PLAY =
  'M7.09 9.83C7.08 9.82 7.05 9.8 7.03 9.79C6.95 9.71 6.95 9.81 6.95 8.09L6.96 6.5L6.99 6.44C7.03 6.38 7.12 6.34 7.19 6.33C7.26 6.33 7.24 6.32 8.46 7.07C8.82 7.29 9.27 7.57 9.46 7.68C9.64 7.79 9.81 7.9 9.82 7.91C9.89 7.97 9.92 8.11 9.88 8.21C9.86 8.27 9.8 8.31 9.56 8.46C9.45 8.52 9.26 8.64 9.15 8.71C9.03 8.77 8.82 8.9 8.68 8.99C8.53 9.08 8.19 9.29 7.91 9.45C7.25 9.85 7.26 9.85 7.19 9.84C7.16 9.84 7.11 9.84 7.09 9.83Z';

const PATH_WIN =
  'M12.54 10.29C12.34 10.23 12.24 10.01 12.33 9.84C12.34 9.82 12.4 9.75 12.45 9.69C13.32 8.77 13.3 7.52 12.4 6.57C12.27 6.43 12.24 6.34 12.28 6.21C12.33 6.03 12.56 5.95 12.74 6.03C12.89 6.09 13.26 6.51 13.44 6.82C13.99 7.74 13.91 8.91 13.24 9.79C12.93 10.2 12.73 10.35 12.54 10.29Z';

const PATH_WOUT =
  'M13.3 11C13.23 10.98 13.11 10.86 13.09 10.79C13.05 10.63 13.07 10.57 13.3 10.34C14.07 9.53 14.38 8.6 14.2 7.61C14.1 7.06 13.84 6.56 13.4 6.07C13.25 5.9 13.24 5.88 13.24 5.76C13.25 5.52 13.51 5.36 13.72 5.48C13.75 5.49 13.84 5.57 13.93 5.65C15.18 6.89 15.35 8.72 14.34 10.18C14.14 10.46 13.75 10.88 13.6 10.97C13.52 11.02 13.38 11.03 13.3 11Z';

export function ExplicodeLogo({
  variant = 'static',
  progress = 0,
  className = 'w-6 h-6',
  size,
  title = 'Soara',
}: ExplicodeLogoProps) {
  const clipId = useId();
  const safeProgress = Math.max(0, Math.min(1, progress));
  const styleSize = size !== undefined ? { width: size, height: size } : undefined;

  if (variant === 'progress') {
    const yVal = 16 - 16 * safeProgress;
    const hVal = 16 * safeProgress;

    return (
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className={className}
        style={styleSize}
        aria-label={title}
        role="img"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y={yVal} width="16" height={hVal} />
          </clipPath>
        </defs>
        {/* Background dimmed silhouette */}
        <g opacity="0.2">
          <path fillRule="evenodd" d={PATH_TOP} />
          <path fillRule="evenodd" d={PATH_BODY} />
          <path fillRule="evenodd" d={PATH_LID} />
          <path fillRule="evenodd" d={PATH_CHEV} />
          <path fillRule="evenodd" d={PATH_PLAY} />
          <path fillRule="evenodd" d={PATH_WIN} />
          <path fillRule="evenodd" d={PATH_WOUT} />
        </g>
        {/* Active clipped portion that fills upward */}
        <g clipPath={`url(#${clipId})`}>
          <path fillRule="evenodd" d={PATH_TOP} />
          <path fillRule="evenodd" d={PATH_BODY} />
          <path fillRule="evenodd" d={PATH_LID} />
          <path fillRule="evenodd" d={PATH_CHEV} />
          <path fillRule="evenodd" d={PATH_PLAY} />
          <path fillRule="evenodd" d={PATH_WIN} />
          <path fillRule="evenodd" d={PATH_WOUT} />
        </g>
      </svg>
    );
  }

  if (variant === 'waves') {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className={className}
        style={styleSize}
        aria-label={title}
        role="img"
      >
        <path fillRule="evenodd" d={PATH_TOP} />
        <path fillRule="evenodd" d={PATH_BODY} />
        <path fillRule="evenodd" d={PATH_LID} />
        <path fillRule="evenodd" d={PATH_CHEV} />
        <path className="pt breathe" fillRule="evenodd" d={PATH_PLAY} />
        <path className="wv1" fillRule="evenodd" d={PATH_WIN} />
        <path className="wv2" fillRule="evenodd" d={PATH_WOUT} />
      </svg>
    );
  }

  if (variant === 'parts') {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className={className}
        style={styleSize}
        aria-label={title}
        role="img"
      >
        <path className="pt s1" fillRule="evenodd" d={PATH_TOP} />
        <path className="pt s2" fillRule="evenodd" d={PATH_BODY} />
        <path className="pt s3" fillRule="evenodd" d={PATH_LID} />
        <path className="pt s4" fillRule="evenodd" d={PATH_CHEV} />
        <path className="pt s5" fillRule="evenodd" d={PATH_PLAY} />
        <path className="pt s6" fillRule="evenodd" d={PATH_WIN} />
        <path className="pt s7" fillRule="evenodd" d={PATH_WOUT} />
      </svg>
    );
  }

  if (variant === 'story') {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className={className}
        style={styleSize}
        aria-label={title}
        role="img"
      >
        <path className="opacity-40" fillRule="evenodd" d={PATH_TOP} />
        <path className="opacity-40" fillRule="evenodd" d={PATH_BODY} />
        <path className="opacity-40" fillRule="evenodd" d={PATH_LID} />
        <path className="pt bc" fillRule="evenodd" d={PATH_CHEV} />
        <path className="pt bp" fillRule="evenodd" d={PATH_PLAY} />
        <path className="bv" fillRule="evenodd" d={PATH_WIN} />
        <path className="bv bv2" fillRule="evenodd" d={PATH_WOUT} />
      </svg>
    );
  }

  // Static variant
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      style={styleSize}
      aria-label={title}
      role="img"
    >
      <path fillRule="evenodd" d={PATH_TOP} />
      <path fillRule="evenodd" d={PATH_BODY} />
      <path fillRule="evenodd" d={PATH_LID} />
      <path fillRule="evenodd" d={PATH_CHEV} />
      <path fillRule="evenodd" d={PATH_PLAY} />
      <path fillRule="evenodd" d={PATH_WIN} />
      <path fillRule="evenodd" d={PATH_WOUT} />
    </svg>
  );
}

export const SoaraLogo = ExplicodeLogo;
export type SoaraLogoProps = ExplicodeLogoProps;

