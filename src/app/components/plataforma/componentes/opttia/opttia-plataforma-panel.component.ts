import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OpttiaPlataformaService } from '../../servicios/opttia-plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { EstadoOpttiaPlataforma } from '../../plataforma.tipos';
import { comercioValido, EventoPanel, hayComercio, limpiarPregunta, MAX_PREGUNTA, textoRestantes } from '../../logica/opttia-plataforma';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 23.5 — Panel de preguntas a Opttia de plataforma. Solo existe si `GET /me` dice `opttia.autorizado`; si no,
 * ni se dibuja ni llama a nada. La respuesta es TEXTO PLANO (`white-space: pre-wrap`): nada de HTML, Markdown ni
 * enlaces. Sin historial: cada pregunta es independiente. Con `companyDocId` la pregunta queda fijada a ese comercio.
 */
@Component({
  selector: 'app-opttia-plataforma-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="estado && estado.autorizado">
      <section class="cfg-card pl-opttia" [attr.aria-label]="titulo">
        <div class="pl-opttia__cabeza">
          <h2 class="cfg-card__titulo">{{ titulo }}</h2>
          <button type="button" class="cfg-btn cfg-btn--sec" *ngIf="cerrable" (click)="cerrar()">{{ t.botonCerrar }}</button>
        </div>

        <p class="cfg-aviso cfg-aviso--error" *ngIf="comercioInvalido" role="alert">{{ t.errorComercio }}</p>

        <ng-container *ngIf="!comercioInvalido">
          <p class="pl-muted">{{ companyDocId ? t.ayudaComercio : t.ayuda }}</p>
          <label class="pl-opttia__campo">
            <span class="pl-opttia__rotulo">{{ t.etiqueta }}</span>
            <textarea rows="3" [attr.maxlength]="max" [attr.placeholder]="t.marcador" [disabled]="enviando"
              [value]="pregunta" (input)="alEscribir($any($event.target).value)" (keydown.control.enter)="enviar()"></textarea>
          </label>
          <div class="pl-opttia__pie">
            <p class="pl-muted">{{ t.contador(pregunta.length, max) }}</p>
            <div class="cfg-acciones">
              <button type="button" class="cfg-btn cfg-btn--sec" *ngIf="enviando" (click)="cancelar()">{{ t.cancelar }}</button>
              <button type="button" class="cfg-btn" [disabled]="enviando || !puedeEnviar" (click)="enviar()">{{ enviando ? t.respondiendo : t.enviar }}</button>
            </div>
          </div>

          <p class="cfg-aviso cfg-aviso--error" *ngIf="error" role="alert">{{ error }}</p>

          <div class="pl-opttia__respuesta" *ngIf="respuesta" aria-live="polite">
            <p class="pl-opttia__rotulo">{{ t.respuesta }}</p>
            <div class="pl-opttia__texto">{{ respuesta }}</div>
          </div>
          <div class="cfg-vacio" *ngIf="!respuesta && !error && !enviando">
            <div class="cfg-vacio__icono"><i class="pi pi-comments" aria-hidden="true"></i></div>
            <p class="cfg-vacio__texto">{{ t.vacio }}</p>
          </div>
          <p class="pl-muted" *ngIf="restantes" role="status">{{ restantes }}</p>
        </ng-container>
      </section>
    </ng-container>
  `,
})
export class OpttiaPlataformaPanelComponent implements OnInit, OnDestroy {
  /** Comercio al que se limita la pregunta (id de la ficha). Vacío = pregunta general de plataforma. */
  @Input() companyDocId: string | null = null;
  /** Nombre solo para el título. */
  @Input() nombreComercio: string | null = null;
  @Input() cerrable = false;
  @Output() cerrado = new EventEmitter<void>();

  readonly t = TEXTOS.opttia;
  readonly max = MAX_PREGUNTA;
  estado: EstadoOpttiaPlataforma | null = null;
  pregunta = '';
  respuesta = '';
  error: string | null = null;
  restantes: string | null = null;
  enviando = false;
  private suscripcion: Subscription | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: OpttiaPlataformaService, private ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  get titulo(): string {
    return this.companyDocId ? this.t.tituloComercio : this.t.titulo;
  }

  /** Se pidió un comercio y su id no sirve: no se pregunta (no se degrada a pregunta general). */
  get comercioInvalido(): boolean {
    return hayComercio(this.companyDocId) && !comercioValido(this.companyDocId);
  }

  get puedeEnviar(): boolean {
    return limpiarPregunta(this.pregunta).length > 0;
  }

  ngOnInit(): void {
    this.ctx.opttia().pipe(takeUntil(this.fin$)).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.fin$.next();
    this.fin$.complete();
  }

  alEscribir(valor: string): void {
    this.pregunta = String(valor || '').slice(0, MAX_PREGUNTA);
    this.cd.markForCheck();
  }

  enviar(): void {
    if (this.enviando || this.comercioInvalido || !this.estado || !this.estado.autorizado) return;
    const texto = limpiarPregunta(this.pregunta);
    if (!texto) return;
    this.enviando = true;
    this.respuesta = '';
    this.error = null;
    this.restantes = null;
    this.suscripcion?.unsubscribe();
    this.suscripcion = this.servicio.preguntar(texto, this.companyDocId).subscribe({
      next: (ev) => this.alEvento(ev),
      error: () => this.terminar(this.t.errorGeneral),
      complete: () => this.terminar(null),
    });
    this.cd.markForCheck();
  }

  cancelar(): void {
    if (!this.enviando) return;
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.enviando = false;
    this.error = this.t.cancelada;
    this.cd.markForCheck();
  }

  cerrar(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.enviando = false;
    this.cerrado.emit();
  }

  private alEvento(ev: EventoPanel): void {
    if (ev.tipo === 'texto') this.respuesta += ev.delta;
    else if (ev.tipo === 'acceso') this.restantes = textoRestantes(ev.restantesDia);
    else if (ev.tipo === 'error') { this.error = ev.mensaje; this.respuesta = ''; }
    this.cd.markForCheck();
  }

  private terminar(error: string | null): void {
    this.enviando = false;
    this.suscripcion = null;
    if (error) this.error = error;
    else if (!this.respuesta && !this.error) this.error = this.t.sinRespuesta;
    this.cd.markForCheck();
  }
}
