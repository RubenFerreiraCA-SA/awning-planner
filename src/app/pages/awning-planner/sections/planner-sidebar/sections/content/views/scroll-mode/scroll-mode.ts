import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CornerPanelComponent } from '../../../../../../../../components/corner-panel/corner-panel';
import { EstimateSummaryComponent } from '../../../../../../../../components/estimate-summary/estimate-summary';
import { MaterialSettingsPanelComponent } from '../../../../../../../../components/material-settings-panel/material-settings-panel';
import { MeasurementPanelComponent } from '../../../../../../../../components/measurement-panel/measurement-panel';
import { ValidationPanelComponent } from '../../../../../../../../components/validation-panel/validation-panel';
import { PlannerSidebarFacade } from '../../../../planner-sidebar.facade';
import { ProjectSetupView } from '../project-setup/project-setup';

@Component({
  selector: 'app-scroll-mode-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProjectSetupView,
    MeasurementPanelComponent,
    CornerPanelComponent,
    ValidationPanelComponent,
    MaterialSettingsPanelComponent,
    EstimateSummaryComponent,
  ],
  templateUrl: './scroll-mode.html',
  styleUrl: './scroll-mode.scss',
})
export class ScrollModeSection {
  readonly vm = inject(PlannerSidebarFacade);
}
