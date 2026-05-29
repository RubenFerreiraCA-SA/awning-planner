import { Injectable } from '@angular/core';
import {
  DrawingCorner,
  DrawingEdge,
  DrawingPoint,
  ValidationResult,
  ValidationSuggestion,
} from '../models/drawing.models';

const RIGHT_ANGLE_TOLERANCE_DEG = 5;

@Injectable({ providedIn: 'root' })
export class GeometryCalculationService {
  // ─── Basic geometry ────────────────────────────────────────────────────────

  shoelaceArea(points: { x: number; y: number }[]): number {
    if (points.length < 3) return 0;
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  averageScaleMmPerPixel(edges: DrawingEdge[]): number {
    const measured = edges.filter(e => (e.realLengthMm ?? 0) > 0 && e.pixelLength > 0);
    if (measured.length === 0) return 0;
    const sum = measured.reduce((acc, e) => acc + e.realLengthMm! / e.pixelLength, 0);
    return sum / measured.length;
  }

  realAreaSqm(pixelArea: number, mmPerPixel: number): number {
    return (pixelArea * mmPerPixel * mmPerPixel) / 1_000_000;
  }

  perimeterMm(edges: DrawingEdge[]): number {
    return edges.reduce((sum, e) => sum + (e.realLengthMm ?? 0), 0);
  }

  // ─── Corner angles ─────────────────────────────────────────────────────────

  computeCorners(points: DrawingPoint[]): DrawingCorner[] {
    const n = points.length;
    return points.map((curr, i) => {
      const prev = points[(i + n - 1) % n];
      const next = points[(i + 1) % n];

      // Interior angle: angle between vectors curr→prev and curr→next
      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const mag1 = Math.hypot(v1.x, v1.y);
      const mag2 = Math.hypot(v2.x, v2.y);
      const cosA = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2)));
      const pixelAngleDeg = (Math.acos(cosA) * 180) / Math.PI;

      // Turn sign: cross product of the directed edge vectors at this vertex.
      // In screen coords (y-down): cross > 0 means CW turn.
      const incoming = { x: curr.x - prev.x, y: curr.y - prev.y };
      const outgoing = { x: next.x - curr.x, y: next.y - curr.y };
      const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
      const pixelTurnSign: 1 | -1 = cross >= 0 ? 1 : -1;

      const isAssumedRightAngle = Math.abs(pixelAngleDeg - 90) <= RIGHT_ANGLE_TOLERANCE_DEG;

      return {
        pointId: curr.id,
        label: String.fromCharCode(65 + i),
        pixelAngleDeg,
        pixelTurnSign,
        isAssumedRightAngle,
        // Pre-fill with detected angle so Confirm is immediately available
        userAngleDeg: isAssumedRightAngle ? 90 : Math.round(pixelAngleDeg * 10) / 10,
        confirmed: isAssumedRightAngle,
      };
    });
  }

  // ─── Polygon simulation & closure validation ───────────────────────────────

  validateClosure(
    edges: DrawingEdge[],
    corners: DrawingCorner[],
    points: DrawingPoint[],
  ): ValidationResult {
    const n = points.length;
    if (n < 3 || edges.length !== n || !corners.every(c => c.confirmed)) {
      return {
        status: 'unchecked',
        closureErrorMm: 0,
        closureErrorPct: 0,
        message: '',
        suggestions: [],
      };
    }

    const { closureErrorMm } = this.simulatePolygon(edges, corners, points);
    const perimeterMm = edges.reduce((s, e) => s + (e.realLengthMm ?? 0), 0);
    const closureErrorPct = perimeterMm > 0 ? (closureErrorMm / perimeterMm) * 100 : 0;

    if (closureErrorPct < 1) {
      return {
        status: 'valid',
        closureErrorMm,
        closureErrorPct,
        message: `Shape closes within tolerance (${closureErrorMm.toFixed(0)}mm error).`,
        suggestions: [],
      };
    }

    const suggestions = this.generateSuggestions(edges, corners, points, closureErrorMm);

    if (closureErrorPct < 3) {
      return {
        status: 'warning',
        closureErrorMm,
        closureErrorPct,
        message: `Minor discrepancy detected (${closureErrorMm.toFixed(0)}mm, ${closureErrorPct.toFixed(1)}%). Check measurements.`,
        suggestions,
      };
    }

    return {
      status: 'error',
      closureErrorMm,
      closureErrorPct,
      message: `Measurements are inconsistent (${closureErrorMm.toFixed(0)}mm, ${closureErrorPct.toFixed(1)}% of perimeter). Apply a correction below.`,
      suggestions,
    };
  }

  simulatePolygon(
    edges: DrawingEdge[],
    corners: DrawingCorner[],
    points: DrawingPoint[],
  ): { closureErrorMm: number; finalPos: { x: number; y: number } } {
    const n = points.length;
    if (n < 2) return { closureErrorMm: 0, finalPos: { x: 0, y: 0 } };

    // Start direction: direction of first edge in pixel space
    const startDir = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
    let pos = { x: 0, y: 0 };
    let dir = startDir;

    for (let i = 0; i < n; i++) {
      const L = edges[i].realLengthMm ?? 0;
      pos = { x: pos.x + L * Math.cos(dir), y: pos.y + L * Math.sin(dir) };

      // Turn at the next corner
      const nextIdx = (i + 1) % n;
      const corner = corners[nextIdx];
      const angleDeg = corner.userAngleDeg ?? corner.pixelAngleDeg;
      const angleRad = (angleDeg * Math.PI) / 180;
      // Exterior angle in the direction of the pixel turn
      dir += corner.pixelTurnSign * (Math.PI - angleRad);
    }

    return { closureErrorMm: Math.hypot(pos.x, pos.y), finalPos: pos };
  }

  // ─── Suggestion generation ─────────────────────────────────────────────────

  private generateSuggestions(
    edges: DrawingEdge[],
    corners: DrawingCorner[],
    points: DrawingPoint[],
    currentError: number,
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // Try adjusting each non-right-angle corner's angle
    for (const corner of corners) {
      if (corner.isAssumedRightAngle) continue;
      const currentAngle = corner.userAngleDeg ?? corner.pixelAngleDeg;
      const bestAngle = this.findBestAngle(edges, corners, points, corner.pointId);
      const improvement = Math.abs(bestAngle - currentAngle);

      if (improvement > 0.5) {
        const modifiedCorners = corners.map(c =>
          c.pointId === corner.pointId ? { ...c, userAngleDeg: bestAngle, confirmed: true } : c,
        );
        const { closureErrorMm: newError } = this.simulatePolygon(edges, modifiedCorners, points);
        if (newError < currentError * 0.6) {
          suggestions.push({
            id: `angle-${corner.pointId}`,
            type: 'adjust-angle',
            label: `Adjust angle at corner ${corner.label}`,
            description: `Change from ${currentAngle.toFixed(1)}° to ${bestAngle.toFixed(1)}° (trig-derived)`,
            suggestedValue: Math.round(bestAngle * 10) / 10,
            currentValue: currentAngle,
            cornerLabel: corner.label,
          });
        }
      }
    }

    // Try adjusting each edge length
    for (const edge of edges) {
      const currentLength = edge.realLengthMm ?? 0;
      if (currentLength === 0) continue;
      const bestLength = this.findBestEdgeLength(edges, corners, points, edge.id);
      const changePct = Math.abs(bestLength - currentLength) / currentLength;

      if (changePct > 0.005) {
        // only suggest if change is > 0.5%
        const modifiedEdges = edges.map(e =>
          e.id === edge.id ? { ...e, realLengthMm: bestLength } : e,
        );
        const { closureErrorMm: newError } = this.simulatePolygon(modifiedEdges, corners, points);
        if (newError < currentError * 0.6) {
          suggestions.push({
            id: `edge-${edge.id}`,
            type: 'adjust-edge',
            label: `Adjust edge ${edge.label}`,
            description: `Change from ${currentLength}mm to ${Math.round(bestLength)}mm`,
            suggestedValue: Math.round(bestLength),
            currentValue: currentLength,
            edgeLabel: edge.label,
          });
        }
      }
    }

    // Return at most 3 suggestions, sorted by improvement potential
    return suggestions.slice(0, 3);
  }

  private findBestAngle(
    edges: DrawingEdge[],
    corners: DrawingCorner[],
    points: DrawingPoint[],
    targetPointId: string,
  ): number {
    let bestAngle = corners.find(c => c.pointId === targetPointId)?.userAngleDeg ?? 90;
    let bestError = Infinity;
    for (let angle = 15; angle <= 165; angle += 0.5) {
      const modified = corners.map(c =>
        c.pointId === targetPointId ? { ...c, userAngleDeg: angle, confirmed: true } : c,
      );
      const { closureErrorMm } = this.simulatePolygon(edges, modified, points);
      if (closureErrorMm < bestError) {
        bestError = closureErrorMm;
        bestAngle = angle;
      }
    }
    return bestAngle;
  }

  /**
   * Reconstruct polygon vertices in mm-space using real edge lengths and corner angles.
   * Falls back to pixel-proportional lengths for unmeasured edges.
   */
  reconstructVerticesMm(
    edges: DrawingEdge[],
    corners: DrawingCorner[],
    points: DrawingPoint[],
  ): { x: number; y: number }[] {
    const n = points.length;
    if (n < 2 || corners.length !== n || edges.length !== n) return [];

    const mmPerPixel = this.averageScaleMmPerPixel(edges);
    const startDir = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
    const verts: { x: number; y: number }[] = [];
    let pos = { x: 0, y: 0 };
    let dir = startDir;

    verts.push({ ...pos });

    for (let i = 0; i < n - 1; i++) {
      const L =
        edges[i].realLengthMm ??
        (mmPerPixel > 0 ? edges[i].pixelLength * mmPerPixel : edges[i].pixelLength);
      pos = { x: pos.x + L * Math.cos(dir), y: pos.y + L * Math.sin(dir) };
      verts.push({ ...pos });

      const corner = corners[(i + 1) % n];
      const angleDeg = corner.userAngleDeg ?? corner.pixelAngleDeg;
      const angleRad = (angleDeg * Math.PI) / 180;
      dir += corner.pixelTurnSign * (Math.PI - angleRad);
    }

    return verts;
  }

  /** Returns width (long axis) and projection (short axis) of the polygon in mm,
   *  derived by aligning the longest edge horizontally then taking the bounding box. */
  computeDimensions(
    edges: DrawingEdge[],
    corners: DrawingCorner[],
    points: DrawingPoint[],
  ): { widthMm: number; projectionMm: number } {
    const mmVerts = this.reconstructVerticesMm(edges, corners, points);
    if (mmVerts.length < 3) return { widthMm: 0, projectionMm: 0 };

    const n = mmVerts.length;
    const mmPerPixel = this.averageScaleMmPerPixel(edges);
    let longestMm = 0;
    let longestAngle = 0;
    for (let i = 0; i < n; i++) {
      const a = mmVerts[i];
      const b = mmVerts[(i + 1) % n];
      const L =
        edges[i]?.realLengthMm ??
        (mmPerPixel > 0 ? edges[i].pixelLength * mmPerPixel : edges[i].pixelLength);
      if (L > longestMm) {
        longestMm = L;
        longestAngle = Math.atan2(b.y - a.y, b.x - a.x);
      }
    }

    const cosA = Math.cos(-longestAngle);
    const sinA = Math.sin(-longestAngle);
    const aligned = mmVerts.map(p => ({
      x: p.x * cosA - p.y * sinA,
      y: p.x * sinA + p.y * cosA,
    }));

    const xs = aligned.map(p => p.x);
    const ys = aligned.map(p => p.y);
    const widthMm = Math.round(Math.max(...xs) - Math.min(...xs));
    const projectionMm = Math.round(Math.max(...ys) - Math.min(...ys));
    return { widthMm, projectionMm };
  }

  private findBestEdgeLength(
    edges: DrawingEdge[],
    corners: DrawingCorner[],
    points: DrawingPoint[],
    targetEdgeId: string,
  ): number {
    const current = edges.find(e => e.id === targetEdgeId)?.realLengthMm ?? 0;
    if (current === 0) return 0;
    let bestLength = current;
    let bestError = Infinity;
    const min = current * 0.6;
    const max = current * 1.4;
    const step = (max - min) / 160;
    for (let len = min; len <= max; len += step) {
      const modified = edges.map(e =>
        e.id === targetEdgeId ? { ...e, realLengthMm: len } : e,
      );
      const { closureErrorMm } = this.simulatePolygon(modified, corners, points);
      if (closureErrorMm < bestError) {
        bestError = closureErrorMm;
        bestLength = len;
      }
    }
    return bestLength;
  }
}
