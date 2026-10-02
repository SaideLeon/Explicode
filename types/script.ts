import type { Scene } from '@/lib/scene';

export interface ScriptSegment {
  say: string;
  type?: [number, number]; // 1-based start and end line to type
  focus?: [number, number]; // 1-based start and end line to highlight with spring bar
  mark?: string; // Exact substring to badge/pulse inside the focused lines
  output?: string; // Optional console/output badge to reveal
  scene?: Scene; // Optional visual scene (boxes, arrows, icons) shown instead of the code while this segment plays
}

export interface CodeScript {
  title: string;
  file: string;
  lang?: string;
  code: string[];
  segments: ScriptSegment[];
}

export type AspectRatioType = '16x9' | '9x16' | '1x1';

export type AudioVoiceMode = 'gemini-tts' | 'browser-tts';

export type FocusMode = 'auto' | 'manual';

export type GeminiMaleVoice = 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Aoede' | 'Kore';

export type NarrativePreset =
  | 'auditoria' // Auditoria de segurança / Code Review
  | 'tutorial' // Tutorial passo a passo
  | 'erro' // Erro comum / Bugfix
  | 'comparacao' // Comparação de abordagens / Tech vs Tech
  | 'curiosidade'; // Curiosidade / Como funciona por baixo dos panos

export type VideoDurationTarget = 30 | 60 | 90; // seconds

export type ScriptLanguage = 'pt-BR' | 'pt-PT';

export interface SyntaxColors {
  kw: string;
  str: string;
  num: string;
  cm: string;
  fn: string;
  id: string;
  type: string;
  p: string;
}

export interface SyntaxPaletteConfig {
  id: string;
  name: string;
  languageHint: string;
  syntax: SyntaxColors | null; // null = use the active theme's built-in syntax colors
}

export interface ThemeConfig {
  id: string;
  name: string;
  bgGradient: string;
  headerBorder: string;
  headerText: string;
  codeText: string;
  lineNumber: string;
  focusBg: string;
  focusBorder: string;
  markBg: string;
  markText: string;
  outputBg: string;
  outputLabel: string;
  outputValue: string;
  captionBg: string;
  captionText: string;
  accent: string;
  syntax: SyntaxColors;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSegmentIndex: number;
  segmentProgress: number[]; // 0 to 1 for each segment
  voiceEnabled: boolean;
  speechRate: number;
  speechPitch: number;
  voiceMode: AudioVoiceMode;
  geminiVoice: GeminiMaleVoice;
  selectedVoiceIndex: number;
}
