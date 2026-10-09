import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoAtencionAhoraComponent } from './atencion-ahora/en-vivo-atencion-ahora.component';
import { EnVivoFlotaHudComponent } from './flota-hud/en-vivo-flota-hud.component';
import { EnVivoLoProximoComponent } from './lo-proximo/en-vivo-lo-proximo.component';
import { EnVivoLogrosComercioComponent } from './logros-comercio/en-vivo-logros-comercio.component';
import { EnVivoProductosEstrellaComponent } from './productos-estrella/en-vivo-productos-estrella.component';
import { EnVivoTableroPedidosComponent } from './tablero-pedidos/en-vivo-tablero-pedidos.component';
import { EnVivoTiemposComercioComponent } from './tiempos-comercio/en-vivo-tiempos-comercio.component';

const PIEZAS = [
  EnVivoAtencionAhoraComponent,
  EnVivoFlotaHudComponent,
  EnVivoLoProximoComponent,
  EnVivoLogrosComercioComponent,
  EnVivoProductosEstrellaComponent,
  EnVivoTableroPedidosComponent,
  EnVivoTiemposComercioComponent,
];

/**
 * Centro de mando del comercio dentro de "En vivo" (D-386, tarea 4.11): "Lo próximo", "Atención
 * ahora", "Tu flota", el tablero "Pedidos", los tiempos frente a Katuq, los logros contra su récord
 * y los productos estrella. Cada pieza lee la foto del comercio de `EnVivoEstadoService` y, al
 * tocar un pedido o un mensajero, avisa por `EnVivoInteraccionService`; no recibe datos por
 * `@Input` ni llama al servidor. La página que las junta la arma quien importe este módulo.
 */
@NgModule({
  imports: [CommonModule, EnVivoCompartidoModule],
  declarations: PIEZAS,
  exports: PIEZAS,
})
export class EnVivoComercioModule {}
