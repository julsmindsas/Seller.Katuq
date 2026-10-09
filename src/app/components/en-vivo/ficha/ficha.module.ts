import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoFichaComponent } from './ficha.component';
import { EnVivoFichaFilasComponent } from './filas/ficha-filas.component';
import { EnVivoFichaListaComponent } from './ficha-lista/ficha-lista.component';
import { EnVivoFichaMensajeroComponent } from './ficha-mensajero/ficha-mensajero.component';
import { EnVivoFichaPedidoComponent } from './ficha-pedido/ficha-pedido.component';

/**
 * Ficha de "En vivo" (D-386, tarea 4.7): la ficha lateral de un pedido, de una lista y de un
 * mensajero, y su servicio (`EnVivoFichaService`, que es `providedIn: 'root'`). Quien la integre
 * (el shell, la vista de toda Katuq, el tablero del comercio) importa este módulo y pone
 * `<app-en-vivo-ficha>` dentro del recuadro de la escena.
 *
 * Reusa los iconos de `EnVivoCompartidoModule`. No llama a `HttpClient`: el detalle del pedido va por
 * `EnVivoService` (BaseService), así que el interceptor pone la sesión.
 */
@NgModule({
  imports: [CommonModule, EnVivoCompartidoModule],
  declarations: [
    EnVivoFichaComponent,
    EnVivoFichaPedidoComponent,
    EnVivoFichaListaComponent,
    EnVivoFichaMensajeroComponent,
    EnVivoFichaFilasComponent,
  ],
  exports: [EnVivoFichaComponent],
})
export class EnVivoFichaModule {}
