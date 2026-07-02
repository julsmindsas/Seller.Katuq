import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import {
  PAYMENT_STATE_TRANSITIONS,
  MOTIVOS_CAMBIO_ESTADO,
  metaEstado,
  PaymentStateMeta,
} from '../../tesoreria.constants';

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

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    this.submitting = true;
    this.treasury.changePaymentState(this.pedido?._id, this.estadoSeleccionado, this.motivoFinal).subscribe({
      next: () => {
        this.submitting = false;
        this.toastr.success(`Estado cambiado a ${this.meta(this.estadoSeleccionado).label}.`);
        this.activeModal.close({ changed: true });
      },
      error: (err) => {
        this.submitting = false;
        const conflict = err?.status === 409;
        Swal.fire({
          icon: 'warning',
          title: conflict ? 'Transición no permitida' : 'No se pudo cambiar el estado',
          text: conflict
            ? 'La transición ya no es válida (el estado del pedido cambió). Actualiza la lista.'
            : 'Ocurrió un error al cambiar el estado. Inténtalo de nuevo.',
        });
      },
    });
  }
}
