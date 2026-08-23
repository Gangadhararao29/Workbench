import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { runScript } from '../../../core/engines/script-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-script-runner',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, CodeEditor],
  templateUrl: './script-runner.html',
  styleUrls: ['./script-runner.css'],
})
export class ScriptRunner {
  @Input({ required: true }) instanceId!: string;
  inputs = '{\n  "todoId": 1\n}';
  script =
    'const id = inputs.todoId || 1;\nconst res = await fetch("https://jsonplaceholder.typicode.com/todos/" + id);\nif (!res.ok) throw new Error("HTTP error! status: " + res.status);\nconst data = await res.json();\nreturn {\n  success: true,\n  title: data.title,\n  completed: data.completed\n};';
  scriptName = 'Fetch TODO (Async Demo)';
  definition = signal(
    JSON.stringify(
      {
        name: 'Fetch TODO (Async Demo)',
        inputs: { todoId: 1 },
        script:
          'const id = inputs.todoId || 1;\nconst res = await fetch("https://jsonplaceholder.typicode.com/todos/" + id);\nif (!res.ok) throw new Error("HTTP error! status: " + res.status);\nconst data = await res.json();\nreturn {\n  success: true,\n  title: data.title,\n  completed: data.completed\n};',
      },
      null,
      2,
    ),
  );
  result = signal('');

  inputType: 'json' | 'object' = 'json';

  setInputType(type: 'json' | 'object') {
    this.inputType = type;
    if (type === 'json') {
      try {
        const parsed = parseJSObject(this.inputs);
        this.inputs = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep inputs as is if they can't be converted to strict JSON (e.g. contains comments)
      }
    }
  }

  async execute() {
    try {
      const inputs = parseJSObject(this.inputs);
      const output = await runScript(this.script, inputs);
      this.result.set(typeof output === 'string' ? output : JSON.stringify(output, null, 2));
    } catch (error) {
      this.result.set(`Script failed: ${(error as Error).message}`);
    }
  }

  reset() {
    this.scriptName = 'Fetch TODO (Async Demo)';
    this.inputs = '{\n  "todoId": 1\n}';
    this.script =
      'const id = inputs.todoId || 1;\nconst res = await fetch("https://jsonplaceholder.typicode.com/todos/" + id);\nif (!res.ok) throw new Error("HTTP error! status: " + res.status);\nconst data = await res.json();\nreturn {\n  success: true,\n  title: data.title,\n  completed: data.completed\n};';
    this.definition.set(
      JSON.stringify(
        {
          name: 'Fetch TODO (Async Demo)',
          inputs: { todoId: 1 },
          script:
            'const id = inputs.todoId || 1;\nconst res = await fetch("https://jsonplaceholder.typicode.com/todos/" + id);\nif (!res.ok) throw new Error("HTTP error! status: " + res.status);\nconst data = await res.json();\nreturn {\n  success: true,\n  title: data.title,\n  completed: data.completed\n};',
        },
        null,
        2,
      ),
    );
    this.result.set('');
  }

  exportDefinition() {
    let parsedInputs: any = {};
    try {
      parsedInputs = parseJSObject(this.inputs || '{}');
    } catch {}
    this.definition.set(
      JSON.stringify({ name: this.scriptName, inputs: parsedInputs, script: this.script }, null, 2),
    );
  }

  importDefinition() {
    try {
      const value = JSON.parse(this.definition()) as {
        name?: string;
        inputs?: unknown;
        script?: string;
      };
      this.scriptName = value.name ?? 'Imported Script';
      this.inputs = JSON.stringify(value.inputs ?? {}, null, 2);
      this.script = value.script ?? 'return inputs;';
      this.result.set('Script imported.');
    } catch {
      this.result.set('Invalid script definition JSON.');
    }
  }
}

function parseJSObject(val: string): any {
  const clean = val.trim();
  if (!clean) return {};
  // Safely evaluate standard JS object literal notation
  return new Function(`"use strict";\nreturn (${clean});`)();
}
