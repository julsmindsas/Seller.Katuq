import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { Definicion, EstadoCarga, Overview, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { formatearRatio } from '../../logica/formato';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 14.6 — Adopción: lo que tienen configurado los comercios activos y el panel de integraciones por proveedor.
 * Todo es «configurado», no «usado»: la adopción por uso de módulos (que manda el navegador) se rotulará «indicativa».
 */
@Component({
  selector: 'app-adopcion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card">
      <h2 class="cfg-card__titulo">{{ t.titulo }}</h2>
      <p class="cfg-aviso" role="note">{{ t.texto }}</p>
    </section>

    <div class="pl-rejilla" *ngIf="estado.cargando || estado.error">
      <app-kpi-seccion clave="adopcion" [cargando]="estado.cargando" [error]="estado.error" (reintentar)="ctx.recargar()"></app-kpi-seccion>
    </div>

    <ng-container *ngIf="estado.datos as r">
      <div class="cfg-vacio" *ngIf="!r.datos"><h3 class="cfg-vacio__titulo">{{ textos.sinCalcular }}</h3></div>
      <ng-container *ngIf="r.datos as d">
        <div class="pl-rejilla">
          <app-kpi-seccion clave="adopcion" [overview]="d" [meta]="r.meta" [definiciones]="definiciones"></app-kpi-seccion>
        </div>
        <section class="cfg-card" *ngIf="d.adopcionProveedores as p">
          <h2 class="cfg-card__titulo">{{ t.proveedores }}</h2>
          <p class="pl-muted">{{ textos.configurado }} · {{ t.conCenso(p.conCenso) }}</p>
          <p class="cfg-aviso" *ngIf="p.estado === 'parcial'" role="status">{{ textos.parcial }}</p>
          <div class="cfg-vacio" *ngIf="!p.lista.length">
            <div class="cfg-vacio__icono"><i class="pi pi-link" aria-hidden="true"></i></div>
            <h3 class="cfg-vacio__titulo">{{ t.vacioTitulo }}</h3>
            <p class="cfg-vacio__texto">{{ t.vacioTexto }}</p>
          </div>
          <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="p.lista.length">
            <table class="pl-tabla">
              <thead><tr><th scope="col">{{ t.proveedor }}</th><th scope="col" class="pl-der">{{ t.comercios }}</th><th scope="col" class="pl-der">{{ t.porcentaje }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let x of p.lista; trackBy: trackProveedor">
                  <td>{{ x.id }}</td><td class="pl-der pl-num">{{ x.comercios }}</td><td class="pl-der pl-num"><div class="pl-barra"><span class="pl-barra__pista" aria-hidden="true"><span class="pl-barra__relleno" [style.width.%]="ancho(x.porcentaje)"></span></span><span>{{ porcentaje(x.porcentaje) }}</span></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </ng-container>
    </ng-container>
  `,
})
export class AdopcionComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.adopcion;
  estado: EstadoCarga<SobrePlataforma<Overview | null>> = estadoInicial();
  definiciones: Definicion[] | null = null;
  porcentaje = formatearRatio;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, public ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    combineLatest([this.ctx.vista$, this.ctx.recarga$]).pipe(
      switchMap(([vista]) => conEstado(this.servicio.overview(vista))),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
    this.ctx.definiciones().pipe(takeUntil(this.fin$)).subscribe({
      next: (d) => { this.definiciones = d.metricas; this.cd.markForCheck(); },
      error: () => { /* el (i) dice que no hay definición publicada */ },
    });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  /** Ancho de la barra (0-100) sobre el 100 % de los comercios con censo; solo dibuja, no calcula cifras. */
  ancho(r: number | null | undefined): number {
    return typeof r === 'number' && Number.isFinite(r) ? Math.max(0, Math.min(100, r * 100)) : 0;
  }

  trackProveedor(_: number, x: { id: string }): string {
    return x.id;
  }
}
