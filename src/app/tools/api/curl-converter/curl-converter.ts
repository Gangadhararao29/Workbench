import { Component, Injector, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState, ToolStateSnapshot } from '../../../core/tool/tool-state';
import {
  CURL_PRESETS,
  TECHNOLOGIES,
  CurlPreset,
  ParsedCurlRequest,
  TechnologyId,
  TechnologyOption,
  convertCurl,
  formatCurlCommand,
  parseCurlCommand
} from '../../../core/engines/curl-engine';

@Component({
  selector: 'app-curl-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './curl-converter.html',
  styleUrls: ['./curl-converter.css']
})
export class CurlConverter implements OnInit {
  @Input({ required: true }) instanceId!: string;
  private toolState: ToolState | null = null;

  input = signal(`curl -X GET "https://localhost:5001/api/users?status=active" \\
  -H "Authorization: Bearer sample_jwt_token" \\
  -H "Accept: application/json"`);

  selectedTech = signal<TechnologyId>('csharp');
  selectedType = signal<string>('httpclient');

  result = signal('');
  errorMessage = signal('');
  copied = signal(false);
  parsedRequest = signal<ParsedCurlRequest | null>(null);

  presets: CurlPreset[] = CURL_PRESETS;
  technologies: TechnologyOption[] = TECHNOLOGIES;

  constructor(private instanceService: InstanceService, private injector: Injector) {}

  availableTypes = computed(() => {
    const found = this.technologies.find(t => t.id === this.selectedTech());
    return found ? found.types : [];
  });

  outputLanguage = computed(() => {
    const types = this.availableTypes();
    const foundType = types.find(t => t.id === this.selectedType());
    return foundType ? foundType.editorLanguage : 'csharp';
  });

  ngOnInit(): void {
    this.toolState = new ToolState(this.instanceService, this.instanceId, 'curl-converter');
    this.toolState.connect(
      () => this.readToolState(),
      (state) => this.restoreToolState(state),
      this.injector,
    );
    this.convert();
  }

  private readToolState(): ToolStateSnapshot {
    return {
      input: { document: this.input() },
      output: { document: this.result(), errorMessage: this.errorMessage() },
      options: { technology: this.selectedTech(), type: this.selectedType() },
    };
  }

  private restoreToolState(state: ToolStateSnapshot): void {
    this.input.set(state.input['document']);
    this.selectedTech.set(state.options['technology']);
    this.selectedType.set(state.options['type']);
    this.result.set(state.output['document'] ?? '');
    this.errorMessage.set(state.output['errorMessage'] ?? '');
  }

  onInputChange(val: string): void {
    this.input.set(val);
    this.convert();
  }

  onTechChange(techId: TechnologyId): void {
    this.selectedTech.set(techId);
    const types = this.technologies.find(t => t.id === techId)?.types || [];
    if (!types.some(t => t.id === this.selectedType())) {
      this.selectedType.set(types[0]?.id || '');
    }
    this.convert();
  }

  onTypeChange(typeId: string): void {
    this.selectedType.set(typeId);
    this.convert();
  }

  convert(): void {
    const source = this.input().trim();
    if (!source) {
      this.errorMessage.set('Please enter a cURL command.');
      this.result.set('');
      this.parsedRequest.set(null);
      return;
    }

    try {
      const parsed = parseCurlCommand(source);
      this.parsedRequest.set(parsed);
      this.errorMessage.set('');
      const generated = convertCurl(source, this.selectedTech(), this.selectedType());
      this.result.set(generated);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Invalid cURL syntax. Check flags and quotation marks.');
      this.result.set('');
      this.parsedRequest.set(null);
    }
  }

  formatCurl(): void {
    const source = this.input().trim();
    if (!source) return;

    try {
      const parsed = parseCurlCommand(source);
      const formatted = formatCurlCommand(parsed);
      this.input.set(formatted);
      this.convert();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Cannot format invalid cURL command.');
    }
  }

  loadPreset(presetName: string): void {
    const found = this.presets.find(p => p.name === presetName);
    if (found) {
      this.input.set(found.curl);
      this.convert();
    }
  }

  async copyResult(): Promise<void> {
    const res = this.result();
    if (!res) return;

    try {
      await navigator.clipboard.writeText(res);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Fallback
    }
  }

  clear(): void {
    this.input.set('');
    this.result.set('');
    this.errorMessage.set('');
    this.parsedRequest.set(null);
  }
}
