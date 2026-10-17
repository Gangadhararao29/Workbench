import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  evaluateJsonPathDetailed,
  getJsonPathAtOffset,
} from '../../../core/engines/json-path-engine';
import { InstanceService } from '../../../core/tool/tool-instance';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { ToolState } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';

const DEFAULT_STATE = defaultToolStateFor('json-path')!;

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

  private toolState = signal<ToolState | null>(null);
  input = computed(() => this.toolState()?.state().input['document'] ?? DEFAULT_STATE.input['document']);
  path = computed(() => this.toolState()?.state().input['path'] ?? DEFAULT_STATE.input['path']);
  result = computed(() => this.toolState()?.state().output['result'] ?? '');
  matchSummary = computed(() => this.toolState()?.state().output['matchSummary'] ?? '');
  errorMsg = computed(() => this.toolState()?.state().output['errorMsg'] ?? '');
  autoPathOnClick = computed(() => this.toolState()?.state().options['autoPathOnClick'] ?? false);
  resultType = computed(() => this.toolState()?.state().options['resultType'] ?? 'value');

  ngOnInit() {
    this.toolState.set(new ToolState(this.instanceService, this.instanceId));
    this.evaluate();
  }

  evaluate() {
    const trimmedPath = this.path().trim();
    if (!trimmedPath) {
      this.toolState()?.updateOutput({ result: '', matchSummary: '', errorMsg: '' });
      return;
    }

    try {
      const evaluation = evaluateJsonPathDetailed(this.input(), trimmedPath, {
        resultType: this.resultType(),
      });
      let matchSummary: string;
      if (evaluation.count === 0) {
        matchSummary = 'No match';
      } else if (evaluation.count === 1) {
        matchSummary = '1 match';
      } else {
        matchSummary = `${evaluation.count} matches`;
      }
      this.toolState()?.updateOutput({ result: evaluation.formatted, matchSummary, errorMsg: '' });
    } catch (error) {
      const msg = (error as Error).message;
      this.toolState()?.updateOutput({ errorMsg: msg, matchSummary: 'Error', result: `// Error:\n// ${msg}` });
    }
  }

  setResultType(type: 'value' | 'path' | 'pointer') {
    this.toolState()?.updateOptions({ resultType: type });
    this.evaluate();
  }

  toggleAutoPath() {
    this.toolState()?.updateOptions({ autoPathOnClick: !this.autoPathOnClick() });
  }

  onEditorClick(event: { offset: number }) {
    if (!this.autoPathOnClick()) return;
    try {
      const detected = getJsonPathAtOffset(this.input(), event.offset);
      if (detected) {
        this.onPathChange(detected);
        this.evaluate();
      }
    } catch {
      // Ignore offset mapping errors if JSON is momentarily invalid during typing
    }
  }

  onInputChange(val: string) {
    this.toolState()?.updateInput({ document: val });
    this.evaluate();
  }

  onPathChange(path: string) {
    this.toolState()?.updateInput({ path });
  }
}
