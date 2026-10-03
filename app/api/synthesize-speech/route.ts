import { NextRequest, NextResponse } from 'next/server';
import { pcmToWavBuffer } from '@/lib/audio';
import {
  getResilientAIClient,
  extractGeminiKeysFromEnv,
  getPublicKeyPoolStatus,
  extractErrorKeyMetadata,
  TTS_MODELS,
} from '@/lib/geminiService';
import { parseGeminiErrorInfo } from '@/lib/aiErrors';

const VALID_GEMINI_VOICES = ['Puck', 'Charon', 'Fenrir', 'Zephyr', 'Aoede', 'Kore'] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET() {
  const keys = extractGeminiKeysFromEnv();
  if (keys.length === 0) {
    return NextResponse.json(
      {
        configured: false,
        status: 'MISSING_API_KEY',
        message: 'GEMINI_API_KEY não configurada no ambiente.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    configured: true,
    status: 'READY',
    keyPoolSize: keys.length,
    keyPool: getPublicKeyPoolStatus(),
    supportedVoices: VALID_GEMINI_VOICES,
    defaultVoice: 'Puck',
    models: TTS_MODELS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { text, voiceName: requestedVoice, language: requestedLang } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Texto para síntese não informado' },
        { status: 400 }
      );
    }

    const ai = getResilientAIClient();
    if (!ai) {
      return NextResponse.json(
        {
          error: 'Chave GEMINI_API_KEY não configurada no ambiente.',
          fallbackToBrowserSpeech: true,
          errorCode: 'NO_API_KEY',
        },
        { status: 500 }
      );
    }

    // Voice normalization: Puck, Charon, Fenrir, Zephyr, Aoede, Kore
    let voiceToUse: string = requestedVoice || 'Puck';
    if (!VALID_GEMINI_VOICES.includes(voiceToUse as (typeof VALID_GEMINI_VOICES)[number])) {
      voiceToUse = 'Puck';
    }

    const isPtPT = requestedLang === 'pt-PT';
    const styleInstruction = isPtPT
      ? 'Clear, natural, confident, articulate technical explainer in European Portuguese / Portugal & PALOP accent, fast dynamic pacing'
      : 'Clear, natural, confident, articulate technical explainer in Brazilian Portuguese, fast dynamic pacing';

    let audioBase64 = '';
    let lastError: unknown = null;
    let modelSucceeded = '';
    let isAccessDenied = false;

    for (let mIdx = 0; mIdx < TTS_MODELS.length; mIdx++) {
      const model = TTS_MODELS[mIdx];
      if (mIdx > 0) {
        await sleep(700);
      }

      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: text.trim(),
                  speechMetadata: {
                    style: styleInstruction,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceToUse,
                },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part && part.inlineData && part.inlineData.data) {
          const rawBuffer = Buffer.from(part.inlineData.data, 'base64');
          // If already a valid WAV with RIFF/WAVE header, use it directly; otherwise wrap PCM in WAV
          const isWav =
            rawBuffer.length > 12 &&
            rawBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
            rawBuffer.subarray(8, 12).toString('ascii') === 'WAVE';
          const wavBuffer = isWav ? rawBuffer : pcmToWavBuffer(rawBuffer, 24000, 1);
          audioBase64 = wavBuffer.toString('base64');
          modelSucceeded = model;
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        const keyMeta = extractErrorKeyMetadata(err);
        const info = parseGeminiErrorInfo(err, model);

        if (keyMeta.allKeysUnavailable) {
          isAccessDenied = info.isPermissionDenied && !info.isQuotaOrRateLimit;
          break;
        }

        if (info.isPermissionDenied) {
          isAccessDenied = true;
          break;
        }
      }

      if (audioBase64 || isAccessDenied) break;
    }

    if (!audioBase64) {
      const keyMeta = extractErrorKeyMetadata(lastError);
      const info = parseGeminiErrorInfo(lastError);
      const keyLabel = info.keyMask
        ? ` [Chave API: ${info.keyMask} | 4 primeiros: "${info.keyPrefix4}" | 5 últimos: "${info.keySuffix5}"]`
        : '';

      if (isAccessDenied) {
        return NextResponse.json(
          {
            success: false,
            error: `Acesso negado pela API do Gemini (403 PERMISSION_DENIED).${keyLabel}`,
            isAccessDenied: true,
            apiKeyMask: info.keyMask || null,
            apiKeyFirst4: info.keyPrefix4 || null,
            apiKeyLast5: info.keySuffix5 || null,
            failedKeys: keyMeta.failedKeys || [],
            keyPool: getPublicKeyPoolStatus(),
            details: info.rawMessage,
            message: info.userMessage,
            fallbackToBrowserSpeech: true,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: info.userMessage,
          errorType:
            info.quotaType === 'RPM' || info.quotaType === 'RPD'
              ? 'QUOTA_EXCEEDED'
              : 'SERVICE_UNAVAILABLE',
          apiKeyMask: info.keyMask || null,
          apiKeyFirst4: info.keyPrefix4 || null,
          apiKeyLast5: info.keySuffix5 || null,
          retryAfterSeconds: keyMeta.retryAfterSeconds || info.retrySeconds,
          failedKeys: keyMeta.failedKeys || [],
          keyPool: getPublicKeyPoolStatus(),
          isAccessDenied: false,
          fallbackToBrowserSpeech: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      audioUrl: `data:audio/wav;base64,${audioBase64}`,
      voiceUsed: voiceToUse,
      modelUsed: modelSucceeded,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno na síntese de áudio';
    return NextResponse.json(
      { error: message, fallbackToBrowserSpeech: false },
      { status: 500 }
    );
  }
}
