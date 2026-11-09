import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TEXTOS } from '../../plataforma.textos';
import { fechaCo, textoONulo, textoSiNo } from '../../logica/formato';

/** D-700 13.7a — Suscripción y pagos: contratado, cobrado, por cobrar, mora, facturas y pagos. */
@Component({
  selector: 'app-ficha-suscripcion-pagos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ficha-seccion [docId]="docId" nombre="suscripcion" [titulo]="textos.ficha.secciones.suscripcion">
      <ng-template let-d>
        <dl class="pl-datos pl-datos--clave">
          <div><dt>Plan</dt><dd>{{ nulo(d.plan) }}</dd></div>
          <div><dt>Último pago</dt><dd>{{ ultimoPago(d.ultimoPago) }}</dd></div>
          <div><dt>Próximo cobro</dt><dd>{{ d.proximoCobro | fechaCo:false }}</dd></div>
          <div><dt>En mora</dt><dd>{{ d.mora?.monto | cop }}</dd></div>
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
          <div><dt>Días de atraso (máximo)</dt><dd class="pl-num">{{ nulo(d.mora?.diasAtrasoMax) }}</dd></div>
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
          <li *ngFor="let p of d.pagos"><div>{{ p.fecha | fechaCo:false }} · {{ nulo(p.medio) }}</div><div class="pl-num">{{ p.monto | cop }} <small class="pl-muted">{{ nulo(p.transaccion) }}</small></div></li>
        </ul>
        <ng-template #sinPagos><p class="pl-muted">{{ textos.comercios.sinPagos }}</p></ng-template>
      </ng-template>
    </app-ficha-seccion>
  `,
})
export class FichaSuscripcionPagosComponent {
  @Input() docId = '';
  readonly textos = TEXTOS;
  nulo = textoONulo;
  si = textoSiNo;

  ultimoPago(u: { estado?: string; fecha?: string | null; monto?: number | null; medio?: string | null; transaccion?: string | null } | null | undefined): string {
    if (!u) return '—';
    if (u.estado === 'sin_pagos') return 'sin pagos';
    return `${u.fecha ? fechaCo(u.fecha, false) : '—'} · ${u.medio || '—'}${u.transaccion ? ' ' + u.transaccion : ''}`;
  }
}
