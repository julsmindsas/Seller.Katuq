import { EventEmitter, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map, scan, startWith } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { CifrasGlobalEnVivo, EventoEnVivo, RadarEnVivo } from '../../servicios/en-vivo.modelos';
import { Traductor } from '../../utilidades/traductor';
import { AperturaComercio } from './nombres';
import { RADAR_SIN_LEER, reducirRadarCongelado } from './radar';

/**
 * De dónde leen las piezas de toda Katuq: el `EnVivoEstadoService` (cifras, radar, eventos y la
 * preferencia "ocultar") y el `EnVivoInteraccionService` (repetición del día y acciones). Aquí
 * vive lo que usan varias a la vez, para que cada componente quede en pocas líneas.
 */

/** Traductor para las utilidades puras: el componente lo arma con su `TranslateService`. */
export function traductorDe(translate: TranslateService): Traductor {
  return (clave, params) => translate.instant(clave, params);
}

/**
 * Emite al arrancar y cada vez que cambia el idioma. Las piezas lo suman a su `combineLatest` para
 * que los textos armados en TypeScript se rearmen al cambiar de idioma.
 */
export function idioma$(translate: TranslateService): Observable<string> {
  return translate.onLangChange.pipe(
    map((evento) => evento.lang),
    startWith(translate.currentLang)
  );
}

/** Cifras de toda Katuq (null en la vista de un comercio o antes de la primera foto). */
export function cifrasGlobal$(estado: EnVivoEstadoService): Observable<CifrasGlobalEnVivo | null> {
  return estado.estado$.pipe(
    map((e) => e.cifrasGlobal),
    distinctUntilChanged()
  );
}

/** Eventos del más nuevo al más viejo. */
export function eventos$(estado: EnVivoEstadoService): Observable<ReadonlyArray<EventoEnVivo>> {
  return estado.estado$.pipe(
    map((e) => e.eventos),
    distinctUntilChanged()
  );
}

/** "Ocultar comercios y montos". */
export function ocultar$(estado: EnVivoEstadoService): Observable<boolean> {
  return estado.preferencias$.pipe(
    map((p) => p.ocultar),
    distinctUntilChanged()
  );
}

/**
 * El radar, congelado mientras se repite el día (spec `radar-en-vivo`, "Durante Repetir el día":
 * el radar no cambia hasta que termine la repetición). Lo usan el radar, los tiempos, los logros y
 * el muro (los anillos de alerta): los cuatro dejan de moverse a la vez.
 */
export function radarCongelado$(
  estado: EnVivoEstadoService,
  interaccion: EnVivoInteraccionService
): Observable<RadarEnVivo | null> {
  return combineLatest([
    estado.estado$.pipe(
      map((e) => e.radar),
      distinctUntilChanged()
    ),
    interaccion.repeticion$.pipe(
      map((r) => r.activa),
      distinctUntilChanged()
    ),
  ]).pipe(
    scan((previo, [radar, repitiendo]) => reducirRadarCongelado(previo, { radar, repitiendo }), RADAR_SIN_LEER),
    map((congelado) => congelado.radar),
    distinctUntilChanged()
  );
}

/** Emite la hora ahora y cada `ms` milisegundos. El temporizador corre fuera de la zona y solo entra a ella para emitir. */
export function relojCada(zona: NgZone, ms: number): Observable<number> {
  return new Observable<number>((suscriptor) => {
    suscriptor.next(Date.now());
    let id = 0;
    zona.runOutsideAngular(() => {
      id = window.setInterval(() => zona.run(() => suscriptor.next(Date.now())), ms);
    });
    return () => window.clearInterval(id);
  });
}

/**
 * "Ahora" de la pantalla: el reloj real o, mientras se repite el día, el instante simulado (igual
 * que el encabezado del shell).
 */
export function instanteVisible$(
  zona: NgZone,
  interaccion: EnVivoInteraccionService,
  ms: number
): Observable<number> {
  return combineLatest([relojCada(zona, ms), interaccion.repeticion$]).pipe(
    map(([reloj, repeticion]) => repeticion.instanteMs ?? reloj)
  );
}

/**
 * Avisa que se tocó un comercio: por `EnVivoInteraccionService.acciones$` (quien arma la página
 * escucha ahí y navega a `?empresa=`) y por el `@Output` del componente, para quien prefiera
 * enlazarlo en su plantilla. Basta escuchar UNO de los dos.
 */
export function avisarAperturaDeComercio(
  interaccion: EnVivoInteraccionService,
  salida: EventEmitter<AperturaComercio>,
  apertura: AperturaComercio
): void {
  interaccion.emitir(
    apertura.foco
      ? { tipo: 'abrir-comercio', empresa: apertura.empresa, nombre: apertura.nombre, foco: apertura.foco }
      : { tipo: 'abrir-comercio', empresa: apertura.empresa, nombre: apertura.nombre }
  );
  salida.emit(apertura);
}
