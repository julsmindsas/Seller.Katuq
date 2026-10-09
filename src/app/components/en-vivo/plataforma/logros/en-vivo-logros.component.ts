import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { RadarEnVivo } from '../../servicios/en-vivo.modelos';
import { cifrasGlobal$, ocultar$, radarCongelado$ } from '../utilidades/fuentes';
import { armarLogros, cruzoElRecord, LogroVista, TEXTO_RECORD_KATUQ, vaAlRecord, VistaLogros } from '../utilidades/logros';

/** Hito que se guarda como "ya celebrado hoy" (el estado lo separa por vista: el de Katuq no se mezcla con el de un comercio). */
const HITO_RECORD = 'record-dia';

/**
 * "Récords y proyección" de hoy: hacia dónde va el día ("Si el ritmo sigue, hoy cierra en $X"), el
 * récord de pedidos de los últimos 90 días con su fecha, la mejor hora de hoy, lo que Opttia ayudó a
 * vender y el ritmo récord (pedidos por minuto en 5 minutos).
 *
 * La proyección y el récord los calcula el SERVIDOR (`radar.proyeccion`, `radar.record`); el resto
 * son las cifras de toda Katuq. Con "ocultar comercios y montos" el dinero se vuelve conteos.
 * Durante "Repetir el día" la proyección y el récord quedan congelados.
 *
 * Celebración: cuando la proyección de pedidos pasa el récord, avisa UNA vez por día por
 * `@Output() celebrar` con "¡Katuq va camino a su récord de pedidos!" (nunca al cargar: solo si
 * antes se sabía que NO iba al récord; y nunca durante "Repetir el día"). Quien arma la página lo
 * enlaza al `app-en-vivo-celebracion` (`celebrar(texto)`).
 */
@Component({
  selector: 'app-en-vivo-katuq-logros',
  templateUrl: './en-vivo-logros.component.html',
  styleUrls: ['./en-vivo-logros.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoLogrosComponent implements OnInit, OnDestroy {
  /** Texto del hito del récord, una sola vez por día. */
  @Output() celebrar = new EventEmitter<string>();

  readonly vm$: Observable<VistaLogros>;

  private readonly suscripciones = new Subscription();
  /** Lo último que se supo de "¿la proyección pasa el récord?" (null = aún no se sabe). */
  private ultimoVaAlRecord: boolean | null = null;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService
  ) {
    this.vm$ = combineLatest([radarCongelado$(estado, interaccion), cifrasGlobal$(estado), ocultar$(estado)]).pipe(
      map(([radar, cifras, ocultar]) => armarLogros(radar, cifras, ocultar))
    );
  }

  ngOnInit(): void {
    this.suscripciones.add(radarCongelado$(this.estado, this.interaccion).subscribe((radar) => this.vigilarRecord(radar)));
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  porClave(_: number, logro: LogroVista): string {
    return logro.clave;
  }

  private vigilarRecord(radar: RadarEnVivo | null): void {
    const actual = vaAlRecord(radar);
    const cruzo = cruzoElRecord(this.ultimoVaAlRecord, actual);
    if (actual !== null) this.ultimoVaAlRecord = actual;
    // El radar congelado no cambia durante la repetición, así que aquí nunca llega un cruce falso.
    if (cruzo && !this.interaccion.repitiendo && this.estado.marcarCelebrado(HITO_RECORD)) {
      this.celebrar.emit(TEXTO_RECORD_KATUQ);
    }
  }
}
