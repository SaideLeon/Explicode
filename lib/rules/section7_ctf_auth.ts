import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_7_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-ctf-r01',
    ruleCode: 'CTF-R01',
    section: 'CTF · Sessão e Autenticação',
    sectionNumber: 7,
    title: 'Secrets JWT únicos por subsistema',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Um JWT partilhado entre subsistemas (afiliados, principal) permite forjar tokens de outros utilizadores. Cada subsistema deve ter o seu próprio secret e escopo de validação.',
    consequence: 'Compromisso total: invasores em subsistemas menores emitem tokens com privilégios de administrador no sistema principal.',
    promptParaIA: 'Revê o código à luz da regra CTF-R01 e garante: Um JWT partilhado entre subsistemas (afiliados, principal) permite forjar tokens de outros utilizadores. Cada subsistema deve ter o seu próprio secret e escopo de validação.',
    page: 38,
    script: {
      title: 'CTF-R01 · Secrets JWT únicos por subsistema',
      file: 'jwt-subsystems.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Proibido: Mesmo secret compartilhado entre o app principal e o portal de afiliados',
        '// const token = jwt.sign(user, SHARED_SECRET);',
        '',
        '// ✅ Regra CTF-R01: Segredos e audiências independentes por subsistema',
        'export function assinarTokenPrincipal(user: { id: string }) {',
        '  return jwt.sign(user, process.env.JWT_CORE_SECRET!, {',
        '    audience: "app.principal.com",',
        '    issuer: "auth.core"',
        '  });',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R zero um. Compartilhar a mesma chave de assinatura de token entre microsserviços ou sistemas de afiliados é um erro fatal.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'SHARED_SECRET'
        },
        {
          say: 'Cada subsistema deve possuir seu próprio segredo de criptografia e validar o público de destino via audience.',
          type: [4, 10],
          focus: [6, 9],
          mark: 'JWT_CORE_SECRET'
        }
      ]
    }
  },
  {
    id: 'audit-ctf-r02',
    ruleCode: 'CTF-R02',
    section: 'CTF · Sessão e Autenticação',
    sectionNumber: 7,
    title: 'Unicidade global de username',
    severity: 'ALTO',
    points: -10,
    summary: 'Usernames duplicados entre subsistemas, somados a um JWT partilhado, resultam em account takeover. Os usernames devem ser únicos globalmente ou o escopo do token deve ser delimitado.',
    consequence: 'Account takeover: cadastrar o mesmo nome em um subsistema secundário garante controle sobre a conta do app principal.',
    promptParaIA: 'Revê o código à luz da regra CTF-R02 e garante: Usernames duplicados entre subsistemas, somados a um JWT partilhado, resultam em account takeover. Os usernames devem ser únicos globalmente ou o escopo do token deve ser delimitado.',
    page: 39,
    script: {
      title: 'CTF-R02 · Unicidade global de username',
      file: 'user-scope.ts',
      lang: 'pt-BR',
      code: [
        '// ✅ Regra CTF-R02: Delimitar o escopo e namespace de cada usuário',
        'export interface TokenPayload {',
        '  sub: string;       // ID universal exclusivo',
        '  username: string;  // Nome legível',
        '  tenantId: string;  // Subsistema isolado',
        '}',
        '',
        'export function validarAcessoSubsistema(token: TokenPayload, subsistemaEsperado: string) {',
        '  if (token.tenantId !== subsistemaEsperado) {',
        '    throw new Error("Token emitido para subsistema diferente. Acesso proibido.");',
        '  }',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R zero dois. Se dois subsistemas permitem o mesmo nome de usuário, a colisão de tokens abre brechas de roubo de conta.',
          type: [1, 6],
          focus: [2, 6],
          mark: 'tenantId'
        },
        {
          say: 'Exija nomes globalmente únicos ou amarre o identificador do subsistema ao payload verificado.',
          type: [8, 12],
          focus: [9, 11],
          mark: 'subsistemaEsperado'
        }
      ]
    }
  },
  {
    id: 'audit-ctf-r03',
    ruleCode: 'CTF-R03',
    section: 'CTF · Sessão e Autenticação',
    sectionNumber: 7,
    title: 'Secrets distintos por ambiente',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Um ambiente de homologação com o mesmo secret JWT da produção permite gerar tokens válidos para utilizadores reais.',
    consequence: 'Compromisso total de contas: invadir staging permite gerar tokens administrativos aceitos em produção.',
    promptParaIA: 'Revê o código à luz da regra CTF-R03 e garante: Um ambiente de homologação com o mesmo secret JWT da produção permite gerar tokens válidos para utilizadores reais.',
    page: 40,
    script: {
      title: 'CTF-R03 · Secrets distintos por ambiente',
      file: 'env-isolation.ts',
      lang: 'pt-BR',
      code: [
        '// ✅ Regra CTF-R03: Chaves e senhas 100% isoladas entre Staging e Produção',
        'const isProd = process.env.NODE_ENV === "production";',
        '',
        'const JWT_SECRET = isProd',
        '  ? process.env.PROD_JWT_SECRET',
        '  : process.env.STAGING_JWT_SECRET;',
        '',
        'if (!JWT_SECRET) throw new Error("Segredo de ambiente não configurado!");'
      ],
      segments: [
        {
          say: 'Regra CTF R zero três. Jamais copie chaves ou bancos de dados de produção para o ambiente de testes ou desenvolvimento.',
          type: [1, 2],
          focus: [2, 2],
          mark: 'NODE_ENV'
        },
        {
          say: 'Tokens criados no ambiente de testes poderiam ser usados para autenticar em produção se o segredo for compartilhado.',
          type: [4, 8],
          focus: [4, 7],
          mark: 'PROD_JWT_SECRET'
        }
      ]
    }
  }
];
