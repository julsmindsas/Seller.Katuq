import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { LineaNarracion, NarradorOpttia, PERIODO_NARRACION_MS, PRIMERA_LINEA_MS } from './opttia-narrador';
import { mascaraDe } from './opttia-reglas';

/**
 * Narración de Opttia sobre la escena (D-386, tarea 4.10, diseño 16): una línea que cambia cada
 * 9 segundos con lo notable del momento. Las líneas se arman con PLANTILLAS (`NarradorOpttia`),
 * nunca llamando al modelo; cuando no hay nada notable recorre los puntos del último resumen.
 *
 * Solo lectura: mira el estado de la pantalla y no escribe nada. Se calla durante "Repetir el
 * día", con la pestaña oculta y mientras el rol no tenga acceso. Con "ocultar" no escribe montos
 * ni nombres de comercios, y al activarlo quita al instante la línea que estuviera a la vista.
 *
 * Uso: quien la pinta (`<app-en-vivo-narracion>`) llama `iniciar()` al crearse y `detener()` al
 * destruirse (se cuentan los usos: con varias pantallas a la vez, el ciclo vive mientras quede una).
 */
@Injectable({ providedIn: 'root' })
export class EnVivoNarracionService implements OnDestroy {
  private readonly narrador = new NarradorOpttia();
  private readonly lineaSubject = new BehaviorSubject<LineaNarracion | null>(null);

  /** La línea que toca mostrar; null = nada (la barra se esconde). */
  readonly linea$: Observable<LineaNarracion | null> = this.lineaSubject.asObservable();

  private usos = 0;
  private suscripciones: Subscription | null = null;
  private pararCiclo: (() => void) | null = null;
  private temporizadorInicial = 0;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly zona: NgZone
  ) {}

  get linea(): LineaNarracion | null {
    return this.lineaSubject.value;
  }

  /** Enciende la narración (o suma un uso si ya está encendida). */
  iniciar(): void {
    this.usos++;
    if (this.suscripciones) return;

    const suscripciones = new Subscription();
    this.suscripciones = suscripciones;

    suscripciones.add(
      this.estado.estado$.subscribe((e) => {
        this.narrador.observar(e, this.estado.preferencias.ocultar, this.interaccion.repitiendo);
      })
    );
    suscripciones.add(
      this.estado.nuevos$.subscribe((evento) => {
        this.narrador.alEvento(evento, this.estado.estado, this.estado.preferencias.ocultar, this.interaccion.repitiendo);
      })
    );
    // Al activar "ocultar", lo que ya estaba armado (y a la vista) pudo traer montos o nombres: se descarta.
    suscripciones.add(
      this.estado.preferencias$
        .pipe(
          map((p) => p.ocultar),
          distinctUntilChanged()
        )
        .subscribe(() => {
          this.narrador.vaciarCola();
          this.publicar(null);
        })
    );
    // Al empezar "Repetir el día" la narración se calla y suelta lo que esperaba.
    suscripciones.add(
      this.interaccion.repeticion$
        .pipe(
          map((r) => r.activa),
          distinctUntilChanged()
        )
        .subscribe((activa) => {
          if (!activa) return;
          this.narrador.vaciarCola();
          this.publicar(null);
        })
    );

    this.zona.runOutsideAngular(() => {
      this.temporizadorInicial = window.setTimeout(() => {
        this.avanzar();
        this.pararCiclo = this.arrancarCiclo();
      }, PRIMERA_LINEA_MS);
    });
  }

  /** Quita un uso; al quedar en cero apaga el ciclo, suelta las suscripciones y limpia la línea. */
  detener(): void {
    this.usos = Math.max(0, this.usos - 1);
    if (this.usos > 0) return;

    window.clearTimeout(this.temporizadorInicial);
    this.pararCiclo?.();
    this.pararCiclo = null;
    this.suscripciones?.unsubscribe();
    this.suscripciones = null;
    this.narrador.reiniciar();
    this.publicar(null);
  }

  ngOnDestroy(): void {
    this.usos = 1;
    this.detener();
  }

  private arrancarCiclo(): () => void {
    const id = window.setInterval(() => this.avanzar(), PERIODO_NARRACION_MS);
    return () => window.clearInterval(id);
  }

  /** Un turno: muestra la línea que sigue, o nada si hay que callarse. Corre fuera de la zona. */
  private avanzar(): void {
    const e = this.estado.estado;
    const callar =
      this.interaccion.repitiendo ||
      (typeof document !== 'undefined' && document.hidden) ||
      !e.cargado ||
      e.disponible === false;
    if (callar) {
      if (this.lineaSubject.value !== null) this.zona.run(() => this.publicar(null));
      return;
    }
    const linea = this.narrador.siguiente(e.opttia, mascaraDe(e, this.estado.preferencias.ocultar));
    this.zona.run(() => this.publicar(linea));
  }

  private publicar(linea: LineaNarracion | null): void {
    this.lineaSubject.next(linea);
  }
}
