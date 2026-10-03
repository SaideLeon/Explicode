import { CodeScript, ThemeConfig, AspectRatioType, GeminiMaleVoice } from '@/types/script';
import { tokenizeLine } from '@/lib/tokenizer';
import { globalAudioCache } from '@/lib/audioCache';
import { Scene, withNarration, speechBounds } from '@/lib/scene';
import { drawSceneOnCanvas } from '@/lib/sceneCanvas';

export type VideoQualityPreset = '720p' | '1080p';

export interface RenderProgress {
  currentSegment: number;
  totalSegments: number;
  percent: number;
  statusText: string;
}

export interface RenderVideoOptions {
  script: CodeScript;
  theme: ThemeConfig;
  aspectRatio: AspectRatioType;
  geminiVoice: GeminiMaleVoice;
  format: 'mp4' | 'webm';
  quality?: VideoQualityPreset;
  onProgress: (progress: RenderProgress) => void;
  shouldCancel?: () => boolean;
}

/**
 * Creates an audio buffer with a clean ambient sound wave so playback is never completely silent
 * if the TTS API experiences temporary rate limits on a particular segment.
 */
function createFallbackAudioBuffer(audioCtx: AudioContext, durationSeconds: number): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.sin((Math.PI * i) / numSamples);
    data[i] = Math.sin(2 * Math.PI * 130 * t) * 0.015 * env;
  }
  return buffer;
}

/**
 * Wraps subtitle text into balanced lines so detailed explanations are never cut off.
 */
function wrapSubtitleLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Renders the animated code video and humanized voice into a high-definition combined MediaStream,
 * using a pre-rendered static background layer for low memory footprint and crisp vector typography.
 */
export async function renderScriptToVideoBlob(
  canvas: HTMLCanvasElement,
  options: RenderVideoOptions
): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const {
    script,
    theme,
    aspectRatio,
    geminiVoice,
    format,
    quality = '1080p',
    onProgress,
    shouldCancel,
  } = options;

  // Ensure web fonts (JetBrains Mono & Plus Jakarta Sans) are loaded before drawing
  if (typeof document !== 'undefined' && 'fonts' in document) {
    await document.fonts.ready.catch(() => {});
  }

  // Base logical coordinate space (1:1 integer coordinates at 720p, 1.5x supersampled at 1080p)
  let logicalW = 1280;
  let logicalH = 720;
  if (aspectRatio === '9x16') {
    logicalW = 720;
    logicalH = 1280;
  } else if (aspectRatio === '1x1') {
    logicalW = 800;
    logicalH = 800;
  }

  const scaleFactor = quality === '1080p' ? 1.5 : 1.0;
  const width = Math.round(logicalW * scaleFactor);
  const height = Math.round(logicalH * scaleFactor);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Não foi possível obter contexto 2D do Canvas');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Tokenize code lines once
  const tokenizedLines = script.code.map((line) => tokenizeLine(line));

  // Layout geometry in logical coordinates
  const marginX = aspectRatio === '9x16' ? 24 : 40;
  const marginY = aspectRatio === '9x16' ? 48 : 36;
  const windowWidth = logicalW - marginX * 2;
  const windowHeight = logicalH - marginY * 2;
  const headerHeight = 46;
  const footerHeight = 68;
  const codeStartY = marginY + headerHeight + 34;
  const maxCodeAreaH = windowHeight - headerHeight - footerHeight - 62;
  const defaultLineH = aspectRatio === '9x16' ? 36 : 29;
  const lineHeight = Math.max(
    22,
    Math.min(defaultLineH, Math.floor(maxCodeAreaH / Math.max(1, script.code.length)))
  );
  // In 9:16 mobile portrait, use 19px font for crystal clear readability on phone screens
  const fontSize = aspectRatio === '9x16' ? (lineHeight < 28 ? 16 : 19) : lineHeight < 26 ? 13.5 : 15;
  const lineNumWidth = 38;
  const codeStartX = marginX + lineNumWidth + 24;

  // Pre-render the static background & window frame ONCE onto an offscreen canvas
  // This avoids redrawing gradients, window chrome, borders, and static line numbers on every frame.
  const staticCanvas = document.createElement('canvas');
  staticCanvas.width = width;
  staticCanvas.height = height;
  const sCtx = staticCanvas.getContext('2d', { alpha: false });
  if (sCtx) {
    sCtx.scale(scaleFactor, scaleFactor);
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';

    // 1. Background gradient
    const bgGrad = sCtx.createLinearGradient(0, 0, logicalW, logicalH);
    if (theme.id === 'tokyo-night') {
      bgGrad.addColorStop(0, '#1a1b26');
      bgGrad.addColorStop(1, '#0c0d14');
    } else if (theme.id === 'monokai-pro') {
      bgGrad.addColorStop(0, '#2d2a2e');
      bgGrad.addColorStop(1, '#19181a');
    } else if (theme.id === 'synthwave-sunset') {
      bgGrad.addColorStop(0, '#261447');
      bgGrad.addColorStop(1, '#11052C');
    } else if (theme.id === 'emerald-dark') {
      bgGrad.addColorStop(0, '#06201b');
      bgGrad.addColorStop(1, '#020b09');
    } else {
      bgGrad.addColorStop(0, '#0b0f19');
      bgGrad.addColorStop(1, '#05070e');
    }
    sCtx.fillStyle = bgGrad;
    sCtx.fillRect(0, 0, logicalW, logicalH);

    // 2. Crisp layered elevation shadow (drawn once in static buffer)
    sCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    sCtx.beginPath();
    sCtx.roundRect(marginX + 2, marginY + 10, windowWidth, windowHeight, 16);
    sCtx.fill();

    // 3. Editor Window Box
    sCtx.fillStyle = 'rgba(13, 19, 36, 0.96)';
    sCtx.strokeStyle = theme.headerBorder || 'rgba(255, 255, 255, 0.12)';
    sCtx.lineWidth = 1.5;
    sCtx.beginPath();
    sCtx.roundRect(marginX, marginY, windowWidth, windowHeight, 16);
    sCtx.fill();
    sCtx.stroke();

    // 4. Top Title Bar
    sCtx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    sCtx.beginPath();
    sCtx.roundRect(marginX, marginY, windowWidth, headerHeight, [16, 16, 0, 0]);
    sCtx.fill();

    sCtx.strokeStyle = theme.headerBorder || 'rgba(255, 255, 255, 0.1)';
    sCtx.lineWidth = 1;
    sCtx.beginPath();
    sCtx.moveTo(marginX, marginY + headerHeight);
    sCtx.lineTo(marginX + windowWidth, marginY + headerHeight);
    sCtx.stroke();

    // macOS window dots
    const dotsY = marginY + 23;
    const dotRadius = 5.5;
    sCtx.fillStyle = '#ff5f56';
    sCtx.beginPath();
    sCtx.arc(marginX + 22, dotsY, dotRadius, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#ffbd2e';
    sCtx.beginPath();
    sCtx.arc(marginX + 39, dotsY, dotRadius, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#27c93f';
    sCtx.beginPath();
    sCtx.arc(marginX + 56, dotsY, dotRadius, 0, Math.PI * 2);
    sCtx.fill();

    // Filename & Title
    sCtx.fillStyle = '#e2e8f0';
    sCtx.font = '600 13.5px "JetBrains Mono", monospace';
    sCtx.fillText(script.file || 'codigo.js', marginX + 78, dotsY + 4.5);

    sCtx.fillStyle = theme.headerText || '#94a3b8';
    sCtx.font = '600 12.5px "Plus Jakarta Sans", sans-serif';
    sCtx.textAlign = 'right';
    sCtx.fillText(script.title || 'Soara', marginX + windowWidth - 22, dotsY + 4.5);
    sCtx.textAlign = 'left';

    // 5. Subtitle Footer Bar Background
    const capY = marginY + windowHeight - footerHeight;
    sCtx.fillStyle = theme.captionBg || 'rgba(5, 8, 18, 0.65)';
    sCtx.beginPath();
    sCtx.roundRect(marginX, capY, windowWidth, footerHeight, [0, 0, 16, 16]);
    sCtx.fill();

    sCtx.strokeStyle = theme.headerBorder || 'rgba(255, 255, 255, 0.08)';
    sCtx.beginPath();
    sCtx.moveTo(marginX, capY);
    sCtx.lineTo(marginX + windowWidth, capY);
    sCtx.stroke();

    // 6. Static Line Numbers
    sCtx.fillStyle = theme.lineNumber || '#64748b';
    sCtx.font = '500 12.5px "JetBrains Mono", monospace';
    sCtx.textAlign = 'right';
    for (let l = 0; l < script.code.length; l++) {
      const y = Math.round(codeStartY + l * lineHeight);
      sCtx.fillText(String(l + 1), marginX + lineNumWidth + 6, y);
    }
    sCtx.textAlign = 'left';
  }

  // Audio Context at 24kHz (matching Gemini TTS native sample rate to cut AudioBuffer RAM by 50%)
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  let audioCtx: AudioContext;
  try {
    audioCtx = new AudioContextClass({ sampleRate: 24000 });
  } catch {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }
  const audioDest = audioCtx.createMediaStreamDestination();

  // Throttle progress state updates so React only re-renders when integer percent or segment changes
  let lastReportedPercent = -1;
  let lastReportedSegment = -1;
  const reportProgressSafe = (nextProgress: RenderProgress, force = false) => {
    if (
      force ||
      nextProgress.percent !== lastReportedPercent ||
      nextProgress.currentSegment !== lastReportedSegment
    ) {
      lastReportedPercent = nextProgress.percent;
      lastReportedSegment = nextProgress.currentSegment;
      onProgress(nextProgress);
    }
  };

  // Pre-fetch audio Blob URLs before recording starts so timing is uninterrupted
  reportProgressSafe(
    {
      currentSegment: 0,
      totalSegments: script.segments.length,
      percent: 5,
      statusText: 'Preparando áudios da narração em alta definição...',
    },
    true
  );

  const segmentAudioUrls: (string | undefined)[] = [];

  for (let i = 0; i < script.segments.length; i++) {
    if (shouldCancel && shouldCancel()) {
      await audioCtx.close().catch(() => {});
      throw new Error('Cancelado pelo usuário');
    }

    const seg = script.segments[i];
    const key = `${geminiVoice}::${seg.say.trim()}`;
    let audioUrl: string | undefined = globalAudioCache.get(key);

    if (!audioUrl) {
      reportProgressSafe(
        {
          currentSegment: i + 1,
          totalSegments: script.segments.length,
          percent: 5 + Math.floor((i / script.segments.length) * 25),
          statusText: `Sintetizando narração do trecho ${i + 1} de ${script.segments.length}...`,
        },
        true
      );

      try {
        const res = await fetch('/api/synthesize-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: seg.say.trim(),
            voiceName: geminiVoice,
            language: script.lang || 'pt-BR',
          }),
        });

        const rawText = await res.text();
        let data: { success?: boolean; audioUrl?: string } | null = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          console.warn('A API retornou resposta não-JSON:', rawText.slice(0, 100));
        }

        if (data && data.success && typeof data.audioUrl === 'string') {
          audioUrl = globalAudioCache.set(key, data.audioUrl);
        }
      } catch (fetchErr) {
        console.warn('Falha na requisição de áudio do trecho:', fetchErr);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    segmentAudioUrls.push(audioUrl);
  }

  // Fast, high-precision frame renderer using the cached static background canvas
  const drawFrame = (
    lineVisibilities: number[],
    activeCaretLine: number,
    focusRange: [number, number] | null,
    markTerm: string | null,
    outputVal: string | null,
    captionText: string,
    scene: Scene | null = null,
    sceneProgress = 0,
    sceneFade = 1,
    hookCardOpacity = 0
  ) => {
    // 1. Copy pre-rendered static background + window + line numbers in a single fast blit
    ctx.drawImage(staticCanvas, 0, 0);

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);

    // 2. Focus bar highlight if active
    if (focusRange) {
      const [fStart, fEnd] = focusRange;
      const focusTop = Math.round(codeStartY + fStart * lineHeight - 20);
      const focusH = Math.round((fEnd - fStart + 1) * lineHeight);

      ctx.fillStyle = theme.focusBg || 'rgba(59, 130, 246, 0.16)';
      ctx.beginPath();
      ctx.roundRect(marginX + 8, focusTop, windowWidth - 16, focusH, 8);
      ctx.fill();

      ctx.fillStyle = theme.focusBorder || theme.accent;
      ctx.beginPath();
      ctx.roundRect(marginX + 8, focusTop, 4, focusH, [8, 0, 0, 8]);
      ctx.fill();
    }

    // 3. Draw crisp syntax-highlighted code lines
    ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
    for (let l = 0; l < script.code.length; l++) {
      const fullText = script.code[l];
      const visibleCount = lineVisibilities[l] ?? fullText.length;
      if (visibleCount <= 0 && activeCaretLine !== l) continue;

      const y = Math.round(codeStartY + l * lineHeight);
      let currentX = codeStartX;
      const tokens = tokenizedLines[l] || [];

      let charsDrawn = 0;
      for (const tok of tokens) {
        if (charsDrawn >= visibleCount) break;

        const remainingChars = visibleCount - charsDrawn;
        const textToDraw = tok.text.slice(0, remainingChars);
        const isMarked = Boolean(
          markTerm &&
          (tok.text.includes(markTerm) || (tok.text.length >= 2 && markTerm.includes(tok.text))) &&
          (!focusRange || (l >= focusRange[0] && l <= focusRange[1]))
        );

        const tokenWidth = ctx.measureText(textToDraw).width;

        if (isMarked) {
          ctx.save();
          // Halo glow
          ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
          ctx.beginPath();
          ctx.roundRect(Math.round(currentX - 5), y - 19, Math.round(tokenWidth + 10), 26, 7);
          ctx.fill();

          // Badge background
          ctx.fillStyle = theme.markBg || '#facc15';
          ctx.beginPath();
          ctx.roundRect(Math.round(currentX - 3), y - 17, Math.round(tokenWidth + 6), 23, 5);
          ctx.fill();

          // Embroidered border outline ("bordado")
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // High contrast bold text
          ctx.fillStyle = theme.markText || '#090b14';
          ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
          ctx.fillText(textToDraw, Math.round(currentX), y);
          ctx.restore();
        } else {
          ctx.fillStyle =
            theme.syntax[tok.cls as keyof typeof theme.syntax] || theme.codeText || '#f8fafc';
          ctx.fillText(textToDraw, Math.round(currentX), y);
        }

        currentX += tokenWidth;
        charsDrawn += textToDraw.length;
      }

      // Draw typing caret
      if (activeCaretLine === l) {
        ctx.fillStyle = theme.accent || '#38bdf8';
        ctx.fillRect(Math.round(currentX + 2), y - 15, 2.5, 19);
      }
    }

    // 3b. Visual scene (boxes, arrows, icons) drawn over the code area
    if (scene) {
      const sceneTop = marginY + headerHeight + 1;
      const sceneBottom = marginY + windowHeight - footerHeight - (outputVal ? 46 : 0);
      drawSceneOnCanvas(
        ctx,
        scene,
        sceneProgress,
        theme,
        { x: marginX + 1, y: sceneTop, w: windowWidth - 2, h: sceneBottom - sceneTop },
        sceneFade
      );
    }

    // 4. Output Console Pill (if present)
    if (outputVal) {
      const outY = Math.round(marginY + windowHeight - footerHeight - 44);
      ctx.fillStyle = theme.outputBg || 'rgba(2, 6, 23, 0.85)';
      ctx.strokeStyle = `${theme.accent}55`;
      ctx.lineWidth = 1.2;

      const outText = ` Saída: ${outputVal} `;
      ctx.font = '600 13px "JetBrains Mono", monospace';
      const outW = Math.round(ctx.measureText(outText).width + 34);

      ctx.beginPath();
      ctx.roundRect(marginX + 20, outY, outW, 32, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.outputLabel || '#94a3b8';
      ctx.fillText('> Saída: ', marginX + 32, outY + 20);

      ctx.fillStyle = theme.outputValue || '#4ade80';
      ctx.fillText(outputVal, marginX + 94, outY + 20);
    }

    // 5. Subtitle Caption Text (supports up to 3 lines per page + progressive pagination for detailed explanations)
    if (captionText) {
      const capY = marginY + windowHeight - footerHeight;
      ctx.fillStyle = theme.captionText || '#f8fafc';
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      const allLines = wrapSubtitleLines(ctx, captionText, windowWidth - 44);
      let visibleLines = allLines;
      if (allLines.length > 3) {
        const pages: string[][] = [];
        for (let i = 0; i < allLines.length; i += 3) {
          pages.push(allLines.slice(i, i + 3));
        }
        const pageIdx = Math.min(
          pages.length - 1,
          Math.floor(Math.max(0, Math.min(0.999, sceneProgress)) * pages.length)
        );
        visibleLines = pages[pageIdx];
      }

      if (visibleLines.length === 1) {
        ctx.fillText(visibleLines[0], marginX + 22, Math.round(capY + 38));
      } else if (visibleLines.length === 2) {
        ctx.fillText(visibleLines[0], marginX + 22, Math.round(capY + 27));
        ctx.fillText(visibleLines[1], marginX + 22, Math.round(capY + 47));
      } else if (visibleLines.length >= 3) {
        ctx.fillText(visibleLines[0], marginX + 22, Math.round(capY + 20));
        ctx.fillText(visibleLines[1], marginX + 22, Math.round(capY + 38));
        ctx.fillText(visibleLines[2], marginX + 22, Math.round(capY + 56));
      }
    }

    // 6. Hook Card (first 2.2s in 9:16 portrait mode to maximize feed retention)
    if (hookCardOpacity > 0 && script.title) {
      ctx.save();
      ctx.globalAlpha = hookCardOpacity;
      const cardW = Math.min(windowWidth - 40, 440);
      const cardH = 48;
      const cardX = marginX + (windowWidth - cardW) / 2;
      const cardY = marginY + 12;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = theme.accent || '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.accent || '#38bdf8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('SOARA', cardX + 16, cardY + 19);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      const cleanTitle =
        script.title.length > 42 ? `${script.title.slice(0, 40)}...` : script.title;
      ctx.fillText(cleanTitle, cardX + 16, cardY + 37);
      ctx.restore();
    }

    ctx.restore();
  };

  // Draw initial frame before starting captureStream
  const lineVisibilities = new Array(script.code.length).fill(0);
  const initialScene = script.code.length === 0 ? script.segments[0]?.scene ?? null : null;
  drawFrame(lineVisibilities, -1, null, null, null, '', initialScene, 0.1, 1, 1);

  // Combined MediaStream at 30 FPS for buttery smooth text typing and graphics
  const targetFps = 30;
  const frameIntervalMs = 1000 / targetFps;
  const videoStream = canvas.captureStream(targetFps);
  const videoTrack = videoStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & {
    requestFrame?: () => void;
  };
  const audioTrack = audioDest.stream.getAudioTracks()[0];
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...(audioTrack ? [audioTrack] : []),
  ]);

  // Prefer native MP4 if requested and supported by the browser, otherwise H.264/VP8 WebM
  const candidateMimeTypes =
    format === 'mp4'
      ? [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=avc1,mp4a.40.2',
          'video/mp4',
          'video/webm;codecs=h264,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ]
      : [
          'video/webm;codecs=h264,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9,opus',
          'video/webm',
        ];

  let mimeType = 'video/webm';
  for (const candidate of candidateMimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
      mimeType = candidate;
      break;
    }
  }

  // Crystal-clear high-definition bitrate (10 Mbps for 1080p Full HD, 6 Mbps for 720p HD)
  // Guarantees razor-sharp syntax highlighting and vector lines
  const targetVideoBitrate = quality === '1080p' ? 10_000_000 : 6_000_000;

  const recordedChunks: BlobPart[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: targetVideoBitrate,
    audioBitsPerSecond: 192_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  // Decodifica o áudio de um segmento (fora do caminho crítico da gravação)
  const decodeSeg = async (idx: number): Promise<AudioBuffer> => {
    const sg = script.segments[idx];
    const url = segmentAudioUrls[idx];
    const fallbackDur = Math.max(2, sg.say.split(/\s+/).length / 2.5);
    if (!url) return createFallbackAudioBuffer(audioCtx, fallbackDur);
    try {
      const res = await fetch(url);
      const arrayBuf = await res.arrayBuffer();
      return await audioCtx.decodeAudioData(arrayBuf);
    } catch {
      return createFallbackAudioBuffer(audioCtx, fallbackDur);
    }
  };

  // Pré-decodifica o primeiro segmento ANTES de ligar o gravador
  let nextBufPromise: Promise<AudioBuffer> | null =
    script.segments.length > 0 ? decodeSeg(0) : null;
  const firstBuf = nextBufPromise ? await nextBufPromise : null;
  nextBufPromise = firstBuf ? Promise.resolve(firstBuf) : null;

  // Flush encoded video chunks every 500ms so uncompressed frames never accumulate in RAM
  recorder.start(500);

  // Play and render each segment, decoding the NEXT one while the current plays
  for (let sIdx = 0; sIdx < script.segments.length; sIdx++) {
    if (shouldCancel && shouldCancel()) {
      if (recorder.state !== 'inactive') recorder.stop();
      videoStream.getTracks().forEach((t) => t.stop());
      combinedStream.getTracks().forEach((t) => t.stop());
      await audioCtx.close().catch(() => {});
      throw new Error('Cancelado pelo usuário');
    }

    const seg = script.segments[sIdx];

    const audioBuf: AudioBuffer = await (nextBufPromise as Promise<AudioBuffer>);
    // Começa já a decodificar o segmento seguinte, em paralelo
    nextBufPromise = sIdx + 1 < script.segments.length ? decodeSeg(sIdx + 1) : null;

    const segDuration = audioBuf.duration;
    // Silêncio real no começo/fim do áudio: a cena sincroniza com a FALA, não com o arquivo
    const speechTiming = speechBounds(audioBuf);

    // Start playing audio buffer into the MediaStream recorder destination
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(audioDest);
    if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {});
    // Relógio do áudio: a animação segue o tempo real da fala, não o relógio da página
    const audioStartAt = audioCtx.currentTime;
    source.start(audioStartAt);

    const segFocus: [number, number] | null = seg.focus
      ? [seg.focus[0] - 1, seg.focus[1] - 1]
      : seg.type
      ? [seg.type[0] - 1, seg.type[1] - 1]
      : null;

    const startType = seg.type ? seg.type[0] - 1 : 0;
    const endType = seg.type ? seg.type[1] - 1 : -1;

    let totalCharsInType = 0;
    if (seg.type) {
      for (let l = startType; l <= endType; l++) {
        totalCharsInType += script.code[l]?.length || 0;
      }
    }

    // Animate typing smoothly for this segment across the audio duration
    const typingDuration = seg.type
      ? Math.min(segDuration * 0.75, Math.max(1.2, totalCharsInType * 0.055))
      : 0.1;

    const durationMs = segDuration * 1000;
    let lastDrawTime = -frameIntervalMs;

    await new Promise<void>((resolveSeg) => {
      const renderLoop = () => {
        if (shouldCancel && shouldCancel()) {
          resolveSeg();
          return;
        }

        const now = performance.now();
        const elapsed = (audioCtx.currentTime - audioStartAt) * 1000;
        const progress = Math.min(1, elapsed / durationMs);

        if (now - lastDrawTime >= frameIntervalMs || progress >= 1) {
          lastDrawTime = now;

          const overallPercent =
            30 + Math.floor(((sIdx + progress) / script.segments.length) * 60);
          reportProgressSafe({
            currentSegment: sIdx + 1,
            totalSegments: script.segments.length,
            percent: overallPercent,
            statusText: `Renderizando trecho ${sIdx + 1} de ${script.segments.length} (${quality.toUpperCase()})...`,
          });

          // Calculate typing characters
          let activeCaret = -1;
          if (seg.type && totalCharsInType > 0) {
            const typeElapsed = Math.min(typingDuration * 1000, elapsed);
            const typeProgress = typeElapsed / (typingDuration * 1000);
            const charsToType = typeProgress * totalCharsInType;

            let accumulated = 0;
            for (let l = startType; l <= endType; l++) {
              const lineLen = script.code[l]?.length || 0;
              const lineTarget = Math.max(
                0,
                Math.min(lineLen, Math.floor(charsToType - accumulated))
              );
              lineVisibilities[l] = lineTarget;
              if (charsToType >= accumulated && charsToType <= accumulated + lineLen + 1) {
                activeCaret = l;
              }
              accumulated += lineLen;
            }
          }

          // Draw frame using static background cache + crisp vector code text
          const rawScene =
            seg.scene ?? (script.code.length === 0 ? script.segments[0]?.scene ?? null : null);
          const activeScene = rawScene ? withNarration(rawScene, seg.say, speechTiming) : null;
          const hookCardOpacity =
            sIdx === 0 && aspectRatio === '9x16'
              ? Math.max(0, Math.min(1, (2200 - elapsed) / 400))
              : 0;

          drawFrame(
            lineVisibilities,
            activeCaret,
            segFocus,
            seg.mark || null,
            seg.output !== undefined ? String(seg.output) : null,
            seg.say,
            activeScene,
            progress,
            Math.min(1, elapsed / 250),
            hookCardOpacity
          );

          if (videoTrack && typeof videoTrack.requestFrame === 'function') {
            try {
              videoTrack.requestFrame();
            } catch {
              // ignore
            }
          }
        }

        if (progress < 1) {
          requestAnimationFrame(renderLoop);
        } else {
          // Finish typing lines for this segment
          if (seg.type) {
            for (let l = startType; l <= endType; l++) {
              lineVisibilities[l] = script.code[l]?.length || 0;
            }
          }
          resolveSeg();
        }
      };

      requestAnimationFrame(renderLoop);
    });

    // Release audio node and buffer reference immediately after segment finishes
    try {
      source.stop();
    } catch {
      // already stopped
    }
    source.disconnect();
    source.buffer = null;
  }

  // Small tail pause at the end (0.4s) so video ends gracefully
  await new Promise((r) => setTimeout(r, 400));

  reportProgressSafe(
    {
      currentSegment: script.segments.length,
      totalSegments: script.segments.length,
      percent: 92,
      statusText:
        format === 'mp4'
          ? `Masterizando MP4 ${quality.toUpperCase()} com nitidez máxima...`
          : 'Finalizando arquivo de vídeo...',
    },
    true
  );

  // Stop recorder and collect final WebM blob
  const webmBlob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const fullBlob = new Blob(recordedChunks, { type: mimeType });
      recordedChunks.length = 0;
      resolve(fullBlob);
    };
    if (recorder.state !== 'inactive') {
      try {
        recorder.requestData(); // garante o último fragmento
      } catch {
        // ignore
      }
      recorder.stop();
    } else {
      resolve(new Blob(recordedChunks, { type: mimeType }));
    }
  });

  // Free static canvas and media tracks immediately
  staticCanvas.width = 1;
  staticCanvas.height = 1;
  videoStream.getTracks().forEach((t) => t.stop());
  combinedStream.getTracks().forEach((t) => t.stop());
  await audioCtx.close().catch(() => {});

  const baseFilename = script.file.replace(/\.[^/.]+$/, '') || 'codigo-explicado';

  // NOTA: o MP4 nativo do MediaRecorder é fragmentado e não traz a duração total.
  // Por isso passa SEMPRE pelo servidor (remux com ffmpeg) para corrigir os metadados.

  // If format is MP4, convert via server endpoint with strict binary validation
  if (format === 'mp4') {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const formData = new FormData();
        formData.append('video', webmBlob, 'input.webm');
        formData.append('filename', `${baseFilename}-${quality}.mp4`);

        const res = await fetch('/api/convert-to-mp4', {
          method: 'POST',
          body: formData,
        });

        const contentType = (res.headers.get('content-type') || '').toLowerCase();

        if (res.ok && contentType.includes('video/mp4')) {
          const mp4Blob = await res.blob();
          // Verify that the returned blob is not an HTML error/warmup page disguised as 200 OK
          const prefixText = await mp4Blob.slice(0, 32).text().catch(() => '');
          const isHtmlPage =
            prefixText.trimStart().toLowerCase().startsWith('<!doctype') ||
            prefixText.trimStart().toLowerCase().startsWith('<html');

          if (!isHtmlPage && mp4Blob.size > 1024) {
            return {
              blob: new Blob([mp4Blob], { type: 'video/mp4' }),
              mimeType: 'video/mp4',
              filename: `${baseFilename}-${quality}.mp4`,
            };
          }
        }

        // If server was warming up (returned text/html), wait 2.5s and retry once
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      } catch (convErr) {
        console.warn('Erro ao converter para MP4 na tentativa', attempt + 1, convErr);
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  }

  // Fallback: return the valid recorded video blob (never an HTML file)
  const isNativeMp4 = mimeType.startsWith('video/mp4');
  return {
    blob: new Blob([webmBlob], { type: isNativeMp4 ? 'video/mp4' : 'video/webm' }),
    mimeType: isNativeMp4 ? 'video/mp4' : 'video/webm',
    filename: `${baseFilename}-${quality}.${isNativeMp4 ? 'mp4' : 'webm'}`,
  };
}
