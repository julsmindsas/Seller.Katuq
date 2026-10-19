import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WelcomeComponent } from './welcome.component';
import { Negocio3dComponent } from './negocio-3d/negocio-3d.component';
import { RouterModule, Routes } from '@angular/router';
import { NpsInicioComponent } from '../shared/components/nps-inicio/nps-inicio.component';

const routes: Routes = [
  { path: '', component: WelcomeComponent }
];

@NgModule({
  declarations: [WelcomeComponent, Negocio3dComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    NpsInicioComponent,
  ]
})
export class WelcomeModule { }
