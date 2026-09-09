import { Component, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  evaluateJsonPathDetailed,
  getJsonPathAtOffset,
} from '../../../core/engines/json-path-engine';
import { InstanceService } from '../../../core/tool/tool-instance';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-json-path',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, CodeEditor],
  templateUrl: './json-path.html',
  styleUrls: ['./json-path.css'],
})
export class JsonPath implements OnInit {
  @Input({ required: true }) instanceId!: string;

  constructor(public instanceService: InstanceService) {}

  input = signal(
    JSON.stringify(
      {
        users: [
          { id: 1, name: 'Ada', role: 'admin', skills: ['math', 'algorithms'] },
          { id: 2, name: 'Grace', role: 'compiler', skills: ['compilers', 'cobol'] },
        ],
        version: '1.0.0',
      },
      null,
      2
    )
  );

  path = '$.users[0].name';
  result = signal('');
  matchSummary = signal('');
  errorMsg = signal('');
  autoPathOnClick = signal(false);
  resultType = signal<'value' | 'path' | 'pointer'>('value');

  ngOnInit() {
    this.evaluate();
  }

  evaluate() {
    this.errorMsg.set('');

    const trimmedPath = this.path.trim();
    if (!trimmedPath) {
      this.result.set('');
      this.matchSummary.set('');
      return;
    }

    try {
      const evaluation = evaluateJsonPathDetailed(this.input(), trimmedPath, {
        resultType: this.resultType(),
      });
      this.result.set(evaluation.formatted);
      if (evaluation.count === 0) {
        this.matchSummary.set('No match');
      } else if (evaluation.count === 1) {
        this.matchSummary.set('1 match');
      } else {
        this.matchSummary.set(`${evaluation.count} matches`);
      }
    } catch (error) {
      const msg = (error as Error).message;
      this.errorMsg.set(msg);
      this.matchSummary.set('Error');
      this.result.set(`// Error:\n// ${msg}`);
    }
  }

  setResultType(type: 'value' | 'path' | 'pointer') {
    this.resultType.set(type);
    this.evaluate();
  }

  toggleAutoPath() {
    this.autoPathOnClick.set(!this.autoPathOnClick());
  }

  onEditorClick(event: { offset: number }) {
    if (!this.autoPathOnClick()) return;
    try {
      const detected = getJsonPathAtOffset(this.input(), event.offset);
      if (detected) {
        this.path = detected;
        this.evaluate();
      }
    } catch {
      // Ignore offset mapping errors if JSON is momentarily invalid during typing
    }
  }

  onInputChange(val: string) {
    this.input.set(val);
    this.evaluate();
  }
}
