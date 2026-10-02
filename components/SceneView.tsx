'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Scene,
  SCENE_W,
  SCENE_H,
  CAPTION,
  resolveScene,
  resolveSceneColor,
  toSpeechProgress,
  currentWordIndex,
  chunkIndexAt,
  chunkLines,
} from '@/lib/scene';
import { ThemeConfig } from '@/types/script';

interface SceneViewProps {
  scene: Scene; // passe por withNarration(scene, say) para ativar a sincronia por palavra
  progress: number; // 0..1 of the current segment (narration audio)
  theme: ThemeConfig;
}

/**
 * Animated visual explanation with clean vector graphics and kinetic captions.
 * Everything is drawn in a 160x90 virtual space and scaled to fit, so the same JSON works
 * in 16:9, 9:16 and 1:1.
 *
 * Elements appear when the word that triggers them ("on") is spoken, and a
 * kinetic caption (karaoke) below the scene always shows what is being said.
 */
export function SceneView({ scene, progress, theme }: SceneViewProps) {
  const resolved = useMemo(() => resolveScene(scene), [scene]);
  const accent = theme.accent;
  const centerStyle = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

  const sp = toSpeechProgress(progress, scene);

  // Kinetic caption state
  const cur = currentWordIndex(resolved.words, sp);
  const chunkIdx = chunkIndexAt(resolved.chunks, cur);
  const chunk = resolved.chunks[chunkIdx];
  const lines = useMemo(
    () => (chunk ? chunkLines(resolved.words, chunk) : []),
    [resolved.words, chunk]
  );
  const capCenterY = CAPTION.top + 1 + CAPTION.height / 2 - 0.4;

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Camada Vetorial SVG com elementos conceituais e legenda Karaokê cinética */}
      <svg
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        className="relative z-20 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={scene.title || 'Explicação visual'}
      >
        {/* Title */}
        {resolved.title && (
          <motion.text
            x={SCENE_W / 2}
            y={9}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={3.6}
            fontWeight={700}
            letterSpacing={0.4}
            fill={theme.headerText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.9, y: 9 }}
            transition={{ duration: 0.4 }}
            style={{ textTransform: 'uppercase' }}
          >
            {resolved.title}
          </motion.text>
        )}

        {/* Arrows (behind nodes) */}
        {resolved.arrows.map(({ arrow, geo, at }, i) => {
          const visible = sp >= at;
          const color = resolveSceneColor(arrow.color, accent);
          return (
            <g key={`a-${i}`}>
              <motion.path
                d={`M ${geo.x1} ${geo.y1} L ${geo.x2} ${geo.y2}`}
                fill="none"
                stroke={color}
                strokeWidth={0.9}
                strokeLinecap="round"
                strokeDasharray={arrow.dashed ? '2.2 1.8' : undefined}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: visible ? 1 : 0, opacity: visible ? 0.95 : 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <motion.polygon
                points={geo.head.map(([x, y]) => `${x},${y}`).join(' ')}
                fill={color}
                initial={{ opacity: 0 }}
                animate={{ opacity: visible ? 1 : 0 }}
                transition={{ duration: 0.2, delay: visible ? 0.4 : 0 }}
              />
              {arrow.label && (
                <motion.text
                  x={geo.labelX}
                  y={geo.labelY}
                  textAnchor={geo.labelAnchor}
                  dominantBaseline="central"
                  fontSize={2.9}
                  fontWeight={600}
                  fill={color}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: visible ? 0.95 : 0 }}
                  transition={{ duration: 0.3, delay: visible ? 0.25 : 0 }}
                >
                  {arrow.label}
                </motion.text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {resolved.nodes.map(({ node, layout, at }) => {
          const visible = sp >= at;
          const color = resolveSceneColor(node.color, accent);
          const fontFamily = node.mono
            ? '"JetBrains Mono", ui-monospace, monospace'
            : '"Plus Jakarta Sans", system-ui, sans-serif';

          return (
            <motion.g
              key={node.id}
              style={centerStyle}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.6 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              {layout.framed && (
                <rect
                  x={layout.cx - layout.w / 2}
                  y={layout.cy - layout.h / 2}
                  width={layout.w}
                  height={layout.h}
                  rx={2.6}
                  fill={color}
                  fillOpacity={0.14}
                  stroke={color}
                  strokeOpacity={0.9}
                  strokeWidth={0.7}
                />
              )}
              {layout.lines.map((line, i) => (
                <text
                  key={i}
                  x={layout.cx}
                  y={line.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={line.size}
                  fontFamily={
                    line.type === 'icon'
                      ? '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
                      : fontFamily
                  }
                  fontWeight={line.type === 'label' ? 700 : 500}
                  fill={
                    line.type === 'icon'
                      ? color
                      : line.type === 'sub'
                      ? theme.codeText
                      : node.kind === 'text'
                      ? node.color
                        ? color
                        : theme.codeText
                      : '#cbd5e1'
                  }
                  fillOpacity={line.type === 'sub' ? 0.7 : 1}
                >
                  {line.text}
                </text>
              ))}
            </motion.g>
          );
        })}

        {/* Kinetic caption (karaokê) */}
        {resolved.caption && chunk && (
          <g>
            <rect
              x={CAPTION.left}
              y={CAPTION.top + 1}
              width={CAPTION.width}
              height={CAPTION.height}
              rx={3}
              fill="#ffffff"
              fillOpacity={0.045}
              stroke={accent}
              strokeOpacity={0.2}
              strokeWidth={0.3}
            />
            <rect
              x={CAPTION.left + 3}
              y={CAPTION.top + CAPTION.height - 0.6}
              width={(CAPTION.width - 6) * sp}
              height={0.5}
              fill={accent}
              fillOpacity={0.85}
            />
            <motion.g
              key={`chunk-${chunkIdx}`}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {lines.map((idxs, li) => (
                <text
                  key={li}
                  x={SCENE_W / 2}
                  y={capCenterY + (li - (lines.length - 1) / 2) * CAPTION.lineH}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={CAPTION.size}
                  fontWeight={700}
                  style={{ whiteSpace: 'pre' }}
                >
                  {idxs.map((wi, k) => {
                    const emph = resolved.emph[wi];
                    const emphColor = emph ? resolveSceneColor(emph, accent) : null;
                    let fill = '#cbd5e1';
                    let opacity = 1;
                    if (wi > cur) {
                      opacity = 0.28; // ainda não falada
                      if (emphColor) fill = emphColor;
                    } else if (wi === cur) {
                      fill = emphColor ?? accent; // sendo falada agora
                    } else if (emphColor) {
                      fill = emphColor; // palavra-chave já falada
                    }
                    return (
                      <tspan key={wi} fill={fill} fillOpacity={opacity}>
                        {resolved.words[wi].text}
                        {k < idxs.length - 1 ? ' ' : ''}
                      </tspan>
                    );
                  })}
                </text>
              ))}
            </motion.g>
          </g>
        )}
      </svg>
    </div>
  );
}
