import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { VisorImagenModule } from '../../shared/components/visor-imagen/visor-imagen.module';
import { LiquidacionComponent } from './liquidacion/liquidacion.component';
import { MensajerosIndependientesRoutingModule } from './mensajeros-independientes-routing.module';
import { PestanasComponent } from './pestanas/pestanas.component';
import { SolicitudDetalleComponent } from './solicitud-detalle/solicitud-detalle.component';
import { SolicitudesListaComponent } from './solicitudes-lista/solicitudes-lista.component';

/**
 * Mensajeros independientes (los que se inscriben solos en la app de mensajeros): solicitudes y
 * liquidación de sus entregas. Pantallas solo para el Super Administrador de la operadora; se cargan
 * bajo demanda desde `routes.ts`.
 */
@NgModule({
  declarations: [SolicitudesListaComponent, SolicitudDetalleComponent, LiquidacionComponent, PestanasComponent],
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
