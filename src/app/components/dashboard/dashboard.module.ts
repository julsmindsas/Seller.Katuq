import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';

import { LegacyDashboardComponent } from './legacy-dashboard.component';
import { DashboardHomeComponent } from './home/dashboard-home.component';
import { ReportBuilderComponent } from './builder/report-builder.component';
import { VizKpiComponent } from './builder/widgets/viz-kpi.component';
import { VizTableComponent } from './builder/widgets/viz-table.component';
import { VizChartComponent } from './builder/widgets/viz-chart.component';
import { ReportViewComponent } from './view/report-view.component';

import { NgSelectModule } from '@ng-select/ng-select';
import { NgxHotkeysModule } from '@balticcode/ngx-hotkeys';
import { GalleryModule } from '@ks89/angular-modal-gallery';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ArchwizardModule } from 'angular-archwizard';
import { NgxStarRatingModule } from 'ngx-star-rating';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { SliderModule } from 'primeng/slider';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { TreeSelectModule } from 'primeng/treeselect';
import { NgxEchartsModule } from 'ngx-echarts';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { AnaliticaService } from '../../shared/services/dashboard/analiticas.services';
import { AnalyticsService } from '../../shared/services/dashboard/analytics.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    DashboardRoutingModule,
    NgSelectModule,
    NgxDatatableModule,
    TabViewModule,
    ArchwizardModule,
    TreeSelectModule,
    SliderModule,
    GalleryModule,
    CalendarModule,
    NgxHotkeysModule.forRoot(),
    NgxStarRatingModule,
    TableModule,
    MultiSelectModule,
    ToastModule,
    DragDropModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
  ],
  declarations: [
    LegacyDashboardComponent,
    DashboardHomeComponent,
    ReportBuilderComponent,
    ReportViewComponent,
    VizKpiComponent,
    VizTableComponent,
    VizChartComponent,
  ],
})
export class DashboardModule {}
