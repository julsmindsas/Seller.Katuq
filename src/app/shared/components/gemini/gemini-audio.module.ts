import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPulseComponent } from './audio-pulse/audio-pulse.component';

/**
 * Módulo compartido para componentes de audio de Gemini Live API
 */
@NgModule({
  declarations: [
    AudioPulseComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AudioPulseComponent
  ]
})
export class GeminiAudioModule { }
