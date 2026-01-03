/**
 * A2UI Renderers Module
 *
 * Registers all A2UI renderer components for use in the AG-UI v2 protocol.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Renderer Components
import { A2uiRendererComponent } from './a2ui-renderer.component';
import { KatuqMetricComponent } from './katuq-metric.component';
import { KatuqChartComponent } from './katuq-chart.component';
import { KatuqDispatchMapComponent } from './katuq-dispatch-map.component';
import { KatuqStockAlertComponent } from './katuq-stock-alert.component';
import { KatuqTableComponent } from './katuq-table.component';
import { KatuqConfirmationComponent } from './katuq-confirmation.component';
import { KatuqVotingPanelComponent } from './katuq-voting-panel.component';

const RENDERER_COMPONENTS = [
  A2uiRendererComponent,
  KatuqMetricComponent,
  KatuqChartComponent,
  KatuqDispatchMapComponent,
  KatuqStockAlertComponent,
  KatuqTableComponent,
  KatuqConfirmationComponent,
  KatuqVotingPanelComponent
];

@NgModule({
  declarations: RENDERER_COMPONENTS,
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: RENDERER_COMPONENTS
})
export class A2uiRenderersModule {}
