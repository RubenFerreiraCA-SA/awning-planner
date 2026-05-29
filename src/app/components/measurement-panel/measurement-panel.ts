import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DrawingEdge } from '../../models/drawing.models';

export interface MeasurementChange {
  edgeId: string;
  mm: number;
}

@Component({
  selector: 'app-measurement-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './measurement-panel.scss',
  template: `
    <div class="measurement-panel" role="group" aria-label="Edge measurements">
      @for (edge of edges(); track edge.id) {
        <div class="edge-field" [class.edge-field--missing]="!(edge.realLengthMm ?? 0)">
          <label [for]="'edge-' + edge.id" class="edge-label">
            <span class="edge-name">Edge {{ edge.label }}</span>
            @if (!(edge.realLengthMm ?? 0)) {
              <span class="edge-required" aria-hidden="true">required</span>
            }
          </label>
          <div class="edge-input-row">
            <input
              [id]="'edge-' + edge.id"
              type="number"
              min="1"
              max="99999"
              step="1"
              placeholder="e.g. 3500"
              class="edge-input"
              [value]="edge.realLengthMm ?? ''"
              [attr.aria-describedby]="'edge-unit-' + edge.id"
              (blur)="onBlur(edge.id, $event)"
              (keydown.enter)="onBlur(edge.id, $event)"
            />
            <span [id]="'edge-unit-' + edge.id" class="edge-unit">mm</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class MeasurementPanelComponent {
  readonly edges = input.required<DrawingEdge[]>();
  readonly measurementChange = output<MeasurementChange>();

  onBlur(edgeId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    this.measurementChange.emit({ edgeId, mm: isNaN(value) ? 0 : value });
  }
}
