import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoCanalesKatuqComponent } from './canales-katuq/en-vivo-canales-katuq.component';
import { EnVivoCarreraComponent } from './carrera/en-vivo-carrera.component';
import { EnVivoCintaComponent } from './cinta/en-vivo-cinta.component';
import { EnVivoCiudadesComponent } from './ciudades/en-vivo-ciudades.component';
import { EnVivoComercioDelMomentoComponent } from './comercio-del-momento/en-vivo-comercio-del-momento.component';
import { EnVivoLogrosComponent } from './logros/en-vivo-logros.component';
import { EnVivoMuroComponent } from './muro/en-vivo-muro.component';
import { EnVivoRadarAtencionComponent } from './radar-atencion/en-vivo-radar-atencion.component';
import { EnVivoTiemposOperacionComponent } from './tiempos-operacion/en-vivo-tiempos-operacion.component';

const PIEZAS = [
  EnVivoCanalesKatuqComponent,
  EnVivoCarreraComponent,
  EnVivoCintaComponent,
  EnVivoCiudadesComponent,
  EnVivoComercioDelMomentoComponent,
  EnVivoLogrosComponent,
  EnVivoMuroComponent,
  EnVivoRadarAtencionComponent,
  EnVivoTiemposOperacionComponent,
];

/**
 * Piezas de la vista "Toda Katuq" del tablero En vivo (D-386, tareas 4.8 y 4.9; solo sesiones de
 * Julsmind): la carrera de los comercios que más venden, la cinta de "Hoy en Katuq", las ciudades a
 * donde van los pedidos, el comercio del momento, los canales, el radar de atención, los tiempos de
 * la operación, los récords y el muro de comercios.
 *
 * Cada una lee del `EnVivoEstadoService` (cifras de toda Katuq, radar, eventos y la preferencia
 * "ocultar comercios y montos") y habla con la pantalla por `EnVivoInteraccionService.acciones$`.
 * Ninguna llama al servidor ni escribe nada. Se importa desde la página de toda Katuq, junto a
 * `EnVivoCompartidoModule` (el icono, el odómetro y la celebración que usa la página).
 */
@NgModule({
  imports: [CommonModule, EnVivoCompartidoModule],
  declarations: PIEZAS,
  exports: PIEZAS,
})
export class EnVivoPlataformaModule {}
