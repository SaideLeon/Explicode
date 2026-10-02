'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileCode2,
  Check,
  Copy,
  AlertCircle,
  Wand2,
  RefreshCw,
  Download,
  Upload,
  AlignLeft,
  ChevronDown,
  Sparkles,
  Cpu,
  Wrench,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { CodeScript } from '@/types/script';
import { PRESETS, AI_PROMPT_TEMPLATE } from '@/lib/presets';
import { normalizeAndRepairScript } from '@/lib/validation';
import { QuickJsonEditor } from '@/components/QuickJsonEditor';

interface ScriptEditorProps {
  initialScript: CodeScript;
  onApplyScript: (script: CodeScript) => void;
  statusMessage: string;
}

interface GenerationErrorDetails {
  title: string;
  message: string;
  suggestion: string;
  suggestedModel: string;
  retryAfterSeconds: number;
  apiKeyMask?: string | null;
  apiKeyFirst4?: string | null;
  apiKeyLast5?: string | null;
}

export function ScriptEditor({
  initialScript,
  onApplyScript,
  statusMessage,
}: ScriptEditorProps) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(initialScript, null, 2));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCode, setAiCode] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<GenerationErrorDetails | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear countdown on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(seconds);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Apply JSON text to player with automatic line/mark normalization
  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const result = normalizeAndRepairScript(parsed);
      if (!result.valid) {
        setErrorMessage(result.error);
        return;
      }
      setErrorMessage(null);
      const finalScript = result.repairedScript || parsed;

      // If adjustments were needed, update the text
      if (result.changes && result.changes.length > 0) {
        setJsonText(JSON.stringify(finalScript, null, 2));
        setSuccessNotice(
          `Roteiro aplicado com ajustes automáticos: ${result.changes.slice(0, 2).join('; ')}${
            result.changes.length > 2 ? ` (+ mais ${result.changes.length - 2} ajustes)` : ''
          }`
        );
        setTimeout(() => setSuccessNotice(null), 6000);
      } else {
        setSuccessNotice('Roteiro aplicado com sucesso!');
        setTimeout(() => setSuccessNotice(null), 3000);
      }

      onApplyScript(finalScript);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sintaxe JSON inválida';
      setErrorMessage(`Erro no JSON: ${msg}`);
    }
  };

  // Auto repair lines and marks explicitly
  const handleAutoRepair = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const result = normalizeAndRepairScript(parsed);
      if (!result.valid) {
        setErrorMessage(result.error);
        return;
      }
      setErrorMessage(null);
      const finalScript = result.repairedScript || parsed;
      setJsonText(JSON.stringify(finalScript, null, 2));
      if (result.changes && result.changes.length > 0) {
        setSuccessNotice(`Linhas e termos sincronizados (${result.changes.length} correções automáticas feitas)!`);
      } else {
        setSuccessNotice('O roteiro já está perfeitamente sincronizado com as linhas do código.');
      }
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'JSON inválido';
      setErrorMessage(`Não foi possível auto-corrigir: ${msg}`);
    }
  };

  // Format JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'JSON inválido';
      setErrorMessage(`Não foi possível formatar: ${msg}`);
    }
  };

  // Load a preset
  const handleSelectPreset = (presetId: string) => {
    const found = PRESETS.find((p) => p.id === presetId);
    if (found) {
      const formatted = JSON.stringify(found.script, null, 2);
      setJsonText(formatted);
      setErrorMessage(null);
      onApplyScript(found.script);
    }
  };

  // Copy Prompt
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Copy current script JSON
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Download JSON
  const handleDownloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roteiro-codigo-narrado.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Upload JSON
  const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
        try {
          const parsed = JSON.parse(content);
          const result = normalizeAndRepairScript(parsed);
          if (result.valid && result.repairedScript) {
            setErrorMessage(null);
            onApplyScript(result.repairedScript);
          } else {
            setErrorMessage(result.error);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro ao ler arquivo';
          setErrorMessage(`Arquivo inválido: ${msg}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Generate with Gemini API (supporting selected model + automatic fallback + robust error recovery)
  const handleGenerateWithAi = async (overrideModel?: string) => {
    const modelToUse = overrideModel || selectedModel;

    if (!aiTopic.trim() && !aiCode.trim()) {
      setGenerationError({
        title: 'Entrada vazia',
        message: 'Por favor, informe pelo menos um tema ou trecho de código para a IA criar o roteiro.',
        suggestion: 'Exemplo: "Explique como funciona o algoritmo QuickSort em Python".',
        suggestedModel: modelToUse,
        retryAfterSeconds: 0,
      });
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      let res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          code: aiCode.trim(),
          model: modelToUse,
        }),
      });

      let rawText = await res.text();

      // If the outer proxy returned a plain-text "Rate exceeded." (HTTP 429), wait 1.5s and retry once automatically
      if (rawText.includes('Rate exceeded') || res.status === 429) {
        await new Promise((r) => setTimeout(r, 1500));
        res = await fetch('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: aiTopic.trim(),
            code: aiCode.trim(),
            model: 'gemini-3.1-flash-lite',
          }),
        });
        rawText = await res.text();
      }

      let data: {
        success?: boolean;
        script?: CodeScript;
        modelUsed?: string;
        fallbackTriggered?: boolean;
        error?: string;
        errorType?: string;
        message?: string;
        suggestion?: string;
        suggestedModel?: string;
        retryAfterSeconds?: number;
        apiKeyMask?: string | null;
        apiKeyFirst4?: string | null;
        apiKeyLast5?: string | null;
      } | null = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        data = {
          success: false,
          errorType: 'HIGH_DEMAND',
          error:
            'O limite de requisições por segundo da rede foi atingido momentaneamente ("Rate exceeded").',
          message:
            'O limite de requisições por segundo da rede foi atingido momentaneamente ("Rate exceeded").',
          suggestion:
            'Aguarde 5 segundos e clique em "Tentar novamente agora" para gerar seu roteiro.',
          suggestedModel:
            modelToUse === 'gemini-3.1-flash-lite' ? 'gemini-flash-latest' : 'gemini-3.1-flash-lite',
          retryAfterSeconds: 5,
        };
      }

      if (!res.ok || !data || !data.success || !data.script) {
        // Structured error from API
        const suggested =
          data?.suggestedModel ||
          (modelToUse === 'gemini-3.1-flash-lite' ? 'gemini-flash-latest' : 'gemini-3.1-flash-lite');
        const waitSecs = data?.retryAfterSeconds || 5;

        setGenerationError({
          title:
            data?.errorType === 'PERMISSION_DENIED'
              ? 'Acesso Negado na Chave da API (403)'
              : data?.errorType === 'HIGH_DEMAND'
              ? 'Limite de Requisições Temporário (Rate Limit)'
              : data?.errorType === 'SERVICE_UNAVAILABLE'
              ? 'Serviço Temporariamente Indisponível'
              : 'Falha na Geração do Roteiro',
          message:
            data?.message ||
            data?.error ||
            'Falha ao gerar com a IA. Tente novamente.',
          suggestion:
            data?.suggestion ||
            `Sugerimos tentar com o modelo "${suggested}" ou aguardar alguns segundos antes de repetir.`,
          suggestedModel: suggested,
          retryAfterSeconds: waitSecs,
          apiKeyMask: data?.apiKeyMask || null,
          apiKeyFirst4: data?.apiKeyFirst4 || null,
          apiKeyLast5: data?.apiKeyLast5 || null,
        });

        startCountdown(waitSecs);
        return;
      }

      const generatedScript = data.script;
      const formatted = JSON.stringify(generatedScript, null, 2);
      setJsonText(formatted);
      setErrorMessage(null);
      setGenerationError(null);
      onApplyScript(generatedScript);
      setShowAiModal(false);
      setAiTopic('');
      setAiCode('');

      if (data.fallbackTriggered) {
        setSuccessNotice(
          `Roteiro gerado com sucesso usando modelo alternativo (${data.modelUsed}) devido à alta demanda no modelo selecionado.`
        );
        setTimeout(() => setSuccessNotice(null), 6000);
      } else {
        setSuccessNotice(`Roteiro gerado com sucesso usando ${data.modelUsed}!`);
        setTimeout(() => setSuccessNotice(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na conexão de rede';
      const fallbackTarget = modelToUse === 'gemini-3.1-flash-lite' ? 'gemini-flash-latest' : 'gemini-3.1-flash-lite';
      setGenerationError({
        title: 'Erro de Comunicação com a API',
        message: `${msg}. Não foi possível contatar o serviço de IA.`,
        suggestion: `Verifique sua conexão ou alterne para o modelo "${fallbackTarget}".`,
        suggestedModel: fallbackTarget,
        retryAfterSeconds: 5,
      });
      startCountdown(5);
    } finally {
      setIsGenerating(false);
    }
  };

  // Action: Switch to suggested model and trigger retry immediately
  const handleSwitchModelAndRetry = (newModel: string) => {
    setSelectedModel(newModel);
    handleGenerateWithAi(newModel);
  };

  return (
    <aside className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 backdrop-blur-md">
      {/* Header with Title and Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-amber-400" />
          <h2 className="font-semibold text-sm sm:text-base text-slate-100">
            Editor de Roteiro (JSON)
          </h2>
        </div>

        {/* AI Generator CTA */}
        <button
          type="button"
          onClick={() => {
            setShowAiModal(true);
            setGenerationError(null);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md transition-all cursor-pointer hover:shadow-indigo-500/20"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Criar com IA</span>
        </button>
      </div>

      {/* Preset Selector Dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="preset-select" className="text-xs text-slate-400 font-medium shrink-0">
          Exemplos prontos:
        </label>
        <select
          id="preset-select"
          onChange={(e) => {
            if (e.target.value) handleSelectPreset(e.target.value);
          }}
          defaultValue=""
          className="flex-1 bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer truncate"
        >
          <option value="" disabled>
            Selecione um exemplo...
          </option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Edit & JSON Editor */}
      <div className="relative">
        <QuickJsonEditor
          jsonText={jsonText}
          onChangeRawJson={(val) => setJsonText(val)}
          onSyncScript={(formatted, repairedScript, note) => {
            setJsonText(formatted);
            setErrorMessage(null);
            onApplyScript(repairedScript);
            if (note) {
              setSuccessNotice(note);
            }
          }}
        />
      </div>

      {/* Error notification if invalid */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success notice */}
      {successNotice && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed">
          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Status feedback */}
      {statusMessage && !errorMessage && !successNotice && (
        <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>{statusMessage}</span>
        </p>
      )}

      {/* Editor Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:shadow-amber-400/20 active:scale-95"
        >
          Aplicar Roteiro
        </button>

        <button
          type="button"
          onClick={handleAutoRepair}
          title="Ajusta automaticamente os limites de linha e termos de marcação"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Auto-corrigir</span>
        </button>

        <button
          type="button"
          onClick={handleFormat}
          title="Formatar identação do JSON"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          <AlignLeft className="w-3.5 h-3.5" />
          <span>Formatar</span>
        </button>

        <button
          type="button"
          onClick={handleCopyJson}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedJson ? 'Copiado!' : 'Copiar'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadJson}
          title="Baixar arquivo JSON"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <label
          title="Importar arquivo JSON"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <input type="file" accept=".json" onChange={handleUploadJson} className="sr-only" />
        </label>
      </div>

      {/* Accordion: Prompt para IA */}
      <details className="group border-t border-slate-800 pt-3 text-xs text-slate-300">
        <summary className="flex items-center justify-between font-medium cursor-pointer py-1 hover:text-white select-none">
          <span className="flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            Prompt de Apoio para IA (ChatGPT / Claude / Gemini)
          </span>
          <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Copie este modelo de instrução e envie para qualquer IA para gerar novos roteiros no formato perfeito:
          </p>
          <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
            {AI_PROMPT_TEMPLATE}
          </pre>
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPrompt ? 'Prompt Copiado!' : 'Copiar Prompt para Área de Transferência'}</span>
          </button>
        </div>
      </details>

      {/* AI Generator Modal / Overlay with Robust Error Handling */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-base text-white">
                  Gerador de Roteiro com Gemini
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAiModal(false);
                  setGenerationError(null);
                }}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Descreva o assunto ou cole o código que você quer explicar. O Gemini vai criar um roteiro detalhado (duração mínima de 1 minuto), combinando cenas visuais animadas de teoria, exemplos comparativos (como no modelo de JWT) e explicação linha por linha do código.
            </p>

            {/* Model Selector */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ai-model" className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Modelo Gemini:
                </span>
                <span className="text-[10px] text-amber-400 font-normal">
                  Alterne se houver alta demanda
                </span>
              </label>
              <select
                id="ai-model"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setGenerationError(null);
                }}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="gemini-3.8-flash">
                  Gemini 3.8 Flash (Padrão — Raciocínio rápido)
                </option>
                <option value="gemini-3.1-flash-lite">
                  Gemini 3.1 Flash Lite (Ultrarrápido & Alta Disponibilidade)
                </option>
                <option value="gemini-flash-latest">
                  Gemini Flash Latest (Versão Estável)
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ai-topic" className="text-xs font-medium text-slate-300">
                Tema / Assunto do Vídeo:
              </label>
              <input
                id="ai-topic"
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Ex: Como funciona autenticação JWT com expiração"
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ai-code" className="text-xs font-medium text-slate-300">
                Código de Origem (Opcional):
              </label>
              <textarea
                id="ai-code"
                value={aiCode}
                onChange={(e) => setAiCode(e.target.value)}
                rows={4}
                placeholder="Cole o código aqui se já tiver um (ou deixe vazio para a IA gerar o código ideal)..."
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-indigo-500 resize-y"
              />
            </div>

            {/* Robust Error Message & Recovery Box */}
            {generationError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generationError.title}</span>
                </div>

                <p className="text-slate-300 leading-relaxed text-[12px] break-words">
                  {generationError.message}
                </p>

                {generationError.apiKeyMask && (
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-rose-500/40 font-mono text-[11px] text-amber-300 flex flex-wrap items-center gap-2">
                    <span>
                      🔑 Chave: <strong className="text-white">{generationError.apiKeyMask}</strong>
                    </span>
                    <span>|</span>
                    <span>
                      4 primeiros: <strong className="text-rose-300">{generationError.apiKeyFirst4}</strong>
                    </span>
                    <span>|</span>
                    <span>
                      5 últimos: <strong className="text-rose-300">{generationError.apiKeyLast5}</strong>
                    </span>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <span className="text-amber-400 font-bold">💡 Dica:</span>
                  <span>{generationError.suggestion}</span>
                </div>

                {/* Direct Action Buttons: Switch Model OR Wait & Retry */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {generationError.suggestedModel && generationError.suggestedModel !== selectedModel && (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleSwitchModelAndRetry(generationError.suggestedModel)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white rounded-lg text-xs font-medium border border-amber-500/40 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>
                        Trocar para {generationError.suggestedModel === 'gemini-3.1-flash-lite' ? 'Gemini 3.1 Flash Lite' : generationError.suggestedModel} e tentar
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isGenerating || countdown > 0}
                    onClick={() => handleGenerateWithAi()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {countdown > 0 ? `Aguarde ${countdown}s para tentar...` : 'Tentar novamente agora'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                {isGenerating
                  ? 'Aguarde: gerando roteiro detalhado (1+ min) com cenas visuais...'
                  : 'Gera roteiro detalhado (1+ min), cenas visuais e comparações.'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAiModal(false);
                    setGenerationError(null);
                  }}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateWithAi()}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Conectando ao Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Gerar Roteiro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
