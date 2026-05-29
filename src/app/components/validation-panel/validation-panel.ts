import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ValidationResult, ValidationSuggestion } from '../../models/drawing.models';

@Component({
  selector: 'app-validation-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  styleUrl: './validation-panel.scss',
  template: `
    @if (result(); as r) {
      <div
        class="validation-result"
        [class.result--valid]="r.status === 'valid'"
        [class.result--warning]="r.status === 'warning'"
        [class.result--error]="r.status === 'error'"
        role="alert"
        aria-live="polite"
      >
        <div class="result-header">
          <span class="result-icon" aria-hidden="true">
            @switch (r.status) {
              @case ('valid') { ✓ }
              @case ('warning') { ⚠ }
              @case ('error') { ✗ }
            }
          </span>
          <span class="result-message">{{ r.message }}</span>
        </div>

        @if (r.closureErrorMm > 0 && r.status !== 'valid') {
          <p class="result-detail">
            Closure gap: {{ r.closureErrorMm | number:'1.0-0' }}mm
            ({{ r.closureErrorPct | number:'1.1-1' }}% of perimeter)
          </p>
        }

        @if (r.suggestions.length > 0) {
          <div class="suggestions">
            <p class="suggestions-heading">Suggested corrections:</p>
            @for (suggestion of r.suggestions; track suggestion.id) {
              <div class="suggestion">
                <div class="suggestion-body">
                  <span class="suggestion-label">{{ suggestion.label }}</span>
                  <span class="suggestion-desc">{{ suggestion.description }}</span>
                </div>
                <button
                  type="button"
                  class="btn-apply"
                  (click)="suggestionApplied.emit(suggestion)"
                  [attr.aria-label]="'Apply: ' + suggestion.description"
                >Apply</button>
              </div>
            }
            <button
              type="button"
              class="btn-proceed"
              (click)="proceedAnyway.emit()"
            >Proceed with current values</button>
          </div>
        }
      </div>
    }
  `,
})
export class ValidationPanelComponent {
  readonly result = input<ValidationResult | null>(null);
  readonly suggestionApplied = output<ValidationSuggestion>();
  readonly proceedAnyway = output<void>();
}
