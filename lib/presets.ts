import { CodeScript } from '@/types/script';
import { SCENE_PROMPT_DOC } from '@/lib/scene';

export const PRESETS: { id: string; name: string; description: string; script: CodeScript }[] = [
  {
    id: 'r01-password-audit',
    name: 'R01 — Auditoria de Senhas: MD5 vs Argon2id (Security Audit)',
    description:
      'Roteiro estruturado em 6 etapas (Hook 0–3s, Consequência, Promessa, Demonstração, Regra Prática e Fecho) sobre por que MD5 é rápido demais e como usar Argon2id.',
    script: {
      title: 'R01 — Auditoria de Senhas (MD5 vs Argon2id)',
      file: 'r01-password-audit.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ ERRO COMUM: tratar senha como dado comum (rápido demais)',
        'const hashInseguro = md5(password);',
        '',
        '// ✅ REGRA R01: Password Hashing com custo deliberado (Argon2id)',
        'import argon2 from "argon2";',
        '',
        'export async function gerarHashSeguro(password: string) {',
        '  return await argon2.hash(password, {',
        '    type: argon2.argon2id,',
        '    memoryCost: 65536, // 64 MB por tentativa',
        '    timeCost: 3,       // 3 iterações deliberadas',
        '    parallelism: 4     // 4 threads',
        '  });',
        '}',
      ],
      segments: [
        {
          // [0–3s — HOOK]
          say: 'Se o seu sistema salva senhas usando MD5, pare. Temos um problema.',
          scene: {
            title: '0–3s · HOOK — Interrupção Técnica',
            nodes: [
              { id: 'pwd', x: 28, y: 40, w: 36, icon: '🔑', label: 'PASSWORD', sub: 'senha recebida', color: 'slate', on: 'senhas' },
              { id: 'md5', x: 80, y: 40, w: 36, icon: '⚡', label: 'MD5 → ???', sub: 'hash instantâneo', color: 'amber', on: 'MD5' },
              { id: 'bad', x: 132, y: 40, w: 36, icon: '❌', label: 'MD5 ❌', sub: 'pare agora', color: 'rose', on: 'problema' },
            ],
            arrows: [
              { from: 'pwd', to: 'md5', label: 'salva', color: 'amber', on: 'usando' },
              { from: 'md5', to: 'bad', label: 'risco', color: 'rose', on: 'pare' },
            ],
          },
        },
        {
          // [3–8s — CONSEQUÊNCIA]
          say: 'Não porque MD5 simplesmente quebra uma senha, mas porque ele é rápido demais para ser usado como proteção de senhas.',
          scene: {
            title: '3–8s · CONSEQUÊNCIA — Velocidade Excessiva',
            nodes: [
              { id: 'p1', x: 28, y: 29, w: 34, icon: '⚡', label: '"123456"', sub: 'testado', color: 'rose', mono: true, on: 'quebra' },
              { id: 'p2', x: 80, y: 29, w: 34, icon: '⚡', label: '"password"', sub: 'testado', color: 'rose', mono: true, on: 'senha' },
              { id: 'p3', x: 132, y: 29, w: 34, icon: '⚡', label: '"admin123"', sub: '...', color: 'rose', mono: true, on: 'rápido' },
              { id: 'warn', x: 80, y: 56, w: 58, icon: '⚠️', label: 'Rápido demais', sub: 'inadequado para proteger senhas', color: 'amber', on: 'proteção' },
            ],
            arrows: [
              { from: 'p1', to: 'p2', label: '0.001ms', color: 'rose', on: 'rápido' },
              { from: 'p2', to: 'p3', label: '0.001ms', color: 'rose', on: 'demais' },
            ],
          },
        },
        {
          // [8–15s — PROMESSA]
          say: 'E quando estou auditando uma aplicação criada com IA, essa é uma das primeiras coisas que eu verifico.',
          scene: {
            title: '8–15s · SECURITY AUDIT — R01 PASSWORD STORAGE',
            nodes: [
              { id: 'audit', x: 30, y: 40, w: 38, icon: '🛡️', label: 'SECURITY\nAUDIT', sub: 'app criada com IA', color: 'blue', on: 'auditando' },
              { id: 'rule', x: 80, y: 40, w: 40, icon: '📋', label: 'R01 — PASSWORD\nSTORAGE', sub: 'primeira verificação', color: 'violet', on: 'primeiras' },
              { id: 'status', x: 132, y: 40, w: 38, icon: '⚠️', label: '⚠️ REVIEW\nREQUIRED', sub: 'status atual', color: 'amber', on: 'verifico' },
            ],
            arrows: [
              { from: 'audit', to: 'rule', label: 'inspeciona', color: 'blue', on: 'aplicação' },
              { from: 'rule', to: 'status', label: 'status', color: 'amber', on: 'verifico' },
            ],
          },
        },
        {
          // [15–22s — O PROBLEMA (Código)]
          say: 'O erro começa quando tratamos uma senha como qualquer outro dado.',
          type: [1, 2],
          focus: [1, 2],
          mark: 'md5(password)',
          output: 'const hash = md5(password) // ❌ R01',
        },
        {
          // [22–28s — O PROBLEMA (Visual)]
          say: 'MD5 foi projetado para ser extremamente rápido. Para senhas, isso é justamente parte do problema.',
          focus: [2, 2],
          mark: 'md5',
          scene: {
            title: '15–28s · O PROBLEMA — Senha → MD5 → Hash',
            nodes: [
              { id: 's_in', x: 28, y: 40, w: 34, icon: '🔑', label: 'Senha', sub: 'dado sensível', color: 'slate', on: 'projetado' },
              { id: 's_md5', x: 80, y: 40, w: 36, icon: '⚡', label: 'MD5', sub: 'extremamente rápido', color: 'amber', on: 'rápido' },
              { id: 's_hash', x: 132, y: 40, w: 36, icon: '❌', label: 'Hash frágil', sub: 'parte do problema', color: 'rose', on: 'problema' },
            ],
            arrows: [
              { from: 's_in', to: 's_md5', label: 'trata comum', color: 'amber', on: 'extremamente' },
              { from: 's_md5', to: 's_hash', label: 'instantâneo', color: 'rose', on: 'problema' },
            ],
          },
        },
        {
          // [28–43s — POR QUE VELOCIDADE IMPORTA]
          say: 'Imagine que alguém consiga obter uma base de hashes. Um algoritmo rápido permite testar enormes quantidades de combinações em pouco tempo.',
          scene: {
            title: '28–43s · POR QUE VELOCIDADE IMPORTA — Contador Acelerando',
            nodes: [
              { id: 'cnt1', x: 26, y: 34, w: 30, icon: '1️⃣', label: '1 tentativa', sub: 'base obtida', color: 'slate', on: 'base' },
              { id: 'cnt2', x: 62, y: 34, w: 28, icon: '⏩', label: '1.000', sub: 'rápido', color: 'amber', on: 'rápido' },
              { id: 'cnt3', x: 98, y: 34, w: 30, icon: '🔥', label: '1.000.000', sub: 'acelerando', color: 'rose', on: 'enormes' },
              { id: 'cnt4', x: 134, y: 34, w: 34, icon: '💥', label: 'MUITAS\nTENTATIVAS', sub: 'em pouco tempo', color: 'rose', on: 'combinações' },
            ],
            arrows: [
              { from: 'cnt1', to: 'cnt2', label: '×1000', color: 'amber', on: 'algoritmo' },
              { from: 'cnt2', to: 'cnt3', label: '×1000', color: 'rose', on: 'quantidades' },
              { from: 'cnt3', to: 'cnt4', label: '...', color: 'rose', on: 'tempo' },
            ],
          },
        },
        {
          // [43–58s — A ALTERNATIVA]
          say: 'Por isso, senhas devem usar algoritmos específicos para password hashing, como Argon2.',
          type: [4, 14],
          focus: [7, 13],
          mark: 'argon2id',
          scene: {
            title: '43–58s · A ALTERNATIVA — MD5 ❌ ↓ Argon2id ✅',
            nodes: [
              { id: 'old_md5', x: 30, y: 28, w: 36, icon: '❌', label: 'MD5 ❌', sub: 'descartado', color: 'rose', on: 'senhas' },
              { id: 'new_argon', x: 30, y: 55, w: 36, icon: '✅', label: 'Argon2id ✅', sub: 'password hashing', color: 'green', on: 'Argon2' },
              { id: 'p_mem', x: 122, y: 25, w: 44, icon: '🧠', label: 'memory', sub: '64 MB por cálculo', color: 'cyan', mono: true, on: 'algoritmos' },
              { id: 'p_iter', x: 122, y: 42, w: 44, icon: '🔄', label: 'iterations', sub: 'múltiplas passagens', color: 'blue', mono: true, on: 'específicos' },
              { id: 'p_par', x: 122, y: 59, w: 44, icon: '⚙️', label: 'parallelism', sub: 'controle de threads', color: 'violet', mono: true, on: 'hashing' },
            ],
            arrows: [
              { from: 'old_md5', to: 'new_argon', label: '↓ migrar', color: 'green', on: 'Argon2' },
              { from: 'new_argon', to: 'p_iter', label: 'configura', color: 'cyan', on: 'hashing' },
            ],
          },
        },
        {
          // [58–73s — DIFERENÇA CONCEITUAL]
          say: 'A ideia não é simplesmente criar um hash diferente. É tornar cada tentativa de senha deliberadamente mais cara.',
          focus: [8, 12],
          mark: 'memoryCost',
          scene: {
            title: '58–73s · DIFERENÇA CONCEITUAL — Custo Deliberado',
            nodes: [
              { id: 'try1', x: 28, y: 40, w: 36, icon: '🧱', label: 'Tentativa 1', sub: '→ custo de RAM', color: 'amber', on: 'hash' },
              { id: 'try2', x: 80, y: 40, w: 36, icon: '🏋️', label: 'Tentativa 2', sub: '→ custo pesado', color: 'violet', on: 'tentativa' },
              { id: 'try3', x: 132, y: 40, w: 36, icon: '🛡️', label: 'Tentativa 3', sub: '→ deliberadamente cara', color: 'green', on: 'cara' },
            ],
            arrows: [
              { from: 'try1', to: 'try2', label: '+ lenta', color: 'amber', on: 'deliberadamente' },
              { from: 'try2', to: 'try3', label: '+ cara', color: 'green', on: 'cara' },
            ],
          },
        },
        {
          // [73–88s — AUDITORIA]
          say: 'Então, durante uma auditoria, eu não pergunto apenas: a senha está criptografada? Eu pergunto: como ela está sendo protegida?',
          scene: {
            title: '73–88s · AUDITORIA — Pergunta Insuficiente vs Auditoria Real',
            nodes: [
              { id: 'q_bad', x: 32, y: 40, w: 42, icon: '❌', label: 'Está protegida?', sub: '❌ pergunta insuficiente', color: 'rose', on: 'criptografada' },
              { id: 'q_alg', x: 124, y: 25, w: 46, icon: '🔍', label: 'Qual algoritmo?', sub: 'Argon2id / bcrypt', color: 'green', on: 'como' },
              { id: 'q_cfg', x: 124, y: 42, w: 46, icon: '⚙️', label: 'Qual configuração?', sub: 'memory + iterations', color: 'cyan', on: 'sendo' },
              { id: 'q_sto', x: 124, y: 59, w: 46, icon: '🗄️', label: 'Como é armazenado?', sub: 'hash + salt único', color: 'blue', on: 'protegida' },
            ],
            arrows: [
              { from: 'q_bad', to: 'q_cfg', label: 'auditar', color: 'green', dashed: true, on: 'protegida' },
            ],
          },
        },
        {
          // [88–102s — REGRA PRÁTICA]
          say: 'Uma regra simples: não armazene senhas em texto puro e não use hashes rápidos como MD5 ou SHA-256 diretamente para armazená-las.',
          scene: {
            title: '88–102s · REGRA PRÁTICA — O que Nunca Usar vs Padrão Seguro',
            nodes: [
              { id: 'r_plain', x: 30, y: 25, w: 40, icon: '❌', label: 'plaintext ❌', sub: 'texto puro', color: 'rose', on: 'puro' },
              { id: 'r_md5', x: 30, y: 42, w: 40, icon: '❌', label: 'MD5 ❌', sub: 'hash rápido', color: 'rose', on: 'MD5' },
              { id: 'r_sha', x: 30, y: 59, w: 40, icon: '❌', label: 'SHA-256 direto ❌', sub: 'sem custo de memória', color: 'rose', on: 'SHA-256' },
              { id: 'r_ok', x: 124, y: 42, w: 48, icon: '✅', label: 'Argon2id / bcrypt\nscrypt ✅', sub: 'proteção recomendada', color: 'green', on: 'armazená-las' },
            ],
            arrows: [
              { from: 'r_plain', to: 'r_ok', label: '≠', color: 'rose', dashed: true, on: 'puro' },
              { from: 'r_md5', to: 'r_ok', label: '≠', color: 'rose', dashed: true, on: 'MD5' },
              { from: 'r_sha', to: 'r_ok', label: '≠', color: 'rose', dashed: true, on: 'SHA-256' },
            ],
          },
        },
        {
          // [102–112s — CONCLUSÃO]
          say: 'Se você está criando uma aplicação com IA, não confunda código que funciona com código seguro.',
          scene: {
            title: '102–112s · CONCLUSÃO — IA Acelera, Você Audita',
            nodes: [
              { id: 'c_ai', x: 28, y: 40, w: 38, icon: '🤖', label: 'AI GENERATED\nCODE', sub: 'código que funciona', color: 'amber', on: 'IA' },
              { id: 'c_aud', x: 80, y: 40, w: 38, icon: '🛡️', label: 'SECURITY\nAUDIT', sub: 'revisão obrigatória', color: 'blue', on: 'confunda' },
              { id: 'c_prod', x: 132, y: 40, w: 38, icon: '🚀', label: 'PRODUCTION', sub: 'código seguro', color: 'green', on: 'seguro' },
            ],
            arrows: [
              { from: 'c_ai', to: 'c_aud', label: '↓ auditar', color: 'blue', on: 'funciona' },
              { from: 'c_aud', to: 'c_prod', label: '↓ aprovar', color: 'green', on: 'seguro' },
            ],
          },
        },
        {
          // [112–116s — FECHO]
          say: 'Essa foi a Regra R01. Antes do próximo deploy, audite a autenticação.',
          output: 'SECURITY AUDIT: R01 ✓ · Próxima: R02 →',
          scene: {
            title: '112–116s · FECHO — R01 Concluída',
            nodes: [
              { id: 'f_aud', x: 34, y: 40, w: 40, icon: '🛡️', label: 'SECURITY\nAUDIT', sub: 'checklist de deploy', color: 'blue', on: 'Regra' },
              { id: 'f_r01', x: 84, y: 40, w: 34, icon: '✅', label: 'R01 ✓', sub: 'autenticação auditada', color: 'green', on: 'R01' },
              { id: 'f_r02', x: 134, y: 52, w: 38, icon: '➡️', label: 'R02 → próxima\nverificação', sub: 'antes do deploy', color: 'slate', on: 'autenticação' },
            ],
            arrows: [
              { from: 'f_aud', to: 'f_r01', label: 'validado', color: 'green', on: 'deploy' },
              { from: 'f_r01', to: 'f_r02', label: 'próxima', color: 'slate', dashed: true, on: 'autenticação' },
            ],
          },
        },
      ],
    },
  },
  {
    id: 'jwt-auth-js',
    name: 'Autenticação com JWT (jsonwebtoken em Node.js)',
    description: 'Criação e verificação de JSON Web Token com chave secreta e expiração.',
    script: {
      title: 'Autenticação com JWT',
      file: 'jwt.js',
      lang: 'pt-BR',
      code: [
        "const jwt = require('jsonwebtoken');",
        '',
        'const usuario = {',
        '  id: 123,',
        '  nome: "Saíde"',
        '};',
        '',
        'const token = jwt.sign(usuario, "segredo-super-seguro", {',
        '  expiresIn: "1h"',
        '});',
        '',
        'console.log(token);',
        '',
        'const dados = jwt.verify(token, "segredo-super-seguro");',
        '',
        'console.log(dados);'
      ],
      segments: [
        {
          // CENA: o que é um JWT
          say: 'JWT significa JSON Web Token. Ele é uma forma de transportar informações sobre um utilizador de maneira assinada, muito usada em sistemas de autenticação.',
          type: [1, 1],
          focus: [1, 1],
          mark: 'jwt',
          scene: {
            title: 'O que é um JWT?',
            nodes: [
              { id: 'json', x: 28, y: 40, w: 36, icon: '📄', label: 'Dados em JSON', sub: 'id, nome', color: 'blue', on: 'informações' },
              { id: 'sign', x: 80, y: 40, w: 36, icon: '🔏', label: 'Assinatura', sub: 'chave secreta', color: 'amber', on: 'assinada' },
              { id: 'jwt', x: 132, y: 40, w: 36, icon: '🎫', label: 'JWT', sub: 'JSON Web Token', color: 'green', on: 'autenticação' },
            ],
            arrows: [
              { from: 'json', to: 'sign', label: 'assina', on: 'assinada' },
              { from: 'sign', to: 'jwt', label: 'autentica', on: 'sistemas' },
            ],
          },
        },
        {
          say: 'Aqui criamos um objeto chamado usuario contendo informações que queremos associar à sessão, como o ID e o nome.',
          type: [3, 6],
          focus: [3, 3],
          mark: 'usuario',
        },
        {
          say: 'A função jwt.sign pega esses dados, usa uma chave secreta para assiná-los e cria um token.',
          type: [8, 10],
          focus: [8, 8],
          mark: 'jwt.sign',
        },
        {
          // CENA: validade do token
          say: 'O parâmetro expiresIn define por quanto tempo o token será válido. Neste exemplo, ele expira depois de uma hora.',
          type: [8, 10],
          focus: [9, 9],
          mark: 'expiresIn',
          scene: {
            title: 'Validade do token',
            nodes: [
              { id: 'criado', x: 28, y: 40, w: 36, icon: '🎫', label: 'Token criado', sub: 'expiresIn: "1h"', color: 'green', on: 'expiresIn' },
              { id: 'tempo', x: 80, y: 40, w: 36, icon: '⏳', label: '1 hora', sub: 'token válido', color: 'amber', on: 'válido' },
              { id: 'expirado', x: 132, y: 40, w: 36, icon: '🚫', label: 'Expirado', sub: 'pede novo token', color: 'rose', on: 'expira' },
            ],
            arrows: [
              { from: 'criado', to: 'tempo', label: 'tempo passa', on: 'tempo' },
              { from: 'tempo', to: 'expirado', label: '1 hora', on: 'hora' },
            ],
          },
        },
        {
          // CENA: cliente envia o token
          say: 'Depois de criado, o token pode ser enviado pelo cliente nas requisições para provar que ele está autenticado.',
          type: [11, 12],
          focus: [12, 12],
          mark: 'token',
          scene: {
            title: 'Cliente envia o token',
            nodes: [
              { id: 'cliente', x: 28, y: 42, w: 34, icon: '💻', label: 'Cliente', sub: 'navegador ou app', color: 'blue', on: 'cliente' },
              { id: 'token', kind: 'icon', x: 80, y: 28, icon: '🎫', label: 'token', color: 'green', on: 'token' },
              { id: 'servidor', x: 132, y: 42, w: 34, icon: '🖥️', label: 'Servidor', sub: 'API', color: 'violet', on: 'requisições' },
            ],
            arrows: [
              { from: 'cliente', to: 'servidor', label: 'requisição + token', color: 'green', on: 'provar' },
            ],
          },
        },
        {
          say: 'No servidor, jwt.verify verifica a assinatura do token usando a mesma chave secreta e, se estiver válido, recupera os dados que foram armazenados nele.',
          type: [11, 16],
          focus: [14, 14],
          mark: 'jwt.verify',
          output: '{ id: 123, nome: "Saíde" }',
        },
        {
          // CENA: o ponto mais importante
          say: 'O ponto mais importante é entender que JWT não é uma senha nem uma sessão. É um comprovante assinado que o servidor consegue verificar sem precisar confiar cegamente nos dados enviados pelo cliente.',
          scene: {
            title: 'JWT não é senha nem sessão',
            nodes: [
              { id: 'senha', x: 30, y: 28, w: 36, icon: '🔑', label: 'Senha', sub: 'não é isso', color: 'rose', on: 'senha' },
              { id: 'sessao', x: 30, y: 54, w: 36, icon: '🗂️', label: 'Sessão', sub: 'não é isso', color: 'rose', on: 'sessão' },
              { id: 'jwt', x: 118, y: 41, icon: '🎫', label: 'Comprovante\nassinado', sub: 'servidor verifica assinatura', color: 'green', on: 'comprovante' },
            ],
            arrows: [
              { from: 'senha', to: 'jwt', label: '≠', color: 'rose', dashed: true, on: 'senha' },
              { from: 'sessao', to: 'jwt', label: '≠', color: 'rose', dashed: true, on: 'sessão' },
            ],
          },
        },
      ],
    },
  },
  {
    id: 'virtual-machine-concept',
    name: 'Como Funciona uma Máquina Virtual (Modo Conceitual)',
    description: 'Explicação 100% visual com sincronia por palavra sobre virtualização, hipervisores Tipo 1 vs Tipo 2 e VMs vs Contêineres.',
    script: {
      title: 'Como Funciona uma Máquina Virtual',
      file: 'virtualizacao.concept',
      lang: 'pt-BR',
      code: [],
      segments: [
        {
          say: 'Uma máquina virtual é um computador completo emulado por software dentro de outro computador físico. Ela possui processador, memória, disco e placas de rede virtuais, funcionando com total autonomia.',
          scene: {
            title: 'Conceito de Virtualização de Hardware',
            nodes: [
              { id: 'guest', x: 28, y: 31, icon: '💻', label: 'Máquina\nvirtual', sub: 'computador completo', color: 'green', on: 'máquina' },
              { id: 'engine', x: 80, y: 31, icon: '🧩', label: 'Software', sub: 'emulação', color: 'violet', on: 'software' },
              { id: 'host', x: 132, y: 31, icon: '🖥️', label: 'Computador\nfísico', sub: 'hardware real', color: 'slate', on: 'físico' },
              { id: 'cpu', kind: 'icon', x: 30, y: 57, icon: '⚙️', label: 'Processador', size: 3.4, color: 'blue', on: 'processador' },
              { id: 'ram', kind: 'icon', x: 63, y: 57, icon: '🧠', label: 'Memória', size: 3.4, color: 'cyan', on: 'memória' },
              { id: 'disk', kind: 'icon', x: 96, y: 57, icon: '💾', label: 'Disco', size: 3.4, color: 'amber', on: 'disco' },
              { id: 'net', kind: 'icon', x: 129, y: 57, icon: '🌐', label: 'Rede virtual', size: 3.4, color: 'rose', on: 'placas' },
            ],
            arrows: [
              { from: 'guest', to: 'engine', label: 'emulada', color: 'violet', on: 'emulado' },
              { from: 'engine', to: 'host', label: 'dentro de', color: 'slate', on: 'dentro' },
            ],
          },
        },
        {
          say: 'A mágica acontece graças ao hipervisor, o software responsável por gerenciar e fatiar o hardware real. Ele distribui os recursos físicos com segurança entre múltiplos sistemas operacionais hóspedes simultâneos.',
          scene: {
            title: 'O Papel Central do Hipervisor',
            nodes: [
              { id: 'hyp', x: 80, y: 41, icon: '🧠', label: 'Hipervisor', sub: 'gerencia e fatia', color: 'violet', on: 'hipervisor' },
              { id: 'hw', x: 26, y: 41, icon: '🖥️', label: 'Hardware\nreal', sub: 'CPU, RAM, disco', color: 'slate', on: 'hardware' },
              { id: 'vm1', x: 134, y: 28, icon: '📦', label: 'VM 1', sub: 'SO hóspede', color: 'green', on: 'múltiplos' },
              { id: 'vm2', x: 134, y: 55, icon: '📦', label: 'VM 2', sub: 'SO hóspede', color: 'cyan', on: 'simultâneos' },
            ],
            arrows: [
              { from: 'hw', to: 'hyp', label: 'fatiado em', color: 'slate', on: 'fatiar' },
              { from: 'hyp', to: 'vm1', label: 'distribui', color: 'green', on: 'distribui' },
              { from: 'hyp', to: 'vm2', label: 'seguro', color: 'cyan', on: 'segurança' },
            ],
          },
        },
        {
          say: 'Existem dois tipos principais de hipervisor na indústria tecnológica moderna. O Tipo 1 roda direto no hardware sem intermediários, enquanto o Tipo 2 executa em cima de um sistema operacional convencional.',
          scene: {
            title: 'Hipervisores Tipo 1 versus Tipo 2',
            nodes: [
              { id: 't1_head', kind: 'text', x: 40, y: 19, label: 'TIPO 1 · direto no hardware', size: 3.6, color: 'green', on: 'Tipo 1' },
              { id: 't1_vm', x: 40, y: 30, label: 'Máquinas virtuais', size: 3.2, color: 'green', on: 'intermediários', h: 11 },
              { id: 't1_hyp', x: 40, y: 43, label: 'Hipervisor', size: 3.2, color: 'violet', on: 'roda', h: 11 },
              { id: 't1_hw', x: 40, y: 56, label: 'Hardware', size: 3.2, color: 'slate', on: 'hardware', h: 11 },
              { id: 'vs', kind: 'text', x: 80, y: 42, label: 'VS', size: 7, color: 'rose', on: 'enquanto' },
              { id: 't2_head', kind: 'text', x: 120, y: 19, label: 'TIPO 2 · sobre um SO', size: 3.6, color: 'amber', on: 'Tipo 2' },
              { id: 't2_vm', x: 120, y: 27.5, label: 'Máquinas virtuais', size: 3.2, color: 'green', on: 'convencional', h: 11 },
              { id: 't2_hyp', x: 120, y: 39, label: 'Hipervisor', size: 3.2, color: 'violet', on: 'cima', h: 11 },
              { id: 't2_os', x: 120, y: 50.5, label: 'Sistema operacional', size: 3.2, color: 'amber', on: 'sistema', h: 11 },
              { id: 't2_hw', x: 120, y: 62, label: 'Hardware', size: 3.2, color: 'slate', on: 'executa', h: 11 },
            ],
            arrows: [],
          },
        },
        {
          say: 'Cada máquina virtual opera em isolamento absoluto das demais no mesmo servidor. Se uma máquina convidada travar ou sofrer uma invasão, as outras instâncias vizinhas continuam seguras e totalmente operacionais.',
          scene: {
            title: 'Barreira Rígida de Isolamento',
            nodes: [
              { id: 'wall', x: 80, y: 40, w: 30, h: 40, icon: '🧱', label: 'Isolamento', sub: 'hipervisor', color: 'amber', on: 'isolamento' },
              { id: 'vm_bad', x: 28, y: 40, icon: '💥', label: 'VM atacada', sub: 'travou ou invadida', color: 'rose', on: 'travar' },
              { id: 'vm_safe', x: 134, y: 40, icon: '✅', label: 'VMs vizinhas', sub: 'seguras', color: 'green', on: 'vizinhas' },
            ],
            arrows: [
              { from: 'vm_bad', to: 'wall', label: 'invasão', color: 'rose', dashed: true, on: 'invasão' },
              { from: 'wall', to: 'vm_safe', label: 'contida', color: 'green', on: 'seguras' },
            ],
          },
        },
        {
          say: 'Outra vantagem crucial é a capacidade de criar snapshots e migrar instâncias completas. Podemos congelar o estado exato da memória e do disco, transferindo a máquina entre servidores sem perda de dados.',
          scene: {
            title: 'Snapshots e Migração Dinâmica',
            nodes: [
              { id: 'snap', x: 28, y: 30, icon: '📸', label: 'Snapshot', sub: 'foto da VM', color: 'blue', on: 'snapshots' },
              { id: 'state', x: 80, y: 30, icon: '🧊', label: 'Estado\ncongelado', sub: 'memória + disco', color: 'cyan', on: 'congelar' },
              { id: 'dest', x: 132, y: 30, icon: '🖥️', label: 'Outro\nservidor', sub: 'VM retomada', color: 'green', on: 'servidores' },
              { id: 'safe', x: 80, y: 58, icon: '🛡️', label: 'Sem perda de dados', color: 'amber', on: 'perda', kind: 'icon' },
            ],
            arrows: [
              { from: 'snap', to: 'state', label: 'congela', color: 'cyan', on: 'congelar' },
              { from: 'state', to: 'dest', label: 'transfere', color: 'green', on: 'transferindo' },
            ],
          },
        },
        {
          say: 'Toda a computação em nuvem moderna foi construída sobre a base sólida da virtualização. Provedores globais como AWS e Google Cloud particionam supercomputadores em instâncias menores alugadas para empresas no mundo todo.',
          scene: {
            title: 'A Infraestrutura da Nuvem Pública',
            nodes: [
              { id: 'datacenter', x: 28, y: 30, icon: '🏢', label: 'Datacenter', sub: 'supercomputadores', color: 'slate', on: 'supercomputadores' },
              { id: 'hyper_cloud', x: 80, y: 30, icon: '🧠', label: 'Hipervisor', sub: 'particiona', color: 'violet', on: 'particionam' },
              { id: 'ec2', x: 132, y: 30, icon: '📦', label: 'Instâncias', sub: 'menores e alugáveis', color: 'green', on: 'instâncias' },
              { id: 'cloud', kind: 'icon', x: 26, y: 58, icon: '☁️', label: 'Nuvem', size: 3.4, color: 'cyan', on: 'nuvem' },
              { id: 'aws', kind: 'icon', x: 62, y: 58, icon: '🟧', label: 'AWS', size: 3.4, color: 'amber', on: 'AWS' },
              { id: 'gcp', kind: 'icon', x: 98, y: 58, icon: '🔷', label: 'Google Cloud', size: 3.4, color: 'blue', on: 'Google' },
              { id: 'firms', kind: 'icon', x: 134, y: 58, icon: '🏬', label: 'Empresas', size: 3.4, color: 'rose', on: 'empresas' },
            ],
            arrows: [
              { from: 'datacenter', to: 'hyper_cloud', label: 'divide', color: 'violet', on: 'particionam' },
              { from: 'hyper_cloud', to: 'ec2', label: 'aluga', color: 'green', on: 'alugadas' },
            ],
          },
        },
        {
          say: 'Porém, a virtualização completa exige recursos pesados do computador hospedeiro. Cada máquina virtual carrega seu próprio sistema operacional inteiro, consumindo gigabytes de memória RAM e sobrecarga constante de processamento na emulação.',
          scene: {
            title: 'O Custo Operacional da Emulação',
            nodes: [
              { id: 'host_cost', kind: 'icon', x: 80, y: 58, icon: '🖥️', label: 'Hospedeiro sobrecarregado', size: 3.4, color: 'amber', on: 'recursos' },
              { id: 'os_cost', x: 28, y: 31, icon: '💿', label: 'SO inteiro', sub: 'em cada VM', color: 'amber', on: 'sistema operacional' },
              { id: 'ram_cost', x: 80, y: 31, icon: '🧠', label: 'Gigabytes\nde RAM', sub: 'memória', color: 'rose', on: 'gigabytes' },
              { id: 'overhead', x: 132, y: 31, icon: '🔥', label: 'Sobrecarga', sub: 'emulação', color: 'rose', on: 'sobrecarga' },
            ],
            arrows: [
              { from: 'os_cost', to: 'ram_cost', label: 'consome', color: 'amber', on: 'consumindo' },
              { from: 'ram_cost', to: 'overhead', label: 'e ainda', color: 'rose', on: 'constante' },
            ],
          },
        },
        {
          say: 'É comum confundir máquinas virtuais com contêineres, mas a arquitetura é radicalmente distinta. Enquanto a máquina virtual replica um sistema operacional inteiro, o contêiner compartilha o kernel hospedeiro com muito mais leveza.',
          scene: {
            title: 'Comparativo: VM versus Contêiner',
            nodes: [
              { id: 'vm_ideal', x: 36, y: 27, icon: '💻', label: 'Máquina virtual', sub: 'pesada', color: 'amber', on: 'virtuais' },
              { id: 'cont', x: 124, y: 27, icon: '📦', label: 'Contêiner', sub: 'leve', color: 'green', on: 'contêineres' },
              { id: 'neq', kind: 'text', x: 80, y: 27, label: '≠', size: 10, color: 'rose', on: 'distinta' },
              { id: 'vm_detail', x: 36, y: 51, label: 'App + SO inteiro', sub: 'um SO por VM', size: 3.4, color: 'amber', on: 'replica' },
              { id: 'cont_detail', x: 124, y: 51, label: 'App + kernel do host', sub: 'kernel compartilhado', size: 3.4, color: 'green', on: 'kernel' },
              { id: 'light', kind: 'text', x: 124, y: 64, label: 'muito mais leveza', size: 3.4, color: 'green', on: 'leveza' },
            ],
            arrows: [
              { from: 'vm_ideal', to: 'vm_detail', label: 'replica', color: 'amber', dashed: true, on: 'replica' },
              { from: 'cont', to: 'cont_detail', label: 'compartilha', color: 'green', on: 'compartilha' },
            ],
          },
        },
        {
          say: 'Portanto, use máquinas virtuais quando precisar de isolamento rigoroso de hardware ou kernels diferentes. Elas continuam sendo a espinha dorsal indispensável para segurança corporativa e infraestrutura crítica em ambientes em nuvem.',
          scene: {
            title: 'Quando Escolher Máquinas Virtuais',
            nodes: [
              { id: 'security', x: 28, y: 31, icon: '🛡️', label: 'Isolamento\nrigoroso', sub: 'hardware separado', color: 'green', on: 'isolamento' },
              { id: 'any_os', x: 80, y: 31, icon: '🐧', label: 'Kernels\ndiferentes', sub: 'Linux, Windows...', color: 'cyan', on: 'kernels' },
              { id: 'enterprise', x: 132, y: 31, icon: '🏦', label: 'Segurança\ncorporativa', sub: 'infra crítica', color: 'violet', on: 'corporativa' },
              { id: 'final_summary', x: 80, y: 58, icon: '☁️', label: 'Espinha dorsal da nuvem', color: 'amber', on: 'espinha' },
            ],
            arrows: [
              { from: 'security', to: 'final_summary', color: 'green', on: 'continuam' },
              { from: 'any_os', to: 'final_summary', color: 'cyan', on: 'dorsal' },
              { from: 'enterprise', to: 'final_summary', color: 'violet', on: 'indispensável' },
            ],
          },
        },
      ],
    },
  },
  {
    id: 'sum-for-js',
    name: 'Somando uma lista com for (JavaScript)',
    description: 'Função clássica de acumulação percorrendo um array com laço for...of.',
    script: {
      title: 'Somando uma lista com for',
      file: 'calcular-total.js',
      lang: 'pt-BR',
      code: [
        'function calcularTotal(precos) {',
        '  let total = 0;',
        '  for (const preco of precos) {',
        '    total += preco;',
        '  }',
        '  return total;',
        '}',
        '',
        'console.log(calcularTotal([10, 20, 30]));'
      ],
      segments: [
        {
          say: 'Vamos criar uma função chamada calcularTotal. Ela recebe uma lista de preços como parâmetro.',
          type: [1, 1],
          focus: [1, 1],
          mark: 'calcularTotal',
        },
        {
          say: 'Dentro dela, inicializamos a variável total com zero para guardar o acumulado.',
          type: [2, 2],
          focus: [2, 2],
          mark: 'total',
        },
        {
          say: 'Depois, percorremos cada preço da lista usando um laço for...of bem limpo.',
          type: [3, 3],
          focus: [3, 3],
          mark: 'for',
        },
        {
          say: 'A cada iteração, somamos o valor do preço atual ao nosso total acumulado.',
          type: [4, 5],
          focus: [4, 4],
          mark: '+=',
        },
        {
          say: 'Ao final do laço, devolvemos o total calculado usando o return.',
          type: [6, 7],
          focus: [6, 6],
          mark: 'return',
        },
        {
          say: 'Agora chamamos a função com dez, vinte e trinta. O resultado impresso é sessenta.',
          type: [8, 9],
          focus: [9, 9],
          mark: 'calcularTotal',
          output: '60',
        },
      ],
    },
  },
  {
    id: 'binary-search-python',
    name: 'Busca Binária (Python)',
    description: 'Algoritmo eficiente O(log n) dividindo o espaço de busca pela metade.',
    script: {
      title: 'Busca Binária em Python',
      file: 'busca_binaria.py',
      lang: 'pt-BR',
      code: [
        'def busca_binaria(arr, alvo):',
        '    inicio, fim = 0, len(arr) - 1',
        '    while inicio <= fim:',
        '        meio = (inicio + fim) // 2',
        '        if arr[meio] == alvo:',
        '            return meio',
        '        elif arr[meio] < alvo:',
        '            inicio = meio + 1',
        '        else:',
        '            fim = meio - 1',
        '    return -1',
        '',
        'print(busca_binaria([1, 3, 5, 7, 9], 7))'
      ],
      segments: [
        {
          say: 'A busca binária encontra um elemento em uma lista ordenada com complexidade logarítmica.',
          type: [1, 1],
          focus: [1, 1],
          mark: 'busca_binaria',
        },
        {
          say: 'Definimos dois ponteiros: início na primeira posição e fim na última.',
          type: [2, 2],
          focus: [2, 2],
          mark: 'inicio, fim',
        },
        {
          say: 'Enquanto o início não ultrapassar o fim, calculamos o índice do meio.',
          type: [3, 4],
          focus: [4, 4],
          mark: '// 2',
        },
        {
          say: 'Se o elemento do meio for igual ao alvo procurado, retornamos seu índice imediatamente!',
          type: [5, 6],
          focus: [5, 6],
          mark: 'return meio',
        },
        {
          say: 'Se for menor, descartamos a metade esquerda movendo o início para frente.',
          type: [7, 8],
          focus: [7, 8],
          mark: 'inicio = meio + 1',
        },
        {
          say: 'Caso contrário, descartamos a metade direita ajustando o ponteiro fim.',
          type: [9, 11],
          focus: [10, 10],
          mark: 'fim = meio - 1',
        },
        {
          say: 'Testando com a lista de um a nove procurando o sete, encontramos na posição três.',
          type: [12, 13],
          focus: [13, 13],
          mark: 'busca_binaria',
          output: '3',
        },
      ],
    },
  },
  {
    id: 'async-await-js',
    name: 'Async / Await com Tratamento de Erros (JS)',
    description: 'Consumo moderno de APIs HTTP com fetch e bloco try/catch.',
    script: {
      title: 'Consumindo API com Async/Await',
      file: 'buscar-usuario.js',
      lang: 'pt-BR',
      code: [
        'async function buscarUsuario(id) {',
        '  try {',
        '    const res = await fetch(`/api/usuarios/${id}`);',
        '    if (!res.ok) throw new Error("Falha na rede");',
        '    const dados = await res.json();',
        '    return dados.nome;',
        '  } catch (erro) {',
        '    console.error("Erro capturado:", erro.message);',
        '    return "Visitante";',
        '  }',
        '}',
        '',
        'buscarUsuario(42).then(console.log);'
      ],
      segments: [
        {
          say: 'Para trabalhar com operações assíncronas de forma legível, usamos a palavra-chave async.',
          type: [1, 1],
          focus: [1, 1],
          mark: 'async',
        },
        {
          say: 'Envolvemos a requisição em um bloco try para capturar qualquer falha ou erro de conexão.',
          type: [2, 2],
          focus: [2, 2],
          mark: 'try',
        },
        {
          say: 'Com o await, pausamos a execução até a resposta da requisição fetch chegar.',
          type: [3, 4],
          focus: [3, 3],
          mark: 'await fetch',
        },
        {
          say: 'Em seguida, convertemos o corpo da resposta em JSON e retornamos o nome do usuário.',
          type: [5, 6],
          focus: [5, 6],
          mark: 'res.json()',
        },
        {
          say: 'Se algo falhar, o bloco catch captura a exceção e retorna um valor padrão seguro.',
          type: [7, 11],
          focus: [7, 9],
          mark: 'catch',
        },
        {
          say: 'Chamando nossa função com o ID 42, recebemos com sucesso o nome do usuário.',
          type: [12, 13],
          focus: [13, 13],
          mark: 'buscarUsuario',
          output: '"Mariana Silva"',
        },
      ],
    },
  },
  {
    id: 'react-use-effect',
    name: 'React: Hook useEffect com Cleanup (TS)',
    description: 'Efeito colateral com listener de redimensionamento e limpeza ao desmontar.',
    script: {
      title: 'Hook useEffect com Função de Limpeza',
      file: 'useWindowWidth.ts',
      lang: 'pt-BR',
      code: [
        'function useWindowWidth() {',
        '  const [largura, setLargura] = useState(window.innerWidth);',
        '  useEffect(() => {',
        '    const aoRedimensionar = () => setLargura(window.innerWidth);',
        '    window.addEventListener("resize", aoRedimensionar);',
        '    return () => {',
        '      window.removeEventListener("resize", aoRedimensionar);',
        '    };',
        '  }, []);',
        '  return largura;',
        '}'
      ],
      segments: [
        {
          say: 'Criamos um Hook customizado para monitorar a largura da janela em tempo real.',
          type: [1, 2],
          focus: [2, 2],
          mark: 'useState',
        },
        {
          say: 'O useEffect permite registrar efeitos colaterais após o componente ser montado.',
          type: [3, 3],
          focus: [3, 3],
          mark: 'useEffect',
        },
        {
          say: 'Adicionamos um ouvinte para o evento de resize da janela do navegador.',
          type: [4, 5],
          focus: [5, 5],
          mark: 'addEventListener',
        },
        {
          say: 'Muito importante: retornamos uma função de limpeza para remover o ouvinte e evitar vazamento de memória!',
          type: [6, 8],
          focus: [7, 7],
          mark: 'removeEventListener',
        },
        {
          say: 'Com o array de dependências vazio, o efeito roda apenas uma vez na montagem.',
          type: [9, 11],
          focus: [9, 9],
          mark: '[]',
          output: '1920 px',
        },
      ],
    },
  },
  {
    id: 'sql-join-query',
    name: 'Consulta SQL com JOIN e Agrupamento (SQL)',
    description: 'Cruzamento de clientes e pedidos com cálculo de total gasto.',
    script: {
      title: 'Cruzando tabelas com SQL JOIN',
      file: 'relatorio_vendas.sql',
      lang: 'pt-BR',
      code: [
        'SELECT',
        '  clientes.nome,',
        '  COUNT(pedidos.id) AS total_pedidos,',
        '  SUM(pedidos.valor) AS valor_total',
        'FROM clientes',
        'INNER JOIN pedidos ON clientes.id = pedidos.cliente_id',
        'WHERE pedidos.status = "pago"',
        'GROUP BY clientes.id, clientes.nome',
        'ORDER BY valor_total DESC;'
      ],
      segments: [
        {
          say: 'Queremos um relatório com o total de pedidos e o valor investido por cada cliente.',
          type: [1, 4],
          focus: [2, 4],
          mark: 'COUNT',
        },
        {
          say: 'Partimos da tabela de clientes e conectamos aos pedidos com INNER JOIN.',
          type: [5, 6],
          focus: [6, 6],
          mark: 'INNER JOIN',
        },
        {
          say: 'Filtramos apenas as vendas aprovadas com status igual a pago.',
          type: [7, 7],
          focus: [7, 7],
          mark: 'pago',
        },
        {
          say: 'Agrupamos os registros por cliente para somar os totais corretamente.',
          type: [8, 8],
          focus: [8, 8],
          mark: 'GROUP BY',
        },
        {
          say: 'Por fim, ordenamos do maior faturamento para o menor.',
          type: [9, 9],
          focus: [9, 9],
          mark: 'ORDER BY',
          output: 'Ana: 12 pedidos, R$ 4.580',
        },
      ],
    },
  },
];

export const AI_PROMPT_TEMPLATE = `Você é um diretor sênior de ensino de programação e cria roteiros detalhados para vídeos educativos de código em português do Brasil, com duração mínima de 1 minuto (60 a 90 segundos).
Responda somente com JSON válido, sem Markdown (\`\`\`json) e sem texto antes ou depois, neste formato exato:
{
  "title": "título curto e direto do vídeo",
  "file": "nome-do-arquivo.ext",
  "lang": "pt-BR",
  "code": [
    "uma string por linha de código, preservando identação exata"
  ],
  "segments": [
    {
      "say": "explicação detalhada, didática e completa de 2 a 3 frases (22 a 38 palavras por trecho), sem ser econômico nas explicações",
      "type": [linhaInicial, linhaFinal],
      "focus": [linhaInicial, linhaFinal],
      "mark": "trecho exato de código contido nas linhas em foco para ser destacado e pulsado",
      "output": "opcional: resultado ou valor impresso no console neste trecho",
      "scene": {
        "title": "opcional: cena visual animada para explicar teoria, fluxo ou comparação",
        "nodes": [],
        "arrows": []
      }
    }
  ]
}

Regras obrigatórias de profundidade, retenção narrativa e didática visual:
1. ESTRUTURA NARRATIVA DE 6 ETAPAS (PROIBIDO começar com "Hoje vamos analisar..." ou "Vamos falar sobre..."):
   - [0–3s — HOOK / INTERRUPÇÃO TÉCNICA]: Apresente imediatamente uma contradição, risco técnico real ou descoberta técnica que faça o desenvolvedor pensar "espera, será que o meu projeto faz isso?" (ex.: "Se o seu sistema salva senhas usando MD5, pare. Temos um problema." ou "Seu código pode estar funcionando perfeitamente… e ainda assim estar armazenando senhas de forma insegura."). Evite exageros sensacionalistas como "seu sistema será hackeado".
   - [3–8s — CONSEQUÊNCIA]: Explique tecnicamente por que isso é um problema na prática.
   - [8–15s — PROMESSA / AUDITORIA]: Conecte com a revisão técnica e auditoria de código (especialmente código gerado com IA).
   - [15–90s — DEMONSTRAÇÃO E CONCEITO]: Mostre o problema no código, por que acontece, a alternativa correta e a diferença conceitual passo a passo.
   - [90–110s — REGRA PRÁTICA E CONCLUSÃO]: Contraste o que evitar (❌) com o que usar (✅) e reforce: "não confunda código que funciona com código seguro".
   - [110–116s — FECHO / PRÓXIMA AÇÃO]: Fechamento direto incentivando a auditoria antes do próximo deploy.
2. NÃO seja econômico nas explicações! Gere entre 8 e 12 segmentos ("segments") ricos em detalhes.
3. Intercale explicações com animações visuais ("scene" com caixas, ícones e setas animadas sincronizadas por palavra via "on") e demonstrações do código ("type", "focus", "mark").
4. Inclua obrigatoriamente pelo menos uma cena visual comparativa (usando caixas "rose" ❌ e "green" ✅ e setas tracejadas com "≠" ou "vs").
5. A contagem de linhas de código inicia em 1. Todas as linhas de "code" devem ser reveladas gradualmente ao longo dos trechos no campo "type".
6. Se "mark" for fornecido, a substring deve existir literalmente dentro das linhas de "focus".
${SCENE_PROMPT_DOC}
Tema solicitado: `;
