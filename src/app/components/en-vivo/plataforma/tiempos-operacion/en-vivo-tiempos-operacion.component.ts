import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { cifrasGlobal$, ocultar$, radarCongelado$ } from '../utilidades/fuentes';
import { armarTiempos, TramoTiempo, VistaTiempos } from '../utilidades/tiempos';

/**
 * Tiempos de la operación de hoy, "del pedido a la puerta": la mediana del ciclo completo con
 * mensajero propio (de la llegada a la entrega) y una barra con sus tres tramos (preparación,
 * espera para salir y entrega) donde el más largo es el más ancho; debajo, el comercio más rápido
 * (con al menos 3 entregas) y la entrega con transportadora.
 *
 * Las medianas las calcula el SERVIDOR con las horas que vio el observador (`radar.tiempos`); un
 * tramo sin hora registrada llega vacío y no cuenta. Con "ocultar comercios y montos", el más rápido
 * se nombra "Comercio en <ciudad>". Durante "Repetir el día" queda congelado.
 *
 * Solo lectura y sin acciones.
 */
@Component({
  selector: 'app-en-vivo-katuq-tiempos',
  templateUrl: './en-vivo-tiempos-operacion.component.html',
  styleUrls: ['./en-vivo-tiempos-operacion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoTiemposOperacionComponent {
  readonly vm$: Observable<VistaTiempos>;

  constructor(estado: EnVivoEstadoService, interaccion: EnVivoInteraccionService) {
    this.vm$ = combineLatest([radarCongelado$(estado, interaccion), cifrasGlobal$(estado), ocultar$(estado)]).pipe(
      map(([radar, cifras, ocultar]) => armarTiempos(radar?.tiempos, cifras?.comercios ?? [], ocultar))
    );
  }

  porClave(_: number, tramo: TramoTiempo): string {
    return tramo.clave;
  }
}
