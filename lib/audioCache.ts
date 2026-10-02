/**
 * Memory-safe cache for synthesized audio URLs.
 * Automatically converts large `data:audio/wav;base64,...` strings into compact
 * binary `Blob` Object URLs (`blob:...`) so multi-megabyte Base64 strings are
 * immediately freed from the JavaScript heap (preventing Out-Of-Memory crashes on mobile Chrome).
 */

const MAX_CACHE_ENTRIES = 15;
const internalMap = new Map<string, string>();

function base64DataUrlToBlobUrl(dataUrl: string): string {
  if (!dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  const base64Index = dataUrl.indexOf(';base64,');
  if (base64Index === -1) {
    return dataUrl;
  }
  try {
    const mimeType = dataUrl.slice(5, base64Index) || 'audio/wav';
    const base64 = dataUrl.slice(base64Index + 8);
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return dataUrl;
  }
}

export const globalAudioCache = {
  get(key: string): string | undefined {
    return internalMap.get(key);
  },

  has(key: string): boolean {
    return internalMap.has(key);
  },

  set(key: string, value: string): string {
    const existing = internalMap.get(key);
    if (existing) {
      return existing;
    }

    // Evict oldest entry and revoke its Blob URL to prevent memory accumulation
    if (internalMap.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = internalMap.keys().next().value;
      if (oldestKey) {
        const oldUrl = internalMap.get(oldestKey);
        if (oldUrl && oldUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(oldUrl);
          } catch {
            // ignore
          }
        }
        internalMap.delete(oldestKey);
      }
    }

    const optimizedUrl =
      typeof window !== 'undefined' ? base64DataUrlToBlobUrl(value) : value;
    internalMap.set(key, optimizedUrl);
    return optimizedUrl;
  },

  clear(): void {
    internalMap.forEach((url) => {
      if (url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }
    });
    internalMap.clear();
  },
};
