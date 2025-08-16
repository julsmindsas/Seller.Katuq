import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { LiveAudioComponent } from './live-audio.component';
import { Visual3dComponent } from '../visual3d/visual3d.component';
import { VisualComponent } from '../visual/visual.component';

const routes: Routes = [
  {
    path: '',
    component: LiveAudioComponent
  }
];

@NgModule({
  declarations: [
    LiveAudioComponent,
    Visual3dComponent,
    VisualComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class LiveAudioModule { }