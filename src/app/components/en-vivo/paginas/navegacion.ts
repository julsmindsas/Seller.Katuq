import { Router } from '@angular/router';
import { TableroSolicitado } from '../ficha/ficha.modelos';
import { EnVivoFichaService } from '../ficha/ficha.service';

/**
 * De toda Katuq (o de la ficha) al tablero de un comercio: `/en-vivo?empresa=<empresa>`. Si había un
 * pedido abierto se anota para que la ficha del tablero nuevo lo abra (vale 30 s; anotarlo dos veces
 * es inocuo: la ficha ya lo anota al pedir "Ver el tablero").
 */
export function irAlTablero(router: Router, ficha: EnVivoFichaService, solicitud: TableroSolicitado): void {
  if (solicitud.pedidoId) ficha.dejarPedidoPendiente(solicitud.pedidoId, solicitud.empresa);
  void router.navigate(['/en-vivo'], { queryParams: { empresa: solicitud.empresa } });
}
