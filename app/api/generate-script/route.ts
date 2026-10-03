import { NextRequest, NextResponse } from 'next/server';
import { Type, Schema } from '@google/genai';
import { normalizeAndRepairScript } from '@/lib/validation';
import { CodeScript, NarrativePreset, VideoDurationTarget, ScriptLanguage } from '@/types/script';
import { SCENE_PROMPT_DOC } from '@/lib/scene';
import {
  getResilientAIClient,
  PRIMARY_SCRIPT_MODEL,
  FALLBACK_SCRIPT_MODELS,
  extractErrorKeyMetadata,
  getPublicKeyPoolStatus,
} from '@/lib/geminiService';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SCENE_SCHEMA: Schema = {
  type: Type.OBJECT,
  description:
    'Cena visual explicativa detalhada (caixas, ícones e setas animadas no espaço virtual 160x90, com sincronia por palavra via campo "on").',
  properties: {
    title: {
      type: Type.STRING,
      description: 'Título curto e claro da cena visual sobre o conceito explicado neste trecho.',
    },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          kind: { type: Type.STRING, description: 'box (padrão), icon ou text' },
          x: { type: Type.NUMBER, description: 'Centro X entre 24 e 136' },
          y: {
            type: Type.NUMBER,
            description:
              'Centro Y entre 18 e 64 (NUNCA acima de 66, pois a faixa de y de 70 a 90 é estritamente reservada às legendas cinéticas)',
          },
          w: { type: Type.NUMBER },
          h: { type: Type.NUMBER },
          icon: { type: Type.STRING, description: 'Emoji representativo do elemento' },
          label: {
            type: Type.STRING,
            description: 'Rótulo principal curto do elemento (até 14 caracteres por linha; use \\n para quebrar)',
          },
          sub: { type: Type.STRING, description: 'Subtítulo explicativo curto abaixo do rótulo' },
          color: {
            type: Type.STRING,
            description: 'accent, blue, green, amber, rose, violet, cyan ou slate',
          },
          mono: { type: Type.BOOLEAN },
          size: { type: Type.NUMBER },
          on: {
            type: Type.STRING,
            description:
              'OBRIGATÓRIO: Uma palavra (ou frase curta de 2 palavras) copiada EXATAMENTE do campo "say" deste trecho que dispara a aparição deste nó quando falada.',
          },
          at: {
            type: Type.NUMBER,
            description: 'Opcional (use apenas se nenhuma palavra de "say" servir como "on"): momento entre 0.05 e 0.85',
          },
        },
        required: ['id', 'x', 'y', 'label', 'color', 'on'],
      },
    },
    arrows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          label: { type: Type.STRING, description: 'Verbo curto que descreve a ação ou relação' },
          color: { type: Type.STRING },
          dashed: { type: Type.BOOLEAN },
          on: {
            type: Type.STRING,
            description:
              'OBRIGATÓRIO: Palavra ou verbo copiado EXATAMENTE do campo "say" deste trecho que dispara a seta.',
          },
          at: { type: Type.NUMBER },
        },
        required: ['from', 'to', 'on'],
      },
    },
  },
  required: ['title', 'nodes'],
};

function getDurationGuidelines(duration: VideoDurationTarget = 60) {
  switch (duration) {
    case 30:
      return {
        segmentCountDesc: '4 a 5 segmentos dinâmicos e rápidos',
        wordsPerSegment: '10 a 16 palavras por trecho',
        totalWordsDesc: 'cerca de 65 a 85 palavras no total',
        estimatedSec: '30 segundos',
      };
    case 90:
      return {
        segmentCountDesc: '9 a 11 segmentos dinâmicos e fluidos',
        wordsPerSegment: '14 a 20 palavras por trecho',
        totalWordsDesc: 'cerca de 180 a 230 palavras no total',
        estimatedSec: '90 segundos',
      };
    case 60:
    default:
      return {
        segmentCountDesc: '6 a 8 segmentos dinâmicos e fluidos',
        wordsPerSegment: '12 a 18 palavras por trecho',
        totalWordsDesc: 'cerca de 120 a 160 palavras no total',
        estimatedSec: '60 segundos',
      };
  }
}

function getNarrativePresetInstructions(preset: NarrativePreset = 'tutorial'): string {
  switch (preset) {
    case 'auditoria':
      return `PRESET NARRATIVO ESCOLHIDO: AUDITORIA DE SEGURANÇA & CODE REVIEW
1. HOOK DE VULNERABILIDADE (Segmento 1): Destaque imediatamente uma fragilidade ou risco real de segurança no assunto (ex: "Seu sistema pode estar vulnerável se você ainda trata isso dessa forma."). Crie curiosidade técnica imediata SEM sensacionalismo vazio.
2. IMPACTO E VETOR DE ATAQUE (Segmento 2): Explique o motivo técnico exato pelo qual essa prática compromete a aplicação.
3. PAINEL DE AUDITORIA (Segmento 3): Apresente cena visual de auditoria ("SECURITY AUDIT" / "⚠️ REVIEW REQUIRED") com nós e conexões.
4. IMPLEMENTAÇÃO SEGURA (Segmentos centrais): Digite e explique a abordagem blindada e recomendada pela engenharia moderna.
5. REGRA PRÁTICA VISUAL (Segmento final): Contraste visual entre o que evitar (❌ nós "rose") e o que adotar (✅ nós "green"), fechando com verificação concluída.`;

    case 'erro':
      return `PRESET NARRATIVO ESCOLHIDO: ERRO COMUM E BUGFIX
1. HOOK DO ERRO SUTIL (Segmento 1): "Este código compila e passa nos testes, mas esconde uma armadilha clássica em produção..."
2. O SINTOMA INESPERADO (Segmento 2): Mostre o código problemático e por que ele engana o desenvolvedor.
3. A CAUSA RAIZ POR DENTRO (Segmentos intermediários): Cena visual com caixas "rose" dissecando o motivo interno (ex: race condition, mutação oculta, concorrência, tipos soltos).
4. A SOLUÇÃO ELEGANTE (Segmentos centrais): Digite a refatoração correta e resiliente com foco nas linhas alteradas.
5. ANTES VS DEPOIS (Segmento final): Comparativo visual definitivo destacando as boas práticas.`;

    case 'comparacao':
      return `PRESET NARRATIVO ESCOLHIDO: COMPARAÇÃO DE ABORDAGENS / TECH VS TECH
1. HOOK DO DILEMA (Segmento 1): "Qual abordagem escolher para o seu próximo deploy: Opção A ou Opção B?"
2. ABORDAGEM A (Segmentos iniciais): Apresente a primeira técnica, caso de uso e limitações.
3. ABORDAGEM B (Segmentos seguintes): Apresente a alternativa moderna ou complementar em código.
4. CENA COMPARATIVA VISUAL (Segmento central): CENA VISUAL COMPARATIVA com nós "rose"/"amber" à esquerda e "green" à direita, com nó central "VS" ou "≠" e setas tracejadas.
5. CRITÉRIO DE DECISÃO (Segmento final): Resumo pragmático de quando optar por cada uma na vida real.`;

    case 'curiosidade':
      return `PRESET NARRATIVO ESCOLHIDO: POR BAIXO DOS PANOS / CURIOSIDADE TÉCNICA
1. HOOK PROVOCATIVO (Segmento 1): "Você sabe o que o runtime realmente faz na memória quando essa função é executada?"
2. O QUE VEMOS VS REALIDADE (Segmento 2): Contraste a simplicidade aparente com o mecanismo interno.
3. ARQUITETURA INTERNA (Segmentos intermediários): Cena visual detalhada representando a pilha, heap, event loop, rede ou hardware.
4. GANHO DE PERFORMANCE (Segmentos finais): Como entender esse funcionamento evita gargalos e refatora seu código.
5. CONCLUSÃO DE ENGENHARIA (Segmento final): Ponto-chave memorável para o desenvolvedor.`;

    case 'tutorial':
    default:
      return `PRESET NARRATIVO ESCOLHIDO: TUTORIAL PASSO A PASSO
1. HOOK DIRETO AO PONTO (Segmento 1): Apresente sem enrolação a funcionalidade prática que vamos construir e a dor que ela resolve.
2. ESTRUTURA BASE (Segmentos iniciais): Digite e explique os imports, tipos e estrutura inicial essencial.
3. LÓGICA E CONSTRUÇÃO (Segmentos intermediários): Implemente o fluxo principal acompanhado de cena visual que mostre o fluxo de dados ou componentes.
4. EXECUÇÃO E RESULTADO (Penúltimo segmento): Demonstre a execução prática com a saída esperada ("output").
5. BOAS PRÁTICAS (Segmento final): Dica de ouro de manutenção e próximo passo arquitetural.`;
  }
}

/**
 * Builds the Gemini structured output schema according to the detected mode and target duration.
 */
function buildResponseSchema(
  mode: 'code' | 'concept' | 'auto',
  langCode: string,
  wordsDesc: string
): Schema {
  if (mode === 'concept') {
    return {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Título curto e direto sobre o conceito pedido (máx 35 caracteres).',
        },
        file: {
          type: Type.STRING,
          description: 'Nome simbólico do tópico (ex: virtualizacao.concept, servidor-vps.concept).',
        },
        lang: { type: Type.STRING, description: `Idioma da narração (${langCode}).` },
        code: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            'Deve ser [] (lista vazia) no modo conceitual. Proibido criar blocos de código irrelevantes ou fictícios.',
        },
        segments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              say: {
                type: Type.STRING,
                description: `Explicação teórica didática e fluida (${wordsDesc} para retenção rápida em vídeo curto).`,
              },
              scene: SCENE_SCHEMA,
              output: {
                type: Type.STRING,
                description: 'Opcional: resumo curto ou conclusão chave exibida no rodapé.',
              },
            },
            required: ['say', 'scene'],
          },
        },
      },
      required: ['title', 'file', 'lang', 'code', 'segments'],
    };
  }

  return {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Título curto e direto sobre o assunto (máx 35 caracteres).',
      },
      file: {
        type: Type.STRING,
        description: 'Nome do arquivo (ex: auth.ts, busca.py).',
      },
      lang: { type: Type.STRING, description: `Idioma da narração (${langCode}).` },
      code: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Linhas de código reais (ou [] se o tema for puramente conceitual).',
      },
      segments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            say: {
              type: Type.STRING,
              description: `Explicação didática, dinâmica e envolvente (${wordsDesc} para ritmo ideal de vídeo curto).`,
            },
            type: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: 'Opcional: [linhaInicial, linhaFinal] 1-indexado (máx 2 a 4 linhas por trecho). Omitir se code for [].',
            },
            focus: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: 'Opcional: [linhaInicial, linhaFinal] 1-indexado. Omitir se code for [].',
            },
            mark: {
              type: Type.STRING,
              description:
                'Opcional: trecho exato dentro das linhas em foco. Omitir se code for [].',
            },
            output: {
              type: Type.STRING,
              description: 'Opcional: saída exibida no console.',
            },
            scene: SCENE_SCHEMA,
          },
          required: ['say'],
        },
      },
    },
    required: ['title', 'file', 'lang', 'code', 'segments'],
  };
}


/**
 * Segments user-provided source code (`effectiveCode`) when the external AI endpoint
 * is temporarily unreachable, without ever inventing fake code templates.
 */
function buildFallbackFromUserCode(
  topicInput: string,
  codeInput: string,
  langCode: string = 'pt-BR'
): CodeScript {
  const cleanTopic = (topicInput || 'Explicação de Código').trim();
  const rawLines = codeInput
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l, idx, arr) => !(l.trim() === '' && (idx === 0 || idx === arr.length - 1)))
    .slice(0, 16);

  const lines = rawLines.length > 0 ? rawLines : ['console.log("OK");'];
  const total = lines.length;
  const segments: CodeScript['segments'] = [];
  const chunkSize = total <= 6 ? 1 : 2;

  for (let start = 1; start <= total; start += chunkSize) {
    const end = Math.min(total, start + chunkSize - 1);
    const snippet = lines.slice(start - 1, end).join(' ').trim();
    const tokenMatch = snippet.match(/\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b/);
    const markToken = tokenMatch ? tokenMatch[1] : undefined;

    segments.push({
      say:
        start === 1
          ? `Começamos analisando as primeiras linhas do código fornecido para entender a estrutura base de ${cleanTopic}.`
          : end === total
          ? `Concluímos a leitura nas linhas finais, verificando o retorno e o resultado da execução.`
          : `Avançamos para as linhas ${start} a ${end}, acompanhando a lógica implementada neste trecho.`,
      type: [start, end],
      focus: [start, end],
      ...(markToken ? { mark: markToken } : {}),
    });
  }

  return {
    title: cleanTopic.slice(0, 35),
    file: 'codigo.ts',
    lang: langCode,
    code: lines,
    segments,
  };
}

export async function POST(req: NextRequest) {
  let parsedBody: {
    prompt?: string;
    code?: string;
    topic?: string;
    model?: string;
    narrativePreset?: NarrativePreset;
    targetDuration?: VideoDurationTarget;
    language?: ScriptLanguage;
    images?: Array<{ mimeType?: string; data?: string; name?: string }>;
  } = {};
  try {
    const rawReq = await req.text();
    parsedBody = rawReq ? JSON.parse(rawReq) : {};
  } catch (parseReqErr) {
    console.error('[generate-script] Erro ao ler corpo da requisição:', parseReqErr);
    parsedBody = {};
  }

  const {
    prompt,
    code,
    topic,
    model: requestedModel,
    narrativePreset: rawPreset,
    targetDuration: rawDuration,
    language: rawLang,
    images: rawImages,
  } = parsedBody;

  const effectiveTopic = (topic || prompt || '').trim();
  const effectiveCode = (code || '').trim();

  const narrativePreset: NarrativePreset =
    rawPreset === 'auditoria' ||
    rawPreset === 'tutorial' ||
    rawPreset === 'erro' ||
    rawPreset === 'comparacao' ||
    rawPreset === 'curiosidade'
      ? rawPreset
      : 'tutorial';

  const targetDuration: VideoDurationTarget =
    rawDuration === 30 || rawDuration === 90 ? rawDuration : 60;

  const language: ScriptLanguage = rawLang === 'pt-PT' ? 'pt-PT' : 'pt-BR';
  const isPtPT = language === 'pt-PT';
  const langCode = isPtPT ? 'pt-PT' : 'pt-BR';

  const durationInfo = getDurationGuidelines(targetDuration);
  const narrativeInstructions = getNarrativePresetInstructions(narrativePreset);

  const validImages = Array.isArray(rawImages)
    ? rawImages
        .filter(
          (img) =>
            img &&
            typeof img.data === 'string' &&
            img.data.trim().length > 0 &&
            typeof img.mimeType === 'string' &&
            img.mimeType.startsWith('image/')
        )
        .map((img) => ({
          mimeType: img.mimeType!.trim(),
          data: img.data!.replace(/^data:[^;]+;base64,/, '').trim(),
          name: img.name || 'imagem',
        }))
    : [];

  if (!effectiveTopic && !effectiveCode && validImages.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Informe um assunto, código ou envie pelo menos uma imagem para gerar o roteiro.',
        message: 'Informe um assunto, código ou envie pelo menos uma imagem para gerar o roteiro.',
      },
      { status: 400 }
    );
  }

  // Detect conceptual mode inside POST using CONCEPT_RE
  const CONCEPT_RE =
    /^(o que (é|são|e|sao)|como funciona|para que serve|qual a diferen[çc]a|por que|explica|explique|entenda|conceito)|(\b(o que (é|são|e|sao)|como funciona|para que serve|qual a diferen[çc]a|por que usar|quando usar|vantagens|vps|m[áa]quina virtual|virtualiza[çc][ãa]o|hipervisor|cont[êe]iner|docker|kubernetes|servidor|hospedagem|dns|cdn|arquitetura|protocolo|microservi[çc]os|nuvem|cloud)\b)/i;
  const mode: 'code' | 'concept' | 'auto' = effectiveCode
    ? 'code'
    : validImages.length > 0
    ? 'auto'
    : CONCEPT_RE.test(effectiveTopic)
    ? 'concept'
    : 'auto';

  try {
    const ai = getResilientAIClient();
    if (!ai) {
      console.error('[generate-script] Nenhuma GEMINI_API_KEY configurada no servidor.');
      if (!effectiveCode) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Chave da API Gemini não configurada no ambiente. Configure GEMINI_API_KEY e tente novamente.',
            message: 'Chave da API Gemini não configurada no ambiente.',
          },
          { status: 503 }
        );
      }

      const fallbackScript = buildFallbackFromUserCode(effectiveTopic, effectiveCode, langCode);
      const repaired = normalizeAndRepairScript(fallbackScript).repairedScript || fallbackScript;
      return NextResponse.json({
        success: true,
        script: repaired,
        mode,
        modelUsed: 'motor-local-sincronizado',
        fallbackTriggered: true,
        originalModel: requestedModel || PRIMARY_SCRIPT_MODEL,
        repairedChanges: [],
      });
    }

    const langGuide = isPtPT
      ? 'A narração DEVE ser em Português de Portugal / Moçambique / PALOP (use construções naturais como: ecrã, ficheiro, utilizador, algoritmo, variável).'
      : 'A narração DEVE ser em Português do Brasil (use construções naturais como: tela, arquivo, usuário, código, terminal).';

    // Default code-explanation systemPrompt
    let systemPrompt = `Você é um diretor sênior de conteúdo educacional de tecnologia e engenharia de software no Soara. Sua missão é criar roteiros completos, altamente dinâmicos e visualmente ricos para vídeos explicativos em formato curto (Shorts, Reels, TikTok e YouTube), com duração alvo de ${durationInfo.estimatedSec} (${durationInfo.totalWordsDesc}).

${langGuide}

Sua saída DEVE ser exclusivamente um objeto JSON válido, sem qualquer delimitador Markdown (NÃO coloque \`\`\`json ou \`\`\`), sem introduções e sem texto fora do JSON.

Estrutura JSON obrigatória:
{
  "title": "título curto e direto sobre o tema pedido (máx 35 caracteres)",
  "file": "nome_do_arquivo.ext",
  "lang": "${langCode}",
  "code": [
    "linha 1 de código (ou [] se for explicação puramente conceitual)"
  ],
  "segments": [
    {
      "say": "Frase dinâmica, didática e envolvente (${durationInfo.wordsPerSegment}) para ritmo rápido de retenção.",
      "type": [1, 2],
      "focus": [1, 2],
      "mark": "trecho_exato_da_linha",
      "output": "opcional: valor resultante do trecho no console",
      "scene": {
        "title": "título da cena visual animada sobre o tema",
        "nodes": [],
        "arrows": []
      }
    }
  ]
}

DIRETRIZES DE RITMO, RETENÇÃO E ESTRUTURA PARA ${durationInfo.estimatedSec.toUpperCase()}:
1. REGRA DO GANCHO (0–3s): PROIBIDO começar o vídeo com frases passivas ou lentas como "Hoje vamos analisar...", "Vamos falar sobre..." ou "Neste vídeo vamos ver...". Comece com um gancho instigante adaptado ao tema, que prenda a atenção nos primeiros 3 segundos.
2. DURAÇÃO E SEGMENTAÇÃO: Gere exatamente ${durationInfo.segmentCountDesc}. Cada segmento deve ter ${durationInfo.wordsPerSegment} (aproximadamente 4 a 7 segundos por cena) para ritmo dinâmico e retenção alta em redes sociais.
3. ${narrativeInstructions}
4. SE O USUÁRIO ENVIAR UM ROTEIRO JÁ DIVIDIDO EM BLOCOS (com "NARRAÇÃO:" e "VISUAL:"): preserve fielmente as falas ("NARRAÇÃO") enviadas pelo usuário em cada segmento e converta cada descrição "VISUAL" em cenas animadas ("scene" com nós, ícones, cores e gatilhos "on" exatos) e linhas de código ("code").
5. Quando houver código ("code" não vazio), a contagem de linhas em "type" e "focus" é 1-indexada (1 até code.length) e cada segmento deve digitar no máximo 2 a 4 linhas para não sobrecarregar a tela. Se "code" for [], NÃO inclua "type", "focus" nem "mark".
6. "say" deve soar 100% natural, fluido e técnico para narração por voz sintetizada.
7. INCLUA PELO MENOS UMA CENA VISUAL COMPARATIVA usando caixas "rose" (❌) e "green" (✅) e setas tracejadas com "≠" ou "vs".
${SCENE_PROMPT_DOC}`;

    // When `mode === 'concept'`, completely overwrite `systemPrompt` so it focuses 100% on theoretical explanations and visual scenes
    if (mode === 'concept') {
      systemPrompt = `Você é um diretor sênior de ensino de tecnologia, infraestrutura e arquitetura de sistemas no Soara. Sua missão é criar roteiros visuais profundos e altamente didáticos que explicam CONCEITOS e TECNOLOGIAS exclusivamente por meio de explicações teóricas dinâmicas e cenas visuais animadas ("scene") sincronizadas palavra a palavra com a fala ("on"), com duração alvo de ${durationInfo.estimatedSec} (${durationInfo.totalWordsDesc}).

${langGuide}

Sua saída DEVE ser exclusivamente um objeto JSON válido, sem qualquer delimitador Markdown (NÃO coloque \`\`\`json ou \`\`\`), sem introduções e sem texto fora do JSON.

Estrutura JSON obrigatória para MODO CONCEITUAL:
{
  "title": "título curto e direto sobre o conceito pedido (máx 35 caracteres)",
  "file": "conceito.concept",
  "lang": "${langCode}",
  "code": [],
  "segments": [
    {
      "say": "Frase didática e envolvente (${durationInfo.wordsPerSegment}) explicando o passo do conceito.",
      "scene": {
        "title": "Conceito de Arquitetura",
        "nodes": [
          { "id": "n1", "x": 30, "y": 36, "icon": "💻", "label": "Cliente", "sub": "navegador", "color": "green", "on": "cliente" },
          { "id": "n2", "x": 80, "y": 36, "icon": "⚡", "label": "Serviço", "sub": "backend", "color": "violet", "on": "serviço" },
          { "id": "n3", "x": 130, "y": 36, "icon": "💾", "label": "Banco de dados", "sub": "persistência", "color": "blue", "on": "dados" }
        ],
        "arrows": [
          { "from": "n1", "to": "n2", "label": "requisita", "color": "green", "on": "requisita" },
          { "from": "n2", "to": "n3", "label": "consulta", "color": "violet", "on": "consulta" }
        ]
      }
    }
  ]
}

MODO CONCEITUAL (REGRAS OBRIGATÓRIAS — FOCO 100% EM TEORIA E CENAS VISUAIS SINCRONIZADAS):
1. O assunto é um CONCEITO ou TECNOLOGIA, não um código. Foque 100% em explicações teóricas detalhadas e claras.
2. PROIBIDO criar blocos de código irrelevantes ou inventados! Deixe "code" como [] (lista vazia) e NÃO use "type", "focus" nem "mark".
3. TODOS os segmentos ("segments") DEVEM incluir obrigatoriamente um objeto "scene" visual explicativo ou comparativo detalhado.
4. Gere exatamente ${durationInfo.segmentCountDesc} (${durationInfo.wordsPerSegment}), com transições rápidas a cada 4-7 segundos.
5. ${narrativeInstructions}
6. Todos os rótulos ("label", "sub", "title") devem falar especificamente do assunto pedido. Todos os nós devem ter y entre 18 e 64 (área y > 66 reservada para legendas).
7. Não afirme preços específicos, números arbitrários ou provedores de que você não tenha certeza.
${SCENE_PROMPT_DOC}`;
    }


    if (validImages.length > 0) {
      systemPrompt += `\n\nANÁLISE DE MÚLTIPLAS IMAGENS ENVIADAS (${validImages.length} imagem(ns)):
1. Analise minuciosamente todo o conteúdo visual presente em todas as imagens enviadas pelo usuário (mesmo que o usuário não tenha escrito nenhum texto).
2. SE HOUVER CÓDIGO-FONTE NAS IMAGENS (ex.: captura de tela de IDE, editor, terminal ou trecho de programação):
   - Transcreva fielmente o código visível nas imagens para o array "code" (linha por linha).
   - Explique detalhadamente cada parte desse código em "segments", sincronizando "type", "focus" e "mark" com as linhas extraídas e adicionando cenas visuais explicativas ("scene") sincronizadas por palavra ("on").
3. SE AS IMAGENS MOSTRAREM UM DIAGRAMA, ARQUITETURA, FLUXOGRAMA, SLIDE, TELA DE SISTEMA OU ILUSTRAÇÃO SEM CÓDIGO-FONTE:
   - Deixe "code": [] (lista vazia, sem inventar código fictício) e NÃO inclua "type", "focus" nem "mark".
   - Explique detalhadamente o conteúdo visual das imagens em todos os segmentos ("segments"), criando em CADA segmento uma cena visual animada ("scene") com nós e setas sincronizados por palavra ("on").
4. Se houver mais de uma imagem, conecte e explique o conteúdo de todas elas em uma sequência didática contínua.`;
    }

    const userMessage =
      validImages.length > 0
        ? effectiveTopic && effectiveCode
          ? `Analise as ${validImages.length} imagem(ns) anexada(s) junto com o código e o pedido abaixo para criar um roteiro explicativo detalhado (mínimo de 1 minuto, 8 a 12 segmentos, com cenas visuais sincronizadas por palavra via "on"):\n\nAssunto/Pedido: ${effectiveTopic}\n\nCódigo enviado:\n${effectiveCode}`
          : effectiveTopic
          ? `Analise as ${validImages.length} imagem(ns) anexada(s) e crie um roteiro explicativo detalhado (mínimo de 1 minuto, 8 a 12 segmentos, com cenas visuais sincronizadas por palavra via "on"). Se houver código na imagem, extraia-o para "code" e explique-o; se for conceitual/diagrama, use "code": [] e explique com cenas visuais.\n\nInstrução adicional do usuário: ${effectiveTopic}`
          : `O usuário enviou ${validImages.length} imagem(ns) sem texto adicional. Examine atentamente tudo o que aparece na(s) imagem(ns): se houver código-fonte na imagem, transcreva-o em "code" e explique linha por linha com cenas visuais; se for uma imagem conceitual, diagrama, arquitetura ou interface, mantenha "code": [] e crie um roteiro explicativo completo (mínimo de 1 minuto, 8 a 12 segmentos) explicando todo o conteúdo da(s) imagem(ns) com cenas visuais animadas sincronizadas por palavra ("on").`
        : mode === 'concept'
        ? `Explique o conceito: ${effectiveTopic}`
        : effectiveCode
        ? `Crie um roteiro explicativo detalhado (mínimo de 1 minuto, com 8 a 12 segmentos, incluindo cenas visuais teóricas sincronizadas por palavra com "on" e pelo menos uma cena visual comparativa) para o seguinte código:\n\n${effectiveCode}\n\nContexto / Assunto adicional: ${effectiveTopic}`
        : `Crie um roteiro explicativo detalhado (mínimo de 1 minuto, com 8 a 12 segmentos, explicações completas sem economizar palavras, incluindo cenas visuais animadas sincronizadas por palavra com "on" e pelo menos uma cena visual comparativa) sobre:\n\n${effectiveTopic}`;

    const requestContents =
      validImages.length > 0
        ? [
            ...validImages.map((img) => ({
              inlineData: {
                mimeType: img.mimeType,
                data: img.data,
              },
            })),
            { text: userMessage },
          ]
        : userMessage;

    const primary = requestedModel || PRIMARY_SCRIPT_MODEL;
    const fallbackList = [primary, ...FALLBACK_SCRIPT_MODELS].filter(
      (m, idx, arr) => arr.indexOf(m) === idx
    );

    const responseSchema = buildResponseSchema(mode, langCode, durationInfo.wordsPerSegment);
    let successfulModel = '';
    let responseText = '';
    let lastError: unknown = null;

    for (let i = 0; i < fallbackList.length; i++) {
      const modelCandidate = fallbackList[i];
      if (i > 0) {
        await sleep(700 * i);
      }

      try {
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents: requestContents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema,
            temperature: mode === 'concept' ? 0.2 : 0.35,
          },
        });

        if (response.text) {
          responseText = response.text;
          successfulModel = modelCandidate;
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        const keyMeta = extractErrorKeyMetadata(err);
        const keyLogLabel = keyMeta.keyMask
          ? ` [Chave API: ${keyMeta.keyMask} | 4 primeiros: "${keyMeta.keyPrefix4}" | 5 últimos: "${keyMeta.keySuffix5}"]`
          : '';
        console.warn(
          `[generate-script] Alternando após falha no modelo "${modelCandidate}"${keyLogLabel}:`,
          err instanceof Error ? err.message : String(err)
        );
        if (keyMeta.allKeysUnavailable) {
          break;
        }
      }
    }

    if (responseText) {
      const cleanJson = responseText
        .trim()
        .replace(/^```json/i, '')
        .replace(/^```/i, '')
        .replace(/```$/i, '')
        .trim();

      try {
        const parsed = JSON.parse(cleanJson);
        // In conceptual mode without user-supplied code, ensure no irrelevant code block was invented
        if (
          mode === 'concept' &&
          !effectiveCode &&
          validImages.length === 0 &&
          Array.isArray(parsed.code)
        ) {
          const joinedCode = parsed.code.join('\n');
          const hasInventedProgrammingCode =
            /\b(function|interface|const|let|var|class|def|import|export|return)\b/.test(
              joinedCode
            );
          if (hasInventedProgrammingCode || parsed.code.length > 6) {
            parsed.code = [];
          }
        }

        const repairResult = normalizeAndRepairScript(parsed);
        if (repairResult.valid && repairResult.repairedScript) {
          return NextResponse.json({
            success: true,
            script: repairResult.repairedScript,
            mode,
            modelUsed: successfulModel,
            fallbackTriggered: successfulModel !== primary,
            originalModel: primary,
            repairedChanges: repairResult.changes,
          });
        } else {
          console.warn(
            '[generate-script] Falha na validação do roteiro gerado:',
            repairResult.error
          );
        }
      } catch (jsonErr) {
        lastError = jsonErr;
        console.warn(
          '[generate-script] Falha no JSON.parse da resposta do Gemini:',
          jsonErr,
          cleanJson.slice(0, 300)
        );
      }
    }

    const keyMeta = extractErrorKeyMetadata(lastError);
    const errDetail = lastError instanceof Error ? lastError.message : String(lastError || '');
    const hasCooldownKeys =
      Array.isArray(keyMeta.failedKeys) &&
      keyMeta.failedKeys.some((k) => k.status === 'cooldown');
    const isPermissionDeniedErr =
      !hasCooldownKeys &&
      (errDetail.includes('PERMISSION_DENIED') ||
        errDetail.includes('denied access') ||
        keyMeta.allKeysUnavailable === true);

    const keySummary = keyMeta.keyMask
      ? `Chave com falha: ${keyMeta.keyMask} (4 primeiros: "${keyMeta.keyPrefix4}", 5 últimos: "${keyMeta.keySuffix5}")`
      : '';

    if (isPermissionDeniedErr || (!effectiveCode && (mode === 'concept' || mode === 'auto'))) {
      const waitHint =
        hasCooldownKeys && keyMeta.retryAfterSeconds
          ? ` Aguarde ${keyMeta.retryAfterSeconds}s ou reative as chaves em Configurações.`
          : '';
      const formattedError = isPermissionDeniedErr
        ? `Acesso negado (403 PERMISSION_DENIED). ${keySummary || 'Verifique o status das chaves.'}`
        : hasCooldownKeys
        ? `Limite temporário de requisições (429) atingido nas chaves atuais.${waitHint}`
        : keySummary
        ? `Falha ao gerar com a IA. ${keySummary}. Tente novamente.`
        : 'Falha ao gerar com a IA. Tente novamente.';

      const formattedMessage = errDetail
        ? `${formattedError} — ${errDetail.slice(0, 260)}`
        : formattedError;

      // Return HTTP 200 with success: false so Cloud Run / GFE never replaces the JSON with an HTML 403 Forbidden page
      return NextResponse.json(
        {
          success: false,
          error: formattedError,
          message: formattedMessage,
          errorType: isPermissionDeniedErr ? 'PERMISSION_DENIED' : 'SERVICE_UNAVAILABLE',
          apiKeyMask: keyMeta.keyMask || null,
          apiKeyFirst4: keyMeta.keyPrefix4 || null,
          apiKeyLast5: keyMeta.keySuffix5 || null,
          retryAfterSeconds: keyMeta.retryAfterSeconds || null,
          failedKeys: keyMeta.failedKeys || [],
          keyPool: getPublicKeyPoolStatus(),
          suggestion: keyMeta.keyMask
            ? `Identifique a chave que começa com "${keyMeta.keyPrefix4}" e termina com "${keyMeta.keySuffix5}" (${keyMeta.keyMask}).`
            : 'Tente novamente ou verifique as chaves configuradas.',
        },
        { status: 200 }
      );
    }

    // Only if the user explicitly provided their own source code (`effectiveCode`), segment their code locally
    const fallbackScript = buildFallbackFromUserCode(effectiveTopic, effectiveCode);
    const repairResult = normalizeAndRepairScript(fallbackScript);
    const finalFallback = repairResult.repairedScript || fallbackScript;

    return NextResponse.json({
      success: true,
      script: finalFallback,
      mode,
      modelUsed: `${primary} (Segmentação Local do Código Enviado)`,
      fallbackTriggered: true,
      originalModel: primary,
      repairedChanges: repairResult.changes,
    });
  } catch (err: unknown) {
    const keyMeta = extractErrorKeyMetadata(err);
    const keyLogLabel = keyMeta.keyMask
      ? ` [Chave API: ${keyMeta.keyMask} | 4 primeiros: "${keyMeta.keyPrefix4}" | 5 últimos: "${keyMeta.keySuffix5}"]`
      : '';
    console.warn(`[generate-script] Erro no endpoint POST${keyLogLabel}:`, err);

    const keySummary = keyMeta.keyMask
      ? ` Chave com falha: ${keyMeta.keyMask} (4 primeiros: "${keyMeta.keyPrefix4}", 5 últimos: "${keyMeta.keySuffix5}").`
      : '';

    if (!effectiveCode || keyMeta.keyMask) {
      return NextResponse.json(
        {
          success: false,
          error: `Falha ao gerar com a IA.${keySummary} Tente novamente.`,
          message: `Falha ao gerar com a IA.${keySummary} Tente novamente.`,
          apiKeyMask: keyMeta.keyMask || null,
          apiKeyFirst4: keyMeta.keyPrefix4 || null,
          apiKeyLast5: keyMeta.keySuffix5 || null,
          failedKeys: keyMeta.failedKeys || [],
          keyPool: getPublicKeyPoolStatus(),
        },
        { status: 200 }
      );
    }

    const fallbackScript = buildFallbackFromUserCode(effectiveTopic, effectiveCode);
    const repairResult = normalizeAndRepairScript(fallbackScript);
    const finalFallback = repairResult.repairedScript || fallbackScript;

    return NextResponse.json({
      success: true,
      script: finalFallback,
      mode,
      modelUsed: 'Segmentação Local do Código Enviado',
      fallbackTriggered: true,
      originalModel: requestedModel || PRIMARY_SCRIPT_MODEL,
      repairedChanges: repairResult.changes,
    });
  }
}
