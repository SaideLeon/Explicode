'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Terminal } from 'lucide-react';
import { ExplicodeLogo } from '@/components/ExplicodeLogo';
import { CodeScript, AspectRatioType, ThemeConfig, FocusMode } from '@/types/script';
import { tokenizeLine, computeLineSpans } from '@/lib/tokenizer';
import { Scene, withNarration } from '@/lib/scene';
import { SceneView } from '@/components/SceneView';

interface VideoStageProps {
  script: CodeScript;
  theme: ThemeConfig;
  aspectRatio: AspectRatioType;
  isPlaying: boolean;
  currentSegmentIndex: number;
  lineVisibilities: number[]; // characters visible per line
  caretLine: number; // line index currently showing caret (-1 if none)
  focusRange: [number, number] | null; // 0-based start, end
  markInfo: { lineIndex: number; range: [number, number] } | null;
  outputValue: string | null;
  captionText: string;
  scene?: Scene | null; // visual scene shown instead of the code (null = show code)
  sceneKey?: number; // changes per segment so each scene animates from scratch
  sceneProgress?: number; // 0..1 progress of the current segment
  onPlayClick: () => void;
  focusMode?: FocusMode;
  onLineClick?: (lineIndex: number, shiftKey: boolean) => void;
  onToggleFocusMode?: () => void;
  onClearManualFocus?: () => void;
}

export function VideoStage({
  script,
  theme,
  aspectRatio,
  isPlaying,
  currentSegmentIndex: _currentSegmentIndex,
  lineVisibilities,
  caretLine,
  focusRange,
  markInfo,
  outputValue,
  captionText,
  scene = null,
  sceneKey = 0,
  sceneProgress = 0,
  onPlayClick,
  focusMode = 'auto',
  onLineClick,
  onToggleFocusMode,
  onClearManualFocus,
}: VideoStageProps) {
  // If script has no code (conceptual mode), always show the current/first segment's visual scene even when idle
  const effectiveScene =
    scene ??
    (script.code.length === 0
      ? script.segments[_currentSegmentIndex]?.scene ?? script.segments[0]?.scene ?? null
      : null);
  const effectiveSceneProgress = scene ? sceneProgress : 1;

  // Liga a cena à fala do trecho: é isso que permite aparecer só quando a palavra é dita
  const narratedScene = useMemo(
    () =>
      effectiveScene
        ? withNarration(effectiveScene, script.segments[_currentSegmentIndex]?.say ?? '')
        : null,
    [effectiveScene, script.segments, _currentSegmentIndex]
  );

  // Tokenize lines
  const tokenizedLines = useMemo(() => {
    return script.code.map((line) => tokenizeLine(line));
  }, [script.code]);

  // Container aspect ratio class
  const ratioClasses = {
    '16x9': 'w-full aspect-[16/9] max-w-[920px]',
    '9x16': 'w-full max-w-[380px] aspect-[9/16] mx-auto',
    '1x1': 'w-full max-w-[560px] aspect-square mx-auto',
  }[aspectRatio];

  // Calculate focus box geometry based on line height (1.7em)
  const focusGeometry = useMemo(() => {
    if (!focusRange) return null;
    const [start, end] = focusRange;
    return {
      top: `calc(${start} * 1.7em)`,
      height: `calc(${end - start + 1} * 1.7em)`,
    };
  }, [focusRange]);

  return (
    <div
      id="video-stage"
      className={`relative select-none rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border border-white/10 flex flex-col justify-between ${ratioClasses}`}
      style={{
        background: theme.bgGradient,
        color: theme.codeText,
      }}
    >
      {/* Top Window Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 backdrop-blur-md border-b text-xs transition-colors duration-200"
        style={{
          borderColor: theme.headerBorder,
          color: theme.headerText,
        }}
      >
        <div className="flex items-center gap-2">
          {/* macOS styled window controls */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="font-mono font-medium text-slate-300 truncate max-w-[200px]">
            {script.file || 'codigo.js'}
          </span>

          {/* Quick Focus Mode Badge / Button */}
          {onToggleFocusMode && !effectiveScene && (
            <div className="flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={onToggleFocusMode}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors cursor-pointer border ${
                  focusMode === 'manual'
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/[0.05] border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
                }`}
                title={
                  focusMode === 'manual'
                    ? 'Modo de Foco Manual ativo: você clica nas linhas para destacar. Clique para voltar para Automático.'
                    : 'Modo de Foco Automático: segue o roteiro. Clique para ativar Foco Manual.'
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    focusMode === 'manual' ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'
                  }`}
                />
                <span>Foco: {focusMode === 'manual' ? 'Manual' : 'Auto'}</span>
              </button>

              {focusMode === 'manual' && focusRange && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-200">
                  <span>
                    L{focusRange[0] + 1}
                    {focusRange[1] !== focusRange[0] ? `–L${focusRange[1] + 1}` : ''}
                  </span>
                  {onClearManualFocus && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearManualFocus();
                      }}
                      className="hover:text-white cursor-pointer ml-0.5 text-xs font-bold leading-none"
                      title="Limpar seleção de foco manual"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-right">
          <ExplicodeLogo variant="waves" className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-[11px] font-medium opacity-85 truncate max-w-[280px]">
            {script.title || 'Soara'}
          </span>
        </div>
      </div>

      {/* Code Area */}
      <div className="relative flex-1 p-4 sm:p-5 overflow-hidden flex flex-col justify-center min-h-0">
        {/* Visual scene (replaces the code while it is active) */}
        <AnimatePresence>
          {effectiveScene && narratedScene && (
            <motion.div
              key={`scene-${sceneKey}-${effectiveScene.title || 'v'}`}
              className="absolute inset-0 z-20 p-2 sm:p-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SceneView scene={narratedScene} progress={effectiveSceneProgress} theme={theme} />
            </motion.div>
          )}
        </AnimatePresence>
        <div
          className={`relative font-mono text-[13px] sm:text-[14.5px] leading-[1.7] tracking-tight transition-opacity duration-300 ${
            effectiveScene ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Spring Animated Focus Bar */}
          <motion.div
            className="absolute -left-3 -right-3 rounded-lg pointer-events-none transition-all duration-200"
            animate={{
              top: focusGeometry ? focusGeometry.top : '0em',
              height: focusGeometry ? focusGeometry.height : '0em',
              opacity: focusGeometry ? 1 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 28,
            }}
            style={{
              backgroundColor: theme.focusBg,
              boxShadow: `inset 3.5px 0 0 ${theme.focusBorder}, 0 0 20px 2px ${theme.focusBg}`,
            }}
          />

          {/* Lines */}
          {script.code.map((lineText, idx) => {
            const visibleChars = lineVisibilities[idx] ?? lineText.length;
            const isCaretOnLine = caretLine === idx;
            const lineMark = markInfo && markInfo.lineIndex === idx ? markInfo.range : null;
            const spans = computeLineSpans(tokenizedLines[idx], visibleChars, lineMark);
            const isLineFocused =
              focusRange && idx >= focusRange[0] && idx <= focusRange[1];

            return (
              <div
                key={idx}
                onClick={(e) => {
                  if (onLineClick) {
                    onLineClick(idx, e.shiftKey);
                  }
                }}
                className={`relative z-10 flex h-[1.7em] items-center whitespace-pre transition-colors duration-150 rounded px-1 -mx-1 ${
                  focusMode === 'manual'
                    ? 'cursor-pointer hover:bg-white/[0.08]'
                    : onLineClick
                    ? 'cursor-pointer hover:bg-white/[0.04]'
                    : ''
                }`}
                title={
                  focusMode === 'manual'
                    ? `Linha ${idx + 1} (Clique para focar · Shift+Clique para intervalo)`
                    : 'Clique para focar esta linha no editor (ativa Foco Manual)'
                }
              >
                {/* Line number */}
                <span
                  className={`w-8 shrink-0 pr-3 text-right select-none font-mono text-xs transition-opacity ${
                    isLineFocused ? 'opacity-95 font-bold' : 'opacity-60'
                  }`}
                  style={{ color: isLineFocused ? theme.accent : theme.lineNumber }}
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>

                {/* Code Text with Tokens and Highlights */}
                <span className="flex-1 min-w-0 font-mono">
                  {spans.map((span, sIdx) => {
                    const tokenColor = theme.syntax[span.cls as keyof typeof theme.syntax] || theme.codeText;

                    if (span.isMarked) {
                      return (
                        <span
                          key={sIdx}
                          className="inline-block px-1 rounded font-semibold animate-mark-pulse transition-all"
                          style={{
                            backgroundColor: theme.markBg,
                            color: theme.markText,
                            boxShadow: `0 0 10px ${theme.markBg}80`,
                          }}
                        >
                          {span.text}
                        </span>
                      );
                    }

                    return (
                      <span
                        key={sIdx}
                        style={{ color: tokenColor }}
                        className={span.cls === 'cm' ? 'italic opacity-80' : undefined}
                      >
                        {span.text}
                      </span>
                    );
                  })}

                  {/* Typing Caret */}
                  {isCaretOnLine && (
                    <span
                      className="inline-block w-2 h-4 align-middle ml-0.5 animate-caret rounded-[1px]"
                      style={{ backgroundColor: theme.accent }}
                      aria-hidden="true"
                    />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Output / Console result pill */}
      <div className="px-5 shrink-0 min-h-[36px] flex items-center">
        <AnimatePresence>
          {outputValue !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-mono backdrop-blur-md shadow-lg"
              style={{
                backgroundColor: theme.outputBg,
                borderColor: `${theme.accent}30`,
              }}
            >
              <Terminal className="w-3.5 h-3.5 opacity-80" style={{ color: theme.outputLabel }} />
              <span className="font-medium" style={{ color: theme.outputLabel }}>
                Saída:
              </span>
              <span className="font-semibold text-[13px]" style={{ color: theme.outputValue }}>
                {outputValue}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Subtitle / Caption */}
      <div
        className="px-5 py-3.5 shrink-0 border-t backdrop-blur-md transition-colors"
        style={{
          borderColor: theme.headerBorder,
          backgroundColor: theme.captionBg,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={captionText}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs sm:text-sm font-medium leading-relaxed min-h-[2.4em] flex items-center"
            style={{ color: theme.captionText }}
          >
            {captionText || 'Pronto para iniciar a explicação animada.'}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Play Overlay (when video is stopped or not yet started) */}
      {!isPlaying && (
        <button
          onClick={onPlayClick}
          type="button"
          aria-label="Reproduzir vídeo explicativo"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0a0f20]/60 backdrop-blur-[2px] transition-all hover:bg-[#0a0f20]/45 cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-300/30 text-slate-200 backdrop-blur-md shadow-2xl transition-transform duration-300 group-hover:scale-110">
            <Play className="w-7 h-7 fill-current translate-x-0.5" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-300 group-hover:text-slate-200 drop-shadow">
            Reproduzir Vídeo
          </span>
        </button>
      )}
    </div>
  );
}
