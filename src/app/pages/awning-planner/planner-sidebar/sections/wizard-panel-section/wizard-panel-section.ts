import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EstimateSummaryComponent } from '../../../../../components/estimate-summary/estimate-summary';
import { MaterialSettingsPanelComponent } from '../../../../../components/material-settings-panel/material-settings-panel';
import { ProjectSetupView } from '../views/awning-type-selector/project-setup';
import { MeasureFormView } from '../views/measure-form/measure-form.view';
import { PlannerSidebarFacade } from '../../planner-sidebar.facade';

@Component({
  selector: 'app-wizard-panel-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProjectSetupView,
    MeasureFormView,
    MaterialSettingsPanelComponent,
    EstimateSummaryComponent,
  ],
  templateUrl: './wizard-panel-section.html',
  styleUrl:  './wizard-panel-section.scss',
})
export class WizardPanelSection {
  readonly vm = inject(PlannerSidebarFacade);
}
