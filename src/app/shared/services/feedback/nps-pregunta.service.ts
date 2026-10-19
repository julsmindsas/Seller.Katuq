import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subject, defer, merge, timer } from 'rxjs';
import { catchError, concatMap, takeUntil } from 'rxjs/operators';
import { FeedbackService } from './feedback.service';
import { CodigoErrorNps, PresentacionNps, SegmentoNps, segmentoDeNota } from './feedback.models';

export type PasoNps = 'nota' | 'comentario' | 'gracias';

export interface EstadoPreguntaNps {
  id: string;
  presentacion: PresentacionNps;
  paso: PasoNps;
  nota: number | null;
}

export const PREGUNTA_COMENTARIO: Record<SegmentoNps, string> = {
  detractor: '¿Qué es lo primero que deberíamos arreglar?',
  pasivo: '¿Qué nos falta para que nos des un 10?',
  promotor: '¿Qué es lo que más te sirve de Katuq?',
};

/** Lo que dura el agradecimiento antes de irse solo. */
const GRACIAS_MS = 2600;

/**
 * La pregunta NPS de Katuq a un comercio (D-483, D-506), compartida por sus presentaciones:
 * la ventana y el botón flotante (`app-nps-tarjeta`) y la tarjeta de Inicio (`app-nps-inicio`).
 * Aquí viven el estado y las llamadas; los componentes solo dibujan.
 *
 * Pide `/v1/nps/pendiente` una sola vez por carga de la app y por usuario. El servidor decide
 * si le toca y cómo se presenta. Las llamadas van en fila: si la persona cambia la nota y envía
 * enseguida, el comentario no se adelanta a la nota. Si algo falla, la pregunta se va en silencio.
 */
@Injectable({ providedIn: 'root' })
export class NpsPreguntaService implements OnDestroy {
  readonly estado$ = new BehaviorSubject<EstadoPreguntaNps | null>(null);

  /** Usuario para el que ya se preguntó en esta carga de la app. */
  private evaluadaPara: string | null = null;
  /** Tras un error del servidor no se manda nada más de esta encuesta. */
  private detenida = false;
  private cola = new Subject<Observable<unknown>>();
  private finGracias$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private feedback: FeedbackService) {
    this.cola.pipe(concatMap((op$) => op$), takeUntil(this.destroy$)).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get estado(): EstadoPreguntaNps | null {
    return this.estado$.value;
  }

  preguntaComentario(nota: number | null): string {
    return nota === null ? '' : PREGUNTA_COMENTARIO[segmentoDeNota(nota)];
  }

  /**
   * Una sola vez por usuario y carga de la app. La visita en que toca una novedad es de la
   * novedad: cuenta como evaluada y no se pregunta.
   */
  evaluar(usuario: string, hayNovedad: boolean, puedeMostrar: () => boolean): void {
    if (this.evaluadaPara === usuario) return;
    this.evaluadaPara = usuario;
    if (hayNovedad) return;
    this.feedback.pendiente().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        const p = r?.pregunta;
        if (p?.id && puedeMostrar()) this.mostrar(p.id, p.presentacion === 'ventana' ? 'ventana' : 'tarjeta');
      },
      error: () => { /* sin pregunta no se pierde nada */ },
    });
  }

  escogerNota(n: number, pantalla: string): void {
    const e = this.estado;
    if (!e || this.detenida || e.paso === 'gracias') return;
    this.estado$.next({ ...e, nota: n, paso: 'comentario' });
    this.encolar(this.feedback.responder(e.id, n, pantalla), (error) => this.alFallar(error));
  }

  /** "Ahora no": pospone sin haber escogido nota. */
  ahoraNo(): void {
    const e = this.estado;
    if (e) this.encolar(this.feedback.posponer(e.id));
    this.ocultar();
  }

  /** Cierra el segundo paso, con o sin comentario. */
  enviar(comentario: string): void {
    const e = this.estado;
    if (e && !this.detenida) this.encolar(this.feedback.comentar(e.id, comentario.trim().slice(0, 1000) || undefined));
    this.agradecer();
  }

  /** La X: sin nota pospone; con nota cierra el segundo paso sin comentario. */
  cerrar(): void {
    const paso = this.estado?.paso;
    if (paso === 'nota') this.ahoraNo();
    else if (paso === 'comentario') this.enviar('');
    else this.ocultar();
  }

  /** Cerró sesión o salió a una página pública: se va sin posponer nada. */
  ocultar(): void {
    this.estado$.next(null);
    this.finGracias$.next();
  }

  private mostrar(id: string, presentacion: PresentacionNps): void {
    this.detenida = false;
    this.estado$.next({ id, presentacion, paso: 'nota', nota: null });
  }

  private agradecer(): void {
    const e = this.estado;
    if (!e) return;
    this.estado$.next({ ...e, paso: 'gracias' });
    this.finGracias$.next();
    timer(GRACIAS_MS)
      .pipe(takeUntil(merge(this.destroy$, this.finGracias$)))
      .subscribe(() => this.ocultar());
  }

  /** 409 YA_REGISTRADA: ya respondió (otra pestaña, otro equipo o el correo); se agradece. Lo demás, silencio. */
  private alFallar(error: any): void {
    if (this.detenida) return;
    this.detenida = true;
    const codigo: CodigoErrorNps | undefined = error?.error?.code;
    if (error?.status === 409 && codigo === 'YA_REGISTRADA') this.agradecer();
    else this.ocultar();
  }

  private encolar(op$: Observable<unknown>, alFallar?: (error: any) => void): void {
    this.cola.next(defer(() => (this.detenida ? EMPTY : op$)).pipe(
      catchError((e) => {
        alFallar?.(e);
        return EMPTY;
      }),
    ));
  }
}
