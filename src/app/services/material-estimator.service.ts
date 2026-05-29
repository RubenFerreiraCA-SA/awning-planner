import { Injectable } from '@angular/core';
import { IbrSettings, LouverSettings } from '../models/awning.models';
import {
  IbrStructuralSummary,
  MaterialEstimate,
  MaterialEstimateLine,
  RiskFlag,
} from '../models/estimate.models';

@Injectable({ providedIn: 'root' })
export class MaterialEstimatorService {
  estimateIbr(
    areaSqm: number,
    perimeterM: number,
    projectionM: number,
    widthM: number,
    settings: IbrSettings,
    purlinCountOverride?: number,
  ): MaterialEstimate {
    const pitchRad = (settings.pitchDeg * Math.PI) / 180;
    const fallMm = Math.round(Math.tan(pitchRad) * projectionM * 1000);
    const slopeLengthMm = Math.round(
      (projectionM * 1000) / Math.cos(pitchRad) + settings.frontOverhangMm,
    );
    const slopeLengthM = slopeLengthMm / 1000;

    // Sheets
    const sheetCount = Math.ceil((widthM * 1000) / settings.sheetCoverWidthMm);
    const totalSheetLinearM = Math.round(sheetCount * slopeLengthM * 10) / 10;
    const sheetCost = totalSheetLinearM * settings.sheetPricePerMetre;

    // Purlins
    const purlinCount = purlinCountOverride ?? (Math.floor((projectionM * 1000) / settings.purlinSpacingMm) + 1);
    const purlinTotalM = Math.round(purlinCount * widthM * 10) / 10;
    const purlinCost = purlinTotalM * settings.purlinPricePerMetre;

    // Beams: wall + front + two sides
    const wallBeamM = settings.mountingType === 'wall-mounted' ? widthM : 0;
    const frontBeamM = widthM;
    const sideBeamM = projectionM * 2;
    const totalBeamM = Math.round((wallBeamM + frontBeamM + sideBeamM) * 10) / 10;
    const beamCost = totalBeamM * settings.beamPricePerMetre;

    // Posts
    const frontBays = Math.ceil((widthM * 1000) / settings.maxPostSpacingMm);
    const frontPostCount = frontBays + 1;
    const rearPostCount = settings.mountingType === 'free-standing' ? frontPostCount : 0;
    const totalPostCount = frontPostCount + rearPostCount;
    const postCost = totalPostCount * settings.postPricePerUnit;

    // Gutter & downpipes
    const gutterLengthM = Math.round(widthM * 10) / 10;
    const gutterCost = gutterLengthM * settings.gutterPricePerMetre;
    const downpipeCount = gutterLengthM > 6 || areaSqm > 20 ? 2 : 1;
    const downpipeCost = downpipeCount * settings.downpipePricePerUnit;

    // Flashing (wall apron, wall-mounted only)
    const flashingLengthM = settings.mountingType === 'wall-mounted' ? widthM : 0;
    const flashingCost = Math.round(flashingLengthM * 10) / 10 * settings.flashingPricePerMetre;

    // Fasteners
    const fasteners = Math.ceil(areaSqm * settings.fastenersPerSqm);
    const fastenerCost = fasteners * settings.fastenerPrice;

    const lines: MaterialEstimateLine[] = [
      {
        id: 'ibr-sheets',
        item: 'IBR Roof Sheets',
        description: `${sheetCount} sheets × ${slopeLengthM.toFixed(2)}m @ ${settings.sheetCoverWidthMm}mm cover`,
        quantity: totalSheetLinearM,
        unit: 'lin m',
        unitCost: settings.sheetPricePerMetre,
        totalCost: sheetCost,
      },
      {
        id: 'purlins',
        item: 'Purlins',
        description: `${purlinCount} rows × ${widthM.toFixed(1)}m @ ${settings.purlinSpacingMm}mm centres`,
        quantity: purlinTotalM,
        unit: 'm',
        unitCost: settings.purlinPricePerMetre,
        totalCost: purlinCost,
      },
      {
        id: 'beams',
        item: 'Structural Beams',
        description:
          settings.mountingType === 'wall-mounted'
            ? `Wall ${wallBeamM.toFixed(1)}m · Front ${frontBeamM.toFixed(1)}m · Sides ${sideBeamM.toFixed(1)}m`
            : `Front ${frontBeamM.toFixed(1)}m · Sides ${sideBeamM.toFixed(1)}m`,
        quantity: totalBeamM,
        unit: 'm',
        unitCost: settings.beamPricePerMetre,
        totalCost: beamCost,
      },
      {
        id: 'posts',
        item: 'Support Posts',
        description:
          settings.mountingType === 'wall-mounted'
            ? `${frontPostCount} front posts (max ${(settings.maxPostSpacingMm / 1000).toFixed(1)}m centres)`
            : `${frontPostCount} front + ${rearPostCount} rear posts`,
        quantity: totalPostCount,
        unit: 'posts',
        unitCost: settings.postPricePerUnit,
        totalCost: postCost,
      },
      {
        id: 'gutter',
        item: 'Front Gutter',
        description: `${gutterLengthM.toFixed(1)}m with stop ends & outlets`,
        quantity: gutterLengthM,
        unit: 'm',
        unitCost: settings.gutterPricePerMetre,
        totalCost: gutterCost,
      },
      {
        id: 'downpipes',
        item: 'Downpipes',
        description:
          downpipeCount > 1
            ? 'Two recommended (area >20m² or gutter >6m)'
            : 'Single downpipe with shoe/bend',
        quantity: downpipeCount,
        unit: 'units',
        unitCost: settings.downpipePricePerUnit,
        totalCost: downpipeCost,
      },
    ];

    if (flashingLengthM > 0) {
      lines.push({
        id: 'flashing',
        item: 'Wall Apron Flashing',
        description: `${flashingLengthM.toFixed(1)}m along wall`,
        quantity: Math.round(flashingLengthM * 10) / 10,
        unit: 'm',
        unitCost: settings.flashingPricePerMetre,
        totalCost: flashingCost,
      });
    }

    lines.push({
      id: 'fasteners',
      item: 'Fasteners & Screws',
      description: `${settings.fastenersPerSqm} per m² (roofing screws with washers)`,
      quantity: fasteners,
      unit: 'units',
      unitCost: settings.fastenerPrice,
      totalCost: fastenerCost,
    });

    const riskFlags = this.ibrRiskFlags(settings.pitchDeg, projectionM, widthM, areaSqm, settings.mountingType);

    const subtotal = lines.reduce((sum, l) => sum + l.totalCost, 0);
    const wasteAllowance = subtotal * (settings.wastePercentage / 100);

    const structural: IbrStructuralSummary = {
      pitchDeg: settings.pitchDeg,
      fallMm,
      slopeLengthMm,
      widthM,
      projectionM,
      sheetCount,
      purlinCount,
      postCount: totalPostCount,
      gutterLengthM,
      downpipeCount,
    };

    return {
      awningType: 'IBR',
      areaSqm,
      perimeterM,
      wastePercentage: settings.wastePercentage,
      lines,
      subtotal,
      wasteAllowance,
      total: subtotal + wasteAllowance,
      riskFlags,
      structural,
    };
  }

  estimateLouver(
    areaSqm: number,
    perimeterM: number,
    projectionM: number,
    widthM: number,
    settings: LouverSettings,
  ): MaterialEstimate {
    // Blades span across width; count determined by projection depth
    const bladeCount = Math.ceil((projectionM * 1000) / settings.bladeCoverWidthMm);
    const bladeLengthM = widthM;
    const totalBladeLinearM = Math.round(bladeCount * bladeLengthM * 10) / 10;
    const bladeCost = totalBladeLinearM * settings.bladePricePerMetre;

    const frameM = Math.round(perimeterM * 10) / 10;
    const frameCost = frameM * settings.framePricePerMetre;

    const frontBays = Math.ceil((widthM * 1000) / settings.maxPostSpacingMm);
    const frontPostCount = frontBays + 1;
    const rearPostCount = settings.mountingType === 'free-standing' ? frontPostCount : 0;
    const totalPostCount = frontPostCount + rearPostCount;
    const postCost = totalPostCount * settings.postPricePerUnit;

    const gutterLengthM = Math.round(widthM * 10) / 10;
    const gutterCost = gutterLengthM * settings.gutterPricePerMetre;
    const downpipeCount = gutterLengthM > 6 || areaSqm > 20 ? 2 : 1;
    const downpipeCost = downpipeCount * settings.downpipePricePerUnit;

    const fasteners = Math.ceil(areaSqm * settings.fastenersPerSqm);
    const fastenerCost = fasteners * settings.fastenerPrice;

    const lines: MaterialEstimateLine[] = [
      {
        id: 'blades',
        item: 'Louvre Blades',
        description: `${bladeCount} blades × ${bladeLengthM.toFixed(1)}m @ ${settings.bladeCoverWidthMm}mm module`,
        quantity: totalBladeLinearM,
        unit: 'lin m',
        unitCost: settings.bladePricePerMetre,
        totalCost: bladeCost,
      },
      {
        id: 'frame',
        item: 'Perimeter Frame',
        description: `${frameM.toFixed(1)}m total (wall beam, front beam, side beams)`,
        quantity: frameM,
        unit: 'm',
        unitCost: settings.framePricePerMetre,
        totalCost: frameCost,
      },
      {
        id: 'posts',
        item: 'Support Posts',
        description:
          settings.mountingType === 'wall-mounted'
            ? `${frontPostCount} front posts (max ${(settings.maxPostSpacingMm / 1000).toFixed(1)}m centres)`
            : `${frontPostCount} front + ${rearPostCount} rear posts`,
        quantity: totalPostCount,
        unit: 'posts',
        unitCost: settings.postPricePerUnit,
        totalCost: postCost,
      },
      {
        id: 'gutter',
        item: 'Drainage Gutter',
        description: `${gutterLengthM.toFixed(1)}m with stop ends & ${downpipeCount} downpipe${downpipeCount > 1 ? 's' : ''}`,
        quantity: gutterLengthM,
        unit: 'm',
        unitCost: settings.gutterPricePerMetre,
        totalCost: gutterCost,
      },
      {
        id: 'downpipes',
        item: 'Downpipes',
        description: downpipeCount > 1 ? 'Two recommended (large area)' : 'Single downpipe',
        quantity: downpipeCount,
        unit: 'units',
        unitCost: settings.downpipePricePerUnit,
        totalCost: downpipeCost,
      },
      {
        id: 'mechanism',
        item: 'Pivot / Control Mechanism',
        description: 'Gearbox, pivot rods, controls',
        quantity: 1,
        unit: 'lump sum',
        unitCost: settings.mechanismAllowance,
        totalCost: settings.mechanismAllowance,
      },
      {
        id: 'fasteners',
        item: 'Fasteners',
        description: `${settings.fastenersPerSqm} per m²`,
        quantity: fasteners,
        unit: 'units',
        unitCost: settings.fastenerPrice,
        totalCost: fastenerCost,
      },
    ];

    const riskFlags = this.louverRiskFlags(widthM, projectionM, areaSqm, settings.mountingType);

    const subtotal = lines.reduce((sum, l) => sum + l.totalCost, 0);
    const wasteAllowance = subtotal * (settings.wastePercentage / 100);

    return {
      awningType: 'LOUVER',
      areaSqm,
      perimeterM,
      wastePercentage: settings.wastePercentage,
      lines,
      subtotal,
      wasteAllowance,
      total: subtotal + wasteAllowance,
      riskFlags,
    };
  }

  private ibrRiskFlags(
    pitchDeg: number,
    projectionM: number,
    widthM: number,
    areaSqm: number,
    mountingType: string,
  ): RiskFlag[] {
    const flags: RiskFlag[] = [];

    if (pitchDeg < 3) {
      flags.push({
        id: 'pitch-critical',
        severity: 'critical',
        message: `Pitch of ${pitchDeg}° is critically low. IBR manufacturer minimum is 5°. Severe water ingress risk — not recommended.`,
      });
    } else if (pitchDeg < 5) {
      flags.push({
        id: 'pitch-low',
        severity: 'warning',
        message: `Pitch of ${pitchDeg}° is below the IBR minimum recommendation of 5°. Sealed laps and technical review required.`,
      });
    }

    if (projectionM > 5) {
      flags.push({
        id: 'projection-large',
        severity: 'warning',
        message: `Projection of ${projectionM.toFixed(1)}m is large. Engineering review required for beam sizing, uplift resistance and wall fixing loads.`,
      });
    } else if (projectionM > 3.5) {
      flags.push({
        id: 'projection-moderate',
        severity: 'info',
        message: `Projection of ${projectionM.toFixed(1)}m. Verify beam size, post spacing, uplift resistance and front clearance height.`,
      });
    }

    if (areaSqm > 36) {
      flags.push({
        id: 'area-large',
        severity: 'warning',
        message: `Area of ${areaSqm.toFixed(1)} m² is significant. Structural engineering review recommended.`,
      });
    }

    if (mountingType === 'free-standing') {
      flags.push({
        id: 'freestanding',
        severity: 'info',
        message: 'Free-standing structure. Confirm lateral bracing or moment-frame connections for wind stability.',
      });
    } else {
      flags.push({
        id: 'wall-fixing',
        severity: 'info',
        message: 'Wall-mounted. Confirm wall type, condition and that anchors are suitable before fixing.',
      });
    }

    flags.push({
      id: 'compliance',
      severity: 'info',
      message: 'Preliminary estimate only. Final design must comply with SANS 10400 (Parts B & L) and applicable National Building Regulations.',
    });

    return flags;
  }

  private louverRiskFlags(
    widthM: number,
    projectionM: number,
    areaSqm: number,
    mountingType: string,
  ): RiskFlag[] {
    const flags: RiskFlag[] = [];
    const bladeSpanM = widthM;

    if (bladeSpanM > 5) {
      flags.push({
        id: 'blade-span-critical',
        severity: 'critical',
        message: `Blade span of ${bladeSpanM.toFixed(1)}m exceeds the typical 5m maximum. Engineering review required.`,
      });
    } else if (bladeSpanM > 4.5) {
      flags.push({
        id: 'blade-span-large',
        severity: 'warning',
        message: `Blade span of ${bladeSpanM.toFixed(1)}m is near the typical limit. Confirm with louvre supplier's span tables.`,
      });
    }

    if (projectionM > 3.5) {
      flags.push({
        id: 'projection-moderate',
        severity: 'info',
        message: `Projection of ${projectionM.toFixed(1)}m. Verify side beam and post sizing, and confirm drainage path.`,
      });
    }

    if (areaSqm > 30) {
      flags.push({
        id: 'area-large',
        severity: 'warning',
        message: `Area of ${areaSqm.toFixed(1)} m² is significant. Structural and motor sizing review recommended.`,
      });
    }

    if (mountingType === 'free-standing') {
      flags.push({
        id: 'freestanding',
        severity: 'info',
        message: 'Free-standing structure. Confirm lateral bracing and post footings for wind loads.',
      });
    }

    flags.push({
      id: 'compliance',
      severity: 'info',
      message: 'Preliminary estimate only. Final design must comply with SANS 10400 and applicable National Building Regulations.',
    });

    return flags;
  }
}
