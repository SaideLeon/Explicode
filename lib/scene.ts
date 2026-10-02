/**
 * Cenas visuais (setas, ícones, caixas) para explicações teóricas.
 *
 * Uma cena é descrita em JSON num espaço virtual de 160 x 90 unidades.
 * O preview (Motion/SVG) e a exportação (Canvas 2D) leem a MESMA descrição
 * e usam as mesmas funções de layout/geometria deste arquivo, para que o
 * vídeo exportado fique igual ao que se vê na tela.
 *
 * SINCRONIA (v2): cada nó/seta pode declarar `on` — a palavra (ou frase) da
 * narração que o faz aparecer. O tempo de cada palavra vem de uma linha do
 * tempo estimada (speechTimeline) e o progresso do áudio é alinhado à fala
 * real (toSpeechProgress). Veja BLUEPRINT-SINCRONIA.md.
 */

export const SCENE_W = 160;
export const SCENE_H = 90;

export type SceneColor =
  | 'accent'
  | 'blue'
  | 'green'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'slate';

export type SceneNodeKind = 'box' | 'icon' | 'text';

export interface SceneNode {
  id: string;
  kind?: SceneNodeKind; // box (padrão), icon (só o emoji + rótulo), text (só texto)
  x: number; // centro, 0..160
  y: number; // centro, 0..90
  w?: number; // largura (opcional, calculada se omitida)
  h?: number; // altura (opcional, calculada se omitida)
  icon?: string; // emoji
  label?: string; // use \n para quebrar linha
  sub?: string; // linha menor abaixo do rótulo
  color?: SceneColor;
  mono?: boolean; // fonte monoespaçada (bom para código)
  size?: number; // tamanho do texto (padrão 4)
  at?: number; // 0..1: momento em que aparece durante a narração (use `on` de preferência)
  on?: string | string[]; // palavra/frase da narração que dispara a aparição (vence `at`)
}

export interface SceneArrow {
  from: string;
  to: string;
  label?: string;
  color?: SceneColor;
  dashed?: boolean;
  at?: number;
  on?: string | string[]; // palavra/frase da narração que dispara a seta (vence `at`)
}

export interface SceneTiming {
  lead: number; // fração do áudio com silêncio no início (0..1)
  tail: number; // fração do áudio com silêncio no fim (0..1)
}

export interface Scene {
  title?: string;
  nodes: SceneNode[];
  arrows?: SceneArrow[];
  caption?: boolean; // false desliga o texto cinético (karaokê) na parte de baixo da cena
  /** Preenchidos em tempo de execução por withNarration() — não precisam estar no JSON. */
  say?: string;
  timing?: SceneTiming;
}

export const SCENE_PALETTE: Record<Exclude<SceneColor, 'accent'>, string> = {
  blue: '#60a5fa',
  green: '#4ade80',
  amber: '#fbbf24',
  rose: '#fb7185',
  violet: '#a78bfa',
  cyan: '#22d3ee',
  slate: '#94a3b8',
};

export function resolveSceneColor(color: SceneColor | undefined, accent: string): string {
  if (!color || color === 'accent') return accent;
  return SCENE_PALETTE[color] ?? accent;
}

// ---------------------------------------------------------------------------
// Layout dos nós (compartilhado)
// ---------------------------------------------------------------------------

export interface NodeLine {
  type: 'icon' | 'label' | 'sub';
  text: string;
  y: number; // centro da linha
  size: number; // unidades da cena
}

export interface NodeLayout {
  cx: number;
  cy: number;
  w: number;
  h: number;
  framed: boolean;
  lines: NodeLine[];
}

const LABEL_LINE = 1.25; // altura da linha = size * LABEL_LINE
const CHAR_W = 0.6; // largura média de um caractere = size * CHAR_W

export function nodeLayout(node: SceneNode): NodeLayout {
  const kind: SceneNodeKind = node.kind ?? 'box';
  const labelSize = (node.size ?? 4) * (kind === 'text' ? 1 : 1);
  const subSize = labelSize * 0.72;
  const iconSize = kind === 'icon' ? 12 : labelSize * 1.9;

  const labelLines = node.label ? node.label.split('\n') : [];
  const subLines = node.sub ? node.sub.split('\n') : [];

  const blocks: { type: NodeLine['type']; text: string; size: number; height: number }[] = [];
  if (node.icon && kind !== 'text') {
    blocks.push({ type: 'icon', text: node.icon, size: iconSize, height: iconSize * 1.05 });
  }
  labelLines.forEach((t) =>
    blocks.push({ type: 'label', text: t, size: labelSize, height: labelSize * LABEL_LINE })
  );
  subLines.forEach((t) =>
    blocks.push({ type: 'sub', text: t, size: subSize, height: subSize * LABEL_LINE })
  );

  const contentH = blocks.reduce((acc, b) => acc + b.height, 0);
  const gap = blocks.length > 1 ? 0.8 : 0;
  const totalH = contentH + gap * (blocks.length - 1);

  const widest = blocks.reduce((acc, b) => {
    const w = b.type === 'icon' ? b.size * 1.1 : b.text.length * b.size * CHAR_W;
    return Math.max(acc, w);
  }, 0);

  const framed = kind === 'box';
  const padX = framed ? 5 : 0;
  const padY = framed ? 3.5 : 0;

  // Nunca deixa o texto vazar da caixa: w/h informados viram o MÍNIMO
  // (o piso de 22x14 só vale quando w/h não foram informados).
  const needW = widest + padX * 2;
  const needH = totalH + padY * 2;
  const w = node.w ? Math.max(node.w, needW) : Math.max(framed ? 22 : 4, needW);
  const h = node.h ? Math.max(node.h, needH) : Math.max(framed ? 14 : 4, needH);

  const lines: NodeLine[] = [];
  let cursor = node.y - totalH / 2;
  blocks.forEach((b) => {
    lines.push({ type: b.type, text: b.text, y: cursor + b.height / 2, size: b.size });
    cursor += b.height + gap;
  });

  return { cx: node.x, cy: node.y, w, h, framed, lines };
}

// ---------------------------------------------------------------------------
// Geometria das setas (compartilhada)
// ---------------------------------------------------------------------------

export interface ArrowGeometry {
  x1: number;
  y1: number;
  x2: number; // ponta (já recuada para a borda do destino)
  y2: number;
  angle: number; // radianos
  head: [number, number][]; // triângulo da ponta
  labelX: number;
  labelY: number;
  labelAnchor: 'middle' | 'start';
}

function edgePoint(l: NodeLayout, tx: number, ty: number, gap: number): [number, number] {
  const dx = tx - l.cx;
  const dy = ty - l.cy;
  if (dx === 0 && dy === 0) return [l.cx, l.cy];
  const hw = l.w / 2 + gap;
  const hh = l.h / 2 + gap;
  const scale = Math.min(
    dx !== 0 ? hw / Math.abs(dx) : Infinity,
    dy !== 0 ? hh / Math.abs(dy) : Infinity
  );
  return [l.cx + dx * scale, l.cy + dy * scale];
}

export function arrowGeometry(from: NodeLayout, to: NodeLayout, label?: string): ArrowGeometry {
  const [x1, y1] = edgePoint(from, to.cx, to.cy, 1.2);
  const [x2, y2] = edgePoint(to, from.cx, from.cy, 1.6);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 2.8;
  const headHalf = 1.6;
  const bx = x2 - Math.cos(angle) * headLen;
  const by = y2 - Math.sin(angle) * headLen;
  const px = -Math.sin(angle);
  const py = Math.cos(angle);
  const head: [number, number][] = [
    [x2, y2],
    [bx + px * headHalf, by + py * headHalf],
    [bx - px * headHalf, by - py * headHalf],
  ];

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const mostlyVertical = Math.abs(y2 - y1) > Math.abs(x2 - x1);
  let labelX = mx;
  let labelY = my - 2.6;
  let labelAnchor: 'middle' | 'start' = 'middle';
  if (mostlyVertical && label) {
    labelX = mx + 2.4;
    labelY = my;
    labelAnchor = 'start';
  }
  return { x1, y1, x2, y2, angle, head, labelX, labelY, labelAnchor };
}

// ---------------------------------------------------------------------------
// Fala: linha do tempo por palavra (compartilhado)
// ---------------------------------------------------------------------------

/** Duração (fração da fala) da animação de entrada de nós e setas. */
export const NODE_DUR = 0.05;
export const ARROW_DUR = 0.07;
/** Pequeno atraso: o elemento nasce quando a palavra JÁ começou, nunca antes. */
export const WORD_LAG = 0.012;

/** Região reservada ao texto cinético (unidades da cena). */
export const CAPTION = { top: 70, left: 10, width: 140, height: 16, size: 4.6, lineH: 6.6, maxChars: 34 };

export interface SpeechWord {
  text: string; // como aparece na fala (com pontuação)
  norm: string; // minúsculo, sem acento nem pontuação
  start: number; // 0..1 da parte FALADA (já sem silêncio)
  end: number;
}

export function foldText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Estima quando cada palavra é falada. Peso por palavra = tamanho + base
 * (sílabas), com pausas depois de vírgula/ponto. É uma estimativa — mesmo
 * assim é MUITO mais fiel que dividir o tempo igualmente entre os nós.
 */
export function speechTimeline(say: string): SpeechWord[] {
  const tokens = (say || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const items = tokens.map((text, i) => {
    const norm = foldText(text);
    const len = norm.replace(/ /g, '').length;
    const last = i === tokens.length - 1;
    const pause = last ? 0 : /[.!?…]$/.test(text) ? 2.4 : /[,;:—–]$/.test(text) ? 1.2 : 0;
    return { text, norm, dur: 1.8 + len, pause };
  });
  const total = items.reduce((acc, it) => acc + it.dur + it.pause, 0);
  let cursor = 0;
  return items.map((it) => {
    const start = cursor / total;
    const end = (cursor + it.dur) / total;
    cursor += it.dur + it.pause;
    return { text: it.text, norm: it.norm, start, end };
  });
}

function stemMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  if (min < 4) return false;
  if (a.startsWith(b) || b.startsWith(a)) return true;
  let k = 0;
  while (k < min && a[k] === b[k]) k++;
  return k >= 5; // virtual/virtuais, hipervisor/hipervisores...
}

/** Índice da palavra onde `trigger` (palavra ou frase) é dita; -1 se não achar. Array = o que vier primeiro. */
export function findWord(words: SpeechWord[], trigger: string | string[] | undefined): number {
  if (!trigger) return -1;
  const list = Array.isArray(trigger) ? trigger : [trigger];
  let best = -1;
  for (const t of list) {
    const parts = foldText(String(t)).split(' ').filter(Boolean);
    if (parts.length === 0) continue;
    for (let i = 0; i + parts.length <= words.length; i++) {
      if (parts.every((p, k) => stemMatch(words[i + k].norm, p))) {
        if (best === -1 || i < best) best = i;
        break;
      }
    }
  }
  return best;
}

const STOP_WORDS = new Set([
  'para', 'como', 'mais', 'cada', 'todo', 'toda', 'esse', 'essa', 'isso', 'pelo', 'pela',
  'entre', 'sobre', 'uma', 'umas', 'dos', 'das', 'com', 'sem', 'seu', 'sua',
]);

/** Sem `on`: tenta casar as palavras do rótulo (depois do id) com a fala. */
function autoWord(words: SpeechWord[], node: SceneNode): number {
  const pick = (text: string | undefined): number => {
    if (!text) return -1;
    let best = -1;
    for (const tok of foldText(text).split(' ')) {
      if (tok.length < 4 || STOP_WORDS.has(tok)) continue;
      const idx = findWord(words, tok);
      if (idx >= 0 && (best === -1 || idx < best)) best = idx;
    }
    return best;
  };
  const byLabel = pick(node.label);
  return byLabel >= 0 ? byLabel : pick(node.id.replace(/[_-]+/g, ' '));
}

// ---------------------------------------------------------------------------
// Reparo de cenas incompletas (compartilhado)
// ---------------------------------------------------------------------------

const COLOR_CYCLE: SceneColor[] = ['blue', 'violet', 'cyan', 'green', 'amber', 'rose'];

function humanize(id: string): string {
  const t = id.replace(/[_-]+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/**
 * Deixa uma cena "mínima" (só id/x/y) utilizável:
 *  - nó sem conteúdo ganha rótulo derivado do id;
 *  - caixas sem cor recebem cores diferentes (antes ficavam todas âmbar);
 *  - se algo invade a faixa do texto cinético, comprime tudo na vertical.
 */
export function repairScene(scene: Scene): Scene {
  let ci = 0;
  let nodes = scene.nodes.map((n) => {
    const kind = n.kind ?? 'box';
    const next: SceneNode = { ...n };
    if (!next.label && !next.icon && !next.sub) next.label = humanize(n.id);
    if (!next.color && kind !== 'text') next.color = COLOR_CYCLE[ci++ % COLOR_CYCLE.length];
    return next;
  });

  if (scene.caption !== false) {
    const TOP = 18;
    const limit = CAPTION.top - 2;
    const maxBottom = Math.max(
      ...nodes.map((n) => {
        const l = nodeLayout(n);
        return l.cy + l.h / 2;
      })
    );
    if (maxBottom > limit && maxBottom > TOP) {
      const k = (limit - TOP) / (maxBottom - TOP);
      nodes = nodes.map((n) => (n.y > TOP ? { ...n, y: TOP + (n.y - TOP) * k } : n));
    }
  }
  return { ...scene, nodes };
}

// ---------------------------------------------------------------------------
// Texto cinético (karaokê): trechos curtos da fala, palavra a palavra
// ---------------------------------------------------------------------------

export interface CaptionChunk {
  from: number; // índice da primeira palavra
  to: number; // exclusivo
}

/** Quebra a fala em frases curtas (≤ maxWords), respeitando vírgulas e pontos. */
export function captionChunks(words: SpeechWord[], maxWords = 7): CaptionChunk[] {
  if (words.length === 0) return [];
  const clauses: CaptionChunk[] = [];
  let from = 0;
  words.forEach((w, i) => {
    if (/[.!?…,;:]$/.test(w.text) || i === words.length - 1) {
      clauses.push({ from, to: i + 1 });
      from = i + 1;
    }
  });
  const parts: CaptionChunk[] = [];
  for (const c of clauses) {
    const len = c.to - c.from;
    const n = Math.max(1, Math.ceil(len / maxWords));
    for (let p = 0; p < n; p++) {
      const a = c.from + Math.round((len * p) / n);
      const b = c.from + Math.round((len * (p + 1)) / n);
      if (b > a) parts.push({ from: a, to: b });
    }
  }
  const merged: CaptionChunk[] = [];
  for (let i = 0; i < parts.length; i++) {
    const c = parts[i];
    const nx = parts[i + 1];
    if (nx && c.to - c.from <= 2 && nx.to - c.from <= maxWords + 1) {
      merged.push({ from: c.from, to: nx.to });
      i++;
    } else {
      merged.push(c);
    }
  }
  return merged;
}

/** Distribui as palavras de um trecho em 1–2 linhas equilibradas (índices de palavras). */
export function chunkLines(words: SpeechWord[], chunk: CaptionChunk, maxChars = CAPTION.maxChars): number[][] {
  const idxs: number[] = [];
  for (let i = chunk.from; i < chunk.to; i++) idxs.push(i);
  const total = idxs.reduce((acc, i) => acc + words[i].text.length + 1, 0) - 1;
  const nLines = Math.max(1, Math.ceil(total / maxChars));
  const target = total / nLines;
  const lines: number[][] = [];
  let cur: number[] = [];
  let len = 0;
  for (const i of idxs) {
    const l = words[i].text.length;
    if (cur.length > 0 && lines.length < nLines - 1 && len + l / 2 > target) {
      lines.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(i);
    len += l + 1;
  }
  lines.push(cur);
  return lines;
}

/** Última palavra já iniciada em `s` (progresso da fala); -1 antes da primeira. */
export function currentWordIndex(words: SpeechWord[], s: number): number {
  let idx = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].start <= s) idx = i;
    else break;
  }
  return idx;
}

export function chunkIndexAt(chunks: CaptionChunk[], wordIdx: number): number {
  const w = Math.max(0, wordIdx);
  const i = chunks.findIndex((c) => w >= c.from && w < c.to);
  return i >= 0 ? i : Math.max(0, chunks.length - 1);
}

// ---------------------------------------------------------------------------
// Tempo (compartilhado)
// ---------------------------------------------------------------------------

export interface ResolvedScene {
  title?: string;
  nodes: { node: SceneNode; layout: NodeLayout; at: number; word: number }[];
  arrows: { arrow: SceneArrow; geo: ArrowGeometry; at: number }[];
  words: SpeechWord[];
  chunks: CaptionChunk[];
  emph: Record<number, SceneColor>; // palavra-gatilho → cor do objeto que ela faz aparecer
  caption: boolean;
}

/** Associa a cena à fala do trecho e ao silêncio real do áudio (opcional). */
export function withNarration(scene: Scene, say: string, timing?: SceneTiming): Scene {
  return { ...scene, say, timing };
}

/** Progresso do ÁUDIO (0..1) → progresso da FALA (0..1), descontando silêncios. */
export function toSpeechProgress(progress: number, scene: Scene): number {
  const lead = scene.timing?.lead ?? 0.03;
  const tail = scene.timing?.tail ?? 0.06;
  return clamp01((progress - lead) / Math.max(0.2, 1 - lead - tail));
}

/** Mede o silêncio no começo/fim do áudio real (usado na exportação). */
export function speechBounds(buf: AudioBuffer): SceneTiming {
  try {
    const data = buf.getChannelData(0);
    const win = Math.max(1, Math.floor(buf.sampleRate * 0.01));
    const nWin = Math.floor(data.length / win);
    if (nWin < 4) return { lead: 0, tail: 0 };
    const rms: number[] = new Array(nWin);
    let peak = 0;
    for (let w = 0; w < nWin; w++) {
      let sum = 0;
      for (let i = w * win; i < (w + 1) * win; i++) sum += data[i] * data[i];
      rms[w] = Math.sqrt(sum / win);
      if (rms[w] > peak) peak = rms[w];
    }
    const thr = Math.max(0.004, peak * 0.06);
    let first = 0;
    while (first < nWin && rms[first] < thr) first++;
    let last = nWin - 1;
    while (last > first && rms[last] < thr) last--;
    const total = nWin;
    return {
      lead: Math.min(0.25, first / total),
      tail: Math.min(0.25, (total - 1 - last) / total),
    };
  } catch {
    return { lead: 0.03, tail: 0.06 };
  }
}

/**
 * Calcula a geometria e o MOMENTO de cada elemento, no tempo da fala.
 * Prioridade do momento de um nó: `on` (palavra) > `at` numérico >
 * palavra do rótulo achada na fala > sequência uniforme (último recurso).
 * Setas nunca aparecem antes dos dois nós que ligam.
 */
export function resolveScene(input: Scene): ResolvedScene {
  const scene = repairScene(input);
  const words = speechTimeline(scene.say ?? '');
  const total = scene.nodes.length;
  const step = total > 0 ? 0.6 / total : 0.1;

  const nodes = scene.nodes.map((node, i) => {
    let word = findWord(words, node.on);
    let at: number;
    if (word >= 0) {
      at = words[word].start + WORD_LAG;
    } else if (typeof node.at === 'number') {
      at = node.at;
    } else {
      word = autoWord(words, node);
      at = word >= 0 ? words[word].start + WORD_LAG : 0.06 + i * step;
    }
    return { node, layout: nodeLayout(node), at: Math.max(0.02, at), word };
  });

  const byId = new Map(nodes.map((n) => [n.node.id, n]));

  const arrows = (scene.arrows ?? [])
    .map((arrow, i) => {
      const a = byId.get(arrow.from);
      const b = byId.get(arrow.to);
      if (!a || !b) return null;
      const ends = Math.max(a.at, b.at);
      const w = findWord(words, arrow.on);
      let at: number;
      if (w >= 0) at = words[w].start + WORD_LAG;
      else if (typeof arrow.at === 'number') at = arrow.at;
      else at = ends + 0.03 + (i % 2) * 0.01;
      at = Math.min(0.97, Math.max(at, ends + 0.005));
      const colored: SceneArrow = { ...arrow, color: arrow.color ?? a.node.color };
      return { arrow: colored, geo: arrowGeometry(a.layout, b.layout, arrow.label), at };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const emph: Record<number, SceneColor> = {};
  nodes.forEach(({ node, word }) => {
    if (word >= 0 && node.color && (node.kind ?? 'box') !== 'text') emph[word] = node.color;
  });

  return {
    title: scene.title,
    nodes,
    arrows,
    words,
    chunks: captionChunks(words),
    emph,
    caption: scene.caption !== false && words.length > 0,
  };
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutBack(t: number): number {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Quanto do elemento já "entrou" (0..1) no progresso `p` do trecho. */
export function appearAmount(at: number, p: number, duration = NODE_DUR): number {
  return clamp01((p - at) / duration);
}

// ---------------------------------------------------------------------------
// Validação / reparo
// ---------------------------------------------------------------------------

const VALID_COLORS: SceneColor[] = [
  'accent',
  'blue',
  'green',
  'amber',
  'rose',
  'violet',
  'cyan',
  'slate',
];

function cleanOn(v: unknown): string | string[] | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    const list = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim());
    return list.length > 0 ? list : undefined;
  }
  return undefined;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeScene(
  raw: unknown,
  prefix: string,
  changes: string[],
  sayText?: string
): Scene | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    changes.push(`${prefix}: "scene" inválida (precisa ser um objeto) e foi ignorada.`);
    return undefined;
  }

  const r = raw as Partial<Scene>;
  if (!Array.isArray(r.nodes) || r.nodes.length === 0) {
    changes.push(`${prefix}: "scene" sem "nodes" e foi ignorada.`);
    return undefined;
  }

  // Pre-tokenize words from sayText for semantic validation of "on" triggers
  const sayWords = sayText
    ? sayText
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 2)
    : [];
  const normalizedSay = sayText
    ? sayText
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    : '';

  const seen = new Set<string>();
  const nodes: SceneNode[] = [];

  r.nodes.slice(0, 14).forEach((n, idx) => {
    if (!n || typeof n !== 'object') return;
    const src = n as Partial<SceneNode>;
    let id = typeof src.id === 'string' && src.id.trim() ? src.id.trim() : `n${idx + 1}`;
    if (seen.has(id)) id = `${id}_${idx + 1}`;
    seen.add(id);

    const kind: SceneNodeKind =
      src.kind === 'icon' || src.kind === 'text' || src.kind === 'box' ? src.kind : 'box';
    const color =
      src.color && VALID_COLORS.includes(src.color) ? src.color : undefined;

    const rawY = num(src.y, SCENE_H / 2);
    // Strict vertical boundary: 18 to 64 (y > 66 is strictly reserved for kinetic subtitle captions)
    let safeY = Math.max(18, Math.min(64, rawY));
    if (rawY > 64) {
      changes.push(
        `${prefix}: nó "${id}" com y=${rawY} ajustado para ${safeY} (área y > 66 reservada para legendas).`
      );
    }

    const node: SceneNode = {
      id,
      kind,
      x: Math.max(12, Math.min(148, num(src.x, SCENE_W / 2))),
      y: safeY,
    };
    if (typeof src.w === 'number' && src.w > 0) node.w = Math.min(SCENE_W, src.w);
    if (typeof src.h === 'number' && src.h > 0) node.h = Math.min(SCENE_H, src.h);
    if (typeof src.icon === 'string' && src.icon) node.icon = src.icon;
    if (typeof src.label === 'string' && src.label) node.label = src.label;
    if (typeof src.sub === 'string' && src.sub) node.sub = src.sub;
    if (color) node.color = color;
    if (src.mono) node.mono = true;
    if (typeof src.size === 'number' && src.size > 0) node.size = Math.min(10, Math.max(2, src.size));
    if (typeof src.at === 'number') node.at = clamp01(src.at);

    let on = cleanOn(src.on);
    if (on) {
      // Validate semantic presence in say text
      if (normalizedSay) {
        const onNorm = (Array.isArray(on) ? on.join(' ') : on)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const existsInSay = normalizedSay.includes(onNorm);
        if (!existsInSay) {
          // Attempt to find closest word in sayText, or fallback to progressive timeline fraction
          const matchedWord = sayWords.find(
            (w) => onNorm.includes(w) || w.includes(onNorm)
          );
          if (matchedWord) {
            changes.push(
              `${prefix}: gatilho "on" do nó "${id}" ajustado de "${String(on)}" para "${matchedWord}" presente na fala.`
            );
            on = matchedWord;
          } else {
            // Assign progressive 'at' timing so node animates predictably without drop
            const defaultAt = Math.min(0.85, 0.1 + idx * 0.14);
            node.at = typeof node.at === 'number' ? node.at : defaultAt;
            changes.push(
              `${prefix}: termo "on" ("${String(on)}") do nó "${id}" não encontrado na narração; convertido em temporização (at: ${defaultAt.toFixed(2)}).`
            );
          }
        }
      }
      node.on = on;
    } else if (typeof node.at !== 'number') {
      node.at = Math.min(0.85, 0.1 + idx * 0.14);
    }

    nodes.push(node);
  });

  if (nodes.length === 0) {
    changes.push(`${prefix}: "scene" sem nós válidos e foi ignorada.`);
    return undefined;
  }

  const ids = new Set(nodes.map((n) => n.id));
  const arrows: SceneArrow[] = [];
  (Array.isArray(r.arrows) ? r.arrows : []).slice(0, 16).forEach((a, aIdx) => {
    if (!a || typeof a !== 'object') return;
    const src = a as Partial<SceneArrow>;
    if (typeof src.from !== 'string' || typeof src.to !== 'string') return;
    if (!ids.has(src.from) || !ids.has(src.to) || src.from === src.to) {
      changes.push(
        `${prefix}: seta "${String(src.from)}" → "${String(src.to)}" referencia um nó que não existe e foi removida.`
      );
      return;
    }
    const arrow: SceneArrow = { from: src.from, to: src.to };
    if (typeof src.label === 'string' && src.label) arrow.label = src.label;
    if (src.color && VALID_COLORS.includes(src.color)) arrow.color = src.color;
    if (src.dashed) arrow.dashed = true;
    if (typeof src.at === 'number') arrow.at = clamp01(src.at);

    let on = cleanOn(src.on);
    if (on) {
      if (normalizedSay) {
        const onNorm = (Array.isArray(on) ? on.join(' ') : on)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const existsInSay = normalizedSay.includes(onNorm);
        if (!existsInSay) {
          const matchedWord = sayWords.find(
            (w) => onNorm.includes(w) || w.includes(onNorm)
          );
          if (matchedWord) {
            on = matchedWord;
          } else {
            arrow.at = typeof arrow.at === 'number' ? arrow.at : Math.min(0.85, 0.25 + aIdx * 0.15);
          }
        }
      }
      arrow.on = on;
    } else if (typeof arrow.at !== 'number') {
      arrow.at = Math.min(0.85, 0.25 + aIdx * 0.15);
    }

    arrows.push(arrow);
  });

  const scene: Scene = { nodes };
  if (typeof r.title === 'string' && r.title) scene.title = r.title;
  if (arrows.length > 0) scene.arrows = arrows;
  if (r.caption === false) scene.caption = false;
  return scene;
}


/**
 * Trecho de instruções para a IA (Gemini ou qualquer outra) gerar cenas.
 * Sem crases, para poder ser embutido em template literals.
 */
export const SCENE_PROMPT_DOC = `
DIRETRIZES DE PROFUNDIDADE, DURAÇÃO MÍNIMA (1+ MINUTO) E PEDAGOGIA VISUAL:
- NÃO seja econômico nem superficial nas explicações! O vídeo final DEVE ter duração mínima de 1 minuto (60 a 90 segundos de narração).
- Para atingir pelo menos 1 minuto de vídeo, gere entre 8 e 12 segmentos ("segments").
- Em cada segmento, o campo "say" DEVE conter uma explicação detalhada, didática e aprofundada de 2 a 3 frases completas (entre 22 e 38 palavras por trecho, totalizando pelo menos 200 a 260 palavras somando todos os trechos). Explique o "porquê" por trás de cada conceito, como funciona nos bastidores, casos de uso reais e armadilhas comuns.
- NUNCA comece o vídeo apenas despejando código direto sem contextualizar! Intercale teoria visual e prática de código.

CENAS VISUAIS ANIMADAS ("scene"):
Sempre que um trecho explicar uma teoria, arquitetura, fluxo passo a passo ou comparação, adicione o campo "scene". Enquanto o trecho é narrado, o player renderiza automaticamente animações gráficas sincronizadas.

REGRA DE OURO DA SINCRONIA — cada elemento só pode aparecer QUANDO a palavra que o descreve é falada:
- Todo nó e toda seta DEVE ter o campo "on" com UMA palavra (ou frase curta de 2 palavras) copiada EXATAMENTE do "say" daquele trecho: o momento em que ela é dita faz o elemento surgir.
- Escolha palavras distintas e na ORDEM em que o "say" as menciona; o primeiro elemento deve nascer na primeira ideia da frase, nunca antes.
- NÃO use "at" numérico quando houver "on" (o "on" vence). Use "at" só se nenhuma palavra do "say" servir.
- Todo nó DEVE ter "label" (rótulo curto, até 14 caracteres por linha; use \\n para 2 linhas) e "color". Use "icon" (emoji) e "sub" (detalhe curto) nas caixas principais. Nunca entregue caixas vazias.
- Setas SEMPRE com "label" curto (verbo: "roda sobre", "isola", "migra") e "on" no verbo/palavra correspondente.

Exemplo (o "say" menciona hipervisor, hardware e sistemas hóspedes nessa ordem):
"scene": {
  "title": "título curto da cena",
  "nodes": [
    { "id": "hyp", "x": 80, "y": 40, "icon": "🧠", "label": "Hipervisor", "sub": "gerencia recursos", "color": "violet", "on": "hipervisor" },
    { "id": "hw", "x": 28, "y": 40, "icon": "🖥️", "label": "Hardware", "sub": "CPU, RAM, disco", "color": "slate", "on": "hardware" },
    { "id": "vm", "x": 132, "y": 40, "icon": "📦", "label": "VMs", "sub": "sistemas hóspedes", "color": "green", "on": "hóspedes" }
  ],
  "arrows": [
    { "from": "hw", "to": "hyp", "label": "fatiado por", "color": "slate", "on": "fatiar" },
    { "from": "hyp", "to": "vm", "label": "distribui", "color": "green", "on": "distribui" }
  ]
}

EXEMPLOS COMPARATIVOS VISUAIS (OBRIGATÓRIO incluir pelo menos 1 cena comparativa no estilo do exemplo de JWT):
- Em vez de apenas ditar regras ou escrever código direto, inclua pelo menos uma cena visual comparativa que contraste conceitos (ex: "O que é vs O que NÃO é", "Abordagem Incorreta vs Abordagem Correta", "Sem essa técnica vs Com essa técnica").
- Coloque os conceitos incorretos/diferentes à esquerda (ex: x: 40) com "color": "rose" e "sub": "não é isso" ou "vulnerável / lento", o conceito correto/ideal à direita (ex: x: 120) com "color": "green", e entre eles um nó "kind": "text" com "≠" ou "vs". Conecte com setas tracejadas ("dashed": true).

Regras técnicas da cena ("scene"):
- Espaço virtual: 160 (largura) por 90 (altura) unidades. x e y são o CENTRO do elemento.
- ZONAS VERTICAIS: y de 0 a 16 = "title"; y de 18 a 66 = nós e setas; y de 70 a 90 = RESERVADO ao texto cinético automático (nunca coloque nós aí).
- Margem mínima de 12 unidades nas bordas laterais. Use de 3 a 7 nós por cena, mantendo pelo menos 46 unidades entre centros de caixas vizinhas na horizontal (ex: x: 28, x: 80, x: 132) ou 4 colunas de ícones (kind "icon") em uma linha de baixo (y: 58).
- "kind": "box" (padrão, caixa com borda), "icon" (apenas emoji + rótulo) ou "text" (frase de destaque).
- "icon": um emoji expressivo (ex: 📄, 🔏, 🎫, 💻, 🖥️, ⏳, 🚫, 🔑, ⚡, 🛡️, 📦, 🔍).
- "color": accent, blue, green, amber, rose, violet, cyan ou slate (green para acerto/sucesso, amber para alerta/tempo, rose para erro/negação, blue/violet/cyan para etapas e sistemas, slate para infraestrutura neutra).
- Estrutura recomendada dos 8 a 12 trechos do roteiro:
  1. Trecho 1 (Cena Teórica Inicial): apresenta o problema real e o conceito com uma "scene" de fluxo/arquitetura antes de digitar o código pesado.
  2. Trechos Intermediários (Código + Cenas de Fluxo/Ciclo de Vida): digita o código em blocos didáticos ("type", "focus", "mark"), intercalando 1 ou 2 cenas visuais para explicar como os dados trafegam, expiram ou são processados.
  3. Penúltimo Trecho (Execução e Saída): demonstra o código em ação com o campo "output" preenchido.
  4. Último Trecho (Cena Comparativa Final — estilo JWT): consolida a teoria com uma "scene" comparativa, sem digitar novas linhas ("type" e "focus" podem ser omitidos em trechos puramente visuais).
`;
