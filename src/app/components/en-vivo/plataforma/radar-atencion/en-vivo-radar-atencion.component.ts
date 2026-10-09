import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { scan } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { avisarAperturaDeComercio, cifrasGlobal$, ocultar$, radarCongelado$ } from '../utilidades/fuentes';
import { AperturaComercio } from '../utilidades/nombres';
import { AlertaVista, armarRadar, VistaRadar } from '../utilidades/radar';

interface EstadoRadar {
  vista: VistaRadar | null;
}

/**
 * Radar de atención ("Quién necesita a Katuq ahora"): los comercios que piden ayuda o están en
 * racha, del más grave al menos grave. Cada alerta dice qué pasó, lo que "Opttia sugiere" y trae
 * "Ver su tablero" y, si hay pedidos listos esperando, "Ver los pedidos".
 *
 * Las alertas, los umbrales (silencio raro, atascados, rechazos, una sola racha) y las sugerencias
 * los calcula el SERVIDOR (`radar.alertas`, cada 30 s): aquí solo se rotulan. Con "ocultar comercios
 * y montos" el comercio se nombra "Comercio en <ciudad>".
 *
 * Durante "Repetir el día" el radar queda congelado (`interaccion.repeticion$`) hasta que termina.
 *
 * Los botones avisan por `acciones$` (`abrir-comercio`; "Ver los pedidos" con `foco: 'atascados'`)
 * y por `@Output() abrirComercio`; escuchar UNO basta.
 */
@Component({
  selector: 'app-en-vivo-katuq-radar',
  templateUrl: './en-vivo-radar-atencion.component.html',
  styleUrls: ['./en-vivo-radar-atencion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoRadarAtencionComponent {
  @Output() abrirComercio = new EventEmitter<AperturaComercio>();

  readonly vm$: Observable<EstadoRadar>;

  constructor(estado: EnVivoEstadoService, private readonly interaccion: EnVivoInteraccionService) {
    this.vm$ = combineLatest([radarCongelado$(estado, interaccion), cifrasGlobal$(estado), ocultar$(estado)]).pipe(
      scan(
        (previo: EstadoRadar, [radar, cifras, ocultar]): EstadoRadar => ({
          // Las que no estaban en la lectura anterior entran resaltadas; la primera lectura no marca ninguna.
          vista: armarRadar(radar, cifras?.comercios ?? [], ocultar, previo.vista ? previo.vista.claves : null),
        }),
        { vista: null }
      )
    );
  }

  verTablero(alerta: AlertaVista): void {
    if (alerta.empresa) {
      avisarAperturaDeComercio(this.interaccion, this.abrirComercio, { empresa: alerta.empresa, nombre: alerta.nombreReal });
    }
  }

  verPedidos(alerta: AlertaVista): void {
    if (alerta.empresa) {
      avisarAperturaDeComercio(this.interaccion, this.abrirComercio, {
        empresa: alerta.empresa,
        nombre: alerta.nombreReal,
        foco: 'atascados',
      });
    }
  }

  porClave(_: number, alerta: AlertaVista): string {
    return alerta.clave;
  }
}
