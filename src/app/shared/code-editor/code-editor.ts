import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as monaco from '../../../../node_modules/monaco-editor/esm/vs/editor/editor.api.js';

let workerConfigured = false;

function configureMonacoWorkers() {
  if (workerConfigured) return;
  (globalThis as typeof globalThis & { MonacoEnvironment?: monaco.Environment }).MonacoEnvironment = {
    getWorker() {
      return new Worker('/assets/monaco/vs/editor/editor.worker.js', { type: 'module' });
    },
  };
  workerConfigured = true;
}

@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: '<div #editor class="code-editor"></div>',
  styleUrls: ['./code-editor.css'],
})
export class CodeEditor implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = '';
  @Input() language = 'plaintext';
  @Input() ariaLabel = 'Code editor';
  @Input() readOnly = false;
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('editor', { static: true }) editorElement!: ElementRef<HTMLDivElement>;

  private editor?: monaco.editor.IStandaloneCodeEditor;
  private valueSubscription?: monaco.IDisposable;

  ngAfterViewInit() {
    configureMonacoWorkers();
    this.editor = monaco.editor.create(this.editorElement.nativeElement, {
      value: this.value,
      language: this.language,
      readOnly: this.readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      padding: { top: 12, bottom: 12 },
      scrollBeyondLastLine: false,
      theme: document.body.classList.contains('dark-theme') ? 'vs-dark' : 'vs',
      ariaLabel: this.ariaLabel,
    });
    this.valueSubscription = this.editor.onDidChangeModelContent(() => {
      this.valueChange.emit(this.editor?.getValue() ?? '');
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && this.editor && changes['value'].currentValue !== this.editor.getValue()) {
      this.editor.setValue(changes['value'].currentValue);
    }
    if (changes['language'] && this.editor) {
      monaco.editor.setModelLanguage(this.editor.getModel()!, this.language);
    }
  }

  ngOnDestroy() {
    this.valueSubscription?.dispose();
    this.editor?.dispose();
  }
}
