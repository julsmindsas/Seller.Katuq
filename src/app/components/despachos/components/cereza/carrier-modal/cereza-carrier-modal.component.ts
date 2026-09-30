import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToastrService } from 'ngx-toastr';
import { IntegrationsService } from '../../../../integrations/integrations.service';

interface CerezaCarrier {
  code: string;
  name: string;
}

/** Lo que recibe Cereza con el transporte y el manejo escogidos (tickets 1059/1092). */
interface CambioPedido {
  nroPedido: string;
  totalCliente: number;
  totalCereza: number;
  diferencia: number;
}

/**
 * Selección de transportadora para despachar por Guía Cereza.
 *
 * Cereza exige `carrier_code` al crear la orden (cambio de su API del
 * 2026-07-21). La ciudad de destino se resuelve sola desde el pedido, así que
 * esto es lo único que el operador escoge. Se preselecciona la transportadora
 * configurada para la empresa: en el caso normal despachar es un solo clic.
 *
 * Ticket 1059: en la misma ventana van el transporte y el manejo que Cereza
 * registra como líneas de la venta. Transporte viene con el envío del pedido y
 * manejo en 0: dejarlo así es igual que siempre. Ticket 1092 (Daniel, 30-sep):
 * son internos (Comercializadora → Lumina). Solo cambian lo que recibe Cereza;
 * el pedido del cliente, su saldo y su factura no, así que un pedido facturado
 * también se puede despachar con cargos.
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

  private pedidos: any[] = [];
  /** null = el envío de cada pedido (con varios pedidos no se preescribe uno). */
  transporte: number | null = null;
  manejo: number | null = 0;
  cambios: CambioPedido[] = [];

  constructor(
    private integrationsService: IntegrationsService,
    private toastr: ToastrService,
    public dialogRef: DynamicDialogRef,
    public config: DynamicDialogConfig,
  ) {}

  ngOnInit(): void {
    this.pedidos = Array.isArray(this.config?.data?.pedidos) ? this.config.data.pedidos : [];
    this.cantidadPedidos = this.pedidos.length;
    if (this.pedidos.length === 1) {
      this.transporte = this.envioOriginal(this.pedidos[0]);
    }
    this.recalcularCambios();
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

  // ---------------------------------------------------------------------------
  // Transporte y manejo (ticket 1059)
  // ---------------------------------------------------------------------------

  /** El envío con el que llegó el pedido, aunque ya se le hayan puesto cargos. */
  private envioOriginal(pedido: any): number {
    const original = Number(pedido?.cargosCereza?.envioOriginal);
    return Number.isFinite(original) ? original : (Number(pedido?.totalEnvio) || 0);
  }

  private pesos(valor: number | null): number | null {
    if (valor === null || valor === undefined || (valor as any) === '') { return null; }
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  }

  /** Misma cuenta que hace el servidor, para mostrar lo que recibe Cereza antes de despachar. */
  recalcularCambios(): void {
    const transporte = this.pesos(this.transporte);
    const manejo = this.pesos(this.manejo) || 0;
    this.cambios = this.pedidos
      .map((pedido) => {
        const original = this.envioOriginal(pedido);
        const envioNuevo = (transporte === null ? original : transporte) + manejo;
        const envioActual = Number(pedido?.totalEnvio) || 0;
        const tarifaEnvio = Number(pedido?.tarifaEnvio) || 0;
        const delta = envioNuevo - envioActual;
        const diferencia = Math.round(delta * (1 + tarifaEnvio / 100) * 100) / 100;
        const totalCliente = Number(pedido?.totalPedididoConDescuento) || 0;
        return {
          nroPedido: pedido?.nroPedido || 'Pedido',
          totalCliente,
          totalCereza: totalCliente + diferencia,
          diferencia,
        };
      })
      .filter((c) => Math.abs(c.diferencia) >= 0.5);
  }

  get cargosInvalidos(): boolean {
    const t = this.transporte as any;
    const m = this.manejo as any;
    return (t !== null && t !== '' && this.pesos(t) === null)
      || (m !== null && m !== '' && this.pesos(m) === null);
  }

  formatoPesos(valor: number): string {
    return '$' + Math.round(Number(valor) || 0).toLocaleString('es-CO');
  }

  confirmar(): void {
    if (!this.seleccionada) {
      this.toastr.warning('Selecciona una transportadora para continuar.', 'Falta la transportadora');
      return;
    }
    if (this.cargosInvalidos) {
      this.toastr.warning('Revisa el valor de transporte o manejo.', 'Valor no válido');
      return;
    }
    const transporte = this.pesos(this.transporte);
    const manejo = this.pesos(this.manejo) || 0;
    this.dialogRef.close({
      confirmed: true,
      carrierCode: this.seleccionada.code,
      carrierName: this.seleccionada.name,
      // Solo viajan si cambian algo: el servidor trata "igual al envío" como sin cargos.
      ...(transporte !== null ? { transportationFee: transporte } : {}),
      ...(manejo > 0 ? { managementFee: manejo } : {}),
    });
  }

  cancelar(): void {
    this.dialogRef.close({ confirmed: false });
  }

  reintentar(): void {
    this.cargarCarriers();
  }
}
