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

/**
 * Spec 014 — Finanzas MVP (CxC / Cartera). Módulo lazy del área de cartera.
 * Se registra con AuthGuard en shared/routes/routes.ts bajo el path "cartera".
 */
@NgModule({
  declarations: [
    CarteraComponent,
    CarteraClientesComponent,
    CarteraAgingComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    CarteraRoutingModule,
    TableModule,
  ],
})
export class CarteraModule {}
