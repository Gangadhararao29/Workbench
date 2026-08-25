import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
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
    this.convert();
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
