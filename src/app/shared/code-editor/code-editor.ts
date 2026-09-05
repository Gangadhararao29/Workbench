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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: `
    <div class="code-editor-container" [class.is-resizing]="isResizing">
      <div #editorHost class="code-editor"></div>
      @if (resizable) {
        <div
          class="resize-handle"
          (pointerdown)="onResizeStart($event)"
          (pointermove)="onResizeMove($event)"
          (pointerup)="onResizeEnd($event)"
          (pointercancel)="onResizeEnd($event)"
          (keydown)="onResizeKeydown($event)"
          tabindex="0"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize code editor height"
          title="Drag to resize height (or use Up/Down arrow keys)"
        >
          <div class="resize-grip">
            <span class="grip-line"></span>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./code-editor.css'],
})
export class CodeEditor implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = '';
  @Input() language = 'plaintext';
  @Input() ariaLabel = 'Code editor';
  @Input() readOnly = false;
  @Input() wordWrap: 'on' | 'off' = 'off';
  @Input() lineNumbers: 'on' | 'off' = 'on';
  @Input() resizable = true;
  @Input() minHeight = 100;
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private editor?: monaco.editor.IStandaloneCodeEditor;
  private changeSubscription?: monaco.IDisposable;
  private resizeObserver?: ResizeObserver;
  private layoutRafId: number | null = null;
  // Track the value we last pushed INTO the editor so we can avoid
  // re-setting it when the change originated from the editor itself,
  // which would otherwise create an infinite update loop.
  private lastPushedValue: string | undefined;

  isResizing = false;
  private startY = 0;
  private startHeight = 0;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  private scheduleLayout() {
    if (this.layoutRafId !== null) {
      cancelAnimationFrame(this.layoutRafId);
    }
    this.layoutRafId = requestAnimationFrame(() => {
      this.layoutRafId = null;
      this.editor?.layout();
    });
  }

  ngAfterViewInit() {
    configureMonacoWorkers();
    this.editor = monaco.editor.create(this.editorHost.nativeElement, {
      value: this.value,
      language: this.language,
      readOnly: this.readOnly,
      wordWrap: this.wordWrap,
      lineNumbers: this.lineNumbers,
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

    this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
    this.resizeObserver.observe(this.editorHost.nativeElement);
    this.scheduleLayout();
    setTimeout(() => this.scheduleLayout(), 50);
    setTimeout(() => this.scheduleLayout(), 150);
    setTimeout(() => this.scheduleLayout(), 400);

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

  onResizeStart(event: PointerEvent) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    this.isResizing = true;
    this.startY = event.clientY;
    const hostEl = this.elementRef.nativeElement;
    this.startHeight = hostEl.getBoundingClientRect().height;

    const target = event.currentTarget as HTMLElement;
    if (target?.setPointerCapture) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {}
    }
    event.preventDefault();
  }

  onResizeMove(event: PointerEvent) {
    if (!this.isResizing) return;
    const deltaY = event.clientY - this.startY;
    const newHeight = Math.max(this.minHeight, Math.round(this.startHeight + deltaY));
    const hostEl = this.elementRef.nativeElement;
    hostEl.style.height = `${newHeight}px`;
    hostEl.style.flex = 'none';
    this.scheduleLayout();
  }

  onResizeEnd(event: PointerEvent) {
    if (!this.isResizing) return;
    this.isResizing = false;
    const target = event.currentTarget as HTMLElement;
    if (target?.releasePointerCapture && target.hasPointerCapture(event.pointerId)) {
      try {
        target.releasePointerCapture(event.pointerId);
      } catch {}
    }
    this.scheduleLayout();
  }

  onResizeKeydown(event: KeyboardEvent) {
    if (!this.resizable) return;
    const hostEl = this.elementRef.nativeElement;
    const currentHeight = hostEl.getBoundingClientRect().height;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const newHeight = currentHeight + 24;
      hostEl.style.height = `${newHeight}px`;
      hostEl.style.flex = 'none';
      this.scheduleLayout();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const newHeight = Math.max(this.minHeight, currentHeight - 24);
      hostEl.style.height = `${newHeight}px`;
      hostEl.style.flex = 'none';
      this.scheduleLayout();
    }
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
        this.scheduleLayout();
        setTimeout(() => this.scheduleLayout(), 50);
        setTimeout(() => this.scheduleLayout(), 150);
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

    if (changes['wordWrap']) {
      this.editor.updateOptions({ wordWrap: this.wordWrap });
    }

    if (changes['lineNumbers']) {
      this.editor.updateOptions({ lineNumbers: this.lineNumbers });
    }
  }

  ngOnDestroy() {
    if (this.layoutRafId !== null) {
      cancelAnimationFrame(this.layoutRafId);
      this.layoutRafId = null;
    }
    this.resizeObserver?.disconnect();
    this.changeSubscription?.dispose();
    this.editor?.dispose();
  }
}
