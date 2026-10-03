import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_11_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-r37-score',
    ruleCode: 'R37',
    section: 'A Pontuação Final',
    sectionNumber: 11,
    title: 'Sistema de Pontuação',
    severity: 'PONTUAÇÃO',
    points: 0,
    summary: 'Como as 36 regras viram uma nota: CRÍTICO (-25 pts · zero permitido), ALTO (-10 pts · aprovação ≥ 70), MÉDIO (-5 pts · aprovação ≥ 85). Um único CRÍTICO chumba o código para produção.',
    consequence: 'A pontuação diz a verdade que o "parece funcionar" esconde.',
    promptParaIA: 'Percorre as 36 regras deste livro uma a uma no meu código e dá-me a pontuação final, com a lista de falhas por severidade.',
    page: 53,
    script: {
      title: 'R37 · Sistema de Pontuação da Auditoria',
      file: 'auditoria-score.ts',
      lang: 'pt-BR',
      code: [
        '// ✅ Regra 37: Matriz de Pontuação da Auditoria de Segurança',
        'export const CRITERIOS_AUDITORIA = {',
        '  CRITICO: { penalidade: -25, maximoPermitido: 0 },',
        '  ALTO:    { penalidade: -10, notaMinimaAprovacao: 70 },',
        '  MEDIO:   { penalidade: -5,  notaMinimaAprovacao: 85 }',
        '};',
        '',
        '// 100: Aprovado com distinção | 85-99: Com ressalvas | <70 ou 1 crítico: Reprovado',
        'export function calcularNotaAuditoria(falhasCriticas: number, falhasAltas: number, falhasMedias: number) {',
        '  if (falhasCriticas > 0) return { nota: 0, status: "REPROVADO POR ITEM CRÍTICO" };',
        '  const total = Math.max(0, 100 - (falhasAltas * 10) - (falhasMedias * 5));',
        '  return { nota: total, status: total >= 70 ? "APROVADO" : "REPROVADO" };',
        '}'
      ],
      segments: [
        {
          say: 'Regra trinta e sete: O Sistema de Pontuação. Cada regra falhada desconta pontos conforme a sua severidade.',
          type: [1, 6],
          focus: [2, 6],
          mark: 'CRITERIOS_AUDITORIA',
          scene: {
            title: 'Tabela de Severidade',
            nodes: [
              { id: 'c1', x: 28, y: 38, icon: '🛑', label: 'CRÍTICO', sub: '-25 pts (0 tol.)', color: 'rose', on: 'severidade' },
              { id: 'c2', x: 80, y: 38, icon: '⚠️', label: 'ALTO', sub: '-10 pts (≥70)', color: 'amber', on: 'falhada' },
              { id: 'c3', x: 132, y: 38, icon: 'ℹ️', label: 'MÉDIO', sub: '-5 pts (≥85)', color: 'blue', on: 'pontos' }
            ],
            arrows: [{ from: 'c1', to: 'c2', label: 'escala', color: 'amber', on: 'conforme' }, { from: 'c2', to: 'c3', label: 'nível', color: 'blue', on: 'regras' }]
          }
        },
        {
          say: 'Um único item crítico chumba o código para produção, mesmo que todo o resto pareça funcionar perfeitamente.',
          type: [8, 13],
          focus: [10, 11],
          mark: 'falhasCriticas'
        },
        {
          say: 'A pontuação final revela a verdade que a ilusão do vibe coding esconde, garantindo software robusto e auditado.',
          type: [12, 13],
          focus: [12, 12],
          mark: 'calcularNotaAuditoria'
        }
      ]
    }
  }
];
