import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_3_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-r09',
    ruleCode: 'R09',
    section: 'Validação e Sanitização',
    sectionNumber: 3,
    title: 'Validação server-side obrigatória',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Toda validação deve existir no servidor. Dados vindos do cliente são sempre suspeitos.',
    consequence: 'Compromisso total: bypass de regras de negócio, dados corrompidos ou acesso indevido por requisições manuais.',
    promptParaIA: 'Revê o código à luz da regra R09 e garante: Toda validação deve existir no servidor. Dados vindos do cliente são sempre suspeitos.',
    page: 17,
    script: {
      title: 'R09 · Validação server-side obrigatória',
      file: 'api-validator.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Confiar na validação feita no front-end',
        '// const pedido = req.body; // sem checagem no servidor',
        '',
        '// ✅ Correção: Validação server-side com schema tipado',
        'import { z } from "zod";',
        '',
        'const OrderSchema = z.object({',
        '  produtoId: z.string().uuid(),',
        '  quantidade: z.number().int().positive().max(100),',
        '  cupom: z.string().toUpperCase().max(20).optional()',
        '});',
        '',
        'export async function criarPedido(req: Request) {',
        '  const body = await req.json();',
        '  return OrderSchema.parse(body);',
        '}'
      ],
      segments: [
        {
          // 0–3s — Gancho
          say: 'Se a sua validação existe apenas no formulário do front-end, o seu banco de dados está desprotegido.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'req.body'
        },
        {
          // 3–10s — Criar curiosidade
          say: 'No navegador, mensagens em vermelho bloqueiam o envio. Mas qualquer usuário com Postman ou cURL envia valores nulos e negativos.',
          focus: [2, 2],
          mark: 'pedido'
        },
        {
          // 10–20s — Explicação
          say: 'Dados que chegam sem validação no servidor corrompem tabelas, travam processos e quebram a lógica de preços.',
          focus: [2, 2],
          mark: 'servidor'
        },
        {
          // 20–30s — A correção
          say: 'A correção é validar no servidor com esquemas estritos do Zod antes de executar qualquer ação.',
          type: [4, 11],
          focus: [7, 11],
          mark: 'OrderSchema'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R zero nove é severidade crítica: toda validação deve existir no servidor. Dados vindos do cliente são sempre suspeitos.',
          type: [13, 16],
          focus: [14, 15],
          mark: 'parse'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e quando o dado suspeito é uma query SQL montada com crase ou aspas no meio do código?',
          focus: [8, 10],
          mark: 'z.number()'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio, vamos dissecar o clássico SQL Injection na regra R10. Não perca.',
          focus: [14, 15],
          mark: 'criarPedido'
        }
      ]
    }
  },
  {
    id: 'audit-r10',
    ruleCode: 'R10',
    section: 'Validação e Sanitização',
    sectionNumber: 3,
    title: 'Proteção contra SQL Injection',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Usar queries parametrizadas ou um ORM com sanitização. Concatenação direta de input é proibida.',
    consequence: 'Vazamento ou destruição de todo o banco de dados. Motivo de reprovação imediata na auditoria.',
    promptParaIA: 'Revê o código à luz da regra R10 e garante: Usar queries parametrizadas ou um ORM com sanitização. Concatenação direta de input é proibida.',
    page: 18,
    script: {
      title: 'R10 · Proteção contra SQL Injection',
      file: 'sql-query.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Concatenação de string no comando SQL',
        '// db.query(`SELECT * FROM users WHERE email = "${email}"`);',
        '',
        '// ✅ Correção: Query parametrizada com placeholder seguro',
        'export async function buscarPorEmail(email: string) {',
        '  const query = "SELECT id, email, status FROM users WHERE email = $1";',
        '  return await pool.query(query, [email]);',
        '}'
      ],
      segments: [
        {
          // 0–3s — Gancho
          say: 'Se você montou esta query usando interpolação de strings, você acabou de entregar todo o seu banco para o cliente.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'email'
        },
        {
          // 3–10s — Criar curiosidade
          say: 'Você digita seu e-mail e faz login perfeitamente. O problema é quando alguém digita aspas, or um igual a um.',
          focus: [2, 2],
          mark: 'SELECT * FROM users'
        },
        {
          // 10–20s — Explicação
          say: 'O atacante quebra a sintaxe do comando e executa queries adicionais, roubando hashes de senha ou apagando tabelas inteiras.',
          focus: [2, 2],
          mark: 'WHERE email'
        },
        {
          // 20–30s — A correção
          say: 'A solução é usar queries parametrizadas com placeholders cifrão um ou um ORM com sanitização nativa.',
          type: [4, 8],
          focus: [6, 7],
          mark: '$1'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R dez é severidade crítica: proteção contra SQL Injection. Concatenação direta de input é estritamente proibida.',
          focus: [7, 7],
          mark: '[email]'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e se o atacante não injetar SQL no banco, e sim código JavaScript direto na tela dos seus outros usuários?',
          focus: [5, 6],
          mark: 'buscarPorEmail'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio, vamos analisar o perigo silencioso do XSS na regra R11. Acompanhe a série.',
          focus: [6, 7],
          mark: 'pool.query'
        }
      ]
    }
  },
  {
    id: 'audit-r11',
    ruleCode: 'R11',
    section: 'Validação e Sanitização',
    sectionNumber: 3,
    title: 'Proteção contra XSS',
    severity: 'ALTO',
    points: -10,
    summary: 'Conteúdo de utilizador renderizado na interface deve ser escapado ou sanitizado.',
    consequence: 'Roubo de cookies de sessão, sequestro de tela e execução de scripts maliciosos no navegador dos clientes.',
    promptParaIA: 'Revê o código à luz da regra R11 e garante: Conteúdo de utilizador renderizado na interface deve ser escapado ou sanitizado.',
    page: 19,
    script: {
      title: 'R11 · Proteção contra XSS',
      file: 'render-html.tsx',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: dangerouslySetInnerHTML sem sanitizar executa scripts',
        '// <div dangerouslySetInnerHTML={{ __html: userBio }} />',
        '',
        '// ✅ Correção: Sanitizar com DOMPurify antes de renderizar tags ricas',
        'import DOMPurify from "isomorphic-dompurify";',
        '',
        'export function ExibirBiografia({ bio }: { bio: string }) {',
        '  const htmlSeguro = DOMPurify.sanitize(bio);',
        '  return <div dangerouslySetInnerHTML={{ __html: htmlSeguro }} />;',
        '}'
      ],
      segments: [
        {
          // 0–3s — Gancho
          say: 'Se esta propriedade perigosa está no seu componente React, qualquer usuário pode sequestrar a sessão dos seus clientes.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'dangerouslySetInnerHTML'
        },
        {
          // 3–10s — Criar curiosidade
          say: 'Parece prático para exibir negrito e itálico na bio. Mas é exatamente assim que scripts maliciosos são injetados no navegador.',
          focus: [2, 2],
          mark: 'userBio'
        },
        {
          // 10–20s — Explicação
          say: 'Um invasor salva uma tag script no perfil e rouba cookies e tokens de quem visitar a página.',
          focus: [2, 2],
          mark: '__html'
        },
        {
          // 20–30s — A correção
          say: 'A correção é sanitizar o HTML com DOMPurify antes da renderização para eliminar tags de script e manipuladores de evento.',
          type: [4, 10],
          focus: [8, 9],
          mark: 'DOMPurify.sanitize'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R onze alerta: proteção contra XSS. Conteúdo de utilizador renderizado na interface deve ser escapado ou sanitizado.',
          focus: [9, 9],
          mark: 'htmlSeguro'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e se em vez de texto, o invasor enviar um arquivo executável camuflado como foto de perfil?',
          focus: [8, 8],
          mark: 'sanitize(bio)'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo vídeo, vamos ver como validar uploads por Magic Bytes na regra R12. Não perca.',
          focus: [7, 10],
          mark: 'ExibirBiografia'
        }
      ]
    }
  },
  {
    id: 'audit-r12',
    ruleCode: 'R12',
    section: 'Validação e Sanitização',
    sectionNumber: 3,
    title: 'Validação de upload (MIME + Magic Bytes)',
    severity: 'ALTO',
    points: -10,
    summary: 'O upload deve verificar o MIME Type declarado E os Magic Bytes do ficheiro. A extensão sozinha é insuficiente.',
    consequence: 'Arquivos executáveis camuflados como ponto png ou ponto jpg podem ser executados no servidor.',
    promptParaIA: 'Revê o código à luz da regra R12 e garante: O upload deve verificar o MIME Type declarado E os Magic Bytes do ficheiro. A extensão sozinha é insuficiente.',
    page: 20,
    script: {
      title: 'R12 · Validação de upload (MIME + Magic Bytes)',
      file: 'upload-validator.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Confiar apenas na extensão do nome do arquivo',
        '// if (file.name.endsWith(".png")) { aceitarUpload(); }',
        '',
        '// ✅ Correção: Ler a assinatura binária real dos primeiros bytes',
        'import { fileTypeFromBuffer } from "file-type";',
        '',
        'const MIMES_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];',
        '',
        'export async function validarArquivoUpload(buffer: Buffer) {',
        '  const tipoDetectado = await fileTypeFromBuffer(buffer);',
        '  if (!tipoDetectado || !MIMES_PERMITIDOS.includes(tipoDetectado.mime)) {',
        '    throw new Error("Arquivo inválido! Conteúdo não é uma imagem real.");',
        '  }',
        '  return tipoDetectado;',
        '}'
      ],
      segments: [
        {
          // 0–3s — Gancho
          say: 'Se o seu sistema de upload só confere a extensão do arquivo, um script malicioso pode rodar no seu servidor agora.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'endsWith(".png")'
        },
        {
          // 3–10s — Criar curiosidade
          say: 'Basta renomear um arquivo executável para foto ponto png e sua validação fraca deixa o cavalo de troia passar.',
          focus: [2, 2],
          mark: 'aceitarUpload'
        },
        {
          // 10–20s — Explicação
          say: 'Se o servidor tentar processar ou armazenar o arquivo em disco, esse executável camuflado pode assumir o controle da máquina.',
          focus: [2, 2],
          mark: 'file.name'
        },
        {
          // 20–30s — A correção
          say: 'A correção é inspecionar os Magic Bytes binários reais do cabeçalho com fileTypeFromBuffer.',
          type: [4, 15],
          focus: [9, 13],
          mark: 'fileTypeFromBuffer'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R doze exige: validação de upload conferindo o MIME Type declarado e os Magic Bytes do arquivo. A extensão sozinha é insuficiente.',
          focus: [7, 7],
          mark: 'MIMES_PERMITIDOS'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e se a imagem for apenas um link externo que rastreia os visitantes do seu app?',
          focus: [11, 12],
          mark: 'throw'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio investigamos a restrição de URLs de imagens na regra R13.',
          focus: [10, 14],
          mark: 'tipoDetectado'
        }
      ]
    }
  },
  {
    id: 'audit-r13',
    ruleCode: 'R13',
    section: 'Validação e Sanitização',
    sectionNumber: 3,
    title: 'Restrição de URLs externas em imagens',
    severity: 'MÉDIO',
    points: -5,
    summary: 'Campos de URL de imagem devem restringir-se ao próprio domínio. URLs externas revelam o IP dos utilizadores.',
    consequence: 'Vazamento limitado de IP e metadados dos visitantes do sistema para servidores de terceiros.',
    promptParaIA: 'Revê o código à luz da regra R13 e garante: Campos de URL de imagem devem restringir-se ao próprio domínio. URLs externas revelam o IP dos utilizadores.',
    page: 21,
    script: {
      title: 'R13 · Restrição de URLs externas em imagens',
      file: 'image-host-validator.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Permitir URLs de imagens de qualquer site arbitrário',
        '// const avatarUrl = req.body.avatarUrl; // vazamento de IP',
        '',
        '// ✅ Correção: Restringir exclusivamente ao domínio e CDN oficial',
        'const HOSTS_PERMITIDOS = ["cdn.meudominio.com", "storage.meudominio.com"];',
        '',
        'export function validarUrlAvatar(urlRecebida: string): string {',
        '  const parsed = new URL(urlRecebida);',
        '  if (!HOSTS_PERMITIDOS.includes(parsed.hostname)) {',
        '    throw new Error("URL de imagem deve pertencer ao CDN oficial do sistema.");',
        '  }',
        '  return parsed.toString();',
        '}'
      ],
      segments: [
        {
          // 0–3s — Gancho
          say: 'Se o seu avatar aceita URLs de qualquer site da internet, você pode estar entregando o IP dos seus usuários para terceiros.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'avatarUrl'
        },
        {
          // 3–10s — Criar curiosidade
          say: 'O navegador faz a requisição direta para o servidor externo para carregar a foto, revelando localização e endereço IP.',
          focus: [2, 2],
          mark: 'vazamento'
        },
        {
          // 10–20s — Explicação
          say: 'Atacantes usam isso como beacon invisível para monitorar quem acessa determinados perfis no seu aplicativo.',
          focus: [2, 2],
          mark: 'req.body.avatarUrl'
        },
        {
          // 20–30s — A correção
          say: 'Restrinja o carregamento apenas ao domínio e CDN oficial da sua aplicação, bloqueando hosts não autorizados.',
          type: [4, 13],
          focus: [5, 11],
          mark: 'HOSTS_PERMITIDOS'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R treze determina: campos de URL de imagem devem restringir-se ao próprio domínio.',
          focus: [9, 10],
          mark: 'parsed.hostname'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e se a URL tiver dez mil caracteres com parâmetros maliciosos escondidos na query string?',
          focus: [10, 10],
          mark: 'throw'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio analisamos o limite de tamanho de URL na regra R14.',
          focus: [7, 12],
          mark: 'validarUrlAvatar'
        }
      ]
    }
  },
  {
    id: 'audit-r14',
    ruleCode: 'R14',
    section: 'Validação e Sanitização',
    sectionNumber: 3,
    title: 'Limite de tamanho de URL',
    severity: 'MÉDIO',
    points: -5,
    summary: 'URLs do próprio domínio ainda precisam de limite de tamanho, incluindo as query strings.',
    consequence: 'Query strings abusivas podem sobrecarregar parsers de logs ou estourar buffers do servidor.',
    promptParaIA: 'Revê o código à luz da regra R14 e garante: URLs do próprio domínio ainda precisam de limite de tamanho, incluindo as query strings.',
    page: 22,
    script: {
      title: 'R14 · Limite de tamanho de URL',
      file: 'url-length.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Vulnerabilidade: Aceitar URLs de comprimento ilimitado nos endpoints',
        '// app.get("/busca", (req, res) => { ... }); // sem limite de query',
        '',
        '// ✅ Correção: Limite estrito de 2048 caracteres para prevenir estouro de buffer',
        'const LIMITE_MAX_URL = 2048;',
        '',
        'export function verificarComprimentoUrl(url: string) {',
        '  if (url.length > LIMITE_MAX_URL) {',
        '    throw new Error("414 URI Too Long: URL excede o tamanho seguro.");',
        '  }',
        '  return true;',
        '}'
      ],
      segments: [
        {
          // 0–3s — Gancho
          say: 'URLs gigantescas parecem inofensivas, mas podem derrubar balanceadores e estourar a memória dos logs.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'app.get'
        },
        {
          // 3–10s — Criar curiosidade
          say: 'Query strings abusivas exigem processamento pesado de buffers nos proxies reversos e servidores web.',
          focus: [2, 2],
          mark: 'busca'
        },
        {
          // 10–20s — Explicação
          say: 'Sem limites, requisições com dezenas de kilobytes de URL causam degradação e erros de memória.',
          focus: [2, 2],
          mark: 'sem limite'
        },
        {
          // 20–30s — A correção
          say: 'Configure limites explícitos de até dois mil e quarenta e oito caracteres e retorne o status 414 URI Too Long.',
          type: [4, 12],
          focus: [5, 10],
          mark: 'LIMITE_MAX_URL'
        },
        {
          // 30–40s — A regra
          say: 'A Regra R quatorze recomenda: URLs do próprio domínio ainda precisam de limite de tamanho, incluindo as query strings.',
          focus: [8, 10],
          mark: '414 URI Too Long'
        },
        {
          // 40–50s — Retenção final
          say: 'Mas e quando o usuário altera o ID no navegador e acessa o documento de outra pessoa?',
          focus: [7, 11],
          mark: 'url.length'
        },
        {
          // 50–60s — Continuidade
          say: 'No próximo episódio entramos na seção de Controle de Acesso com a temida regra R15 sobre IDOR. Acompanhe.',
          focus: [7, 11],
          mark: 'verificarComprimentoUrl'
        }
      ]
    }
  }
];
