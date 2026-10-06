import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CentroOperacionesComponent } from './centro-operaciones.component';

/**
 * Centro de operaciones 3D (D-354). Módulo propio y diferido: three y la escena
 * bajan solo al entrar a la pantalla.
 */
@NgModule({
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: CentroOperacionesComponent }])],
  declarations: [CentroOperacionesComponent],
})
export class CentroOperacionesModule {}
