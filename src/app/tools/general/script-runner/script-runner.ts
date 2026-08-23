import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { runScript } from '../../../core/engines/script-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-script-runner', standalone: true, imports: [FormsModule, MatButtonModule, CodeEditor],
  templateUrl: './script-runner.html', styleUrls: ['./script-runner.css']
})
export class ScriptRunner {
  @Input({ required: true }) instanceId!: string;
  inputs = '{"name":"Ada","count":3}';
  script = 'return `${inputs.name} x ${inputs.count}`;';
  scriptName = 'My Script';
  definition = signal('');
  result = signal('');
  async execute() {
    try {
      const inputs = JSON.parse(this.inputs);
      const output = await runScript(this.script, inputs);
      this.result.set(typeof output === 'string' ? output : JSON.stringify(output, null, 2));
    } catch (error) { this.result.set(`Script failed: ${(error as Error).message}`); }
  }
  reset() { this.inputs = '{}'; this.script = 'return inputs;'; this.result.set(''); }

  exportDefinition() {
    this.definition.set(JSON.stringify({ name: this.scriptName, inputs: JSON.parse(this.inputs || '{}'), script: this.script }, null, 2));
  }

  importDefinition() {
    try {
      const value = JSON.parse(this.definition()) as { name?: string; inputs?: unknown; script?: string };
      this.scriptName = value.name ?? 'Imported Script';
      this.inputs = JSON.stringify(value.inputs ?? {}, null, 2);
      this.script = value.script ?? 'return inputs;';
      this.result.set('Script imported.');
    } catch { this.result.set('Invalid script definition JSON.'); }
  }
}
