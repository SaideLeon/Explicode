'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BrainCircuit,
  Send,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Settings,
  Download,
  Code2,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  X,
  RefreshCw,
  User,
  FileCode2,
  Wrench,
  AlignLeft,
  Copy,
  Upload,
  Maximize2,
  Minimize2,
  Video,
  FileText,
  ChevronRight,
  SkipBack,
  SkipForward,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Trash2,
  ImagePlus,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  MessageSquarePlus,
  History,
  FolderCode,
  Target,
  MousePointerClick,
} from 'lucide-react';
import {
  CodeScript,
  AspectRatioType,
  ThemeConfig,
  SyntaxPaletteConfig,
  AudioVoiceMode,
  GeminiMaleVoice,
  FocusMode,
  NarrativePreset,
  VideoDurationTarget,
  ScriptLanguage,
} from '@/types/script';
import { ExplicodeLogo } from '@/components/ExplicodeLogo';
import { THEMES, SYNTAX_PALETTES } from '@/lib/themes';
import { PRESETS } from '@/lib/presets';
import { globalAudioCache } from '@/lib/audioCache';
import { normalizeAndRepairScript } from '@/lib/validation';
import { VideoStage } from '@/components/VideoStage';
import { ExportModal } from '@/components/ExportModal';
import { QuickJsonEditor } from '@/components/QuickJsonEditor';

interface AttachedImageItem {
  id: string;
  name: string;
  mimeType: string;
  dataBase64: string;
  previewUrl: string;
}

interface ChatVideoMessage {
  id: string;
  userPrompt: string;
  userCode?: string;
  userImages?: string[];
  timestamp: string;
  script: CodeScript;
  jsonText: string;
  isJsonVisible: boolean;
  isApproved: boolean;
  modelUsed?: string;
  jsonError?: string | null;
  statusNote?: string | null;
  isNative?: boolean;
}

const USER_SESSIONS_STORAGE_KEY = 'codigo_narrado_user_sessions_v1';

const INITIAL_NATIVE_SESSIONS: ChatVideoMessage[] = [
  {
    id: 'msg-initial-r01',
    userPrompt:
      'Auditoria de Segurança: Se o seu sistema salva senhas usando MD5, pare. Temos um problema. (MD5 vs Argon2id · Security Audit)',
    timestamp: '08:45',
    script: PRESETS[0].script,
    jsonText: JSON.stringify(PRESETS[0].script, null, 2),
    isJsonVisible: false,
    isApproved: true,
    modelUsed: 'Explicode · Preset Auditoria de Segurança',
    isNative: true,
  },
  {
    id: 'msg-initial-jwt',
    userPrompt:
      'Tutorial e Comparação: Explica de forma detalhada o que é Autenticação com JWT e como ele funciona na prática com exemplos visuais.',
    timestamp: '08:40',
    script: PRESETS[1].script,
    jsonText: JSON.stringify(PRESETS[1].script, null, 2),
    isJsonVisible: false,
    isApproved: true,
    modelUsed: 'Explicode · Preset Tutorial e Comparação',
    isNative: true,
  },
  {
    id: 'msg-initial-vm',
    userPrompt: 'Por Baixo dos Panos: Como funciona uma Máquina Virtual e a virtualização de hardware?',
    timestamp: '08:42',
    script: PRESETS[2].script,
    jsonText: JSON.stringify(PRESETS[2].script, null, 2),
    isJsonVisible: false,
    isApproved: true,
    modelUsed: 'Explicode · Modo Conceitual',
    isNative: true,
  },
];

function getCurrentTimeStr(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

/**
 * Extracts a structured, chat-style pedagogical article from a CodeScript
 * (matching the visual layout of title, intro, numbered "Como ele funciona?" steps,
 * and green checkmarked "Pontos principais").
 */
function buildStructuredExplanation(script: CodeScript) {
  const segs = script.segments || [];
  const intro =
    segs[0]?.say ||
    `Vamos explorar de forma simples e visual como funciona ${script.title} e como implementar cada etapa no código.`;

  // Pick up to 3 core "How it works" numbered steps from the segments
  const stepSegments =
    segs.length > 4
      ? segs.slice(1, 4)
      : segs.length > 1
      ? segs.slice(1)
      : segs.slice(0, 1);

  const steps = stepSegments.map((s) => s.say);

  // Build 4 concise checkmark highlights
  const sceneTitles = segs
    .filter((s) => s.scene?.title)
    .map((s) => s.scene!.title as string);

  const highlights: string[] = [];
  if (sceneTitles.length > 0) {
    highlights.push(`Animações visuais interativas: ${sceneTitles.join(' · ')}.`);
  } else {
    highlights.push(`Explicação passo a passo sincronizada com digitação em tempo real.`);
  }

  if (script.code.length > 0) {
    highlights.push(
      `Implementação prática no arquivo ${script.file} com ${script.code.length} linhas comentadas.`
    );
  } else {
    highlights.push(
      `Explicação 100% visual e conceitual estruturada em ${segs.length} cenas animadas.`
    );
  }

  const outputSeg = segs.find((s) => s.output !== undefined);
  if (outputSeg && outputSeg.output) {
    highlights.push(`Demonstração real de saída em execução: ${outputSeg.output}.`);
  } else {
    highlights.push(`Foco visual automático nos termos e funções mais importantes de cada linha.`);
  }

  const lastSeg = segs[segs.length - 1];
  if (lastSeg && segs.length > 2) {
    highlights.push(
      lastSeg.scene?.title
        ? `Comparação conceitual: ${lastSeg.scene.title}.`
        : `Boas práticas de segurança, legibilidade e arquitetura aplicadas.`
    );
  }

  const conclusion =
    segs.length > 3
      ? segs[segs.length - 1].say
      : `Em resumo, ${script.title} combina clareza conceitual com uma implementação direta e segura.`;

  return {
    heading: script.title.endsWith('?') ? script.title : `O que é ${script.title}?`,
    intro,
    steps,
    highlights,
    conclusion,
  };
}

export default function HomePage() {
  // Sessions state: holds user-generated sessions + the 2 native scripts (shown in the Sidebar, only rendered in main chat when clicked)
  const [messages, setMessages] = useState<ChatVideoMessage[]>(INITIAL_NATIVE_SESSIONS);

  // Open the revised R01 session immediately so the user can play/edit it, while keeping native & custom sessions isolated in the sidebar
  const [activeMessageId, setActiveMessageId] = useState<string | null>('msg-initial-r01');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [hasLoadedStoredSessions, setHasLoadedStoredSessions] = useState<boolean>(false);

  // Load persisted user-generated sessions from localStorage on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(USER_SESSIONS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validCustom = parsed.filter(
              (item): item is ChatVideoMessage =>
                item &&
                typeof item.id === 'string' &&
                item.script &&
                Array.isArray(item.script.segments)
            );
            if (validCustom.length > 0) {
              setMessages([...validCustom, ...INITIAL_NATIVE_SESSIONS]);
            }
          }
        }
      } catch {
        // ignore storage errors
      } finally {
        setHasLoadedStoredSessions(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Persist user-generated sessions whenever messages change
  useEffect(() => {
    if (!hasLoadedStoredSessions) return;
    try {
      const userSessions = messages.filter((m) => !m.isNative);
      window.localStorage.setItem(USER_SESSIONS_STORAGE_KEY, JSON.stringify(userSessions));
    } catch {
      // ignore quota errors
    }
  }, [messages, hasLoadedStoredSessions]);

  // Chat composer states
  const [promptInput, setPromptInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImageItem[]>([]);
  const [showComposerExtras, setShowComposerExtras] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [selectedPreset, setSelectedPreset] = useState<NarrativePreset>('tutorial');
  const [selectedDuration, setSelectedDuration] = useState<VideoDurationTarget>(60);
  const [selectedLanguage, setSelectedLanguage] = useState<ScriptLanguage>('pt-BR');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [chatError, setChatError] = useState<{
    prompt: string;
    code?: string;
    message: string;
    apiKeyMask?: string | null;
    apiKeyFirst4?: string | null;
    apiKeyLast5?: string | null;
    failedKeys?: {
      keyMask: string;
      prefix4: string;
      suffix5: string;
      status: 'active' | 'cooldown' | 'disabled';
      errorCode: number | null;
      retryAfterSeconds: number;
      message: string;
    }[];
  } | null>(null);

  // Studio visual & audio configuration
  const [theme, setTheme] = useState<ThemeConfig>(THEMES[0]);
  const [syntaxPalette, setSyntaxPalette] = useState<SyntaxPaletteConfig>(SYNTAX_PALETTES[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16x9');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Layout presentation modes & Fullscreen state
  const [layoutMode, setLayoutMode] = useState<'standard' | 'video-right' | 'script-right'>('standard');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Merge active background theme with chosen syntax highlighting palette
  const effectiveTheme = useMemo<ThemeConfig>(
    () => (syntaxPalette.syntax ? { ...theme, syntax: syntaxPalette.syntax } : theme),
    [theme, syntaxPalette]
  );

  // Real-time server key pool status (only masked 4 first + 5 last chars)
  const [keyPoolStatus, setKeyPoolStatus] = useState<
    {
      keyMask: string;
      prefix4: string;
      suffix5: string;
      status: 'active' | 'cooldown' | 'disabled';
      errorCode: number | null;
      retryAfterSeconds: number;
      cooldownTotalSeconds: number;
      lastError: string | null;
    }[]
  >([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  const fetchKeyPoolStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/keys', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.keys)) {
        setKeyPoolStatus(data.keys);
      }
    } catch {
      // ignore network error
    }
  }, []);

  const handleKeyPoolAction = useCallback(
    async (
      action: 'activate' | 'disable' | 'remove' | 'activate_all_cooldown',
      keyMask?: string
    ) => {
      setIsLoadingKeys(true);
      try {
        const res = await fetch('/api/keys', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, keyMask }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.keys)) {
            setKeyPoolStatus(data.keys);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingKeys(false);
      }
    },
    []
  );

  // Live 1s countdown & server sync while Settings modal is open
  useEffect(() => {
    if (!showSettingsModal) return;
    const initTimer = setTimeout(() => {
      void fetchKeyPoolStatus();
    }, 0);

    let tickCount = 0;
    const interval = setInterval(() => {
      tickCount += 1;
      let shouldRefetch = tickCount % 4 === 0;

      setKeyPoolStatus((prev) =>
        prev.map((k) => {
          if (k.status === 'cooldown' && k.retryAfterSeconds > 0) {
            const nextSec = k.retryAfterSeconds - 1;
            if (nextSec <= 0) {
              shouldRefetch = true;
              return {
                ...k,
                status: 'active',
                errorCode: null,
                retryAfterSeconds: 0,
                cooldownTotalSeconds: 0,
                lastError: null,
              };
            }
            return { ...k, retryAfterSeconds: nextSec };
          }
          return k;
        })
      );

      if (shouldRefetch) {
        void fetchKeyPoolStatus();
      }
    }, 1000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [showSettingsModal, fetchKeyPoolStatus]);

  // Active Script derived from activeMessageId (with fallback for ExportModal / stage reset)
  const activeMessage = useMemo(
    () => (activeMessageId ? messages.find((m) => m.id === activeMessageId) || null : null),
    [messages, activeMessageId]
  );
  const script = activeMessage?.script || PRESETS[0].script;

  // Only show the currently selected session in the main chat
  const displayedMessages = useMemo(
    () => (activeMessageId ? messages.filter((m) => m.id === activeMessageId) : []),
    [messages, activeMessageId]
  );
  const userGeneratedSessions = useMemo(
    () => messages.filter((m) => !m.isNative),
    [messages]
  );
  const nativeSessions = useMemo(
    () => messages.filter((m) => m.isNative),
    [messages]
  );

  // Playback states for the currently active video in the chat
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [segmentProgress, setSegmentProgress] = useState<number[]>(() =>
    new Array(PRESETS[0].script.segments.length).fill(0)
  );
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceMode, setVoiceMode] = useState<AudioVoiceMode>('gemini-tts');
  const [geminiVoice, setGeminiVoice] = useState<GeminiMaleVoice>('Puck');
  const [speechRate, setSpeechRate] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);

  // Gemini TTS status & preview states
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isGeminiSynthesizing, setIsGeminiSynthesizing] = useState(false);
  const [geminiNotice, setGeminiNotice] = useState<{
    type: 'permission_denied' | 'error' | 'success';
    title: string;
    message: string;
  } | null>(null);

  // Stage visual states for the active video
  const [lineVisibilities, setLineVisibilities] = useState<number[]>(() =>
    PRESETS[0].script.code.map((line) => line.length)
  );
  const [caretLine, setCaretLine] = useState<number>(-1);
  const [focusRange, setFocusRange] = useState<[number, number] | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>('auto');
  const [manualFocusRange, setManualFocusRange] = useState<[number, number] | null>(null);
  const [markInfo, setMarkInfo] = useState<{ lineIndex: number; range: [number, number] } | null>(
    null
  );
  const [outputValue, setOutputValue] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Refs for loop cancellation, audio element & scroll
  const runIdRef = useRef(0);
  const activeAnimationFrames = useRef<number[]>([]);
  const activeTimeouts = useRef<NodeJS.Timeout[]>([]);
  const keepAliveUtterances = useRef<SpeechSynthesisUtterance[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Focus mode line click & toggle handlers
  const handleLineClick = useCallback(
    (lineIndex: number, shiftKey: boolean) => {
      // Ativa o modo manual imediatamente ao clicar nas linhas do editor
      setFocusMode('manual');
      setManualFocusRange((prev) => {
        if (shiftKey && prev !== null) {
          const start = Math.min(prev[0], lineIndex);
          const end = Math.max(prev[1], lineIndex);
          return [start, end];
        }
        if (prev && prev[0] === lineIndex && prev[1] === lineIndex) {
          return null;
        }
        return [lineIndex, lineIndex];
      });
    },
    []
  );

  const handleToggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next: FocusMode = prev === 'auto' ? 'manual' : 'auto';
      if (next === 'auto') {
        const activeMsg = messages.find((m) => m.id === activeMessageId);
        if (activeMsg && activeMsg.script.segments[currentSegmentIndex]) {
          const seg = activeMsg.script.segments[currentSegmentIndex];
          const focus1Based = seg.focus || seg.type;
          setFocusRange(focus1Based ? [focus1Based[0] - 1, focus1Based[1] - 1] : null);
        }
      }
      return next;
    });
  }, [messages, activeMessageId, currentSegmentIndex]);

  const handleClearManualFocus = useCallback(() => {
    setManualFocusRange(null);
  }, []);

  // Reset stage visuals for a target script
  const resetStageVisuals = useCallback(
    (targetScript: CodeScript = script) => {
      setLineVisibilities(new Array(targetScript.code.length).fill(0));
      setCaretLine(-1);
      setFocusRange(null);
      if (focusMode === 'auto') {
        setManualFocusRange(null);
      }
      setMarkInfo(null);
      setOutputValue(null);
      setCaptionText('');
      setSegmentProgress(new Array(targetScript.segments.length).fill(0));
    },
    [script, focusMode]
  );

  // Load browser voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    const updateVoices = () => {
      const voices = synth.getVoices();
      setAvailableVoices(voices);

      const ptCandidates = voices
        .map((v, originalIndex) => {
          const lang = v.lang.toLowerCase();
          const name = v.name.toLowerCase();
          let score = 0;
          if (lang.startsWith('pt-br')) score += 50;
          else if (lang.startsWith('pt')) score += 30;

          if (score > 0) {
            if (name.includes('google')) score += 40;
            if (name.includes('natural') || name.includes('neural')) score += 35;
            if (name.includes('daniel') || name.includes('maria') || name.includes('luciana'))
              score += 30;
            if (name.includes('premium') || name.includes('enhanced')) score += 20;
          }
          return { originalIndex, score };
        })
        .filter((v) => v.score > 0)
        .sort((a, b) => b.score - a.score);

      if (ptCandidates.length > 0) {
        setSelectedVoiceIndex(ptCandidates[0].originalIndex);
      }
    };

    updateVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices;
    }
  }, []);

  // Clear all running timers / speech / audio
  const stopAll = useCallback(() => {
    runIdRef.current += 1;
    activeAnimationFrames.current.forEach((id) => cancelAnimationFrame(id));
    activeAnimationFrames.current = [];
    activeTimeouts.current.forEach((t) => clearTimeout(t));
    activeTimeouts.current = [];

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    keepAliveUtterances.current = [];

    setIsPlaying(false);
    setIsPaused(false);
    setCaretLine(-1);
  }, []);

  // Sleep utility respecting runId
  const sleep = useCallback((ms: number, runId: number) => {
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        resolve(runId === runIdRef.current);
      }, ms);
      activeTimeouts.current.push(timer);
    });
  }, []);

  // Estimate speech duration based on word count
  const estimateSpeechDuration = useCallback(
    (text: string) => {
      const words = text.trim().split(/\s+/).length;
      return Math.max(1.8, (words / 2.6 + 0.5) / speechRate);
    },
    [speechRate]
  );

  // Compute total estimated duration and elapsed duration for a script
  const getScriptTiming = useCallback(
    (targetScript: CodeScript, segIdx: number, segProg: number) => {
      const durations = targetScript.segments.map((s) => estimateSpeechDuration(s.say));
      const total = durations.reduce((acc, d) => acc + d, 0);
      let elapsed = 0;
      for (let i = 0; i < segIdx && i < durations.length; i++) {
        elapsed += durations[i];
      }
      if (durations[segIdx]) {
        elapsed += durations[segIdx] * Math.max(0, Math.min(1, segProg));
      }
      return { elapsed, total };
    },
    [estimateSpeechDuration]
  );

  // Background pre-fetch for Gemini TTS audio
  const prefetchGeminiAudio = useCallback(
    async (text: string, voice: GeminiMaleVoice, language = 'pt-BR') => {
      if (!text || typeof window === 'undefined') return;
      const key = `${voice}::${language}::${text.trim()}`;
      if (globalAudioCache.has(key)) return;

      try {
        const res = await fetch('/api/synthesize-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim(), voiceName: voice, language }),
        });
        const rawText = await res.text();
        let data: { success?: boolean; audioUrl?: string } | null = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          // Ignore non-JSON
        }
        if (data && data.success && typeof data.audioUrl === 'string') {
          globalAudioCache.set(key, data.audioUrl);
        }
      } catch {
        // Ignore prefetch errors
      }
    },
    []
  );

  // Test Gemini voice
  const handleTestGeminiVoice = useCallback(async () => {
    if (isTestingVoice) return;
    setIsTestingVoice(true);
    setGeminiNotice(null);

    try {
      const testPhrase =
        selectedLanguage === 'pt-PT'
          ? `Olá! Esta é a síntese de voz do Explicode com o perfil ${geminiVoice}.`
          : `Olá! Esta é a narração por inteligência artificial do Explicode usando a voz ${geminiVoice}.`;
      const key = `${geminiVoice}::${selectedLanguage}::${testPhrase}`;
      let audioUrl = globalAudioCache.get(key);

      if (!audioUrl) {
        const res = await fetch('/api/synthesize-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: testPhrase,
            voiceName: geminiVoice,
            language: selectedLanguage,
          }),
        });
        const data = await res.json().catch(() => null);

        if (data?.success && typeof data.audioUrl === 'string') {
          audioUrl = globalAudioCache.set(key, data.audioUrl);
        } else {
          setGeminiNotice({
            type: 'error',
            title: 'Aviso no Teste de Voz',
            message:
              data?.error ||
              'Não foi possível sintetizar com Gemini TTS agora. A voz natural do navegador será usada automaticamente como fallback.',
          });
          return;
        }
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        await audio.play();
        setGeminiNotice({
          type: 'success',
          title: `Voz Gemini (${geminiVoice}) Ativa!`,
          message: 'Áudio sintetizado e reproduzido com sucesso.',
        });
        setTimeout(() => setGeminiNotice((prev) => (prev?.type === 'success' ? null : prev)), 5000);
      }
    } catch {
      setGeminiNotice({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível testar o endpoint de voz no momento.',
      });
    } finally {
      setIsTestingVoice(false);
    }
  }, [isTestingVoice, geminiVoice, selectedLanguage]);

  // Browser SpeechSynthesis fallback
  const speakNarrationWithBrowser = useCallback(
    (
      text: string,
      estimatedDuration: number,
      runId: number,
      lang = 'pt-BR'
    ): Promise<{ duration: number }> => {
      return new Promise<{ duration: number }>((resolve) => {
        if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
          setTimeout(() => resolve({ duration: estimatedDuration }), estimatedDuration * 1000);
          return;
        }

        const synth = window.speechSynthesis;
        try {
          if (synth.paused) synth.resume();
          synth.cancel();
          if (synth.paused) synth.resume();
        } catch {
          // ignore
        }

        const humanizedText = text
          .replace(/=>/g, 'retorna')
          .replace(/===/g, 'é igual a')
          .replace(/!==/g, 'é diferente de')
          .replace(/&&/g, 'e')
          .replace(/\|\|/g, 'ou')
          .replace(/console\.log/g, 'console log')
          .replace(/(\w+)\.length/g, 'tamanho de $1')
          .replace(/(\w+)\.push/g, '$1 ponto push')
          .replace(/;\s*$/g, '.')
          .trim();

        const utterance = new SpeechSynthesisUtterance(humanizedText);
        utterance.lang = lang;
        utterance.rate = Math.max(0.8, Math.min(1.2, speechRate * 0.96));
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (selectedVoiceIndex >= 0 && selectedVoiceIndex < availableVoices.length) {
          utterance.voice = availableVoices[selectedVoiceIndex];
        } else if (availableVoices.length > 0) {
          const pt = availableVoices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('pt-br') || v.lang.toLowerCase().startsWith('pt')
          );
          if (pt) utterance.voice = pt;
        }

        let isFinished = false;
        const complete = () => {
          if (!isFinished) {
            isFinished = true;
            resolve({ duration: estimatedDuration });
          }
        };

        utterance.onend = complete;
        utterance.onerror = complete;

        const heartbeatInterval = setInterval(() => {
          if (isFinished || runId !== runIdRef.current) {
            clearInterval(heartbeatInterval);
            return;
          }
          if (synth.paused) synth.resume();
        }, 2500);

        const guardTimer = setTimeout(() => {
          clearInterval(heartbeatInterval);
          complete();
        }, (estimatedDuration * 2.2 + 2) * 1000);
        activeTimeouts.current.push(guardTimer);

        keepAliveUtterances.current.push(utterance);
        if (keepAliveUtterances.current.length > 5) {
          keepAliveUtterances.current.shift();
        }

        try {
          synth.speak(utterance);
          if (synth.paused) synth.resume();
        } catch {
          complete();
        }
      });
    },
    [voiceEnabled, speechRate, selectedVoiceIndex, availableVoices]
  );

  // Unified speech narration
  const speakNarration = useCallback(
    (
      text: string,
      estimatedDuration: number,
      runId: number,
      lang = 'pt-BR'
    ): Promise<{ duration: number }> => {
      return new Promise<{ duration: number }>(async (resolve) => {
        if (!voiceEnabled || typeof window === 'undefined') {
          setTimeout(() => resolve({ duration: estimatedDuration }), estimatedDuration * 1000);
          return;
        }

        if (voiceMode === 'gemini-tts') {
          setIsGeminiSynthesizing(true);
          try {
            const effectiveLang = lang || selectedLanguage || 'pt-BR';
            const key = `${geminiVoice}::${effectiveLang}::${text.trim()}`;
            let audioUrl = globalAudioCache.get(key);

            if (!audioUrl) {
              const res = await fetch('/api/synthesize-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: text.trim(),
                  voiceName: geminiVoice,
                  language: effectiveLang,
                }),
              });
              const data = await res.json().catch(() => null);

              if (data?.success && typeof data.audioUrl === 'string') {
                audioUrl = globalAudioCache.set(key, data.audioUrl);
              }
            }

            setIsGeminiSynthesizing(false);
            if (runId !== runIdRef.current) return;

            if (audioUrl) {
              const audio = new Audio(audioUrl);
              currentAudioRef.current = audio;
              audio.playbackRate = speechRate;

              let isDone = false;
              const finish = () => {
                if (!isDone) {
                  isDone = true;
                  currentAudioRef.current = null;
                  const realDur =
                    audio.duration && !isNaN(audio.duration) && audio.duration > 0
                      ? audio.duration / speechRate
                      : estimatedDuration;
                  resolve({ duration: realDur });
                }
              };

              audio.onended = finish;
              audio.onerror = () => {
                speakNarrationWithBrowser(text, estimatedDuration, runId, lang).then(resolve);
              };

              try {
                await audio.play();
                return;
              } catch {
                speakNarrationWithBrowser(text, estimatedDuration, runId, lang).then(resolve);
                return;
              }
            }
          } catch {
            setIsGeminiSynthesizing(false);
          }

          speakNarrationWithBrowser(text, estimatedDuration, runId, lang).then(resolve);
          return;
        }

        speakNarrationWithBrowser(text, estimatedDuration, runId, lang).then(resolve);
      });
    },
    [voiceEnabled, voiceMode, geminiVoice, speechRate, speakNarrationWithBrowser, selectedLanguage]
  );

  // Typing animation for lines of a specific script
  const typeLinesRange = useCallback(
    (
      targetScript: CodeScript,
      startLine: number,
      endLine: number,
      durationSeconds: number,
      runId: number
    ) => {
      return new Promise<void>((resolve) => {
        const lineIndices: number[] = [];
        const lineLengths: number[] = [];
        const offsets: number[] = [];
        let totalChars = 0;

        for (let i = startLine; i <= endLine; i++) {
          lineIndices.push(i);
          const len = targetScript.code[i]?.length || 0;
          lineLengths.push(len);
          offsets.push(totalChars);
          totalChars += len + 2;
        }

        const startTime = performance.now();
        const durationMs = durationSeconds * 1000;

        const tick = (now: number) => {
          if (runId !== runIdRef.current) return;

          const progress = Math.min(1, (now - startTime) / durationMs);
          const currentCharPos = progress * totalChars;

          let activeCaret = -1;
          setLineVisibilities((prev) => {
            const next = [...prev];
            lineIndices.forEach((lineIdx, k) => {
              const lineStart = offsets[k];
              const lineLen = lineLengths[k];
              const charsToShow = Math.max(
                0,
                Math.min(lineLen, Math.floor(currentCharPos - lineStart))
              );
              next[lineIdx] = charsToShow;

              if (currentCharPos >= lineStart && currentCharPos <= lineStart + lineLen + 2) {
                activeCaret = lineIdx;
              }
            });
            return next;
          });

          setCaretLine(activeCaret);

          if (progress < 1) {
            const frameId = requestAnimationFrame(tick);
            activeAnimationFrames.current.push(frameId);
          } else {
            setLineVisibilities((prev) => {
              const next = [...prev];
              lineIndices.forEach((lineIdx) => {
                next[lineIdx] = targetScript.code[lineIdx]?.length || 0;
              });
              return next;
            });
            setCaretLine(-1);
            resolve();
          }
        };

        const firstFrame = requestAnimationFrame(tick);
        activeAnimationFrames.current.push(firstFrame);
      });
    },
    []
  );

  // Instant fast-forward for a segment
  const applyInstantSegment = useCallback((targetScript: CodeScript, index: number) => {
    const seg = targetScript.segments[index];
    if (!seg) return;

    if (seg.type) {
      const [start, end] = seg.type;
      setLineVisibilities((prev) => {
        const next = [...prev];
        for (let l = start - 1; l <= end - 1; l++) {
          if (next[l] !== undefined && targetScript.code[l] !== undefined) {
            next[l] = targetScript.code[l].length;
          }
        }
        return next;
      });
    }

    if (seg.output !== undefined) {
      setOutputValue(String(seg.output));
    }
  }, []);

  // Play a single segment of a given script, locking visual progress to the real audio clock
  const playSegment = useCallback(
    async (targetScript: CodeScript, segIndex: number, runId: number) => {
      const seg = targetScript.segments[segIndex];
      if (!seg || runId !== runIdRef.current) return;

      setCurrentSegmentIndex(segIndex);
      setCaptionText(seg.say);
      setMarkInfo(null);
      setSegmentProgress((prev) => {
        const next = [...prev];
        next[segIndex] = 0;
        return next;
      });

      // Prefetch upcoming segments so transitions are instantaneous
      if (voiceMode === 'gemini-tts') {
        if (targetScript.segments[segIndex + 1]) {
          prefetchGeminiAudio(targetScript.segments[segIndex + 1].say, geminiVoice);
        }
        if (targetScript.segments[segIndex + 2]) {
          prefetchGeminiAudio(targetScript.segments[segIndex + 2].say, geminiVoice);
        }
      }

      const estimatedDur = estimateSpeechDuration(seg.say);

      const focusRange1Based = seg.focus || seg.type;
      if (focusRange1Based) {
        setFocusRange([focusRange1Based[0] - 1, focusRange1Based[1] - 1]);
      } else {
        setFocusRange(null);
      }

      // If using Gemini TTS, ensure current segment's audio is synthesized BEFORE starting the visual clock
      // so word-level scene animations (`on`) never advance while waiting for the network
      if (voiceEnabled && voiceMode === 'gemini-tts' && typeof window !== 'undefined') {
        const key = `${geminiVoice}::${seg.say.trim()}`;
        if (!globalAudioCache.has(key)) {
          setIsGeminiSynthesizing(true);
          await prefetchGeminiAudio(seg.say, geminiVoice);
          setIsGeminiSynthesizing(false);
          if (runId !== runIdRef.current) return;
        }
      }

      const narrationPromise = speakNarration(
        seg.say,
        estimatedDur,
        runId,
        targetScript.lang || 'pt-BR'
      );

      const progressStartTime = performance.now();
      const progressDurationMs = estimatedDur * 1000;

      const progressTick = (now: number) => {
        if (runId !== runIdRef.current) return;
        const activeAudio = currentAudioRef.current;
        let p: number;
        if (
          activeAudio &&
          !activeAudio.paused &&
          Number.isFinite(activeAudio.duration) &&
          activeAudio.duration > 0
        ) {
          p = Math.min(1, activeAudio.currentTime / activeAudio.duration);
        } else {
          p = Math.min(1, (now - progressStartTime) / progressDurationMs);
        }

        setSegmentProgress((prev) => {
          const next = [...prev];
          next[segIndex] = p;
          return next;
        });
        if (p < 1) {
          const frameId = requestAnimationFrame(progressTick);
          activeAnimationFrames.current.push(frameId);
        }
      };
      requestAnimationFrame(progressTick);

      if (seg.type) {
        const typingDuration = Math.min(4.5, Math.max(0.6, estimatedDur * 0.65));
        await typeLinesRange(
          targetScript,
          seg.type[0] - 1,
          seg.type[1] - 1,
          typingDuration,
          runId
        );
      } else {
        await sleep(250, runId);
      }

      if (runId !== runIdRef.current) return;

      if (seg.mark && focusRange1Based) {
        const [startL, endL] = focusRange1Based;
        for (let l = startL - 1; l <= endL - 1; l++) {
          const text = targetScript.code[l] || '';
          const charIndex = text.indexOf(seg.mark);
          if (charIndex >= 0) {
            setMarkInfo({
              lineIndex: l,
              range: [charIndex, charIndex + seg.mark.length],
            });
            break;
          }
        }
      }

      if (seg.output !== undefined) {
        setOutputValue(String(seg.output));
      }

      await narrationPromise;

      if (runId !== runIdRef.current) return;

      setSegmentProgress((prev) => {
        const next = [...prev];
        next[segIndex] = 1;
        return next;
      });
    },
    [
      voiceEnabled,
      voiceMode,
      geminiVoice,
      prefetchGeminiAudio,
      estimateSpeechDuration,
      speakNarration,
      typeLinesRange,
      sleep,
    ]
  );

  // Play full sequence for a target message & script
  const playFromForMessage = useCallback(
    async (msg: ChatVideoMessage, fromIndex = 0) => {
      stopAll();
      const targetScript = msg.script;
      setActiveMessageId(msg.id);

      const currentRun = runIdRef.current;
      setIsPlaying(true);
      setIsPaused(false);

      if (voiceMode === 'gemini-tts' && targetScript.segments[fromIndex]) {
        prefetchGeminiAudio(targetScript.segments[fromIndex].say, geminiVoice);
      }

      if (fromIndex === 0) {
        resetStageVisuals(targetScript);
      } else {
        setLineVisibilities(new Array(targetScript.code.length).fill(0));
        setOutputValue(null);
        for (let i = 0; i < fromIndex; i++) {
          applyInstantSegment(targetScript, i);
        }
        const prog = new Array(targetScript.segments.length).fill(0);
        for (let i = 0; i < fromIndex; i++) prog[i] = 1;
        setSegmentProgress(prog);
      }

      await sleep(150, currentRun);

      for (let k = fromIndex; k < targetScript.segments.length; k++) {
        if (currentRun !== runIdRef.current) return;
        await playSegment(targetScript, k, currentRun);
        if (currentRun !== runIdRef.current) return;
        await sleep(250 / speechRate, currentRun);
      }

      if (currentRun === runIdRef.current) {
        setIsPlaying(false);
        setIsPaused(false);
        setFocusRange(null);
        setMarkInfo(null);
        setCaretLine(-1);
      }
    },
    [
      stopAll,
      voiceMode,
      geminiVoice,
      prefetchGeminiAudio,
      resetStageVisuals,
      applyInstantSegment,
      sleep,
      playSegment,
      speechRate,
    ]
  );

  // Toggle play/pause on a specific message in the chat
  const handleTogglePlayForMessage = useCallback(
    (msg: ChatVideoMessage) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        } catch {
          // ignore
        }
      }

      if (activeMessageId === msg.id && isPlaying) {
        stopAll();
      } else {
        const startIdx =
          activeMessageId === msg.id && currentSegmentIndex < msg.script.segments.length - 1
            ? currentSegmentIndex
            : 0;
        playFromForMessage(msg, startIdx);
      }
    },
    [activeMessageId, isPlaying, stopAll, currentSegmentIndex, playFromForMessage]
  );

  // Toggle JSON visibility for a message
  const handleToggleJsonVisibility = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isJsonVisible: !m.isJsonVisible } : m))
    );
  }, []);

  // Update JSON draft text inside a message
  const handleChangeMessageJson = useCallback((msgId: string, newText: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, jsonText: newText, jsonError: null, statusNote: null } : m
      )
    );
  }, []);

  // Live synchronize both JSON text and parsed script from Quick Edit mode
  const handleQuickSyncMessageScript = useCallback(
    (msgId: string, newJsonText: string, repairedScript: CodeScript, summaryNote?: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                script: repairedScript,
                jsonText: newJsonText,
                jsonError: null,
                statusNote: summaryNote || 'JSON sincronizado automaticamente.',
              }
            : m
        )
      );
      if (activeMessageId === msgId && !isPlaying) {
        setLineVisibilities(repairedScript.code.map((line) => line.length));
        setSegmentProgress(new Array(repairedScript.segments.length).fill(0));
      }
    },
    [activeMessageId, isPlaying]
  );

  // Approve JSON script & activate video player for a message
  const handleApproveMessageScript = useCallback(
    (msgId: string, autoPlay = false) => {
      const targetMsg = messages.find((m) => m.id === msgId);
      if (!targetMsg) return;

      try {
        const parsed = JSON.parse(targetMsg.jsonText);
        const validation = normalizeAndRepairScript(parsed);
        if (!validation.valid || !validation.repairedScript) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, jsonError: validation.error || 'Estrutura JSON inválida.' }
                : m
            )
          );
          return;
        }

        const cleanScript = validation.repairedScript;
        const formattedJson = JSON.stringify(cleanScript, null, 2);

        const updatedMsg: ChatVideoMessage = {
          ...targetMsg,
          script: cleanScript,
          jsonText: formattedJson,
          isApproved: true,
          isJsonVisible: false, // Automatically collapse JSON on approval so video shines cleanly
          jsonError: null,
          statusNote:
            validation.changes && validation.changes.length > 0
              ? `Roteiro aprovado com ${validation.changes.length} ajuste(s) automático(s)!`
              : 'Roteiro aprovado! O vídeo está pronto abaixo.',
        };

        setMessages((prev) => prev.map((m) => (m.id === msgId ? updatedMsg : m)));
        stopAll();
        setActiveMessageId(msgId);
        resetStageVisuals(cleanScript);
        setCurrentSegmentIndex(0);

        if (voiceMode === 'gemini-tts' && cleanScript.segments[0]) {
          prefetchGeminiAudio(cleanScript.segments[0].say, geminiVoice);
        }

        if (autoPlay) {
          setTimeout(() => {
            playFromForMessage(updatedMsg, 0);
          }, 120);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Sintaxe JSON inválida';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, jsonError: `Erro no JSON: ${errMsg}` } : m
          )
        );
      }
    },
    [messages, stopAll, resetStageVisuals, voiceMode, geminiVoice, prefetchGeminiAudio, playFromForMessage]
  );

  // Auto-repair JSON inside a message
  const handleAutoRepairMessageJson = useCallback(
    (msgId: string) => {
      const targetMsg = messages.find((m) => m.id === msgId);
      if (!targetMsg) return;

      try {
        const parsed = JSON.parse(targetMsg.jsonText);
        const validation = normalizeAndRepairScript(parsed);
        if (!validation.valid || !validation.repairedScript) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, jsonError: validation.error || 'Estrutura JSON inválida.' }
                : m
            )
          );
          return;
        }

        const cleanScript = validation.repairedScript;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  script: cleanScript,
                  jsonText: JSON.stringify(cleanScript, null, 2),
                  jsonError: null,
                  statusNote:
                    validation.changes && validation.changes.length > 0
                      ? `Sincronizado automaticamente (${validation.changes.length} ajustes feitos).`
                      : 'O JSON já está 100% sincronizado.',
                }
              : m
          )
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'JSON inválido';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, jsonError: `Não foi possível corrigir: ${errMsg}` } : m
          )
        );
      }
    },
    [messages]
  );

  // Process & compress uploaded/pasted image files so multiple images send fast
  const processImageFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const readAndResize = (file: File): Promise<AttachedImageItem | null> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (!rawDataUrl) {
            resolve(null);
            return;
          }
          const img = new window.Image();
          img.onload = () => {
            const maxDim = 1024;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              const scale = Math.min(maxDim / width, maxDim / height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#0b101e';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              const outMime = 'image/jpeg';
              const compressedUrl = canvas.toDataURL(outMime, 0.78);
              const base64 = compressedUrl.replace(/^data:[^;]+;base64,/, '');
              resolve({
                id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: file.name || 'imagem.jpg',
                mimeType: outMime,
                dataBase64: base64,
                previewUrl: compressedUrl,
              });
              return;
            }
            const base64 = rawDataUrl.replace(/^data:[^;]+;base64,/, '');
            resolve({
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: file.name || 'imagem.png',
              mimeType: file.type || 'image/png',
              dataBase64: base64,
              previewUrl: rawDataUrl,
            });
          };
          img.onerror = () => resolve(null);
          img.src = rawDataUrl;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });

    const loaded = await Promise.all(files.map(readAndResize));
    const valid = loaded.filter((item): item is AttachedImageItem => item !== null);
    if (valid.length > 0) {
      setAttachedImages((prev) => [...prev, ...valid].slice(0, 8));
    }
  }, []);

  const handleSelectImageFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void processImageFiles(e.target.files);
      }
      e.target.value = '';
    },
    [processImageFiles]
  );

  const handlePasteImages = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const f = items[i].getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        void processImageFiles(files);
      }
    },
    [processImageFiles]
  );

  const handleRemoveAttachedImage = useCallback((id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  // Send a new chat prompt to generate a new script & video in the chat feed
  const handleSendChatPrompt = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isGenerating) return;

      const cleanTopic = promptInput.trim();
      const cleanCode = codeInput.trim();
      const currentImages = [...attachedImages];

      if (!cleanTopic && !cleanCode && currentImages.length === 0) return;

      const displayPrompt =
        cleanTopic ||
        (currentImages.length > 0
          ? currentImages.length === 1
            ? 'Analise e explique o conteúdo ou código presente nesta imagem.'
            : `Analise e explique o conteúdo ou código presente nestas ${currentImages.length} imagens.`
          : 'Explique detalhadamente este código linha por linha com cenas visuais.');

      stopAll();
      setActiveMessageId(null);
      setIsGenerating(true);
      setChatError(null);
      setPendingPrompt(displayPrompt);
      setPendingImages(currentImages.map((img) => img.previewUrl));
      setPromptInput('');
      setCodeInput('');
      setAttachedImages([]);
      setShowComposerExtras(false);

      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 80);

      try {
        const res = await fetch('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: cleanTopic,
            code: cleanCode,
            images: currentImages.map((img) => ({
              mimeType: img.mimeType,
              data: img.dataBase64,
              name: img.name,
            })),
            model: selectedModel,
            narrativePreset: selectedPreset,
            targetDuration: selectedDuration,
            language: selectedLanguage,
          }),
        });

        const rawText = await res.text();

        let data: {
          success?: boolean;
          script?: CodeScript;
          modelUsed?: string;
          error?: string;
          message?: string;
          apiKeyMask?: string | null;
          apiKeyFirst4?: string | null;
          apiKeyLast5?: string | null;
          failedKeys?: {
            keyMask: string;
            prefix4: string;
            suffix5: string;
            status: 'active' | 'cooldown' | 'disabled';
            errorCode: number | null;
            retryAfterSeconds: number;
            message: string;
          }[];
        } | null = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          console.warn('[Chat] Resposta não-JSON recebida do proxy:', rawText.slice(0, 120));
        }

        if (res.ok && data?.success && data?.script) {
          const generatedScript: CodeScript = data.script;
          const newMsgId = `msg-${Date.now()}`;
          const newMsg: ChatVideoMessage = {
            id: newMsgId,
            userPrompt: displayPrompt,
            userCode: cleanCode || undefined,
            userImages:
              currentImages.length > 0 ? currentImages.map((img) => img.previewUrl) : undefined,
            timestamp: getCurrentTimeStr(),
            script: generatedScript,
            jsonText: JSON.stringify(generatedScript, null, 2),
            isJsonVisible: false,
            isApproved: false,
            modelUsed: data.modelUsed || selectedModel,
            isNative: false,
          };

          setMessages((prev) => [newMsg, ...prev]);
          setActiveMessageId(newMsgId);
          resetStageVisuals(generatedScript);
          setCurrentSegmentIndex(0);

          if (voiceMode === 'gemini-tts' && generatedScript.segments[0]) {
            prefetchGeminiAudio(generatedScript.segments[0].say, geminiVoice);
          }
        } else {
          const errText =
            data?.message || data?.error || 'Falha ao gerar com a IA. Tente novamente.';
          console.warn('[Chat] Aviso retornado por /api/generate-script:', errText);
          setChatError({
            prompt: displayPrompt,
            code: cleanCode || undefined,
            message: errText,
            apiKeyMask: data?.apiKeyMask || null,
            apiKeyFirst4: data?.apiKeyFirst4 || null,
            apiKeyLast5: data?.apiKeyLast5 || null,
            failedKeys: data?.failedKeys || [],
          });
          setPromptInput(cleanTopic);
          if (cleanCode) setCodeInput(cleanCode);
          if (currentImages.length > 0) setAttachedImages(currentImages);
        }
      } catch (err) {
        console.warn('[Chat] Falha de rede ao chamar /api/generate-script:', err);
        setChatError({
          prompt: displayPrompt,
          code: cleanCode || undefined,
          message: 'Falha de comunicação ao gerar com a IA. Tente novamente.',
        });
        setPromptInput(cleanTopic);
        if (cleanCode) setCodeInput(cleanCode);
        if (currentImages.length > 0) setAttachedImages(currentImages);
      } finally {
        setIsGenerating(false);
        setPendingPrompt(null);
        setPendingImages([]);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 120);
      }
    },
    [
      isGenerating,
      promptInput,
      codeInput,
      attachedImages,
      stopAll,
      selectedModel,
      resetStageVisuals,
      voiceMode,
      geminiVoice,
      prefetchGeminiAudio,
      selectedDuration,
      selectedLanguage,
      selectedPreset,
    ]
  );

  // Select a session from the sidebar to display in the main chat
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      const target = messages.find((m) => m.id === sessionId);
      if (!target) return;
      stopAll();
      setChatError(null);
      setActiveMessageId(target.id);
      setLineVisibilities(target.script.code.map((line) => line.length));
      setSegmentProgress(new Array(target.script.segments.length).fill(0));
      setCurrentSegmentIndex(0);
      setCaretLine(-1);
      setFocusRange(null);
      setMarkInfo(null);
      setOutputValue(null);
      setCaptionText(target.script.segments[0]?.say || '');

      if (voiceMode === 'gemini-tts' && target.script.segments[0]) {
        prefetchGeminiAudio(target.script.segments[0].say, geminiVoice);
      }
    },
    [messages, stopAll, voiceMode, geminiVoice, prefetchGeminiAudio]
  );

  // Start a clean new chat session (clears main chat view without deleting sidebar history)
  const handleStartNewSession = useCallback(() => {
    stopAll();
    setChatError(null);
    setActiveMessageId(null);
    setShowComposerExtras(false);
  }, [stopAll]);

  // Delete a session from the sidebar
  const handleDeleteSession = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (activeMessageId === sessionId) {
        stopAll();
        setActiveMessageId(null);
      }
      setMessages((prev) => prev.filter((m) => m.id !== sessionId));
    },
    [activeMessageId, stopAll]
  );

  // Load a preset into the chat stream as its own session (or activate existing native session)
  const handleSelectPresetIntoChat = useCallback(
    (presetId: string) => {
      const found = PRESETS.find((p) => p.id === presetId);
      if (!found) return;

      // Check if one of the native sessions already corresponds to this preset
      const existingNative = messages.find(
        (m) => m.isNative && m.script.title === found.script.title
      );
      if (existingNative) {
        handleSelectSession(existingNative.id);
        setShowComposerExtras(false);
        return;
      }

      stopAll();
      const newMsgId = `msg-preset-${Date.now()}`;
      const newMsg: ChatVideoMessage = {
        id: newMsgId,
        userPrompt: `Explica de forma simples e visual: ${found.name}`,
        timestamp: getCurrentTimeStr(),
        script: found.script,
        jsonText: JSON.stringify(found.script, null, 2),
        isJsonVisible: false,
        isApproved: true,
        modelUsed: 'Exemplo Oficial',
        isNative: false,
      };

      setMessages((prev) => [newMsg, ...prev]);
      setActiveMessageId(newMsgId);
      resetStageVisuals(found.script);
      setCurrentSegmentIndex(0);
      setShowComposerExtras(false);

      if (voiceMode === 'gemini-tts' && found.script.segments[0]) {
        prefetchGeminiAudio(found.script.segments[0].say, geminiVoice);
      }
    },
    [messages, handleSelectSession, stopAll, resetStageVisuals, voiceMode, geminiVoice, prefetchGeminiAudio]
  );

  // Upload JSON file directly into the chat
  const handleUploadJsonFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) return;
        try {
          const parsed = JSON.parse(content);
          const result = normalizeAndRepairScript(parsed);
          if (result.valid && result.repairedScript) {
            stopAll();
            const s = result.repairedScript;
            const newMsgId = `msg-upload-${Date.now()}`;
            const newMsg: ChatVideoMessage = {
              id: newMsgId,
              userPrompt: `Importei o roteiro JSON: ${s.title}`,
              timestamp: getCurrentTimeStr(),
              script: s,
              jsonText: JSON.stringify(s, null, 2),
              isJsonVisible: true,
              isApproved: false,
              modelUsed: 'JSON Importado',
              isNative: false,
            };
            setMessages((prev) => [newMsg, ...prev]);
            setActiveMessageId(newMsgId);
            resetStageVisuals(s);
            setShowComposerExtras(false);
          }
        } catch {
          // ignore invalid file
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [stopAll, resetStageVisuals]
  );

  return (
    <div className="min-h-screen bg-[#141417] text-zinc-300 flex flex-col selection:bg-white/15 selection:text-zinc-200">
      {/* Top Chat Header — Dark gray & translucent gray */}
      <header className="sticky top-0 z-40 bg-[#18181c]/85 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Sidebar Toggle + Translucent Gray AI Avatar + Brand Name + Subtitle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title={isSidebarOpen ? 'Recolher barra lateral de sessões' : 'Abrir barra lateral de sessões'}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer backdrop-blur-md"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 text-zinc-300" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-zinc-300" />
            )}
          </button>

          <button
            type="button"
            onClick={handleStartNewSession}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
            title="Ir para o chat inicial (Nova Sessão)"
          >
            <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/15 flex items-center justify-center backdrop-blur-md group-hover:bg-white/[0.09] group-hover:border-white/25 transition-colors">
              <ExplicodeLogo variant="static" className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-base sm:text-lg font-bold tracking-tight leading-none">
                <span className="text-zinc-100">Explicode</span>
              </div>
            </div>
          </button>
        </div>

        {/* Right: Layout Switcher + Fullscreen + New Session + Settings + User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Layout presentation mode selector */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('standard')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                layoutMode === 'standard'
                  ? 'bg-white/[0.14] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização Padrão (Chat com vídeo integrado)"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('video-right')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                layoutMode === 'video-right'
                  ? 'bg-white/[0.14] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização com Vídeo fixado à direita"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Vídeo à Direita</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('script-right')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                layoutMode === 'script-right'
                  ? 'bg-white/[0.14] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização com Roteiro e Segmentos à direita"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Roteiro à Direita</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer backdrop-blur-md"
            title={isFullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia (Fullscreen)'}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-zinc-200" />
            ) : (
              <Maximize2 className="w-4 h-4 text-zinc-300" />
            )}
          </button>

          <button
            type="button"
            onClick={handleStartNewSession}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer backdrop-blur-md ${
              activeMessageId === null
                ? 'bg-white/[0.1] border-white/20 text-zinc-200'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Iniciar uma nova conversa limpa"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden sm:inline">Nova Sessão</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            title="Configurações de Voz, Tema e Formato do Vídeo"
            className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer backdrop-blur-md"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div
            className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/15 flex items-center justify-center text-zinc-300 backdrop-blur-md"
            aria-label="Perfil do usuário"
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Body Wrapper with Left Session Sidebar + Main Chat Area */}
      <div className="flex-1 flex relative">
        {/* Mobile Backdrop when Sidebar is open on small screens */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 top-[65px] z-30 bg-[#101013]/70 backdrop-blur-[2px] lg:hidden"
          />
        )}

        {/* Left Sessions & History Sidebar */}
        <aside
          className={`fixed top-[65px] bottom-0 left-0 z-30 w-72 bg-[#17171b]/90 backdrop-blur-xl border-r border-white/10 flex flex-col transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Top Action: New Conversation / Session */}
          <div className="p-3.5 border-b border-white/10">
            <button
              type="button"
              onClick={handleStartNewSession}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer backdrop-blur-md ${
                activeMessageId === null && !isGenerating
                  ? 'bg-white/[0.1] text-zinc-200 border-white/20'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/10'
              }`}
            >
              <span className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-zinc-300" />
                <span>Nova Conversa / Roteiro</span>
              </span>
              <Plus className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>

          {/* Scrollable Session Lists */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* 1. User Generated Sessions History */}
            <div className="space-y-2">
              <div className="px-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Histórico de Sessões</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {userGeneratedSessions.length}
                </span>
              </div>

              {userGeneratedSessions.length === 0 ? (
                <div className="px-3 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-zinc-400 leading-relaxed">
                  Nenhum roteiro gerado ainda. Crie uma conversa no chat e ela ficará salva aqui como uma sessão própria.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {userGeneratedSessions.map((session) => {
                    const isSelected = activeMessageId === session.id;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectSession(session.id);
                          }
                        }}
                        className={`group w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 backdrop-blur-md ${
                          isSelected
                            ? 'bg-white/[0.09] border-white/20 text-zinc-200'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-zinc-400'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <MessageSquare
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-zinc-300' : 'text-zinc-500'
                              }`}
                            />
                            <p className="text-xs font-semibold truncate text-zinc-300">
                              {session.script.title || 'Roteiro Gerado'}
                            </p>
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-1">
                            {session.userPrompt}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                            <span>{session.timestamp}</span>
                            <span>·</span>
                            <span
                              className={
                                session.isApproved ? 'text-zinc-300' : 'text-zinc-400'
                              }
                            >
                              {session.isApproved ? 'Vídeo ativo' : 'Aguardando aprovação'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Excluir esta sessão"
                          className="opacity-70 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Native Built-in Sessions */}
            <div className="space-y-2">
              <div className="px-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <FolderCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Roteiros Nativos</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {nativeSessions.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {nativeSessions.map((session) => {
                  const isSelected = activeMessageId === session.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 backdrop-blur-md ${
                        isSelected
                          ? 'bg-white/[0.09] border-white/20 text-zinc-200'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold truncate text-zinc-300">
                          <FileCode2
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-zinc-200' : 'text-zinc-400'
                            }`}
                          />
                          <span className="truncate">{session.script.title}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-zinc-300 shrink-0">
                          Nativo
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {session.userPrompt}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                        <span>
                          {session.script.code.length > 0
                            ? `${session.script.code.length} linhas`
                            : '100% Conceitual'}
                        </span>
                        <span>·</span>
                        <span>{session.script.segments.length} trechos</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Workspace Column: splits when layoutMode !== 'standard' */}
        <div
          className={`flex-1 flex flex-col lg:flex-row min-w-0 transition-all duration-300 ${
            isSidebarOpen ? 'lg:ml-72' : ''
          }`}
        >
          {/* Central Column: Notices + Chat messages + Input */}
          <div className="flex-1 flex flex-col min-w-0">
          {/* Optional Gemini TTS Notice Banner */}
          {geminiNotice && (
            <div className="max-w-3xl w-full mx-auto px-4 pt-3">
              <div className="p-3 rounded-xl border bg-white/[0.04] border-white/15 text-zinc-300 backdrop-blur-md text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-zinc-300" />
                  <span>
                    <strong>{geminiNotice.title}:</strong> {geminiNotice.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGeminiNotice(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Main Conversational Chat Stream (Only renders the clicked session or clean initial state) */}
          <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 pt-6 pb-36 flex flex-col gap-8">
            {/* Clean Initial Chat State when no session is selected and not currently generating */}
            {displayedMessages.length === 0 && !isGenerating && !chatError && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 sm:py-24 text-center max-w-xl mx-auto gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/15 flex items-center justify-center backdrop-blur-md">
                  <ExplicodeLogo variant="waves" className="w-9 h-9 text-sky-400" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-200 tracking-tight">
                    Explicode · Estúdio de Vídeos de Código
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Envie um tema, cole um código ou faça upload de imagens abaixo para gerar uma nova sessão, ou clique em qualquer sessão no{' '}
                    <strong className="text-zinc-300">menu lateral à esquerda</strong> para visualizar seu histórico ou os roteiros nativos.
                  </p>
                </div>
              </div>
            )}

            {displayedMessages.map((msg) => {
          const isCurrentActive = activeMessageId === msg.id;
          const isThisPlaying = isCurrentActive && isPlaying;
          const segIdx = isCurrentActive ? currentSegmentIndex : 0;
          const segProg = isCurrentActive ? segmentProgress[segIdx] ?? 0 : 0;
          const timing = getScriptTiming(msg.script, segIdx, segProg);
          const article = buildStructuredExplanation(msg.script);
          const sceneCount = msg.script.segments.filter((s) => s.scene).length;

          // Compute idle line visibilities (all code lines visible when paused/idle)
          const msgLineVisibilities = isCurrentActive
            ? lineVisibilities
            : msg.script.code.map((line) => line.length);

          const msgCaption = isCurrentActive
            ? captionText || msg.script.segments[segIdx]?.say || ''
            : msg.script.segments[0]?.say || '';

          return (
            <div key={msg.id} className="flex flex-col gap-6">
              {/* 1. User Prompt Bubble (Right-aligned, translucent gray) */}
              <div className="flex items-start justify-end gap-3">
                <div className="bg-white/[0.05] border border-white/10 backdrop-blur-md rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-xl shadow-lg">
                  <div className="flex items-center justify-end gap-2 text-[11px] text-zinc-400 mb-1">
                    <span className="font-medium text-zinc-300">Você</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                    {msg.userPrompt}
                  </p>
                  {msg.userImages && msg.userImages.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {msg.userImages.map((imgSrc, imgIdx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={imgIdx}
                          src={imgSrc}
                          alt={`Imagem enviada ${imgIdx + 1}`}
                          className="h-24 w-auto max-w-[180px] object-cover rounded-xl border border-white/15 shadow"
                        />
                      ))}
                    </div>
                  )}
                  {msg.userCode && (
                    <pre className="mt-2.5 p-2.5 rounded-lg bg-[#121215]/80 border border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-32">
                      {msg.userCode}
                    </pre>
                  )}
                </div>

                <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md flex items-center justify-center text-zinc-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {/* 2. Assistant Response Bubble (Left-aligned, translucent gray) */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                  <ExplicodeLogo variant="waves" className="w-5 h-5 text-sky-400" />
                </div>

                <div className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm p-5 sm:p-6 shadow-2xl flex flex-col gap-5">
                  {/* Bubble Header */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-300">Explicode</span>
                      <span className="text-zinc-500">{msg.timestamp}</span>
                      {msg.modelUsed && (
                        <span className="text-[11px] text-zinc-500">· {msg.modelUsed}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {msg.script.segments.length} trechos · ~{formatSeconds(timing.total)}
                    </span>
                  </div>

                  {/* Structured Explanation */}
                  <div className="space-y-4 text-zinc-300">
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-200 tracking-tight">
                      {article.heading}
                    </h2>

                    <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                      {article.intro}
                    </p>

                    {/* Numbered "Como ele funciona?" section */}
                    <div className="space-y-2.5 pt-1">
                      <h3 className="text-base font-bold text-zinc-200">Como ele funciona?</h3>
                      <div className="space-y-2">
                        {article.steps.map((stepText, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                            <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/15 text-zinc-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{stepText}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Checkmarks "Pontos principais do vídeo" section */}
                    <div className="space-y-2.5 pt-1">
                      <h3 className="text-base font-bold text-zinc-200">Pontos principais do vídeo</h3>
                      <div className="space-y-2">
                        {article.highlights.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                            <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/15 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                            <span className="leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-zinc-300 leading-relaxed pt-1">
                      {article.conclusion}
                    </p>
                  </div>

                  {/* JSON Generation / Approval / Show-Hide Control Bar */}
                  <div
                    className={`rounded-xl border p-3.5 transition-all flex flex-col gap-3 backdrop-blur-md ${
                      !msg.isApproved
                        ? 'bg-white/[0.06] border-white/20'
                        : 'bg-white/[0.04] border-white/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <FileCode2 className="w-4 h-4 text-zinc-300" />
                        <span className="font-semibold text-zinc-300">
                          {msg.isApproved
                            ? 'Roteiro JSON Aprovado'
                            : 'Roteiro JSON Gerado — Aguardando sua aprovação'}
                        </span>
                        <span className="text-zinc-500 hidden sm:inline">
                          ·{' '}
                          {msg.script.code.length > 0
                            ? `${msg.script.code.length} linhas`
                            : 'Modo Conceitual'}{' '}
                          · {sceneCount} cenas visuais
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Show / Hide JSON Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleJsonVisibility(msg.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 transition-colors cursor-pointer backdrop-blur-md"
                        >
                          {msg.isJsonVisible ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Ocultar Editor / JSON</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-zinc-300" />
                              <span>Edição Rápida / JSON</span>
                            </>
                          )}
                        </button>

                        {/* Approve Button */}
                        {!msg.isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleApproveMessageScript(msg.id, true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.1] hover:bg-white/[0.16] text-zinc-200 border border-white/20 transition-all cursor-pointer backdrop-blur-md"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprovar e Gerar Vídeo</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              stopAll();
                              setActiveMessageId(msg.id);
                              setShowExportModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 border border-white/15 transition-colors cursor-pointer backdrop-blur-md"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar MP4</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Status or validation notice */}
                    {msg.statusNote && (
                      <p className="text-xs text-zinc-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>{msg.statusNote}</span>
                      </p>
                    )}

                    {msg.jsonError && (
                      <p className="text-xs text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{msg.jsonError}</span>
                      </p>
                    )}

                    {/* Collapsible JSON Editor Area */}
                    {msg.isJsonVisible && (
                      <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>
                            Você pode revisar ou editar o JSON abaixo antes de aprovar ou atualizar o vídeo:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAutoRepairMessageJson(msg.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 cursor-pointer"
                              title="Sincronizar números de linha e marcações"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Auto-corrigir</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const parsed = JSON.parse(msg.jsonText);
                                  handleChangeMessageJson(
                                    msg.id,
                                    JSON.stringify(parsed, null, 2)
                                  );
                                } catch {
                                  // ignore
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 cursor-pointer"
                            >
                              <AlignLeft className="w-3 h-3" />
                              <span>Formatar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(msg.jsonText).catch(() => {});
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </button>
                          </div>
                        </div>

                        <QuickJsonEditor
                          jsonText={msg.jsonText}
                          syntaxColors={effectiveTheme.syntax}
                          onChangeRawJson={(newText) => handleChangeMessageJson(msg.id, newText)}
                          onSyncScript={(newJsonText, repairedScript, summaryNote) =>
                            handleQuickSyncMessageScript(
                              msg.id,
                              newJsonText,
                              repairedScript,
                              summaryNote
                            )
                          }
                        />

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleJsonVisibility(msg.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 cursor-pointer"
                          >
                            Ocultar JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveMessageScript(msg.id, true)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.1] hover:bg-white/[0.16] border border-white/20 text-zinc-200 cursor-pointer backdrop-blur-md"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprovar e Atualizar Vídeo</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Embedded Real Video Player inside the Chat Bubble (Bluish layout as before) */}
                  {msg.isApproved &&
                    (layoutMode === 'video-right' ? (
                      <div className="rounded-xl p-3.5 border border-indigo-500/20 bg-[#0a1022]/90 flex items-center justify-between gap-3 text-xs shadow-md">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-200">Vídeo ativo no painel lateral à direita</p>
                            <p className="text-[11px] text-zinc-400">O player está aberto ao lado para visualização contínua.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePlayForMessage(msg)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-zinc-200 font-medium cursor-pointer"
                          >
                            {isThisPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            <span>{isThisPlaying ? 'Pausar' : 'Reproduzir'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLayoutMode('standard')}
                            className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer ml-1"
                            title="Voltar ao modo padrão com player dentro do chat"
                          >
                            Exibir aqui
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl overflow-hidden border border-indigo-500/20 bg-[#070b18] shadow-xl flex flex-col">
                        {/* Video Stage */}
                        <div className="relative">
                          <VideoStage
                            script={msg.script}
                            theme={effectiveTheme}
                            aspectRatio={aspectRatio}
                            isPlaying={isThisPlaying}
                            currentSegmentIndex={segIdx}
                            lineVisibilities={msgLineVisibilities}
                            caretLine={isCurrentActive ? caretLine : -1}
                            focusRange={
                              focusMode === 'manual'
                                ? manualFocusRange
                                : isCurrentActive
                                ? focusRange
                                : null
                            }
                            markInfo={isCurrentActive ? markInfo : null}
                            outputValue={isCurrentActive ? outputValue : null}
                            captionText={msgCaption}
                            scene={
                              isThisPlaying
                                ? msg.script.segments[segIdx]?.scene ?? null
                                : null
                            }
                            sceneKey={segIdx}
                            sceneProgress={segProg}
                            onPlayClick={() => handleTogglePlayForMessage(msg)}
                            focusMode={focusMode}
                            onLineClick={handleLineClick}
                            onToggleFocusMode={handleToggleFocusMode}
                            onClearManualFocus={handleClearManualFocus}
                          />
                        </div>

                        {/* Integrated Bottom Video Player Control Bar */}
                        <div className="bg-[#0a1022] border-t border-indigo-500/15 px-3 sm:px-4 py-2.5 flex flex-col gap-2">
                          {/* Scrubber / Segment Progress Bar */}
                          <div className="flex items-center gap-1.5 w-full">
                            {msg.script.segments.map((seg, sIndex) => {
                              const fill = isCurrentActive
                                ? sIndex < segIdx
                                  ? 100
                                  : sIndex === segIdx
                                  ? Math.round(segProg * 100)
                                  : 0
                                : 0;
                              return (
                                <button
                                  key={sIndex}
                                  type="button"
                                  onClick={() => playFromForMessage(msg, sIndex)}
                                  title={`Trecho ${sIndex + 1}: ${seg.say.slice(0, 60)}...`}
                                  className="group flex-1 h-2 rounded-full bg-[#16203a] overflow-hidden cursor-pointer relative"
                                >
                                  <div
                                    className="h-full bg-sky-400/90 transition-all duration-150"
                                    style={{ width: `${fill}%` }}
                                  />
                                </button>
                              );
                            })}
                          </div>

                          {/* Bottom Media Controls Row */}
                          <div className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                            {/* Left controls: Play/Pause, Step Back/Forward, Time */}
                            <div className="flex items-center gap-2 sm:gap-3">
                              <button
                                type="button"
                                onClick={() => handleTogglePlayForMessage(msg)}
                                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-zinc-200 transition-colors cursor-pointer"
                                aria-label={isThisPlaying ? 'Pausar' : 'Reproduzir'}
                              >
                                {isThisPlaying ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => playFromForMessage(msg, Math.max(0, segIdx - 1))}
                                disabled={!isCurrentActive || segIdx <= 0}
                                className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 disabled:opacity-40 text-zinc-300 cursor-pointer"
                                title="Trecho anterior"
                              >
                                <SkipBack className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  playFromForMessage(
                                    msg,
                                    Math.min(msg.script.segments.length - 1, segIdx + 1)
                                  )
                                }
                                disabled={
                                  !isCurrentActive || segIdx >= msg.script.segments.length - 1
                                }
                                className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 disabled:opacity-40 text-zinc-300 cursor-pointer"
                                title="Próximo trecho"
                              >
                                <SkipForward className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => playFromForMessage(msg, 0)}
                                className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                title="Reiniciar vídeo"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              <span className="font-mono text-[11px] text-zinc-300 tabular-nums">
                                {formatSeconds(timing.elapsed)} / {formatSeconds(timing.total)}
                              </span>
                            </div>

                            {/* Right controls: Audio, CC/JSON toggle, Settings, Download MP4 */}
                            <div className="flex items-center gap-2 sm:gap-2.5">
                              {isGeminiSynthesizing && isCurrentActive && (
                                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-300">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Voz IA...</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setVoiceEnabled((v) => !v)}
                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 hover:text-zinc-200 cursor-pointer"
                                title={voiceEnabled ? 'Silenciar narração' : 'Ativar narração'}
                              >
                                {voiceEnabled ? (
                                  <Volume2 className="w-4 h-4" />
                                ) : (
                                  <VolumeX className="w-4 h-4 text-zinc-500" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={handleToggleFocusMode}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                                  focusMode === 'manual'
                                    ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
                                    : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                                }`}
                                title={
                                  focusMode === 'manual'
                                    ? 'Modo de Foco Manual ativo: você clica nas linhas para destacar. Clique para voltar para Automático.'
                                    : 'Modo de Foco Automático: segue o roteiro. Clique para ativar Foco Manual.'
                                }
                              >
                                <Target className="w-3 h-3 text-zinc-300" />
                                <span className="hidden sm:inline">Foco:</span>
                                <span className="font-bold">{focusMode === 'manual' ? 'Manual' : 'Auto'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleJsonVisibility(msg.id)}
                                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                                  msg.isJsonVisible
                                    ? 'border-white/30 text-zinc-200 bg-white/[0.12]'
                                    : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                                }`}
                                title="Mostrar ou ocultar JSON do roteiro"
                              >
                                JSON
                              </button>

                              <button
                                type="button"
                                onClick={() => setShowSettingsModal(true)}
                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 hover:text-zinc-200 cursor-pointer"
                                title="Configurações de voz e aparência"
                              >
                                <Settings className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={toggleFullscreen}
                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 hover:text-zinc-200 cursor-pointer"
                                title={isFullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia (Fullscreen)'}
                              >
                                {isFullscreen ? (
                                  <Minimize2 className="w-4 h-4" />
                                ) : (
                                  <Maximize2 className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  stopAll();
                                  setActiveMessageId(msg.id);
                                  setShowExportModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-zinc-200 font-semibold text-[11px] transition-colors cursor-pointer backdrop-blur-md"
                                title="Exportar e baixar vídeo em alta definição"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">MP4</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Pending Generation Bubble while AI is working */}
        {isGenerating && pendingPrompt && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-start justify-end gap-3">
              <div className="bg-white/[0.05] border border-white/10 backdrop-blur-md rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-xl shadow-lg">
                <div className="flex items-center justify-end gap-2 text-[11px] text-zinc-400 mb-1">
                  <span className="font-medium text-zinc-300">Você</span>
                  <span>{getCurrentTimeStr()}</span>
                </div>
                <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                  {pendingPrompt}
                </p>
                {pendingImages.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {pendingImages.map((imgSrc, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={idx}
                        src={imgSrc}
                        alt={`Imagem ${idx + 1}`}
                        className="h-20 w-auto max-w-[150px] object-cover rounded-xl border border-white/15"
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md flex items-center justify-center text-zinc-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                <BrainCircuit className="w-5 h-5 text-zinc-300 animate-pulse" />
              </div>
              <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm p-5 sm:p-6 shadow-2xl flex items-center gap-3 text-sm text-zinc-300">
                <RefreshCw className="w-4 h-4 text-zinc-300 animate-spin shrink-0" />
                <span>
                  Criando explicação detalhada, cenas visuais animadas e roteiro JSON de +1 minuto...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Clear Error Banner in Chat if AI Generation fails */}
        {chatError && !isGenerating && (
          <div className="flex items-start gap-3 sm:gap-4 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex-1 bg-white/[0.04] border border-white/15 backdrop-blur-md rounded-2xl rounded-tl-sm p-4 sm:p-5 flex flex-col gap-3 text-xs text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-zinc-200">
                  Não foi possível gerar o roteiro com a IA
                </span>
                <button
                  type="button"
                  onClick={() => setChatError(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-zinc-300 leading-relaxed break-words">{chatError.message}</p>
              {chatError.apiKeyMask && (
                <div className="p-2.5 rounded-xl bg-[#18181c]/90 border border-white/10 font-mono text-xs text-zinc-300 flex flex-wrap items-center gap-3">
                  <span>
                    🔑 Chave com problema: <strong className="text-zinc-200">{chatError.apiKeyMask}</strong>
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    4 primeiros: <strong className="text-zinc-300">{chatError.apiKeyFirst4}</strong>
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>
                    5 últimos: <strong className="text-zinc-300">{chatError.apiKeyLast5}</strong>
                  </span>
                </div>
              )}
              {chatError.failedKeys && chatError.failedKeys.length > 0 && (
                <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#18181c]/90 border border-white/10 font-mono text-[11px]">
                  {chatError.failedKeys.map((fk) => (
                    <div
                      key={fk.keyMask}
                      className="flex flex-wrap items-center justify-between gap-2 text-zinc-300"
                    >
                      <span>
                        🔑 <strong className="text-zinc-200">{fk.keyMask}</strong> (4 primeiros:{' '}
                        <span className="text-zinc-300">{fk.prefix4}</span> · 5 últimos:{' '}
                        <span className="text-zinc-300">{fk.suffix5}</span>)
                      </span>
                      <span className="text-zinc-300 font-semibold">
                        {fk.status === 'disabled'
                          ? 'BLOQUEADA (Erro 403 — desativada)'
                          : `AGUARDANDO (Erro 429 — tentar em ${fk.retryAfterSeconds}s)`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendChatPrompt()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-zinc-200 font-semibold cursor-pointer transition-colors backdrop-blur-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar novamente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 font-semibold cursor-pointer transition-colors backdrop-blur-md"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Ver Status das Chaves</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
          </main>

          {/* Bottom Floating Chat Composer Bar — aligned with chat column */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#141417] via-[#141417]/95 to-transparent pt-4 pb-4 px-3 sm:px-6 transition-all duration-300 ${
              isSidebarOpen ? 'lg:left-72' : ''
            } ${
              layoutMode !== 'standard' ? 'lg:right-[480px] xl:right-[540px] 2xl:right-[600px]' : ''
            }`}
          >
        <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
          {/* Optional Collapsible Extras Drawer (when user clicks the '+' button) */}
          {showComposerExtras && (
            <div className="bg-[#1b1b20]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                  Opções extras de criação (Opcional)
                </span>
                <button
                  type="button"
                  onClick={() => setShowComposerExtras(false)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick preset pills */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-zinc-400">
                  Ou escolha um exemplo pronto para enviar no chat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPresetIntoChat(p.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 hover:text-zinc-200 border border-white/10 text-xs transition-colors cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 border border-white/15 text-xs transition-colors cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>Importar JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadJsonFile}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Optional source code textarea */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-zinc-400">
                  Se desejar, cole um trecho de código específico para ser explicado:
                </label>
                <textarea
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  rows={3}
                  placeholder="Opcional: cole seu código aqui..."
                  className="w-full bg-[#141417]/80 border border-white/10 rounded-xl p-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-white/25"
                />
              </div>
            </div>
          )}

          {/* Attached Images Preview Strip */}
          {attachedImages.length > 0 && (
            <div className="bg-[#1b1b20]/95 backdrop-blur-xl border border-white/15 rounded-2xl px-3.5 py-2.5 shadow-xl flex flex-col gap-2 animate-fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <ImagePlus className="w-3.5 h-3.5 text-zinc-300" />
                  <span>
                    {attachedImages.length} imagem(ns) anexada(s) — você pode enviar direto sem escrever texto!
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setAttachedImages([])}
                  className="text-zinc-400 hover:text-zinc-200 text-[11px] cursor-pointer"
                >
                  Remover todas
                </button>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {attachedImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group shrink-0 rounded-xl overflow-hidden border border-white/15 bg-[#141417]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="h-16 w-24 object-cover block"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachedImage(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#18181c]/85 hover:bg-white/20 text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                      title="Remover imagem"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="h-16 w-16 rounded-xl border border-dashed border-white/15 hover:border-white/30 bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 hover:text-zinc-300 flex flex-col items-center justify-center gap-1 text-[10px] shrink-0 cursor-pointer transition-colors"
                  title="Adicionar mais imagens"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Foto</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden Multi-Image File Input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleSelectImageFiles}
            className="sr-only"
          />

          {/* Main Pill Input Bar */}
          <form
            onSubmit={handleSendChatPrompt}
            onPaste={handlePasteImages}
            className="bg-white/[0.05] backdrop-blur-xl border border-white/15 rounded-full px-3 py-2 flex items-center gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
          >
            {/* '+' Button */}
            <button
              type="button"
              onClick={() => setShowComposerExtras((prev) => !prev)}
              title="Adicionar código opcional ou escolher exemplo pronto"
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                showComposerExtras
                  ? 'bg-white/[0.14] border-white/30 text-zinc-200'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-zinc-300 hover:text-zinc-200'
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Upload Multiple Images Button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isGenerating}
              title="Enviar uma ou mais imagens (com ou sem texto)"
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors shrink-0 cursor-pointer relative ${
                attachedImages.length > 0
                  ? 'bg-white/[0.14] border-white/30 text-zinc-200'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-zinc-300 hover:text-zinc-200'
              }`}
            >
              <ImagePlus className="w-4 h-4" />
              {attachedImages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-700 border border-white/30 text-zinc-200 text-[10px] font-bold flex items-center justify-center">
                  {attachedImages.length}
                </span>
              )}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={isGenerating}
              placeholder={
                attachedImages.length > 0
                  ? 'Opcional: adicione uma pergunta ou clique em Enviar para a IA explicar as imagens...'
                  : 'Digite o assunto, cole imagens (Ctrl+V) ou envie fotos de código/diagramas...'
              }
              className="flex-1 bg-transparent border-none text-sm sm:text-[15px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none px-2"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={
                isGenerating ||
                (!promptInput.trim() && !codeInput.trim() && attachedImages.length === 0)
              }
              aria-label="Gerar roteiro e vídeo"
              className="w-10 h-10 rounded-full bg-white/[0.09] hover:bg-white/[0.16] border border-white/20 disabled:opacity-35 text-zinc-200 flex items-center justify-center shrink-0 backdrop-blur-md transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 -translate-x-0.5 translate-y-0.5" />
            </button>
          </form>
        </div>
      </div>
          </div>

          {/* Right Docked Panel: Vídeo à Direita */}
          {layoutMode === 'video-right' && (
            <aside className="w-full lg:w-[480px] xl:w-[540px] 2xl:w-[600px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#141417]/95 backdrop-blur-xl flex flex-col lg:h-[calc(100vh-65px)] lg:sticky lg:top-[65px] overflow-y-auto z-20 shadow-2xl">
              {/* Header */}
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#18181c]/80 sticky top-0 z-30 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200 leading-none">
                      Vídeo à Direita
                    </h3>
                    <p className="text-[10.5px] text-zinc-400 truncate max-w-[240px] sm:max-w-[280px] mt-0.5">
                      {activeMessage?.script.title || 'Player Ativo'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('standard')}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    title="Fechar painel lateral (Voltar ao Chat)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Player Body */}
              <div className="p-4 space-y-4">
                {activeMessage ? (
                  <div className="rounded-xl overflow-hidden border border-indigo-500/20 bg-[#070b18] shadow-xl flex flex-col">
                    <div className="relative">
                      <VideoStage
                        script={activeMessage.script}
                        theme={effectiveTheme}
                        aspectRatio={aspectRatio}
                        isPlaying={isPlaying}
                        currentSegmentIndex={currentSegmentIndex}
                        lineVisibilities={lineVisibilities}
                        caretLine={caretLine}
                        focusRange={focusMode === 'manual' ? manualFocusRange : focusRange}
                        markInfo={markInfo}
                        outputValue={outputValue}
                        captionText={captionText || activeMessage.script.segments[currentSegmentIndex]?.say || ''}
                        scene={isPlaying ? activeMessage.script.segments[currentSegmentIndex]?.scene ?? null : null}
                        sceneKey={currentSegmentIndex}
                        sceneProgress={segmentProgress[currentSegmentIndex] ?? 0}
                        onPlayClick={() => handleTogglePlayForMessage(activeMessage)}
                        focusMode={focusMode}
                        onLineClick={handleLineClick}
                        onToggleFocusMode={handleToggleFocusMode}
                        onClearManualFocus={handleClearManualFocus}
                      />
                    </div>

                    {/* Integrated Bottom Player Bar */}
                    <div className="bg-[#0a1022] border-t border-indigo-500/15 px-3 py-2.5 flex flex-col gap-2">
                      {/* Scrubber */}
                      <div className="flex items-center gap-1.5 w-full">
                        {activeMessage.script.segments.map((seg, sIndex) => {
                          const fill =
                            sIndex < currentSegmentIndex
                              ? 100
                              : sIndex === currentSegmentIndex
                              ? Math.round((segmentProgress[currentSegmentIndex] ?? 0) * 100)
                              : 0;
                          return (
                            <button
                              key={sIndex}
                              type="button"
                              onClick={() => playFromForMessage(activeMessage, sIndex)}
                              title={`Trecho ${sIndex + 1}: ${seg.say.slice(0, 50)}...`}
                              className="group flex-1 h-2 rounded-full bg-[#16203a] overflow-hidden cursor-pointer relative"
                            >
                              <div
                                className="h-full bg-sky-400/90 transition-all duration-150"
                                style={{ width: `${fill}%` }}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTogglePlayForMessage(activeMessage)}
                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-zinc-200 cursor-pointer"
                          >
                            {isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              playFromForMessage(activeMessage, Math.max(0, currentSegmentIndex - 1))
                            }
                            disabled={currentSegmentIndex <= 0}
                            className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 disabled:opacity-40 text-zinc-300 cursor-pointer"
                            title="Trecho anterior"
                          >
                            <SkipBack className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              playFromForMessage(
                                activeMessage,
                                Math.min(activeMessage.script.segments.length - 1, currentSegmentIndex + 1)
                              )
                            }
                            disabled={
                              currentSegmentIndex >= activeMessage.script.segments.length - 1
                            }
                            className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 disabled:opacity-40 text-zinc-300 cursor-pointer"
                            title="Próximo trecho"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => playFromForMessage(activeMessage, 0)}
                            className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                            title="Reiniciar vídeo"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-[10.5px] text-zinc-300 tabular-nums ml-1">
                            {formatSeconds(
                              getScriptTiming(
                                activeMessage.script,
                                currentSegmentIndex,
                                segmentProgress[currentSegmentIndex] ?? 0
                              ).elapsed
                            )}{' '}
                            /{' '}
                            {formatSeconds(
                              getScriptTiming(
                                activeMessage.script,
                                currentSegmentIndex,
                                segmentProgress[currentSegmentIndex] ?? 0
                              ).total
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setVoiceEnabled((v) => !v)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 hover:text-zinc-200 cursor-pointer"
                            title={voiceEnabled ? 'Silenciar narração' : 'Ativar narração'}
                          >
                            {voiceEnabled ? (
                              <Volume2 className="w-3.5 h-3.5" />
                            ) : (
                              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleFocusMode}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                              focusMode === 'manual'
                                ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
                                : 'border-white/10 bg-white/[0.04] text-zinc-300'
                            }`}
                            title="Alternar foco automático ou manual"
                          >
                            <Target className="w-3 h-3" />
                            <span>{focusMode === 'manual' ? 'Manual' : 'Auto'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 hover:text-zinc-200 cursor-pointer"
                            title="Tela cheia"
                          >
                            {isFullscreen ? (
                              <Minimize2 className="w-3.5 h-3.5" />
                            ) : (
                              <Maximize2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              stopAll();
                              setShowExportModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-zinc-200 font-semibold text-[10.5px] cursor-pointer"
                            title="Exportar vídeo"
                          >
                            <Download className="w-3 h-3" />
                            <span>MP4</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-400 bg-white/[0.02] border border-white/10 rounded-xl">
                    <p className="text-xs">Nenhum roteiro ativo no momento.</p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Selecione uma sessão no menu lateral ou envie um prompt no chat.
                    </p>
                  </div>
                )}

                {/* Segments Quick Jump List */}
                {activeMessage && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                      <span>Trechos do Vídeo ({activeMessage.script.segments.length})</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Clique para pular</span>
                    </div>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {activeMessage.script.segments.map((seg, sIdx) => {
                        const isCurrent = currentSegmentIndex === sIdx;
                        return (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => playFromForMessage(activeMessage, sIdx)}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors cursor-pointer flex items-start gap-2.5 ${
                              isCurrent
                                ? 'bg-sky-500/10 border-sky-500/30 text-zinc-200'
                                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-400'
                            }`}
                          >
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                                isCurrent
                                  ? 'bg-sky-500/20 text-sky-300 font-bold'
                                  : 'bg-white/[0.05] text-zinc-500'
                              }`}
                            >
                              #{sIdx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11.5px] line-clamp-2 text-zinc-300">{seg.say}</p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 font-mono">
                                <span>{Math.round(estimateSpeechDuration(seg.say) * 10) / 10}s</span>
                                {seg.focus && <span>· Foco: L{seg.focus[0]}–L{seg.focus[1]}</span>}
                                {seg.scene && (
                                  <span className="text-amber-400/80">
                                    · Cena: {seg.scene.title || 'Visual'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Right Docked Panel: Roteiro à Direita */}
          {layoutMode === 'script-right' && (
            <aside className="w-full lg:w-[480px] xl:w-[540px] 2xl:w-[600px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#141417]/95 backdrop-blur-xl flex flex-col lg:h-[calc(100vh-65px)] lg:sticky lg:top-[65px] overflow-y-auto z-20 shadow-2xl">
              {/* Header */}
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#18181c]/80 sticky top-0 z-30 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200 leading-none">
                      Roteiro & Segmentos à Direita
                    </h3>
                    <p className="text-[10.5px] text-zinc-400 truncate max-w-[240px] sm:max-w-[280px] mt-0.5">
                      {activeMessage?.script.title || 'Roteiro Ativo'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeMessage) {
                        navigator.clipboard.writeText(activeMessage.jsonText).catch(() => {});
                      }
                    }}
                    disabled={!activeMessage}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-zinc-200 cursor-pointer disabled:opacity-40"
                    title="Copiar JSON do Roteiro"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('standard')}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    title="Fechar painel lateral (Voltar ao Chat)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Script Body */}
              <div className="p-4 space-y-4">
                {activeMessage ? (
                  <>
                    {/* Header info badge */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-zinc-200 truncate">
                          {activeMessage.script.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {activeMessage.script.file || 'codigo.js'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px] text-zinc-400">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 font-mono">
                          {activeMessage.script.segments.length} trechos
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 font-mono">
                          {activeMessage.script.code.length} linhas
                        </span>
                      </div>
                    </div>

                    {/* Code preview */}
                    {activeMessage.script.code.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-[#0d0e12] overflow-hidden">
                        <div className="px-3 py-2 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-xs">
                          <span className="font-mono text-zinc-300 text-[11px] flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                            {activeMessage.script.file}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard
                                .writeText(activeMessage.script.code.join('\n'))
                                .catch(() => {});
                            }}
                            className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                          >
                            Copiar Código
                          </button>
                        </div>
                        <div className="p-3 font-mono text-[12px] leading-relaxed max-h-[180px] overflow-y-auto text-zinc-300 select-text">
                          {activeMessage.script.code.map((line, lIdx) => (
                            <div key={lIdx} className="flex">
                              <span className="w-6 shrink-0 text-right pr-2 text-zinc-600 select-none text-[11px]">
                                {lIdx + 1}
                              </span>
                              <span className="whitespace-pre">{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interactive Segments List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                        <span>Segmentos do Roteiro</span>
                        <span className="text-[10px] text-zinc-400">Clique para tocar</span>
                      </div>

                      <div className="space-y-2">
                        {activeMessage.script.segments.map((seg, sIdx) => {
                          const isCurrent = currentSegmentIndex === sIdx;
                          return (
                            <div
                              key={sIdx}
                              className={`p-3 rounded-xl border transition-all ${
                                isCurrent
                                  ? 'bg-emerald-500/10 border-emerald-500/30'
                                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      isCurrent
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-white/[0.06] text-zinc-400'
                                    }`}
                                  >
                                    Segmento #{sIdx + 1}
                                  </span>
                                  <span className="text-[11px] font-mono text-zinc-400">
                                    {Math.round(estimateSpeechDuration(seg.say) * 10) / 10}s
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => playFromForMessage(activeMessage, sIdx)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white cursor-pointer px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/10"
                                >
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-3 h-3" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                  <span>{isCurrent && isPlaying ? 'Pausar' : 'Ouvir'}</span>
                                </button>
                              </div>

                              <p className="text-xs text-zinc-200 leading-relaxed italic">
                                &quot;{seg.say}&quot;
                              </p>

                              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] font-mono">
                                {seg.focus && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                    Foco: L{seg.focus[0]}–L{seg.focus[1]}
                                  </span>
                                )}
                                {seg.type && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                                    Digita: L{seg.type[0]}–L{seg.type[1]}
                                  </span>
                                )}
                                {seg.mark && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300">
                                    Marca: &quot;{seg.mark}&quot;
                                  </span>
                                )}
                                {seg.output && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                    Console: {seg.output}
                                  </span>
                                )}
                                {seg.scene && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                                    Cena: {seg.scene.title || 'Visual'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-zinc-400 bg-white/[0.02] border border-white/10 rounded-xl">
                    <p className="text-xs">Nenhum roteiro ativo no momento.</p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Selecione uma sessão ou gere um novo roteiro para visualizar os detalhes aqui.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Compact Studio Settings Modal (Voice, Theme, Format, AI Model & Real-Time Key Pool Status) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101014]/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1b1b20]/95 border border-white/10 backdrop-blur-xl rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl flex flex-col gap-4 text-zinc-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-300" />
                <h3 className="font-semibold text-sm text-zinc-200">
                  Preferências e Status em Tempo Real
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Real-Time API Key Pool Status & Integrity Panel */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-zinc-300 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-200">
                    Monitor de Integridade das Chaves em Tempo Real
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {keyPoolStatus.some((k) => k.status === 'cooldown') && (
                    <button
                      type="button"
                      disabled={isLoadingKeys}
                      onClick={() => handleKeyPoolAction('activate_all_cooldown')}
                      className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-300 text-[11px] font-semibold cursor-pointer transition-colors"
                      title="Reativar imediatamente todas as chaves em espera 429"
                    >
                      Reativar 429
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isLoadingKeys}
                    onClick={fetchKeyPoolStatus}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 hover:text-zinc-200 cursor-pointer"
                    title="Atualizar status agora"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingKeys ? 'animate-spin text-zinc-200' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Visual Integrity Summary Counters & Health Bar */}
              {(() => {
                const total = keyPoolStatus.length;
                const activeCount = keyPoolStatus.filter((k) => k.status === 'active').length;
                const cooldownCount = keyPoolStatus.filter((k) => k.status === 'cooldown').length;
                const disabledCount = keyPoolStatus.filter((k) => k.status === 'disabled').length;
                const activePct = total > 0 ? (activeCount / total) * 100 : 0;
                const cooldownPct = total > 0 ? (cooldownCount / total) * 100 : 0;
                const disabledPct = total > 0 ? (disabledCount / total) * 100 : 0;

                return (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                          <span className="w-2 h-2 rounded-full bg-zinc-300" />
                          Disponíveis
                        </span>
                        <span className="font-mono font-bold text-zinc-200">{activeCount}</span>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                          <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
                          Cooldown
                        </span>
                        <span className="font-mono font-bold text-zinc-300">{cooldownCount}</span>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-zinc-600" />
                          Bloqueadas
                        </span>
                        <span className="font-mono font-bold text-zinc-300">{disabledCount}</span>
                      </div>
                    </div>

                    {/* Visual Integrity Bar */}
                    {total > 0 && (
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
                        {activePct > 0 && (
                          <div
                            className="h-full bg-zinc-300 transition-all duration-300"
                            style={{ width: `${activePct}%` }}
                          />
                        )}
                        {cooldownPct > 0 && (
                          <div
                            className="h-full bg-zinc-500 transition-all duration-300"
                            style={{ width: `${cooldownPct}%` }}
                          />
                        )}
                        {disabledPct > 0 && (
                          <div
                            className="h-full bg-zinc-700 transition-all duration-300"
                            style={{ width: `${disabledPct}%` }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Per-Key Status List */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-0.5">
                {keyPoolStatus.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 py-3 text-center">
                    Nenhuma chave ativa detectada no servidor.
                  </div>
                ) : (
                  keyPoolStatus.map((item) => {
                    const isAvailable = item.status === 'active';
                    const isCooldown = item.status === 'cooldown';
                    const isBlocked = item.status === 'disabled';
                    const cooldownProgress =
                      isCooldown && item.cooldownTotalSeconds > 0
                        ? Math.max(
                            5,
                            Math.min(
                              100,
                              Math.round(
                                (item.retryAfterSeconds / item.cooldownTotalSeconds) * 100
                              )
                            )
                          )
                        : 0;

                    return (
                      <div
                        key={item.keyMask}
                        className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-colors ${
                          isAvailable
                            ? 'bg-white/[0.04] border-white/15'
                            : isCooldown
                            ? 'bg-white/[0.03] border-white/10'
                            : 'bg-white/[0.02] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isAvailable ? (
                              <ShieldCheck className="w-4 h-4 text-zinc-300 shrink-0" />
                            ) : isCooldown ? (
                              <Clock className="w-4 h-4 text-zinc-400 animate-pulse shrink-0" />
                            ) : (
                              <ShieldAlert className="w-4 h-4 text-zinc-500 shrink-0" />
                            )}
                            <span className="font-mono text-xs font-bold text-zinc-200 truncate">
                              🔑 {item.keyMask}
                            </span>
                            <span className="hidden sm:inline text-[10px] font-mono text-zinc-400">
                              ({item.prefix4}...{item.suffix5})
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide shrink-0 bg-white/[0.06] text-zinc-300 border border-white/15">
                            {isAvailable
                              ? 'DISPONÍVEL'
                              : isCooldown
                              ? 'AGUARDANDO (429)'
                              : 'BLOQUEADA (403)'}
                          </span>
                        </div>

                        {/* Details & Live Countdown Row */}
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="text-zinc-300">
                            {isAvailable && (
                              <span className="text-zinc-300">
                                Status: DISPONÍVEL · Pronta para uso
                              </span>
                            )}
                            {isCooldown && (
                              <span className="text-zinc-300 font-medium">
                                Erro: 429 · Tentar novamente em:{' '}
                                <strong className="font-mono text-zinc-200">
                                  {item.retryAfterSeconds}s
                                </strong>
                              </span>
                            )}
                            {isBlocked && (
                              <span className="text-zinc-400 font-medium">
                                Erro: {item.errorCode || 403} · Desativada automaticamente
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isAvailable ? (
                              <button
                                type="button"
                                disabled={isLoadingKeys}
                                onClick={() => handleKeyPoolAction('disable', item.keyMask)}
                                className="px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-zinc-200 text-[10px] font-semibold cursor-pointer transition-colors"
                              >
                                Desativar
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isLoadingKeys}
                                onClick={() => handleKeyPoolAction('activate', item.keyMask)}
                                className="px-2.5 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-zinc-200 text-[10px] font-semibold cursor-pointer transition-colors"
                              >
                                Reativar
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isLoadingKeys}
                              onClick={() => handleKeyPoolAction('remove', item.keyMask)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-400 hover:text-zinc-200 text-[10px] font-semibold cursor-pointer transition-colors"
                              title="Excluir esta chave da rotação"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>

                        {/* Visual Cooldown Progress Bar for 429 keys */}
                        {isCooldown && (
                          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full bg-zinc-300 transition-all duration-1000 ease-linear"
                              style={{ width: `${cooldownProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Gemini Voice Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 font-medium">Voz da Narração:</label>
                <div className="flex items-center gap-2">
                  <select
                    value={voiceMode === 'browser-tts' ? 'browser' : geminiVoice}
                    onChange={(e) => {
                      if (e.target.value === 'browser') {
                        setVoiceMode('browser-tts');
                      } else {
                        setVoiceMode('gemini-tts');
                        setGeminiVoice(e.target.value as GeminiMaleVoice);
                      }
                    }}
                    className="flex-1 bg-[#141417] border border-white/10 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-white/25"
                  >
                    <option value="Puck">Gemini IA — Puck (Didático e Dinâmico)</option>
                    <option value="Charon">Gemini IA — Charon (Grave e Profundo)</option>
                    <option value="Fenrir">Gemini IA — Fenrir (Firme e Claro)</option>
                    <option value="Zephyr">Gemini IA — Zephyr (Suave e Natural)</option>
                    <option value="Aoede">Gemini IA — Aoede (Expressiva)</option>
                    <option value="Kore">Gemini IA — Kore (Articulada)</option>
                    <option value="browser">Voz Nativa do Navegador</option>
                  </select>
                  {voiceMode === 'gemini-tts' && (
                    <button
                      type="button"
                      onClick={handleTestGeminiVoice}
                      disabled={isTestingVoice}
                      className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-300 font-medium cursor-pointer shrink-0"
                    >
                      {isTestingVoice ? 'Testando...' : 'Ouvir'}
                    </button>
                  )}
                </div>
              </div>

              {/* Speech Rate */}
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 font-medium">
                  Velocidade da fala ({speechRate}x):
                </label>
                <div className="flex items-center gap-1.5">
                  {[0.9, 1, 1.1, 1.25].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSpeechRate(r)}
                      className={`flex-1 py-1.5 rounded-lg border font-medium cursor-pointer transition-colors ${
                        speechRate === r
                          ? 'bg-white/[0.12] border-white/30 text-zinc-200'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200'
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
                  Formato do Vídeo:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: '16x9', label: '16:9 (YouTube)' },
                      { id: '9x16', label: '9:16 (Reels/TikTok)' },
                      { id: '1x1', label: '1:1 (Feed)' },
                    ] as { id: AspectRatioType; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAspectRatio(item.id)}
                      className={`py-2 px-2 rounded-lg border text-center font-medium cursor-pointer transition-colors ${
                        aspectRatio === item.id
                          ? 'bg-white/[0.12] border-white/30 text-zinc-200'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Mode Setting */}
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 font-medium flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-zinc-300" />
                    Modo de Foco do Editor:
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {focusMode === 'manual' ? 'Manual (Interativo)' : 'Automático (Script)'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusMode('auto');
                      const activeMsg = messages.find((m) => m.id === activeMessageId);
                      if (activeMsg && activeMsg.script.segments[currentSegmentIndex]) {
                        const seg = activeMsg.script.segments[currentSegmentIndex];
                        const focus1Based = seg.focus || seg.type;
                        setFocusRange(focus1Based ? [focus1Based[0] - 1, focus1Based[1] - 1] : null);
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors flex flex-col gap-1 ${
                      focusMode === 'auto'
                        ? 'bg-white/[0.12] border-white/30 text-zinc-200'
                        : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Automático</span>
                    </div>
                    <span className="text-[10.5px] text-zinc-400 leading-tight">
                      Baseado no script — segue os intervalos de foco e digitação pré-programados no roteiro.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFocusMode('manual')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors flex flex-col gap-1 ${
                      focusMode === 'manual'
                        ? 'bg-white/[0.12] border-white/30 text-zinc-200'
                        : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
                      <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
                      <span>Manual</span>
                    </div>
                    <span className="text-[10.5px] text-zinc-400 leading-tight">
                      Interativo — permite clicar em linhas durante a reprodução para destacar partes específicas.
                    </span>
                  </button>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-zinc-300" />
                  Tema de Fundo do Editor:
                </label>
                <select
                  value={theme.id}
                  onChange={(e) => {
                    const found = THEMES.find((t) => t.id === e.target.value);
                    if (found) setTheme(found);
                  }}
                  className="bg-[#141417] border border-white/10 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-white/25"
                >
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Syntax Highlighting Palette Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-zinc-300 font-medium flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-zinc-300" />
                    Estilo de Realce de Sintaxe (Paleta do Código):
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    {syntaxPalette.languageHint}
                  </span>
                </label>
                <select
                  value={syntaxPalette.id}
                  onChange={(e) => {
                    const found = SYNTAX_PALETTES.find((p) => p.id === e.target.value);
                    if (found) setSyntaxPalette(found);
                  }}
                  className="bg-[#141417] border border-white/10 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-white/25"
                >
                  {SYNTAX_PALETTES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ({p.languageHint})
                    </option>
                  ))}
                </select>

                {/* Live Syntax Highlighting Mini Preview & Color Swatches */}
                <div
                  className="rounded-xl p-2.5 border border-white/10 font-mono text-[11px] flex flex-col gap-2 shadow-inner"
                  style={{ background: effectiveTheme.bgGradient }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span style={{ color: effectiveTheme.syntax.kw }}>function</span>{' '}
                      <span style={{ color: effectiveTheme.syntax.fn }}>validar</span>
                      <span style={{ color: effectiveTheme.syntax.p }}>(</span>
                      <span style={{ color: effectiveTheme.syntax.id }}>token</span>
                      <span style={{ color: effectiveTheme.syntax.p }}>: </span>
                      <span style={{ color: effectiveTheme.syntax.type }}>string</span>
                      <span style={{ color: effectiveTheme.syntax.p }}>) {'{ '}</span>
                      <span style={{ color: effectiveTheme.syntax.kw }}>return</span>{' '}
                      <span style={{ color: effectiveTheme.syntax.str }}>&quot;OK&quot;</span>
                      <span style={{ color: effectiveTheme.syntax.p }}>; {'}'}</span>{' '}
                      <span style={{ color: effectiveTheme.syntax.cm }}>{'// 200'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/10 text-[10px]">
                    {(
                      [
                        { label: 'Keyword', color: effectiveTheme.syntax.kw },
                        { label: 'Função', color: effectiveTheme.syntax.fn },
                        { label: 'Tipo', color: effectiveTheme.syntax.type },
                        { label: 'String', color: effectiveTheme.syntax.str },
                        { label: 'Número', color: effectiveTheme.syntax.num },
                        { label: 'Comentário', color: effectiveTheme.syntax.cm },
                      ] as const
                    ).map((sw) => (
                      <span key={sw.label} className="inline-flex items-center gap-1 text-zinc-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: sw.color }}
                        />
                        <span className="hidden sm:inline">{sw.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gemini Model Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 font-medium">Modelo Gerador de Roteiro:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-[#141417] border border-white/10 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-white/25"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado · Rápido)</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Alta Quota)</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-zinc-200 text-xs font-semibold cursor-pointer backdrop-blur-md"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export / Video Recording Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        script={script}
        theme={effectiveTheme}
        aspectRatio={aspectRatio}
        geminiVoice={geminiVoice}
      />
    </div>
  );
}
