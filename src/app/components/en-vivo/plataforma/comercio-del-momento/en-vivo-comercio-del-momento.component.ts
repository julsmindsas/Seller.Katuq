import { ChangeDetectionStrategy, Component, EventEmitter, NgZone, Output } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { avisarAperturaDeComercio, cifrasGlobal$, eventos$, instanteVisible$, ocultar$ } from '../utilidades/fuentes';
import { comercioDelMomento, Momento } from '../utilidades/momento';
import { AperturaComercio } from '../utilidades/nombres';

/** Cada cuánto se vuelve a medir la ventana de 30 minutos aunque no llegue nada. */
const REFRESCO_MS = 30000;

/**
 * Comercio del momento: el que más pedidos recibió en los últimos 30 minutos, con su ciudad, los
 * pedidos y lo vendido en ese rato y la pastilla "En racha". Tocarlo abre su tablero.
 *
 * El servidor no manda las llegadas por comercio, así que se cuentan los eventos `pedido_nuevo` que
 * la pantalla ya tiene (`estado.eventos`: los de la foto, hasta 60, y los que llegan en vivo). Con
 * mucho movimiento puede quedarse corto: el número nunca es mayor que lo real. La ventana se
 * recalcula cada 30 s y, mientras se repite el día, usa el instante simulado.
 *
 * Con "ocultar comercios y montos": "Comercio en <ciudad>" y sin dinero.
 * Avisa por `acciones$` (`abrir-comercio`) y por `@Output() abrirComercio`; escuchar UNO basta.
 */
@Component({
  selector: 'app-en-vivo-katuq-momento',
  templateUrl: './en-vivo-comercio-del-momento.component.html',
  styleUrls: ['./en-vivo-comercio-del-momento.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoComercioDelMomentoComponent {
  @Output() abrirComercio = new EventEmitter<AperturaComercio>();

  /** `momento` es null mientras nadie haya vendido en la última media hora. */
  readonly vm$: Observable<{ momento: Momento | null }>;

  constructor(estado: EnVivoEstadoService, zona: NgZone, private readonly interaccion: EnVivoInteraccionService) {
    this.vm$ = combineLatest([
      cifrasGlobal$(estado),
      eventos$(estado),
      ocultar$(estado),
      instanteVisible$(zona, interaccion, REFRESCO_MS),
    ]).pipe(
      map(([cifras, eventos, ocultar, ahoraMs]) => ({
        momento: comercioDelMomento(cifras?.comercios ?? [], eventos, ahoraMs, ocultar),
      }))
    );
  }

  abrir(momento: Momento): void {
    avisarAperturaDeComercio(this.interaccion, this.abrirComercio, { empresa: momento.empresa, nombre: momento.nombreReal });
  }
}
