'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Palette,
  Maximize2,
  Sparkles,
  Gauge,
} from 'lucide-react';
import { AspectRatioType, ThemeConfig, AudioVoiceMode, GeminiMaleVoice } from '@/types/script';
import { THEMES } from '@/lib/themes';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentSegmentIndex: number;
  totalSegments: number;
  voiceEnabled: boolean;
  speechRate: number;
  aspectRatio: AspectRatioType;
  selectedThemeId: string;
  voiceMode: AudioVoiceMode;
  geminiVoice: GeminiMaleVoice;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceIndex: number;
  onTogglePlay: () => void;
  onRestart: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onToggleVoice: (enabled: boolean) => void;
  onChangeVoiceMode: (mode: AudioVoiceMode) => void;
  onChangeGeminiVoice: (voice: GeminiMaleVoice) => void;
  onSelectVoiceIndex: (index: number) => void;
  onChangeRate: (rate: number) => void;
  onChangeAspectRatio: (ratio: AspectRatioType) => void;
  onChangeTheme: (theme: ThemeConfig) => void;
  onExportClick?: () => void;
  isRecording?: boolean;
  onTestGeminiVoice?: () => void;
  isTestingVoice?: boolean;
}

export function PlaybackControls({
  isPlaying,
  isPaused: _isPaused,
  currentSegmentIndex,
  totalSegments,
  voiceEnabled,
  speechRate,
  aspectRatio,
  selectedThemeId,
  voiceMode,
  geminiVoice,
  availableVoices,
  selectedVoiceIndex,
  onTogglePlay,
  onRestart,
  onStepBack,
  onStepForward,
  onToggleVoice,
  onChangeVoiceMode,
  onChangeGeminiVoice,
  onSelectVoiceIndex,
  onChangeRate,
  onChangeAspectRatio,
  onChangeTheme,
  onExportClick,
  isRecording = false,
  onTestGeminiVoice,
  isTestingVoice = false,
}: PlaybackControlsProps) {
  const currentTheme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 backdrop-blur-md shadow-xl flex flex-col gap-3">
      {/* Primary Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Play / Pause / Step / Restart */}
        <div className="flex items-center gap-2">
          {/* Main Play / Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md cursor-pointer hover:brightness-110 active:scale-95"
            style={{
              backgroundColor: currentTheme.accent,
              color: currentTheme.markText,
            }}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Reproduzir</span>
              </>
            )}
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={onRestart}
            title="Reiniciar vídeo do início"
            aria-label="Reiniciar vídeo"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Step Back */}
          <button
            type="button"
            onClick={onStepBack}
            disabled={currentSegmentIndex <= 0}
            title="Trecho anterior"
            aria-label="Trecho anterior"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/50"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Step Forward */}
          <button
            type="button"
            onClick={onStepForward}
            disabled={currentSegmentIndex >= totalSegments - 1}
            title="Próximo trecho"
            aria-label="Próximo trecho"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/50"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Segment counter badge */}
          <span className="text-xs font-mono text-slate-400 pl-1">
            {totalSegments > 0 ? `${currentSegmentIndex + 1}/${totalSegments}` : '0/0'}
          </span>
        </div>

        {/* Right: Quick Record / Snapshot action */}
        {onExportClick && (
          <button
            type="button"
            onClick={onExportClick}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isRecording
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/50 hover:bg-slate-700/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isRecording ? 'Gravando vídeo...' : 'Gravar / Exportar'}</span>
          </button>
        )}
      </div>

      {/* Secondary Controls Bar: Voice, Speed, Format, Theme */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
        {/* Voice Toggle */}
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/30 hover:bg-slate-800/80">
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => onToggleVoice(e.target.checked)}
            className="sr-only"
          />
          {voiceEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
          <span className={voiceEnabled ? 'text-slate-200' : 'text-slate-500'}>
            Narração {voiceEnabled ? 'Ativa' : 'Muda'}
          </span>
        </label>

        {/* Voice Engine Mode Switcher */}
        {voiceEnabled && (
          <div className="inline-flex items-center gap-1.5 bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-700/30">
            <span className="text-[11px] text-slate-400">Motor:</span>
            <select
              value={voiceMode}
              onChange={(e) => onChangeVoiceMode(e.target.value as AudioVoiceMode)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="gemini-tts" className="bg-slate-900 text-slate-200">
                IA Humanizada (Gemini TTS)
              </option>
              <option value="browser-tts" className="bg-slate-900 text-slate-200">
                Navegador (Web Speech)
              </option>
            </select>
          </div>
        )}

        {/* Gemini Voice Selector & Preview Button */}
        {voiceEnabled && voiceMode === 'gemini-tts' && (
          <div className="inline-flex items-center gap-2 bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-700/30">
            <span className="text-[11px] text-amber-400 font-medium">Voz Gemini:</span>
            <select
              value={geminiVoice}
              onChange={(e) => onChangeGeminiVoice(e.target.value as GeminiMaleVoice)}
              className="bg-transparent text-amber-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="Puck" className="bg-slate-900 text-slate-200">
                Puck (Masculino Natural — Expressivo)
              </option>
              <option value="Charon" className="bg-slate-900 text-slate-200">
                Charon (Masculino Grave — Narrador)
              </option>
              <option value="Fenrir" className="bg-slate-900 text-slate-200">
                Fenrir (Masculino Firme — Técnico)
              </option>
              <option value="Zephyr" className="bg-slate-900 text-slate-200">
                Zephyr (Masculino Calmo — Didático)
              </option>
              <option value="Aoede" className="bg-slate-900 text-slate-200">
                Aoede (Feminino Suave — Didático)
              </option>
              <option value="Kore" className="bg-slate-900 text-slate-200">
                Kore (Feminino Claro — Profissional)
              </option>
            </select>

            {onTestGeminiVoice && (
              <button
                type="button"
                onClick={onTestGeminiVoice}
                disabled={isTestingVoice}
                title="Ouvir teste de áudio direto do Gemini TTS"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>{isTestingVoice ? 'Sintetizando...' : 'Testar Voz'}</span>
              </button>
            )}
          </div>
        )}

        {/* Browser Voice Selector (if in browser mode) */}
        {voiceEnabled && voiceMode === 'browser-tts' && availableVoices.length > 0 && (
          <div className="inline-flex items-center gap-1.5 bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-700/30">
            <span className="text-[11px] text-slate-400">Voz:</span>
            <select
              value={selectedVoiceIndex >= 0 ? String(selectedVoiceIndex) : '0'}
              onChange={(e) => onSelectVoiceIndex(parseInt(e.target.value, 10))}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              {availableVoices.map((v, idx) => (
                <option
                  key={`voice-${idx}-${v.voiceURI || v.name}-${v.lang}`}
                  value={String(idx)}
                  className="bg-slate-900 text-slate-200"
                >
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Speed Selector */}
        <div className="inline-flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/30">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400">Velocidade:</span>
          <select
            value={speechRate}
            onChange={(e) => onChangeRate(parseFloat(e.target.value))}
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            <option value="0.75" className="bg-slate-900 text-slate-200">0.75×</option>
            <option value="0.85" className="bg-slate-900 text-slate-200">0.85×</option>
            <option value="1" className="bg-slate-900 text-slate-200">1.0×</option>
            <option value="1.15" className="bg-slate-900 text-slate-200">1.15×</option>
            <option value="1.25" className="bg-slate-900 text-slate-200">1.25×</option>
          </select>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="inline-flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/30">
          <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400">Formato:</span>
          <select
            value={aspectRatio}
            onChange={(e) => onChangeAspectRatio(e.target.value as AspectRatioType)}
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            <option value="16x9" className="bg-slate-900 text-slate-200">16:9 Widescreen</option>
            <option value="9x16" className="bg-slate-900 text-slate-200">9:16 Reels / TikTok</option>
            <option value="1x1" className="bg-slate-900 text-slate-200">1:1 Quadrado</option>
          </select>
        </div>

        {/* Theme Selector */}
        <div className="inline-flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/30 ml-auto">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400">Tema:</span>
          <select
            value={selectedThemeId}
            onChange={(e) => {
              const th = THEMES.find((t) => t.id === e.target.value);
              if (th) onChangeTheme(th);
            }}
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id} className="bg-slate-900 text-slate-200">
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
