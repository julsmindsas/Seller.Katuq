import { NgModule } from '@angular/core';
import { NpsRoutingModule } from './nps-routing.module';

/**
 * Módulo lazy "NPS" (D-490): Resultados, Encuestas y Seguimiento. Sus piezas son
 * standalone (cada una importa lo que usa), así que aquí solo van las rutas.
 */
@NgModule({
  imports: [NpsRoutingModule],
})
export class NpsModule {}
