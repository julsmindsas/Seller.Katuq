import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { CarteraService } from '../../../../shared/services/cartera/cartera.service';
import { CarteraCastigadaResponse, CastigoPedido } from '../../../../shared/services/cartera/cartera.models';

/**
 * Ticket 1463: reporte «Cartera castigada». Los pedidos que un Administrador marcó como incobrables salen de Cartera
 * y quedan aquí, con su motivo, quién y cuándo. El pedido no cambia (sigue con su estado de pago y su factura).
 * Solo un Administrador puede reactivar: el pedido vuelve a Cartera con su saldo y queda el registro.
 */
@Component({
  selector: 'app-cartera-castigada',
  templateUrl: './cartera-castigada.component.html',
  styleUrls: ['./cartera-castigada.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraCastigadaComponent implements OnInit {
  @Input() esAdmin = false;
  /** Se reactivó algo: la pantalla vuelve a pedir la cartera. */
  @Output() cambio = new EventEmitter<void>();

  data: CarteraCastigadaResponse | null = null;
  cargando = true;
  error = false;

  constructor(private carteraService: CarteraService, private translate: TranslateService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.cdr.markForCheck();
    this.carteraService.getCarteraCastigada().subscribe({
      next: (r) => {
        this.data = r;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  async reactivar(documento: string, pedido: CastigoPedido): Promise<void> {
    const r = await Swal.fire({
      icon: 'question',
      title: this.translate.instant('cartera.castigada.reactivarTitulo'),
      text: this.translate.instant('cartera.castigada.reactivarTexto', { pedido: pedido.nroPedido || '' }),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('cartera.castigada.reactivar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#5F3FE0',
    });
    if (!r.isConfirmed) return;
    this.carteraService.reactivar(documento, [pedido.orderId]).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: this.translate.instant('cartera.castigada.reactivado'), timer: 1600, showConfirmButton: false });
        this.cargar();
        this.cambio.emit();
      },
      error: (err: HttpErrorResponse) => {
        const m = err.error && typeof err.error.message === 'string' && err.status < 500 ? err.error.message : this.translate.instant('cartera.acciones.errorGeneral');
        Swal.fire({ icon: 'error', title: this.translate.instant('cartera.castigada.noSePudoReactivar'), text: m });
      },
    });
  }

  trackByClave(_i: number, c: { clave: string }): string {
    return c.clave;
  }

  trackByPedido(_i: number, p: { orderId: string }): string {
    return p.orderId;
  }
}
