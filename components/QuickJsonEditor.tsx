'use client';

import React, { useState, useMemo } from 'react';
import {
  Zap,
  Code2,
  MessageSquareText,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Terminal,
  Layers,
  ChevronRight,
  ChevronDown,
  FileCode2,
  Highlighter,
} from 'lucide-react';
import { CodeScript, ScriptSegment, SyntaxColors } from '@/types/script';
import { normalizeAndRepairScript } from '@/lib/validation';
import { tokenizeLine } from '@/lib/tokenizer';

interface JsonLineContextItem {
  lineNo: number;
  text: string;
  kind: 'meta' | 'code-line' | 'segment-line';
  codeLineNumber?: number;
  segmentIndex?: number;
}

function parseJsonLinesWithContext(jsonText: string): JsonLineContextItem[] {
  const rawLines = jsonText.split('\n');
  const results: JsonLineContextItem[] = [];
  let inCodeArray = false;
  let codeLineCounter = 0;
  let inSegmentsArray = false;
  let currentSegIdx = -1;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const text = rawLines[idx];
    const trimmed = text.trim();

    if (trimmed.startsWith('"code"') && trimmed.includes('[')) {
      inCodeArray = !trimmed.includes(']');
      codeLineCounter = 0;
      results.push({ lineNo: idx + 1, text, kind: 'meta' });
      continue;
    }

    if (inCodeArray) {
      if (trimmed.startsWith(']')) {
        inCodeArray = false;
        results.push({ lineNo: idx + 1, text, kind: 'meta' });
        continue;
      }
      if (trimmed.startsWith('"')) {
        codeLineCounter += 1;
        results.push({
          lineNo: idx + 1,
          text,
          kind: 'code-line',
          codeLineNumber: codeLineCounter,
        });
        continue;
      }
    }

    if (trimmed.startsWith('"segments"') && trimmed.includes('[')) {
      inSegmentsArray = true;
      currentSegIdx = -1;
      results.push({ lineNo: idx + 1, text, kind: 'meta' });
      continue;
    }

    if (inSegmentsArray) {
      if (trimmed.startsWith('"say"')) {
        currentSegIdx += 1;
      }
      if (currentSegIdx >= 0) {
        results.push({
          lineNo: idx + 1,
          text,
          kind: 'segment-line',
          segmentIndex: currentSegIdx,
        });
        continue;
      }
    }

    results.push({ lineNo: idx + 1, text, kind: 'meta' });
  }

  return results;
}

interface QuickJsonEditorProps {
  jsonText: string;
  syntaxColors?: SyntaxColors;
  onSyncScript: (newJsonText: string, repairedScript: CodeScript, summaryNote?: string) => void;
  onChangeRawJson: (newJsonText: string) => void;
}

export function QuickJsonEditor({
  jsonText,
  syntaxColors,
  onSyncScript,
  onChangeRawJson,
}: QuickJsonEditorProps) {
  const [editorTab, setEditorTab] = useState<'quick-lines' | 'clickable-json' | 'raw-json'>(
    'quick-lines'
  );
  const [selectedLineNumber, setSelectedLineNumber] = useState<number>(1);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number>(0);
  const [lastSyncBadge, setLastSyncBadge] = useState<string | null>(null);

  // Parse the current jsonText safely
  const parsedState = useMemo<{
    script: CodeScript | null;
    error: string | null;
  }>(() => {
    try {
      const raw = JSON.parse(jsonText);
      const validation = normalizeAndRepairScript(raw);
      if (validation.valid && validation.repairedScript) {
        return { script: validation.repairedScript, error: null };
      }
      if (raw && typeof raw === 'object' && Array.isArray(raw.segments)) {
        return {
          script: {
            title: String(raw.title || 'Roteiro'),
            file: String(raw.file || 'exemplo.ts'),
            lang: String(raw.lang || 'pt-BR'),
            code: Array.isArray(raw.code) ? raw.code.map(String) : [],
            segments: raw.segments,
          },
          error: null,
        };
      }
      return { script: null, error: validation.error || 'Estrutura JSON inválida.' };
    } catch (e: unknown) {
      return {
        script: null,
        error: e instanceof Error ? e.message : 'Sintaxe JSON inválida.',
      };
    }
  }, [jsonText]);

  const script = parsedState.script;

  const triggerAutoSync = (draft: CodeScript, note: string) => {
    const validation = normalizeAndRepairScript(draft);
    const finalScript = validation.repairedScript || draft;
    const formatted = JSON.stringify(finalScript, null, 2);
    onSyncScript(formatted, finalScript, note);
    setLastSyncBadge(note);
  };

  // Map each 1-based code line to the segments that reference it via `type` or `focus`
  const lineToSegmentsMap = useMemo(() => {
    const map = new Map<
      number,
      { segIndex: number; segment: ScriptSegment; role: 'type' | 'focus' }[]
    >();
    if (!script) return map;

    for (let i = 1; i <= script.code.length; i++) {
      map.set(i, []);
    }

    script.segments.forEach((seg, segIndex) => {
      const tRange = seg.type;
      const fRange = seg.focus;
      for (let lineNum = 1; lineNum <= script.code.length; lineNum++) {
        const inType = tRange && lineNum >= tRange[0] && lineNum <= tRange[1];
        const inFocus = fRange && lineNum >= fRange[0] && lineNum <= fRange[1];
        if (inType) {
          map.get(lineNum)?.push({ segIndex, segment: seg, role: 'type' });
        } else if (inFocus) {
          map.get(lineNum)?.push({ segIndex, segment: seg, role: 'focus' });
        }
      }
    });

    return map;
  }, [script]);

  // Extract candidate tokens from a code line so the user can click a token to set `mark`
  const getTokensForLine = (lineText: string): string[] => {
    if (!lineText) return [];
    const matches = lineText.match(/[A-Za-zÀ-ÿ0-9_.$]{2,}/g) || [];
    return Array.from(new Set(matches)).slice(0, 10);
  };

  // Handlers for modifying code lines and segments with automatic JSON synchronization
  const handleUpdateCodeLine = (lineNumber1Based: number, newLineText: string) => {
    if (!script) return;
    const idx = lineNumber1Based - 1;
    if (idx < 0 || idx >= script.code.length) return;

    const oldLineText = script.code[idx];
    const nextCode = [...script.code];
    nextCode[idx] = newLineText;

    // If a segment had a `mark` on this line that was edited, keep it valid
    const nextSegments = script.segments.map((seg) => {
      const range = seg.focus || seg.type;
      if (
        seg.mark &&
        range &&
        lineNumber1Based >= range[0] &&
        lineNumber1Based <= range[1] &&
        oldLineText.includes(seg.mark) &&
        !newLineText.includes(seg.mark)
      ) {
        const tokens = getTokensForLine(newLineText);
        return {
          ...seg,
          mark: tokens[0] || undefined,
        };
      }
      return seg;
    });

    triggerAutoSync(
      { ...script, code: nextCode, segments: nextSegments },
      `Linha ${lineNumber1Based} atualizada e sincronizada no JSON`
    );
  };

  const handleInsertLineAfter = (lineNumber1Based: number) => {
    if (!script) return;
    const idx = lineNumber1Based; // 0-based index right after lineNumber1Based
    const nextCode = [
      ...script.code.slice(0, idx),
      '// nova linha de código',
      ...script.code.slice(idx),
    ];

    // Shift segment ranges that appear after the inserted line
    const nextSegments = script.segments.map((seg) => {
      const nextSeg = { ...seg };
      if (nextSeg.type) {
        const [s, e] = nextSeg.type;
        nextSeg.type = [
          s > lineNumber1Based ? s + 1 : s,
          e >= lineNumber1Based ? e + 1 : e,
        ];
      }
      if (nextSeg.focus) {
        const [s, e] = nextSeg.focus;
        nextSeg.focus = [
          s > lineNumber1Based ? s + 1 : s,
          e >= lineNumber1Based ? e + 1 : e,
        ];
      }
      return nextSeg;
    });

    const newTargetLine = lineNumber1Based + 1;
    setSelectedLineNumber(newTargetLine);
    triggerAutoSync(
      { ...script, code: nextCode, segments: nextSegments },
      `Nova linha ${newTargetLine} inserida e intervalos reindexados`
    );
  };

  const handleDeleteCodeLine = (lineNumber1Based: number) => {
    if (!script || script.code.length <= 1) return;
    const idx = lineNumber1Based - 1;
    const nextCode = script.code.filter((_, i) => i !== idx);
    const maxLine = Math.max(1, nextCode.length);

    const nextSegments = script.segments.map((seg) => {
      const nextSeg = { ...seg };
      if (nextSeg.type) {
        const [s, e] = nextSeg.type;
        const ns = Math.min(maxLine, Math.max(1, s > lineNumber1Based ? s - 1 : s));
        const ne = Math.min(maxLine, Math.max(ns, e >= lineNumber1Based ? e - 1 : e));
        nextSeg.type = [ns, ne];
      }
      if (nextSeg.focus) {
        const [s, e] = nextSeg.focus;
        const ns = Math.min(maxLine, Math.max(1, s > lineNumber1Based ? s - 1 : s));
        const ne = Math.min(maxLine, Math.max(ns, e >= lineNumber1Based ? e - 1 : e));
        nextSeg.focus = [ns, ne];
      }
      return nextSeg;
    });

    setSelectedLineNumber(Math.min(lineNumber1Based, maxLine));
    triggerAutoSync(
      { ...script, code: nextCode, segments: nextSegments },
      `Linha ${lineNumber1Based} removida e JSON reindexado`
    );
  };

  const handleUpdateSegment = (segIdx: number, patch: Partial<ScriptSegment>) => {
    if (!script || segIdx < 0 || segIdx >= script.segments.length) return;
    const nextSegments = script.segments.map((s, i) => (i === segIdx ? { ...s, ...patch } : s));
    triggerAutoSync(
      { ...script, segments: nextSegments },
      `Trecho #${segIdx + 1} do roteiro sincronizado no JSON`
    );
  };

  const handleCreateSegmentForLine = (lineNumber1Based: number) => {
    if (!script) return;
    const lineText = script.code[lineNumber1Based - 1] || '';
    const tokens = getTokensForLine(lineText);
    const newSeg: ScriptSegment = {
      say: `Explicação da linha ${lineNumber1Based}: ${lineText.trim() || 'execução deste passo.'}`,
      type: [lineNumber1Based, lineNumber1Based],
      focus: [lineNumber1Based, lineNumber1Based],
      ...(tokens[0] ? { mark: tokens[0] } : {}),
    };

    const nextSegments = [...script.segments, newSeg];
    setSelectedSegmentIndex(nextSegments.length - 1);
    triggerAutoSync(
      { ...script, segments: nextSegments },
      `Novo trecho criado para a linha ${lineNumber1Based}`
    );
  };

  // Detect what a clicked line in formatted JSON corresponds to (code[i] or segments[k])
  const jsonLinesWithContext = useMemo(
    () => parseJsonLinesWithContext(jsonText),
    [jsonText]
  );

  if (!script) {
    return (
      <div className="flex flex-col gap-2">
        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200">
          O JSON atual possui um erro de sintaxe ({parsedState.error}). Corrija no editor abaixo ou clique em Auto-corrigir:
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => onChangeRawJson(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full bg-[#141417]/90 text-zinc-300 font-mono text-xs leading-relaxed p-3 rounded-xl border border-white/10 focus:outline-none focus:border-white/25 resize-y"
        />
      </div>
    );
  }

  const hasCodeLines = script.code.length > 0;
  const activeCodeLine = Math.min(Math.max(1, selectedLineNumber), Math.max(1, script.code.length));
  const linkedSegmentsForActiveLine = lineToSegmentsMap.get(activeCodeLine) || [];
  const activeCodeLineText = script.code[activeCodeLine - 1] ?? '';
  const activeLineTokens = getTokensForLine(activeCodeLineText);

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#18181c]/80 p-2 rounded-xl border border-white/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditorTab('quick-lines')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              editorTab === 'quick-lines'
                ? 'bg-white/[0.1] border-white/20 text-zinc-200'
                : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-zinc-300" />
            <span>Edição Rápida (Clicar na Linha)</span>
          </button>

          <button
            type="button"
            onClick={() => setEditorTab('clickable-json')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              editorTab === 'clickable-json'
                ? 'bg-white/[0.1] border-white/20 text-zinc-200'
                : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-zinc-300" />
            <span>JSON Interativo (Linha a Linha)</span>
          </button>

          <button
            type="button"
            onClick={() => setEditorTab('raw-json')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              editorTab === 'raw-json'
                ? 'bg-white/[0.1] border-white/20 text-zinc-200'
                : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON Texto Puro</span>
          </button>
        </div>

        {lastSyncBadge && (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300 font-medium px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/15">
            <Check className="w-3 h-3" />
            <span>{lastSyncBadge}</span>
          </span>
        )}
      </div>

      {/* TAB 1: QUICK EDIT BY CLICKING CODE LINE OR SEGMENT */}
      {editorTab === 'quick-lines' && (
        <div className="flex flex-col gap-3">
          {/* Quick Title & File Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium shrink-0">Título:</span>
              <input
                type="text"
                value={script.title}
                onChange={(e) =>
                  triggerAutoSync({ ...script, title: e.target.value }, 'Título sincronizado')
                }
                className="flex-1 bg-[#141417]/80 border border-white/10 rounded-lg px-2.5 py-1 text-zinc-300 focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium shrink-0">Arquivo:</span>
              <input
                type="text"
                value={script.file}
                onChange={(e) =>
                  triggerAutoSync({ ...script, file: e.target.value }, 'Arquivo sincronizado')
                }
                className="flex-1 bg-[#141417]/80 border border-white/10 rounded-lg px-2.5 py-1 font-mono text-zinc-300 focus:outline-none focus:border-white/25"
              />
            </div>
          </div>

          {hasCodeLines ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Left Column: Clickable Code Lines */}
              <div className="lg:col-span-6 bg-[#18181c]/80 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-zinc-300" />
                    Clique em uma linha do código para editar:
                  </span>
                  <span className="text-zinc-400 font-mono">{script.code.length} linhas</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06] font-mono text-xs">
                  {script.code.map((lineText, idx) => {
                    const lineNum = idx + 1;
                    const isSelected = lineNum === activeCodeLine;
                    const linked = lineToSegmentsMap.get(lineNum) || [];

                    return (
                      <button
                        key={lineNum}
                        type="button"
                        onClick={() => {
                          setSelectedLineNumber(lineNum);
                          if (linked.length > 0) {
                            setSelectedSegmentIndex(linked[0].segIndex);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.08] border-l-2 border-l-zinc-300 text-zinc-200'
                            : 'hover:bg-white/[0.04] text-zinc-300'
                        }`}
                      >
                        <span
                          className={`w-6 text-right shrink-0 select-none font-bold ${
                            isSelected ? 'text-zinc-200' : 'text-zinc-500'
                          }`}
                        >
                          {lineNum}
                        </span>
                        <span className="flex-1 break-all whitespace-pre-wrap">
                          {lineText ? (
                            tokenizeLine(lineText).map((tk, tIdx) => {
                              const color =
                                syntaxColors && tk.cls !== 'ws'
                                  ? syntaxColors[tk.cls as keyof SyntaxColors]
                                  : undefined;
                              return (
                                <span
                                  key={tIdx}
                                  style={color ? { color } : undefined}
                                  className={tk.cls === 'cm' ? 'italic opacity-80' : undefined}
                                >
                                  {tk.text}
                                </span>
                              );
                            })
                          ) : (
                            ' '
                          )}
                        </span>
                        {linked.length > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/15 text-[10px] text-zinc-300 font-sans">
                            #{linked[0].segIndex + 1}
                            {linked.length > 1 ? ` +${linked.length - 1}` : ''}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Instant Editor for the Clicked Line + Linked Script Segment(s) */}
              <div className="lg:col-span-6 bg-[#18181c]/80 border border-white/15 rounded-xl p-3.5 flex flex-col gap-3">
                {/* 1. Code Line Content Editor */}
                <div className="flex flex-col gap-1.5 pb-3 border-b border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-zinc-300" />
                      Editando Linha {activeCodeLine} do Código
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleInsertLineAfter(activeCodeLine)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] text-zinc-300 cursor-pointer"
                        title="Inserir nova linha logo abaixo e reindexar o JSON"
                      >
                        <Plus className="w-3 h-3 text-zinc-300" />
                        <span>+ Linha abaixo</span>
                      </button>
                      {script.code.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCodeLine(activeCodeLine)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 text-[10px] text-zinc-300 hover:text-rose-300 cursor-pointer"
                          title="Remover esta linha e reindexar o JSON automaticamente"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={activeCodeLineText}
                    onChange={(e) => handleUpdateCodeLine(activeCodeLine, e.target.value)}
                    placeholder="Digite o código desta linha..."
                    className="w-full bg-[#141417]/80 border border-white/15 focus:border-white/30 rounded-lg px-3 py-2 font-mono text-xs text-zinc-200 focus:outline-none"
                  />
                </div>

                {/* 2. Linked Script Segments for this Code Line */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <MessageSquareText className="w-3.5 h-3.5 text-zinc-300" />
                      Roteiro associado à Linha {activeCodeLine}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCreateSegmentForLine(activeCodeLine)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-300 text-[10px] font-semibold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Novo Trecho nesta Linha</span>
                    </button>
                  </div>

                  {linkedSegmentsForActiveLine.length === 0 ? (
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 text-xs text-zinc-400 flex flex-col gap-2">
                      <span>
                        Nenhum trecho do roteiro aponta diretamente para a linha {activeCodeLine}.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCreateSegmentForLine(activeCodeLine)}
                        className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-zinc-200 font-semibold text-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Criar Explicação para a Linha {activeCodeLine}</span>
                      </button>
                    </div>
                  ) : (
                    linkedSegmentsForActiveLine.map(({ segIndex, segment, role }) => (
                      <div
                        key={segIndex}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-zinc-300">
                            Trecho #{segIndex + 1} ({role === 'type' ? 'Digita linha' : 'Foca linha'})
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                            <span>Linhas:</span>
                            <input
                              type="number"
                              min={1}
                              max={script.code.length}
                              value={(segment.type || segment.focus)?.[0] ?? activeCodeLine}
                              onChange={(e) => {
                                const start = Math.max(1, Number(e.target.value) || 1);
                                const end = Math.max(
                                  start,
                                  (segment.type || segment.focus)?.[1] ?? start
                                );
                                handleUpdateSegment(segIndex, {
                                  ...(segment.type ? { type: [start, end] } : {}),
                                  focus: [start, end],
                                });
                              }}
                              className="w-12 bg-[#141417]/80 border border-white/15 rounded px-1.5 py-0.5 text-center text-zinc-200"
                            />
                            <span>até</span>
                            <input
                              type="number"
                              min={1}
                              max={script.code.length}
                              value={(segment.type || segment.focus)?.[1] ?? activeCodeLine}
                              onChange={(e) => {
                                const start = (segment.type || segment.focus)?.[0] ?? activeCodeLine;
                                const end = Math.max(start, Number(e.target.value) || start);
                                handleUpdateSegment(segIndex, {
                                  ...(segment.type ? { type: [start, end] } : {}),
                                  focus: [start, end],
                                });
                              }}
                              className="w-12 bg-[#141417]/80 border border-white/15 rounded px-1.5 py-0.5 text-center text-zinc-200"
                            />
                          </div>
                        </div>

                        {/* Narration (say) */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] text-zinc-400 font-medium">
                            Fala da Narração (say):
                          </label>
                          <textarea
                            value={segment.say}
                            onChange={(e) =>
                              handleUpdateSegment(segIndex, { say: e.target.value })
                            }
                            rows={3}
                            className="w-full bg-[#141417]/80 border border-white/10 focus:border-white/25 rounded-lg p-2 text-xs text-zinc-300 leading-relaxed focus:outline-none"
                          />
                        </div>

                        {/* Highlighted Token (mark) with clickable suggestions from the clicked line */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                            <Highlighter className="w-3 h-3 text-zinc-300" />
                            Termo destacado no código (mark):
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={segment.mark || ''}
                              onChange={(e) =>
                                handleUpdateSegment(segIndex, {
                                  mark: e.target.value || undefined,
                                })
                              }
                              placeholder="Opcional: palavra destacada na linha..."
                              className="flex-1 bg-[#141417]/80 border border-white/10 focus:border-white/25 rounded-lg px-2.5 py-1 font-mono text-xs text-zinc-300 focus:outline-none"
                            />
                          </div>
                          {activeLineTokens.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              <span className="text-[10px] text-zinc-500">
                                Clique para destacar:
                              </span>
                              {activeLineTokens.map((tok) => (
                                <button
                                  key={tok}
                                  type="button"
                                  onClick={() => handleUpdateSegment(segIndex, { mark: tok })}
                                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] border cursor-pointer transition-colors ${
                                    segment.mark === tok
                                      ? 'bg-white/[0.14] border-white/30 text-zinc-200 font-bold'
                                      : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 border-white/10'
                                  }`}
                                >
                                  {tok}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Terminal Output (output) */}
                        <div className="flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                          <input
                            type="text"
                            value={segment.output ?? ''}
                            onChange={(e) =>
                              handleUpdateSegment(segIndex, {
                                output: e.target.value ? e.target.value : undefined,
                              })
                            }
                            placeholder="Saída no console (opcional)..."
                            className="flex-1 bg-[#141417]/80 border border-white/10 focus:border-white/25 rounded-lg px-2.5 py-1 font-mono text-xs text-zinc-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* All Script Segments Quick List (works for both Code and Conceptual modes) */}
          <div className="bg-[#18181c]/80 border border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-300" />
                Todos os Trechos do Roteiro (Clique em um trecho para editar narração e cena):
              </span>
              <span className="text-zinc-400">{script.segments.length} trechos</span>
            </div>

            <div className="divide-y divide-white/[0.06] max-h-80 overflow-y-auto">
              {script.segments.map((seg, idx) => {
                const isOpen = selectedSegmentIndex === idx;
                return (
                  <div key={idx} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSegmentIndex(isOpen ? -1 : idx);
                        const targetLine = (seg.type || seg.focus)?.[0];
                        if (targetLine) setSelectedLineNumber(targetLine);
                      }}
                      className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isOpen ? 'bg-white/[0.07] text-zinc-200' : 'hover:bg-white/[0.03] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        )}
                        <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 font-mono text-[10px] text-zinc-300 shrink-0">
                          #{idx + 1}
                        </span>
                        {(seg.type || seg.focus) && (
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 font-mono text-[10px] text-zinc-300 shrink-0">
                            L{(seg.type || seg.focus)![0]}–{(seg.type || seg.focus)![1]}
                          </span>
                        )}
                        {seg.scene && (
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] text-zinc-300 shrink-0">
                            Cena: {seg.scene.title || 'Visual'}
                          </span>
                        )}
                        <span className="text-xs truncate">{seg.say}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-3.5 bg-[#141417]/80 border-t border-white/10 flex flex-col gap-2.5 text-xs">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] text-zinc-400 font-medium">
                            Narração do Trecho #{idx + 1} (say):
                          </label>
                          <textarea
                            value={seg.say}
                            onChange={(e) => handleUpdateSegment(idx, { say: e.target.value })}
                            rows={2}
                            className="w-full bg-[#18181c]/90 border border-white/10 focus:border-white/25 rounded-lg p-2 text-zinc-300 focus:outline-none"
                          />
                        </div>

                        {seg.scene && (
                          <div className="flex flex-col gap-2 pt-1">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] text-zinc-400">
                                Título da Cena Visual (scene.title):
                              </label>
                              <input
                                type="text"
                                value={seg.scene.title || ''}
                                onChange={(e) =>
                                  handleUpdateSegment(idx, {
                                    scene: { ...seg.scene!, title: e.target.value },
                                  })
                                }
                                className="bg-[#18181c]/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-white/25"
                              />
                            </div>

                            {seg.scene.nodes && seg.scene.nodes.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] text-zinc-400">
                                  Elementos da Cena (Rótulo, Subtítulo e Palavra-gatilho &quot;on&quot;):
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {seg.scene.nodes.map((node, nIdx) => (
                                    <div
                                      key={node.id || nIdx}
                                      className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex flex-col gap-1"
                                    >
                                      <input
                                        type="text"
                                        value={node.label}
                                        onChange={(e) => {
                                          const nextNodes = seg.scene!.nodes.map((n, i) =>
                                            i === nIdx ? { ...n, label: e.target.value } : n
                                          );
                                          handleUpdateSegment(idx, {
                                            scene: { ...seg.scene!, nodes: nextNodes },
                                          });
                                        }}
                                        placeholder="Título do elemento"
                                        className="bg-[#18181c]/90 border border-white/10 rounded px-2 py-1 text-[11px] font-semibold text-zinc-200 focus:outline-none focus:border-white/25"
                                      />
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={node.sub || ''}
                                          onChange={(e) => {
                                            const nextNodes = seg.scene!.nodes.map((n, i) =>
                                              i === nIdx
                                                ? { ...n, sub: e.target.value || undefined }
                                                : n
                                            );
                                            handleUpdateSegment(idx, {
                                              scene: { ...seg.scene!, nodes: nextNodes },
                                            });
                                          }}
                                          placeholder="Subtítulo"
                                          className="flex-1 bg-[#18181c]/90 border border-white/10 rounded px-2 py-0.5 text-[10px] text-zinc-300 focus:outline-none focus:border-white/25"
                                        />
                                        <input
                                          type="text"
                                          value={node.on || ''}
                                          onChange={(e) => {
                                            const nextNodes = seg.scene!.nodes.map((n, i) =>
                                              i === nIdx
                                                ? { ...n, on: e.target.value || undefined }
                                                : n
                                            );
                                            handleUpdateSegment(idx, {
                                              scene: { ...seg.scene!, nodes: nextNodes },
                                            });
                                          }}
                                          placeholder="Gatilho (on)"
                                          title="Palavra falada que revela este nó"
                                          className="w-24 bg-[#18181c]/90 border border-white/10 rounded px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 focus:outline-none focus:border-white/25"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLICKABLE JSON LINES VIEW (Click any line of JSON to open it in Quick Edit) */}
      {editorTab === 'clickable-json' && (
        <div className="bg-[#18181c]/80 border border-white/10 rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              Clique em qualquer linha de código ou trecho do JSON abaixo para abrir na Edição Rápida:
            </span>
            <span className="font-mono text-zinc-400">{jsonLinesWithContext.length} linhas JSON</span>
          </div>
          <div className="max-h-80 overflow-y-auto font-mono text-xs divide-y divide-white/[0.05]">
            {jsonLinesWithContext.map((item) => {
              const isInteractive =
                item.kind === 'code-line' || item.kind === 'segment-line';
              return (
                <div
                  key={item.lineNo}
                  onClick={() => {
                    if (item.kind === 'code-line' && item.codeLineNumber) {
                      setSelectedLineNumber(item.codeLineNumber);
                      setEditorTab('quick-lines');
                    } else if (
                      item.kind === 'segment-line' &&
                      typeof item.segmentIndex === 'number'
                    ) {
                      setSelectedSegmentIndex(item.segmentIndex);
                      const seg = script.segments[item.segmentIndex];
                      const targetLine = (seg?.type || seg?.focus)?.[0];
                      if (targetLine) setSelectedLineNumber(targetLine);
                      setEditorTab('quick-lines');
                    }
                  }}
                  className={`px-3 py-1 flex items-center gap-3 ${
                    isInteractive
                      ? 'hover:bg-white/[0.06] cursor-pointer text-zinc-300'
                      : 'text-zinc-500'
                  }`}
                >
                  <span className="w-7 text-right text-[10px] text-zinc-600 select-none shrink-0">
                    {item.lineNo}
                  </span>
                  <span className="flex-1 whitespace-pre overflow-x-auto">{item.text}</span>
                  {item.kind === 'code-line' && (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-zinc-300 text-[10px] shrink-0">
                      Editar Linha #{item.codeLineNumber}
                    </span>
                  )}
                  {item.kind === 'segment-line' && (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-zinc-300 text-[10px] shrink-0">
                      Editar Trecho #{(item.segmentIndex ?? 0) + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RAW JSON TEXTAREA */}
      {editorTab === 'raw-json' && (
        <textarea
          value={jsonText}
          onChange={(e) => onChangeRawJson(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full bg-[#141417]/90 text-zinc-300 font-mono text-xs leading-relaxed p-3 rounded-xl border border-white/10 focus:outline-none focus:border-white/25 resize-y"
        />
      )}
    </div>
  );
}
