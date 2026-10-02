'use client';

import React from 'react';
import { ScriptSegment } from '@/types/script';

interface TimelineProps {
  segments: ScriptSegment[];
  currentSegmentIndex: number;
  segmentProgress: number[]; // 0 to 1 for each segment
  isPlaying: boolean;
  onSelectSegment: (index: number) => void;
  accentColor?: string;
}

export function Timeline({
  segments,
  currentSegmentIndex,
  segmentProgress,
  isPlaying,
  onSelectSegment,
  accentColor = '#FFC857',
}: TimelineProps) {
  return (
    <div
      className="flex items-center gap-1.5 w-full my-3"
      role="group"
      aria-label="Linha do tempo da narração. Clique para ir direto para um trecho."
    >
      {segments.map((seg, idx) => {
        // Approximate weight by word count, minimum weight 2
        const words = seg.say.trim().split(/\s+/).length;
        const flexGrow = Math.max(2, words);
        const isActive = isPlaying && currentSegmentIndex === idx;
        const progress = segmentProgress[idx] ?? (idx < currentSegmentIndex ? 1 : 0);

        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSegment(idx)}
            className={`group relative h-3 sm:h-3.5 rounded-full overflow-hidden transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 bg-slate-800/80 hover:bg-slate-700/80 ${
              isActive ? 'ring-2 ring-white/60 scale-y-110 shadow-sm' : ''
            }`}
            style={{
              flexGrow,
              flexShrink: 1,
              flexBasis: '0%',
            }}
            title={`Trecho ${idx + 1}: ${seg.say}`}
            aria-label={`Trecho ${idx + 1}: ${seg.say}`}
            aria-current={isActive ? 'step' : undefined}
          >
            {/* Progress Fill */}
            <div
              className="absolute inset-0 origin-left transition-transform duration-75"
              style={{
                backgroundColor: accentColor,
                transform: `scaleX(${progress})`,
              }}
            />

            {/* Hover overlay hint */}
            <span className="sr-only">{`Trecho ${idx + 1}: ${seg.say}`}</span>
          </button>
        );
      })}
    </div>
  );
}
