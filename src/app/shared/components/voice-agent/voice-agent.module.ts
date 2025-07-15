import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceAgentComponent } from './voice-agent.component';
import { VoiceAgentService } from '../../services/voice-agent.service';

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
    VoiceAgentService
  ]
})
export class VoiceAgentModule { } 