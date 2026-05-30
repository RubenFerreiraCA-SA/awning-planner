import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CornerPanelComponent } from '../../../../../components/corner-panel/corner-panel';
import { EstimateSummaryComponent } from '../../../../../components/estimate-summary/estimate-summary';
import { MaterialSettingsPanelComponent } from '../../../../../components/material-settings-panel/material-settings-panel';
import { MeasurementPanelComponent } from '../../../../../components/measurement-panel/measurement-panel';
import { ValidationPanelComponent } from '../../../../../components/validation-panel/validation-panel';
import { ProjectSetupView } from '../views/awning-type-selector/project-setup';
import { PlannerSidebarFacade } from '../../planner-sidebar.facade';

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
  templateUrl: './scroll-mode-section.html',
  styleUrl: '../../planner-sidebar.scss',
})
export class ScrollModeSection {
  readonly vm = inject(PlannerSidebarFacade);
}
