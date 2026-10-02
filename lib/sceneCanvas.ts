import {
  Scene,
  SCENE_W,
  SCENE_H,
  CAPTION,
  NODE_DUR,
  ARROW_DUR,
  resolveScene,
  resolveSceneColor,
  appearAmount,
  easeOutCubic,
  easeOutBack,
  toSpeechProgress,
  currentWordIndex,
  chunkIndexAt,
  chunkLines,
  clamp01,
} from '@/lib/scene';
import { ThemeConfig } from '@/types/script';

export interface SceneArea {
  x: number; // logical coordinates
  y: number;
  w: number;
  h: number;
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif';

/**
 * Draws a Scene on a 2D canvas (export path). Uses the exact same layout,
 * geometry and timing as the live preview (lib/scene.ts).
 *
 * `progress` is the progress of the AUDIO (0..1). The scene must have been
 * passed through withNarration() so elements can be tied to spoken words.
 * `fade` (0..1) is the cross-fade between code and scene.
 * The caller must already be in logical coordinates (ctx.scale applied).
 */
export function drawSceneOnCanvas(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  progress: number,
  theme: ThemeConfig,
  area: SceneArea,
  fade: number
) {
  if (fade <= 0) return;
  const accent = theme.accent || '#38bdf8';
  const resolved = resolveScene(scene);
  const sp = toSpeechProgress(progress, scene); // tempo da FALA, sem silêncios

  ctx.save();

  // Opaque panel covers the code underneath (fades in over it)
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#0d1324';
  ctx.fillRect(area.x, area.y, area.w, area.h);

  // Fit the 160x90 virtual space inside the area ("contain")
  const pad = 8;
  const u = Math.min((area.w - pad * 2) / SCENE_W, (area.h - pad * 2) / SCENE_H);
  const ox = area.x + (area.w - SCENE_W * u) / 2;
  const oy = area.y + (area.h - SCENE_H * u) / 2;

  ctx.translate(ox, oy);
  ctx.scale(u, u);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Title
  if (resolved.title) {
    const t = easeOutCubic(appearAmount(0, progress, 0.06));
    ctx.globalAlpha = fade * 0.9 * t;
    ctx.fillStyle = theme.headerText || '#94a3b8';
    ctx.font = `700 3.6px ${SANS}`;
    ctx.fillText(resolved.title.toUpperCase(), SCENE_W / 2, 9 - (1 - t) * 4);
  }

  // Arrows
  for (const { arrow, geo, at } of resolved.arrows) {
    const t = appearAmount(at, sp, ARROW_DUR);
    if (t <= 0) continue;
    const color = resolveSceneColor(arrow.color, accent);
    const lineT = easeOutCubic(Math.min(1, t * 1.25));
    const ex = geo.x1 + (geo.x2 - geo.x1) * lineT;
    const ey = geo.y1 + (geo.y2 - geo.y1) * lineT;

    ctx.globalAlpha = fade * 0.95;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.setLineDash(arrow.dashed ? [2.2, 1.8] : []);
    ctx.beginPath();
    ctx.moveTo(geo.x1, geo.y1);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    if (t > 0.8) {
      ctx.globalAlpha = fade * Math.min(1, (t - 0.8) / 0.2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(geo.head[0][0], geo.head[0][1]);
      ctx.lineTo(geo.head[1][0], geo.head[1][1]);
      ctx.lineTo(geo.head[2][0], geo.head[2][1]);
      ctx.closePath();
      ctx.fill();
    }

    if (arrow.label && t > 0.5) {
      ctx.globalAlpha = fade * Math.min(1, (t - 0.5) / 0.5) * 0.95;
      ctx.fillStyle = color;
      ctx.font = `600 2.9px ${SANS}`;
      ctx.textAlign = geo.labelAnchor === 'start' ? 'left' : 'center';
      ctx.fillText(arrow.label, geo.labelX, geo.labelY);
      ctx.textAlign = 'center';
    }
  }

  // Nodes
  for (const { node, layout, at } of resolved.nodes) {
    const raw = appearAmount(at, sp, NODE_DUR);
    if (raw <= 0) continue;
    const color = resolveSceneColor(node.color, accent);
    const scale = 0.6 + 0.4 * easeOutBack(raw);

    ctx.save();
    ctx.globalAlpha = fade * Math.min(1, raw * 1.6);
    ctx.translate(layout.cx, layout.cy);
    ctx.scale(scale, scale);
    ctx.translate(-layout.cx, -layout.cy);

    if (layout.framed) {
      const x = layout.cx - layout.w / 2;
      const y = layout.cy - layout.h / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, layout.w, layout.h, 2.6);
      ctx.save();
      ctx.globalAlpha *= 0.14;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    const fontFamily = node.mono
      ? '"JetBrains Mono", ui-monospace, monospace'
      : SANS;

    for (const line of layout.lines) {
      if (line.type === 'icon') {
        ctx.font = `${line.size}px ${EMOJI_FONT}`;
        ctx.fillStyle = color;
        ctx.fillText(line.text, layout.cx, line.y);
      } else if (line.type === 'sub') {
        ctx.save();
        ctx.globalAlpha *= 0.7;
        ctx.font = `500 ${line.size}px ${fontFamily}`;
        ctx.fillStyle = theme.codeText || '#e2e8f0';
        ctx.fillText(line.text, layout.cx, line.y);
        ctx.restore();
      } else {
        ctx.font = `700 ${line.size}px ${fontFamily}`;
        ctx.fillStyle =
          node.kind === 'text' ? (node.color ? color : theme.codeText || '#e2e8f0') : '#f8fafc';
        ctx.fillText(line.text, layout.cx, line.y);
      }
    }
    ctx.restore();
  }

  // Kinetic caption (karaokê): frase curta atual, palavra falada em destaque
  if (resolved.caption && resolved.chunks.length > 0) {
    const { words, chunks, emph } = resolved;
    const cur = currentWordIndex(words, sp);
    const ci = chunkIndexAt(chunks, cur);
    const chunk = chunks[ci];
    const lines = chunkLines(words, chunk);
    const chunkStart = ci === 0 ? 0 : words[chunk.from].start;
    const enter = easeOutCubic(clamp01((sp - chunkStart) / 0.02));

    // Backdrop
    ctx.globalAlpha = fade * 0.9;
    ctx.beginPath();
    ctx.roundRect(CAPTION.left, CAPTION.top + 1, CAPTION.width, CAPTION.height, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fill();
    ctx.strokeStyle = `${accent}33`;
    ctx.lineWidth = 0.3;
    ctx.stroke();

    // Progress hairline
    ctx.globalAlpha = fade * 0.85;
    ctx.fillStyle = accent;
    ctx.fillRect(CAPTION.left + 3, CAPTION.top + CAPTION.height - 0.6, (CAPTION.width - 6) * sp, 0.5);

    ctx.font = `700 ${CAPTION.size}px ${SANS}`;
    ctx.textAlign = 'left';
    const space = ctx.measureText(' ').width;
    const centerY = CAPTION.top + 1 + CAPTION.height / 2 - 0.4;

    lines.forEach((idxs, li) => {
      const widths = idxs.map((i) => ctx.measureText(words[i].text).width);
      const lineW = widths.reduce((a, b) => a + b, 0) + space * (idxs.length - 1);
      let x = SCENE_W / 2 - lineW / 2;
      const y = centerY + (li - (lines.length - 1) / 2) * CAPTION.lineH + (1 - enter) * 2;

      idxs.forEach((wi, k) => {
        const emphColor = emph[wi] ? resolveSceneColor(emph[wi], accent) : null;
        let color = '#f8fafc';
        let alpha = 1;
        if (wi > cur) {
          alpha = 0.28; // ainda não falada
          if (emphColor) color = emphColor;
        } else if (wi === cur) {
          color = emphColor ?? accent; // palavra sendo falada agora
        } else if (emphColor) {
          color = emphColor; // palavra-chave já falada
        }
        ctx.globalAlpha = fade * alpha * enter;
        ctx.fillStyle = color;
        ctx.fillText(words[wi].text, x, y);
        x += widths[k] + space;
      });
    });
    ctx.textAlign = 'center';
  }

  ctx.restore();
}
