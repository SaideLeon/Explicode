import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_5_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-r19',
    ruleCode: 'R19',
    section: 'Lógica de Negócio',
    sectionNumber: 5,
    title: 'Consistência em transações financeiras',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Operações financeiras exigem transações ACID, para prevenir exploração por compras ou reembolsos simultâneos.',
    consequence: 'Compromisso financeiro total: geração de saldo infinito ou saques duplicados simultâneos.',
    promptParaIA: 'Revê o código à luz da regra R19 e garante: Operações financeiras exigem transações ACID, para prevenir exploração por compras ou reembolsos simultâneos.',
    page: 29,
    script: {
      title: 'R19 · Consistência em transações financeiras (ACID)',
      file: 'transferencia.ts',
      lang: 'pt-BR',
      code: [
        '// ✅ Regra R19: Transação ACID em lote com rollback garantido',
        'export async function transferirFundos(origemId: string, destinoId: string, valor: number) {',
        '  return await db.$transaction(async (tx) => {',
        '    const debito = await tx.conta.updateMany({',
        '      where: { id: origemId, saldo: { gte: valor } },',
        '      data: { saldo: { decrement: valor } }',
        '    });',
        '    if (debito.count === 0) throw new Error("Saldo insuficiente");',
        '    await tx.conta.update({',
        '      where: { id: destinoId },',
        '      data: { saldo: { increment: valor } }',
        '    });',
        '  });',
        '}'
      ],
      segments: [
        {
          say: 'Regra R19. Transações de dinheiro ou créditos exigem propriedades ACID para garantir que o dinheiro saia de um lado e chegue no outro sem duplicidade.',
          type: [1, 3],
          focus: [2, 3],
          mark: '$transaction'
        },
        {
          say: 'Se qualquer etapa falhar no meio do caminho, o banco de dados desfaz tudo com rollback automático.',
          type: [4, 14],
          focus: [8, 12],
          mark: 'decrement'
        }
      ]
    }
  },
  {
    id: 'audit-r20',
    ruleCode: 'R20',
    section: 'Lógica de Negócio',
    sectionNumber: 5,
    title: 'Verificação de pré-condições',
    severity: 'ALTO',
    points: -10,
    summary: 'Fluxos de reembolso, saque e cancelamento devem verificar todas as pré-condições antes de executar.',
    consequence: 'Falha grave de lógica: pedidos cancelados continuam sendo despachados ou saques ocorrem duas vezes.',
    promptParaIA: 'Revê o código à luz da regra R20 e garante: Fluxos de reembolso, saque e cancelamento devem verificar todas as pré-condições antes de executar.',
    page: 30,
    script: {
      title: 'R20 · Verificação de pré-condições',
      file: 'reembolso.ts',
      lang: 'pt-BR',
      code: [
        'export async function processarReembolso(pedidoId: string) {',
        '  const pedido = await db.pedido.findUnique({ where: { id: pedidoId } });',
        '  // ✅ Regra R20: Bloquear se o status não permitir a operação',
        '  if (!pedido || pedido.status !== "pago_pendente_envio") {',
        '    throw new Error("Pré-condição falhou: este pedido não pode ser reembolsado.");',
        '  }',
        '  return await gateway.reembolsar(pedido.gatewayTransactionId);',
        '}'
      ],
      segments: [
        {
          say: 'Regra R20. Nunca processe um reembolso ou saque sem antes validar se o estado atual do pedido realmente permite essa ação.',
          type: [1, 3],
          focus: [2, 3],
          mark: 'pedido'
        },
        {
          say: 'A regra R20 impede que pedidos já entregues ou em disputa sejam estornados de forma indevida.',
          type: [4, 8],
          focus: [4, 6],
          mark: 'status'
        }
      ]
    }
  },
  {
    id: 'audit-r21',
    ruleCode: 'R21',
    section: 'Lógica de Negócio',
    sectionNumber: 5,
    title: 'Deteção automática de fraude',
    severity: 'ALTO',
    points: -10,
    summary: 'Operações de alto risco não podem depender exclusivamente de revisão humana. É preciso implementar regras automáticas.',
    consequence: 'Atrasos humanos abrem janelas para esvaziamento de fundos antes de qualquer intervenção manual.',
    promptParaIA: 'Revê o código à luz da regra R21 e garante: Operações de alto risco não podem depender exclusivamente de revisão humana. É preciso implementar regras automáticas.',
    page: 31,
    script: {
      title: 'R21 · Deteção automática de fraude',
      file: 'antifraude.ts',
      lang: 'pt-BR',
      code: [
        'export async function avaliarRiscoSaque(userId: string, valor: number) {',
        '  const saquesRecentes = await db.saques.count({',
        '    where: { userId, criadoEm: { gte: new Date(Date.now() - 3600000) } }',
        '  });',
        '  // ✅ Regra R21: Bloqueio automático de anomalias',
        '  if (saquesRecentes > 3 || valor > 10000) {',
        '    await alertarSeguranca({ userId, valor, motivo: "Volume incomum" });',
        '    throw new Error("Transação pausada para análise de risco.");',
        '  }',
        '}'
      ],
      segments: [
        {
          say: 'Regra R21. Não dependa apenas de checagem humana em operações críticas de saque e transferência.',
          type: [1, 4],
          focus: [2, 4],
          mark: 'saquesRecentes'
        },
        {
          say: 'Implemente regras automáticas de volume e velocidade para interromper anomalias no primeiro segundo.',
          type: [5, 10],
          focus: [6, 8],
          mark: 'alertarSeguranca'
        }
      ]
    }
  }
];
