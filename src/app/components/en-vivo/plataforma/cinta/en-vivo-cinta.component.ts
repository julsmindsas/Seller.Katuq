import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { armarCinta, duracionCinta, ItemCinta } from '../utilidades/cinta';
import { avisarAperturaDeComercio, cifrasGlobal$, ocultar$ } from '../utilidades/fuentes';
import { AperturaComercio } from '../utilidades/nombres';

interface VistaCinta {
  items: ItemCinta[];
  /** Segundos por vuelta. */
  duracion: number;
}

/**
 * "Hoy en Katuq": la cinta con todos los comercios, sus pedidos, sus ventas y la variación contra
 * ayer a esta hora (▲ / ▼). Corre sola de derecha a izquierda; se detiene con el puntero encima o
 * con el foco dentro, y con "reducir movimiento" no se mueve: queda como una fila que se desplaza
 * con el dedo. Tocar un comercio abre su tablero.
 *
 * Lee `cifrasGlobal.comercios` del `EnVivoEstadoService` y la preferencia "ocultar comercios y
 * montos" (nombres → "Comercio en <ciudad>", dinero y variación fuera).
 *
 * La cinta lleva cada comercio dos veces para que la vuelta no tenga salto; la segunda copia queda
 * oculta a los lectores de pantalla y fuera del orden de tabulación.
 *
 * Avisa por `acciones$` (`abrir-comercio`) y por `@Output() abrirComercio`; escuchar UNO basta.
 */
@Component({
  selector: 'app-en-vivo-katuq-cinta',
  templateUrl: './en-vivo-cinta.component.html',
  styleUrls: ['./en-vivo-cinta.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoCintaComponent {
  @Output() abrirComercio = new EventEmitter<AperturaComercio>();

  /** Las dos copias de la vuelta (la segunda es solo visual). */
  readonly copias: ReadonlyArray<number> = [0, 1];
  readonly vm$: Observable<VistaCinta>;

  constructor(estado: EnVivoEstadoService, private readonly interaccion: EnVivoInteraccionService) {
    this.vm$ = combineLatest([cifrasGlobal$(estado), ocultar$(estado)]).pipe(
      map(([cifras, ocultar]) => {
        const items = armarCinta(cifras?.comercios ?? [], ocultar);
        return { items, duracion: duracionCinta(items.length) };
      })
    );
  }

  abrir(item: ItemCinta): void {
    avisarAperturaDeComercio(this.interaccion, this.abrirComercio, { empresa: item.empresa, nombre: item.nombreReal });
  }

  porEmpresa(_: number, item: ItemCinta): string {
    return item.empresa;
  }
}
