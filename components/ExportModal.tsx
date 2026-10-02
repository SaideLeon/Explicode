'use client';

import React, { useState, useRef } from 'react';
import {
  Download,
  Video,
  Sparkles,
  Check,
  AlertCircle,
  Copy,
  RefreshCw,
  Play,
  Film,
  Maximize2,
  Cpu,
} from 'lucide-react';
import { ExplicodeLogo } from '@/components/ExplicodeLogo';
import { CodeScript, AspectRatioType, ThemeConfig, GeminiMaleVoice } from '@/types/script';
import { THEMES } from '@/lib/themes';
import { renderScriptToVideoBlob, RenderProgress, VideoQualityPreset } from '@/lib/canvasRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: CodeScript;
  theme: ThemeConfig;
  aspectRatio: AspectRatioType;
  geminiVoice: GeminiMaleVoice;
}

export function ExportModal({
  isOpen,
  onClose,
  script,
  theme: initialTheme,
  aspectRatio: initialRatio,
  geminiVoice: initialVoice,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'webm'>('mp4');
  const [selectedQuality, setSelectedQuality] = useState<VideoQualityPreset>('1080p');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioType>(initialRatio);
  const [selectedVoice, setSelectedVoice] = useState<GeminiMaleVoice>(initialVoice);
  const [selectedTheme, setSelectedTheme] = useState<ThemeConfig>(initialTheme);

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedFilename, setGeneratedFilename] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCancelledRef = useRef(false);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    if (!canvasRef.current) return;
    if (generatedVideoUrl) {
      URL.revokeObjectURL(generatedVideoUrl);
    }
    setIsRendering(true);
    setRenderError(null);
    setGeneratedVideoUrl(null);
    isCancelledRef.current = false;

    try {
      const result = await renderScriptToVideoBlob(canvasRef.current, {
        script,
        theme: selectedTheme,
        aspectRatio: selectedRatio,
        geminiVoice: selectedVoice,
        format: selectedFormat,
        quality: selectedQuality,
        onProgress: (p) => setProgress(p),
        shouldCancel: () => isCancelledRef.current,
      });

      const url = URL.createObjectURL(result.blob);
      setGeneratedVideoUrl(url);
      setGeneratedFilename(result.filename);
      setProgress(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao renderizar vídeo';
      setRenderError(msg);
      setProgress(null);
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideoUrl) return;
    const a = document.createElement('a');
    a.href = generatedVideoUrl;
    a.download = generatedFilename || 'codigo-explicado.mp4';
    a.click();
  };

  const handleCopyAllCode = async () => {
    try {
      await navigator.clipboard.writeText(script.code.join('\n'));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#101014]/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1b1b20]/95 border border-white/10 backdrop-blur-xl rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-zinc-300 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <ExplicodeLogo variant="waves" className="w-6 h-6 text-sky-400" />
            <h3 className="font-semibold text-base text-zinc-100">
              Explicode · Exportar Vídeo com Áudio
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              isCancelledRef.current = true;
              onClose();
            }}
            className="text-zinc-400 hover:text-zinc-200 text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Video settings */}
        {!generatedVideoUrl && !isRendering && (
          <div className="flex flex-col gap-3.5">
            <p className="text-xs text-zinc-400 leading-relaxed">
              O Explicode renderiza as animações de código, digitação e destaques visuais sincronizados diretamente com a narração em voz de alta definição, empacotando tudo em um único arquivo de vídeo.
            </p>

            {/* Format selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat('mp4')}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedFormat === 'mp4'
                    ? 'border-white/25 bg-white/[0.08] text-zinc-200'
                    : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:border-white/15'
                }`}
              >
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">
                    MP4
                  </span>
                  <span>Vídeo Universal (Recomendado)</span>
                </span>
                <span className="text-[11px] text-zinc-400 leading-tight">
                  H.264 + Áudio AAC. Funciona no WhatsApp, Instagram, TikTok, YouTube, iPhone e PC.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('webm')}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedFormat === 'webm'
                    ? 'border-white/25 bg-white/[0.08] text-zinc-200'
                    : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:border-white/15'
                }`}
              >
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">
                    WebM
                  </span>
                  <span>Download Direto</span>
                </span>
                <span className="text-[11px] text-zinc-400 leading-tight">
                  Codec VP9 + Áudio Opus. Pronto instantaneamente para edição no Premiere/CapCut.
                </span>
              </button>
            </div>

            {/* Options grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Aspect Ratio */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-zinc-400" />
                  Formato da Tela:
                </label>
                <select
                  value={selectedRatio}
                  onChange={(e) => setSelectedRatio(e.target.value as AspectRatioType)}
                  className="bg-[#141417] border border-white/10 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-white/25 cursor-pointer"
                >
                  <option value="16x9">16:9 Widescreen (YouTube)</option>
                  <option value="9x16">9:16 Vertical (Reels / TikTok / Shorts)</option>
                  <option value="1x1">1:1 Quadrado (Instagram / Post)</option>
                </select>
              </div>

              {/* Gemini Voice */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-zinc-300" />
                  Voz Gemini (IA):
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as GeminiMaleVoice)}
                  className="bg-[#141417] border border-white/10 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-white/25 cursor-pointer font-medium"
                >
                  <option value="Puck">Puck (Masculino Natural — Expressivo)</option>
                  <option value="Charon">Charon (Masculino Grave — Narrador)</option>
                  <option value="Fenrir">Fenrir (Masculino Técnico — Firme)</option>
                  <option value="Zephyr">Zephyr (Masculino Calmo — Didático)</option>
                  <option value="Aoede">Aoede (Feminino Suave — Didático)</option>
                  <option value="Kore">Kore (Feminino Claro — Profissional)</option>
                </select>
              </div>

              {/* Resolution / Sharpness Quality */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-zinc-300" />
                  Resolução e Nitidez do Vídeo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedQuality('1080p')}
                    className={`px-3 py-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      selectedQuality === '1080p'
                        ? 'border-white/25 bg-white/[0.08] text-zinc-200 font-semibold'
                        : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Full HD 1080p</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                        10 Mbps · 30 FPS
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-normal mt-0.5">
                      1920×1080 · 10 Mbps · Texto cristalino
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQuality('720p')}
                    className={`px-3 py-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      selectedQuality === '720p'
                        ? 'border-white/25 bg-white/[0.08] text-zinc-200 font-semibold'
                        : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>HD 720p</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                        6 Mbps · 30 FPS
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-normal mt-0.5">
                      1280×720 · 6 Mbps · Rápido & Leve
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Canvas Preview & Progress bar during rendering */}
        <div className={isRendering ? 'flex flex-col gap-3' : 'sr-only'}>
          {/* Important browser warning for real-time rendering */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Atenção:</strong> Mantenha esta aba aberta e em primeiro plano durante a exportação. O navegador reduz o ritmo de renderização de quadros se você mudar de aba.
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-[#0a0f20] border border-white/10 flex items-center justify-center max-h-44">
            <canvas
              ref={canvasRef}
              className="w-full max-h-44 object-contain"
            />
          </div>

          {progress && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/15 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-2.5">
                  <ExplicodeLogo
                    variant="progress"
                    progress={progress.percent / 100}
                    className="w-5 h-5 text-sky-400 shrink-0"
                  />
                  <span>Renderizando vídeo e áudio ({progress.currentSegment}/{progress.totalSegments})...</span>
                </span>
                <span className="font-mono text-zinc-200 font-bold">{progress.percent}%</span>
              </div>

              {/* Visual progress bar */}
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-400 h-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <p className="text-[11px] text-zinc-400">{progress.statusText}</p>
            </div>
          )}
        </div>

        {/* Render Error */}
        {renderError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{renderError}</span>
          </div>
        )}

        {/* Success Preview & Download */}
        {generatedVideoUrl && (
          <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/15">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
                <Check className="w-4 h-4" /> Vídeo e áudio empacotados com sucesso!
              </span>
              <span className="text-[11px] text-zinc-400 uppercase font-mono">
                {selectedFormat}
              </span>
            </div>

            {/* Embedded video player so user can preview video with audio immediately */}
            <div className="relative rounded-lg overflow-hidden bg-[#0a0f20] aspect-video max-h-56 flex items-center justify-center border border-white/10">
              <video
                src={generatedVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-zinc-200 font-semibold text-xs rounded-xl transition-all cursor-pointer backdrop-blur-md"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Vídeo {selectedFormat.toUpperCase()} ({generatedFilename})</span>
              </button>

              <button
                type="button"
                onClick={() => setGeneratedVideoUrl(null)}
                className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 text-xs rounded-xl transition-colors cursor-pointer"
              >
                Gerar Outro
              </button>
            </div>
          </div>
        )}

        {/* Copy code bar or Conceptual Mode summary */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-300">
              {script.code.length > 0 ? 'Código do Roteiro' : 'Roteiro Conceitual'}
            </p>
            <p className="text-[11px] text-zinc-400">
              {script.code.length > 0
                ? `${script.code.length} linhas de código limpo`
                : `${script.segments.length} cenas visuais sincronizadas por palavra`}
            </p>
          </div>
          {script.code.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAllCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-lg text-xs font-medium border border-white/10 transition-colors cursor-pointer"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-zinc-200" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
            </button>
          )}
        </div>

        {/* Footer controls */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              isCancelledRef.current = true;
              onClose();
            }}
            disabled={isRendering}
            className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>

          {!generatedVideoUrl && (
            <button
              type="button"
              onClick={handleStartRender}
              disabled={isRendering}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 disabled:opacity-50 text-zinc-200 font-semibold text-xs rounded-xl transition-all cursor-pointer backdrop-blur-md"
            >
              {isRendering ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Gravando vídeo e áudio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Renderizar & Baixar Vídeo ({selectedFormat.toUpperCase()})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
