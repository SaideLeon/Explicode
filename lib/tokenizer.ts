export interface Token {
  text: string;
  cls: 'kw' | 'str' | 'num' | 'cm' | 'fn' | 'id' | 'type' | 'p' | 'ws';
}

const KEYWORDS = new Set([
  // JavaScript / TypeScript
  'function', 'let', 'const', 'var', 'for', 'of', 'in', 'return', 'if', 'else', 'while',
  'new', 'class', 'import', 'from', 'export', 'default', 'await', 'async', 'true', 'false',
  'null', 'undefined', 'try', 'catch', 'finally', 'throw', 'switch', 'case', 'break',
  'continue', 'yield', 'typeof', 'instanceof', 'void', 'this', 'super', 'interface', 'type',
  'extends', 'implements',
  // Python
  'def', 'elif', 'as', 'is', 'not', 'and', 'or', 'None', 'True', 'False', 'self',
  'lambda', 'except', 'with', 'pass', 'raise', 'global', 'nonlocal', 'assert',
  // SQL
  'select', 'from', 'where', 'join', 'left', 'right', 'inner', 'outer', 'group', 'by',
  'order', 'having', 'limit', 'insert', 'into', 'values', 'update', 'set', 'delete',
  'create', 'table', 'alter', 'drop', 'and', 'or', 'as', 'count', 'sum', 'avg',
  // Go / Rust
  'fn', 'func', 'mut', 'impl', 'struct', 'enum', 'match', 'pub', 'crate', 'package',
  'go', 'defer', 'chan', 'map', 'range', 'use', 'mod', 'trait', 'where',
  // Java / Kotlin / Swift / C / C++
  'public', 'private', 'protected', 'static', 'final', 'override', 'val', 'fun',
  'guard', 'protocol', 'extension', 'include', 'namespace', 'using', 'template',
  'typename', 'virtual', 'constexpr', 'nullptr'
]);

const TYPES = new Set([
  'string', 'number', 'boolean', 'any', 'void', 'unknown', 'never', 'object',
  'Promise', 'Array', 'Record', 'Map', 'Set', 'int', 'float', 'double', 'char', 'long', 'short',
  'str', 'bool', 'list', 'dict', 'tuple', 'i32', 'i64', 'u32', 'u64', 'usize', 'f32', 'f64',
  'String', 'Vec', 'Option', 'Result', 'Int', 'Double', 'Boolean', 'Float', 'List'
]);

export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  // Regex matches:
  // 1. Line comments (// or # or --)
  // 2. Strings ("...", '...', `...`)
  // 3. Numbers
  // 4. Identifiers / words
  // 5. Whitespace
  // 6. Any other punctuation/operator
  const regex = /(\/\/.*$|#.*$|--.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$\u00C0-\u017F][\w$\u00C0-\u017F]*)|(\s+)|([\s\S])/g;
  
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      tokens.push({ text: match[1], cls: 'cm' });
    } else if (match[2]) {
      tokens.push({ text: match[2], cls: 'str' });
    } else if (match[3]) {
      tokens.push({ text: match[3], cls: 'num' });
    } else if (match[4]) {
      const word = match[4];
      const lower = word.toLowerCase();
      const nextChar = line[regex.lastIndex];
      
      if (KEYWORDS.has(word) || KEYWORDS.has(lower)) {
        tokens.push({ text: word, cls: 'kw' });
      } else if (TYPES.has(word)) {
        tokens.push({ text: word, cls: 'type' });
      } else if (nextChar === '(') {
        tokens.push({ text: word, cls: 'fn' });
      } else {
        tokens.push({ text: word, cls: 'id' });
      }
    } else if (match[5]) {
      tokens.push({ text: match[5], cls: 'ws' });
    } else if (match[6]) {
      tokens.push({ text: match[6], cls: 'p' });
    }
  }

  return tokens;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RenderSpan {
  text: string;
  cls: string;
  isMarked: boolean;
}

export function computeLineSpans(
  tokens: Token[],
  visibleChars: number,
  markRange: [number, number] | null
): RenderSpan[] {
  const spans: RenderSpan[] = [];
  let pos = 0;

  for (const tk of tokens) {
    if (pos >= visibleChars) break;
    const take = Math.min(tk.text.length, visibleChars - pos);

    const cuts = [0, take];
    if (markRange) {
      const a = markRange[0] - pos;
      const b = markRange[1] - pos;
      if (a > 0 && a < take) cuts.push(a);
      if (b > 0 && b < take) cuts.push(b);
    }
    cuts.sort((x, y) => x - y);

    for (let k = 0; k < cuts.length - 1; k++) {
      if (cuts[k] === cuts[k + 1]) continue;
      const piece = tk.text.slice(cuts[k], cuts[k + 1]);
      const absPos = pos + cuts[k];
      const isMarked = !!markRange && absPos >= markRange[0] && absPos < markRange[1];

      spans.push({
        text: piece,
        cls: tk.cls,
        isMarked,
      });
    }

    pos += tk.text.length;
  }

  return spans;
}
