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

let workerConfigured = false;

function monacoWorkerUrl(path: string): URL {
  return new URL(`assets/monaco/vs/${path}`, document.baseURI);
}

function configureMonacoWorkers() {
  if (workerConfigured || (globalThis as any).MonacoEnvironment?.getWorker) {
    workerConfigured = true;
    return;
  }
  (globalThis as any).MonacoEnvironment = {
    getWorker(_: string, label: string) {
      if (typeof Worker === 'undefined') {
        return {
          postMessage: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          terminate: () => {},
          onmessage: null,
          onerror: null,
        } as any;
      }
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

@Component({
  selector: 'app-diff-editor',
  standalone: true,
  template: `
    <div class="diff-editor-container">
      @if (originalTitle || modifiedTitle) {
        <div class="diff-header-bar">
          <div class="diff-header-title original-title">
            <span class="diff-dot diff-dot-orig"></span>
            <span>{{ originalTitle }}</span>
          </div>
          @if (renderSideBySide) {
            <div class="diff-header-title modified-title">
              <span class="diff-dot diff-dot-mod"></span>
              <span>{{ modifiedTitle }}</span>
            </div>
          }
        </div>
      }
      <div #editorHost class="diff-editor"></div>
    </div>
  `,
  styleUrls: ['./diff-editor.css'],
})
export class DiffEditor implements AfterViewInit, OnChanges, OnDestroy {
  @Input() original = '';
  @Input() modified = '';
  @Input() originalTitle = '';
  @Input() modifiedTitle = '';
  @Input() language = 'json';
  @Input() ariaLabel = 'Diff editor';
  @Input() readOnly = false;
  @Input() originalReadOnly = false;
  @Input() renderSideBySide = true;
  @Input() lineNumbers: 'on' | 'off' = 'on';

  @Output() originalChange = new EventEmitter<string>();
  @Output() modifiedChange = new EventEmitter<string>();

  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private diffEditor?: monaco.editor.IStandaloneDiffEditor;
  private originalModel?: monaco.editor.ITextModel;
  private modifiedModel?: monaco.editor.ITextModel;
  private originalSub?: monaco.IDisposable;
  private modifiedSub?: monaco.IDisposable;
  private resizeObserver?: ResizeObserver;
  private themeObserver?: MutationObserver;
  private layoutRafId: number | null = null;

  private lastPushedOriginal: string | undefined;
  private lastPushedModified: string | undefined;

  constructor() {}

  private scheduleLayout() {
    if (this.layoutRafId !== null) {
      cancelAnimationFrame(this.layoutRafId);
    }
    this.layoutRafId = requestAnimationFrame(() => {
      this.layoutRafId = null;
      this.diffEditor?.layout();
    });
  }

  ngAfterViewInit() {
    configureMonacoWorkers();

    this.originalModel = monaco.editor.createModel(this.original, this.language);
    this.modifiedModel = monaco.editor.createModel(this.modified, this.language);

    this.diffEditor = monaco.editor.createDiffEditor(this.editorHost.nativeElement, {
      readOnly: this.readOnly,
      originalEditable: !this.originalReadOnly,
      renderSideBySide: this.renderSideBySide,
      lineNumbers: this.lineNumbers,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      padding: { top: 10, bottom: 10 },
      scrollBeyondLastLine: false,
      theme: document.body.classList.contains('dark-theme') ? 'vs-dark' : 'vs',
      ariaLabel: this.ariaLabel,
    });

    this.diffEditor.setModel({
      original: this.originalModel,
      modified: this.modifiedModel,
    });

    this.lastPushedOriginal = this.original;
    this.lastPushedModified = this.modified;

    this.originalSub = this.originalModel.onDidChangeContent(() => {
      const current = this.originalModel?.getValue() ?? '';
      if (current !== this.lastPushedOriginal) {
        this.originalChange.emit(current);
      }
    });

    this.modifiedSub = this.modifiedModel.onDidChangeContent(() => {
      const current = this.modifiedModel?.getValue() ?? '';
      if (current !== this.lastPushedModified) {
        this.modifiedChange.emit(current);
      }
    });

    this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
    this.resizeObserver.observe(this.editorHost.nativeElement);
    this.scheduleLayout();
    setTimeout(() => this.scheduleLayout(), 50);
    setTimeout(() => this.scheduleLayout(), 150);

    // Sync theme with body dark-theme class
    this.themeObserver = new MutationObserver(() => {
      const isDark = document.body.classList.contains('dark-theme');
      monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    });
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.diffEditor) return;

    if (changes['original'] && this.originalModel) {
      const incoming = changes['original'].currentValue ?? '';
      if (incoming !== this.originalModel.getValue()) {
        this.lastPushedOriginal = incoming;
        this.originalModel.setValue(incoming);
        this.scheduleLayout();
      }
    }

    if (changes['modified'] && this.modifiedModel) {
      const incoming = changes['modified'].currentValue ?? '';
      if (incoming !== this.modifiedModel.getValue()) {
        this.lastPushedModified = incoming;
        this.modifiedModel.setValue(incoming);
        this.scheduleLayout();
      }
    }

    if (changes['language']) {
      if (this.originalModel) {
        monaco.editor.setModelLanguage(this.originalModel, this.language);
      }
      if (this.modifiedModel) {
        monaco.editor.setModelLanguage(this.modifiedModel, this.language);
      }
    }

    if (changes['renderSideBySide']) {
      this.diffEditor.updateOptions({
        renderSideBySide: this.renderSideBySide,
      });
      this.scheduleLayout();
    }

    if (changes['readOnly'] || changes['originalReadOnly'] || changes['lineNumbers']) {
      this.diffEditor.updateOptions({
        readOnly: this.readOnly,
        originalEditable: !this.originalReadOnly,
        lineNumbers: this.lineNumbers,
      });
    }
  }

  ngOnDestroy() {
    if (this.layoutRafId !== null) {
      cancelAnimationFrame(this.layoutRafId);
      this.layoutRafId = null;
    }
    this.themeObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.originalSub?.dispose();
    this.modifiedSub?.dispose();
    this.diffEditor?.setModel(null);
    this.diffEditor?.dispose();
    this.originalModel?.dispose();
    this.modifiedModel?.dispose();
  }
}
