import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { ReviewAction } from '../../../../shared/services/treasury/treasury.models';

/**
 * Spec 013 — Tesorería MVP. Modal "Revisar Pago" (T-16, CA-03/04/05, CA-13).
 * Muestra el comprobante y el resumen del saldo; aprueba o rechaza (motivo
 * obligatorio). La alerta anti-fraude SOLO alerta: el tesorero verifica el
 * dinero en el banco antes de decidir.
 */
@Component({
  selector: 'app-revisar-pago',
  templateUrl: './revisar-pago.component.html',
  styleUrls: ['./revisar-pago.component.scss'],
})
export class RevisarPagoComponent implements OnInit {
  @Input() pedido: any;
  @Input() pago: any;
  @Input() paymentId = '';

  showRejectForm = false;
  motivoRechazo = '';
  submitting = false;

  total = 0;
  yaAprobado = 0;
  estePago = 0;
  quedariaFaltando = 0;
  esParcial = false;

  aiFlag = '';
  aiDetails: any = null;

  constructor(
    public activeModal: NgbActiveModal,
    private treasury: TreasuryService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.total = Number(this.pedido?.totalPedididoConDescuento) || 0;
    this.estePago = Number(this.pago?.valor ?? this.pago?.valorRegistrado) || 0;

    this.yaAprobado = (this.pedido?.PagosAsentados || [])
      .filter((p: any) => p !== this.pago && p?.estadoVerificacion === 'Aprobado')
      .reduce((acc: number, p: any) => acc + (Number(p?.valor ?? p?.valorRegistrado) || 0), 0);

    this.quedariaFaltando = Math.max(0, this.total - this.yaAprobado - this.estePago);
    this.esParcial = this.quedariaFaltando > 0;

    this.aiFlag = this.pago?.aiFlag || '';
    this.aiDetails = this.pago?.aiDetails || null;
  }

  get esDuplicado(): boolean {
    return this.aiFlag === 'duplicate';
  }

  verComprobante(): void {
    const url = this.pago?.archivo || this.pago?.archivoUrl;
    if (url) {
      window.open(url, '_blank');
    }
  }

  aprobar(): void {
    this.decidir('approve');
  }

  mostrarRechazo(): void {
    this.showRejectForm = true;
  }

  confirmarRechazo(): void {
    if (!this.motivoRechazo.trim()) {
      return;
    }
    this.decidir('reject', this.motivoRechazo.trim());
  }

  private decidir(action: ReviewAction, motivo = ''): void {
    if (!this.paymentId) {
      Swal.fire({ icon: 'error', title: 'Sin identificador', text: 'No se pudo identificar el pago a revisar.' });
      return;
    }
    this.submitting = true;
    this.treasury.reviewPayment(this.paymentId, action, motivo).subscribe({
      next: (res) => {
        this.submitting = false;
        if (action === 'approve') {
          this.toastr.success(res?.alreadyDecided ? 'El pago ya estaba aprobado.' : 'Pago aprobado.');
        } else {
          this.toastr.success(res?.alreadyDecided ? 'El pago ya estaba rechazado.' : 'Pago rechazado.');
        }
        this.activeModal.close({ changed: true });
      },
      error: (err) => {
        this.submitting = false;
        const conflict = err?.status === 409;
        Swal.fire({
          icon: 'warning',
          title: conflict ? 'Decisión en conflicto' : 'No se pudo procesar',
          text: conflict
            ? 'Otro usuario ya tomó una decisión distinta sobre este pago. Actualiza la lista.'
            : 'Ocurrió un error al registrar la decisión. Inténtalo de nuevo.',
        });
      },
    });
  }
}
