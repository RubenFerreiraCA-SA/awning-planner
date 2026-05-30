import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DrawingCorner,
  DrawingEdge,
  DrawingPoint,
  AwningShape,
  ValidationResult,
  ValidationSuggestion,
  WorkflowStep,
} from '../models/drawing.models';
import { AwningType, IbrSettings, LouverSettings, DEFAULT_MATERIAL_PRICES } from '../models/awning.models';
import { AwningConfig, DEFAULT_AWNING_CONFIG, EdgeRole } from '../models/awning-config.models';
import { MaterialEstimate } from '../models/estimate.models';
import { GeometryCalculationService } from './geometry-calculation.service';

@Injectable({ providedIn: 'root' })
export class DrawingStateService {
  private static readonly CLOSE_THRESHOLD = 18;
  private readonly geometry = inject(GeometryCalculationService);

  private readonly _projectName = signal('');
  private readonly _customerName = signal('');
  private readonly _awningType = signal<AwningType | null>(null);
  private readonly _points = signal<DrawingPoint[]>([]);
  private readonly _edges = signal<DrawingEdge[]>([]);
  private readonly _isClosed = signal(false);
  private readonly _corners = signal<DrawingCorner[]>([]);
  private readonly _validationResult = signal<ValidationResult | null>(null);
  private readonly _ibrSettings = signal<IbrSettings>({ ...DEFAULT_MATERIAL_PRICES.ibr });
  private readonly _louverSettings = signal<LouverSettings>({ ...DEFAULT_MATERIAL_PRICES.louver });
  private readonly _estimate = signal<MaterialEstimate | null>(null);
  private readonly _awningConfig = signal<AwningConfig>({ ...DEFAULT_AWNING_CONFIG, edgeRoles: {} });

  readonly projectName = this._projectName.asReadonly();
  readonly customerName = this._customerName.asReadonly();
  readonly awningType = this._awningType.asReadonly();
  readonly points = this._points.asReadonly();
  readonly edges = this._edges.asReadonly();
  readonly isClosed = this._isClosed.asReadonly();
  readonly corners = this._corners.asReadonly();
  readonly validationResult = this._validationResult.asReadonly();
  readonly ibrSettings = this._ibrSettings.asReadonly();
  readonly louverSettings = this._louverSettings.asReadonly();
  readonly estimate = this._estimate.asReadonly();
  readonly awningConfig = this._awningConfig.asReadonly();

  readonly shape = computed<AwningShape>(() => ({
    points: this._points(),
    edges: this._edges(),
    isClosed: this._isClosed(),
  }));

  readonly currentStep = computed<WorkflowStep>(() => {
    if (!this._awningType()) return 'select-type';
    if (!this._isClosed()) {
      return this._points().length < 3 ? 'draw' : 'close';
    }
    const allMeasured = this._edges().every(e => (e.realLengthMm ?? 0) > 0);
    const allConfirmed = this._corners().every(c => c.confirmed);
    if (!allMeasured || !allConfirmed) return 'measure';
    return 'calculate';
  });

  readonly canCalculate = computed(
    () =>
      this._awningType() !== null &&
      this._isClosed() &&
      this._edges().every(e => (e.realLengthMm ?? 0) > 0) &&
      this._corners().every(c => c.confirmed),
  );

  readonly hasNonRightAngles = computed(() =>
    this._corners().some(c => !c.isAssumedRightAngle),
  );

  // ─── Project info ──────────────────────────────────────────────────────────

  setProjectName(name: string): void { this._projectName.set(name); }
  setCustomerName(name: string): void { this._customerName.set(name); }

  setAwningType(type: AwningType): void {
    this._awningType.set(type);
    this._estimate.set(null);
  }

  // ─── Drawing operations ────────────────────────────────────────────────────

  addPoint(x: number, y: number): void {
    if (this._isClosed()) return;
    const points = this._points();
    const newPoint: DrawingPoint = { id: `p${points.length}`, x, y };

    if (points.length > 0) {
      const from = points[points.length - 1];
      this._edges.update(edges => [
        ...edges,
        {
          id: `e${edges.length}`,
          fromPointId: from.id,
          toPointId: newPoint.id,
          pixelLength: this.dist(from.x, from.y, x, y),
          label: this.edgeLabel(points.length - 1, points.length),
        },
      ]);
    }

    this._points.update(pts => [...pts, newPoint]);
  }

  undoLastPoint(): void {
    if (this._isClosed()) return;
    const points = this._points();
    if (points.length === 0) return;
    this._points.update(pts => pts.slice(0, -1));
    if (this._edges().length > 0) {
      this._edges.update(edges => edges.slice(0, -1));
    }
  }

  tryCloseShape(x: number, y: number): boolean {
    const points = this._points();
    if (points.length < 3) return false;
    const first = points[0];
    if (this.dist(x, y, first.x, first.y) <= DrawingStateService.CLOSE_THRESHOLD) {
      this.closeShape();
      return true;
    }
    return false;
  }

  /** Remove closing edge, go back to open-shape state. Preserves all edge measurements. */
  unlockDrawing(): void {
    this._edges.update(edges => edges.slice(0, -1));
    this._isClosed.set(false);
    this._corners.set([]);
    this._validationResult.set(null);
    this._estimate.set(null);
    this._awningConfig.set({ ...DEFAULT_AWNING_CONFIG, edgeRoles: {} });
  }

  resetDrawing(): void {
    this._points.set([]);
    this._edges.set([]);
    this._isClosed.set(false);
    this._corners.set([]);
    this._validationResult.set(null);
    this._estimate.set(null);
    this._awningConfig.set({ ...DEFAULT_AWNING_CONFIG, edgeRoles: {} });
  }

  // ─── Measurements ──────────────────────────────────────────────────────────

  updateEdgeMeasurement(edgeId: string, mm: number): void {
    this._edges.update(edges =>
      edges.map(e => (e.id === edgeId ? { ...e, realLengthMm: mm > 0 ? mm : undefined } : e)),
    );
    this._estimate.set(null);
    this.tryRunValidation();
  }

  // ─── Corner angles ─────────────────────────────────────────────────────────

  updateCornerAngle(pointId: string, deg: number): void {
    this._corners.update(cs =>
      cs.map(c => (c.pointId === pointId ? { ...c, userAngleDeg: deg } : c)),
    );
    this._validationResult.set(null);
  }

  confirmCornerAngle(pointId: string): void {
    this._corners.update(cs =>
      cs.map(c => (c.pointId === pointId ? { ...c, confirmed: true } : c)),
    );
    this.tryRunValidation();
  }

  /** Allow user to override an assumed-right-angle corner */
  overrideCornerAngle(pointId: string): void {
    this._corners.update(cs =>
      cs.map(c =>
        c.pointId === pointId
          ? { ...c, isAssumedRightAngle: false, userAngleDeg: c.userAngleDeg ?? Math.round(c.pixelAngleDeg * 10) / 10, confirmed: false }
          : c,
      ),
    );
    this._validationResult.set(null);
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  applySuggestion(suggestion: ValidationSuggestion): void {
    if (suggestion.type === 'adjust-angle' && suggestion.cornerLabel) {
      const corner = this._corners().find(c => c.label === suggestion.cornerLabel);
      if (corner) {
        this._corners.update(cs =>
          cs.map(c =>
            c.pointId === corner.pointId
              ? { ...c, userAngleDeg: suggestion.suggestedValue, confirmed: true, isAssumedRightAngle: false }
              : c,
          ),
        );
      }
    } else if (suggestion.type === 'adjust-edge' && suggestion.edgeLabel) {
      const edge = this._edges().find(e => e.label === suggestion.edgeLabel);
      if (edge) {
        this._edges.update(es =>
          es.map(e =>
            e.id === edge.id ? { ...e, realLengthMm: suggestion.suggestedValue } : e,
          ),
        );
      }
    }
    this._estimate.set(null);
    this.tryRunValidation();
  }

  proceedAnyway(): void {
    const current = this._validationResult();
    if (current) {
      this._validationResult.set({ ...current, status: 'valid' });
    }
  }

  // ─── Awning configuration ──────────────────────────────────────────────────

  setEdgeRole(edgeId: string, role: EdgeRole): void {
    this._awningConfig.update(c => {
      const roles = { ...c.edgeRoles };
      if (role === 'unassigned') {
        delete roles[edgeId];
      } else {
        roles[edgeId] = role;
      }
      return { ...c, edgeRoles: roles };
    });
  }

  setPurlinCountOverride(count: number | null): void {
    this._awningConfig.update(c => ({ ...c, purlinCountOverride: count }));
  }

  setFallDirection(edgeId: string | null): void {
    this._awningConfig.update(c => ({ ...c, fallToEdgeId: edgeId }));
  }

  // ─── Settings & estimate ───────────────────────────────────────────────────

  updateIbrSettings(patch: Partial<IbrSettings>): void {
    this._ibrSettings.update(s => ({ ...s, ...patch }));
    this._estimate.set(null);
  }

  updateLouverSettings(patch: Partial<LouverSettings>): void {
    this._louverSettings.update(s => ({ ...s, ...patch }));
    this._estimate.set(null);
  }

  setEstimate(estimate: MaterialEstimate): void {
    this._estimate.set(estimate);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private closeShape(): void {
    const points = this._points();
    const last = points[points.length - 1];
    const first = points[0];
    this._edges.update(edges => [
      ...edges,
      {
        id: `e${edges.length}`,
        fromPointId: last.id,
        toPointId: first.id,
        pixelLength: this.dist(last.x, last.y, first.x, first.y),
        label: this.edgeLabel(points.length - 1, 0),
      },
    ]);
    this._isClosed.set(true);
    this._corners.set(this.geometry.computeCorners(points));
  }

  private tryRunValidation(): void {
    const corners = this._corners();
    const edges = this._edges();
    const points = this._points();
    if (
      corners.length > 0 &&
      corners.every(c => c.confirmed) &&
      edges.every(e => (e.realLengthMm ?? 0) > 0)
    ) {
      this._validationResult.set(this.geometry.validateClosure(edges, corners, points));
    }
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  private edgeLabel(fromIdx: number, toIdx: number): string {
    return `${String.fromCharCode(65 + fromIdx)}-${String.fromCharCode(65 + toIdx)}`;
  }
}
