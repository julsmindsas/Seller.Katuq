import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

// PrimeNG
import { ButtonModule } from "primeng/button";
import { DropdownModule } from "primeng/dropdown";
import { SidebarModule } from "primeng/sidebar";
import { TooltipModule } from "primeng/tooltip";
import { ProgressSpinnerModule } from "primeng/progressspinner";

// Routing
import { VideoAgentRoutingModule } from "./video-agent-routing.module";

// Components
import { AgentSessionComponent } from "./components/agent-session/agent-session.component";
import { AgentResultComponent } from "./components/agent-result/agent-result.component";
import { AudioPulseComponent } from "./components/audio-pulse/audio-pulse.component";

// Services are providedIn: 'root', so no need to provide them here

@NgModule({
  declarations: [
    AgentSessionComponent,
    AgentResultComponent,
    AudioPulseComponent,
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
  ],
})
export class VideoAgentModule {}
