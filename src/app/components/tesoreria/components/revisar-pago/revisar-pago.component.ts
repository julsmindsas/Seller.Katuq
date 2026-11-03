import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { ReviewAction, MotivoRechazoPago } from '../../../../shared/services/treasury/treasury.models';
import { CompanyFeaturesService } from '../../../../shared/services/company-features.service';

import { TranslateService } from '@ngx-translate/core';
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

  /** Ticket 1455: con la bandera `motivoRechazoPago` el rechazo pide un motivo de la lista. */
  motivosLista: MotivoRechazoPago[] = [];
  usaListaDeMotivos = false;
  motivoCodigo = '';
  /** Ticket 1455: mínimo de caracteres del texto cuando el motivo es «Otro» (el servidor repite la regla). */
  readonly minimoOtro = 10;
  /** Ticket 1455: historial del pago a la vista dentro de esta misma ventana. */
  verHistorial = false;

  total = 0;
  yaAprobado = 0;
  estePago = 0;
  quedariaFaltando = 0;
  esParcial = false;
  /** Ticket 1218: lo que este pago dejaría por encima del total del pedido. */
  excedente = 0;

  aiFlag = '';
  aiDetails: any = null;

  /**
   * Ticket 1453 (bandera `pagoVariosPedidos`): el comprobante es parte de un pago repartido entre varios pedidos.
   * Por defecto la decisión vale para todo el grupo (una transferencia, una decisión); la persona puede
   * desmarcarlo para decidir solo este pedido, como siempre.
   */
  grupoActivo = false;
  decidirGrupo = true;

  constructor(
    public activeModal: NgbActiveModal,
    private treasury: TreasuryService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private features: CompanyFeaturesService,
  ) {
    this.grupoActivo = this.features.isEnabled('pagoVariosPedidos');
  }

  get grupoPagoId(): string {
    const g = this.pago?.grupoPagoId;
    return typeof g === 'string' ? g : '';
  }

  /** ¿Se decide el grupo completo? Solo con la bandera, con el pago marcado como de grupo y con la casilla puesta. */
  get decideGrupo(): boolean {
    return this.grupoActivo && !!this.grupoPagoId && this.decidirGrupo;
  }

  ngOnInit(): void {
    this.total = Number(this.pedido?.totalPedididoConDescuento) || 0;
    this.estePago = Number(this.pago?.valor ?? this.pago?.valorRegistrado) || 0;

    this.yaAprobado = (this.pedido?.PagosAsentados || [])
      .filter((p: any) => p !== this.pago && p?.estadoVerificacion === 'Aprobado')
      .reduce((acc: number, p: any) => acc + (Number(p?.valor ?? p?.valorRegistrado) || 0), 0);

    this.quedariaFaltando = Math.max(0, this.total - this.yaAprobado - this.estePago);
    this.esParcial = this.quedariaFaltando > 0;
    this.excedente = Math.max(0, this.yaAprobado + this.estePago - this.total);

    this.aiFlag = this.pago?.aiFlag || '';
    this.aiDetails = this.pago?.aiDetails || null;

    // Ticket 1455: la lista de motivos sale del servidor. Si /config falla o la bandera está apagada, el
    // rechazo funciona como siempre (un motivo escrito).
    this.treasury.getConfig().subscribe({
      next: (cfg) => {
        this.motivosLista = cfg?.motivosRechazo || [];
        this.usaListaDeMotivos = cfg?.motivoRechazoPago === true && this.motivosLista.length > 0;
      },
      error: () => {
        this.usaListaDeMotivos = false;
      },
    });
  }

  /** Nombre del motivo en el idioma de la persona; si no hay traducción, el texto del servidor. */
  nombreMotivo(m: MotivoRechazoPago): string {
    const clave = `tesoreria.motivosRechazo.${m.codigo}`;
    const t = this.translate.instant(clave);
    return t === clave ? m.texto : t;
  }

  /**
   * Ticket 1449: campos del comprobante que quien registró cambió respecto a lo que leyó la IA. Los marca el servidor
   * al registrar (esta pantalla solo los muestra); sin lectura firmada no hay nada que mostrar.
   */
  get camposEditadosTexto(): string {
    const campos = this.pago?.camposEditados;
    if (!Array.isArray(campos) || !campos.length) return '';
    return campos
      .map((k: string) => {
        const clave = `tesoreria.comprobante.campo.${k}`;
        const t = this.translate.instant(clave);
        return t === clave ? k : t;
      })
      .join(', ');
  }

  /** Ticket 1449: pago sin comprobante que alguien marcó «Verificado en banco» (el servidor guarda quién y cuándo). */
  get verificadoEnBanco(): { por: string; fecha: string } | null {
    const v = this.pago?.verificadoEnBanco;
    return v && typeof v === 'object' && v.por ? v : null;
  }

  get esOtro(): boolean {
    return this.motivoCodigo === 'otro';
  }

  /** ¿Se puede confirmar el rechazo? Con la lista: un motivo, y «Otro» con su texto mínimo. */
  get rechazoValido(): boolean {
    if (!this.usaListaDeMotivos) return !!this.motivoRechazo.trim();
    if (!this.motivoCodigo) return false;
    return !this.esOtro || this.motivoRechazo.trim().length >= this.minimoOtro;
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
    if (!this.rechazoValido) {
      return;
    }
    this.decidir('reject', this.motivoRechazo.trim(), this.usaListaDeMotivos ? this.motivoCodigo : '');
  }

  /** Ticket 1453: aprueba o rechaza todos los pagos del grupo en un paso (el servidor repite las validaciones). */
  private decidirElGrupo(action: ReviewAction, motivo: string, motivoCodigo: string): void {
    this.treasury.reviewGroupPayment(this.grupoPagoId, action, motivo, motivoCodigo).subscribe({
      next: (res) => {
        this.submitting = false;
        const n = (res?.resultados || []).length;
        this.toastr.success(this.translate.instant(action === 'approve' ? 'tesoreria.revisarPago.grupoAprobado' : 'tesoreria.revisarPago.grupoRechazado', { n }));
        this.activeModal.close({ changed: true });
      },
      error: (err) => {
        this.submitting = false;
        const mensaje = err?.status >= 400 && err?.status < 500 && typeof err?.error?.message === 'string' ? err.error.message : '';
        const incompleto = err?.error?.code === 'GRUPO_DECISION_INCOMPLETA';
        Swal.fire({
          icon: 'warning',
          title: this.translate.instant(incompleto ? 'tesoreria.revisarPago.grupoIncompleto' : 'tesoreria.revisarPago.noSePudoProcesar'),
          text: mensaje || this.translate.instant('tesoreria.revisarPago.ocurrioUnErrorAlRegistrar'),
        });
        // Una decisión a medias o ya tomada por otra persona: la lista debe volver a pedirse.
        if (incompleto || err?.status === 409) this.activeModal.close({ changed: true });
      },
    });
  }

  private decidir(action: ReviewAction, motivo = '', motivoCodigo = ''): void {
    if (!this.paymentId) {
      Swal.fire({ icon: 'error', title: this.translate.instant('tesoreria.revisarPago.sinIdentificador'), text: this.translate.instant('tesoreria.revisarPago.noSePudoIdentificarEl') });
      return;
    }
    this.submitting = true;
    if (this.decideGrupo) {
      this.decidirElGrupo(action, motivo, motivoCodigo);
      return;
    }
    this.treasury.reviewPayment(this.paymentId, action, motivo, motivoCodigo).subscribe({
      next: (res) => {
        this.submitting = false;
        if (action === 'approve') {
          this.toastr.success(res?.alreadyDecided ? this.translate.instant('tesoreria.revisarPago.elPagoYaEstabaAprobado') : this.translate.instant('tesoreria.revisarPago.pagoAprobado'));
        } else {
          this.toastr.success(res?.alreadyDecided ? this.translate.instant('tesoreria.revisarPago.elPagoYaEstabaRechazado') : this.translate.instant('tesoreria.revisarPago.pagoRechazado'));
        }
        this.activeModal.close({ changed: true });
      },
      error: (err) => {
        this.submitting = false;
        const conflict = err?.status === 409;
        // Ticket 1455: un 400 con la lista de motivos trae el mensaje claro del servidor (p. ej. «Otro» muy corto).
        const mensajeDelServidor = err?.status === 400 && this.usaListaDeMotivos ? err?.error?.message : '';
        Swal.fire({
          icon: 'warning',
          title: conflict ? this.translate.instant('tesoreria.revisarPago.decisionEnConflicto') : this.translate.instant('tesoreria.revisarPago.noSePudoProcesar'),
          text: conflict
            ? this.translate.instant('tesoreria.revisarPago.otroUsuarioYaTomoUna')
            : (mensajeDelServidor || this.translate.instant('tesoreria.revisarPago.ocurrioUnErrorAlRegistrar')),
        });
      },
    });
  }
}
