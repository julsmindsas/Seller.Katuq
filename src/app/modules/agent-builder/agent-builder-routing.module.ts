import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgentBuilderComponent } from './agent-builder.component';
import { GeneralChatComponent } from './general-chat/general-chat.component';
import { GeneralChatProComponent } from './general-chat-pro/general-chat-pro.component';
import { WizardComponent } from './wizard/wizard.component';
import { LibraryComponent } from './library/library.component';

import { A2aMonitorComponent } from './monitoring/a2a-monitor.component';

const routes: Routes = [
  {
    path: '',
    component: AgentBuilderComponent,
    children: [
      { path: '', redirectTo: 'general-chat', pathMatch: 'full' },
      { path: 'general-chat', component: GeneralChatComponent },
      { path: 'chat-pro', component: GeneralChatProComponent },
      { path: 'library', component: LibraryComponent },
      { path: 'wizard', component: WizardComponent },

      { path: 'monitor', component: A2aMonitorComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AgentBuilderRoutingModule { }
