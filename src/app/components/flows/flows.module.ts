import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

import { FlowsRoutingModule } from './flows-routing.module';
import { FlowsListComponent } from './flow-list/flow-list.component';
import { FlowEditorComponent } from './flow-editor/flow-editor.component';
import { FlowRunsComponent } from './flow-runs/flow-runs.component';
import { FlowTemplatesComponent } from './flow-templates/flow-templates.component';
import { FlowDiffComponent } from './flow-diff/flow-diff.component';
import { FlowAiAssistComponent } from './flow-ai-assist/flow-ai-assist.component';
import { FlowCanvasLoaderService } from './services/flow-canvas-loader.service';

/**
 * Lazy module wiring the Flows section.
 *
 * - Page components: list / editor / runs / templates / diff
 * - Embedded panel: AI assist
 * - Web Component loader: FlowCanvasLoaderService
 *
 * `CUSTOM_ELEMENTS_SCHEMA` lets `<katuq-flow-canvas>` compile inside Angular templates.
 */
@NgModule({
  declarations: [
    FlowsListComponent,
    FlowEditorComponent,
    FlowRunsComponent,
    FlowTemplatesComponent,
    FlowDiffComponent,
    FlowAiAssistComponent
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModalModule, FlowsRoutingModule],
  providers: [FlowCanvasLoaderService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [FlowAiAssistComponent]
})
export class FlowsModule {}
