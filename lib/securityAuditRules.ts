import { CodeScript, ChatVideoMessage } from '@/types/script';
import { SECTION_1_RULES } from './rules/section1_auth';
import { SECTION_2_RULES } from './rules/section2_rate';
import { SECTION_3_RULES } from './rules/section3_val';
import { SECTION_4_RULES } from './rules/section4_access';
import { SECTION_5_RULES } from './rules/section5_logic';
import { SECTION_6_RULES } from './rules/section6_practices';
import { SECTION_7_RULES } from './rules/section7_ctf_auth';
import { SECTION_8_RULES } from './rules/section8_ctf_game';
import { SECTION_9_RULES } from './rules/section9_ctf_rate';
import { SECTION_10_RULES } from './rules/section10_ctf_access';
import { SECTION_11_RULES } from './rules/section11_score';

export interface SecurityAuditRuleItem {
  id: string;
  ruleCode: string;
  section: string;
  sectionNumber: number;
  title: string;
  severity: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'PONTUAÇÃO';
  points: number; // -25, -10, -5
  summary: string;
  consequence: string;
  promptParaIA: string;
  page: number;
  script: CodeScript;
}

export const ALL_SECURITY_RULES: SecurityAuditRuleItem[] = [
  ...SECTION_1_RULES,
  ...SECTION_2_RULES,
  ...SECTION_3_RULES,
  ...SECTION_4_RULES,
  ...SECTION_5_RULES,
  ...SECTION_6_RULES,
  ...SECTION_7_RULES,
  ...SECTION_8_RULES,
  ...SECTION_9_RULES,
  ...SECTION_10_RULES,
  ...SECTION_11_RULES,
];

/**
 * Transforms all 37 rules into Soara native video sessions
 */
export function buildSecurityAuditNativeSessions(): ChatVideoMessage[] {
  return ALL_SECURITY_RULES.map((rule) => {
    const sevBadge =
      rule.severity === 'CRÍTICO'
        ? '🛑 CRÍTICO (-25 pts)'
        : rule.severity === 'ALTO'
        ? '⚠️ ALTO (-10 pts)'
        : rule.severity === 'MÉDIO'
        ? 'ℹ️ MÉDIO (-5 pts)'
        : '📊 PONTUAÇÃO';

    return {
      id: `msg-audit-${rule.ruleCode.toLowerCase()}`,
      userPrompt: `Auditoria Vibe Coding [${rule.ruleCode}] ${rule.title} · ${sevBadge} — ${rule.summary}`,
      timestamp: `Pág. ${rule.page}`,
      script: rule.script,
      jsonText: JSON.stringify(rule.script, null, 2),
      isJsonVisible: false,
      isApproved: true,
      modelUsed: `Auditoria de Segurança para Vibe Coding · ${rule.section} (No. ${rule.page - 6 < 10 ? '0' + (rule.page - 6) : rule.page - 6})`,
      isNative: true,
    };
  });
}

export function findSecurityRuleByScript(script: CodeScript): SecurityAuditRuleItem | undefined {
  if (!script?.title) return undefined;
  const t = script.title.toLowerCase();
  return ALL_SECURITY_RULES.find((r) => {
    return (
      t.includes(r.ruleCode.toLowerCase()) ||
      t.includes(r.title.toLowerCase()) ||
      r.script.title.toLowerCase() === t
    );
  });
}

export function findSecurityRuleById(id: string): SecurityAuditRuleItem | undefined {
  if (!id) return undefined;
  return ALL_SECURITY_RULES.find((r) => {
    return r.id === id || `msg-audit-${r.ruleCode.toLowerCase()}` === id;
  });
}

