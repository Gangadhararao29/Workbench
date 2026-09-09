/**
 * C# Formatter Engine
 */

export interface CsharpFormatOptions {
  indentSize?: number;
  braceStyle?: 'allman' | 'kr';
}

interface Token {
  type: 'word' | 'number' | 'string' | 'char' | 'lineComment' | 'blockComment' | 'preprocessor' | 'symbol';
  text: string;
}

interface ProcessedToken extends Token {
  precededByNewline: boolean;
  blankLineBefore: boolean;
}

export function formatCsharp(source: string, options: CsharpFormatOptions = {}): string {
  if (!source || !source.trim()) return '';

  const indentSize = options.indentSize ?? 4;
  const indentStr = ' '.repeat(indentSize);
  const braceStyle = options.braceStyle ?? 'allman';

  const rawTokens = tokenizeCsharp(source);
  if (rawTokens.length === 0) return '';

  // Extract meaningful tokens while preserving newline and blank line information
  const tokens: ProcessedToken[] = [];
  let hadNewline = false;
  let newlineCount = 0;

  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];
    if (t.type === 'newline') {
      hadNewline = true;
      newlineCount++;
    } else if (t.type === 'whitespace') {
      // ignore
    } else {
      tokens.push({
        type: t.type,
        text: t.text,
        precededByNewline: hadNewline,
        blankLineBefore: newlineCount > 1
      });
      hadNewline = false;
      newlineCount = 0;
    }
  }

  const lines: string[] = [];
  let currentLine = '';
  let depth = 0;
  let parenDepth = 0;

  const emitLine = () => {
    const trimmed = currentLine.trim();
    if (trimmed.length > 0) {
      lines.push(`${indentStr.repeat(depth)}${trimmed}`);
    }
    currentLine = '';
  };

  const emitBlankLine = () => {
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
  };

  const appendToken = (text: string) => {
    if (!text) return;
    if (currentLine.length === 0) {
      currentLine = text;
    } else {
      const lastChar = currentLine[currentLine.length - 1];
      if (shouldHaveSpaceBetween(lastChar, currentLine, text)) {
        currentLine += ' ' + text;
      } else {
        currentLine += text;
      }
    }
  };

  function shouldHaveSpaceBetween(lastChar: string, lineSoFar: string, nextText: string): boolean {
    if (lastChar === ' ' || lastChar === '\t') return false;

    // Never space before punctuation
    if (nextText === ';' || nextText === ',' || nextText === ')' || nextText === ']') return false;
    // Never space after ( [ . ?. ::
    if (lastChar === '(' || lastChar === '[' || lastChar === '.' || lineSoFar.endsWith('?.') || lineSoFar.endsWith('::')) return false;
    // Never space before . or ?. or ::
    if (nextText === '.' || nextText === '?.' || nextText === '::') return false;

    // Auto-property or object block start
    if (nextText.startsWith('{')) return true;

    // Generic types: List<string>, Dictionary<string, int>
    if (nextText === '<' && /[a-zA-Z0-9_]/.test(lastChar)) {
      const words = lineSoFar.trim().split(/[^a-zA-Z0-9_@]/);
      const prevWord = words[words.length - 1];
      if (/^[A-Z]/.test(prevWord) || ['string', 'int', 'long', 'short', 'byte', 'bool', 'char', 'float', 'double', 'decimal', 'object', 'dynamic'].includes(prevWord)) {
        return false;
      }
    }
    if (lineSoFar.endsWith(' <') || lineSoFar.endsWith(' >')) return true;
    if (lastChar === '<' && nextText !== '=') return false;
    if (nextText === '>' && !lineSoFar.endsWith('=')) return false;

    // Space after , and ;
    if (lastChar === ',' || lastChar === ';') return true;

    // Space around lambda =>
    if (nextText === '=>' || lineSoFar.endsWith('=>')) return true;

    // Space around binary operators
    const binaryOps = [
      '=', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=',
      '&=', '|=', '^=', '??=', '??', '&&', '||', '+', '-', '*', '/', '%'
    ];
    if (binaryOps.includes(nextText)) {
      if ((nextText === '-' || nextText === '+') && (lastChar === '(' || lastChar === '=' || lastChar === ',' || lastChar === '[')) {
        return false;
      }
      return true;
    }
    if (nextText === '<' || nextText === '>') {
      // Comparison operator
      if (/[0-9)a-z_]/.test(lastChar) && parenDepth > 0) return true;
    }
    const lastWord = lineSoFar.trim().split(/[^a-zA-Z0-9_@]/).pop() || '';
    if (binaryOps.includes(lastWord) || binaryOps.includes(lineSoFar.trim().split(/\s+/).pop() || '')) {
      return true;
    }

    // Space after control keywords (except new() target-typed new)
    if (lastWord === 'new' && nextText === '(') return false;
    const controlKeywords = [
      'if', 'for', 'foreach', 'while', 'switch', 'catch', 'using', 'lock', 'fixed',
      'return', 'throw', 'yield', 'var', 'new', 'await', 'async', 'class', 'struct',
      'record', 'interface', 'enum', 'public', 'private', 'protected', 'internal',
      'static', 'readonly', 'const', 'virtual', 'override', 'abstract', 'sealed',
      'extern', 'unsafe', 'partial', 'where', 'get', 'set', 'init'
    ];
    if (controlKeywords.includes(lastWord)) {
      if (nextText === '(' || nextText === '{' || /^[a-zA-Z0-9_@"]/.test(nextText)) return true;
    }

    // Space before {
    if (nextText === '{') return true;

    // Space after ) if followed by word, {, or =>
    if (lastChar === ')' && (/^[a-zA-Z0-9_@{]/.test(nextText) || nextText === '=>')) return true;

    // Colons
    if (nextText === ':') {
      if (lineSoFar.includes('?') || /\b(?:class|struct|record|interface|where)\b/.test(lineSoFar)) return true;
      return false;
    }
    if (lastChar === ':') return true;

    // Words and strings
    if (/[a-zA-Z0-9_>]/.test(lastChar) && /^[a-zA-Z0-9_@"]/.test(nextText)) return true;

    return false;
  }

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    const prev = tokens[i - 1];

    // Preserve blank line
    if (tok.blankLineBefore && lines.length > 0 && currentLine.length === 0) {
      const lastLine = lines[lines.length - 1].trim();
      if (lastLine !== '{' && lastLine !== '') {
        emitBlankLine();
      }
    }

    // Preprocessor directive (#region, #endregion, #nullable, etc.)
    if (tok.type === 'preprocessor') {
      emitLine();
      lines.push(tok.text.trim());
      i++;
      continue;
    }

    // Single-line comment
    if (tok.type === 'lineComment') {
      if (currentLine.trim().length > 0) {
        currentLine += '  ' + tok.text.trim();
        emitLine();
      } else {
        currentLine = tok.text.trim();
        emitLine();
      }
      i++;
      continue;
    }

    // Block comment
    if (tok.type === 'blockComment') {
      if (tok.text.includes('\n')) {
        emitLine();
        const commentLines = tok.text.split('\n');
        for (const cl of commentLines) {
          lines.push(`${indentStr.repeat(depth)}${cl.trim()}`);
        }
      } else {
        appendToken(tok.text);
      }
      i++;
      continue;
    }

    // Attribute [AttributeName(...)]
    if (tok.type === 'symbol' && tok.text === '[' && parenDepth === 0) {
      const isStartOfMember = !prev || prev.text === ';' || prev.text === '{' || prev.text === '}' || prev.text === ']' || tok.precededByNewline;
      if (isStartOfMember && currentLine.trim().length === 0) {
        let attrText = '[';
        let bDepth = 1;
        i++;
        while (i < tokens.length && bDepth > 0) {
          const at = tokens[i];
          if (at.text === '[') bDepth++;
          else if (at.text === ']') bDepth--;

          if (at.text === ',' || at.text === ':') {
            attrText += at.text + ' ';
          } else if (at.text === '(' || at.text === ')' || at.text === '[' || at.text === ']') {
            attrText += at.text;
          } else if (attrText.endsWith('(') || attrText.endsWith('[') || attrText.endsWith(' ')) {
            attrText += at.text;
          } else {
            const last = attrText[attrText.length - 1];
            if (/[a-zA-Z0-9_"]/.test(last) && /^[a-zA-Z0-9_"]/.test(at.text)) {
              attrText += ' ' + at.text;
            } else {
              attrText += at.text;
            }
          }
          i++;
        }
        lines.push(`${indentStr.repeat(depth)}${attrText}`);
        continue;
      }
    }

    // Auto-property: { get; set; } or { get; private set; } = "default";
    if (tok.type === 'symbol' && tok.text === '{') {
      const autoProp = tryParseAutoProperty(tokens, i);
      if (autoProp) {
        appendToken(autoProp.text);
        emitLine();
        i = autoProp.nextIndex;
        continue;
      }
    }

    // Opening brace '{'
    if (tok.type === 'symbol' && tok.text === '{') {
      if (braceStyle === 'allman') {
        emitLine();
        lines.push(`${indentStr.repeat(depth)}{`);
      } else {
        if (currentLine.trim().length > 0) {
          currentLine = currentLine.trimEnd() + ' {';
          emitLine();
        } else {
          lines.push(`${indentStr.repeat(depth)}{`);
        }
      }
      depth++;
      i++;
      continue;
    }

    // Closing brace '}'
    if (tok.type === 'symbol' && tok.text === '}') {
      emitLine();
      depth = Math.max(0, depth - 1);
      let closeText = '}';

      let peek = tokens[i + 1];
      if (peek && peek.type === 'symbol' && (peek.text === ';' || peek.text === ',')) {
        closeText += peek.text;
        i++;
      } else if (peek && peek.text === ')') {
        closeText += ')';
        i++;
        const peek2 = tokens[i + 1];
        if (peek2 && peek2.text === ';') {
          closeText += ';';
          i++;
        }
      }

      lines.push(`${indentStr.repeat(depth)}${closeText}`);
      i++;
      continue;
    }

    // Parentheses
    if (tok.type === 'symbol' && tok.text === '(') {
      parenDepth++;
      appendToken('(');
      i++;
      continue;
    }
    if (tok.type === 'symbol' && tok.text === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      appendToken(')');
      i++;
      continue;
    }

    // Semicolon ';'
    if (tok.type === 'symbol' && tok.text === ';') {
      if (parenDepth > 0) {
        currentLine += '; ';
      } else {
        appendToken(';');
        emitLine();
      }
      i++;
      continue;
    }

    // Switch case labels
    if (tok.type === 'symbol' && tok.text === ':') {
      const curTrim = currentLine.trim();
      if (curTrim.startsWith('case ') || curTrim === 'default') {
        currentLine += ':';
        emitLine();
        i++;
        continue;
      }
    }

    // Append regular token
    appendToken(tok.text);
    i++;
  }

  emitLine();
  return lines.join('\n');
}

function tryParseAutoProperty(tokens: ProcessedToken[], startIndex: number): { text: string; nextIndex: number } | null {
  let idx = startIndex + 1;
  const accessorParts: string[] = [];
  const accessorWords = ['public', 'private', 'protected', 'internal', 'get', 'set', 'init'];

  let currentAccessor: string[] = [];
  while (idx < tokens.length) {
    const t = tokens[idx];
    if (t.text === '}') {
      if (currentAccessor.length > 0) return null;
      break;
    }
    if (t.type === 'word' && accessorWords.includes(t.text)) {
      currentAccessor.push(t.text);
      idx++;
    } else if (t.type === 'symbol' && t.text === ';') {
      if (currentAccessor.length === 0) return null;
      accessorParts.push(currentAccessor.join(' ') + ';');
      currentAccessor = [];
      idx++;
    } else {
      return null;
    }
  }

  if (accessorParts.length === 0) return null;
  idx++; // skip '}'

  let resultText = `{ ${accessorParts.join(' ')} }`;

  // Check for initializer: e.g. = "default";
  if (idx < tokens.length && tokens[idx].text === '=') {
    let initText = ' =';
    idx++;
    while (idx < tokens.length) {
      const t = tokens[idx];
      if (t.text === ';') {
        initText += ';';
        idx++;
        break;
      }
      initText += ' ' + t.text;
      idx++;
    }
    resultText += initText;
  }

  return {
    text: resultText,
    nextIndex: idx
  };
}

function tokenizeCsharp(source: string): Array<{ type: Token['type'] | 'whitespace' | 'newline'; text: string }> {
  const tokens: Array<{ type: Token['type'] | 'whitespace' | 'newline'; text: string }> = [];
  let index = 0;
  const len = source.length;

  while (index < len) {
    const ch = source[index];
    const next = source[index + 1];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\v' || ch === '\f') {
      let ws = ch;
      index++;
      while (index < len && (source[index] === ' ' || source[index] === '\t' || source[index] === '\v' || source[index] === '\f')) {
        ws += source[index++];
      }
      tokens.push({ type: 'whitespace', text: ws });
      continue;
    }

    // Newlines
    if (ch === '\r' || ch === '\n') {
      let nl = '';
      if (ch === '\r' && next === '\n') {
        nl = '\r\n';
        index += 2;
      } else {
        nl = ch;
        index++;
      }
      tokens.push({ type: 'newline', text: nl });
      continue;
    }

    // Comments
    if (ch === '/' && next === '/') {
      let comment = '//';
      index += 2;
      while (index < len && source[index] !== '\n' && source[index] !== '\r') {
        comment += source[index++];
      }
      tokens.push({ type: 'lineComment', text: comment });
      continue;
    }

    if (ch === '/' && next === '*') {
      let comment = '/*';
      index += 2;
      while (index < len && !(source[index] === '*' && source[index + 1] === '/')) {
        comment += source[index++];
      }
      if (index < len) {
        comment += '*/';
        index += 2;
      }
      tokens.push({ type: 'blockComment', text: comment });
      continue;
    }

    // Preprocessor directives
    if (ch === '#') {
      let prep = '#';
      index++;
      while (index < len && source[index] !== '\n' && source[index] !== '\r') {
        prep += source[index++];
      }
      tokens.push({ type: 'preprocessor', text: prep });
      continue;
    }

    // Raw String Literals (C# 11: """ or more)
    if (ch === '"' && next === '"' && source[index + 2] === '"') {
      let quoteCount = 0;
      while (index + quoteCount < len && source[index + quoteCount] === '"') {
        quoteCount++;
      }
      let rawStr = '"'.repeat(quoteCount);
      index += quoteCount;
      const endQuotes = '"'.repeat(quoteCount);
      const endIndex = source.indexOf(endQuotes, index);
      if (endIndex !== -1) {
        rawStr += source.slice(index, endIndex + quoteCount);
        index = endIndex + quoteCount;
      } else {
        rawStr += source.slice(index);
        index = len;
      }
      tokens.push({ type: 'string', text: rawStr });
      continue;
    }

    // Verbatim / Interpolated Strings (@", $@", @$", $")
    if (
      (ch === '@' && next === '"') ||
      (ch === '$' && next === '@' && source[index + 2] === '"') ||
      (ch === '@' && next === '$' && source[index + 2] === '"')
    ) {
      let prefix = '@"';
      let offset = 2;
      if (ch === '$' || (ch === '@' && next === '$')) {
        prefix = source.slice(index, index + 3);
        offset = 3;
      }
      let str = prefix;
      index += offset;
      while (index < len) {
        if (source[index] === '"') {
          str += '"';
          index++;
          if (index < len && source[index] === '"') {
            str += '"';
            index++;
          } else {
            break;
          }
        } else {
          str += source[index++];
        }
      }
      tokens.push({ type: 'string', text: str });
      continue;
    }

    // Regular Interpolated String or Regular String
    if ((ch === '$' && next === '"') || ch === '"') {
      const isInterp = ch === '$';
      let str = isInterp ? '$"' : '"';
      index += isInterp ? 2 : 1;
      let escaped = false;
      while (index < len) {
        const cur = source[index++];
        str += cur;
        if (escaped) {
          escaped = false;
        } else if (cur === '\\') {
          escaped = true;
        } else if (cur === '"') {
          break;
        }
      }
      tokens.push({ type: 'string', text: str });
      continue;
    }

    // Character Literals
    if (ch === "'") {
      let charLit = "'";
      index++;
      let escaped = false;
      while (index < len) {
        const cur = source[index++];
        charLit += cur;
        if (escaped) {
          escaped = false;
        } else if (cur === '\\') {
          escaped = true;
        } else if (cur === "'") {
          break;
        }
      }
      tokens.push({ type: 'char', text: charLit });
      continue;
    }

    // Multi-char Symbols & Operators
    const threeChars = source.slice(index, index + 3);
    if (threeChars === '??=' || threeChars === '<<=' || threeChars === '>>=') {
      tokens.push({ type: 'symbol', text: threeChars });
      index += 3;
      continue;
    }
    const twoChars = source.slice(index, index + 2);
    if ([
      '=>', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=',
      '&=', '|=', '^=', '??', '?.', '++', '--', '&&', '||', '<<', '>>', '::'
    ].includes(twoChars)) {
      tokens.push({ type: 'symbol', text: twoChars });
      index += 2;
      continue;
    }

    // Single-char Symbols
    if ('{}()[];,:.?=+-*/%&|^!~<>'.includes(ch)) {
      tokens.push({ type: 'symbol', text: ch });
      index++;
      continue;
    }

    // Words
    let word = '';
    while (index < len) {
      const c = source[index];
      if (' \t\v\f\r\n{}()[];,:.?=+-*/%&|^!~<>"\'/\\#'.includes(c)) {
        break;
      }
      word += c;
      index++;
    }
    if (word) {
      tokens.push({ type: 'word', text: word });
      continue;
    }

    index++;
  }

  return tokens;
}
