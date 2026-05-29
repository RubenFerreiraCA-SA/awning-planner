import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { AwningType, IbrSettings, LouverSettings, MountingType } from '../../../models/awning.models';
import { ValidationSuggestion, WorkflowStep } from '../../../models/drawing.models';
import { EdgeRole } from '../../../models/awning-config.models';
import { DrawingStateService } from '../../../services/drawing-state.service';
import { GeometryCalculationService } from '../../../services/geometry-calculation.service';
import { MaterialEstimatorService } from '../../../services/material-estimator.service';
import { AngleChange, CornerPanelComponent } from '../../../components/corner-panel/corner-panel';
import { EstimateSummaryComponent } from '../../../components/estimate-summary/estimate-summary';
import { MaterialSettingsPanelComponent } from '../../../components/material-settings-panel/material-settings-panel';
import { MeasurementChange, MeasurementPanelComponent } from '../../../components/measurement-panel/measurement-panel';
import { ValidationPanelComponent } from '../../../components/validation-panel/validation-panel';
import { ProjectSetupView } from './views/awning-type-selector/project-setup.view';

const STEP_ORDER: WorkflowStep[] = ['select-type', 'draw', 'close', 'measure', 'calculate'];
function stepToPanel(step: WorkflowStep): number {
  if (step === 'select-type') return 0;
  if (step === 'draw' || step === 'close') return 1;
  if (step === 'measure') return 2;
  return 3; // 'calculate' → Configure panel
}

@Component({
  selector: 'app-planner-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProjectSetupView,
    MeasurementPanelComponent,
    CornerPanelComponent,
    ValidationPanelComponent,
    MaterialSettingsPanelComponent,
    EstimateSummaryComponent,
  ],
  templateUrl: './planner-sidebar.html',
  styleUrl: './planner-sidebar.scss',
})
export class PlannerSidebarComponent {
  private readonly state = inject(DrawingStateService);
  private readonly geometry = inject(GeometryCalculationService);
  private readonly estimator = inject(MaterialEstimatorService);

  readonly projectName = this.state.projectName;
  readonly customerName = this.state.customerName;
  readonly awningType = this.state.awningType;
  readonly edges = this.state.edges;
  readonly corners = this.state.corners;
  readonly isClosed = this.state.isClosed;
  readonly ibrSettings = this.state.ibrSettings;
  readonly louverSettings = this.state.louverSettings;
  readonly estimate = this.state.estimate;
  readonly canCalculate = this.state.canCalculate;
  readonly currentStep = this.state.currentStep;
  readonly validationResult = this.state.validationResult;
  readonly hasNonRightAngles = this.state.hasNonRightAngles;
  readonly points = this.state.points;
  readonly awningConfig = this.state.awningConfig;

  readonly currentStepIndex = computed(() => STEP_ORDER.indexOf(this.state.currentStep()));

  readonly canUndo = computed(
    () => !this.state.isClosed() && this.state.points().length > 0,
  );

  readonly validationMessage = computed(() => {
    switch (this.state.currentStep()) {
      case 'select-type': return 'Select an awning type to continue.';
      case 'draw': return 'Click the drawing plane to add points.';
      case 'close': return 'Add at least 3 points, then click the first point to close the frame.';
      case 'measure': {
        const allEdges = this.state.edges().every(e => (e.realLengthMm ?? 0) > 0);
        const allCorners = this.state.corners().every(c => c.confirmed);
        if (!allEdges) return 'Enter the length for each edge.';
        if (!allCorners) return 'Confirm all corner angles to continue.';
        return '';
      }
      default: return '';
    }
  });

  readonly steps: { key: WorkflowStep; label: string }[] = [
    { key: 'select-type', label: 'Select Awning Type' },
    { key: 'draw', label: 'Draw Awning Outline' },
    { key: 'close', label: 'Close the Frame' },
    { key: 'measure', label: 'Enter Measurements & Angles' },
    { key: 'calculate', label: 'Calculate Materials' },
  ];

  // ─── Wizard / scroll mode ──────────────────────────────────────────────────

  private readonly _wizardMode = signal(true);
  private readonly _panelIndex = signal(0);

  readonly wizardMode = this._wizardMode.asReadonly();
  readonly panelIndex = this._panelIndex.asReadonly();

  readonly panelDefs: { label: string; hint: string }[] = [
    { label: 'Setup', hint: 'Project info & awning type' },
    { label: 'Draw', hint: 'Outline the awning frame' },
    { label: 'Measure', hint: 'Edge lengths & corner angles' },
    { label: 'Config', hint: 'Edge roles & purlin layout' },
    { label: 'Calc', hint: 'Configure material settings' },
    { label: 'Results', hint: 'Material estimate & cost' },
  ];

  readonly isConfigureMode = computed(() => this._panelIndex() === 3);

  readonly canAdvance = computed(() => {
    switch (this._panelIndex()) {
      case 0: return this.state.awningType() !== null;
      case 1: return this.state.isClosed();
      case 2: return this.state.canCalculate();
      case 3: return true; // Configure is always advanceable
      case 4: return this.state.estimate() !== null;
      default: return false;
    }
  });

  readonly advanceHint = computed(() => {
    switch (this._panelIndex()) {
      case 0: return 'Select an awning type to continue.';
      case 1: return 'Draw and close the frame on the canvas.';
      case 2: return this.validationMessage();
      case 3: return '';
      case 4: return 'Click Calculate Materials to generate the estimate.';
      default: return '';
    }
  });

  readonly edgeRoleOptions: { value: EdgeRole; label: string; color: string }[] = [
    { value: 'wall', label: 'Wall', color: '#d97706' },
    { value: 'gutter', label: 'Gutter', color: '#0891b2' },
    { value: 'open-side', label: 'Open', color: '#7c3aed' },
  ];

  constructor() {
    effect(() => {
      if (!this._wizardMode()) return;
      const panelForStep = stepToPanel(this.state.currentStep());
      const current = this._panelIndex();
      if (current < panelForStep) {
        // Auto-advance to match workflow step
        this._panelIndex.set(panelForStep);
      } else if (current > panelForStep && panelForStep < 3) {
        // Sync backward only for early steps (draw/measure), not for configure+
        this._panelIndex.set(panelForStep);
      }
    });
  }

  stepStatus(step: WorkflowStep): 'complete' | 'active' | 'pending' {
    const idx = STEP_ORDER.indexOf(step);
    const cur = this.currentStepIndex();
    if (idx < cur) return 'complete';
    if (idx === cur) return 'active';
    return 'pending';
  }

  toggleViewMode(): void {
    this._wizardMode.update(v => !v);
  }

  setPanel(index: number): void {
    if (index >= 0 && index < this.panelDefs.length) {
      this._panelIndex.set(index);
    }
  }

  nextPanel(): void {
    if (this.canAdvance() && this._panelIndex() < this.panelDefs.length - 1) {
      this._panelIndex.update(i => i + 1);
    }
  }

  prevPanel(): void {
    if (this._panelIndex() > 0) {
      this._panelIndex.update(i => i - 1);
    }
  }

  // ─── Event handlers ────────────────────────────────────────────────────────

  onProjectNameChange(name: string): void {
    this.state.setProjectName(name);
  }

  onCustomerNameChange(name: string): void {
    this.state.setCustomerName(name);
  }

  onTypeChange(type: AwningType): void {
    this.state.setAwningType(type);
  }

  onMeasurementChange(change: MeasurementChange): void {
    this.state.updateEdgeMeasurement(change.edgeId, change.mm);
  }

  onAngleChanged(change: AngleChange): void {
    this.state.updateCornerAngle(change.pointId, change.deg);
  }

  onAngleConfirmed(pointId: string): void {
    this.state.confirmCornerAngle(pointId);
  }

  onCornerOverridden(pointId: string): void {
    this.state.overrideCornerAngle(pointId);
  }

  onSuggestionApplied(suggestion: ValidationSuggestion): void {
    this.state.applySuggestion(suggestion);
  }

  onProceedAnyway(): void {
    this.state.proceedAnyway();
  }

  onIbrSettingsChange(patch: Partial<IbrSettings>): void {
    this.state.updateIbrSettings(patch);
  }

  onLouverSettingsChange(patch: Partial<LouverSettings>): void {
    this.state.updateLouverSettings(patch);
  }

  onUnlock(): void {
    this.state.unlockDrawing();
  }

  onUndo(): void {
    this.state.undoLastPoint();
  }

  onReset(): void {
    this.state.resetDrawing();
  }

  // ─── Configure panel ───────────────────────────────────────────────────────

  getEdgeRole(edgeId: string): EdgeRole {
    return this.awningConfig().edgeRoles[edgeId] ?? 'unassigned';
  }

  onSetEdgeRole(edgeId: string, role: EdgeRole): void {
    const current = this.getEdgeRole(edgeId);
    this.state.setEdgeRole(edgeId, current === role ? 'unassigned' : role);
  }

  onFallDirectionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.state.setFallDirection(val || null);
  }

  onPurlinOverrideInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value.trim();
    if (val === '') {
      this.state.setPurlinCountOverride(null);
      return;
    }
    const n = parseInt(val, 10);
    this.state.setPurlinCountOverride(Number.isFinite(n) && n >= 1 ? n : null);
  }

  // ─── Calculate ─────────────────────────────────────────────────────────────

  onCalculate(): void {
    if (!this.canCalculate()) return;
    const points = this.state.points();
    const edges = this.state.edges();
    const corners = this.state.corners();
    const config = this.state.awningConfig();
    const mmVerts = this.geometry.reconstructVerticesMm(edges, corners, points);
    const areaSqm = mmVerts.length >= 3
      ? this.geometry.shoelaceArea(mmVerts) / 1_000_000
      : this.geometry.realAreaSqm(this.geometry.shoelaceArea(points), this.geometry.averageScaleMmPerPixel(edges));
    const perimeterM = this.geometry.perimeterMm(edges) / 1000;
    const { widthMm, projectionMm } = this.geometry.computeDimensions(edges, corners, points);
    const widthM = widthMm / 1000;
    const projectionM = projectionMm / 1000;

    const hasWallEdge = Object.values(config.edgeRoles).some(r => r === 'wall');
    const mountingType: MountingType = hasWallEdge ? 'wall-mounted' : this.state.ibrSettings().mountingType;

    const type = this.state.awningType()!;
    const estimate =
      type === 'IBR'
        ? this.estimator.estimateIbr(areaSqm, perimeterM, projectionM, widthM,
            { ...this.state.ibrSettings(), mountingType },
            config.purlinCountOverride ?? undefined)
        : this.estimator.estimateLouver(areaSqm, perimeterM, projectionM, widthM,
            { ...this.state.louverSettings(), mountingType });

    this.state.setEstimate(estimate);
    if (this._wizardMode()) {
      this._panelIndex.set(5); // advance to Results panel
    }
  }
}
