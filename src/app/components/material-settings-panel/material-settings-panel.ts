import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AwningType, IbrSettings, LouverSettings, MountingType } from '../../models/awning.models';

@Component({
  selector: 'app-material-settings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './material-settings-panel.scss',
  template: `
    @if (awningType() === 'IBR' && ibrSettings()) {
      <div class="settings-panel" role="group" aria-label="IBR material settings">

        <p class="settings-section-label">Roof Design</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="ibr-pitch">Pitch (degrees)</label>
            <input id="ibr-pitch" type="number" min="1" max="45" step="0.5"
              [value]="ibrSettings()!.pitchDeg"
              (blur)="onIbr('pitchDeg', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-overhang">Front overhang (mm)</label>
            <input id="ibr-overhang" type="number" min="0" max="300"
              [value]="ibrSettings()!.frontOverhangMm"
              (blur)="onIbr('frontOverhangMm', $event)" />
          </div>
          <div class="setting-field setting-field--full">
            <label for="ibr-mounting">Mounting type</label>
            <select id="ibr-mounting"
              [value]="ibrSettings()!.mountingType"
              (change)="onIbrMounting($event)">
              <option value="wall-mounted">Wall-mounted (rear beam fixed to wall)</option>
              <option value="free-standing">Free-standing (rear posts, no wall fixing)</option>
            </select>
          </div>
        </div>

        <p class="settings-section-label">Sheeting</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="ibr-cover-width">Cover width (mm)</label>
            <input id="ibr-cover-width" type="number" min="100" max="2000"
              [value]="ibrSettings()!.sheetCoverWidthMm"
              (blur)="onIbr('sheetCoverWidthMm', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-sheet-price">Sheet price (R/m)</label>
            <input id="ibr-sheet-price" type="number" min="0" step="5"
              [value]="ibrSettings()!.sheetPricePerMetre"
              (blur)="onIbr('sheetPricePerMetre', $event)" />
          </div>
        </div>

        <p class="settings-section-label">Structure</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="ibr-purlin-spacing">Purlin spacing (mm)</label>
            <input id="ibr-purlin-spacing" type="number" min="300" max="2000"
              [value]="ibrSettings()!.purlinSpacingMm"
              (blur)="onIbr('purlinSpacingMm', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-purlin-price">Purlin (R/m)</label>
            <input id="ibr-purlin-price" type="number" min="0" step="5"
              [value]="ibrSettings()!.purlinPricePerMetre"
              (blur)="onIbr('purlinPricePerMetre', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-beam-price">Beam (R/m)</label>
            <input id="ibr-beam-price" type="number" min="0" step="5"
              [value]="ibrSettings()!.beamPricePerMetre"
              (blur)="onIbr('beamPricePerMetre', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-post-spacing">Max post spacing (mm)</label>
            <input id="ibr-post-spacing" type="number" min="500" max="6000" step="500"
              [value]="ibrSettings()!.maxPostSpacingMm"
              (blur)="onIbr('maxPostSpacingMm', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-post-price">Post (R each)</label>
            <input id="ibr-post-price" type="number" min="0" step="50"
              [value]="ibrSettings()!.postPricePerUnit"
              (blur)="onIbr('postPricePerUnit', $event)" />
          </div>
        </div>

        <p class="settings-section-label">Drainage & Flashing</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="ibr-gutter-price">Gutter (R/m)</label>
            <input id="ibr-gutter-price" type="number" min="0" step="5"
              [value]="ibrSettings()!.gutterPricePerMetre"
              (blur)="onIbr('gutterPricePerMetre', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-downpipe-price">Downpipe (R each)</label>
            <input id="ibr-downpipe-price" type="number" min="0" step="25"
              [value]="ibrSettings()!.downpipePricePerUnit"
              (blur)="onIbr('downpipePricePerUnit', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-flashing-price">Flashing (R/m)</label>
            <input id="ibr-flashing-price" type="number" min="0" step="5"
              [value]="ibrSettings()!.flashingPricePerMetre"
              (blur)="onIbr('flashingPricePerMetre', $event)" />
          </div>
        </div>

        <p class="settings-section-label">Fasteners & Costing</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="ibr-fasteners-sqm">Fasteners per m²</label>
            <input id="ibr-fasteners-sqm" type="number" min="1" max="30"
              [value]="ibrSettings()!.fastenersPerSqm"
              (blur)="onIbr('fastenersPerSqm', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-fastener-price">Fastener price (R)</label>
            <input id="ibr-fastener-price" type="number" min="0" step="0.5"
              [value]="ibrSettings()!.fastenerPrice"
              (blur)="onIbr('fastenerPrice', $event)" />
          </div>
          <div class="setting-field">
            <label for="ibr-waste">Waste (%)</label>
            <input id="ibr-waste" type="number" min="0" max="50"
              [value]="ibrSettings()!.wastePercentage"
              (blur)="onIbr('wastePercentage', $event)" />
          </div>
        </div>
      </div>
    }

    @if (awningType() === 'LOUVER' && louverSettings()) {
      <div class="settings-panel" role="group" aria-label="Louvre material settings">

        <p class="settings-section-label">Roof Design</p>
        <div class="settings-grid">
          <div class="setting-field setting-field--full">
            <label for="louver-mounting">Mounting type</label>
            <select id="louver-mounting"
              [value]="louverSettings()!.mountingType"
              (change)="onLouverMounting($event)">
              <option value="wall-mounted">Wall-mounted</option>
              <option value="free-standing">Free-standing</option>
            </select>
          </div>
        </div>

        <p class="settings-section-label">Blades</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="louver-cover-width">Module spacing (mm)</label>
            <input id="louver-cover-width" type="number" min="50" max="500"
              [value]="louverSettings()!.bladeCoverWidthMm"
              (blur)="onLouver('bladeCoverWidthMm', $event)" />
          </div>
          <div class="setting-field">
            <label for="louver-blade-price">Blade price (R/m)</label>
            <input id="louver-blade-price" type="number" min="0" step="10"
              [value]="louverSettings()!.bladePricePerMetre"
              (blur)="onLouver('bladePricePerMetre', $event)" />
          </div>
        </div>

        <p class="settings-section-label">Structure</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="louver-frame-price">Frame (R/m)</label>
            <input id="louver-frame-price" type="number" min="0" step="5"
              [value]="louverSettings()!.framePricePerMetre"
              (blur)="onLouver('framePricePerMetre', $event)" />
          </div>
          <div class="setting-field">
            <label for="louver-post-spacing">Max post spacing (mm)</label>
            <input id="louver-post-spacing" type="number" min="500" max="6000" step="500"
              [value]="louverSettings()!.maxPostSpacingMm"
              (blur)="onLouver('maxPostSpacingMm', $event)" />
          </div>
          <div class="setting-field">
            <label for="louver-post-price">Post (R each)</label>
            <input id="louver-post-price" type="number" min="0" step="50"
              [value]="louverSettings()!.postPricePerUnit"
              (blur)="onLouver('postPricePerUnit', $event)" />
          </div>
        </div>

        <p class="settings-section-label">Drainage</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="louver-gutter-price">Gutter (R/m)</label>
            <input id="louver-gutter-price" type="number" min="0" step="5"
              [value]="louverSettings()!.gutterPricePerMetre"
              (blur)="onLouver('gutterPricePerMetre', $event)" />
          </div>
          <div class="setting-field">
            <label for="louver-downpipe-price">Downpipe (R each)</label>
            <input id="louver-downpipe-price" type="number" min="0" step="25"
              [value]="louverSettings()!.downpipePricePerUnit"
              (blur)="onLouver('downpipePricePerUnit', $event)" />
          </div>
        </div>

        <p class="settings-section-label">Mechanism & Costing</p>
        <div class="settings-grid">
          <div class="setting-field">
            <label for="louver-mechanism">Mechanism allowance (R)</label>
            <input id="louver-mechanism" type="number" min="0" step="100"
              [value]="louverSettings()!.mechanismAllowance"
              (blur)="onLouver('mechanismAllowance', $event)" />
          </div>
          <div class="setting-field">
            <label for="louver-waste">Waste (%)</label>
            <input id="louver-waste" type="number" min="0" max="50"
              [value]="louverSettings()!.wastePercentage"
              (blur)="onLouver('wastePercentage', $event)" />
          </div>
        </div>
      </div>
    }

    @if (!awningType()) {
      <p class="settings-empty">Select an awning type to configure material settings.</p>
    }
  `,
})
export class MaterialSettingsPanelComponent {
  readonly awningType = input<AwningType | null>(null);
  readonly ibrSettings = input<IbrSettings | null>(null);
  readonly louverSettings = input<LouverSettings | null>(null);

  readonly ibrSettingsChange = output<Partial<IbrSettings>>();
  readonly louverSettingsChange = output<Partial<LouverSettings>>();

  onIbr(field: keyof IbrSettings, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value)) {
      this.ibrSettingsChange.emit({ [field]: value });
    }
  }

  onIbrMounting(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MountingType;
    this.ibrSettingsChange.emit({ mountingType: value });
  }

  onLouver(field: keyof LouverSettings, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value)) {
      this.louverSettingsChange.emit({ [field]: value });
    }
  }

  onLouverMounting(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MountingType;
    this.louverSettingsChange.emit({ mountingType: value });
  }
}
