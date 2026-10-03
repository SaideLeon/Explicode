import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_4_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-r15',
    ruleCode: 'R15',
    section: 'Controlo de Acesso',
    sectionNumber: 4,
    title: 'Proteção contra IDOR',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Toda operação sobre um recurso deve verificar no back-end se o utilizador tem autorização. Nunca confiar em IDs vindos do cliente.',
    consequence: 'Compromisso total: qualquer usuário pode ler, alterar ou deletar dados de outros usuários trocando o ID na URL.',
    promptParaIA: 'Revê o código à luz da regra R15 e garante: Toda operação sobre um recurso deve verificar no back-end se o utilizador tem autorização. Nunca confiar em IDs vindos do cliente.',
    page: 24,
    script: {
      title: 'R15 · Proteção contra IDOR',
      file: 'document-access.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerável a IDOR: confiar apenas no docId enviado pelo cliente',
        '// const doc = await db.document.findUnique({ where: { id: docId } });',
        '',
        '// ✅ Regra R15: Vincular a consulta obrigatoriamente ao userId da sessão',
        'export async function buscarDocumento(docId: string, userIdLogado: string) {',
        '  const doc = await db.document.findFirst({',
        '    where: { id: docId, proprietarioId: userIdLogado }',
        '  });',
        '  if (!doc) throw new Error("Acesso negado ou recurso inexistente.");',
        '  return doc;',
        '}'
      ],
      segments: [
        {
          say: 'Regra R15. Nunca busque um recurso usando apenas o identificador enviado pelo cliente sem checar quem é o dono.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'docId'
        },
        {
          say: 'A regra R15 obriga a incluir o id do usuário autenticado no filtro da consulta, impedindo acesso cruzado a outros registros.',
          type: [4, 11],
          focus: [6, 9],
          mark: 'proprietarioId'
        }
      ]
    }
  },
  {
    id: 'audit-r16',
    ruleCode: 'R16',
    section: 'Controlo de Acesso',
    sectionNumber: 4,
    title: 'Regras de acesso explícitas',
    severity: 'ALTO',
    points: -10,
    summary: 'As regras de negócio de acesso devem ser explicitamente implementadas, ex.: só compradores acedem a conteúdo pago.',
    consequence: 'Bypass de monetização e quebra de regras de permissão do sistema por omissão de verificações no backend.',
    promptParaIA: 'Revê o código à luz da regra R16 e garante: As regras de negócio de acesso devem ser explicitamente implementadas, ex.: só compradores acedem a conteúdo pago.',
    page: 25,
    script: {
      title: 'R16 · Regras de acesso explícitas',
      file: 'conteudo-pago.ts',
      lang: 'pt-BR',
      code: [
        'export async function liberarAula(aulaId: string, userId: string) {',
        '  const inscricao = await db.matricula.findFirst({',
        '    where: { userId, status: "paga_confirmada" }',
        '  });',
        '  // ✅ Regra R16: Regra de negócio explícita e checada no backend',
        '  if (!inscricao) {',
        '    throw new Error("Acesso restrito: compra do curso necessária.");',
        '  }',
        '  return await db.aula.findUnique({ where: { id: aulaId } });',
        '}'
      ],
      segments: [
        {
          say: 'Regra R16. Não presuma que quem acessa a URL de download tem permissão para o material.',
          type: [1, 4],
          focus: [2, 4],
          mark: 'matricula'
        },
        {
          say: 'Escreva verificações explícitas no servidor antes de entregar conteúdos pagos ou relatórios restritos.',
          type: [5, 10],
          focus: [6, 8],
          mark: 'inscricao'
        }
      ]
    }
  },
  {
    id: 'audit-r17',
    ruleCode: 'R17',
    section: 'Controlo de Acesso',
    sectionNumber: 4,
    title: 'RLS configurado restritivamente',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Em Supabase/PostgreSQL, as políticas RLS devem ser restritivas por defeito. RLS permissivo é uma das falhas mais exploradas.',
    consequence: 'Compromisso total do banco de dados exposto via API pública do Supabase ou PostgREST.',
    promptParaIA: 'Revê o código à luz da regra R17 e garante: Em Supabase/PostgreSQL, as políticas RLS devem ser restritivas por defeito. RLS permissivo é uma das falhas mais exploradas.',
    page: 26,
    script: {
      title: 'R17 · RLS configurado restritivamente',
      file: 'supabase-rls.sql',
      lang: 'pt-BR',
      code: [
        '-- ✅ Regra R17: Ativar RLS e criar política estrita por usuário',
        'ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;',
        '',
        'CREATE POLICY "Usuários só editam o próprio perfil"',
        'ON public.perfis',
        'FOR UPDATE',
        'USING (auth.uid() = user_id)',
        'WITH CHECK (auth.uid() = user_id);'
      ],
      segments: [
        {
          say: 'Regra R17. Políticas RLS permissivas ou tabelas sem segurança a nível de linha no Supabase deixam o banco aberto na internet.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'ROW LEVEL SECURITY'
        },
        {
          say: 'Ative o RLS e use a função auth ponto uid para restringir leituras e atualizações estritamente ao autor da ação.',
          type: [4, 8],
          focus: [6, 8],
          mark: 'auth.uid()'
        }
      ]
    }
  },
  {
    id: 'audit-r18',
    ruleCode: 'R18',
    section: 'Controlo de Acesso',
    sectionNumber: 4,
    title: 'Proteção contra Mass Assignment',
    severity: 'ALTO',
    points: -10,
    summary: 'A API não deve aceitar campos sensíveis (roles, saldo, estado de pagamento) no body sem uma whitelist explícita.',
    consequence: 'Elevação de privilégio: o usuário pode injetar role igual a admin no JSON de cadastro e virar administrador.',
    promptParaIA: 'Revê o código à luz da regra R18 e garante: A API não deve aceitar campos sensíveis (roles, saldo, estado de pagamento) no body sem uma whitelist explícita.',
    page: 27,
    script: {
      title: 'R18 · Proteção contra Mass Assignment',
      file: 'update-profile.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ CRÍTICO: Repassar todo o body diretamente para o ORM',
        '// await db.user.update({ where: { id }, data: req.body });',
        '',
        '// ✅ Regra R18: Whitelist estrita de campos que o usuário pode alterar',
        'const { nome, telefone } = req.body;',
        'await db.user.update({',
        '  where: { id: userId },',
        '  data: { nome, telefone } // campos como role e saldo nunca passam daqui',
        '});'
      ],
      segments: [
        {
          say: 'Regra R18. Repassar o corpo da requisição diretamente para o banco permite que qualquer um injete campos privilegiados.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'data'
        },
        {
          say: 'Faça a desestruturação apenas dos campos permitidos como nome e telefone, bloqueando campos administrativos.',
          type: [4, 9],
          focus: [5, 8],
          mark: 'whitelist'
        }
      ]
    }
  }
];
