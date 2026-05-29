export interface DrawingPoint {
  id: string;
  x: number;
  y: number;
}

export interface DrawingEdge {
  id: string;
  fromPointId: string;
  toPointId: string;
  pixelLength: number;
  realLengthMm?: number;
  label: string;
}

export interface DrawingCorner {
  pointId: string;
  label: string;
  /** Interior angle in degrees, computed from pixel drawing */
  pixelAngleDeg: number;
  /** +1 = CW turn in screen coords, -1 = CCW turn */
  pixelTurnSign: 1 | -1;
  /** True when pixel angle is within RIGHT_ANGLE_TOLERANCE of 90° */
  isAssumedRightAngle: boolean;
  /** Angle the user has entered or confirmed */
  userAngleDeg?: number;
  /** True when user has confirmed (or it was auto-confirmed as right angle) */
  confirmed: boolean;
}

export interface AwningShape {
  points: DrawingPoint[];
  edges: DrawingEdge[];
  isClosed: boolean;
  scaleMmPerPixel?: number;
  areaSqm?: number;
  perimeterMm?: number;
}

export type WorkflowStep = 'select-type' | 'draw' | 'close' | 'measure' | 'calculate';

export type ValidationStatus = 'unchecked' | 'valid' | 'warning' | 'error';

export interface ValidationSuggestion {
  id: string;
  type: 'adjust-angle' | 'adjust-edge';
  label: string;
  description: string;
  suggestedValue: number;
  currentValue: number;
  cornerLabel?: string;
  edgeLabel?: string;
}

export interface ValidationResult {
  status: ValidationStatus;
  closureErrorMm: number;
  closureErrorPct: number;
  message: string;
  suggestions: ValidationSuggestion[];
}
