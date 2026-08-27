import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface MatchDetail {
  index: number;
  fullMatch: string;
  start: number;
  end: number;
  numberedGroups: string[];
  namedGroups: Record<string, string>;
}

export interface TestCaseEvaluation {
  id: string;
  text: string;
  highlightedHtml: string;
  replacedText: string;
  matches: MatchDetail[];
  matchCount: number;
  error?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHighlightedHtml(text: string, pat: string, flags: string): string {
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

@Component({
  selector: 'app-regex-tester',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './regex-tester.html',
  styleUrls: ['./regex-tester.css']
})
export class RegexTester {
  @Input({ required: true }) instanceId!: string;

  pattern = signal('(?<prefix>user|admin)-(?<id>\\d+)');
  flags = signal('g');
  replacement = signal('account-$<id> ($<prefix>)');

  testCases = signal<Array<{ id: string; text: string }>>([
    { id: '1', text: 'user-42 authenticated successfully' },
    { id: '2', text: 'admin-7 granted elevated permissions' },
    { id: '3', text: 'guest-999 access denied' },
    { id: '4', text: 'user-108 and user-204 logged in' }
  ]);

  regexError = computed(() => {
    const pat = this.pattern().trim();
    const flg = this.flags().trim();
    if (!pat) return '';
    try {
      new RegExp(pat, flg);
      return '';
    } catch (err) {
      return (err as Error).message;
    }
  });

  evaluations = computed<TestCaseEvaluation[]>(() => {
    const pat = this.pattern().trim();
    const flg = this.flags().trim();
    const repl = this.replacement();
    const cases = this.testCases();

    if (!pat) {
      return cases.map(c => ({
        id: c.id,
        text: c.text,
        highlightedHtml: escapeHtml(c.text),
        replacedText: c.text,
        matches: [],
        matchCount: 0
      }));
    }

    let regex: RegExp;
    try {
      regex = new RegExp(pat, flg);
    } catch {
      return cases.map(c => ({
        id: c.id,
        text: c.text,
        highlightedHtml: escapeHtml(c.text),
        replacedText: c.text,
        matches: [],
        matchCount: 0
      }));
    }

    const safeGlobalFlags = flg.includes('g') ? flg : flg + 'g';
    let globalRegex: RegExp;
    try {
      globalRegex = new RegExp(pat, safeGlobalFlags);
    } catch {
      globalRegex = regex;
    }

    return cases.map(c => {
      const text = c.text;
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
        // ignore regex scan errors
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
          namedGroups: named
        };
      });

      const highlightedHtml = buildHighlightedHtml(text, pat, flg);
      let replacedText = '';
      try {
        replacedText = text.replace(globalRegex, repl);
      } catch {
        replacedText = text;
      }

      return {
        id: c.id,
        text,
        highlightedHtml,
        replacedText,
        matches,
        matchCount: matches.length
      };
    });
  });

  addTestCase() {
    const current = this.testCases();
    const newId = String(Date.now());
    this.testCases.set([...current, { id: newId, text: 'new test string' }]);
  }

  removeTestCase(id: string) {
    const current = this.testCases();
    if (current.length > 1) {
      this.testCases.set(current.filter(c => c.id !== id));
    }
  }

  updateTestCase(id: string, text: string) {
    const current = this.testCases();
    this.testCases.set(current.map(c => (c.id === id ? { ...c, text } : c)));
  }

  getNamedGroupEntries(namedGroups: Record<string, string>): Array<{ key: string; value: string }> {
    return Object.entries(namedGroups).map(([key, value]) => ({ key, value }));
  }
}
