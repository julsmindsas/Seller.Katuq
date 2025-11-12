import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgentBuilderComponent } from './agent-builder.component';
import { WizardComponent } from './wizard/wizard.component';
import { LibraryComponent } from './library/library.component';
import { ExecutorComponent } from './executor/executor.component';

const routes: Routes = [
  {
    path: '',
    component: AgentBuilderComponent,
    children: [
      { path: '', redirectTo: 'library', pathMatch: 'full' },
      { path: 'library', component: LibraryComponent },
      { path: 'wizard', component: WizardComponent },
      { path: 'executor/:id', component: ExecutorComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AgentBuilderRoutingModule { }
