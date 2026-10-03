'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, BookOpen, Sparkles, ChevronDown, Copy, Check, Terminal } from 'lucide-react';
import { SecurityAuditRuleItem } from '@/lib/securityAuditRules';

interface SecurityRuleContextCardProps {
  rule: SecurityAuditRuleItem;
  className?: string;
  defaultExpanded?: boolean;
}

export function SecurityRuleContextCard({
  rule,
  className = '',
  defaultExpanded = true,
}: SecurityRuleContextCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(rule.promptParaIA);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // ignore
    }
  };

  const isCritico = rule.severity === 'CRÍTICO';
  const isAlto = rule.severity === 'ALTO';

  const severityBadgeClass = isCritico
    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
    : isAlto
    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
    : 'bg-sky-500/15 border-sky-500/30 text-sky-300';

  const penaltyText =
    rule.points < 0 ? `${rule.points} pts na auditoria` : 'Matriz de pontuação';

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-[#141419]/90 to-[#0e0e13]/95 backdrop-blur-xl overflow-hidden shadow-2xl transition-all ${className}`}
    >
      {/* Header Banner */}
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0 text-sky-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-sky-300">
                Auditoria de Segurança para Vibe Coding
              </span>
              <span className="text-zinc-500 text-[10px]">· Pág. {rule.page}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 truncate">
              Regra {rule.ruleCode} · {rule.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${severityBadgeClass}`}
          >
            {isCritico ? (
              <ShieldAlert className="w-3.5 h-3.5" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{rule.severity}</span>
            <span className="opacity-75 font-mono text-[10px]">({penaltyText})</span>
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title={isExpanded ? 'Recolher detalhes da regra' : 'Expandir detalhes da regra'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Body */}
      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed animate-fade-in">
          {/* 1. Context of the Book & What this rule is */}
          <div className="p-3.5 rounded-xl bg-sky-500/[0.06] border border-sky-500/20 text-sky-200/90 flex items-start gap-3">
            <Sparkles className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sky-300 text-xs sm:text-sm">
                O que são as 36 Regras da Auditoria de Código?
              </p>
              <p className="text-[12px] sm:text-[13px] text-zinc-300 leading-relaxed">
                No livro <em>&ldquo;Auditoria de Segurança para Vibe Coding&rdquo;</em> (de Saíde Omar Saíde), o autor estrutura 36 verificações práticas para auditar aplicações criadas com auxílio de Inteligência Artificial. O código gerado por IA frequentemente <strong>&ldquo;parece funcionar&rdquo;</strong> nos testes manuais, mas esconde armadilhas silenciosas que quebram sob ataque em produção.
              </p>
            </div>
          </div>

          {/* 2. What this specific rule is about */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Do que se trata a Regra {rule.ruleCode}?
              </span>
              <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed">
                {rule.summary}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/[0.04] border border-rose-500/20 space-y-1.5">
              <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">
                Consequência da Falha (Risco Real)
              </span>
              <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed">
                {rule.consequence}
              </p>
            </div>
          </div>

          {/* 3. Vibe Coding Prompt Box */}
          <div className="p-3.5 rounded-xl bg-[#090b10] border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Pede à IA (Comando Oficial do Livro)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Prompt</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-xs text-amber-200/90 bg-white/[0.03] p-2.5 rounded-lg border border-white/5 select-all">
              {rule.promptParaIA}
            </p>
          </div>

          <p className="text-[11px] text-zinc-500 italic">
            💡 Dica para o vídeo: Antes de iniciar a execução do código no reprodutor abaixo, compreenda o princípio acima para acompanhar a investigação técnica passo a passo.
          </p>
        </div>
      )}
    </div>
  );
}
