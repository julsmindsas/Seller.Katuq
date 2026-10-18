import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsModule } from 'ngx-echarts';
import { VizKpiComponent } from './viz-kpi.component';
import { VizTableComponent } from './viz-table.component';
import { VizChartComponent } from './viz-chart.component';

/**
 * Widgets que dibujan un `ReportResult` del motor de reportes (KPI, tabla/pivote y
 * gráfica). Nacieron en el constructor de reportes; viven aquí para que otras
 * pantallas (Satisfacción de clientes, D-483) los usen sin copiarlos.
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
  ],
  declarations: [VizKpiComponent, VizTableComponent, VizChartComponent],
  exports: [VizKpiComponent, VizTableComponent, VizChartComponent],
})
export class ReportVizModule {}
