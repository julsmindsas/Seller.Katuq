import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { CuentaReceptora } from '../../../../shared/services/treasury/treasury.models';

/**
 * Ticket 1449 (bandera `comprobantePrimero`, D-662 propuesta). Ajustes del comprobante para el Administrador:
 * cuentas donde el comercio recibe pagos (solo los últimos 4 dígitos, nunca el número completo), si el
 * comprobante es obligatorio, cuántos días atrás se acepta un comprobante y qué formas de pago no llevan
 * referencia. El servidor valida y deja constancia del cambio; esta pantalla solo lo envía.
 */
@Component({
  selector: 'app-ajustes-comprobante',
  templateUrl: './ajustes-comprobante.component.html',
  styleUrls: ['./ajustes-comprobante.component.scss'],
})
export class AjustesComprobanteComponent implements OnInit {
  cargando = true;
  guardando = false;
  errorCarga = false;

  obligatorio = false;
  antiguedadMaximaDias = 60;
  formasSinReferenciaTexto = '';
  cuentas: CuentaReceptora[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private treasury: TreasuryService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.treasury.getComprobanteConfig(true).subscribe({
      next: (c) => {
        this.obligatorio = c.obligatorio === true;
        this.antiguedadMaximaDias = Number(c.antiguedadMaximaDias) || 60;
        this.formasSinReferenciaTexto = (c.formasSinReferencia || []).join(', ');
        this.cuentas = (c.todasLasCuentas || c.cuentasReceptoras || []).map((x) => ({ ...x, activa: x.activa !== false }));
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = true;
      },
    });
  }

  agregarCuenta(): void {
    this.cuentas = [...this.cuentas, { medio: '', banco: '', alias: '', ultimos4: '', activa: true }];
  }

  quitarCuenta(i: number): void {
    this.cuentas = this.cuentas.filter((_, idx) => idx !== i);
  }

  trackPorIndice(i: number): number {
    return i;
  }

  /** Los últimos 4 son solo dígitos; si alguien pega un número largo se queda con los 4 últimos. */
  soloUltimos4(c: CuentaReceptora): void {
    const digitos = (c.ultimos4 || '').replace(/\D/g, '');
    c.ultimos4 = digitos.length > 4 ? digitos.slice(-4) : digitos;
  }

  get valido(): boolean {
    const dias = Number(this.antiguedadMaximaDias);
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) return false;
    return this.cuentas.every((c) => /^\d{4}$/.test(c.ultimos4 || '') && ((c.medio || '').trim() || (c.banco || '').trim()));
  }

  guardar(): void {
    if (!this.valido || this.guardando) return;
    this.guardando = true;
    const formas = this.formasSinReferenciaTexto.split(',').map((f) => f.trim()).filter(Boolean);
    this.treasury
      .saveComprobanteConfig({
        comprobante: { obligatorio: this.obligatorio, antiguedadMaximaDias: Number(this.antiguedadMaximaDias), formasSinReferencia: formas },
        cuentasReceptoras: this.cuentas,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.toastr.success(this.translate.instant('tesoreria.ajustesComprobante.guardado'));
          this.activeModal.close({ changed: true });
        },
        error: (err) => {
          this.guardando = false;
          this.toastr.error(err?.error?.message || this.translate.instant('tesoreria.ajustesComprobante.noSePudoGuardar'));
        },
      });
  }
}
