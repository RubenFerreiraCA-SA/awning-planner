import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DrawingCorner, DrawingPoint } from '../../../../models/drawing.models';
import { EdgeRole } from '../../../../models/awning-config.models';
import { DrawingStateService } from '../../../../services/drawing-state.service';
import { GeometryCalculationService } from '../../../../services/geometry-calculation.service';

interface EdgeLabel {
  x: number;
  y: number;
  text: string;
  hasMeasurement: boolean;
}

interface AngleIndicator {
  pointId: string;
  path: string;
  lx: number;
  ly: number;
  label: string;
  isRight: boolean;
  confirmed: boolean;
}

interface ScaleBar {
  x1: number;
  y: number;
  barPx: number;
  label: string;
}

interface PurlinLine { x1: number; y1: number; x2: number; y2: number; }
interface PostMarker { x: number; y: number; }
interface WallHatch { x1: number; y1: number; x2: number; y2: number; }
interface FallArrow { x1: number; y1: number; x2: number; y2: number; pitchDeg: number; fallMm: number; label: string; }
interface GutterLine { x1: number; y1: number; x2: number; y2: number; }

/** Unit outward normal from an edge, pointing away from the polygon centroid. */
function outwardNormal(
  from: { x: number; y: number },
  to: { x: number; y: number },
  centroid: { x: number; y: number },
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: 0, y: -1 };
  let nx = -dy / len;
  let ny = dx / len;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dot = (centroid.x - midX) * nx + (centroid.y - midY) * ny;
  // If dot > 0, normal points toward centroid (inward) → flip
  if (dot > 0) { nx = -nx; ny = -ny; }
  return { x: nx, y: ny };
}

@Component({
  selector: 'app-drawing-plane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drawing-plane.html',
  styleUrl: './drawing-plane.scss',
})
export class DrawingPlaneComponent {
  private readonly state = inject(DrawingStateService);
  private readonly geometry = inject(GeometryCalculationService);

  readonly configureMode = input<boolean>(false);
  readonly canDraw = input<boolean>(false);

  readonly shape = this.state.shape;
  readonly awningConfig = this.state.awningConfig;
  readonly awningType = this.state.awningType;
  readonly isClosed = this.state.isClosed;
  readonly currentStep = this.state.currentStep;

  readonly canUndo = computed(
    () => !this.state.isClosed() && this.state.points().length > 0,
  );

  private readonly _cursor = signal<{ x: number; y: number } | null>(null);
  readonly cursor = this._cursor.asReadonly();

  private readonly _svgSize = signal({ width: 800, height: 600 });
  private readonly svgEl = viewChild<ElementRef<SVGSVGElement>>('svgEl');

  constructor() {
    effect((onCleanup) => {
      const el = this.svgEl()?.nativeElement;
      if (!el) return;
      const obs = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        this._svgSize.set({ width, height });
      });
      obs.observe(el);
      onCleanup(() => obs.disconnect());
    });
  }

  readonly pointMap = computed(() => {
    const map = new Map<string, DrawingPoint>();
    this.state.points().forEach(p => map.set(p.id, p));
    return map;
  });

  readonly isNearFirstPoint = computed(() => {
    const cur = this._cursor();
    const pts = this.state.points();
    if (!cur || pts.length < 3 || this.state.isClosed()) return false;
    const first = pts[0];
    return Math.hypot(cur.x - first.x, cur.y - first.y) <= 20;
  });

  /** Scaled polygon points fitted to the SVG viewport. Non-null when shape is closed
   *  and at least one edge measurement exists. */
  readonly scaledData = computed<{
    points: DrawingPoint[];
    mmPerPx: number;
  } | null>(() => {
    if (!this.state.isClosed()) return null;

    const edges = this.state.edges();
    const corners = this.state.corners();
    const points = this.state.points();

    const mmPerPixel = this.geometry.averageScaleMmPerPixel(edges);
    if (mmPerPixel === 0) return null;

    const mmVerts = this.geometry.reconstructVerticesMm(edges, corners, points);
    if (mmVerts.length < 3) return null;

    const n = mmVerts.length;
    let longestMm = 0;
    let longestAngle = 0;
    for (let i = 0; i < n; i++) {
      const a = mmVerts[i];
      const b = mmVerts[(i + 1) % n];
      const L = edges[i]?.realLengthMm ??
        (mmPerPixel > 0 ? edges[i].pixelLength * mmPerPixel : edges[i].pixelLength);
      if (L > longestMm) {
        longestMm = L;
        longestAngle = Math.atan2(b.y - a.y, b.x - a.x);
      }
    }
    const cosA = Math.cos(-longestAngle);
    const sinA = Math.sin(-longestAngle);
    const alignedVerts = mmVerts.map(p => ({
      x: p.x * cosA - p.y * sinA,
      y: p.x * sinA + p.y * cosA,
    }));

    const xs = alignedVerts.map(p => p.x);
    const ys = alignedVerts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const mmW = maxX - minX;
    const mmH = maxY - minY;

    const { width, height } = this._svgSize();
    const padding = 80;
    const availW = width - padding * 2;
    const availH = height - padding * 2;

    const scaleX = mmW > 0 ? availW / mmW : Infinity;
    const scaleY = mmH > 0 ? availH / mmH : Infinity;
    const scale = Math.min(scaleX, scaleY);

    if (!isFinite(scale) || scale <= 0) return null;

    const scaledW = mmW * scale;
    const scaledH = mmH * scale;
    const ox = padding + (availW - scaledW) / 2 - minX * scale;
    const oy = padding + (availH - scaledH) / 2 - minY * scale;

    return {
      points: alignedVerts.map((p, i) => ({
        id: points[i].id,
        x: ox + p.x * scale,
        y: oy + p.y * scale,
      })),
      mmPerPx: 1 / scale,
    };
  });

  readonly displayPoints = computed<DrawingPoint[]>(() =>
    this.scaledData()?.points ?? this.state.points(),
  );

  readonly displayPointMap = computed(() => {
    const map = new Map<string, DrawingPoint>();
    this.displayPoints().forEach(p => map.set(p.id, p));
    return map;
  });

  readonly scaleBar = computed<ScaleBar | null>(() => {
    const data = this.scaledData();
    if (!data) return null;

    const mmPerPx = data.mmPerPx;
    const { height } = this._svgSize();
    const rawMm = 90 * mmPerPx;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMm)));
    const candidates = [1, 2, 5, 10].map(v => v * magnitude);
    const barMm = candidates.reduce((best, v) =>
      Math.abs(v - rawMm) < Math.abs(best - rawMm) ? v : best,
    );
    const barPx = barMm / mmPerPx;
    const label = barMm >= 1000 ? `${barMm / 1000}m` : `${barMm}mm`;

    return { x1: 20, y: height - 28, barPx, label };
  });

  readonly edgeLabels = computed<EdgeLabel[]>(() => {
    if (!this.state.isClosed()) return [];
    const map = this.displayPointMap();
    return this.state
      .edges()
      .map(edge => {
        const from = map.get(edge.fromPointId);
        const to = map.get(edge.toPointId);
        if (!from || !to) return null;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        const px = len > 0 ? (-dy / len) * 18 : 0;
        const py = len > 0 ? (dx / len) * 18 : -18;
        const measurement = edge.realLengthMm ? ` · ${(edge.realLengthMm / 1000).toFixed(2)}m` : '';
        return {
          x: mx + px,
          y: my + py,
          text: edge.label + measurement,
          hasMeasurement: !!edge.realLengthMm,
        } satisfies EdgeLabel;
      })
      .filter((l): l is EdgeLabel => l !== null);
  });

  readonly angleIndicators = computed<AngleIndicator[]>(() => {
    if (!this.state.isClosed()) return [];
    const pts = this.displayPoints();
    const corners = this.state.corners();
    const n = pts.length;
    if (corners.length !== n) return [];

    return corners.map((corner, i) => {
      const curr = pts[i];
      const prev = pts[(i + n - 1) % n];
      const next = pts[(i + 1) % n];
      return this.buildAngleIndicator(corner, curr, prev, next);
    });
  });

  // ─── Technical drawing overlays ────────────────────────────────────────────

  /** Computes shared geometry for overlay rendering: gutter edge, directions, etc. */
  private readonly overlayBase = computed<{
    pts: DrawingPoint[];
    pxPerMm: number;
    centroid: { x: number; y: number };
    gutterDir: { x: number; y: number };
    projDir: { x: number; y: number };
    minProj: number;
    maxProj: number;
    minGutter: number;
    maxGutter: number;
    gutterFrom: DrawingPoint | null;
    gutterTo: DrawingPoint | null;
  } | null>(() => {
    const data = this.scaledData();
    if (!data) return null;
    const edges = this.state.edges();
    const config = this.state.awningConfig();
    const pts = data.points;
    if (pts.length < 3) return null;

    const centroid = {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };

    // Priority: explicit fallToEdgeId > first gutter-role edge > longest measured edge
    const fallEdgeSpec = config.fallToEdgeId ? edges.find(e => e.id === config.fallToEdgeId) : null;
    const gutterEdgeSpec = edges.find(e => config.edgeRoles[e.id] === 'gutter');
    const refEdge = fallEdgeSpec ?? gutterEdgeSpec
      ?? edges.reduce((a, b) => (a.realLengthMm ?? 0) >= (b.realLengthMm ?? 0) ? a : b, edges[0]);

    const gutterFrom = pts.find(p => p.id === refEdge.fromPointId) ?? null;
    const gutterTo = pts.find(p => p.id === refEdge.toPointId) ?? null;
    if (!gutterFrom || !gutterTo) return null;

    const dx = gutterTo.x - gutterFrom.x;
    const dy = gutterTo.y - gutterFrom.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;

    const gutterDir = { x: dx / len, y: dy / len };
    const projDir = { x: -gutterDir.y, y: gutterDir.x };

    const projs = pts.map(p => p.x * projDir.x + p.y * projDir.y);
    const gutterProjs = pts.map(p => p.x * gutterDir.x + p.y * gutterDir.y);

    return {
      pts,
      pxPerMm: 1 / data.mmPerPx,
      centroid,
      gutterDir,
      projDir,
      minProj: Math.min(...projs),
      maxProj: Math.max(...projs),
      minGutter: Math.min(...gutterProjs),
      maxGutter: Math.max(...gutterProjs),
      gutterFrom,
      gutterTo,
    };
  });

  readonly purlinLines = computed<PurlinLine[]>(() => {
    if (this.state.awningType() !== 'IBR') return [];
    const base = this.overlayBase();
    if (!base) return [];
    const settings = this.state.ibrSettings();
    const config = this.state.awningConfig();

    const projSpanMm = (base.maxProj - base.minProj) / base.pxPerMm;
    // N purlins create N+1 sections; auto-select minimum N so each section ≤ purlinSpacingMm
    const auto = Math.max(1, Math.ceil(projSpanMm / settings.purlinSpacingMm) - 1);
    const count = config.purlinCountOverride ?? auto;
    const ext = 4; // px extension beyond polygon bounds in gutter direction
    // Place N purlins at (i+1)/(N+1) positions → N+1 equal sections between supports
    const span = base.maxProj - base.minProj;

    const lines: PurlinLine[] = [];
    for (let i = 0; i < count; i++) {
      const t = base.minProj + span * (i + 1) / (count + 1);
      lines.push({
        x1: t * base.projDir.x + (base.minGutter - ext) * base.gutterDir.x,
        y1: t * base.projDir.y + (base.minGutter - ext) * base.gutterDir.y,
        x2: t * base.projDir.x + (base.maxGutter + ext) * base.gutterDir.x,
        y2: t * base.projDir.y + (base.maxGutter + ext) * base.gutterDir.y,
      });
    }
    return lines;
  });

  readonly postMarkers = computed<PostMarker[]>(() => {
    const base = this.overlayBase();
    if (!base) return [];
    const config = this.state.awningConfig();
    const edges = this.state.edges();
    const gutterEdge = edges.find(e => config.edgeRoles[e.id] === 'gutter');
    if (!gutterEdge) return [];

    const fromPt = base.pts.find(p => p.id === gutterEdge.fromPointId);
    const toPt = base.pts.find(p => p.id === gutterEdge.toPointId);
    if (!fromPt || !toPt) return [];

    const settings = this.awningType() === 'IBR'
      ? this.state.ibrSettings()
      : this.state.louverSettings();

    const dx = toPt.x - fromPt.x;
    const dy = toPt.y - fromPt.y;
    const edgeLenMm = Math.hypot(dx, dy) / base.pxPerMm;
    const bays = Math.max(1, Math.ceil(edgeLenMm / settings.maxPostSpacingMm));
    const markers: PostMarker[] = [];
    for (let i = 0; i <= bays; i++) {
      const t = i / bays;
      markers.push({ x: fromPt.x + dx * t, y: fromPt.y + dy * t });
    }
    return markers;
  });

  readonly gutterLines = computed<GutterLine[]>(() => {
    const base = this.overlayBase();
    if (!base) return [];
    const config = this.state.awningConfig();
    const edges = this.state.edges();
    const gutterEdges = edges.filter(e => config.edgeRoles[e.id] === 'gutter');
    if (gutterEdges.length === 0) return [];

    const offset = 10;
    const lines: GutterLine[] = [];
    for (const edge of gutterEdges) {
      const fromPt = base.pts.find(p => p.id === edge.fromPointId);
      const toPt = base.pts.find(p => p.id === edge.toPointId);
      if (!fromPt || !toPt) continue;
      const n = outwardNormal(fromPt, toPt, base.centroid);
      lines.push({
        x1: fromPt.x + n.x * offset,
        y1: fromPt.y + n.y * offset,
        x2: toPt.x + n.x * offset,
        y2: toPt.y + n.y * offset,
      });
    }
    return lines;
  });

  readonly wallHatches = computed<WallHatch[]>(() => {
    const base = this.overlayBase();
    if (!base) return [];
    const config = this.state.awningConfig();
    const edges = this.state.edges();
    const pts = base.pts;
    const centroid = base.centroid;

    const wallEdges = edges.filter(e => config.edgeRoles[e.id] === 'wall');
    const hatches: WallHatch[] = [];

    for (const edge of wallEdges) {
      const fromPt = pts.find(p => p.id === edge.fromPointId);
      const toPt = pts.find(p => p.id === edge.toPointId);
      if (!fromPt || !toPt) continue;

      const dx = toPt.x - fromPt.x;
      const dy = toPt.y - fromPt.y;
      const edgeLen = Math.hypot(dx, dy);
      if (edgeLen === 0) continue;

      const n = outwardNormal(fromPt, toPt, centroid);
      const count = Math.max(3, Math.round(edgeLen / 18));
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const px = fromPt.x + dx * t;
        const py = fromPt.y + dy * t;
        hatches.push({ x1: px, y1: py, x2: px + n.x * 9, y2: py + n.y * 9 });
      }
    }
    return hatches;
  });

  readonly fallArrow = computed<FallArrow | null>(() => {
    if (this.state.awningType() !== 'IBR') return null;
    const base = this.overlayBase();
    if (!base) return null;
    const config = this.state.awningConfig();
    const edges = this.state.edges();
    const hasFallRef = config.fallToEdgeId != null || edges.some(e => config.edgeRoles[e.id] === 'gutter');
    if (!hasFallRef) return null;

    const settings = this.state.ibrSettings();
    const { centroid, gutterFrom, gutterTo, projDir } = base;
    if (!gutterFrom || !gutterTo) return null;

    const gutterMidX = (gutterFrom.x + gutterTo.x) / 2;
    const gutterMidY = (gutterFrom.y + gutterTo.y) / 2;
    const toGutterDot = (gutterMidX - centroid.x) * projDir.x + (gutterMidY - centroid.y) * projDir.y;
    const fallDirX = toGutterDot >= 0 ? projDir.x : -projDir.x;
    const fallDirY = toGutterDot >= 0 ? projDir.y : -projDir.y;

    const arrowLen = Math.min(60, (base.maxProj - base.minProj) * 0.45);
    const pitchRad = (settings.pitchDeg * Math.PI) / 180;
    const projectionMm = (base.maxProj - base.minProj) / base.pxPerMm;
    const fallMm = Math.round(Math.tan(pitchRad) * projectionMm);

    return {
      x1: centroid.x - fallDirX * arrowLen / 2,
      y1: centroid.y - fallDirY * arrowLen / 2,
      x2: centroid.x + fallDirX * arrowLen / 2,
      y2: centroid.y + fallDirY * arrowLen / 2,
      pitchDeg: settings.pitchDeg,
      fallMm,
      label: `${settings.pitchDeg}° / ${fallMm}mm fall`,
    };
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  roleStroke(role: EdgeRole | undefined): string {
    switch (role) {
      case 'wall': return '#d97706';
      case 'gutter': return '#0891b2';
      case 'open-side': return '#7c3aed';
      default: return '';
    }
  }

  getEdgeRole(edgeId: string): EdgeRole {
    return this.state.awningConfig().edgeRoles[edgeId] ?? 'unassigned';
  }

  getPointLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getPointRadius(index: number): number {
    if (index === 0 && this.state.points().length >= 3 && !this.state.isClosed()) {
      return 10;
    }
    return 6;
  }

  onSvgClick(event: MouseEvent): void {
    if (!this.canDraw()) return;
    if (this.state.isClosed()) return;
    const { x, y } = this.svgCoords(event);
    if (this.state.points().length >= 3 && this.state.tryCloseShape(x, y)) return;
    this.state.addPoint(x, y);
  }

  onEdgeClick(event: MouseEvent, edgeId: string): void {
    event.stopPropagation();
    const roles: EdgeRole[] = ['unassigned', 'wall', 'gutter', 'open-side'];
    const current = this.getEdgeRole(edgeId);
    const next = roles[(roles.indexOf(current) + 1) % roles.length];
    this.state.setEdgeRole(edgeId, next);
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.canDraw() || this.state.isClosed()) return;
    this._cursor.set(this.svgCoords(event));
  }

  onMouseLeave(): void {
    this._cursor.set(null);
  }

  onUndo(): void {
    this.state.undoLastPoint();
  }

  onUnlock(): void {
    this.state.unlockDrawing();
  }

  toPolyPoints(points: DrawingPoint[]): string {
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }

  private buildAngleIndicator(
    corner: DrawingCorner,
    curr: DrawingPoint,
    prev: DrawingPoint,
    next: DrawingPoint,
  ): AngleIndicator {
    const R = 14;
    const ua = this.normalize(prev.x - curr.x, prev.y - curr.y);
    const ub = this.normalize(next.x - curr.x, next.y - curr.y);
    const inward = this.normalize(ua.x + ub.x, ua.y + ub.y);

    const labelDist = 26;
    const lx = curr.x + inward.x * labelDist;
    const ly = curr.y + inward.y * labelDist;

    const angleDeg = corner.userAngleDeg ?? corner.pixelAngleDeg;
    const label = corner.isAssumedRightAngle && corner.confirmed
      ? ''
      : `${Math.round(angleDeg)}°`;

    let path: string;
    if (corner.isAssumedRightAngle) {
      const p1 = { x: curr.x + ua.x * R, y: curr.y + ua.y * R };
      const p2 = { x: curr.x + ua.x * R + ub.x * R, y: curr.y + ua.y * R + ub.y * R };
      const p3 = { x: curr.x + ub.x * R, y: curr.y + ub.y * R };
      path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`;
    } else {
      const start = { x: curr.x + ua.x * R, y: curr.y + ua.y * R };
      const end = { x: curr.x + ub.x * R, y: curr.y + ub.y * R };
      const largeArc = angleDeg > 180 ? 1 : 0;
      const sweep = corner.pixelTurnSign === 1 ? 0 : 1;
      path = `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
    }

    return { pointId: corner.pointId, path, lx, ly, label, isRight: corner.isAssumedRightAngle, confirmed: corner.confirmed };
  }

  private normalize(x: number, y: number): { x: number; y: number } {
    const len = Math.hypot(x, y);
    if (len === 0) return { x: 0, y: -1 };
    return { x: x / len, y: y / len };
  }

  private svgCoords(event: MouseEvent): { x: number; y: number } {
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
}
