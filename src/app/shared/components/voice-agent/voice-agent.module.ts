import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { VoiceAgentComponent } from './voice-agent.component';
import { VoiceAgentService } from '../../services/voice-agent.service';
import { AvatarCanvasService } from '../../services/avatar-canvas.service';

@NgModule({
  declarations: [
    VoiceAgentComponent
  ],
  imports: [
    CommonModule,
    TranslateModule
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