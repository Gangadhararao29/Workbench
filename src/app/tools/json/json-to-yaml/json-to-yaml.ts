import {
  Component,
  Input,
  computed,
  signal,
  effect,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  jsonToYaml,
  yamlToJson,
  detectFormat,
  YAML_PRESETS,
  YamlPreset
} from '../../../core/engines/yaml-engine';
import { formatJson, minifyJson } from '../../../core/engines/json-engine';

export type ConversionMode = 'json-to-yaml' | 'yaml-to-json';

const DEFAULT_STATE = defaultToolStateFor('json-to-yaml')!;

@Component({
  selector: 'app-json-to-yaml',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    CodeEditor
  ],
  templateUrl: './json-to-yaml.html',
  styleUrls: ['./json-to-yaml.css']
})
export class JsonToYaml implements OnInit {
  @Input({ required: true }) instanceId!: string;

  private toolState = signal<ToolState | null>(null);
  mode = computed<ConversionMode>(() => this.toolState()?.state().options['mode'] ?? DEFAULT_STATE.options['mode']);
  input = computed<string>(() => this.toolState()?.state().input['document'] ?? DEFAULT_STATE.input['document']);
  result = computed<string>(() => this.toolState()?.state().output['document'] ?? '');
  errorMessage = computed<string>(() => this.toolState()?.state().output['errorMessage'] ?? '');
  copied = signal<boolean>(false);
  activePreset = computed<string>(() => this.toolState()?.state().input['activePreset'] ?? DEFAULT_STATE.input['activePreset']);
  private lastConversionSignature = '';

  presets: YamlPreset[] = YAML_PRESETS;

  constructor(private instanceService: InstanceService) {
    // Re-run conversion when configuration changes
    effect(() => {
      const cfg = this.options();
      const curInput = this.input();
      const curMode = this.mode();
      const signature = JSON.stringify([curInput, curMode, cfg]);
      if (signature === this.lastConversionSignature) return;
      this.lastConversionSignature = signature;
      this.runConversion(curInput, curMode, cfg);
    });
  }

  options = computed(() => {
    return this.toolState()?.state().options ?? DEFAULT_STATE.options;
  });

  inputLanguage = computed(() => (this.mode() === 'json-to-yaml' ? 'json' : 'yaml'));
  outputLanguage = computed(() => (this.mode() === 'json-to-yaml' ? 'yaml' : 'json'));

  stats = computed(() => {
    const inText = this.input();
    const outText = this.result();
    if (!inText && !outText) return null;

    const inBytes = new Blob([inText]).size;
    const outBytes = new Blob([outText]).size;
    const inLines = inText ? inText.split('\n').length : 0;
    const outLines = outText ? outText.split('\n').length : 0;
    const diffPct = inBytes > 0 ? Math.round(((outBytes - inBytes) / inBytes) * 100) : 0;

    return {
      inBytes,
      outBytes,
      inLines,
      outLines,
      diffPct
    };
  });

  ngOnInit(): void {
    this.toolState.set(new ToolState(this.instanceService, this.instanceId));
    this.convert();
  }

  setMode(newMode: ConversionMode): void {
    if (this.mode() === newMode) return;
    this.switchModeAndContent(newMode);
  }

  swapDirection(): void {
    const newMode: ConversionMode = this.mode() === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml';
    this.switchModeAndContent(newMode);
  }

  private switchModeAndContent(newMode: ConversionMode): void {
    const prevResult = this.result();
    const prevInput = this.input();
    const currentPreset = this.activePreset();
    const preset = this.presets.find(p => p.name === currentPreset);

    this.toolState()?.updateOptions({ mode: newMode });

    if (prevResult && !this.errorMessage()) {
      this.updateInput(prevResult);
      this.runConversion(prevResult, newMode, this.options());
    } else if (preset && prevInput === (newMode === 'yaml-to-json' ? preset.json : preset.yaml)) {
      const nextInput = newMode === 'yaml-to-json' ? preset.yaml : preset.json;
      this.updateInput(nextInput);
      this.runConversion(nextInput, newMode, this.options());
    } else if (prevInput) {
      this.runConversion(prevInput, newMode, this.options());
    }
  }

  onInputChange(val: string): void {
    this.updateInput(val);
    this.runConversion(val, this.mode(), this.options());
  }

  private updateInput(document: string, activePreset = this.activePreset()): void {
    this.toolState()?.updateInput({ document, activePreset });
  }

  convert(): void {
    this.runConversion(this.input(), this.mode(), this.options());
  }

  private runConversion(inputVal: string, mode: ConversionMode, cfg: Record<string, any>): void {
    if (!inputVal || !inputVal.trim()) {
      this.toolState()?.updateOutput({ document: '', errorMessage: '' });
      return;
    }

    try {
      if (mode === 'json-to-yaml') {
        const indent = cfg['indent'] === '4 spaces' ? 4 : 2;
        const sortKeys = Boolean(cfg['sortKeys']);
        const quotingType = cfg['quotingType'] ?? 'none';
        const flowLevel = typeof cfg['flowLevel'] === 'number' ? cfg['flowLevel'] : -1;
        const forceQuotes = Boolean(cfg['forceQuotes']);

        const converted = jsonToYaml(inputVal, {
          indent,
          sortKeys,
          quotingType,
          flowLevel,
          forceQuotes
        });
        this.toolState()?.updateOutput({ document: converted, errorMessage: '' });
      } else {
        const indent = cfg['indent'] === '4 spaces' ? 4 : 2;
        const sortKeys = Boolean(cfg['sortKeys']);
        const compact = Boolean(cfg['compactJson']);

        const converted = yamlToJson(inputVal, {
          indent,
          sortKeys,
          compact
        });
        this.toolState()?.updateOutput({ document: converted, errorMessage: '' });
      }
    } catch (err) {
      this.toolState()?.updateOutput({ errorMessage: (err as Error).message });
    }
  }

  loadPreset(name: string): void {
    const preset = this.presets.find(p => p.name === name);
    if (!preset) return;

    if (this.mode() === 'json-to-yaml') {
      this.updateInput(preset.json, name);
    } else {
      this.updateInput(preset.yaml, name);
    }
    this.convert();
  }

  formatInput(): void {
    const val = this.input();
    if (!val.trim()) return;

    try {
      if (this.mode() === 'json-to-yaml') {
        const indent = this.options()['indent'] === '4 spaces' ? 4 : 2;
        this.updateInput(formatJson(val, { indent }));
      } else {
        // Beautify YAML via js-yaml dump
        const indent = this.options()['indent'] === '4 spaces' ? 4 : 2;
        const converted = jsonToYaml(yamlToJson(val), { indent });
        this.updateInput(converted);
      }
      this.toolState()?.updateOutput({ errorMessage: '' });
    } catch (err) {
      this.toolState()?.updateOutput({ errorMessage: `Cannot format input: ${(err as Error).message}` });
    }
  }

  minifyInput(): void {
    const val = this.input();
    if (!val.trim()) return;

    try {
      if (this.mode() === 'json-to-yaml') {
        this.updateInput(minifyJson(val));
      } else {
        // For YAML, compact flow mode
        const converted = jsonToYaml(yamlToJson(val), { flowLevel: 0 });
        this.updateInput(converted);
      }
      this.toolState()?.updateOutput({ errorMessage: '' });
    } catch (err) {
      this.toolState()?.updateOutput({ errorMessage: `Cannot minify input: ${(err as Error).message}` });
    }
  }

  clear(): void {
    this.updateInput('', '');
    this.toolState()?.updateOutput({ document: '', errorMessage: '' });
  }

  async copyResult(): Promise<void> {
    const text = this.result();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  }

  downloadResult(): void {
    const text = this.result();
    if (!text) return;

    const isYaml = this.outputLanguage() === 'yaml';
    const filename = isYaml ? 'output.yaml' : 'output.json';
    const mime = isYaml ? 'text/yaml' : 'application/json';

    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  handleFileUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      if (content) {
        // Auto-detect direction based on file extension or content
        if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          this.toolState()?.updateOptions({ mode: 'yaml-to-json' });
        } else if (file.name.endsWith('.json')) {
          this.toolState()?.updateOptions({ mode: 'json-to-yaml' });
        } else {
          const detected = detectFormat(content);
          if (detected === 'yaml') {
            this.toolState()?.updateOptions({ mode: 'yaml-to-json' });
          } else if (detected === 'json') {
            this.toolState()?.updateOptions({ mode: 'json-to-yaml' });
          }
        }
        this.updateInput(content, '');
        this.convert();
      }
      target.value = '';
    };
    reader.readAsText(file);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
}
