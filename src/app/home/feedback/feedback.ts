import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FeedbackService, FeedbackType, FeedbackSeverity, SystemInfo } from '../../core/feedback.service';
import { TOOL_GROUPS } from '../../core/tool/tool-registry';


@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './feedback.html',
  styleUrls: ['./feedback.css']
})
export class FeedbackComponent {
  private feedbackService = inject(FeedbackService);

  // Tool options extracted from the registry
  readonly toolOptions = [
    { type: 'general', label: 'General Workbench' },
    ...TOOL_GROUPS.flatMap((group) =>
      group.tools.map((t) => ({ type: t.type, label: `${group.label}: ${t.label}` }))
    )
  ];

  // Feedback Categories
  readonly feedbackCategories = [
    'Feature Request',
    'Tool Improvement',
    'User Experience / UI',
    'Performance',
    'General Appreciation / Comment',
    'Other'
  ];

  // Bug Categories
  readonly bugCategories = [
    'Incorrect Output / Result',
    'Crash / Freeze / White Screen',
    'Visual Glitch / Broken UI',
    'Tool Not Responding',
    'Data Loss / Reset',
    'Other'
  ];

  // Form State
  activeType = signal<FeedbackType>('feedback');
  title = signal('');
  category = signal('Feature Request');
  selectedTool = signal('general');
  description = signal('');
  stepsToReproduce = signal('');
  severity = signal<FeedbackSeverity>('medium');
  rating = signal<number>(0);
  email = signal('');
  includeSystemInfo = signal(true);

  // UI state
  status = signal<'form' | 'submitting' | 'success' | 'error'>('form');
  errorMessage = signal('');
  submittedId = signal('');
  showSystemInfoPreview = signal(false);

  // Diagnostic preview
  systemInfo = signal<SystemInfo | null>(null);

  constructor() {
    this.systemInfo.set(this.feedbackService.collectSystemInfo());
  }

  isFormValid = computed(() => {
    return this.title().trim().length >= 3 && this.description().trim().length >= 5;
  });

  setType(type: FeedbackType): void {
    this.activeType.set(type);
    if (type === 'bug') {
      this.category.set('Incorrect Output / Result');
      this.includeSystemInfo.set(true);
    } else {
      this.category.set('Feature Request');
    }
  }

  setSeverity(sev: FeedbackSeverity): void {
    this.severity.set(sev);
  }

  setRating(stars: number): void {
    if (this.rating() === stars) {
      this.rating.set(0);
    } else {
      this.rating.set(stars);
    }
  }

  toggleSystemInfo(): void {
    this.showSystemInfoPreview.update((v) => !v);
  }

  async submit(): Promise<void> {
    if (!this.isFormValid() || this.status() === 'submitting') {
      return;
    }

    this.status.set('submitting');
    this.errorMessage.set('');

    try {
      const res = await this.feedbackService.submitFeedback({
        type: this.activeType(),
        category: this.category(),
        tool: this.selectedTool(),
        title: this.title().trim(),
        description: this.description().trim(),
        stepsToReproduce: this.activeType() === 'bug' ? this.stepsToReproduce().trim() : undefined,
        severity: this.activeType() === 'bug' ? this.severity() : undefined,
        rating: this.activeType() === 'feedback' && this.rating() > 0 ? this.rating() : undefined,
        email: this.email().trim() || undefined,
        includeSystemInfo: this.includeSystemInfo(),
        systemInfo: this.includeSystemInfo() ? (this.systemInfo() ?? undefined) : undefined
      });

      this.submittedId.set(res.id);
      this.status.set('success');
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Failed to submit feedback. Please try again.');
      this.status.set('error');
    }
  }

  resetForm(): void {
    this.title.set('');
    this.description.set('');
    this.stepsToReproduce.set('');
    this.rating.set(0);
    this.email.set('');
    this.severity.set('medium');
    this.status.set('form');
    this.errorMessage.set('');
    this.submittedId.set('');
  }
}
