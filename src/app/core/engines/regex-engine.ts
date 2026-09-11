export interface MatchDetail {
  index: number;
  fullMatch: string;
  start: number;
  end: number;
  numberedGroups: string[];
  namedGroups: Record<string, string>;
}

export interface RegexEvaluationResult {
  highlightedHtml: string;
  replacedText: string;
  matches: MatchDetail[];
  matchCount: number;
  error?: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function validateRegex(pattern: string, flags: string): { valid: boolean; error?: string } {
  const pat = pattern.trim();
  const flg = flags.trim();
  if (!pat) return { valid: true };
  try {
    new RegExp(pat, flg);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

export function buildHighlightedHtml(text: string, pat: string, flags: string): string {
  if (!text || !pat) return escapeHtml(text || '');
  try {
    const safeFlags = flags.includes('g') ? flags : flags + 'g';
    const re = new RegExp(pat, safeFlags);
    const matches: Array<{ start: number; end: number }> = [];
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      matches.push({ start: m.index, end: m.index + m[0].length });
    }

    if (!matches.length) return escapeHtml(text);

    let html = '';
    let lastIdx = 0;
    for (const match of matches) {
      if (match.start > lastIdx) {
        html += escapeHtml(text.slice(lastIdx, match.start));
      }
      html += `<mark class="regex-match">${escapeHtml(text.slice(match.start, match.end))}</mark>`;
      lastIdx = match.end;
    }
    if (lastIdx < text.length) {
      html += escapeHtml(text.slice(lastIdx));
    }
    return html;
  } catch {
    return escapeHtml(text);
  }
}

export function evaluateTestCase(
  text: string,
  pattern: string,
  flags: string,
  replacement = '',
): RegexEvaluationResult {
  const pat = pattern.trim();
  const flg = flags.trim();

  if (!pat) {
    return {
      highlightedHtml: escapeHtml(text),
      replacedText: text,
      matches: [],
      matchCount: 0,
    };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pat, flg);
  } catch (err) {
    return {
      highlightedHtml: escapeHtml(text),
      replacedText: text,
      matches: [],
      matchCount: 0,
      error: (err as Error).message,
    };
  }

  const safeGlobalFlags = flg.includes('g') ? flg : flg + 'g';
  let globalRegex: RegExp;
  try {
    globalRegex = new RegExp(pat, safeGlobalFlags);
  } catch {
    globalRegex = regex;
  }

  const rawMatches: RegExpExecArray[] = [];
  try {
    globalRegex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = globalRegex.exec(text)) !== null) {
      rawMatches.push(m);
      if (m[0].length === 0) {
        globalRegex.lastIndex++;
      }
    }
  } catch {
    // ignore scan errors
  }

  const matches: MatchDetail[] = rawMatches.map((m, idx) => {
    const numbered = m.slice(1);
    const named: Record<string, string> = {};
    if (m.groups) {
      for (const [k, v] of Object.entries(m.groups)) {
        if (v !== undefined) named[k] = v;
      }
    }
    return {
      index: idx + 1,
      fullMatch: m[0],
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      numberedGroups: numbered,
      namedGroups: named,
    };
  });

  const highlightedHtml = buildHighlightedHtml(text, pat, flg);
  let replacedText = '';
  try {
    replacedText = text.replace(globalRegex, replacement);
  } catch (err) {
    replacedText = `[Replace Error: ${(err as Error).message}]`;
  }

  return {
    highlightedHtml,
    replacedText,
    matches,
    matchCount: matches.length,
  };
}
