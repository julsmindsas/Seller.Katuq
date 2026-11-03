import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Table } from 'primeng/table';
import { LazyLoadEvent } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { HistorialResumen, TreasuryPayment } from '../../../../shared/services/treasury/treasury.models';
import { metaEstado, PaymentStateMeta, HISTORIAL_STATUS_OPTIONS } from '../../tesoreria.constants';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { abrirHistorialPago } from '../linea-tiempo-pago/linea-tiempo-pago.component';

/**
 * Spec 013 — Tesorería MVP. Tab "Historial" (T-19, CA-15).
 * Tabla lazy server-side sobre GET /v1/treasury/payments con filtros básicos.
 */
@Component({
  selector: 'app-historial-pagos',
  templateUrl: './historial-pagos.component.html',
  styleUrls: ['./historial-pagos.component.scss'],
})
export class HistorialPagosComponent implements OnChanges, OnDestroy {
  @Input() active = false;

  @ViewChild('dt') dt: Table | undefined;

  items: TreasuryPayment[] = [];
  loading = false;
  totalRecords = 0;
  page = 1;
  pageSize = 25;

  // Filtros
  status = '';
  formaPago = '';
  registradoPor = '';
  search = '';
  fechaDesde = '';
  fechaHasta = '';

  readonly statusOptions = HISTORIAL_STATUS_OPTIONS;

  /** Ticket 1454: recaudado por forma de pago del filtro, y opciones de los filtros. */
  resumen: HistorialResumen | null = null;
  formasPagoOpciones: string[] = [];
  usuariosOpciones: string[] = [];
  truncado = false;

  private loadedOnce = false;
  private search$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private treasury: TreasuryService, private translate: TranslateService, private modal: NgbModal) {
    this.search$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['active'] && this.active && !this.loadedOnce) {
      this.loadedOnce = true;
      // La p-table lazy dispara onLazyLoad al montarse → carga inicial.
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(event?: LazyLoadEvent): void {
    if (event) {
      this.pageSize = event.rows || this.pageSize;
      this.page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    }

    this.loading = true;
    this.treasury
      .getPayments({
        status: this.status || undefined,
        formaPago: this.formaPago || undefined,
        registradoPor: this.registradoPor || undefined,
        desde: this.fechaDesde || undefined,
        hasta: this.fechaHasta || undefined,
        search: this.search?.trim() || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.items = res?.items || [];
          this.totalRecords = res?.pagination?.totalItems || 0;
          this.resumen = res?.resumen || null;
          this.truncado = res?.truncado === true;
          if (res?.opciones) {
            // Si lo elegido ya no está en las opciones del nuevo periodo, se conserva para que el
            // select no quede en blanco con el filtro aplicado.
            const formas = this.conservarOpcion(res.opciones.formasPago || [], this.formaPago);
            const usuarios = this.conservarOpcion(res.opciones.usuarios || [], this.registradoPor);
            this.formasPagoOpciones = formas.opciones;
            this.formaPago = formas.elegida;
            this.usuariosOpciones = usuarios.opciones;
            this.registradoPor = usuarios.elegida;
          }
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.resumen = null;
          this.totalRecords = 0;
          this.loading = false;
        },
      });
  }

  /**
   * Opciones del filtro con lo elegido incluido. El servidor compara sin mayúsculas, así que si la
   * opción del periodo solo difiere en mayúsculas («CXC MARKETPLACE» / «CXC Marketplace») se usa esa.
   */
  private conservarOpcion(opciones: string[], elegida: string): { opciones: string[]; elegida: string } {
    if (!elegida) return { opciones, elegida };
    const igual = opciones.find((o) => o.toLowerCase() === elegida.toLowerCase());
    if (igual) return { opciones, elegida: igual };
    return { opciones: [...opciones, elegida].sort((x, y) => x.localeCompare(y, 'es')), elegida };
  }

  onSearchInput(): void {
    this.search$.next();
  }

  applyFilters(): void {
    if (this.dt) {
      this.dt.reset();
    } else {
      this.page = 1;
      this.loadData();
    }
  }

  meta(estado: string): PaymentStateMeta {
    return metaEstado(estado);
  }

  verComprobante(item: TreasuryPayment): void {
    if (item?.archivoUrl) {
      window.open(item.archivoUrl, '_blank');
    }
  }

  /** Ticket 1361: id del pago que se está anulando (deshabilita su botón). */
  anulando: string | null = null;

  /** Solo pagos aprobados que no son de pasarela (esos se reembolsan en Wompi o ePayco). */
  sePuedeAnular(item: any): boolean {
    if (!item || item.estadoVerificacion !== 'Aprobado') return false;
    const forma = String(item.formaPago || item.metodoPago || '').toLowerCase();
    return item.origen !== 'webhook' && !forma.includes('wompi') && !forma.includes('epayco');
  }

  /** Pide el motivo, muestra el efecto y anula. El servidor vuelve a validar todo. */
  async anular(item: any): Promise<void> {
    const valor = Number(item?.valor || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const t = (clave: string, params?: object) => this.translate.instant('tesoreria.historialPagos.' + clave, params);
    const r = await Swal.fire({
      title: t('anularPagoDe', { pedido: item?.nroPedido || t('estePedido') }),
      html: t('anularEfectoHtml', { valor, referencia: item?.referencia || t('sinReferencia') }),
      input: 'textarea',
      inputLabel: t('motivoObligatorio'),
      inputPlaceholder: t('motivoPlaceholder'),
      inputValidator: (v) => (!String(v || '').trim() ? t('escribeElMotivo') : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('anularPago'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#D64545',
    });
    if (!r.isConfirmed) return;
    this.anulando = item.id;
    this.treasury.annulPayment(item.id, String(r.value).trim()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.anulando = null;
        const saldo = Number(res?.valorRestante || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
        Swal.fire({ icon: 'success', title: t('pagoAnulado'), text: t('pedidoQuedoEn', { estado: res?.estadoPago, saldo }) });
        this.loadData();
      },
      error: (err) => {
        this.anulando = null;
        Swal.fire({ icon: 'error', title: t('noSeAnulo'), text: err?.error?.error || err?.error?.message || t('intentaDeNuevo') });
      },
    });
  }

  /** Ticket 1455: historial del pago (quién lo subió, lo decidió y qué cambió después). */
  verHistorial(item: any): void {
    if (item?.id) abrirHistorialPago(this.modal, { paymentId: item.id });
  }

  trackByPayment(_index: number, item: TreasuryPayment): string {
    return item?.id || `${item?.orderId}-${_index}`;
  }
}
