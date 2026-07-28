import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToastrService } from 'ngx-toastr';
import { IntegrationsService } from '../../../../integrations/integrations.service';

interface CerezaCarrier {
  code: string;
  name: string;
}

/**
 * Selección de transportadora para despachar por Guía Cereza.
 *
 * Cereza exige `carrier_code` al crear la orden (cambio de su API del
 * 2026-07-21). La ciudad de destino se resuelve sola desde el pedido, así que
 * esto es lo único que el operador escoge. Se preselecciona la transportadora
 * configurada para la empresa: en el caso normal despachar es un solo clic.
 */
@Component({
  selector: 'app-cereza-carrier-modal',
  templateUrl: './cereza-carrier-modal.component.html',
  styleUrls: ['./cereza-carrier-modal.component.scss'],
})
export class CerezaCarrierModalComponent implements OnInit {
  carriers: CerezaCarrier[] = [];
  carriersFiltrados: CerezaCarrier[] = [];
  seleccionada: CerezaCarrier | null = null;

  busqueda = '';
  cargando = true;
  error: string | null = null;

  /** Cantidad de pedidos que se van a despachar (solo informativo). */
  cantidadPedidos = 0;

  constructor(
    private integrationsService: IntegrationsService,
    private toastr: ToastrService,
    public dialogRef: DynamicDialogRef,
    public config: DynamicDialogConfig,
  ) {}

  ngOnInit(): void {
    this.cantidadPedidos = this.config?.data?.pedidos?.length || 0;
    this.cargarCarriers();
  }

  private cargarCarriers(): void {
    this.cargando = true;
    this.error = null;

    this.integrationsService.getCerezaCarriers().subscribe({
      next: (resp) => {
        this.cargando = false;
        this.carriers = resp?.carriers || [];
        this.carriersFiltrados = [...this.carriers];

        if (this.carriers.length === 0) {
          this.error = 'Guía Cereza no devolvió transportadoras. Intenta de nuevo en un momento.';
          return;
        }

        const porDefecto = resp?.defaultCarrierCode
          ? this.carriers.find((c) => c.code === String(resp.defaultCarrierCode))
          : null;
        this.seleccionada = porDefecto || null;
      },
      error: (err) => {
        this.cargando = false;
        this.error =
          err?.error?.message
          || 'No se pudo consultar las transportadoras de Guía Cereza. Revisa la conexión de la integración.';
      },
    });
  }

  filtrar(): void {
    const termino = (this.busqueda || '').trim().toLowerCase();
    this.carriersFiltrados = !termino
      ? [...this.carriers]
      : this.carriers.filter(
        (c) => c.name.toLowerCase().includes(termino) || c.code.includes(termino),
      );
  }

  seleccionar(carrier: CerezaCarrier): void {
    this.seleccionada = carrier;
  }

  /** Paleta estable para el logo: la misma transportadora, el mismo color. */
  private readonly COLORES = [
    '#7C5CFF', '#1E6FD9', '#1E874B', '#D9820A', '#8E27B0', '#0EA5A0', '#D64545', '#5A6B78',
  ];

  colorCarrier(carrier: CerezaCarrier): string {
    const clave = String(carrier?.code || carrier?.name || '');
    let suma = 0;
    for (let i = 0; i < clave.length; i++) { suma += clave.charCodeAt(i); }
    return this.COLORES[suma % this.COLORES.length];
  }

  confirmar(): void {
    if (!this.seleccionada) {
      this.toastr.warning('Selecciona una transportadora para continuar.', 'Falta la transportadora');
      return;
    }
    this.dialogRef.close({
      confirmed: true,
      carrierCode: this.seleccionada.code,
      carrierName: this.seleccionada.name,
    });
  }

  cancelar(): void {
    this.dialogRef.close({ confirmed: false });
  }

  reintentar(): void {
    this.cargarCarriers();
  }
}
