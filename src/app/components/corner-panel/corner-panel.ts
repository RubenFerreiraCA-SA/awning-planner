import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DrawingCorner } from '../../models/drawing.models';

export interface AngleChange {
  pointId: string;
  deg: number;
}

@Component({
  selector: 'app-corner-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  styleUrl: './corner-panel.scss',
  template: `
    <div class="corner-panel" role="group" aria-label="Corner angles">
      @for (corner of corners(); track corner.pointId) {
        <div
          class="corner-row"
          [class.corner-row--confirmed]="corner.confirmed"
          [class.corner-row--pending]="!corner.confirmed"
        >
          <span class="corner-label" aria-label="Corner {{ corner.label }}">{{ corner.label }}</span>

          @if (corner.isAssumedRightAngle && corner.confirmed) {
            <span class="angle-badge angle-badge--right" aria-label="Right angle assumed">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 10 V2 H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                <path d="M2 5 H5 V2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>
              </svg>
              90° assumed
            </span>
            <button
              type="button"
              class="btn-override"
              (click)="cornerOverridden.emit(corner.pointId)"
              aria-label="Override right angle assumption for corner {{ corner.label }}"
            >Override</button>
          }

          @if (!corner.isAssumedRightAngle || !corner.confirmed) {
            <div class="angle-input-group">
              <span class="detected-hint">
                Pixel: {{ corner.pixelAngleDeg | number:'1.1-1' }}°
              </span>
              <input
                type="number"
                min="5"
                max="355"
                step="0.5"
                class="angle-input"
                [value]="corner.userAngleDeg ?? (corner.pixelAngleDeg | number:'1.1-1')"
                [id]="'corner-' + corner.pointId"
                [attr.aria-label]="'Angle at corner ' + corner.label + ' in degrees'"
                (input)="onInput(corner.pointId, $event)"
              />
              <span class="unit">°</span>
              <button
                type="button"
                class="btn-confirm"
                [disabled]="!corner.userAngleDeg"
                (click)="angleConfirmed.emit(corner.pointId)"
                [attr.aria-label]="'Confirm angle for corner ' + corner.label"
              >Confirm</button>
            </div>
          }

          @if (!corner.isAssumedRightAngle && corner.confirmed) {
            <span class="confirmed-tag">
              {{ corner.userAngleDeg | number:'1.1-1' }}° confirmed
            </span>
            <button
              type="button"
              class="btn-override"
              (click)="cornerOverridden.emit(corner.pointId)"
            >Edit</button>
          }
        </div>
      }
    </div>
  `,
})
export class CornerPanelComponent {
  readonly corners = input.required<DrawingCorner[]>();
  readonly angleChanged = output<AngleChange>();
  readonly angleConfirmed = output<string>();
  readonly cornerOverridden = output<string>();

  onInput(pointId: string, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value) && value > 0) {
      this.angleChanged.emit({ pointId, deg: value });
    }
  }
}
