import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { VoiceInteractionComponent } from './voice-interaction.component';
import { VoiceWebsocketService } from '../../../shared/services/voice-websocket.service';

@NgModule({
  declarations: [VoiceInteractionComponent],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [VoiceInteractionComponent],
  providers: [VoiceWebsocketService]
})
export class VoiceInteractionModule { }
