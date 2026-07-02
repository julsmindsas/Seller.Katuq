import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

// PrimeNG
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';

import { SharedModule } from '../../shared/shared.module';
import { TesoreriaRoutingModule } from './tesoreria-routing.module';

// Página
import { GestionPagosComponent } from './gestion-pagos/gestion-pagos.component';

// Sub-componentes
import { TablaPagosPedidosComponent } from './components/tabla-pagos-pedidos/tabla-pagos-pedidos.component';
import { HistorialPagosComponent } from './components/historial-pagos/historial-pagos.component';
import { AlertasTesoreriaComponent } from './components/alertas-tesoreria/alertas-tesoreria.component';

// Modales
import { RevisarPagoComponent } from './components/revisar-pago/revisar-pago.component';
import { RegistrarPagoComponent } from './components/registrar-pago/registrar-pago.component';
import { CambiarEstadoPagoComponent } from './components/cambiar-estado-pago/cambiar-estado-pago.component';

/**
 * Spec 013 — Tesorería MVP. Módulo lazy del área de tesorería.
 * Se registra con AuthGuard en shared/routes/routes.ts bajo el path "tesoreria".
 */
@NgModule({
  declarations: [
    GestionPagosComponent,
    TablaPagosPedidosComponent,
    HistorialPagosComponent,
    AlertasTesoreriaComponent,
    RevisarPagoComponent,
    RegistrarPagoComponent,
    CambiarEstadoPagoComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    TesoreriaRoutingModule,
    TableModule,
    TabViewModule,
    AngularFireStorageModule,
  ],
})
export class TesoreriaModule {}
