import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { BajasGrupo, EstadoCarga, Senales, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { formatearNumero, formatearRatio } from '../../logica/formato';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 26.4 (F2-11) — Señales: tendencia de salud contra el cierre de hace 30 días y bajas agrupadas por motivo. Todo lo calcula el
 * servidor (`GET /signals`); aquí solo se pinta. Lo que no se pudo comparar sale «sin dato», nunca 0. Solo informa.
 */
@Component({
  selector: 'app-senales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card">
      <h2 class="cfg-card__titulo">{{ t.titulo }}</h2>
      <p class="pl-muted">{{ t.texto }}</p>
    </section>

    <div class="pl-esqueleto" *ngIf="estado.cargando" role="status" [attr.aria-label]="textos.cargando"></div>
    <section class="cfg-card pl-error" *ngIf="!estado.cargando && estado.error">
      <p class="cfg-aviso cfg-aviso--error">{{ estado.error }}</p>
      <button type="button" class="cfg-btn cfg-btn--sec" (click)="ctx.recargar()">{{ textos.reintentar }}</button>
    </section>

    <ng-container *ngIf="estado.datos as r">
      <section class="cfg-card" *ngIf="!r.datos">
        <div class="cfg-vacio"><h3 class="cfg-vacio__titulo">{{ textos.sinCalcular }}</h3></div>
      </section>
      <ng-container *ngIf="r.datos as g">
        <section class="cfg-card">
          <h2 class="cfg-card__titulo">{{ t.tendenciaTitulo }}</h2>
          <p class="pl-muted">{{ t.tendenciaTexto(g.saludTendencia.fecha) }}</p>
          <p class="cfg-aviso" *ngIf="g.saludTendencia.estado === 'sin_dato'" role="status">{{ t.sinHistoria }}</p>
          <ng-container *ngIf="g.saludTendencia.estado !== 'sin_dato'">
            <p class="cfg-aviso" *ngIf="g.saludTendencia.estado === 'parcial'" role="status">{{ textos.parcial }}</p>
            <div class="cfg-stats">
              <div class="pl-cifra"><div class="pl-cifra__rotulo"><span class="pl-cifra__texto">{{ t.empeoran }}</span></div><div class="pl-cifra__valor">{{ numero(g.saludTendencia.empeoran) }}</div></div>
              <div class="pl-cifra"><div class="pl-cifra__rotulo"><span class="pl-cifra__texto">{{ t.mejoran }}</span></div><div class="pl-cifra__valor">{{ numero(g.saludTendencia.mejoran) }}</div></div>
              <div class="pl-cifra"><div class="pl-cifra__rotulo"><span class="pl-cifra__texto">{{ t.estables }}</span></div><div class="pl-cifra__valor">{{ numero(g.saludTendencia.estables) }}</div></div>
              <div class="pl-cifra"><div class="pl-cifra__rotulo"><span class="pl-cifra__texto">{{ t.sinDato }}</span></div><div class="pl-cifra__valor">{{ numero(g.saludTendencia.sinDato) }}</div></div>
            </div>
            <p class="pl-muted">{{ t.comparadas(g.saludTendencia.comparadas, g.saludTendencia.evaluadas) }}</p>
          </ng-container>
        </section>

        <section class="cfg-card">
          <h2 class="cfg-card__titulo">{{ t.bajasTitulo }}</h2>
          <p class="pl-muted">{{ t.bajasTexto }}</p>
          <div class="cfg-vacio" *ngIf="!g.bajas.vigentes.total">
            <div class="cfg-vacio__icono"><i class="pi pi-check-circle" aria-hidden="true"></i></div>
            <h3 class="cfg-vacio__titulo">{{ t.sinBajas }}</h3>
          </div>
          <ng-container *ngIf="g.bajas.vigentes.total">
            <ng-container *ngTemplateOutlet="grupo; context: { titulo: t.vigentes, g: g.bajas.vigentes }"></ng-container>
            <ng-container *ngTemplateOutlet="grupo; context: { titulo: t.delMes, g: g.bajas.mes }"></ng-container>
          </ng-container>
        </section>

        <p class="cfg-aviso" role="note" *ngIf="!g.integracionesSinUso.disponible">{{ textos.adopcion.integracionesSinUso }}</p>
      </ng-container>
    </ng-container>

    <ng-template #grupo let-titulo="titulo" let-g="g">
      <h3 class="pl-subtitulo">{{ titulo }} · {{ g.total }}</h3>
      <p class="pl-muted" *ngIf="g.sinMotivo > 0">{{ t.sinMotivo(g.sinMotivo) }}</p>
      <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="g.porMotivo.length">
        <table class="pl-tabla">
          <thead><tr><th scope="col">{{ t.motivo }}</th><th scope="col" class="pl-der">{{ t.cantidad }}</th><th scope="col" class="pl-der">{{ t.porcentaje }}</th></tr></thead>
          <tbody>
            <tr *ngFor="let m of g.porMotivo; trackBy: trackMotivo">
              <td>{{ t.motivos[m.motivo] || m.motivo }}</td>
              <td class="pl-der pl-num">{{ m.cantidad }}</td>
              <td class="pl-der pl-num"><div class="pl-barra"><span class="pl-barra__pista" aria-hidden="true"><span class="pl-barra__relleno" [style.width.%]="ancho(m.porcentaje)"></span></span><span>{{ porcentaje(m.porcentaje) }}</span></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </ng-template>
  `,
})
export class SenalesComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.senales;
  estado: EstadoCarga<SobrePlataforma<Senales | null>> = estadoInicial();
  numero = formatearNumero;
  porcentaje = formatearRatio;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, public ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.recarga$.pipe(
      switchMap(() => conEstado(this.servicio.senales())),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  /** Ancho de la barra (0-100); solo dibuja, no calcula cifras. */
  ancho(r: number | null | undefined): number {
    return typeof r === 'number' && Number.isFinite(r) ? Math.max(0, Math.min(100, r * 100)) : 0;
  }

  trackMotivo(_: number, m: BajasGrupo['porMotivo'][number]): string {
    return m.motivo;
  }
}
