import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';

/**
 * Ticket 1452 (bandera `ajusteAlPeso`, D-663 propuesta). Ajuste al peso para el Administrador: activar o apagar la
 * función y fijar, por separado para cuando el cliente paga de menos (faltante) y de más (sobrante), cuánto se
 * perdona en pesos y en porcentaje del total del pedido (aplica el menor). El servidor valida, aplica el techo de
 * seguridad y deja constancia del cambio; esta pantalla solo lo envía.
 */
@Component({
  selector: 'app-ajuste-al-peso',
  templateUrl: './ajuste-al-peso.component.html',
  styleUrls: ['./ajuste-al-peso.component.scss'],
})
export class AjusteAlPesoComponent implements OnInit {
  cargando = true;
  guardando = false;
  errorCarga = false;

  activo = false;
  faltantePesos: number | null = null;
  faltantePorcentaje: number | null = null;
  sobrantePesos: number | null = null;
  sobrantePorcentaje: number | null = null;
  techoPesos = 50000;
  techoPorcentaje = 5;

  constructor(
    public activeModal: NgbActiveModal,
    private treasury: TreasuryService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.treasury.getAjusteAlPesoConfig().subscribe({
      next: (c) => {
        if (!c.habilitada) {
          this.errorCarga = true;
          this.cargando = false;
          return;
        }
        this.activo = c.activo === true;
        this.faltantePesos = c.faltante?.maxPesos ?? null;
        this.faltantePorcentaje = c.faltante?.maxPorcentaje ?? null;
        this.sobrantePesos = c.sobrante?.maxPesos ?? null;
        this.sobrantePorcentaje = c.sobrante?.maxPorcentaje ?? null;
        this.techoPesos = c.techoPesos ?? this.techoPesos;
        this.techoPorcentaje = c.techoPorcentaje ?? this.techoPorcentaje;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = true;
      },
    });
  }

  /** Vacío es válido (ese límite no cuenta); si hay número, entre 0 y el techo. */
  private limiteValido(valor: number | null, techo: number): boolean {
    if (valor === null || (valor as unknown) === '') return true;
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0 && n <= techo;
  }

  get valido(): boolean {
    return this.limiteValido(this.faltantePesos, this.techoPesos)
      && this.limiteValido(this.sobrantePesos, this.techoPesos)
      && this.limiteValido(this.faltantePorcentaje, this.techoPorcentaje)
      && this.limiteValido(this.sobrantePorcentaje, this.techoPorcentaje);
  }

  private aLimite(valor: number | null): number | null {
    return valor === null || (valor as unknown) === '' ? null : Number(valor);
  }

  guardar(): void {
    if (!this.valido || this.guardando) return;
    this.guardando = true;
    this.treasury
      .saveAjusteAlPesoConfig({
        activo: this.activo,
        faltante: { maxPesos: this.aLimite(this.faltantePesos), maxPorcentaje: this.aLimite(this.faltantePorcentaje) },
        sobrante: { maxPesos: this.aLimite(this.sobrantePesos), maxPorcentaje: this.aLimite(this.sobrantePorcentaje) },
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.toastr.success(this.translate.instant('tesoreria.ajusteAlPeso.guardado'));
          this.activeModal.close({ changed: true });
        },
        error: (err) => {
          this.guardando = false;
          this.toastr.error(err?.error?.message || this.translate.instant('tesoreria.ajusteAlPeso.noSePudoGuardar'));
        },
      });
  }
}
