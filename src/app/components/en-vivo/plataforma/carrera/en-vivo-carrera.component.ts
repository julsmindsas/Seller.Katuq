import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { scan } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { CARRERA_VACIA, EstadoCarrera, FilaCarrera, reducirCarrera, TOP_CARRERA } from '../utilidades/carrera';
import { avisarAperturaDeComercio, cifrasGlobal$, ocultar$ } from '../utilidades/fuentes';
import { AperturaComercio } from '../utilidades/nombres';

/**
 * La carrera de hoy: los 8 comercios que más venden, cada uno en su fila con una barra contra el
 * líder. Las filas se colocan con `transform` y, cuando un comercio adelanta a otro, la fila sube
 * con animación y muestra "▲ N". Tocar una fila abre el tablero de ese comercio (solo lectura).
 *
 * Lee `cifrasGlobal.comercios` del `EnVivoEstadoService` (el servidor ya los manda con sus ventas
 * y pedidos de hoy) y la preferencia "ocultar comercios y montos": con ella, los nombres pasan a
 * "Comercio en <ciudad>", el orden y las barras son por pedidos y no sale dinero.
 *
 * Accesible: cada fila es un botón con su texto ("1. Café Altamira: 12 pedidos. Abrir su tablero"),
 * se opera con teclado y, con "reducir movimiento", las filas saltan sin animación y la marca "▲ N"
 * queda fija en vez de aparecer y desvanecerse.
 *
 * Avisa por `acciones$` (`abrir-comercio`) y por `@Output() abrirComercio`; escuchar UNO basta.
 */
@Component({
  selector: 'app-en-vivo-katuq-carrera',
  templateUrl: './en-vivo-carrera.component.html',
  styleUrls: ['./en-vivo-carrera.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoCarreraComponent {
  /** Filas más bajas, para el panel que flota sobre la escena. */
  @Input() compacta = false;
  @Output() abrirComercio = new EventEmitter<AperturaComercio>();

  readonly top = TOP_CARRERA;
  readonly vm$: Observable<EstadoCarrera>;

  constructor(estado: EnVivoEstadoService, private readonly interaccion: EnVivoInteraccionService) {
    this.vm$ = combineLatest([cifrasGlobal$(estado), ocultar$(estado)]).pipe(
      scan(
        (previo: EstadoCarrera, [cifras, ocultar]) => reducirCarrera(previo, { comercios: cifras?.comercios ?? [], ocultar }),
        CARRERA_VACIA
      )
    );
  }

  abrir(fila: FilaCarrera): void {
    avisarAperturaDeComercio(this.interaccion, this.abrirComercio, { empresa: fila.empresa, nombre: fila.nombreReal });
  }

  porEmpresa(_: number, fila: FilaCarrera): string {
    return fila.empresa;
  }
}
