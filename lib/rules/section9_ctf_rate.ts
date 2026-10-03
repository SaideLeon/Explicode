import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_9_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-ctf-r07',
    ruleCode: 'CTF-R07',
    section: 'CTF · Taxa e Concorrência',
    sectionNumber: 9,
    title: 'Ler o estado DENTRO da transação',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Um saldo consultado antes do bloco de transação permite race condition: múltiplas requisições leem saldo positivo antes de qualquer débito ser aplicado.',
    consequence: 'Gasto duplo: dezenas de requisições simultâneas leem o saldo antigo e todas são aprovadas.',
    promptParaIA: 'Revê o código à luz da regra CTF-R07 e garante: Um saldo consultado antes do bloco de transação permite race condition: múltiplas requisições leem saldo positivo antes de qualquer débito ser aplicado.',
    page: 46,
    script: {
      title: 'CTF-R07 · Ler o estado DENTRO da transação',
      file: 'tx-lock.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerável: consultar saldo fora do bloco da transação',
        '// const saldo = await buscarSaldo(userId);',
        '',
        '// ✅ Regra CTF-R07: Consulta com Lock DENTRO da transação serializável',
        'await db.$transaction(async (tx) => {',
        '  const usuario = await tx.$queryRaw`',
        '    SELECT saldo FROM carteiras WHERE user_id = ${userId} FOR UPDATE',
        '  `;',
        '  if (usuario[0].saldo < valor) throw new Error("Saldo insuficiente!");',
        '  await tx.$executeRaw`UPDATE carteiras SET saldo = saldo - ${valor} WHERE user_id = ${userId}`;',
        '});'
      ],
      segments: [
        {
          say: 'Regra CTF R zero sete. Fazer a leitura do saldo fora da transação faz com que requisições paralelas aprovem múltiplos pagamentos com o mesmo saldo.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'buscarSaldo'
        },
        {
          say: 'Faça a consulta com cláusula for update diretamente dentro do bloco de transação para travar o registro até a conclusão.',
          type: [4, 11],
          focus: [6, 8],
          mark: 'FOR UPDATE'
        }
      ]
    }
  },
  {
    id: 'audit-ctf-r08',
    ruleCode: 'CTF-R08',
    section: 'CTF · Taxa e Concorrência',
    sectionNumber: 9,
    title: 'Rate limiting em OTP',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Um OTP de 4 dígitos sem rate limit permite 10 000 combinações em segundos por força bruta. O OTP deve ter no mínimo 6 dígitos, limite de 5 tentativas e lockout temporário.',
    consequence: 'Invasão imediata de contas por força bruta em códigos de autenticação em dois fatores.',
    promptParaIA: 'Revê o código à luz da regra CTF-R08 e garante: Um OTP de 4 dígitos sem rate limit permite 10 000 combinações em segundos por força bruta. O OTP deve ter no mínimo 6 dígitos, limite de 5 tentativas e lockout temporário.',
    page: 47,
    script: {
      title: 'CTF-R08 · Rate limiting em OTP',
      file: 'otp-verifier.ts',
      lang: 'pt-BR',
      code: [
        'export async function verificarCodigoOTP(userId: string, codigo: string) {',
        '  const tentativas = await redis.incr(`otp_tentativas:${userId}`);',
        '  // ✅ Regra CTF-R08: Máximo 5 tentativas antes do bloqueio',
        '  if (tentativas > 5) {',
        '    await redis.del(`otp_valido:${userId}`);',
        '    throw new Error("Muitas tentativas incorretas. Código invalidado.");',
        '  }',
        '  const codigoReal = await redis.get(`otp_valido:${userId}`);',
        '  return codigo === codigoReal;',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R zero oito. Um código OTP de quatro dígitos tem apenas dez mil combinações, que são testadas em segundos sem rate limit.',
          type: [1, 3],
          focus: [2, 3],
          mark: 'otp_tentativas'
        },
        {
          say: 'Use códigos de seis dígitos, limite a cinco tentativas e invalide o código se houver erro repetido.',
          type: [4, 10],
          focus: [4, 7],
          mark: 'tentativas > 5'
        }
      ]
    }
  },
  {
    id: 'audit-ctf-r09',
    ruleCode: 'CTF-R09',
    section: 'CTF · Taxa e Concorrência',
    sectionNumber: 9,
    title: 'CAPTCHA e bloqueio por IP em endpoints críticos',
    severity: 'ALTO',
    points: -10,
    summary: 'Sem CAPTCHA, ataques de força bruta em paralelo são executados em segundos. Login, OTP e recuperação de senha devem ter CAPTCHA e bloqueio progressivo por IP.',
    consequence: 'Automação de ataques em escala contra logins de usuários e geração desenfreada de custos de SMS.',
    promptParaIA: 'Revê o código à luz da regra CTF-R09 e garante: Sem CAPTCHA, ataques de força bruta em paralelo são executados em segundos. Login, OTP e recuperação de senha devem ter CAPTCHA e bloqueio progressivo por IP.',
    page: 48,
    script: {
      title: 'CTF-R09 · CAPTCHA e bloqueio por IP',
      file: 'captcha-gate.ts',
      lang: 'pt-BR',
      code: [
        'export async function validarTurnstileCaptcha(token: string, remoteIp: string) {',
        '  // ✅ Regra CTF-R09: Validar Cloudflare Turnstile no servidor',
        '  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {',
        '    method: "POST",',
        '    headers: { "Content-Type": "application/x-www-form-urlencoded" },',
        '    body: `secret=${process.env.TURNSTILE_SECRET}&response=${token}&remoteip=${remoteIp}`',
        '  });',
        '  const data = await res.json();',
        '  if (!data.success) throw new Error("Falha no desafio anti-bot!");',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R zero nove. Endpoints de autenticação abertos sem CAPTCHA facilitam ataques automatizados por botnets.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'validarTurnstileCaptcha'
        },
        {
          say: 'Verifique o token do CAPTCHA diretamente na API de verificação antes de processar qualquer consulta de senha.',
          type: [3, 10],
          focus: [3, 9],
          mark: 'siteverify'
        }
      ]
    }
  }
];
