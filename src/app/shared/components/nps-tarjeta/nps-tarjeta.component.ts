import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { EMPTY, Observable, Subject, defer, merge, timer } from 'rxjs';
import { catchError, concatMap, filter, takeUntil } from 'rxjs/operators';
import { EscalaNpsComponent } from '../escala-nps/escala-nps.component';
import { FeedbackService } from '../../services/feedback/feedback.service';
import { CodigoErrorNps, SegmentoNps, segmentoDeNota } from '../../services/feedback/feedback.models';
import { NovedadesService } from '../../services/novedades.service';
import { AuthService } from '../../services/firebase/auth.service';
import { esRutaPublica, rutaSinQuery } from '../../data/rutas-publicas';

type Paso = 'nota' | 'comentario' | 'gracias';

const PREGUNTA_COMENTARIO: Record<SegmentoNps, string> = {
  detractor: '¿Qué es lo primero que deberíamos arreglar?',
  pasivo: '¿Qué nos falta para que nos des un 10?',
  promotor: '¿Qué es lo que más te sirve de Katuq?',
};

/** Lo que dura el agradecimiento antes de irse solo. */
const GRACIAS_MS = 2600;

/**
 * Pregunta NPS a los comercios dentro del Seller (D-483). Tarjeta que no bloquea: abajo a
 * la derecha en escritorio y hoja inferior en celular, sin velo.
 *
 * Pide `/v1/nps/pendiente` una sola vez por carga de la app (y por usuario), en la primera
 * navegación a una pantalla interna con sesión, y nunca en la visita en que toca una
 * novedad. El servidor decide si al usuario le toca (cadencia, exclusiones, etapa).
 *
 * Las llamadas van en fila: si la persona cambia la nota y envía enseguida, el comentario
 * no se adelanta a la nota. Si algo falla, la tarjeta se va en silencio.
 */
@Component({
  selector: 'app-nps-tarjeta',
  standalone: true,
  imports: [CommonModule, FormsModule, EscalaNpsComponent],
  templateUrl: './nps-tarjeta.component.html',
  styleUrls: ['./nps-tarjeta.component.scss'],
})
export class NpsTarjetaComponent implements OnInit, OnDestroy {
  readonly MAX_COMENTARIO = 1000;

  paso: Paso | null = null;
  nota: number | null = null;
  comentario = '';

  private id: string | null = null;
  /** Usuario para el que ya se preguntó en esta carga de la app. */
  private evaluadaPara: string | null = null;
  /** Tras un error del servidor no se manda nada más de esta encuesta. */
  private detenida = false;
  private destroy$ = new Subject<void>();
  private cola = new Subject<Observable<unknown>>();
  private finGracias$ = new Subject<void>();

  constructor(
    private feedback: FeedbackService,
    private novedades: NovedadesService,
    private auth: AuthService,
    private router: Router,
  ) {}

  get preguntaComentario(): string {
    return this.nota === null ? '' : PREGUNTA_COMENTARIO[segmentoDeNota(this.nota)];
  }

  ngOnInit(): void {
    this.cola.pipe(concatMap((op$) => op$), takeUntil(this.destroy$)).subscribe();

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe((e) => this.alNavegar(e.urlAfterRedirects));

    // Si el router ya navegó antes de que naciera la tarjeta, se evalúa la ruta actual.
    if (this.router.navigated) this.alNavegar(this.router.url);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  escogerNota(n: number): void {
    if (!this.id || this.detenida || this.paso === 'gracias') return;
    this.nota = n;
    if (this.paso === 'nota') this.paso = 'comentario';
    this.encolar(this.feedback.responder(this.id, n, rutaSinQuery(this.router.url)), (e) => this.alFallar(e));
  }

  /** "Ahora no": pospone sin haber escogido nota. */
  ahoraNo(): void {
    if (this.id) this.encolar(this.feedback.posponer(this.id));
    this.ocultar();
  }

  enviar(): void {
    this.cerrarSegundoPaso(this.comentario.trim().slice(0, this.MAX_COMENTARIO));
  }

  /** La X: sin nota pospone; con nota cierra el segundo paso sin comentario. */
  cerrar(): void {
    if (this.paso === 'nota') this.ahoraNo();
    else if (this.paso === 'comentario') this.cerrarSegundoPaso('');
    else this.ocultar();
  }

  private cerrarSegundoPaso(texto: string): void {
    if (this.id && !this.detenida) this.encolar(this.feedback.comentar(this.id, texto || undefined));
    this.agradecer();
  }

  private alNavegar(url: string): void {
    if (!this.esRutaInterna(url) || !this.auth.isLoggedIn) {
      // Cerró sesión o salió a una página pública: la tarjeta se va sin posponer nada.
      if (this.paso) this.ocultar();
      return;
    }
    const usuario = this.usuarioActual();
    if (!usuario || this.evaluadaPara === usuario) return;
    this.evaluadaPara = usuario;

    // La visita en que toca una novedad es de la novedad.
    if (this.novedades.getPendiente()) return;

    this.feedback.pendiente().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        const id = r?.pregunta?.id;
        if (id && this.auth.isLoggedIn && this.esRutaInterna(this.router.url)) this.mostrar(id);
      },
      error: () => { /* sin tarjeta no se pierde nada */ },
    });
  }

  private mostrar(id: string): void {
    this.id = id;
    this.nota = null;
    this.comentario = '';
    this.detenida = false;
    this.paso = 'nota';
  }

  private agradecer(): void {
    this.paso = 'gracias';
    this.finGracias$.next();
    timer(GRACIAS_MS)
      .pipe(takeUntil(merge(this.destroy$, this.finGracias$)))
      .subscribe(() => this.ocultar());
  }

  private ocultar(): void {
    this.paso = null;
    this.finGracias$.next();
  }

  /** 409 YA_REGISTRADA: ya respondió (otra pestaña u otro equipo); se agradece. Lo demás, silencio. */
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

  /** Pantalla con menú: ni pública, ni la raíz que redirige, ni el 404. */
  private esRutaInterna(url: string): boolean {
    if (esRutaPublica(url) || rutaSinQuery(url) === '/') return false;
    let ruta = this.router.routerState.snapshot.root;
    while (ruta.firstChild) ruta = ruta.firstChild;
    return ruta.routeConfig?.path !== '**';
  }

  private usuarioActual(): string | null {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u ? String(u.email || u.uid || u.id || 'sesion') : null;
    } catch {
      return null;
    }
  }
}
