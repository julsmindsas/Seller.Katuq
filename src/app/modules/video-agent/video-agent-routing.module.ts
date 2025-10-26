import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AgentSessionComponent } from "./components/agent-session/agent-session.component";
import { AppointmentsListComponent } from "./components/appointments-list/appointments-list.component";

const routes: Routes = [
  {
    path: "",
    component: AgentSessionComponent,
  },
  {
    path: "appointments",
    component: AppointmentsListComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VideoAgentRoutingModule {}
