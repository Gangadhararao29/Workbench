import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  CURL_PRESETS,
  TARGET_OPTIONS,
  CurlPreset,
  CurlTargetLanguage,
  ParsedCurlRequest,
  TargetOption,
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

  target = signal<CurlTargetLanguage>('csharp');
  result = signal('');
  errorMessage = signal('');
  copied = signal(false);
  parsedRequest = signal<ParsedCurlRequest | null>(null);

  presets: CurlPreset[] = CURL_PRESETS;
  targets: TargetOption[] = TARGET_OPTIONS;

  targetGroups = computed(() => {
    const groups: { [key: string]: TargetOption[] } = {};
    for (const t of this.targets) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    }
    return Object.entries(groups).map(([name, options]) => ({ name, options }));
  });

  outputLanguage = computed(() => {
    const found = this.targets.find(t => t.id === this.target());
    return found ? found.editorLanguage : 'csharp';
  });

  ngOnInit(): void {
    this.convert();
  }

  onInputChange(val: string): void {
    this.input.set(val);
    this.convert();
  }

  onTargetChange(targetId: CurlTargetLanguage): void {
    this.target.set(targetId);
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
      const generated = convertCurl(source, this.target());
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
