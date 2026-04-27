import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FlowsListComponent } from './flow-list/flow-list.component';
import { FlowEditorComponent } from './flow-editor/flow-editor.component';
import { FlowRunsComponent } from './flow-runs/flow-runs.component';
import { FlowTemplatesComponent } from './flow-templates/flow-templates.component';
import { FlowDiffComponent } from './flow-diff/flow-diff.component';

const routes: Routes = [
  { path: '', component: FlowsListComponent, pathMatch: 'full' },
  { path: 'templates', component: FlowTemplatesComponent },
  { path: 'editor', component: FlowEditorComponent },
  { path: 'editor/:id', component: FlowEditorComponent },
  { path: 'runs/:flowId', component: FlowRunsComponent },
  { path: 'diff/:id', component: FlowDiffComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FlowsRoutingModule {}
