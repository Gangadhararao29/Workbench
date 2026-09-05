import { Component, Input, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatchDetail,
  RegexEvaluationResult,
  validateRegex,
  evaluateTestCase,
} from '../../../core/engines/regex-engine';
import { InstanceService } from '../../../core/tool/tool-instance';

export interface TestCaseEvaluation extends RegexEvaluationResult {
  id: string;
  text: string;
}

export type { MatchDetail };

@Component({
  selector: 'app-regex-tester',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './regex-tester.html',
  styleUrls: ['./regex-tester.css'],
})
export class RegexTester {
  @Input({ required: true }) instanceId!: string;

  public instanceService = inject(InstanceService);

  pattern = signal('(?<prefix>user|admin)-(?<id>\\d+)');
  flags = signal('g');
  replacement = signal('account-$<id> ($<prefix>)');

  testCases = signal<Array<{ id: string; text: string }>>([
    { id: '1', text: 'user-108 and user-204 logged in' },
  ]);

  regexError = computed(() => {
    const res = validateRegex(this.pattern(), this.flags());
    return res.valid ? '' : res.error ?? '';
  });

  evaluations = computed<TestCaseEvaluation[]>(() => {
    const pat = this.pattern();
    const flg = this.flags();
    const repl = this.replacement();
    const cases = this.testCases();

    return cases.map((c) => {
      const evalResult = evaluateTestCase(c.text, pat, flg, repl);
      return {
        id: c.id,
        text: c.text,
        ...evalResult,
      };
    });
  });

  addTestCase(): void {
    const current = this.testCases();
    const newId = String(Date.now());
    this.testCases.set([...current, { id: newId, text: 'new test string' }]);
  }

  removeTestCase(id: string): void {
    const current = this.testCases();
    if (current.length > 1) {
      this.testCases.set(current.filter((c) => c.id !== id));
    }
  }

  updateTestCase(id: string, text: string): void {
    const current = this.testCases();
    this.testCases.set(current.map((c) => (c.id === id ? { ...c, text } : c)));
  }

  getNamedGroupEntries(namedGroups: Record<string, string>): Array<{ key: string; value: string }> {
    return Object.entries(namedGroups).map(([key, value]) => ({ key, value }));
  }
}
