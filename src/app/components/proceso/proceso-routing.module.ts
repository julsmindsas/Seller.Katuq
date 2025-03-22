import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GenerosComponent } from './generos/generos.component';
import { CrearGenerosComponent } from './generos/crear-generos/crear-generos.component';
import { OcasionesComponent } from './ocasiones/ocasiones.component';
import { CrearOcasionesComponent } from './ocasiones/crear-ocasiones/crear-ocasiones.component';
import { VariablesComponent } from './variables/variables.component';
import { CrearVariablesComponent } from './variables/crear-variables/crear-variables.component';
const routes: Routes = [
  {
    path: 'generos',
    component: GenerosComponent
  },
  {
    path: 'ocasiones',
    component: OcasionesComponent
  },
  {
    path: 'generos/crear-generos',
    component: CrearGenerosComponent
  },
  {
    path: 'ocasiones/crear-ocasiones',
    component: CrearOcasionesComponent
  },
  {
    path: 'variables',
    component: VariablesComponent
  },
  {
    path: 'variables/crear-variables',
    component: CrearVariablesComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProcesoRoutingModule { }
