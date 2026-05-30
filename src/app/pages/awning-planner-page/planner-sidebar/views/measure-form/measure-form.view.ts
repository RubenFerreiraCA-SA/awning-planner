import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { DrawingStateService } from '../../../../../services/drawing-state.service';
import { ValidationPanelComponent } from '../../../../../components/validation-panel/validation-panel';
import { ValidationSuggestion } from '../../../../../models/drawing.models';

function confirmedValidator(control: AbstractControl): ValidationErrors | null {
  return (control as FormGroup).get('confirmed')?.value === true
    ? null
    : { unconfirmed: true };
}

@Component({
  selector: 'app-measure-form-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe, ValidationPanelComponent],
  templateUrl: './measure-form.view.html',
  styleUrl: './measure-form.view.scss',
})
export class MeasureFormView {
  private readonly state = inject(DrawingStateService);

  readonly edges = this.state.edges;
  readonly corners = this.state.corners;
  readonly validationResult = this.state.validationResult;
  readonly hasNonRightAngles = this.state.hasNonRightAngles;

  readonly proceed = output<void>();

  readonly form = new FormGroup({
    edges: new FormGroup({}),
    corners: new FormGroup({}),
  });

  get edgesGroup(): FormGroup { return this.form.get('edges') as FormGroup; }
  get cornersGroup(): FormGroup { return this.form.get('corners') as FormGroup; }

  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  readonly canProceed = computed(() => this.formStatus() === 'VALID');

  constructor() {
    untracked(() => this.buildForm());

    this.edgesGroup.valueChanges.pipe(takeUntilDestroyed()).subscribe(values => {
      for (const [edgeId, val] of Object.entries(values)) {
        const mm = Number(val);
        if (Number.isFinite(mm) && mm > 0) {
          this.state.updateEdgeMeasurement(edgeId, mm);
        }
      }
    });
  }

  private buildForm(): void {
    for (const edge of this.edges()) {
      this.edgesGroup.addControl(
        edge.id,
        new FormControl<number | null>(edge.realLengthMm ?? null, [
          Validators.required,
          Validators.min(1),
          Validators.max(99999),
        ]),
        { emitEvent: false },
      );
    }

    for (const corner of this.corners()) {
      if (corner.isAssumedRightAngle) continue;
      this.cornersGroup.addControl(
        corner.pointId,
        new FormGroup(
          {
            angleDeg: new FormControl<number | null>(corner.userAngleDeg ?? null, [
              Validators.required,
              Validators.min(5),
              Validators.max(355),
            ]),
            confirmed: new FormControl(corner.confirmed),
          },
          { validators: confirmedValidator },
        ),
        { emitEvent: false },
      );
    }
  }

  getCornerGroup(pointId: string): FormGroup | null {
    return (this.cornersGroup.get(pointId) as FormGroup) ?? null;
  }

  onAngleInput(pointId: string, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value) && value > 0) {
      this.state.updateCornerAngle(pointId, value);
      const grp = this.getCornerGroup(pointId);
      if (grp) {
        grp.get('angleDeg')?.setValue(value, { emitEvent: false });
        grp.get('confirmed')?.setValue(false, { emitEvent: false });
        grp.updateValueAndValidity();
      }
    }
  }

  onConfirmAngle(pointId: string): void {
    this.state.confirmCornerAngle(pointId);
    this.getCornerGroup(pointId)?.get('confirmed')?.setValue(true);
  }

  onOverrideCorner(pointId: string): void {
    this.state.overrideCornerAngle(pointId);
    this.getCornerGroup(pointId)?.get('confirmed')?.setValue(false);
  }

  onSuggestionApplied(suggestion: ValidationSuggestion): void {
    this.state.applySuggestion(suggestion);
  }

  onProceedAnyway(): void {
    this.state.proceedAnyway();
  }

  onUnlock(): void {
    this.state.unlockDrawing();
  }
}
