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
import { EditorState, Compartment, Extension } from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { LanguageDescription } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';

// ---------------------------------------------------------------------------
// Themes tailored for Workbench
// ---------------------------------------------------------------------------

const workbenchBaseTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13.5px',
    backgroundColor: 'var(--mat-sys-surface, #ffffff)',
    color: 'var(--mat-sys-on-surface, #1e293b)',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    padding: '8px 0',
    caretColor: 'var(--mat-sys-primary, #2563eb)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--mat-sys-primary, #2563eb)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection, .cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.22) !important',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--mat-sys-surface-container-low, #f8fafc)',
    color: 'var(--mat-sys-outline, #94a3b8)',
    borderRight: '1px solid var(--mat-sys-outline-variant, #e2e8f0)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: 'var(--mat-sys-on-surface, #0f172a)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
});

const workbenchDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--mat-sys-surface, #121212) !important',
    color: 'var(--mat-sys-on-surface, #e2e8f0) !important',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--mat-sys-surface-container-low, #18181b) !important',
    color: 'var(--mat-sys-outline, #71717a) !important',
    borderRight: '1px solid var(--mat-sys-outline-variant, #27272a) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.04) !important',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.07) !important',
    color: '#f4f4f5 !important',
  },
  '&.cm-focused .cm-selectionBackground, ::selection, .cm-selectionBackground': {
    backgroundColor: 'rgba(96, 165, 250, 0.3) !important',
  },
});

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
  @Output() editorClick = new EventEmitter<{ offset: number; lineNumber: number; column: number }>();
  @Output() cursorOffsetChange = new EventEmitter<number>();
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private view?: EditorView;
  private languageCompartment = new Compartment();
  private themeCompartment = new Compartment();
  private readOnlyCompartment = new Compartment();
  private wordWrapCompartment = new Compartment();
  private lineNumbersCompartment = new Compartment();
  private themeObserver?: MutationObserver;

  // Track the value last emitted or set from outside to prevent infinite update loops
  private lastPushedValue: string | undefined;

  isResizing = false;
  private startY = 0;
  private startHeight = 0;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  private getThemeExtensions(): Extension {
    const isDark = typeof document !== 'undefined' && document.body.classList.contains('dark-theme');
    if (isDark) {
      return [workbenchBaseTheme, oneDark, workbenchDarkTheme];
    }
    return [workbenchBaseTheme];
  }

  private async resolveLanguage(langName: string): Promise<Extension> {
    const norm = (langName || '').trim().toLowerCase();
    if (!norm || norm === 'plaintext' || norm === 'text') {
      return [];
    }

    let lookup = norm;
    if (lookup === 'csharp' || lookup === 'c#' || lookup === 'cs') {
      lookup = 'c#';
    } else if (lookup === 'typescript' || lookup === 'ts') {
      lookup = 'typescript';
    } else if (lookup === 'javascript' || lookup === 'js') {
      lookup = 'javascript';
    } else if (lookup === 'shell' || lookup === 'bash' || lookup === 'sh' || lookup === 'curl') {
      lookup = 'shell';
    }

    const desc =
      LanguageDescription.matchLanguageName(languages, lookup, true) ||
      LanguageDescription.matchFilename(languages, `file.${lookup}`);

    if (desc) {
      try {
        return await desc.load();
      } catch (e) {
        console.warn(`[CodeEditor] Could not load language mode '${lookup}':`, e);
      }
    }
    return [];
  }

  private updateLanguage() {
    const currentLang = this.language;
    this.resolveLanguage(currentLang).then((support) => {
      if (this.view && this.language === currentLang) {
        this.view.dispatch({
          effects: this.languageCompartment.reconfigure(support),
        });
      }
    });
  }

  ngAfterViewInit() {
    this.lastPushedValue = this.value;

    const baseExtensions: Extension[] = [
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        indentWithTab,
      ]),
      this.languageCompartment.of([]),
      this.themeCompartment.of(this.getThemeExtensions()),
      this.readOnlyCompartment.of([
        EditorState.readOnly.of(this.readOnly),
        EditorView.editable.of(!this.readOnly),
      ]),
      this.wordWrapCompartment.of(
        this.wordWrap === 'on' ? EditorView.lineWrapping : []
      ),
      this.lineNumbersCompartment.of(
        this.lineNumbers === 'on' ? lineNumbers() : []
      ),
      EditorView.contentAttributes.of({
        'aria-label': this.ariaLabel,
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const current = update.state.doc.toString();
          if (current !== this.lastPushedValue) {
            this.lastPushedValue = current;
            this.valueChange.emit(current);
          }
        }
        if (update.selectionSet) {
          const head = update.state.selection.main.head;
          this.cursorOffsetChange.emit(head);
        }
      }),
      EditorView.domEventHandlers({
        click: (event, view) => {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos !== null) {
            const line = view.state.doc.lineAt(pos);
            this.editorClick.emit({
              offset: pos,
              lineNumber: line.number,
              column: pos - line.from + 1,
            });
          }
        },
      }),
    ];

    const state = EditorState.create({
      doc: this.value,
      extensions: baseExtensions,
    });

    this.view = new EditorView({
      state,
      parent: this.editorHost.nativeElement,
    });

    this.updateLanguage();

    // Observe body theme changes to reconfigure theme dynamically
    if (typeof document !== 'undefined') {
      this.themeObserver = new MutationObserver(() => {
        this.view?.dispatch({
          effects: this.themeCompartment.reconfigure(this.getThemeExtensions()),
        });
      });
      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
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
    this.view?.requestMeasure();
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
    this.view?.requestMeasure();
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
      this.view?.requestMeasure();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const newHeight = Math.max(this.minHeight, currentHeight - 24);
      hostEl.style.height = `${newHeight}px`;
      hostEl.style.flex = 'none';
      this.view?.requestMeasure();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.view) return;

    if (changes['value']) {
      const incoming: string = changes['value'].currentValue ?? '';
      const current = this.view.state.doc.toString();
      if (incoming !== current) {
        this.lastPushedValue = incoming;
        this.view.dispatch({
          changes: { from: 0, to: current.length, insert: incoming },
        });
      }
    }

    if (changes['language']) {
      this.updateLanguage();
    }

    if (changes['readOnly']) {
      this.view.dispatch({
        effects: this.readOnlyCompartment.reconfigure([
          EditorState.readOnly.of(this.readOnly),
          EditorView.editable.of(!this.readOnly),
        ]),
      });
    }

    if (changes['wordWrap']) {
      this.view.dispatch({
        effects: this.wordWrapCompartment.reconfigure(
          this.wordWrap === 'on' ? EditorView.lineWrapping : []
        ),
      });
    }

    if (changes['lineNumbers']) {
      this.view.dispatch({
        effects: this.lineNumbersCompartment.reconfigure(
          this.lineNumbers === 'on' ? lineNumbers() : []
        ),
      });
    }
  }

  ngOnDestroy() {
    this.themeObserver?.disconnect();
    this.view?.destroy();
  }
}
