import { Component, DoCheck, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { runScript, ScriptRunOptions } from '../../../core/engines/script-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState, ToolStateSnapshot } from '../../../core/tool/tool-state';

export type RunnerStatus = 'idle' | 'running' | 'success' | 'error' | 'imported';

const DEFAULT_SCRIPT =
  'const id = inputs.todoId || 1;\nconst res = await fetch("https://jsonplaceholder.typicode.com/todos/" + id);\nif (!res.ok) throw new Error("HTTP error! status: " + res.status);\nconst data = await res.json();\nreturn {\n  success: true,\n  title: data.title,\n  completed: data.completed\n};';

const DEFAULT_INPUTS = '{\n  "todoId": 1\n}';
const DEFAULT_NAME = 'Fetch TODO (Async Demo)';

@Component({
  selector: 'app-script-runner',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './script-runner.html',
  styleUrls: ['./script-runner.css'],
})
export class ScriptRunner implements OnInit, DoCheck {
  @Input({ required: true }) instanceId!: string;
  private toolState: ToolState | null = null;
  private stateFingerprint = '';

  constructor(private instanceService: InstanceService) {}

  inputs = DEFAULT_INPUTS;
  script = DEFAULT_SCRIPT;
  scriptName = DEFAULT_NAME;
  definition = signal(
    JSON.stringify(
      {
        name: DEFAULT_NAME,
        inputs: { todoId: 1 },
        script: DEFAULT_SCRIPT,
      },
      null,
      2,
    ),
  );

  result = signal('');
  status = signal<RunnerStatus>('idle');
  inputType: 'json' | 'object' = 'json';

  ngOnInit(): void {
    this.toolState = new ToolState(this.instanceService, this.instanceId, 'script-runner');
    this.restoreToolState(this.toolState.state());
    this.stateFingerprint = JSON.stringify(this.readToolState());
  }

  ngDoCheck(): void {
    const snapshot = this.readToolState();
    const fingerprint = JSON.stringify(snapshot);
    if (!this.toolState || fingerprint === this.stateFingerprint) return;
    this.stateFingerprint = fingerprint;
    this.toolState.save(snapshot);
  }

  private saveToolState(): void {
    if (!this.toolState) return;
    const snapshot = this.readToolState();
    this.stateFingerprint = JSON.stringify(snapshot);
    this.toolState.save(snapshot);
  }

  setScriptName(value: string): void {
    this.scriptName = value;
    this.saveToolState();
  }

  setScript(value: string): void {
    this.script = value;
    this.saveToolState();
  }

  setInputs(value: string): void {
    this.inputs = value;
    this.saveToolState();
  }

  private readToolState(): ToolStateSnapshot {
    return {
      input: { inputs: this.inputs, script: this.script, scriptName: this.scriptName, definition: this.definition() },
      output: { result: this.result(), status: this.status() === 'running' ? 'idle' : this.status() },
      options: { inputType: this.inputType },
    };
  }

  private restoreToolState(state: ToolStateSnapshot): void {
    this.inputs = state.input['inputs'];
    this.script = state.input['script'];
    this.scriptName = state.input['scriptName'];
    this.definition.set(state.input['definition']);
    this.result.set(state.output['result'] ?? '');
    this.status.set(state.output['status'] ?? 'idle');
    this.inputType = state.options['inputType'] ?? 'json';
  }

  setInputType(type: 'json' | 'object') {
    this.inputType = type;
    if (type === 'json') {
      try {
        const parsed = JSON.parse(this.inputs);
        this.inputs = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep inputs as is if not valid JSON
      }
    }
    this.saveToolState();
  }

  async execute() {
    this.status.set('running');
    try {
      let options: ScriptRunOptions;
      if (this.inputType === 'json') {
        const clean = this.inputs.trim();
        const parsed = clean ? JSON.parse(clean) : {};
        options = { inputs: parsed };
      } else {
        // Evaluate object literal safely inside the sandboxed iframe
        options = { rawInputs: this.inputs, isObjectInput: true };
      }

      const output = await runScript(this.script, options);

      let outputText = '';
      if (output.logs && output.logs.length > 0) {
        outputText += `--- Console Logs ---\n${output.logs.join('\n')}\n\n--- Return Value ---\n`;
      }

      if (output.isUndefined) {
        outputText +=
          output.logs && output.logs.length > 0
            ? '(No return value)'
            : 'Execution finished with undefined return value.';
      } else if (typeof output.value === 'string') {
        outputText += output.value;
      } else {
        outputText += JSON.stringify(output.value, null, 2);
      }

      this.result.set(outputText);
      this.status.set('success');
    } catch (error) {
      const err = error as Error & { logs?: string[] };
      let errorText = `Script failed: ${err?.message || String(error)}`;
      if (err?.logs && err.logs.length > 0) {
        errorText = `--- Console Logs ---\n${err.logs.join('\n')}\n\n` + errorText;
      }
      this.result.set(errorText);
      this.status.set('error');
    }
    this.saveToolState();
  }

  reset() {
    this.scriptName = DEFAULT_NAME;
    this.inputs = DEFAULT_INPUTS;
    this.script = DEFAULT_SCRIPT;
    this.definition.set(
      JSON.stringify(
        {
          name: DEFAULT_NAME,
          inputs: { todoId: 1 },
          script: DEFAULT_SCRIPT,
        },
        null,
        2,
      ),
    );
    this.result.set('');
    this.status.set('idle');
    this.saveToolState();
  }

  exportDefinition() {
    let parsedInputs: unknown = this.inputs;
    try {
      parsedInputs = JSON.parse(this.inputs || '{}');
    } catch {
      parsedInputs = this.inputs;
    }
    this.definition.set(
      JSON.stringify(
        { name: this.scriptName, inputs: parsedInputs, script: this.script },
        null,
        2,
      ),
    );
    this.saveToolState();
  }

  importDefinition() {
    try {
      const raw = JSON.parse(this.definition());
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        this.result.set('Invalid script definition: Root must be a JSON object.');
        this.status.set('error');
        return;
      }

      const value = raw as { name?: unknown; inputs?: unknown; script?: unknown };
      this.scriptName = typeof value.name === 'string' ? value.name : 'Imported Script';

      if (typeof value.inputs === 'string') {
        this.inputs = value.inputs;
      } else if (value.inputs !== undefined && value.inputs !== null) {
        this.inputs = JSON.stringify(value.inputs, null, 2);
      } else {
        this.inputs = '{}';
      }

      this.script = typeof value.script === 'string' ? value.script : 'return inputs;';
      this.result.set('Script imported successfully.');
      this.status.set('imported');
    } catch {
      this.result.set('Invalid script definition JSON syntax.');
      this.status.set('error');
    }
    this.saveToolState();
  }
}
