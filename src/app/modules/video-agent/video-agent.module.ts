import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

// PrimeNG
import { ButtonModule } from "primeng/button";
import { DropdownModule } from "primeng/dropdown";
import { SidebarModule } from "primeng/sidebar";
import { TooltipModule } from "primeng/tooltip";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { InputTextModule } from "primeng/inputtext";

// Routing
import { VideoAgentRoutingModule } from "./video-agent-routing.module";

// Components
import { AgentSessionComponent } from "./components/agent-session/agent-session.component";
import { AgentResultComponent } from "./components/agent-result/agent-result.component";
import { AudioPulseComponent } from "./components/audio-pulse/audio-pulse.component";
import { AppointmentsListComponent } from "./components/appointments-list/appointments-list.component";

// Services are providedIn: 'root', so no need to provide them here

@NgModule({
  declarations: [
    AgentSessionComponent,
    AgentResultComponent,
    AudioPulseComponent,
    AppointmentsListComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    VideoAgentRoutingModule,
    // PrimeNG
    ButtonModule,
    DropdownModule,
    SidebarModule,
    TooltipModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
    InputTextModule,
  ],
})
export class VideoAgentModule {}
