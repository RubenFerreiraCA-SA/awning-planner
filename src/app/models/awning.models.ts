export type AwningType = 'IBR' | 'LOUVER';
export type MountingType = 'wall-mounted' | 'free-standing';

export interface IbrSettings {
  // Roof design
  pitchDeg: number;
  mountingType: MountingType;

  // Sheeting
  sheetCoverWidthMm: number;
  sheetPricePerMetre: number;
  frontOverhangMm: number;

  // Structure
  purlinSpacingMm: number;
  purlinPricePerMetre: number;
  beamPricePerMetre: number;

  // Posts
  maxPostSpacingMm: number;
  postPricePerUnit: number;

  // Drainage
  gutterPricePerMetre: number;
  downpipePricePerUnit: number;

  // Flashing
  flashingPricePerMetre: number;

  // Fasteners
  fastenersPerSqm: number;
  fastenerPrice: number;

  // Costing
  wastePercentage: number;
}

export interface LouverSettings {
  mountingType: MountingType;
  bladeCoverWidthMm: number;
  bladePricePerMetre: number;
  framePricePerMetre: number;
  maxPostSpacingMm: number;
  postPricePerUnit: number;
  gutterPricePerMetre: number;
  downpipePricePerUnit: number;
  fastenersPerSqm: number;
  fastenerPrice: number;
  mechanismAllowance: number;
  wastePercentage: number;
}

export interface MaterialPrices {
  ibr: IbrSettings;
  louver: LouverSettings;
}

export const DEFAULT_MATERIAL_PRICES: MaterialPrices = {
  ibr: {
    pitchDeg: 5,
    mountingType: 'wall-mounted',
    sheetCoverWidthMm: 686,
    sheetPricePerMetre: 95,
    frontOverhangMm: 50,
    purlinSpacingMm: 1000,
    purlinPricePerMetre: 80,
    beamPricePerMetre: 120,
    maxPostSpacingMm: 3000,
    postPricePerUnit: 450,
    gutterPricePerMetre: 85,
    downpipePricePerUnit: 250,
    flashingPricePerMetre: 95,
    fastenersPerSqm: 8,
    fastenerPrice: 1.5,
    wastePercentage: 8,
  },
  louver: {
    mountingType: 'wall-mounted',
    bladeCoverWidthMm: 200,
    bladePricePerMetre: 280,
    framePricePerMetre: 150,
    maxPostSpacingMm: 4500,
    postPricePerUnit: 650,
    gutterPricePerMetre: 95,
    downpipePricePerUnit: 300,
    fastenersPerSqm: 6,
    fastenerPrice: 1.5,
    mechanismAllowance: 1500,
    wastePercentage: 10,
  },
};
