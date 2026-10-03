import { GoogleGenAI } from '@google/genai';
import { maskApiKey, parseGeminiErrorInfo } from '@/lib/aiErrors';

export const PRIMARY_SCRIPT_MODEL = 'gemini-2.5-flash';
export const FALLBACK_SCRIPT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
];

export const TTS_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

export interface KeyPoolItem {
  rawKey: string;
  mask: string;
  prefix4: string;
  suffix5: string;
  status: 'active' | 'cooldown' | 'disabled';
  errorCode: number | null;
  retryAfterSeconds: number;
  cooldownTotalSeconds: number;
  cooldownUntil: number;
  lastError: string | null;
}

export interface PublicKeyStatus {
  keyMask: string;
  prefix4: string;
  suffix5: string;
  status: 'active' | 'cooldown' | 'disabled';
  errorCode: number | null;
  retryAfterSeconds: number;
  cooldownTotalSeconds: number;
  lastError: string | null;
}

let keyPool: KeyPoolItem[] = [];
let lastUsedKey: string | null = null;
let lastUsedClient: GoogleGenAI | null = null;
let poolInitialized = false;

export function extractGeminiKeysFromEnv(): string[] {
  const keys: string[] = [];
  const envKeysRaw = process.env.GEMINI_API_KEYS || '';
  const singleKey = process.env.GEMINI_API_KEY || '';

  if (singleKey.trim()) {
    keys.push(singleKey.trim());
  }

  if (envKeysRaw.trim()) {
    const split = envKeysRaw
      .split(/[,;\n\r\t ]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    for (const k of split) {
      if (!keys.includes(k)) {
        keys.push(k);
      }
    }
  }

  return keys;
}

function initKeyPoolIfNeeded(): void {
  if (poolInitialized) return;
  const envKeys = extractGeminiKeysFromEnv();
  keyPool = envKeys.map((k) => {
    const mask = maskApiKey(k);
    const prefix4 = k.slice(0, 4);
    const suffix5 = k.slice(-5);
    return {
      rawKey: k,
      mask,
      prefix4,
      suffix5,
      status: 'active',
      errorCode: null,
      retryAfterSeconds: 0,
      cooldownTotalSeconds: 0,
      cooldownUntil: 0,
      lastError: null,
    };
  });
  poolInitialized = true;
}

export function getPublicKeyPoolStatus(): PublicKeyStatus[] {
  initKeyPoolIfNeeded();
  const now = Date.now();

  return keyPool.map((item) => {
    if (item.status === 'cooldown' && item.cooldownUntil > 0 && now >= item.cooldownUntil) {
      item.status = 'active';
      item.errorCode = null;
      item.retryAfterSeconds = 0;
      item.cooldownTotalSeconds = 0;
      item.cooldownUntil = 0;
      item.lastError = null;
    }

    const remainingSec =
      item.status === 'cooldown' && item.cooldownUntil > now
        ? Math.max(0, Math.ceil((item.cooldownUntil - now) / 1000))
        : 0;

    return {
      keyMask: item.mask,
      prefix4: item.prefix4,
      suffix5: item.suffix5,
      status: item.status,
      errorCode: item.errorCode,
      retryAfterSeconds: remainingSec,
      cooldownTotalSeconds: item.cooldownTotalSeconds,
      lastError: item.lastError,
    };
  });
}

export function updateKeyStatusByMask(
  keyMask: string,
  action: 'activate' | 'disable' | 'remove'
): PublicKeyStatus[] {
  initKeyPoolIfNeeded();

  if (action === 'remove') {
    keyPool = keyPool.filter((k) => k.mask !== keyMask);
    return getPublicKeyPoolStatus();
  }

  const target = keyPool.find((k) => k.mask === keyMask);
  if (target) {
    if (action === 'activate') {
      target.status = 'active';
      target.errorCode = null;
      target.retryAfterSeconds = 0;
      target.cooldownTotalSeconds = 0;
      target.cooldownUntil = 0;
      target.lastError = null;
    } else if (action === 'disable') {
      target.status = 'disabled';
      target.cooldownUntil = 0;
      target.retryAfterSeconds = 0;
    }
  }

  return getPublicKeyPoolStatus();
}

export function reactivateAllCooldownKeys(): PublicKeyStatus[] {
  initKeyPoolIfNeeded();
  for (const item of keyPool) {
    if (item.status === 'cooldown') {
      item.status = 'active';
      item.errorCode = null;
      item.retryAfterSeconds = 0;
      item.cooldownTotalSeconds = 0;
      item.cooldownUntil = 0;
      item.lastError = null;
    }
  }
  return getPublicKeyPoolStatus();
}

export function getResilientAIClient(): GoogleGenAI | null {
  initKeyPoolIfNeeded();
  const now = Date.now();

  // Auto-recover expired cooldowns
  for (const item of keyPool) {
    if (item.status === 'cooldown' && item.cooldownUntil > 0 && now >= item.cooldownUntil) {
      item.status = 'active';
      item.errorCode = null;
      item.retryAfterSeconds = 0;
      item.cooldownTotalSeconds = 0;
      item.cooldownUntil = 0;
      item.lastError = null;
    }
  }

  const activeKeys = keyPool.filter((k) => k.status === 'active');
  if (activeKeys.length === 0) {
    // If no active keys in pool, fallback to single GEMINI_API_KEY if exists
    const fallbackEnvKey = process.env.GEMINI_API_KEY || '';
    if (fallbackEnvKey.trim()) {
      lastUsedKey = fallbackEnvKey.trim();
      lastUsedClient = new GoogleGenAI({ apiKey: fallbackEnvKey.trim() });
      return lastUsedClient;
    }
    return null;
  }

  // Round-robin or pick next
  const chosen = activeKeys[Math.floor(Math.random() * activeKeys.length)];
  lastUsedKey = chosen.rawKey;
  lastUsedClient = new GoogleGenAI({ apiKey: chosen.rawKey });
  return lastUsedClient;
}

export function extractErrorKeyMetadata(err: unknown): {
  keyMask?: string;
  keyPrefix4?: string;
  keySuffix5?: string;
  allKeysUnavailable?: boolean;
  failedKeys?: Array<{ mask: string; status: 'active' | 'cooldown' | 'disabled' }>;
  retryAfterSeconds?: number;
} {
  initKeyPoolIfNeeded();
  const info = parseGeminiErrorInfo(err);

  const matchedItem =
    keyPool.find((k) => k.rawKey === lastUsedKey) ||
    keyPool.find((k) => info.rawMessage.includes(k.rawKey)) ||
    (keyPool.length === 1 ? keyPool[0] : null);

  const mask = matchedItem?.mask || (lastUsedKey ? maskApiKey(lastUsedKey) : undefined);
  const prefix4 = matchedItem?.prefix4 || (lastUsedKey ? lastUsedKey.slice(0, 4) : undefined);
  const suffix5 = matchedItem?.suffix5 || (lastUsedKey ? lastUsedKey.slice(-5) : undefined);

  if (matchedItem) {
    if (info.isPermissionDenied) {
      matchedItem.status = 'disabled';
      matchedItem.errorCode = 403;
      matchedItem.lastError = 'Acesso Negado (403 PERMISSION_DENIED)';
    } else if (info.isQuotaOrRateLimit) {
      matchedItem.status = 'cooldown';
      matchedItem.errorCode = 429;
      matchedItem.retryAfterSeconds = info.retrySeconds;
      matchedItem.cooldownTotalSeconds = info.retrySeconds;
      matchedItem.cooldownUntil = Date.now() + info.retrySeconds * 1000;
      matchedItem.lastError = info.userMessage;
    }
  }

  const activeCount = keyPool.filter((k) => k.status === 'active').length;
  const allKeysUnavailable = keyPool.length > 0 && activeCount === 0;

  return {
    keyMask: mask,
    keyPrefix4: prefix4,
    keySuffix5: suffix5,
    allKeysUnavailable,
    failedKeys: keyPool
      .filter((k) => k.status !== 'active')
      .map((k) => ({ mask: k.mask, status: k.status })),
    retryAfterSeconds: info.retrySeconds,
  };
}
