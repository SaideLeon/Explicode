import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_6_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-r22',
    ruleCode: 'R22',
    section: 'Boas Práticas de Desenvolvimento',
    sectionNumber: 6,
    title: 'Defesa em profundidade',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Cada camada (front-end, API, BD) deve ser independentemente segura. A falha numa camada não deve comprometer as restantes.',
    consequence: 'Se o front-end for contornado, a API e o banco de dados não podem cair juntos sem proteções próprias.',
    promptParaIA: 'Revê o código à luz da regra R22 e garante: Cada camada (front-end, API, BD) deve ser independentemente segura. A falha numa camada não deve comprometer as restantes.',
    page: 33,
    script: {
      title: 'R22 · Defesa em profundidade',
      file: 'defense-in-depth.ts',
      lang: 'pt-BR',
      code: [
        '// ✅ Regra R22: 3 camadas independentes de validação e proteção',
        '// Camada 1: Front-end (Zod + UX responsiva)',
        '// Camada 2: API Gateway / Next.js Route (Validação server-side e Auth)',
        '// Camada 3: Banco de Dados (Constraints, Foreign Keys, RLS e Check)',
        'export const checkBalanceConstraint = `',
        '  ALTER TABLE contas ADD CONSTRAINT saldo_positivo CHECK (saldo >= 0);',
        '`;'
      ],
      segments: [
        {
          say: 'Regra R22. Defesa em profundidade significa que a falha de uma camada nunca deve deixar as demais desprotegidas.',
          type: [1, 4],
          focus: [1, 4],
          mark: 'Camada'
        },
        {
          say: 'Mesmo se a API tiver um bug, restrições no banco como check de saldo maior ou igual a zero impedem saldo negativo.',
          type: [5, 7],
          focus: [5, 7],
          mark: 'CHECK'
        }
      ]
    }
  },
  {
    id: 'audit-r23',
    ruleCode: 'R23',
    section: 'Boas Práticas de Desenvolvimento',
    sectionNumber: 6,
    title: 'Testes de segurança automatizados',
    severity: 'ALTO',
    points: -10,
    summary: 'Os testes devem cobrir: acesso não autorizado, race condition, inputs maliciosos e bypass de autorização.',
    consequence: 'Regressões de segurança passam despercebidas para produção sem uma suíte automatizada de testes.',
    promptParaIA: 'Revê o código à luz da regra R23 e garante: Os testes devem cobrir: acesso não autorizado, race condition, inputs maliciosos e bypass de autorização.',
    page: 34,
    script: {
      title: 'R23 · Testes de segurança automatizados',
      file: 'security.test.ts',
      lang: 'pt-BR',
      code: [
        'import { test, expect } from "vitest";',
        '',
        '// ✅ Regra R23: Testes automatizados para cenários de ataque e bypass',
        'test("rejeita requisições sem token de sessão", async () => {',
        '  const res = await app.inject({ method: "GET", url: "/api/carteira" });',
        '  expect(res.statusCode).toBe(401);',
        '});',
        '',
        'test("impede IDOR ao tentar acessar dados de outro usuário", async () => {',
        '  const res = await app.inject({ method: "GET", url: "/api/doc/456", headers: { user: "123" } });',
        '  expect(res.statusCode).toBe(403);',
        '});'
      ],
      segments: [
        {
          say: 'Regra R23. Escreva testes automatizados focados especificamente em tentar burlar as regras de acesso do sistema.',
          type: [1, 7],
          focus: [4, 7],
          mark: '401'
        },
        {
          say: 'Testes para IDOR, payloads maliciosos e autenticação garantem que novos deploys não abram brechas antigas.',
          type: [9, 13],
          focus: [9, 12],
          mark: '403'
        }
      ]
    }
  },
  {
    id: 'audit-r24',
    ruleCode: 'R24',
    section: 'Boas Práticas de Desenvolvimento',
    sectionNumber: 6,
    title: 'Segurança no prompt (projetos de IA)',
    severity: 'ALTO',
    points: -10,
    summary: 'Os requisitos de segurança devem estar no prompt inicial. Segurança adicionada depois é sempre menos eficaz.',
    consequence: 'Pedir segurança só no final gera refatorações incompletas onde modelos mantêm padrões inseguros.',
    promptParaIA: 'Revê o código à luz da regra R24 e garante: Os requisitos de segurança devem estar no prompt inicial. Segurança adicionada depois é sempre menos eficaz.',
    page: 35,
    script: {
      title: 'R24 · Segurança no prompt (Vibe Coding)',
      file: 'vibe-prompt.md',
      lang: 'pt-BR',
      code: [
        '# ✅ Regra R24: Segurança como requisito arquitetural desde o primeiro prompt',
        '## Contexto para a IA:',
        '- Autenticação: Argon2id ou bcrypt.',
        '- Validação: Zod em todas as rotas server-side.',
        '- Acesso: RLS ativo no Supabase e checagem de IDOR.',
        '- Sanitização: Proibido concatenar queries SQL e innerHTML sem DOMPurify.'
      ],
      segments: [
        {
          say: 'Regra R24. Ao programar com inteligência artificial, exija os requisitos de segurança no prompt de partida.',
          type: [1, 3],
          focus: [1, 3],
          mark: 'Argon2id'
        },
        {
          say: 'Adicionar segurança depois que a base está pronta gera retrabalho e furos arquiteturais.',
          type: [4, 7],
          focus: [4, 7],
          mark: 'Zod'
        }
      ]
    }
  },
  {
    id: 'audit-r25',
    ruleCode: 'R25',
    section: 'Boas Práticas de Desenvolvimento',
    sectionNumber: 6,
    title: 'IA como atacante',
    severity: 'MÉDIO',
    points: -5,
    summary: 'Usar a própria IA para tentar comprometer o sistema durante o desenvolvimento resolve cerca de 80% das vulnerabilidades comuns.',
    consequence: 'Não submeter o código a um pentest simulado por IA deixa falhas óbvias expostas.',
    promptParaIA: 'Revê o código à luz da regra R25 e garante: Usar a própria IA para tentar comprometer o sistema durante o desenvolvimento resolve cerca de 80% das vulnerabilidades comuns.',
    page: 36,
    script: {
      title: 'R25 · IA como atacante (Red Teaming)',
      file: 'ai-redteam-prompt.md',
      lang: 'pt-BR',
      code: [
        '# ✅ Regra R25: Prompt de Auditoria Ofensiva (Red Teaming)',
        'Atue como um especialista sênior em segurança ofensiva e pentest.',
        'Analise o código deste endpoint e tente encontrar:',
        '1. Vetores de SQL Injection e XSS.',
        '2. Bypass de autenticação e falhas de IDOR.',
        '3. Race conditions em transações e ausência de rate limit.'
      ],
      segments: [
        {
          say: 'Regra R25. Peça para a IA assumir o papel de atacante antes de enviar o código para produção.',
          type: [1, 3],
          focus: [2, 3],
          mark: 'pentest'
        },
        {
          say: 'Essa auditoria rápida antecipa a grande maioria das falhas que seriam exploradas na internet.',
          type: [4, 6],
          focus: [4, 6],
          mark: 'IDOR'
        }
      ]
    }
  }
];
