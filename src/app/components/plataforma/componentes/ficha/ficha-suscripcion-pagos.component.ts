import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { FichaSeccionComponent } from './ficha-seccion.component';
import { TEXTOS } from '../../plataforma.textos';
import { fechaCo, textoONulo, textoSiNo } from '../../logica/formato';

/** D-700 13.7a — Suscripción y pagos: contratado, cobrado, por cobrar, mora, facturas y pagos. D-700 18.8: los pagos manuales se rotulan «manual» y el operador abre la ventana de pagos manuales. */
@Component({
  selector: 'app-ficha-suscripcion-pagos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ['.pl-acciones-ficha { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--ds-line-soft); }'],
  template: `
    <app-ficha-seccion [docId]="docId" nombre="suscripcion" [titulo]="textos.ficha.secciones.suscripcion">
      <ng-template let-d>
        <dl class="pl-datos pl-datos--clave">
          <div><dt>Plan</dt><dd>{{ nulo(d.plan) }}</dd></div>
          <div><dt>Último pago</dt><dd>{{ ultimoPago(d.ultimoPago) }}</dd></div>
          <div><dt>Próximo cobro</dt><dd>{{ d.proximoCobro | fechaCo:false }}</dd></div>
          <div><dt>En mora</dt><dd class="pl-num">{{ d.mora?.monto | cop }} <small class="pl-muted" *ngIf="d.mora?.diasAtrasoMax">({{ d.mora.diasAtrasoMax }} días de atraso)</small></dd></div>
        </dl>
        <dl class="pl-datos">
          <div><dt>Modo de cobro</dt><dd>{{ nulo(d.modoCobro) }}</dd></div>
          <div><dt>Periodo</dt><dd>{{ nulo(d.periodo) }}</dd></div>
          <div><dt>Escalón</dt><dd>{{ nulo(d.escalon) }}</dd></div>
          <div><dt>Contratado (estimado, mes)</dt><dd class="pl-num">{{ d.contratado?.copMes | cop }}</dd></div>
          <div><dt>Última factura</dt><dd>{{ d.ultimaFactura ? d.ultimaFactura.estado + ' · vence ' + (d.ultimaFactura.vencimiento | fechaCo:false) : '—' }}</dd></div>
          <div><dt>Cobrado del mes</dt><dd class="pl-num">{{ d.cobrado?.mes?.total | cop }}</dd></div>
          <div><dt>Cobrado del mes anterior</dt><dd class="pl-num">{{ d.cobrado?.mesAnterior?.total | cop }}</dd></div>
          <div><dt>Por cobrar</dt><dd class="pl-num">{{ d.porCobrar?.monto | cop }}</dd></div>
          <div><dt>Por revisar</dt><dd>{{ nulo(d.porRevisar?.cantidad) }}</dd></div>
          <div><dt>TRM usada</dt><dd>{{ d.trm ? (d.trm.valor | number:'1.0-2') + ' (' + (d.trm.fecha | fechaCo:false) + ')' : '—' }}</dd></div>
        </dl>

        <h3 class="pl-subtitulo">Facturas</h3>
        <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="d.facturas?.length; else sinFacturas">
          <table class="pl-tabla">
            <thead><tr><th scope="col">Factura</th><th scope="col">Estado</th><th scope="col">Vence</th><th scope="col">Pagada</th><th scope="col" class="pl-der">Monto</th><th scope="col">Saldada a mano</th></tr></thead>
            <tbody>
              <tr *ngFor="let f of d.facturas">
                <td class="pl-id" [attr.title]="f.id">{{ nulo(f.id) }}</td><td><span class="pl-estado">{{ nulo(f.estado) }}</span></td><td>{{ f.vence | fechaCo:false }}</td><td>{{ f.pagadaEn | fechaCo:false }}</td>
                <td class="pl-der pl-num">{{ f.monto | cop }}</td><td>{{ si(f.saldadaManualmente) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #sinFacturas><p class="pl-muted">Sin facturas.</p></ng-template>

        <h3 class="pl-subtitulo">Pagos aprobados</h3>
        <ul class="pl-lista" *ngIf="d.pagos?.length; else sinPagos">
          <li *ngFor="let p of d.pagos"><div>{{ p.fecha | fechaCo:false }} · {{ nulo(p.medio) }} <small class="pl-muted" *ngIf="p.origen === 'manual'">({{ textos.pagoManual.etqManual }})</small></div><div class="pl-num">{{ p.monto | cop }} <small class="pl-muted">{{ nulo(p.transaccion) }}</small></div></li>
        </ul>
        <ng-template #sinPagos><p class="pl-muted">{{ textos.comercios.sinPagos }}</p></ng-template>
        <div class="pl-acciones-ficha" *ngIf="esOperador">
          <button type="button" class="cfg-btn cfg-btn--sec" (click)="dialogo = true">{{ textos.pagoManual.boton }}</button>
        </div>
      </ng-template>
    </app-ficha-seccion>
    <app-pago-manual-dialog *ngIf="dialogo" [docId]="docId" [nombre]="nombre || docId" (cerrado)="alCerrar($event)"></app-pago-manual-dialog>
  `,
})
export class FichaSuscripcionPagosComponent implements OnInit, OnDestroy {
  @Input() docId = '';
  @Input() nombre = '';
  /** Se registró o anuló un pago: quien aloja la ficha la vuelve a cargar y muestra el mensaje. */
  @Output() actualizado = new EventEmitter<string>();
  @ViewChild(FichaSeccionComponent) seccion?: FichaSeccionComponent;
  esOperador = false;
  dialogo = false;
  private fin$ = new Subject<void>();

  constructor(private ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.esOperador().pipe(takeUntil(this.fin$)).subscribe((v) => { this.esOperador = v; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  alCerrar(r: { cambio: boolean; mensaje: string | null }): void {
    this.dialogo = false;
    this.cd.markForCheck();
    if (r && r.cambio) {
      if (this.seccion) this.seccion.reintentar();
      if (r.mensaje) this.actualizado.emit(r.mensaje);
    }
  }

  readonly textos = TEXTOS;
  nulo = textoONulo;
  si = textoSiNo;

  ultimoPago(u: { estado?: string; fecha?: string | null; monto?: number | null; medio?: string | null; transaccion?: string | null } | null | undefined): string {
    if (!u) return '—';
    if (u.estado === 'sin_pagos') return 'sin pagos';
    return `${u.fecha ? fechaCo(u.fecha, false) : '—'} · ${u.medio || '—'}${u.transaccion ? ' ' + u.transaccion : ''}`;
  }
}
