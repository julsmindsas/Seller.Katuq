import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { VisorImagenModule } from '../../shared/components/visor-imagen/visor-imagen.module';
import { MensajerosIndependientesRoutingModule } from './mensajeros-independientes-routing.module';
import { SolicitudDetalleComponent } from './solicitud-detalle/solicitud-detalle.component';
import { SolicitudesListaComponent } from './solicitudes-lista/solicitudes-lista.component';

/**
 * Solicitudes de mensajeros independientes (los que se inscriben solos en la app de mensajeros).
 * Pantalla solo para el Super Administrador de la operadora; se carga bajo demanda desde `routes.ts`.
 */
@NgModule({
  declarations: [SolicitudesListaComponent, SolicitudDetalleComponent],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    TableModule,
    VisorImagenModule,
    MensajerosIndependientesRoutingModule,
  ],
})
export class MensajerosIndependientesModule {}
