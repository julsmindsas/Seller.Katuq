import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgentSessionComponent } from './components/agent-session/agent-session.component';

const routes: Routes = [
  {
    path: '',
    component: AgentSessionComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VideoAgentRoutingModule { }
