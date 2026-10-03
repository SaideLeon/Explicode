import { SecurityAuditRuleItem } from '../securityAuditRules';

export const SECTION_8_RULES: SecurityAuditRuleItem[] = [
  {
    id: 'audit-ctf-r04',
    ruleCode: 'CTF-R04',
    section: 'CTF · Lógica de Jogo',
    sectionNumber: 8,
    title: 'Rejeitar valores fracionados onde não são permitidos',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Um input como 7.5 numa posição de jogo inteiro deve ser rejeitado explicitamente. Uma comparação falha aqui dá uma vantagem infinita.',
    consequence: 'Bypass de comparações lógicas que conferem apenas igualdades exatas, travando ou manipulando rankings e jogos.',
    promptParaIA: 'Revê o código à luz da regra CTF-R04 e garante: Um input como 7.5 numa posição de jogo inteiro deve ser rejeitado explicitamente. Uma comparação falha aqui dá uma vantagem infinita.',
    page: 42,
    script: {
      title: 'CTF-R04 · Rejeitar valores fracionados',
      file: 'game-input.ts',
      lang: 'pt-BR',
      code: [
        'import { z } from "zod";',
        '',
        '// ✅ Regra CTF-R04: Rejeitar números decimais em índices inteiros',
        'export const JogadaSchema = z.object({',
        '  posicao: z.number().int({ message: "Posição deve ser um número inteiro exato" }).min(0).max(8),',
        '  aposta: z.number().int().positive()',
        '});',
        '',
        'export function validarJogada(input: unknown) {',
        '  return JogadaSchema.parse(input);',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R zero quatro. Aceitar valores flutuantes ou quebrados em coordenadas que esperam inteiros quebra comparações lógicas.',
          type: [1, 5],
          focus: [4, 5],
          mark: 'int'
        },
        {
          say: 'Valide explicitamente que o valor seja inteiro antes de efetuar comparações de tabuleiro ou estado.',
          type: [7, 11],
          focus: [9, 11],
          mark: 'validarJogada'
        }
      ]
    }
  },
  {
    id: 'audit-ctf-r05',
    ruleCode: 'CTF-R05',
    section: 'CTF · Lógica de Jogo',
    sectionNumber: 8,
    title: 'Lógica de resultado exclusivamente no servidor',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'O resultado de jogos calculado no front-end, com semente baseada em timestamp, pode ser previsto. Toda lógica determinística deve estar no servidor.',
    consequence: 'Previsibilidade total: atacantes conseguem antecipar sorteios, cartas e números gerados no cliente.',
    promptParaIA: 'Revê o código à luz da regra CTF-R05 e garante: O resultado de jogos calculado no front-end, com semente baseada em timestamp, pode ser previsto. Toda lógica determinística deve estar no servidor.',
    page: 43,
    script: {
      title: 'CTF-R05 · Lógica de resultado no servidor',
      file: 'sorteio-server.ts',
      lang: 'pt-BR',
      code: [
        'import crypto from "node:crypto";',
        '',
        '// ✅ Regra CTF-R05: Gerar números aleatórios criptograficamente seguros no servidor',
        'export function calcularSorteioServidor(): number {',
        '  // Proibido usar Math.random() no front-end',
        '  return crypto.randomInt(1, 101);',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R zero cinco. Resultados de sorteios ou regras de jogos calculados no navegador do cliente podem ser lidos e alterados pelo DevTools.',
          type: [1, 4],
          focus: [3, 4],
          mark: 'crypto'
        },
        {
          say: 'Toda a lógica determinística e a geração aleatória com randomInt devem rodar com exclusividade no servidor.',
          type: [5, 7],
          focus: [6, 6],
          mark: 'randomInt'
        }
      ]
    }
  },
  {
    id: 'audit-ctf-r06',
    ruleCode: 'CTF-R06',
    section: 'CTF · Lógica de Jogo',
    sectionNumber: 8,
    title: 'Não expor chaves de criptografia no cliente',
    severity: 'CRÍTICO',
    points: -25,
    summary: 'Uma chave AES no JavaScript do cliente equivale a um dado em texto claro. Secrets e chaves devem existir apenas no servidor.',
    consequence: 'Ilusão de segurança: o atacante abre o código fonte do bundle JavaScript e descriptografa todas as mensagens.',
    promptParaIA: 'Revê o código à luz da regra CTF-R06 e garante: Uma chave AES no JavaScript do cliente equivale a um dado em texto claro. Secrets e chaves devem existir apenas no servidor.',
    page: 44,
    script: {
      title: 'CTF-R06 · Chaves nunca no cliente',
      file: 'crypto-storage.ts',
      lang: 'pt-BR',
      code: [
        '// ❌ Proibido: chave AES codificada no bundle front-end',
        '// const AES_KEY = "chave_secreta_123";',
        '',
        '// ✅ Regra CTF-R06: Criptografia e decifragem restritas ao backend seguro',
        'import { createCipheriv, createDecipheriv } from "node:crypto";',
        '',
        'export function decifrarNoServidor(payload: string) {',
        '  const chaveServidor = process.env.ENCRYPTION_MASTER_KEY!;// nunca sai daqui',
        '  return decifrar(payload, chaveServidor);',
        '}'
      ],
      segments: [
        {
          say: 'Regra CTF R zero seis. Colocar chaves simétricas dentro do JavaScript do navegador é o mesmo que deixar a porta aberta.',
          type: [1, 3],
          focus: [1, 2],
          mark: 'AES_KEY'
        },
        {
          say: 'Qualquer usuário consegue inspecionar o arquivo e recuperar a chave. Criptografia com chave privada pertence apenas ao servidor.',
          type: [4, 10],
          focus: [7, 9],
          mark: 'ENCRYPTION_MASTER_KEY'
        }
      ]
    }
  }
];
