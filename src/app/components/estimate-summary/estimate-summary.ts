import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MaterialEstimate } from '../../models/estimate.models';

@Component({
  selector: 'app-estimate-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe],
  styleUrl: './estimate-summary.scss',
  template: `
    <div class="estimate">
      <p class="estimate-disclaimer">
        Preliminary material estimate only. Not final engineering or installation advice.
      </p>

      <div class="estimate-meta">
        <div class="meta-item">
          <span class="meta-label">Area</span>
          <span class="meta-value">{{ estimate().areaSqm | number: '1.2-2' }} m²</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Perimeter</span>
          <span class="meta-value">{{ estimate().perimeterM | number: '1.1-1' }} m</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Type</span>
          <span class="meta-value">{{ estimate().awningType === 'IBR' ? 'IBR Sheet' : 'Louvre' }}</span>
        </div>
      </div>

      @if (estimate().structural; as s) {
        <div class="structural-summary">
          <p class="structural-title">Structural Summary</p>
          <div class="structural-grid">
            <div class="struct-item">
              <span class="struct-label">Width</span>
              <span class="struct-val">{{ s.widthM | number: '1.1-2' }} m</span>
            </div>
            <div class="struct-item">
              <span class="struct-label">Projection</span>
              <span class="struct-val">{{ s.projectionM | number: '1.1-2' }} m</span>
            </div>
            <div class="struct-item">
              <span class="struct-label">Pitch</span>
              <span class="struct-val">{{ s.pitchDeg }}°</span>
            </div>
            <div class="struct-item">
              <span class="struct-label">Fall</span>
              <span class="struct-val">{{ s.fallMm }} mm</span>
            </div>
            <div class="struct-item">
              <span class="struct-label">Sheets</span>
              <span class="struct-val">{{ s.sheetCount }} × {{ (s.slopeLengthMm / 1000) | number: '1.2-2' }}m</span>
            </div>
            <div class="struct-item">
              <span class="struct-label">Purlins</span>
              <span class="struct-val">{{ s.purlinCount }} rows</span>
            </div>
            <div class="struct-item">
              <span class="struct-label">Posts</span>
              <span class="struct-val">{{ s.postCount }}</span>
            </div>
            <div class="struct-item">
              <span class="struct-label">Downpipes</span>
              <span class="struct-val">{{ s.downpipeCount }}</span>
            </div>
          </div>
        </div>
      }

      <table class="line-items" aria-label="Material line items">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" class="col-qty">Qty</th>
            <th scope="col" class="col-unit">Unit</th>
            <th scope="col" class="col-cost">Total</th>
          </tr>
        </thead>
        <tbody>
          @for (line of estimate().lines; track line.id) {
            <tr>
              <td>
                <span class="line-item">{{ line.item }}</span>
                <span class="line-desc">{{ line.description }}</span>
              </td>
              <td class="col-qty">{{ line.quantity | number: '1.0-1' }}</td>
              <td class="col-unit">{{ line.unit }}</td>
              <td class="col-cost">{{ line.totalCost | currency: 'ZAR' : 'R ' : '1.0-0' }}</td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr class="subtotal-row">
            <td colspan="3">Subtotal</td>
            <td class="col-cost">{{ estimate().subtotal | currency: 'ZAR' : 'R ' : '1.0-0' }}</td>
          </tr>
          <tr class="waste-row">
            <td colspan="3">Waste allowance ({{ estimate().wastePercentage }}%)</td>
            <td class="col-cost">{{ estimate().wasteAllowance | currency: 'ZAR' : 'R ' : '1.0-0' }}</td>
          </tr>
          <tr class="total-row">
            <td colspan="3"><strong>Estimated Total</strong></td>
            <td class="col-cost"><strong>{{ estimate().total | currency: 'ZAR' : 'R ' : '1.0-0' }}</strong></td>
          </tr>
        </tfoot>
      </table>

      @if (estimate().riskFlags.length > 0) {
        <div class="risk-flags" aria-label="Risk flags and notes">
          <p class="risk-flags__title">Notes & Risk Flags</p>
          <ul class="risk-list">
            @for (flag of estimate().riskFlags; track flag.id) {
              <li class="risk-item risk-item--{{ flag.severity }}">
                <span class="risk-icon" aria-hidden="true">
                  @if (flag.severity === 'critical') { ✕ }
                  @else if (flag.severity === 'warning') { ⚠ }
                  @else { ℹ }
                </span>
                <span class="risk-text">{{ flag.message }}</span>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class EstimateSummaryComponent {
  readonly estimate = input.required<MaterialEstimate>();
}
