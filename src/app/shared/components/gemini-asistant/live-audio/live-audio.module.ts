import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Components
import { LiveAudioComponent } from './live-audio.component';
import { Visual3dComponent } from '../visual3d/visual3d.component';
import { VisualComponent } from '../visual/visual.component';

// Services
import { GeminiAudioService } from '../services/gemini-audio.service';
import { AudioProcessingService } from '../services/audio-processing.service';

@NgModule({
  declarations: [
    LiveAudioComponent,
    Visual3dComponent,
    VisualComponent
  ],
  imports: [
    CommonModule
  ],
  providers: [
    GeminiAudioService,
    AudioProcessingService
  ],
  exports: [
    LiveAudioComponent,
    Visual3dComponent,
    VisualComponent
  ]
})
export class LiveAudioModule { 

  /**
   * For easy integration in Katuq app:
   * 
   * 1. Install dependencies:
   *    npm install @google/genai three
   *    npm install --save-dev @types/three
   * 
   * 2. Add to your app.module.ts:
   *    import { LiveAudioModule } from './path/to/live-audio/live-audio.module';
   *    
   *    @NgModule({
   *      imports: [
   *        // ... other imports
   *        LiveAudioModule
   *      ]
   *    })
   * 
   * 3. Use in your template:
   *    <app-live-audio></app-live-audio>
   * 
   * 4. Configure environment:
   *    Add GEMINI_API_KEY to your environment files
   */
}