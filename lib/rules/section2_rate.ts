import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_2_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-r06',
    ruleCode: 'R06',
    section: 'Rate Limiting e Abuso',
    sectionNumber: 2,
    title: 'Rate limiting por endpoint',
    severity: 'ALTO',
    points: -10,
    summary: 'Endpoints de autenticação, OTP e recuperação de senha precisam de limites mais rígidos, com lockout progressivo.',
    consequence: 'Contas expostas a ataques contínuos de dicionário e negação de serviço de notificações SMS/email.',
    promptParaIA: 'Revê o código à luz da regra R06 e garante: Endpoints de autenticação, OTP e recuperação de senha precisam de limites mais rígidos, com lockout progressivo.',
    page: 13,
    script: {
      title: 'R06 · Rate limiting por endpoint',
      file: 'rate-limit.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Rota crítica sem controle de frequência de chamadas',
        '// app.post("/api/auth/login", handleLogin);',
        '',
        '// ✅ Correção: Janela deslizante de 5 tentativas a cada 15 minutos',
        'import { Ratelimit } from "@upstash/ratelimit";',
        'import { Redis } from "@upstash/redis";',
        '',
        'export const authLimiter = new Ratelimit({',
        '  redis: Redis.fromEnv(),',
        '  limiter: Ratelimit.slidingWindow(5, "15 m"),',
        '  analytics: true',
        '});',
        '',
        'export async function verificarLimiteAuth(ip: string) {',
        '  const { success } = await authLimiter.limit(`auth_${ip}`);',
        '  if (!success) throw new Error("Muitas tentativas. Bloqueio temporário ativado.");',
        '}'
      ],
      segments: [
        {
          // 0–4s — Gancho & Apresentação da Regra
          say: 'Se a sua rota de login não tem este controle, um script simples em Python pode derrubar o seu banco agora. Esta é a Regra R06 da Auditoria de Segurança para Vibe Coding.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'handleLogin'
        },
        {
          // 4–10s — Do que se trata a Regra R06
          say: 'A Regra R06 audita a frequência de requisições por endpoint. Quando criamos rotas com IA, é comum esquecer o rate limit porque em testes com três cliques tudo funciona perfeitamente.',
          focus: [2, 2],
          mark: 'login'
        },
        {
          // 10–20s — Explicação
          say: 'Sem rate limiting específico por endpoint, invasores esgotam conexões e tentam senhas em massa sem nenhum obstáculo.',
          focus: [2, 2],
          mark: 'handleLogin'
        },
        {
          // 20–30s — A correção
          say: 'A correção é aplicar um limitador por janela deslizante no Redis: permita no máximo cinco tentativas a cada quinze minutos por IP.',
          type: [4, 12],
          focus: [8, 12],
          mark: 'slidingWindow'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R zero seis exige: rate limiting por endpoint com bloqueio progressivo em rotas de login, OTP e recuperação de senha.',
          focus: [14, 17],
          mark: 'authLimiter.limit'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas cuidado: você sabe o que acontece quando alguém envia um JSON com cinquenta megabytes para estourar a memória do seu Node.js?',
          focus: [16, 16],
          mark: 'throw'
        },
        {
          // 50–60s — Continuidade
          say: 'É exatamente isso que a regra R07 investiga no próximo episódio. Acompanhe a auditoria de segurança.',
          focus: [16, 16],
          mark: 'Bloqueio temporário'
        }
      ]
    }
  },
  {
    id: 'audit-r07',
    ruleCode: 'R07',
    section: 'Rate Limiting e Abuso',
    sectionNumber: 2,
    title: 'Limite de tamanho de input',
    severity: 'ALTO',
    points: -10,
    summary: 'Todo campo deve ter validação server-side de tamanho máximo. Validação apenas no front-end é insuficiente.',
    consequence: 'Atacantes podem enviar strings gigantescas de megabytes diretamente à API, causando esgotamento de memória no Node.js.',
    promptParaIA: 'Revê o código à luz da regra R07 e garante: Todo campo deve ter validação server-side de tamanho máximo. Validação apenas no front-end é insuficiente.',
    page: 14,
    script: {
      title: 'R07 · Limite de tamanho de input',
      file: 'input-schema.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Confiar apenas no maxLength do formulário HTML',
        '// const { bio } = req.body; // sem checagem de tamanho no backend',
        '',
        '// ✅ Correção: Validação server-side estrita com limites máximos',
        'import { z } from "zod";',
        '',
        'export const UserProfileSchema = z.object({',
        '  nome: z.string().trim().min(2).max(80),',
        '  biografia: z.string().max(500),',
        '  email: z.string().email().max(120)',
        '});',
        '',
        'export function validarPerfil(data: unknown) {',
        '  return UserProfileSchema.parse(data);',
        '}'
      ],
      segments: [
        {
          // 0–4s — Gancho & Apresentação da Regra
          say: 'Se o seu formulário tem limite de caracteres mas o seu backend não tem, a sua aplicação está vulnerável. Esta é a Regra R07 da Auditoria de Segurança para Vibe Coding.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'req.body'
        },
        {
          // 4–10s — Do que se trata a Regra R07
          say: 'A Regra R07 investiga o tamanho máximo de inputs aceitos pelo servidor. No navegador, o usuário é travado, mas qualquer script ignora a interface e envia megabytes para a sua API.',
          focus: [2, 2],
          mark: 'bio'
        },
        {
          // 10–20s — Explicação
          say: 'Strings gigantescas alocam memória no processo Node.js e sobrecarregam o banco, travando o servidor com pouco esforço.',
          focus: [2, 2],
          mark: 'backend'
        },
        {
          // 20–30s — A correção
          say: 'A correção é validar no servidor com Zod: todo campo de texto precisa de limites máximos explícitos antes de ser processado.',
          type: [4, 11],
          focus: [7, 11],
          mark: 'max'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R zero sete determina: limite de tamanho de input obrigatório no servidor. Validação apenas no front-end é insuficiente.',
          focus: [13, 15],
          mark: 'parse'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e se duas requisições simultâneas tentarem gastar o mesmo saldo exatamente no mesmo milissegundo?',
          focus: [8, 10],
          mark: 'z.string()'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio vamos desvendar a temida Race Condition na regra R08. Siga para não perder.',
          focus: [14, 14],
          mark: 'UserProfileSchema'
        }
      ]
    }
  },
  {
    id: 'audit-r08',
    ruleCode: 'R08',
    section: 'Rate Limiting e Abuso',
    sectionNumber: 2,
    title: 'Proteção contra Race Condition',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Operações financeiras e contadores devem usar transações atómicas. Verificação separada da ação é vulnerável.',
    consequence: 'Compromisso financeiro: usuários conseguem gastar duas vezes o mesmo saldo com requisições em paralelo.',
    promptParaIA: 'Revê o código à luz da regra R08 e garante: Operações financeiras e contadores devem usar transações atómicas. Verificação separada da ação é vulnerável.',
    page: 15,
    script: {
      title: 'R08 · Proteção contra Race Condition',
      file: 'saldo-transacao.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Checar saldo numa linha e debitar na outra',
        '// if (user.saldo >= valor) { await debitar(valor); }',
        '',
        '// ✅ Correção: Débito e validação atômica na mesma transação',
        'await prisma.$transaction(async (tx) => {',
        '  const res = await tx.conta.updateMany({',
        '    where: { id: contaId, saldo: { gte: valor } },',
        '    data: { saldo: { decrement: valor } }',
        '  });',
        '  if (res.count === 0) throw new Error("Saldo insuficiente!");',
        '});'
      ],
      segments: [
        {
          // 0–4s — Gancho & Apresentação da Regra
          say: 'Se você consulta o saldo antes de debitar com este código, um usuário pode gastar o mesmo dinheiro dez vezes. Esta é a Regra R08 da Auditoria de Segurança para Vibe Coding.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'user.saldo >= valor'
        },
        {
          // 4–10s — Do que se trata a Regra R08
          say: 'A Regra R08 audita a proteção contra Race Condition em transações e contadores. Em testes manuais sequenciais nada falha, mas requisições simultâneas em milissegundos criam saldo infinito.',
          focus: [2, 2],
          mark: 'debitar'
        },
        {
          // 10–20s — Explicação
          say: 'Todas as requisições leem o saldo positivo antes do primeiro débito acontecer. Quando os débitos rodam, a conta fica negativa.',
          focus: [2, 2],
          mark: 'user.saldo'
        },
        {
          // 20–30s — A correção
          say: 'A solução é executar a verificação e o débito na mesma instrução atômica no banco de dados usando transação e decrement.',
          type: [4, 11],
          focus: [6, 9],
          mark: 'decrement'
        },
        {
          // 30–40s — A regra
          say: 'É por isso que a Regra R zero oito é severidade crítica: operações financeiras e contadores devem usar transações atômicas.',
          focus: [5, 10],
          mark: '$transaction'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e se alguém enviar dados maliciosos direto para a API contornando toda a interface do seu app?',
          focus: [10, 10],
          mark: 'throw'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo vídeo entramos na seção de Validação e Sanitização com a regra R09. Acompanhe a auditoria de segurança.',
          focus: [7, 8],
          mark: 'gte: valor'
        }
      ]
    }
  }
];
