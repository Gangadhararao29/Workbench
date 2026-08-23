import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-regex-tester', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './regex-tester.html', styleUrls: ['./regex-tester.css']
})
export class RegexTester {
  @Input({ required: true }) instanceId!: string;
  pattern = '^user-(\\d+)$';
  flags = 'gi';
  sample = 'user-42\nadmin-7\nuser-108';
  replacement = 'account-$1';
  result = signal('');
  test() {
    try {
      const regex = new RegExp(this.pattern, this.flags);
      const matches = [...this.sample.matchAll(regex)];
      const details = matches.map((match, index) => `Match ${index + 1}: ${match[0]}${match.length > 1 ? ` | Groups: ${match.slice(1).join(', ')}` : ''}`);
      const replaced = this.sample.replace(regex, this.replacement);
      this.result.set(`${matches.length ? details.join('\n') : 'No matches found.'}\n\nReplacement preview:\n${replaced}`);
    } catch (error) { this.result.set(`Invalid regular expression: ${(error as Error).message}`); }
  }
}
