export interface ParsedGeminiErrorInfo {
  isQuotaOrRateLimit: boolean;
  isTransientOverload: boolean;
  isPermissionDenied: boolean;
  quotaType: 'RPM' | 'RPD' | 'OVERLOAD' | 'PERMISSION' | 'GENERIC';
  retrySeconds: number;
  model?: string;
  keyMask?: string;
  keyPrefix4?: string;
  keySuffix5?: string;
  userMessage: string;
  suggestion: string;
  rawMessage: string;
}

/**
 * Formats an API key showing only its first 4 characters and last 5 characters
 * so the user can identify a key without ever exposing the full secret.
 */
export function maskApiKey(apiKey?: string): string {
  const clean = (apiKey || '').trim();
  if (!clean) return 'desconhecida';
  if (clean.length <= 9) return `${clean.slice(0, 2)}...${clean.slice(-2)}`;
  return `${clean.slice(0, 4)}...${clean.slice(-5)}`;
}

/**
 * Scrubs any accidental full API key token from a raw error string,
 * replacing it with its masked `XXXX...YYYYY` form.
 */
export function sanitizeKeyFromMessage(raw: string, fullKey?: string): string {
  if (!raw) return '';
  let result = raw;
  if (fullKey && fullKey.length > 9 && result.includes(fullKey)) {
    result = result.split(fullKey).join(maskApiKey(fullKey));
  }
  return result;
}

/**
 * Checks whether an error returned by the Gemini SDK or HTTP proxy is a rate-limit (429),
 * quota exhaustion (RESOURCE_EXHAUSTED), or transient server overload (503).
 */
export function isRateLimitOrQuotaError(err: unknown): boolean {
  if (!err) return false;
  const status =
    (err as { status?: number; code?: number })?.status ??
    (err as { code?: number })?.code;
  if (status === 429 || status === 503) return true;

  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate exceeded') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('quota exceeded') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('temporarily unavailable')
  );
}

/**
 * Parses raw Gemini or proxy error messages to extract retry delay (seconds) from
 * RetryInfo / Retry-After (e.g. "58s", "Please retry in 58.4s"), quota category,
 * and masked API key info.
 */
export function parseGeminiErrorInfo(
  err: unknown,
  attemptedModel?: string
): ParsedGeminiErrorInfo {
  const rawMessage = err instanceof Error ? err.message : String(err || 'Erro desconhecido');
  const lower = rawMessage.toLowerCase();

  const errObj = (err && typeof err === 'object' ? err : {}) as {
    keyMask?: string;
    keyPrefix4?: string;
    keySuffix5?: string;
    retryAfterSeconds?: number;
  };

  const keyMask = errObj.keyMask;
  const keyPrefix4 = errObj.keyPrefix4;
  const keySuffix5 = errObj.keySuffix5;
  const keyLabel = keyMask ? ` [Chave: ${keyMask}]` : '';

  const isPermissionDenied =
    lower.includes('permission_denied') ||
    lower.includes('denied access') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('403');

  const isTransientOverload =
    lower.includes('503') ||
    lower.includes('overloaded') ||
    lower.includes('high demand') ||
    lower.includes('busy');

  const isQuotaOrRateLimit = isRateLimitOrQuotaError(err);

  // Extract retry delay in seconds (e.g., "Please retry in 58.318s", "retryDelay":"58s", "retry in 1m")
  let retrySeconds = typeof errObj.retryAfterSeconds === 'number' && errObj.retryAfterSeconds > 0
    ? errObj.retryAfterSeconds
    : isQuotaOrRateLimit && !isTransientOverload
    ? 60
    : 10;

  const secMatch =
    rawMessage.match(/retry\s+in\s+(\d+(?:\.\d+)?)\s*s/i) ||
    rawMessage.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i) ||
    rawMessage.match(/retry-after["\s:]+(\d+(?:\.\d+)?)/i);
  const minMatch = rawMessage.match(/retry\s+in\s+(\d+(?:\.\d+)?)\s*m(?!s)/i);

  if (secMatch && secMatch[1]) {
    retrySeconds = Math.max(5, Math.min(300, Math.ceil(parseFloat(secMatch[1]))));
  } else if (minMatch && minMatch[1]) {
    retrySeconds = Math.max(10, Math.min(300, Math.ceil(parseFloat(minMatch[1]) * 60)));
  }

  let quotaType: ParsedGeminiErrorInfo['quotaType'] = 'GENERIC';
  if (isPermissionDenied) {
    quotaType = 'PERMISSION';
  } else if (lower.includes('perday') || lower.includes('per_day') || lower.includes('daily')) {
    quotaType = 'RPD';
  } else if (
    lower.includes('perminute') ||
    lower.includes('per_minute') ||
    lower.includes('rate exceeded') ||
    lower.includes('429') ||
    lower.includes('resource_exhausted')
  ) {
    quotaType = 'RPM';
  } else if (isTransientOverload) {
    quotaType = 'OVERLOAD';
  }

  let userMessage = `O serviço de IA encontrou um limite temporário de requisições.${keyLabel}`;
  let suggestion = `Aguarde ${retrySeconds}s para tentar novamente.`;

  if (quotaType === 'RPM') {
    userMessage = `Quota temporária atingida (429).${keyLabel}`;
    suggestion = `Tentar novamente em ${retrySeconds}s.`;
  } else if (quotaType === 'RPD') {
    userMessage = `Cota diária (RPD) atingida nesta chave (429).${keyLabel}`;
    suggestion = `Chave em espera (${retrySeconds}s).`;
  } else if (quotaType === 'OVERLOAD') {
    userMessage = `Alta demanda simultânea no modelo (503).${keyLabel}`;
    suggestion = `Aguarde ${retrySeconds}s e tente novamente.`;
  } else if (quotaType === 'PERMISSION') {
    userMessage = `Acesso negado (403 PERMISSION_DENIED) — chave desativada automaticamente.${keyLabel}`;
    suggestion = keyMask
      ? `A chave ${keyMask} foi marcada como BLOQUEADA e não será mais usada.`
      : 'A chave com erro 403 foi desativada automaticamente.';
  }

  return {
    isQuotaOrRateLimit,
    isTransientOverload,
    isPermissionDenied,
    quotaType,
    retrySeconds,
    model: attemptedModel,
    keyMask,
    keyPrefix4,
    keySuffix5,
    userMessage,
    suggestion,
    rawMessage,
  };
}
