import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { EstadoOpttiaPlataforma, ResumenMensualRespuesta } from '../../plataforma.tipos';
import { ESPERA_RESUMEN_MS, textoErrorResumen, textoRestantes } from '../../logica/opttia-plataforma';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 25.4 — «Resumen del mes» del tablero: Opttia redacta a partir de cifras ya calculadas. Solo se dibuja si
 * `GET /me` dice `opttia.narrativa`. Todo se muestra como TEXTO PLANO (`pre-wrap`), sin HTML, Markdown ni enlaces.
 * El botón se deshabilita mientras corre la llamada; se corta a los 60 s. Los errores salen con texto fijo por código.
 */
@Component({
  selector: 'app-resumen-mensual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card pl-opttia" *ngIf="estado && estado.narrativa" [attr.aria-label]="t.titulo">
      <div class="pl-opttia__cabeza">
        <h2 class="cfg-card__titulo">{{ t.titulo }}</h2>
        <button type="button" class="cfg-btn" [disabled]="generando" (click)="generar()">{{ generando ? t.generando : t.boton }}</button>
      </div>
      <p class="pl-muted">{{ t.texto }}</p>

      <p class="cfg-aviso cfg-aviso--error" *ngIf="error" role="alert">{{ error }}</p>

      <div *ngIf="r as x" aria-live="polite">
        <p class="cfg-aviso cfg-aviso--warn" *ngIf="x.meta?.desactualizado" role="status">{{ t.desactualizado }}</p>
        <p class="cfg-aviso" *ngIf="x.meta?.parcial" role="status">{{ t.parcial }}</p>
        <div class="pl-opttia__texto">{{ x.resumen }}</div>
        <div class="pl-opttia__puntos" *ngIf="x.puntos?.length">
          <p class="pl-opttia__rotulo">{{ t.puntos }}</p>
          <dl class="pl-opttia__lista">
            <ng-container *ngFor="let p of x.puntos">
              <dt>{{ p.tema }}</dt>
              <dd>{{ p.frase }}</dd>
            </ng-container>
          </dl>
        </div>
        <p class="pl-muted" *ngIf="pie">{{ pie }}</p>
        <p class="pl-muted" *ngIf="x.fuente !== 'determinista'">{{ t.redactado }}</p>
        <p class="pl-muted" *ngIf="restantes" role="status">{{ restantes }}</p>
      </div>
    </section>
  `,
})
export class ResumenMensualComponent implements OnInit, OnDestroy {
  readonly t = TEXTOS.resumenMensual;
  estado: EstadoOpttiaPlataforma | null = null;
  r: ResumenMensualRespuesta | null = null;
  pie: string | null = null;
  restantes: string | null = null;
  error: string | null = null;
  generando = false;
  private suscripcion: Subscription | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.opttia().pipe(takeUntil(this.fin$)).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.fin$.next();
    this.fin$.complete();
  }

  generar(): void {
    if (this.generando || !this.estado || !this.estado.narrativa) return;
    this.generando = true;
    this.error = null;
    this.r = null;
    this.pie = null;
    this.restantes = null;
    this.suscripcion?.unsubscribe();
    this.suscripcion = this.servicio.resumenMensual(ESPERA_RESUMEN_MS).subscribe({
      next: (x) => {
        this.generando = false;
        if (!x || x.ok !== true || typeof x.resumen !== 'string' || !x.resumen.trim()) { this.error = this.t.errores['RESUMEN_NO_DISPONIBLE']; }
        else {
          this.r = x;
          const m = x.meta || {};
          this.pie = m.corte ? this.t.corte(String(m.corte), String(m.universo || '—'), String(m.reglaVersion || '—')) : null;
          this.restantes = textoRestantes(x.restantesDia, true);
        }
        this.cd.markForCheck();
      },
      error: (e) => {
        this.generando = false;
        this.error = e && e.name === 'TimeoutError' ? this.t.errorTiempo : textoErrorResumen(e && e.error && e.error.code, e && e.status);
        this.cd.markForCheck();
      },
    });
    this.cd.markForCheck();
  }
}
