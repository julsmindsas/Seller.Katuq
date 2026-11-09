import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { EstadoCarga, PagosPorPersona, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 26.4 (F2-11) — Auditoría de pagos manuales del mes por persona. Solo se pide si el servidor dice que esta persona lee la
 * auditoría (`esLectorAuditoria`); el servidor vuelve a decidirlo en cada petición. Ni motivos ni empresas: cantidades y montos.
 */
@Component({
  selector: 'app-pagos-persona',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card" *ngIf="lector">
      <h2 class="cfg-card__titulo">{{ t.pagosPersonaTitulo }}</h2>
      <p class="pl-muted">{{ t.pagosPersonaTexto }}</p>
      <div class="pl-esqueleto" *ngIf="estado.cargando" role="status" [attr.aria-label]="textos.cargando"></div>
      <div class="pl-error" *ngIf="!estado.cargando && estado.error">
        <p class="cfg-aviso cfg-aviso--error">{{ estado.error }}</p>
        <button type="button" class="cfg-btn cfg-btn--sec" (click)="cargar$.next()">{{ textos.reintentar }}</button>
      </div>
      <ng-container *ngIf="estado.datos?.datos as d">
        <p class="pl-muted">{{ t.mes }}: {{ d.mes }}</p>
        <p class="cfg-aviso" *ngIf="d.estado === 'parcial'" role="status">{{ d.motivo || textos.parcial }}</p>
        <div class="cfg-vacio" *ngIf="!d.personas.length">
          <h3 class="cfg-vacio__titulo">{{ t.sinPagos }}</h3>
        </div>
        <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="d.personas.length">
          <table class="pl-tabla">
            <thead><tr>
              <th scope="col">{{ t.persona }}</th><th scope="col" class="pl-der">{{ t.pagos }}</th><th scope="col" class="pl-der">{{ t.montoPagos }}</th>
              <th scope="col" class="pl-der">{{ t.atipicos }}</th><th scope="col" class="pl-der">{{ t.anulaciones }}</th><th scope="col" class="pl-der">{{ t.propias }}</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let p of d.personas; trackBy: trackPersona">
                <td class="pl-id" [attr.title]="p.porId">{{ p.porId }}</td>
                <td class="pl-der pl-num">{{ p.pagos.cantidad }}</td><td class="pl-der pl-num">{{ p.pagos.montoCOP | cop }}</td>
                <td class="pl-der pl-num">{{ p.pagos.atipicos }}</td><td class="pl-der pl-num">{{ p.anulaciones.cantidad }}</td><td class="pl-der pl-num">{{ p.anulaciones.propias }}</td>
              </tr>
              <tr>
                <th scope="row">{{ t.totalMes }}</th>
                <td class="pl-der pl-num">{{ d.total.pagos }}</td><td class="pl-der pl-num">{{ d.total.montoCOP | cop }}</td>
                <td class="pl-der pl-num">{{ d.total.atipicos }}</td><td class="pl-der pl-num">{{ d.total.anulaciones }}</td><td class="pl-der pl-num">{{ d.total.anulacionesPropias }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </section>
  `,
})
export class PagosPersonaComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.cobros;
  lector = false;
  estado: EstadoCarga<SobrePlataforma<PagosPorPersona>> = estadoInicial();
  readonly cargar$ = new Subject<void>();
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar$.pipe(
      switchMap(() => conEstado(this.servicio.pagosPorPersona())),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
    this.ctx.esLectorAuditoria().pipe(takeUntil(this.fin$)).subscribe((v) => {
      this.lector = v;
      this.cd.markForCheck();
      if (v) this.cargar$.next();
    });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  trackPersona(_: number, p: { porId: string }): string {
    return p.porId;
  }
}
