import { AwningType } from './awning.models';

export interface MaterialEstimateLine {
  id: string;
  item: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface RiskFlag {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface IbrStructuralSummary {
  pitchDeg: number;
  fallMm: number;
  slopeLengthMm: number;
  widthM: number;
  projectionM: number;
  sheetCount: number;
  purlinCount: number;
  postCount: number;
  gutterLengthM: number;
  downpipeCount: number;
}

export interface MaterialEstimate {
  awningType: AwningType;
  areaSqm: number;
  perimeterM: number;
  wastePercentage: number;
  lines: MaterialEstimateLine[];
  subtotal: number;
  wasteAllowance: number;
  total: number;
  riskFlags: RiskFlag[];
  structural?: IbrStructuralSummary;
}
