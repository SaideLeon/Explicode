import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_10_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-ctf-r10',
    ruleCode: 'CTF-R10',
    section: 'CTF · Acesso e Obscuridade',
    sectionNumber: 10,
    title: 'Rotas escondidas não substituem autenticação',
    severity: 'ALTO',
    points: -10,
    summary: 'Um painel admin em /zadmin foi localizado via wordlist pública em 1 hora. Rotas obscuras podem ser uma camada extra, mas o acesso precisa de MFA robusto.',
    consequence: 'Segurança por obscuridade: ferramentas como Gobuster encontram caminhos escondidos em poucos minutos.',
    promptParaIA: 'Revê o código à luz da regra CTF-R10 e garante: Um painel admin em /zadmin foi localizado via wordlist pública em 1 hora. Rotas obscuras podem ser uma camada extra, mas o acesso precisa de MFA robusto.',
    page: 50,
    script: {
      title: 'CTF-R10 · Rotas não substituem autenticação',
      file: 'admin-gate.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Ilusão: achar que ninguém vai descobrir a URL /zadmin-secreto',
        '',
        '// ✅ Regra CTF-R10: Autenticação real com verificação de cargo e MFA',
        'export async function protegerAreaAdmin(req: Request) {',
        '  const session = await obterSessao(req);',
        '  if (!session || session.role !== "SUPER_ADMIN" || !session.mfaAtivo) {',
        '    throw new Error("Acesso negado: credenciais administrativas e MFA obrigatórios.");',
        '  }',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R dez. Achar que mudar o caminho para zadmin protege a área administrativa é pura ilusão.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'zadmin'
        },
        {
          say: 'Wordlists e scanners públicos acham caminhos obscuros rapidamente. O que protege de verdade é autenticação com MFA.',
          type: [4, 9],
          focus: [6, 8],
          mark: 'SUPER_ADMIN'
        }
      ]
    }
  },
  {
    id: 'audit-ctf-r11',
    ruleCode: 'CTF-R11',
    section: 'CTF · Acesso e Obscuridade',
    sectionNumber: 10,
    title: 'Seeds de jogo geradas e validadas no servidor',
    severity: 'ALTO',
    points: -10,
    summary: 'Seeds geradas no front-end são previsíveis. Devem ser geradas no servidor, vinculadas à sessão, e invalidadas após o uso.',
    consequence: 'Manipulação de jogos: o usuário controla a semente ou prevê os números sorteados.',
    promptParaIA: 'Revê o código à luz da regra CTF-R11 e garante: Seeds geradas no front-end são previsíveis. Devem ser geradas no servidor, vinculadas à sessão, e invalidadas após o uso.',
    page: 51,
    script: {
      title: 'CTF-R11 · Seeds geradas no servidor',
      file: 'provably-fair.ts',
      lang: 'pt-BR',
      code: [
        'import { randomBytes, createHmac } from "node:crypto";',
        '',
        '// ✅ Regra CTF-R11: Semente do servidor revelada apenas após o compromisso',
        'export function iniciarPartidaSegura(userId: string) {',
        '  const serverSeed = randomBytes(32).toString("hex");',
        '  const hashPublico = createHmac("sha256", "salt").update(serverSeed).digest("hex");',
        '  return { hashPublico }; // O serverSeed fica guardado até a partida terminar',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R onze. Gerar sementes aleatórias no front-end permite que trapaceiros prevejam o resultado com antecedência.',
          type: [1, 3],
          focus: [3, 3],
          mark: 'serverSeed'
        },
        {
          say: 'A semente deve ser gerada no servidor e apenas o hash de compromisso é entregue ao jogador antes da rodada.',
          type: [4, 8],
          focus: [5, 7],
          mark: 'hashPublico'
        }
      ]
    }
  }
];
