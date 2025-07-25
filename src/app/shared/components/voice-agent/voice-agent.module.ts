import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceAgentComponent } from './voice-agent.component';
import { VoiceAgentService } from '../../services/voice-agent.service';
import { AvatarCanvasService } from '../../services/avatar-canvas.service';

@NgModule({
  declarations: [
    VoiceAgentComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    VoiceAgentComponent
  ],
  providers: [
    VoiceAgentService,
    AvatarCanvasService
  ]
})
export class VoiceAgentModule { } 