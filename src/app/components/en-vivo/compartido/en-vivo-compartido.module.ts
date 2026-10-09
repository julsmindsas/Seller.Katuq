import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnVivoCelebracionComponent } from '../celebracion/en-vivo-celebracion.component';
import { EnVivoCifrasComponent } from '../cifras/en-vivo-cifras.component';
import { EnVivoEncabezadoComponent } from '../encabezado/en-vivo-encabezado.component';
import { EnVivoEtapasComponent } from '../etapas/en-vivo-etapas.component';
import { EnVivoEventosComponent } from '../eventos/en-vivo-eventos.component';
import { EnVivoFlotaComponent } from '../flota/en-vivo-flota.component';
import { EnVivoHeroeComponent } from '../heroe/en-vivo-heroe.component';
import { EnVivoIconoComponent } from '../icono/en-vivo-icono.component';
import { EnVivoOdometroComponent } from '../odometro/en-vivo-odometro.component';
import { EnVivoPulsoComponent } from '../pulso/en-vivo-pulso.component';
import { EnVivoRelojComponent } from '../reloj/en-vivo-reloj.component';
import { EnVivoVentasHoraComponent } from '../ventas-hora/en-vivo-ventas-hora.component';
import { EnVivoContarDirective } from './en-vivo-contar.directive';

const PIEZAS = [
  EnVivoCelebracionComponent,
  EnVivoCifrasComponent,
  EnVivoContarDirective,
  EnVivoEncabezadoComponent,
  EnVivoEtapasComponent,
  EnVivoEventosComponent,
  EnVivoFlotaComponent,
  EnVivoHeroeComponent,
  EnVivoIconoComponent,
  EnVivoOdometroComponent,
  EnVivoPulsoComponent,
  EnVivoRelojComponent,
  EnVivoVentasHoraComponent,
];

/**
 * Piezas de presentación del tablero "En vivo" (héroe, pulso, cifras, etapas, eventos, ventas por
 * hora, flota, encabezado, celebración, icono, odómetro, reloj y el conteo animado). Todas reciben
 * datos por `@Input` y avisan por `@Output`; ninguna llama al servidor. Las declara AQUÍ y las
 * exporta para que las usen el shell y los demás módulos de la pantalla (ficha, plataforma,
 * comercio) importando este módulo, sin duplicarlas.
 */
@NgModule({
  imports: [CommonModule],
  declarations: PIEZAS,
  exports: PIEZAS,
})
export class EnVivoCompartidoModule {}
