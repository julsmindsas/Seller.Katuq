import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { Cifra, EstadoCarga, FiltrosTabla, Listado, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { filtrosIniciales } from '../../logica/consulta';
import { TEXTOS } from '../../plataforma.textos';

interface Tarjeta { rotulo: string; cifra: Cifra | null | undefined; nota?: string }

/**
 * D-700 14.6 — Cobros: las cifras de dinero del mismo universo del resumen (sale del `resumen` de la lista de
 * comercios, que usa el mismo reductor). Los pagos manuales van aparte y rotulados. Con exportación a CSV y PDF.
 */
@Component({
  selector: 'app-cobros',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card">
      <h2 class="cfg-card__titulo">{{ t.titulo }}</h2>
      <p class="pl-muted">{{ t.texto }}</p>
      <app-exportar-comercios [filtros]="filtros"></app-exportar-comercios>
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
      <ng-container *ngIf="r.datos as l">
        <p class="cfg-aviso" *ngIf="r.meta.parcial" role="status">{{ textos.parcial }}</p>
        <p class="cfg-aviso cfg-aviso--warn" *ngIf="dinero(l)?.disponible === false" role="status">{{ t.noDisponible }}</p>
        <section class="cfg-card" *ngIf="dinero(l) as d">
          <div class="cfg-stats">
            <div class="pl-cifra" *ngFor="let c of tarjetas(d)">
              <div class="pl-cifra__rotulo"><span class="pl-cifra__texto">{{ c.rotulo }}</span></div>
              <ng-container *ngIf="c.cifra | metrica as p">
                <div class="pl-cifra__valor" [class.pl-nulo]="p.nulo">{{ p.texto }}</div>
                <div *ngIf="p.insignia"><span class="pl-cifra__estado">{{ p.insignia }}</span></div>
              </ng-container>
            </div>
          </div>
          <div class="pl-kpi__pie">
            <small>{{ textos.universo }}: {{ r.meta.universo === 'comercios_reales' ? 'Comercios reales' : r.meta.universo }}</small>
            <small>{{ textos.corte }}: {{ r.meta.corte | fechaCo }}</small>
            <small>{{ textos.version }}: {{ r.meta.reglaVersion }}</small>
          </div>
        </section>
        <section class="cfg-card" *ngIf="dinero(l)?.mora as m">
          <h2 class="cfg-card__titulo">{{ t.listaMora }}</h2>
          <div class="cfg-vacio" *ngIf="!m.lista?.length"><h3 class="cfg-vacio__titulo">{{ t.sinMora }}</h3></div>
          <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="m.lista?.length">
            <table class="pl-tabla">
              <thead><tr><th scope="col">{{ textos.comercios.columnas['nombre'] }}</th><th scope="col">{{ t.factura }}</th><th scope="col">{{ t.vence }}</th><th scope="col" class="pl-der">{{ t.atraso }}</th><th scope="col" class="pl-der">{{ t.saldo }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let x of m.lista | slice:0:50; trackBy: trackMora">
                  <td><a class="pl-vinculo" [routerLink]="['/plataforma/comercios', x.docId]">{{ x.nomComercial || x.docId }}</a></td>
                  <td class="pl-id" [attr.title]="x.factura">{{ x.factura }}</td>
                  <td>{{ x.vence | fechaCo:false }}</td>
                  <td class="pl-der pl-num"><span class="pl-estado" [class.pl-estado--error]="x.diasAtraso > 30" [class.pl-estado--warn]="x.diasAtraso <= 30">{{ x.diasAtraso }}</span></td>
                  <td class="pl-der pl-num">{{ x.saldo | cop }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </ng-container>
    </ng-container>
  `,
})
export class CobrosComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.cobros;
  readonly filtros: FiltrosTabla = filtrosIniciales();
  estado: EstadoCarga<SobrePlataforma<Listado | null>> = estadoInicial();
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, public ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.recarga$.pipe(
      switchMap(() => conEstado(this.servicio.comercios({ ...this.filtros, tamano: 10 }))),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  /** El bloque de dinero del resumen (el mismo reductor de la tarjeta). */
  dinero(l: Listado): any {
    const d = (l.resumen as any)?.dinero;
    return d && typeof d === 'object' ? d : null;
  }

  tarjetas(d: any): Tarjeta[] {
    const mes = d.cobrado && d.cobrado.mes;
    return [
      { rotulo: this.t.cobradoMes, cifra: mes && mes.total },
      { rotulo: `${this.t.cobradoMes}: ${this.t.wompi}`, cifra: mes && mes.wompi },
      { rotulo: `${this.t.cobradoMes}: ${this.t.manual}`, cifra: mes && mes.manual },
      { rotulo: this.t.cobrado30d, cifra: d.cobrado && d.cobrado.ultimos30d && d.cobrado.ultimos30d.total },
      { rotulo: this.t.contratado, cifra: d.contratado && d.contratado.cop },
      { rotulo: this.t.porCobrar, cifra: d.porCobrar },
      { rotulo: this.t.mora, cifra: d.mora && d.mora.monto },
      { rotulo: this.t.brecha, cifra: d.brecha },
    ];
  }

  trackMora(_: number, x: { docId: string; factura: string }): string {
    return `${x.docId}|${x.factura}`;
  }
}
