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
  ViewEncapsulation,
} from '@angular/core';
import { EditorState, Compartment, Extension } from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
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
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { LanguageDescription } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { closeBrackets } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { MergeView, unifiedMergeView } from '@codemirror/merge';

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
  '&.cm-merge-a .cm-changedLine, .cm-deletedChunk, .cm-deletedLine': {
    backgroundColor: '#3b1216 !important',
    color: '#fca5a5 !important',
  },
  '&.cm-merge-a .cm-changedText, .cm-deletedText, .cm-deletedChunk .cm-deletedText': {
    background: '#781d24 !important',
    color: '#fee2e2 !important',
    borderRadius: '3px',
    padding: '1px 4px',
    fontWeight: '600',
    boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.45)',
  },
  '&.cm-merge-b .cm-changedLine, .cm-inlineChangedLine': {
    backgroundColor: '#0f301a !important',
    color: '#86efac !important',
  },
  '&.cm-merge-b .cm-changedText': {
    background: '#19582f !important',
    color: '#dcfce7 !important',
    borderRadius: '3px',
    padding: '1px 4px',
    fontWeight: '600',
    boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.45)',
  },
  '&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter': {
    backgroundColor: '#ef4444 !important',
    width: '4px !important',
  },
  '&.cm-merge-b .cm-changedLineGutter, .cm-inlineChangedLineGutter': {
    backgroundColor: '#22c55e !important',
    width: '4px !important',
  },
  '.cm-chunkButtons': {
    display: 'none !important',
  },
});

@Component({
  selector: 'app-diff-editor',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="diff-editor-container">
      @if (originalTitle || modifiedTitle) {
        <div class="diff-header-bar">
          @if (renderSideBySide) {
            <div class="diff-header-title original-title">
              <span class="diff-dot diff-dot-orig"></span>
              <span>{{ originalTitle }}</span>
            </div>
            <div class="diff-header-title modified-title">
              <span class="diff-dot diff-dot-mod"></span>
              <span>{{ modifiedTitle }}</span>
            </div>
          } @else {
            <div class="diff-header-title unified-title">
              <span class="diff-dot diff-dot-orig"></span>
              <span>{{ originalTitle || 'Original' }}</span>
              <span class="unified-arrow">&harr;</span>
              <span class="diff-dot diff-dot-mod"></span>
              <span>{{ modifiedTitle || 'Modified' }}</span>
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

  private mergeView?: MergeView;
  private unifiedView?: EditorView;

  private langCompartmentA = new Compartment();
  private langCompartmentB = new Compartment();
  private themeCompartmentA = new Compartment();
  private themeCompartmentB = new Compartment();
  private themeObserver?: MutationObserver;

  private lastPushedOriginal: string | undefined;
  private lastPushedModified: string | undefined;

  constructor() {}

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
        console.warn(`[DiffEditor] Could not load language mode '${lookup}':`, e);
      }
    }
    return [];
  }

  private updateLanguage() {
    const currentLang = this.language;
    this.resolveLanguage(currentLang).then((support) => {
      if (this.language !== currentLang) return;
      if (this.mergeView) {
        this.mergeView.a.dispatch({ effects: this.langCompartmentA.reconfigure(support) });
        this.mergeView.b.dispatch({ effects: this.langCompartmentB.reconfigure(support) });
      } else if (this.unifiedView) {
        this.unifiedView.dispatch({ effects: this.langCompartmentB.reconfigure(support) });
      }
    });
  }

  private getBaseExtensions(side: 'a' | 'b'): Extension[] {
    const isReadOnly = side === 'a' ? (this.readOnly || this.originalReadOnly) : this.readOnly;
    const themeComp = side === 'a' ? this.themeCompartmentA : this.themeCompartmentB;
    const langComp = side === 'a' ? this.langCompartmentA : this.langCompartmentB;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const current = update.state.doc.toString();
        if (side === 'a') {
          if (current !== this.lastPushedOriginal) {
            this.lastPushedOriginal = current;
            this.originalChange.emit(current);
          }
        } else {
          if (current !== this.lastPushedModified) {
            this.lastPushedModified = current;
            this.modifiedChange.emit(current);
          }
        }
      }
    });

    return [
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      keymap.of([
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      themeComp.of(this.getThemeExtensions()),
      langComp.of([]),
      this.lineNumbers === 'on' ? lineNumbers() : [],
      EditorState.readOnly.of(isReadOnly),
      EditorView.editable.of(!isReadOnly),
      updateListener,
    ];
  }

  private destroyCurrent() {
    if (this.mergeView) {
      this.mergeView.destroy();
      this.mergeView = undefined;
    }
    if (this.unifiedView) {
      this.unifiedView.destroy();
      this.unifiedView = undefined;
    }
    this.editorHost.nativeElement.replaceChildren();
  }

  private createEditor() {
    this.destroyCurrent();

    this.lastPushedOriginal = this.original;
    this.lastPushedModified = this.modified;

    if (this.renderSideBySide) {
      this.mergeView = new MergeView({
        a: {
          doc: this.original,
          extensions: this.getBaseExtensions('a'),
        },
        b: {
          doc: this.modified,
          extensions: this.getBaseExtensions('b'),
        },
        parent: this.editorHost.nativeElement,
        highlightChanges: true,
        gutter: true,
      });
    } else {
      this.unifiedView = new EditorView({
        state: EditorState.create({
          doc: this.modified,
          extensions: [
            ...this.getBaseExtensions('b'),
            unifiedMergeView({
              original: this.original,
              mergeControls: false,
              highlightChanges: true,
              gutter: true,
            }),
          ],
        }),
        parent: this.editorHost.nativeElement,
      });
    }

    this.updateLanguage();
  }

  ngAfterViewInit() {
    this.createEditor();

    if (typeof document !== 'undefined') {
      this.themeObserver = new MutationObserver(() => {
        const themeExt = this.getThemeExtensions();
        if (this.mergeView) {
          this.mergeView.a.dispatch({ effects: this.themeCompartmentA.reconfigure(themeExt) });
          this.mergeView.b.dispatch({ effects: this.themeCompartmentB.reconfigure(themeExt) });
        } else if (this.unifiedView) {
          this.unifiedView.dispatch({ effects: this.themeCompartmentB.reconfigure(themeExt) });
        }
      });
      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.mergeView && !this.unifiedView) return;

    if (changes['renderSideBySide']) {
      this.createEditor();
      return;
    }

    if (changes['original']) {
      const nextOrig = changes['original'].currentValue ?? '';
      if (this.mergeView) {
        const curA = this.mergeView.a.state.doc.toString();
        if (curA !== nextOrig) {
          this.lastPushedOriginal = nextOrig;
          this.mergeView.a.dispatch({
            changes: { from: 0, to: curA.length, insert: nextOrig },
          });
        }
      } else if (this.unifiedView) {
        this.createEditor();
      }
    }

    if (changes['modified']) {
      const nextMod = changes['modified'].currentValue ?? '';
      const view = this.mergeView ? this.mergeView.b : this.unifiedView;
      if (view) {
        const curB = view.state.doc.toString();
        if (curB !== nextMod) {
          this.lastPushedModified = nextMod;
          view.dispatch({
            changes: { from: 0, to: curB.length, insert: nextMod },
          });
        }
      }
    }

    if (changes['language']) {
      this.updateLanguage();
    }
  }

  ngOnDestroy() {
    this.themeObserver?.disconnect();
    this.destroyCurrent();
  }
}
