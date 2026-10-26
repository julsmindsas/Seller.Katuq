import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { debePreguntarSiVolvio, preguntarSiVolvio } from '../../../../shared/utils/pedido-mercancia-devuelta';
import {
  PAYMENT_STATE_TRANSITIONS,
  MOTIVOS_CAMBIO_ESTADO,
  metaEstado,
  PaymentStateMeta,
} from '../../tesoreria.constants';

import { TranslateService } from '@ngx-translate/core';
/**
 * Spec 013 — Tesorería MVP. Modal "Cambiar Estado" (T-18, CA-09/10).
 * Muestra los estados destino permitidos por la matriz (validada en el server)
 * como cards seleccionables + motivo obligatorio (predefinido u "Otro").
 */
@Component({
  selector: 'app-cambiar-estado-pago',
  templateUrl: './cambiar-estado-pago.component.html',
  styleUrls: ['./cambiar-estado-pago.component.scss'],
})
export class CambiarEstadoPagoComponent implements OnInit {
  @Input() pedido: any;

  estadoActual = '';
  estadosDisponibles: string[] = [];
  estadoSeleccionado = '';
  motivoSeleccionado = '';
  motivoOtro = '';
  submitting = false;

  readonly motivos = MOTIVOS_CAMBIO_ESTADO;
  readonly OTRO = 'Otro';

  constructor(
    public activeModal: NgbActiveModal,
    private treasury: TreasuryService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.estadoActual = this.pedido?.estadoPago || '';
    this.estadosDisponibles = PAYMENT_STATE_TRANSITIONS[this.estadoActual] || [];
  }

  meta(estado: string): PaymentStateMeta {
    return metaEstado(estado);
  }

  seleccionarEstado(estado: string): void {
    this.estadoSeleccionado = estado;
  }

  get motivoFinal(): string {
    return this.motivoSeleccionado === this.OTRO ? this.motivoOtro.trim() : this.motivoSeleccionado;
  }

  get puedeConfirmar(): boolean {
    return !!this.estadoSeleccionado && !!this.motivoFinal && !this.submitting;
  }

  get mensajeContextual(): string {
    switch (this.estadoSeleccionado) {
      case 'PreAprobado':
        return 'El pedido quedará como pago parcial verificado, con saldo pendiente por cobrar.';
      case 'Aprobado':
        return 'El pedido quedará totalmente pagado y se dispararán los efectos de aprobación (facturación / notificaciones).';
      case 'Rechazado':
        return 'El pedido y su último pago quedarán rechazados.';
      case 'Precancelado':
        return 'El pedido quedará marcado como pre-cancelado.';
      case 'Pendiente':
        return 'El pedido volverá a quedar sin pago verificado.';
      default:
        return '';
    }
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;
    // D-493 (ticket 1299): si el pedido ya salió, preguntar si el producto volvió.
    const proceso = this.pedido?.estadoProceso || '';
    let mercanciaVolvio = false;
    if (debePreguntarSiVolvio(this.estadoActual, this.estadoSeleccionado, proceso)) {
      const respuesta = await preguntarSiVolvio(proceso);
      if (respuesta === null) return;
      mercanciaVolvio = respuesta;
    }
    this.submitting = true;
    this.treasury.changePaymentState(this.pedido?._id, this.estadoSeleccionado, this.motivoFinal, mercanciaVolvio).subscribe({
      next: (res) => {
        this.submitting = false;
        const devolvio = mercanciaVolvio && res?.devolucionInventario === true;
        this.toastr.success(
          this.translate.instant('tesoreria.cambiarEstadoPago.estadoCambiadoA', { estado: this.meta(this.estadoSeleccionado).label }) +
            (devolvio ? ' ' + this.translate.instant('tesoreria.cambiarEstadoPago.elInventarioSeDevolvioA') : ''),
        );
        this.activeModal.close({ changed: true });
      },
      error: (err) => {
        this.submitting = false;
        const conflict = err?.status === 409;
        Swal.fire({
          icon: 'warning',
          title: conflict ? this.translate.instant('tesoreria.cambiarEstadoPago.transicionNoPermitida') : this.translate.instant('tesoreria.cambiarEstadoPago.noSePudoCambiarEl'),
          text: conflict
            ? this.translate.instant('tesoreria.cambiarEstadoPago.laTransicionYaNoEs')
            : this.translate.instant('tesoreria.cambiarEstadoPago.ocurrioUnErrorAlCambiar'),
        });
      },
    });
  }
}
