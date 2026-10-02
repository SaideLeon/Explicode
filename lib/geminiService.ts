import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  isRateLimitOrQuotaError,
  parseGeminiErrorInfo,
  maskApiKey,
  sanitizeKeyFromMessage,
} from '@/lib/aiErrors';

export const PRIMARY_SCRIPT_MODEL = 'gemini-2.5-flash';
export const FALLBACK_SCRIPT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
] as const;
export const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'] as const;

export type GeminiKeyStatus = 'active' | 'cooldown' | 'disabled';

export interface PublicKeyState {
  keyMask: string; // Strictly 4 first + "..." + 5 last chars (never full key)
  prefix4: string;
  suffix5: string;
  status: GeminiKeyStatus;
  errorCode: number | null;
  retryAfterSeconds: number;
  cooldownTotalSeconds: number;
  lastError: string | null;
}

export interface EnrichedKeyError extends Error {
  keyMask?: string;
  keyPrefix4?: string;
  keySuffix5?: string;
  allKeysUnavailable?: boolean;
  retryAfterSeconds?: number;
  failedKeys?: {
    keyMask: string;
    prefix4: string;
    suffix5: string;
    status: GeminiKeyStatus;
    errorCode: number | null;
    retryAfterSeconds: number;
    message: string;
  }[];
}

interface InternalKeyRecord {
  keyMask: string;
  prefix4: string;
  suffix5: string;
  status: GeminiKeyStatus;
  errorCode: number | null;
  cooldownUntil: number; // epoch ms (0 when not in cooldown)
  cooldownTotalSeconds?: number;
  modelCooldowns?: Record<string, number>; // per-model cooldownUntil epoch ms
  lastError: string | null;
  removed?: boolean;
}

const STATE_FILE_PATH = path.join(os.tmpdir(), 'gemini-key-pool-state-v2.json');

interface PersistedPoolFile {
  records: Record<string, InternalKeyRecord>;
  extraKeys?: string[]; // Optional server-stored keys added via /api/keys
}

// Keep state in globalThis so Next.js hot reloads in dev preserve 403/429 states
const globalForKeys = globalThis as unknown as {
  __geminiRotationCounter?: number;
  __geminiClientCache?: Map<string, GoogleGenAI>;
  __geminiKeyRecords?: Map<string, InternalKeyRecord>;
  __geminiExtraServerKeys?: Set<string>;
  __geminiStateLoaded?: boolean;
};

const clientCache =
  globalForKeys.__geminiClientCache ??
  (globalForKeys.__geminiClientCache = new Map<string, GoogleGenAI>());

const keyRecords =
  globalForKeys.__geminiKeyRecords ??
  (globalForKeys.__geminiKeyRecords = new Map<string, InternalKeyRecord>());

const extraServerKeys =
  globalForKeys.__geminiExtraServerKeys ??
  (globalForKeys.__geminiExtraServerKeys = new Set<string>());

function loadPersistedStateOnce(): void {
  if (globalForKeys.__geminiStateLoaded) return;
  globalForKeys.__geminiStateLoaded = true;
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as PersistedPoolFile;
      if (parsed && parsed.records && typeof parsed.records === 'object') {
        for (const [mask, rec] of Object.entries(parsed.records)) {
          if (rec && typeof rec === 'object') {
            keyRecords.set(mask, rec);
          }
        }
      }
      if (Array.isArray(parsed?.extraKeys)) {
        parsed.extraKeys.forEach((k) => {
          if (typeof k === 'string' && k.trim().length > 9) {
            extraServerKeys.add(k.trim());
          }
        });
      }
    }
  } catch {
    // Ignore file read errors
  }
}

function savePersistedState(): void {
  try {
    const recordsObj: Record<string, InternalKeyRecord> = {};
    keyRecords.forEach((val, mask) => {
      recordsObj[mask] = val;
    });
    const payload: PersistedPoolFile = {
      records: recordsObj,
      extraKeys: Array.from(extraServerKeys),
    };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // Ignore file write errors
  }
}

/**
 * Splits a raw env string by comma, semicolon, newline, or whitespace,
 * strips quotes, and filters out invalid short tokens.
 */
function parseKeyTokens(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n\s]+/)
    .map((token) => token.trim().replace(/^["']|["']$/g, ''))
    .filter((token) => token.length > 9 && token !== 'MY_GEMINI_API_KEY');
}

/**
 * Extracts and deduplicates all configured Gemini API keys from the server environment
 * plus any keys registered on the server via /api/keys.
 */
export function extractGeminiKeysFromEnv(): string[] {
  loadPersistedStateOnce();
  const collected: string[] = [];

  // 1. GEMINI_API_KEYS
  collected.push(...parseKeyTokens(process.env.GEMINI_API_KEYS));

  // 2. GEMINI_API_KEY
  collected.push(...parseKeyTokens(process.env.GEMINI_API_KEY));

  // 3. Numbered keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_KEY_1, ...)
  const numberedEntries: { index: number; value: string }[] = [];
  for (const [envKey, envVal] of Object.entries(process.env)) {
    const match = envKey.match(/^GEMINI_(?:API_)?KEY_(\d+)$/i);
    if (match && envVal) {
      numberedEntries.push({ index: parseInt(match[1], 10), value: envVal });
    }
  }
  numberedEntries
    .sort((a, b) => a.index - b.index)
    .forEach((entry) => {
      collected.push(...parseKeyTokens(entry.value));
    });

  // 4. Server-registered extra keys
  extraServerKeys.forEach((k) => {
    collected.push(k);
  });

  const uniqueKeys = Array.from(new Set(collected));

  // Ensure every key has an initialized record in keyRecords (keyed by maskApiKey)
  const activePool: string[] = [];
  for (const fullKey of uniqueKeys) {
    const mask = maskApiKey(fullKey);
    const existing = keyRecords.get(mask);
    if (existing?.removed) {
      continue;
    }
    if (!existing) {
      keyRecords.set(mask, {
        keyMask: mask,
        prefix4: fullKey.slice(0, 4),
        suffix5: fullKey.slice(-5),
        status: 'active',
        errorCode: null,
        cooldownUntil: 0,
        lastError: null,
      });
    }
    activePool.push(fullKey);
  }

  return activePool;
}

/**
 * Refreshes cooldown expiration for a key record and returns its current effective status.
 */
function getEffectiveKeyRecord(fullKey: string): InternalKeyRecord {
  loadPersistedStateOnce();
  const mask = maskApiKey(fullKey);
  let rec = keyRecords.get(mask);
  if (!rec) {
    rec = {
      keyMask: mask,
      prefix4: fullKey.slice(0, 4),
      suffix5: fullKey.slice(-5),
      status: 'active',
      errorCode: null,
      cooldownUntil: 0,
      lastError: null,
    };
    keyRecords.set(mask, rec);
  }

  // If cooldown has expired, transition automatically back to 'active'
  if (rec.status === 'cooldown' && rec.cooldownUntil > 0 && Date.now() >= rec.cooldownUntil) {
    rec.status = 'active';
    rec.cooldownUntil = 0;
    rec.cooldownTotalSeconds = 0;
    rec.errorCode = null;
    rec.lastError = null;
    savePersistedState();
  }

  return rec;
}

/**
 * Returns the public, sanitized status list of all keys on the server
 * (only 4 first and 5 last characters — never the full key).
 */
export function getPublicKeyPoolStatus(): PublicKeyState[] {
  const keys = extractGeminiKeysFromEnv();
  const now = Date.now();

  return keys.map((fullKey) => {
    const rec = getEffectiveKeyRecord(fullKey);
    const retryAfterSeconds =
      rec.status === 'cooldown' && rec.cooldownUntil > now
        ? Math.max(1, Math.ceil((rec.cooldownUntil - now) / 1000))
        : 0;

    return {
      keyMask: rec.keyMask,
      prefix4: rec.prefix4,
      suffix5: rec.suffix5,
      status: rec.status,
      errorCode: rec.errorCode,
      retryAfterSeconds,
      cooldownTotalSeconds:
        rec.status === 'cooldown'
          ? Math.max(retryAfterSeconds, rec.cooldownTotalSeconds || retryAfterSeconds || 60)
          : 0,
      lastError: rec.lastError,
    };
  });
}

/**
 * Server-side actions to manage keys by their masked ID (`XXXX...YYYYY`) or add new server keys.
 */
export function addServerApiKeys(rawInput: string): PublicKeyState[] {
  loadPersistedStateOnce();
  const parsed = parseKeyTokens(rawInput);
  for (const fullKey of parsed) {
    const mask = maskApiKey(fullKey);
    extraServerKeys.add(fullKey);
    keyRecords.set(mask, {
      keyMask: mask,
      prefix4: fullKey.slice(0, 4),
      suffix5: fullKey.slice(-5),
      status: 'active',
      errorCode: null,
      cooldownUntil: 0,
      lastError: null,
      removed: false,
    });
  }
  savePersistedState();
  return getPublicKeyPoolStatus();
}

export function updateKeyStatusByMask(
  keyMask: string,
  action: 'activate' | 'disable' | 'remove'
): PublicKeyState[] {
  loadPersistedStateOnce();
  // Ensure records are populated
  extractGeminiKeysFromEnv();
  const rec = keyRecords.get(keyMask);
  if (rec) {
    if (action === 'activate') {
      rec.status = 'active';
      rec.errorCode = null;
      rec.cooldownUntil = 0;
      rec.cooldownTotalSeconds = 0;
      rec.modelCooldowns = {};
      rec.lastError = null;
      rec.removed = false;
    } else if (action === 'disable') {
      rec.status = 'disabled';
      rec.cooldownUntil = 0;
      rec.cooldownTotalSeconds = 0;
    } else if (action === 'remove') {
      rec.removed = true;
      rec.status = 'disabled';
      // Also remove from extraServerKeys if present
      extraServerKeys.forEach((k) => {
        if (maskApiKey(k) === keyMask) {
          extraServerKeys.delete(k);
        }
      });
    }
    savePersistedState();
  }
  return getPublicKeyPoolStatus();
}

export function reactivateAllCooldownKeys(): PublicKeyState[] {
  loadPersistedStateOnce();
  extractGeminiKeysFromEnv();
  keyRecords.forEach((rec) => {
    if (!rec.removed && rec.status === 'cooldown') {
      rec.status = 'active';
      rec.errorCode = null;
      rec.cooldownUntil = 0;
      rec.cooldownTotalSeconds = 0;
      rec.modelCooldowns = {};
      rec.lastError = null;
    }
  });
  savePersistedState();
  return getPublicKeyPoolStatus();
}

function getOrCreateRawClient(apiKey: string): GoogleGenAI {
  const existing = clientCache.get(apiKey);
  if (existing) return existing;

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  clientCache.set(apiKey, client);
  return client;
}

function isPermissionOrInvalidKeyError(err: unknown): boolean {
  if (!err) return false;
  const status =
    (err as { status?: number; code?: number })?.status ??
    (err as { code?: number })?.code;
  if (status === 403 || status === 401) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('permission_denied') ||
    msg.includes('denied access') ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('403')
  );
}

/**
 * Extracts the masked key metadata from an enriched error.
 */
export function extractErrorKeyMetadata(err: unknown): {
  keyMask?: string;
  keyPrefix4?: string;
  keySuffix5?: string;
  allKeysUnavailable?: boolean;
  retryAfterSeconds?: number;
  failedKeys?: EnrichedKeyError['failedKeys'];
} {
  if (!err || typeof err !== 'object') return {};
  const e = err as EnrichedKeyError;
  return {
    keyMask: e.keyMask,
    keyPrefix4: e.keyPrefix4,
    keySuffix5: e.keySuffix5,
    allKeysUnavailable: e.allKeysUnavailable,
    retryAfterSeconds: e.retryAfterSeconds,
    failedKeys: e.failedKeys,
  };
}

/**
 * Creates a resilient Proxy around GoogleGenAI that:
 * - Rotates across AVAILABLE ('active') keys only
 * - NEVER retries a key marked 'disabled' (403 PERMISSION_DENIED)
 * - NEVER retries a key marked 'cooldown' (429 RESOURCE_EXHAUSTED) until its Retry-After / RetryInfo timer expires
 * - Automatically transitions 1 -> 429 (cooldown) -> 2 -> 429 (cooldown) -> 3 -> 403 (disabled) -> 4 -> OK (active)
 * - Scrubs full keys so only `XXXX...YYYYY` (4 primeros + 5 últimos) is ever logged or returned
 */
export function createResilientAIClient(keys: string[]): GoogleGenAI {
  if (keys.length === 0) {
    throw new Error('Nenhuma chave GEMINI_API_KEY configurada no ambiente do servidor.');
  }

  const counter = globalForKeys.__geminiRotationCounter ?? 0;
  globalForKeys.__geminiRotationCounter = counter + 1;
  const startIndex = counter % keys.length;
  const baseClient = getOrCreateRawClient(keys[startIndex]);

  const executeWithKeyFailover = async <T>(
    operation: (client: GoogleGenAI) => Promise<T>,
    targetModel?: string
  ): Promise<T> => {
    const failedKeys: NonNullable<EnrichedKeyError['failedKeys']> = [];
    const now = Date.now();
    const modelKey = targetModel || 'default';

    // Collect keys that are NOT 'disabled' (403) and NOT in cooldown for this specific model
    const availableKeys: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const candidate = keys[(startIndex + i) % keys.length];
      const rec = getEffectiveKeyRecord(candidate);

      if (rec.status === 'disabled') {
        failedKeys.push({
          keyMask: rec.keyMask,
          prefix4: rec.prefix4,
          suffix5: rec.suffix5,
          status: 'disabled',
          errorCode: rec.errorCode || 403,
          retryAfterSeconds: 0,
          message: 'Chave desativada (403 PERMISSION_DENIED)',
        });
        continue;
      }

      const modelUntil = rec.modelCooldowns?.[modelKey] || 0;
      if (modelUntil > now) {
        const waitSec = Math.max(1, Math.ceil((modelUntil - now) / 1000));
        failedKeys.push({
          keyMask: rec.keyMask,
          prefix4: rec.prefix4,
          suffix5: rec.suffix5,
          status: 'cooldown',
          errorCode: 429,
          retryAfterSeconds: waitSec,
          message: `Chave em espera 429 (${waitSec}s restantes)`,
        });
        continue;
      }

      availableKeys.push(candidate);
    }

    // If no keys are available for this model right now, do NOT hammer 403 or 429 keys!
    if (availableKeys.length === 0) {
      const coolingWaits = failedKeys
        .filter((f) => f.status === 'cooldown' && f.retryAfterSeconds > 0)
        .map((f) => f.retryAfterSeconds);
      const minWait = coolingWaits.length > 0 ? Math.min(...coolingWaits) : 30;
      const lastFailed = failedKeys[failedKeys.length - 1];

      const summaryParts = failedKeys.map((f) =>
        f.status === 'disabled'
          ? `${f.keyMask}: BLOQUEADA (403)`
          : `${f.keyMask}: AGUARDANDO 429 (${f.retryAfterSeconds}s)`
      );

      const err = new Error(
        `Nenhuma chave disponível para o modelo ${modelKey} (${summaryParts.join(' · ')}). Tente novamente em ${minWait}s.`
      ) as EnrichedKeyError;
      err.allKeysUnavailable = coolingWaits.length === 0; // Only globally unavailable if all keys are 403 disabled
      err.retryAfterSeconds = minWait;
      err.failedKeys = failedKeys;
      if (lastFailed) {
        err.keyMask = lastFailed.keyMask;
        err.keyPrefix4 = lastFailed.prefix4;
        err.keySuffix5 = lastFailed.suffix5;
      }
      throw err;
    }

    let lastError: EnrichedKeyError | null = null;

    for (let attempt = 0; attempt < availableKeys.length; attempt++) {
      const activeKey = availableKeys[attempt];
      const rec = getEffectiveKeyRecord(activeKey);
      const client = getOrCreateRawClient(activeKey);

      try {
        const result = await operation(client);
        // Mark key healthy/active on success
        rec.status = 'active';
        rec.errorCode = null;
        rec.cooldownUntil = 0;
        rec.cooldownTotalSeconds = 0;
        if (rec.modelCooldowns) {
          delete rec.modelCooldowns[modelKey];
        }
        rec.lastError = null;
        savePersistedState();
        return result;
      } catch (err: unknown) {
        const rawMsg = sanitizeKeyFromMessage(
          err instanceof Error ? err.message : String(err),
          activeKey
        );

        if (isPermissionOrInvalidKeyError(err)) {
          // 403 -> permanently mark as 'disabled' so it is NEVER retried automatically
          rec.status = 'disabled';
          rec.errorCode = 403;
          rec.cooldownUntil = 0;
          rec.lastError = '403 PERMISSION_DENIED (Projeto bloqueado/negado)';
          savePersistedState();

          failedKeys.push({
            keyMask: rec.keyMask,
            prefix4: rec.prefix4,
            suffix5: rec.suffix5,
            status: 'disabled',
            errorCode: 403,
            retryAfterSeconds: 0,
            message: '403 PERMISSION_DENIED — Chave desativada automaticamente',
          });

          console.warn(
            `[GeminiService] Chave ${rec.keyMask} retornou 403 PERMISSION_DENIED -> marcada como DISABLED. Alternando para próxima chave...`
          );

          const enriched = new Error(
            `[Chave: ${rec.keyMask}] 403 PERMISSION_DENIED — Chave desativada automaticamente.`
          ) as EnrichedKeyError;
          enriched.keyMask = rec.keyMask;
          enriched.keyPrefix4 = rec.prefix4;
          enriched.keySuffix5 = rec.suffix5;
          enriched.failedKeys = failedKeys;
          lastError = enriched;

          // Immediately try next active key in availableKeys
          continue;
        }

        if (isRateLimitOrQuotaError(err)) {
          // 429 / 503 -> extract RetryInfo (e.g. 58s) and mark 'cooldown' for this model
          const info = parseGeminiErrorInfo(err);
          const waitSec = Math.max(10, info.retrySeconds || 60);
          const untilMs = Date.now() + waitSec * 1000;
          rec.status = 'cooldown';
          rec.errorCode = 429;
          rec.cooldownUntil = Math.max(rec.cooldownUntil || 0, untilMs);
          rec.cooldownTotalSeconds = waitSec;
          rec.modelCooldowns = {
            ...(rec.modelCooldowns || {}),
            [modelKey]: untilMs,
          };
          rec.lastError = `429 RESOURCE_EXHAUSTED (${modelKey} — aguardando ${waitSec}s)`;
          savePersistedState();

          failedKeys.push({
            keyMask: rec.keyMask,
            prefix4: rec.prefix4,
            suffix5: rec.suffix5,
            status: 'cooldown',
            errorCode: 429,
            retryAfterSeconds: waitSec,
            message: `429 Quota excedida — aguardar ${waitSec}s`,
          });

          console.warn(
            `[GeminiService] Chave ${rec.keyMask} retornou 429 em ${modelKey} -> em COOLDOWN por ${waitSec}s. Alternando para próxima chave...`
          );

          const enriched = new Error(
            `[Chave: ${rec.keyMask}] 429 Quota atingida (tentar novamente em ${waitSec}s).`
          ) as EnrichedKeyError;
          enriched.keyMask = rec.keyMask;
          enriched.keyPrefix4 = rec.prefix4;
          enriched.keySuffix5 = rec.suffix5;
          enriched.retryAfterSeconds = waitSec;
          enriched.failedKeys = failedKeys;
          lastError = enriched;

          // Immediately try next active key in availableKeys without sleeping on the same key
          continue;
        }

        // Other unexpected error (e.g. 404 model not found or 400 schema)
        const enriched = new Error(
          `[Chave: ${rec.keyMask}] ${rawMsg.slice(0, 200)}`
        ) as EnrichedKeyError;
        enriched.keyMask = rec.keyMask;
        enriched.keyPrefix4 = rec.prefix4;
        enriched.keySuffix5 = rec.suffix5;
        enriched.failedKeys = failedKeys;
        throw enriched;
      }
    }

    // All available keys were tried for this model and failed with 403 or 429
    const coolingWaits = failedKeys
      .filter((f) => f.status === 'cooldown' && f.retryAfterSeconds > 0)
      .map((f) => f.retryAfterSeconds);
    const minWait = coolingWaits.length > 0 ? Math.min(...coolingWaits) : 30;

    const summaryParts = failedKeys.map((f) =>
      f.status === 'disabled'
        ? `${f.keyMask}: BLOQUEADA (403)`
        : `${f.keyMask}: AGUARDANDO 429 (${f.retryAfterSeconds}s)`
    );

    const finalErr = new Error(
      `Todas as chaves foram testadas (${summaryParts.join(' · ')}).${
        coolingWaits.length > 0 ? ` Tente novamente em ${minWait}s.` : ''
      }`
    ) as EnrichedKeyError;
    // Only mark allKeysUnavailable = true if NO keys are merely in model-cooldown (i.e. all are 403 disabled)
    // so that fallback models (e.g. gemini-2.5-flash / gemini-flash-latest) can still be tried!
    finalErr.allKeysUnavailable = coolingWaits.length === 0;
    finalErr.retryAfterSeconds = minWait;
    finalErr.failedKeys = failedKeys;
    if (lastError) {
      finalErr.keyMask = lastError.keyMask;
      finalErr.keyPrefix4 = lastError.keyPrefix4;
      finalErr.keySuffix5 = lastError.keySuffix5;
    }
    throw finalErr;
  };

  return new Proxy(baseClient, {
    get(target, prop, receiver) {
      if (prop === 'models') {
        const origModels = target.models;
        return new Proxy(origModels, {
          get(modelsTarget, modelsProp, modelsReceiver) {
            if (modelsProp === 'generateContent') {
              return (params: Parameters<typeof origModels.generateContent>[0]) =>
                executeWithKeyFailover(
                  (c) => c.models.generateContent(params),
                  typeof params?.model === 'string' ? params.model : undefined
                );
            }
            if (modelsProp === 'generateContentStream') {
              return (params: Parameters<typeof origModels.generateContentStream>[0]) =>
                executeWithKeyFailover(
                  (c) => c.models.generateContentStream(params),
                  typeof params?.model === 'string' ? params.model : undefined
                );
            }
            const value = Reflect.get(modelsTarget, modelsProp, modelsReceiver);
            return typeof value === 'function' ? value.bind(modelsTarget) : value;
          },
        });
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/**
 * Returns a resilient GoogleGenAI client backed by all server environment keys,
 * or null if no valid keys are present in the environment.
 */
export function getResilientAIClient(): GoogleGenAI | null {
  const keys = extractGeminiKeysFromEnv();
  if (keys.length === 0) return null;
  return createResilientAIClient(keys);
}
