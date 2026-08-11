import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { ProveedoresComponent } from './proveedores/proveedores.component';
import { ReposicionComponent } from './reposicion/reposicion.component';

/**
 * Compras — dominio propio, separado de Inventarios.
 *
 * Vive aparte por la misma razón que en el backend: al recibir mercancía,
 * compras escribe el costo del producto, y mezclarlo con inventario borronea la
 * frontera que el contrato protege.
 */
const routes: Routes = [
  { path: 'proveedores', component: ProveedoresComponent },
  { path: 'reposicion', component: ReposicionComponent },
];

@NgModule({
  declarations: [ProveedoresComponent, ReposicionComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class ComprasModule {}
