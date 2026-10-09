import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { armarCanales, FilaCanal, VistaCanales } from '../utilidades/canales';

/**
 * "De dónde llegan los pedidos" en toda Katuq: la mezcla de canales en una barra partida, una barra
 * por canal con sus pedidos y su porcentaje, y debajo lo que armó Opttia ("43 con Opttia · 12 % del
 * día"). Los conteos son los del servidor (`cifrasGlobal.porCanal` y `cifrasGlobal.opttia`).
 *
 * Solo cuenta pedidos (nunca dinero) y no lleva comercios ni clientes: la privacidad no le cambia
 * nada. No abre listas: en toda Katuq la foto no trae los pedidos.
 */
@Component({
  selector: 'app-en-vivo-katuq-canales',
  templateUrl: './en-vivo-canales-katuq.component.html',
  styleUrls: ['./en-vivo-canales-katuq.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoCanalesKatuqComponent {
  readonly vm$: Observable<VistaCanales>;

  constructor(estado: EnVivoEstadoService) {
    this.vm$ = estado.estado$.pipe(
      map((e) => e.cifrasGlobal),
      distinctUntilChanged(),
      map((cifras) => armarCanales(cifras?.porCanal, cifras?.opttia))
    );
  }

  porCanal(_: number, fila: FilaCanal): string {
    return fila.canal;
  }
}
