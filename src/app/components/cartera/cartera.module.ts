import { ModuloIaComponent } from '../../shared/components/modulo-ia/modulo-ia.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';

import { SharedModule } from '../../shared/shared.module';
import { CarteraRoutingModule } from './cartera-routing.module';

// Página
import { CarteraComponent } from './cartera/cartera.component';

// Tabs
import { CarteraClientesComponent } from './components/cartera-clientes/cartera-clientes.component';
import { CarteraAgingComponent } from './components/cartera-aging/cartera-aging.component';
import { CarteraVendedoresComponent } from './components/cartera-vendedores/cartera-vendedores.component';
import { CarteraEvolucionComponent } from './components/cartera-evolucion/cartera-evolucion.component';
import { CarteraMultiComponent } from './components/cartera-multi/cartera-multi.component';
import { CarteraFiltrosActivosComponent } from './components/cartera-filtros-activos/cartera-filtros-activos.component';
// Ticket 1463: acciones de cobro de la tarjeta del cliente y reporte «Cartera castigada»
import { CarteraAccionesComponent } from './components/cartera-acciones/cartera-acciones.component';
import { CarteraAccionModalComponent } from './components/cartera-acciones/cartera-accion-modal.component';
import { CarteraCastigadaComponent } from './components/cartera-castigada/cartera-castigada.component';

/**
 * Spec 014 — Finanzas MVP (CxC / Cartera). Módulo lazy del área de cartera.
 * Se registra con AuthGuard en shared/routes/routes.ts bajo el path "cartera".
 */
@NgModule({
  declarations: [
    CarteraComponent,
    CarteraClientesComponent,
    CarteraAgingComponent,
    CarteraVendedoresComponent,
    CarteraEvolucionComponent,
    CarteraMultiComponent,
    CarteraFiltrosActivosComponent,
    CarteraAccionesComponent,
    CarteraAccionModalComponent,
    CarteraCastigadaComponent,
  ],
  imports: [
    ModuloIaComponent,
    CommonModule,
    FormsModule,
    SharedModule,
    CarteraRoutingModule,
    TableModule,
  ],
})
export class CarteraModule {}
