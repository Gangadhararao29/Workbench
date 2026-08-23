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
import * as monaco from 'monaco-editor';

// ---------------------------------------------------------------------------
// Worker configuration
// Monaco's editor.worker.js is a classic script (not ESM), so we must NOT
// use { type: 'module' }. We also suppress the type error with a cast.
// ---------------------------------------------------------------------------

let workerConfigured = false;

function monacoWorkerUrl(path: string): URL {
  return new URL(`assets/monaco/vs/${path}`, document.baseURI);
}

function configureMonacoWorkers() {
  if (workerConfigured) return;
  (globalThis as any).MonacoEnvironment = {
    getWorker(_: string, label: string) {
      if (label === 'json') {
        return new Worker(
          monacoWorkerUrl('language/json/json.worker.js'),
          { type: 'module' }
        );
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new Worker(
          monacoWorkerUrl('language/css/css.worker.js'),
          { type: 'module' }
        );
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new Worker(
          monacoWorkerUrl('language/html/html.worker.js'),
          { type: 'module' }
        );
      }
      if (label === 'typescript' || label === 'javascript') {
        return new Worker(
          monacoWorkerUrl('language/typescript/ts.worker.js'),
          { type: 'module' }
        );
      }
      return new Worker(
        monacoWorkerUrl('editor/editor.worker.js'),
        { type: 'module' }
      );
    },
  };
  workerConfigured = true;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: '<div #editorHost class="code-editor"></div>',
  styleUrls: ['./code-editor.css'],
})
export class CodeEditor implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = '';
  @Input() language = 'plaintext';
  @Input() ariaLabel = 'Code editor';
  @Input() readOnly = false;
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private editor?: monaco.editor.IStandaloneCodeEditor;
  private changeSubscription?: monaco.IDisposable;
  private resizeObserver?: ResizeObserver;
  // Track the value we last pushed INTO the editor so we can avoid
  // re-setting it when the change originated from the editor itself,
  // which would otherwise create an infinite update loop.
  private lastPushedValue: string | undefined;

  ngAfterViewInit() {
    configureMonacoWorkers();
    this.editor = monaco.editor.create(this.editorHost.nativeElement, {
      value: this.value,
      language: this.language,
      readOnly: this.readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      padding: { top: 12, bottom: 12 },
      scrollBeyondLastLine: false,
      scrollbar: {
        alwaysConsumeMouseWheel: false,
      },
      theme: document.body.classList.contains('dark-theme') ? 'vs-dark' : 'vs',
      ariaLabel: this.ariaLabel,
    });

    this.resizeObserver = new ResizeObserver(() => this.editor?.layout());
    this.resizeObserver.observe(this.editorHost.nativeElement);
    requestAnimationFrame(() => this.editor?.layout());

    this.lastPushedValue = this.value;

    this.changeSubscription = this.editor.onDidChangeModelContent(() => {
      const current = this.editor?.getValue() ?? '';
      // Only emit if the change came from user interaction, not from us
      // calling setValue() — avoids the infinite loop.
      if (current !== this.lastPushedValue) {
        this.valueChange.emit(current);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.editor) return; // editor not yet initialised — skip

    if (changes['value']) {
      const incoming: string = changes['value'].currentValue ?? '';
      // Only call setValue when the value genuinely differs from what the
      // editor currently holds, to prevent cursor-jumping on every keystroke.
      if (incoming !== this.editor.getValue()) {
        this.lastPushedValue = incoming;
        this.editor.setValue(incoming);
        requestAnimationFrame(() => this.editor?.layout());
      }
    }

    if (changes['language']) {
      const model = this.editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, this.language);
      }
    }

    if (changes['readOnly']) {
      this.editor.updateOptions({ readOnly: this.readOnly });
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.changeSubscription?.dispose();
    this.editor?.dispose();
  }
}
