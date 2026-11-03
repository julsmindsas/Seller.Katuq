import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { PaymentAuditEvent, PaymentAuditSummary } from '../../../../shared/services/treasury/treasury.models';

/** Lo que se pinta de cada evento: ícono, tono, frase y detalles. */
export interface EventoVista {
  hora: string;
  icono: string;
  tono: 'ok' | 'err' | 'warn' | 'info' | 'neutro';
  titulo: string;
  lineas: string[];
  motivo: string;
  pago: string;
}

const TONO_POR_TIPO: Record<string, { icono: string; tono: EventoVista['tono'] }> = {
  subido: { icono: 'pi-upload', tono: 'info' },
  aprobado: { icono: 'pi-check-circle', tono: 'ok' },
  rechazado: { icono: 'pi-times-circle', tono: 'err' },
  anulado: { icono: 'pi-undo', tono: 'warn' },
  editado: { icono: 'pi-pencil', tono: 'warn' },
  edicion_bloqueada: { icono: 'pi-lock', tono: 'err' },
  estado_pedido: { icono: 'pi-sync', tono: 'neutro' },
  estado_pedido_bloqueado: { icono: 'pi-lock', tono: 'neutro' },
  alerta: { icono: 'pi-exclamation-triangle', tono: 'warn' },
  nota: { icono: 'pi-info-circle', tono: 'neutro' },
};

/**
 * Ticket 1455 (D-665) — Línea de tiempo de un pago (`paymentId`) o de todos los pagos de un pedido (`orderId`):
 * quién lo subió, quién lo aprobó, rechazó o anuló (con motivo), qué cambió después y cuándo. Solo lee
 * (`GET /v1/treasury/payments/:id/audit` y `/orders/:orderId/payments-audit`, roles de Tesorería).
 */
@Component({
  selector: 'app-linea-tiempo-pago',
  templateUrl: './linea-tiempo-pago.component.html',
  styleUrls: ['./linea-tiempo-pago.component.scss'],
})
export class LineaTiempoPagoComponent implements OnChanges, OnDestroy {
  @Input() paymentId = '';
  @Input() orderId = '';

  cargando = false;
  error = false;
  eventos: EventoVista[] = [];
  total = 0;
  cargados = 0;
  private page = 0;
  private pagos = new Map<string, PaymentAuditSummary>();
  private destroy$ = new Subject<void>();
  private peticion$ = new Subject<void>();

  constructor(private treasury: TreasuryService, private translate: TranslateService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paymentId'] || changes['orderId']) {
      this.reiniciar();
      this.cargarSiguiente();
    }
  }

  ngOnDestroy(): void {
    this.peticion$.next();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hayMas(): boolean {
    return this.cargados < this.total;
  }

  private reiniciar(): void {
    this.peticion$.next();
    this.eventos = [];
    this.total = 0;
    this.cargados = 0;
    this.page = 0;
    this.error = false;
    this.pagos.clear();
  }

  cargarSiguiente(): void {
    if (this.cargando || (!this.paymentId && !this.orderId)) return;
    this.cargando = true;
    this.error = false;
    const pagina = this.page + 1;
    const llamada = this.paymentId
      ? this.treasury.getPaymentAudit(this.paymentId, pagina)
      : this.treasury.getOrderPaymentsAudit(this.orderId, pagina);
    llamada.pipe(takeUntil(this.peticion$), takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.cargando = false;
        this.page = pagina;
        if (res?.pago) this.pagos.set(res.pago.paymentId, res.pago);
        for (const p of res?.pagos || []) this.pagos.set(p.paymentId, p);
        const nuevos = res?.eventos || [];
        this.eventos = [...this.eventos, ...nuevos.map((e) => this.aVista(e))];
        this.cargados += nuevos.length;
        this.total = res?.total || 0;
      },
      error: () => {
        this.cargando = false;
        this.error = true;
      },
    });
  }

  private moneda(valor: any): string {
    const n = Number(valor);
    if (!isFinite(n)) return String(valor ?? '');
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  private nombreCampo(campo: string): string {
    const clave = `tesoreria.lineaTiempo.campo.${campo}`;
    const t = this.translate.instant(clave);
    return t === clave ? campo : t;
  }

  private nombreCanal(canal: string): string {
    if (!canal) return '';
    const clave = `tesoreria.lineaTiempo.canal.${canal}`;
    const t = this.translate.instant(clave);
    return t === clave ? canal : t;
  }

  private valorDeCampo(campo: string, v: any): string {
    if (v === '' || v === null || v === undefined) return this.translate.instant('tesoreria.lineaTiempo.vacio');
    return campo === 'valor' ? this.moneda(v) : String(v);
  }

  private t(clave: string, params?: any): string {
    return this.translate.instant(`tesoreria.lineaTiempo.${clave}`, params);
  }

  /** El texto guardado ya trae el nombre del motivo de la lista y su detalle («Nombre: detalle»). */
  private etiquetaMotivo(e: PaymentAuditEvent): string {
    return e.motivo || '';
  }

  private aVista(e: PaymentAuditEvent): EventoVista {
    const estilo = TONO_POR_TIPO[e.tipo] || TONO_POR_TIPO['nota'];
    const quien = e.quien || this.t('sistema');
    const rol = e.rol ? ` (${e.rol})` : '';
    const lineas: string[] = [];
    let titulo = '';
    let motivo = '';
    switch (e.tipo) {
      case 'subido': {
        titulo = this.t('evento.subido', { quien: quien + rol });
        const d = e.despues || {};
        if (d.valor !== undefined && d.valor !== null) lineas.push(`${this.t('valor')}: ${this.moneda(d.valor)}${d.formaPago ? ' · ' + d.formaPago : ''}`);
        if (d.referencia) lineas.push(`${this.t('referencia')}: ${d.referencia}`);
        if (e.canal) lineas.push(this.t('desde', { canal: this.nombreCanal(e.canal) }));
        break;
      }
      case 'aprobado':
        titulo = this.t('evento.aprobado', { quien });
        break;
      case 'rechazado':
        titulo = this.t('evento.rechazado', { quien });
        motivo = this.etiquetaMotivo(e);
        break;
      case 'anulado':
        titulo = this.t('evento.anulado', { quien });
        motivo = e.motivo || '';
        break;
      case 'editado': {
        const campo = e.despues?.campo || e.antes?.campo || '';
        titulo = this.t('evento.editado', { quien, campo: this.nombreCampo(campo) });
        lineas.push(`${this.valorDeCampo(campo, e.antes?.valor)} → ${this.valorDeCampo(campo, e.despues?.valor)}`);
        if (e.canal) lineas.push(this.t('desde', { canal: this.nombreCanal(e.canal) }));
        break;
      }
      case 'edicion_bloqueada': {
        const campo = e.despues?.campo || e.antes?.campo || '';
        titulo = this.t('evento.edicionBloqueada', { quien, campo: this.nombreCampo(campo) });
        lineas.push(this.t('seQuedoEn', { valor: this.valorDeCampo(campo, e.antes?.valor) }) + ' · ' + this.t('intento', { valor: this.valorDeCampo(campo, e.despues?.valor) }));
        break;
      }
      case 'estado_pedido':
        titulo = this.t('evento.estadoPedido', { antes: e.antes ?? '—', despues: e.despues ?? '—' });
        if (e.quien) lineas.push(this.t('por', { quien: e.quien }));
        break;
      case 'estado_pedido_bloqueado':
        titulo = this.t('evento.estadoPedidoBloqueado', { despues: e.despues ?? '—' });
        if (e.quien) lineas.push(this.t('por', { quien: e.quien }));
        break;
      default:
        titulo = this.t('evento.nota');
        if (e.detalle) lineas.push(e.detalle);
        break;
    }
    if (e.tipo === 'alerta') {
      titulo = this.t('evento.alerta');
      if (e.detalle) lineas.push(e.detalle);
    }
    let pago = '';
    if (this.orderId && e.paymentId) {
      const p = this.pagos.get(e.paymentId);
      pago = p ? `${this.moneda(p.valor)} · ${p.formaPago || ''}${p.referencia ? ' · ' + p.referencia : ''}` : '';
    }
    return { hora: e.hora, icono: estilo.icono, tono: estilo.tono, titulo, lineas, motivo, pago };
  }
}

/**
 * Modal con la línea de tiempo de un pago o de un pedido (ticket 1455). Se abre con `abrirHistorialPago`.
 */
@Component({
  selector: 'app-historial-pago-modal',
  template: `
    <div class="modal-header">
      <h5 class="modal-title"><i class="pi pi-history"></i>{{ 'tesoreria.lineaTiempo.titulo' | translate }}</h5>
      <button type="button" class="btn-close" [attr.aria-label]="'comun.cerrar' | translate" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <app-linea-tiempo-pago [paymentId]="paymentId" [orderId]="orderId"></app-linea-tiempo-pago>
    </div>
    <div class="modal-footer">
      <button type="button" class="cfg-btn cfg-btn--sec" (click)="activeModal.dismiss()">{{ 'comun.cerrar' | translate }}</button>
    </div>
  `,
  styleUrls: ['./linea-tiempo-pago.component.scss'],
})
export class HistorialPagoModalComponent {
  @Input() paymentId = '';
  @Input() orderId = '';
  constructor(public activeModal: NgbActiveModal) {}
}

/** Abre el historial de un pago (`{ paymentId }`) o de los pagos de un pedido (`{ orderId }`). */
export function abrirHistorialPago(modal: NgbModal, destino: { paymentId?: string; orderId?: string }): void {
  const ref = modal.open(HistorialPagoModalComponent, { size: 'lg', centered: true, scrollable: true });
  ref.componentInstance.paymentId = destino.paymentId || '';
  ref.componentInstance.orderId = destino.orderId || '';
}
