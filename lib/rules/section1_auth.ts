import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_1_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-r01',
    ruleCode: 'R01',
    section: 'Autenticação e Credenciais',
    sectionNumber: 1,
    title: 'Hash de senha moderno',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Senhas devem usar Argon2, bcrypt ou scrypt. MD5 e SHA-1 são proibidos.',
    consequence: 'Compromisso total: dados, contas ou dinheiro na mão do atacante. Motivo de reprovação imediata na auditoria.',
    promptParaIA: 'Revê o código à luz da regra R01 e garante: Senhas devem usar Argon2, bcrypt ou scrypt. MD5 e SHA-1 são proibidos.',
    page: 7,
    script: {
      title: 'R01 · Hash de senha moderno (Argon2id)',
      file: 'auth-hash.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Tratar senha como dado comum (rápido demais)',
        'const hashInseguro = md5(password);',
        '',
        '// ✅ Correção: Password Hashing com custo deliberado (Argon2id)',
        'import argon2 from "argon2";',
        '',
        'export async function gerarHashSeguro(password: string) {',
        '  return await argon2.hash(password, {',
        '    type: argon2.argon2id,',
        '    memoryCost: 65536, // 64 MB por tentativa',
        '    timeCost: 3,       // 3 iterações deliberadas',
        '    parallelism: 4     // 4 threads',
        '  });',
        '}'
      ],
      segments: [
        {
          // 0–4s — Gancho & Apresentação da Regra
          say: 'Se o seu sistema salva senhas usando MD5, qualquer um pode quebrar a sua base de dados em segundos. Esta é a Regra R01 da Auditoria de Segurança para Vibe Coding.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'md5',
          scene: {
            title: 'R01 · Hash de Senha Moderno',
            nodes: [
              { id: 'p', x: 28, y: 38, icon: '🔑', label: 'Senha', sub: '"123456"', color: 'slate', on: 'senhas' },
              { id: 'm', x: 80, y: 38, icon: '⚡', label: 'MD5', sub: 'rápido demais', color: 'rose', on: 'MD5' },
              { id: 'b', x: 132, y: 38, icon: '❌', label: 'Quebrado', sub: 'em segundos', color: 'rose', on: 'segundos' }
            ],
            arrows: [
              { from: 'p', to: 'm', label: 'gera', color: 'rose', on: 'linha' },
              { from: 'm', to: 'b', label: 'quebra', color: 'rose', on: 'qualquer' }
            ]
          }
        },
        {
          // 4–10s — Do que se trata especificamente a Regra R01
          say: 'Nesta auditoria, avaliamos os pontos cegos que a inteligência artificial deixa passar. A Regra R01 audita a proteção das senhas: algoritmos antigos como MD5 são rápidos demais e facilitam ataques de força bruta.',
          focus: [2, 2],
          mark: 'hashInseguro'
        },
        {
          // 10–20s — Explicação / Vetor de ataque
          say: 'GPUs modernas conseguem testar bilhões de hashes por segundo. Sem custo de memória deliberado, sua tabela inteira cai num piscar de olhos.',
          focus: [2, 2],
          mark: 'password',
          scene: {
            title: '10–20s · GPU Bruteforce',
            nodes: [
              { id: 'gpu', x: 40, y: 38, icon: '🖥️', label: 'GPU Cluster', sub: '10 bilhões/seg', color: 'rose', on: 'bilhões' },
              { id: 'db', x: 100, y: 38, icon: '🗄️', label: 'Banco de Dados', sub: 'senhas reveladas', color: 'amber', on: 'tabela' }
            ],
            arrows: [{ from: 'gpu', to: 'db', label: 'força bruta', color: 'rose', on: 'hashes' }]
          }
        },
        {
          // 20–30s — A correção no código
          say: 'A correção é usar Argon2id. Ele obriga o hardware do atacante a gastar sessenta e quatro megabytes de memória por tentativa, inviabilizando ataques em massa.',
          type: [4, 14],
          focus: [5, 13],
          mark: 'argon2'
        },
        {
          // 30–40s — A regra
          say: 'É por isso que a Regra R zero um é severidade crítica na auditoria: senhas devem usar Argon2, bcrypt ou scrypt. MD5 e SHA-1 são proibidos.',
          focus: [8, 12],
          mark: 'memoryCost',
          scene: {
            title: 'Regra R01 · Hash Moderno',
            nodes: [
              { id: 'r1', x: 40, y: 38, icon: '🛑', label: 'R01', sub: 'CRÍTICO (-25 pts)', color: 'rose', on: 'Regra' },
              { id: 'r2', x: 100, y: 38, icon: '🛡️', label: 'Argon2id', sub: 'Custo deliberado', color: 'green', on: 'Argon2' }
            ],
            arrows: [{ from: 'r1', to: 'r2', label: 'audita', color: 'green', on: 'senhas' }]
          }
        },
        {
          // 40–50s — Retenção final
          say: 'Mas cuidado: você sabe exatamente quantas iterações configurar no Argon2 sem travar o seu próprio servidor quando mil usuários logarem ao mesmo tempo?',
          focus: [11, 11],
          mark: 'timeCost'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo vídeo da série, vamos investigar a enumeração de usuários no login com a regra R02. Acompanhe a auditoria de segurança.',
          focus: [7, 13],
          mark: 'gerarHashSeguro'
        }
      ]
    }
  },
  {
    id: 'audit-r02',
    ruleCode: 'R02',
    section: 'Autenticação e Credenciais',
    sectionNumber: 1,
    title: 'Sem enumeração de utilizadores',
    severity: 'ALTO',
    points: -10,
    summary: 'A resposta de autenticação deve ser sempre genérica: "credenciais inválidas". Nunca revelar se o e-mail existe.',
    consequence: 'Exposição séria: contas, dados sensíveis ou lógica de negócio comprometidos. Custa pontos sérios na auditoria.',
    promptParaIA: 'Revê o código à luz da regra R02 e garante: A resposta de autenticação deve ser sempre genérica: "credenciais inválidas". Nunca revelar se o e-mail existe.',
    page: 8,
    script: {
      title: 'R02 · Sem enumeração de utilizadores',
      file: 'login-handler.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Mensagem de erro que entrega se a conta existe',
        'if (!user) return res.status(404).json({ error: "E-mail não cadastrado" });',
        '',
        '// ✅ Correção: Resposta genérica indistinguível no servidor',
        'const MENSAGEM_GENERICA = "Credenciais inválidas";',
        '',
        'if (!user || !(await verifyHash(user.passwordHash, password))) {',
        '  return res.status(401).json({ error: MENSAGEM_GENERICA });',
        '}'
      ],
      segments: [
        {
          // 0–4s — Gancho & Apresentação da Regra
          say: 'Esta mensagem de erro no login parece educada, mas acabou de entregar um dado valioso para um atacante. Esta é a Regra R02 da Auditoria de Segurança para Vibe Coding.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'E-mail não cadastrado'
        },
        {
          // 4–10s — Do que se trata especificamente a Regra R02
          say: 'A Regra R02 investiga a enumeração de usuários. Quando a aplicação avisa se o e-mail existe ou não, ela entrega de bandeja para o invasor a confirmação de quais contas existem na plataforma.',
          focus: [2, 2],
          mark: 'res.status(404)',
          scene: {
            title: 'Enumeração por Resposta 404',
            nodes: [
              { id: 'bot', x: 30, y: 38, icon: '🤖', label: 'Bot Scanner', sub: 'testa emails', color: 'amber', on: 'bot' },
              { id: 'res', x: 80, y: 38, icon: '404', label: '404 Not Found', sub: 'não existe', color: 'rose', on: '404' },
              { id: 'ok', x: 130, y: 38, icon: '✅', label: 'Conta Existe!', sub: 'alvo confirmado', color: 'rose', on: 'conta' }
            ],
            arrows: [
              { from: 'bot', to: 'res', label: 'envia', color: 'amber', on: 'testa' },
              { from: 'res', to: 'ok', label: 'descobre', color: 'rose', on: 'gratuita' }
            ]
          }
        },
        {
          // 10–20s — Explicação
          say: 'Com mensagens diferentes para e-mail inexistente e senha errada, um atacante descobre exatamente quais diretores e clientes usam sua plataforma.',
          focus: [2, 2],
          mark: 'error'
        },
        {
          // 20–30s — A correção
          say: 'A solução é unificar a resposta: retorne sempre credenciais inválidas com status 401, independentemente de o usuário existir ou errar a senha.',
          type: [4, 9],
          focus: [5, 8],
          mark: 'MENSAGEM_GENERICA'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R zero dois exige: a resposta de autenticação deve ser sempre genérica. Nunca revele se o e-mail existe.',
          focus: [7, 8],
          mark: 'res.status(401)'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas atenção: se o tempo de resposta da sua API for mais lento quando o e-mail existe, o atacante ainda consegue adivinhar pelo relógio.',
          focus: [7, 7],
          mark: 'verifyHash'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio, vamos ver como um segredo esquecido no código pode custar todo o seu faturamento com a regra R03. Acompanhe a série.',
          focus: [8, 8],
          mark: 'MENSAGEM_GENERICA'
        }
      ]
    }
  },
  {
    id: 'audit-r03',
    ruleCode: 'R03',
    section: 'Autenticação e Credenciais',
    sectionNumber: 1,
    title: 'Secrets fora do código',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Nenhum secret, API key ou token no código-fonte ou em ficheiros versionados. Apenas variáveis de ambiente fora do repositório.',
    consequence: 'Compromisso total: dados, contas ou dinheiro na mão do atacante. Motivo de reprovação imediata na auditoria.',
    promptParaIA: 'Revê o código à luz da regra R03 e garante: Nenhum secret, API key ou token no código-fonte ou em ficheiros versionados. Apenas variáveis de ambiente fora do repositório.',
    page: 9,
    script: {
      title: 'R03 · Secrets fora do código',
      file: 'env-config.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Credencial exposta no código-fonte',
        'const STRIPE_SECRET = "sk_live_EXEMPLO_FICTICIO";',
        '',
        '// ✅ Correção: Carregamento seguro via variável de ambiente',
        'const stripeSecret = process.env.STRIPE_SECRET_KEY;',
        '',
        'if (!stripeSecret) {',
        '  throw new Error("STRIPE_SECRET_KEY obrigatória nas variáveis de ambiente!");',
        '}'
      ],
      segments: [
        {
          // 0–4s — Gancho & Apresentação da Regra
          say: 'Se esta linha aparecer no seu código gerado por IA, você pode ter acabado de entregar uma chave secreta para outra pessoa. Esta é a Regra R03 da Auditoria de Segurança para Vibe Coding.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'STRIPE_SECRET'
        },
        {
          // 4–10s — Do que se trata a Regra R03
          say: 'A Regra R03 audita o armazenamento de credenciais: secrets, tokens de API e chaves privadas nunca devem ficar dentro do código-fonte, mesmo que a aplicação funcione perfeitamente nos testes.',
          focus: [2, 2],
          mark: 'sk_live_EXEMPLO_FICTICIO',
          scene: {
            title: 'Código → Git → Repositório Público',
            nodes: [
              { id: 'c1', x: 28, y: 38, icon: '💻', label: 'Código Local', sub: 'funciona ok', color: 'slate', on: 'testes' },
              { id: 'c2', x: 80, y: 38, icon: '📦', label: 'Git Commit', sub: 'versionado', color: 'amber', on: 'código' },
              { id: 'c3', x: 132, y: 38, icon: '🌐', label: 'Repositório Público', sub: 'exposição total', color: 'rose', on: 'código-fonte' }
            ],
            arrows: [
              { from: 'c1', to: 'c2', label: 'push', color: 'amber', on: 'funcione' },
              { from: 'c2', to: 'c3', label: 'vazamento', color: 'rose', on: 'segredo' }
            ]
          }
        },
        {
          // 10–20s — Explicação
          say: 'Quando uma credencial é colocada diretamente no código, ela pode acabar no histórico do Git, em um repositório, em um backup ou até em logs de erro abertos.',
          focus: [2, 2],
          mark: 'STRIPE_SECRET',
          scene: {
            title: 'Onde o Secret se Espalha',
            nodes: [
              { id: 's1', x: 28, y: 29, icon: '📜', label: 'Histórico Git', sub: 'permanece gravado', color: 'rose', on: 'Git' },
              { id: 's2', x: 80, y: 29, icon: '🗄️', label: 'Backups', sub: 'arquivos zip/dump', color: 'rose', on: 'backup' },
              { id: 's3', x: 132, y: 29, icon: '📋', label: 'Logs de Erro', sub: 'rastros no servidor', color: 'rose', on: 'logs' },
              { id: 's4', x: 80, y: 56, icon: '⚠️', label: 'sk_live_...', sub: 'chave sequestrada', color: 'amber', on: 'credencial' }
            ],
            arrows: [
              { from: 's4', to: 's1', label: 'indexa', color: 'rose', on: 'histórico' },
              { from: 's4', to: 's2', label: 'copia', color: 'rose', on: 'repositório' },
              { from: 's4', to: 's3', label: 'grava', color: 'rose', on: 'diretamente' }
            ]
          }
        },
        {
          // 20–30s — A correção
          say: 'A solução não é simplesmente apagar a chave. É impedir que ela faça parte do código versionado. A aplicação deve recebê-la através de uma variável de ambiente segura.',
          type: [4, 9],
          focus: [5, 9],
          mark: 'process.env'
        },
        {
          // 30–40s — A regra
          say: 'É exatamente isso que a Regra R zero três verifica: secrets, tokens e credenciais nunca devem ficar dentro do código-fonte.',
          focus: [5, 9],
          mark: 'STRIPE_SECRET_KEY',
          scene: {
            title: 'R03 · Secrets Fora do Código',
            nodes: [
              { id: 'r1', x: 40, y: 38, icon: '🛑', label: 'R03', sub: 'CRÍTICO (-25 pts)', color: 'rose', on: 'Regra' },
              { id: 'r2', x: 100, y: 38, icon: '🛡️', label: 'SECRETS FORA DO CÓDIGO', sub: 'variáveis de ambiente', color: 'green', on: 'código-fonte' }
            ],
            arrows: [{ from: 'r1', to: 'r2', label: 'auditoria', color: 'green', on: 'verifica' }]
          }
        },
        {
          // 40–50s — Retenção final
          say: 'Mas existe um detalhe que muita gente esquece: se essa chave já foi publicada no Git, apagar a linha não significa que ela deixou de estar exposta.',
          focus: [5, 5],
          mark: 'stripeSecret'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo vídeo, vamos olhar para esse problema e descobrir o que fazer quando um secret já foi exposto. Se você está criando aplicações com IA, acompanhe a série.',
          focus: [7, 9],
          mark: 'throw'
        }
      ]
    }
  },
  {
    id: 'audit-r04',
    ruleCode: 'R04',
    section: 'Autenticação e Credenciais',
    sectionNumber: 1,
    title: 'Não criar autenticação própria',
    severity: 'ALTO',
    points: -10,
    summary: 'Usar soluções estabelecidas: Supabase Auth, Auth0, Keycloak, NextAuth. Autenticação manual aumenta a superfície de ataque.',
    consequence: 'Exposição séria: contas, dados sensíveis ou lógica de negócio comprometidos. Custa pontos sérios na aprovação.',
    promptParaIA: 'Revê o código à luz da regra R04 e garante: Usar soluções estabelecidas: Supabase Auth, Auth0, Keycloak, NextAuth. Autenticação manual aumenta a superfície de ataque.',
    page: 10,
    script: {
      title: 'R04 · Não criar autenticação própria',
      file: 'auth-strategy.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Criar rotinas manuais de sessão e cookies do zero',
        'function manualSessionCheck(cookie: string) { /* falhas sutis de token */ }',
        '',
        '// ✅ Correção: Bibliotecas consolidadas e auditadas (NextAuth / Supabase)',
        'import { getServerSession } from "next-auth";',
        'import { authOptions } from "@/lib/auth";',
        '',
        'export async function verificarSessaoSegura() {',
        '  const session = await getServerSession(authOptions);',
        '  if (!session?.user) throw new Error("Acesso não autorizado");',
        '  return session.user;',
        '}'
      ],
      segments: [
        {
          // 0–4s — Gancho & Apresentação da Regra
          say: 'Você pediu para a inteligência artificial gerar autenticação e ela criou uma rotina própria... Esta é a Regra R04 da Auditoria de Segurança para Vibe Coding.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'manualSessionCheck'
        },
        {
          // 4–10s — Do que se trata a Regra R04
          say: 'A Regra R04 proíbe a criação de autenticação caseira. Gerenciamento manual de sessão e cookies aumenta drasticamente a superfície de ataque e esconde brechas graves.',
          focus: [2, 2],
          mark: 'cookie'
        },
        {
          // 10–20s — Explicação
          say: 'Criar sessão do zero significa que você terá que lidar sozinho com fixação de sessão, CSRF, expiração de tokens e temporização de hashes.',
          focus: [2, 2],
          mark: 'manualSessionCheck'
        },
        {
          // 20–30s — A correção
          say: 'A correção é usar soluções consolidadas como NextAuth, Supabase Auth ou Auth0, que já foram auditadas por milhares de especialistas.',
          type: [4, 12],
          focus: [8, 12],
          mark: 'getServerSession'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R zero quatro alerta: não crie autenticação própria. Autenticação manual aumenta drasticamente a sua superfície de ataque.',
          focus: [9, 10],
          mark: 'session?.user'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e quando o usuário precisa encerrar a sessão imediatamente em todos os dispositivos? Você sabe se o seu JWT realmente morre no logout?',
          focus: [10, 10],
          mark: 'throw'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio, vamos investigar a revogação de tokens e o perigo do JWT zumbi com a regra R05. Acompanhe a auditoria.',
          focus: [11, 11],
          mark: 'session.user'
        }
      ]
    }
  },
  {
    id: 'audit-r05',
    ruleCode: 'R05',
    section: 'Autenticação e Credenciais',
    sectionNumber: 1,
    title: 'Revogação de JWT',
    severity: 'ALTO',
    points: -10,
    summary: 'Implementar blocklist ou rotação de refresh tokens. Tokens sem revogação são invalidáveis mesmo após comprometimento.',
    consequence: 'Tokens sem revogação continuam válidos na mão de invasores mesmo após o usuário alterar a senha ou clicar em sair.',
    promptParaIA: 'Revê o código à luz da regra R05 e garante: Implementar blocklist ou rotação de refresh tokens. Tokens sem revogação são invalidáveis mesmo após comprometimento.',
    page: 11,
    script: {
      title: 'R05 · Revogação de JWT (Token Invalidation)',
      file: 'jwt-revocation.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Token assinado sem conferir estado de revogação',
        'const payload = jwt.verify(token, SECRET);',
        '',
        '// ✅ Correção: Validar identificador único do token em blocklist no Redis',
        'const isRevoked = await redis.get(`revoked_token:${payload.jti}`);',
        'if (isRevoked) {',
        '  throw new Error("Token revogado! Faça login novamente.");',
        '}'
      ],
      segments: [
        {
          // 0–4s — Gancho & Apresentação da Regra
          say: 'O usuário clicou em sair da conta, mas o token dele continua com passe livre no servidor. Esta é a Regra R05 da Auditoria de Segurança para Vibe Coding.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'jwt.verify'
        },
        {
          // 4–10s — Do que se trata a Regra R05
          say: 'A Regra R05 avalia a revogação de tokens JWT. Por ser stateless, um token JWT continua válido mesmo após o logout, a menos que você configure uma lista de revogação ativa.',
          focus: [2, 2],
          mark: 'payload'
        },
        {
          // 10–20s — Explicação
          say: 'Como o JWT é stateless, o servidor não guarda estado. Se o celular for roubado, o token continua funcionando mesmo se a senha for alterada.',
          focus: [2, 2],
          mark: 'SECRET'
        },
        {
          // 20–30s — A correção
          say: 'A solução é adicionar um identificador único jti em cada token e conferir uma blocklist rápida no Redis a cada requisição sensível.',
          type: [4, 8],
          focus: [5, 8],
          mark: 'isRevoked'
        },
        {
          // 30–40s — A regra
          say: 'É isso que a Regra R zero cinco exige: implementar blocklist ou rotação de tokens. Tokens sem revogação são invalidáveis.',
          focus: [5, 8],
          mark: 'payload.jti'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e se um bot disparar milhares de requisições por segundo para forçar a barra na sua API de login? O seu servidor aguenta?',
          focus: [6, 7],
          mark: 'throw'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio entramos na seção de Rate Limiting com a regra R06. Se você programa com IA, não perca.',
          focus: [7, 7],
          mark: 'Token revogado'
        }
      ]
    }
  }
];
