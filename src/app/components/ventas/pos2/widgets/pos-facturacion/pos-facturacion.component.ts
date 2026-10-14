import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  faltantesPerfil,
  FacturacionPos,
  perfilesDelCliente,
} from '../../../../../shared/utils/facturacion-pos';

/** Resultado del modal: la opción elegida, o pedir que se edite el cliente. */
export type ResultadoPosFacturacion = FacturacionPos | { accion: 'editarCliente' };

/**
 * D-419 (ticket 1171): a quién se factura la venta POS. Lista los perfiles de
 * facturación del cliente (el predeterminado marcado), Consumidor Final y
 * "No requiere factura". Para agregar o corregir un perfil devuelve
 * `{ accion: 'editarCliente' }` y la sección del cliente abre el formulario
 * único de cliente (pestaña Facturación, D-406).
 */
@Component({
  selector: 'app-pos-facturacion',
  templateUrl: './pos-facturacion.component.html',
  styleUrls: ['./pos-facturacion.component.scss'],
})
export class PosFacturacionComponent implements OnInit {
  @Input() cliente: any;
  @Input() actual: FacturacionPos | null = null;

  perfiles: any[] = [];
  /** Índice del perfil elegido, o -1 (Consumidor Final) / -2 (No requiere factura). */
  seleccion = -2;

  static readonly CONSUMIDOR_FINAL = -1;
  static readonly SIN_FACTURA = -2;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.perfiles = perfilesDelCliente(this.cliente);
    if (this.actual?.modo === 'perfil') {
      const i = this.perfiles.indexOf(this.actual.perfil);
      this.seleccion = i >= 0 ? i : this.indicePorDocumento(this.actual.perfil);
    } else if (this.actual?.modo === 'consumidorFinal') {
      this.seleccion = PosFacturacionComponent.CONSUMIDOR_FINAL;
    } else {
      this.seleccion = PosFacturacionComponent.SIN_FACTURA;
    }
  }

  private indicePorDocumento(perfil: any): number {
    const doc = String(perfil?.documento || '');
    const i = this.perfiles.findIndex((p) => String(p?.documento || '') === doc && doc);
    return i >= 0 ? i : PosFacturacionComponent.SIN_FACTURA;
  }

  faltantes(perfil: any): string[] {
    return faltantesPerfil(perfil);
  }

  get puedeConfirmar(): boolean {
    return this.seleccion < 0 || this.faltantes(this.perfiles[this.seleccion]).length === 0;
  }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    let resultado: FacturacionPos;
    if (this.seleccion === PosFacturacionComponent.CONSUMIDOR_FINAL) {
      resultado = { modo: 'consumidorFinal' };
    } else if (this.seleccion === PosFacturacionComponent.SIN_FACTURA) {
      resultado = { modo: 'ninguna' };
    } else {
      resultado = { modo: 'perfil', perfil: this.perfiles[this.seleccion] };
    }
    this.activeModal.close(resultado);
  }

  editarCliente(): void {
    this.activeModal.close({ accion: 'editarCliente' } as ResultadoPosFacturacion);
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
