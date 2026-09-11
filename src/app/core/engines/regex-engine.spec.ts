import { describe, it, expect } from 'vitest';
import { validateRegex, evaluateTestCase, buildHighlightedHtml, escapeHtml } from './regex-engine';

describe('regex-engine', () => {
  it('should validate standard and invalid regex patterns', () => {
    expect(validateRegex('^[a-z]+$', 'i').valid).toBe(true);
    expect(validateRegex('[a-z', 'i').valid).toBe(false);
  });

  it('should evaluate matches and named capture groups', () => {
    const text = 'user-101 and admin-202';
    const pattern = '(?<role>user|admin)-(?<id>\\d+)';
    const result = evaluateTestCase(text, pattern, 'g', 'account-$<id>');

    expect(result.matchCount).toBe(2);
    expect(result.matches[0].fullMatch).toBe('user-101');
    expect(result.matches[0].namedGroups).toEqual({ role: 'user', id: '101' });
    expect(result.matches[1].fullMatch).toBe('admin-202');
    expect(result.matches[1].namedGroups).toEqual({ role: 'admin', id: '202' });
    expect(result.replacedText).toBe('account-101 and account-202');
  });

  it('should safely escape HTML and highlight matched regions', () => {
    const text = 'hello <world> & friends';
    const highlighted = buildHighlightedHtml(text, '<world>', 'g');
    expect(highlighted).toContain('&lt;world&gt;');
    expect(highlighted).toContain('<mark class="regex-match">&lt;world&gt;</mark>');
    expect(highlighted).toContain('&amp;');
  });

  it('should properly escape HTML characters', () => {
    expect(escapeHtml('<div>"test" & \'value\'</div>')).toBe(
      '&lt;div&gt;&quot;test&quot; &amp; &#039;value&#039;&lt;/div&gt;',
    );
  });
});
