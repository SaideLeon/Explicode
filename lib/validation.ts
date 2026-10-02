import { CodeScript, ScriptSegment } from '@/types/script';
import { normalizeScene, Scene } from '@/lib/scene';

export interface ValidationResult {
  valid: boolean;
  error: string | null;
  repairedScript?: CodeScript;
  changes?: string[];
}

/**
 * Builds a fallback visual scene when a script has no code (`code: []`)
 * and a segment omitted `scene`, ensuring the stage is never blank.
 */
function buildFallbackConceptScene(title: string, sayText: string, index: number): Scene {
  const shortLabel = title.slice(0, 26) || 'Conceito';
  const words = sayText
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?;:()"]/g, ''))
    .filter((w) => w.length >= 4);
  const firstTrigger = words[0] || undefined;
  const midTrigger = words[Math.floor(words.length / 2)] || undefined;

  return {
    title: `${shortLabel} — Etapa ${index + 1}`,
    nodes: [
      {
        id: 'main',
        x: 52,
        y: 40,
        icon: '💡',
        label: shortLabel,
        sub: `Etapa ${index + 1}`,
        color: 'blue',
        ...(firstTrigger ? { on: firstTrigger } : { at: 0.08 }),
      },
      {
        id: 'detail',
        x: 108,
        y: 40,
        icon: '⚡',
        label: midTrigger ? midTrigger.charAt(0).toUpperCase() + midTrigger.slice(1) : ' Ponto-chave',
        sub: 'explicação visual',
        color: 'green',
        ...(midTrigger ? { on: midTrigger } : { at: 0.45 }),
      },
    ],
    arrows: [
      {
        from: 'main',
        to: 'detail',
        label: 'explica',
        color: 'cyan',
        ...(midTrigger ? { on: midTrigger } : { at: 0.35 }),
      },
    ],
  };
}

/**
 * Automatically repairs and normalizes a script:
 * 1. Allows `code: []` for pure conceptual videos (cleaning `type`, `focus`, `mark` when `totalLines === 0`).
 * 2. Clamps out-of-bounds line numbers to [1, code.length] when `totalLines > 0`.
 * 3. Swaps inverted ranges [start, end] where start > end.
 * 4. If a marked term ("mark") is not in the specified focus line, searches
 *    the code and automatically adjusts the focus to the actual line containing the term.
 */
export function normalizeAndRepairScript(obj: unknown): ValidationResult {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {
      valid: false,
      error: 'O roteiro precisa ser um objeto JSON válido (com chaves title, code, segments).',
    };
  }

  const script = obj as Partial<CodeScript>;

  const rawCode = script.code === undefined ? [] : script.code;
  if (!Array.isArray(rawCode)) {
    return {
      valid: false,
      error: 'A propriedade "code" deve ser uma lista de strings (pode ser [] em modo conceitual).',
    };
  }

  // Convert non-strings or nulls in code to strings
  const code = rawCode.map((line) => (typeof line === 'string' ? line : String(line ?? '')));
  const totalLines = code.length;

  if (!Array.isArray(script.segments) || script.segments.length === 0) {
    return {
      valid: false,
      error: 'A propriedade "segments" deve ter pelo menos 1 trecho de narração.',
    };
  }

  const changes: string[] = [];

  const repairedSegments: ScriptSegment[] = script.segments.map((seg, idx) => {
    const s = { ...seg } as ScriptSegment;
    const prefix = `Trecho ${idx + 1}`;

    if (!s.say || typeof s.say !== 'string') {
      s.say = `Trecho explicativo ${idx + 1}`;
    }

    // If there is no code (conceptual mode), strip line references so [1, 1] is never forced on an empty array
    if (totalLines === 0) {
      delete s.type;
      delete s.focus;
      delete s.mark;
    } else {
      // Repair type range
      if (s.type && Array.isArray(s.type)) {
        let [start, end] = s.type;
        start = Number(start);
        end = Number(end);
        if (isNaN(start)) start = 1;
        if (isNaN(end)) end = start;
        if (start > end) {
          const temp = start;
          start = end;
          end = temp;
        }
        const clampedStart = Math.max(1, Math.min(start, totalLines));
        const clampedEnd = Math.max(clampedStart, Math.min(end, totalLines));
        if (clampedStart !== s.type[0] || clampedEnd !== s.type[1]) {
          changes.push(
            `${prefix}: linhas de digitação ajustadas de [${s.type.join(', ')}] para [${clampedStart}, ${clampedEnd}]`
          );
        }
        s.type = [clampedStart, clampedEnd];
      }

      // Repair focus range
      if (s.focus && Array.isArray(s.focus)) {
        let [start, end] = s.focus;
        start = Number(start);
        end = Number(end);
        if (isNaN(start)) start = 1;
        if (isNaN(end)) end = start;
        if (start > end) {
          const temp = start;
          start = end;
          end = temp;
        }
        const clampedStart = Math.max(1, Math.min(start, totalLines));
        const clampedEnd = Math.max(clampedStart, Math.min(end, totalLines));
        if (clampedStart !== s.focus[0] || clampedEnd !== s.focus[1]) {
          changes.push(
            `${prefix}: linhas de foco ajustadas de [${s.focus.join(', ')}] para [${clampedStart}, ${clampedEnd}]`
          );
        }
        s.focus = [clampedStart, clampedEnd];
      }

      // Repair mark term and locate in code
      if (s.mark && typeof s.mark === 'string' && s.mark.trim()) {
        const term = s.mark.trim();
        const currentRange = s.focus || s.type;
        let foundInCurrent = false;

        if (currentRange) {
          const [cStart, cEnd] = currentRange;
          for (let l = cStart; l <= cEnd; l++) {
            if (code[l - 1]?.includes(term)) {
              foundInCurrent = true;
              break;
            }
          }
        }

        // If not in current range, search the entire code for the term!
        if (!foundInCurrent) {
          let matchingLine = -1;
          const refLine = currentRange ? currentRange[0] : 1;
          let minDistance = Infinity;

          for (let l = 1; l <= totalLines; l++) {
            if (code[l - 1]?.includes(term)) {
              const dist = Math.abs(l - refLine);
              if (dist < minDistance) {
                minDistance = dist;
                matchingLine = l;
              }
            }
          }

          if (matchingLine !== -1) {
            changes.push(
              `${prefix}: o termo "${term}" foi localizado na linha ${matchingLine}. O foco foi ajustado para [${matchingLine}, ${matchingLine}].`
            );
            s.focus = [matchingLine, matchingLine];
          } else {
            changes.push(
              `${prefix}: o termo "${term}" não existe no código e foi desativado neste trecho.`
            );
            delete s.mark;
          }
        }
      }
    }

    if (s.output !== undefined) {
      s.output = String(s.output);
    }

    // Validate optional visual scene (boxes, arrows, icons) with semantic say validation
    if (s.scene !== undefined) {
      const cleanScene = normalizeScene(s.scene, prefix, changes, s.say);
      if (cleanScene) {
        s.scene = cleanScene;
      } else {
        delete s.scene;
      }
    }

    // If totalLines === 0 and segment has no valid scene, provide a visual scene so the screen isn't empty
    if (totalLines === 0 && !s.scene) {
      s.scene = buildFallbackConceptScene(script.title || 'Explicação Visual', s.say, idx);
    }

    return s;
  });

  const repairedScript: CodeScript = {
    title: script.title || 'Explicação Interativa',
    file: script.file || (totalLines === 0 ? 'conceito.visual' : 'codigo.js'),
    lang: script.lang || 'pt-BR',
    code,
    segments: repairedSegments,
  };

  return {
    valid: true,
    error: null,
    repairedScript,
    changes,
  };
}

export function validateScript(obj: unknown): ValidationResult {
  return normalizeAndRepairScript(obj);
}
