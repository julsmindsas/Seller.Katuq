import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Pedido, Carrito, EstadoPago, EstadoProcesoFiltros } from '../modelo/pedido';
import { ColumnDefinition } from '../interfaces/column-definition.interface';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-list-produccion-orders',
  templateUrl: './list-produccion.component.html',
  styleUrls: ['./list-produccion.component.scss']
})
export class ListProduccionComponent implements OnInit, OnChanges {
  @Input() isFromProduction: boolean = false;
  @Input() pedidos: Pedido[] = [];
  @Input() displayedColumns: ColumnDefinition[] = [];
  @Input() selectedColumns: ColumnDefinition[] = [];
  @Output() onPrintProduct = new EventEmitter<{pedido: any, producto: any}>();
  @Output() onOptions = new EventEmitter<{pedido: any, producto: any}>();
  @Output() onColumnSelectionChange = new EventEmitter<ColumnDefinition[]>();
  productsView: any[] = [];

  // Arrays para filtros
  estadosPago = Object.values(EstadoPago);
  estadosProcesos: EstadoProcesoFiltros[];
  validaciones: { value: boolean; nombre: string }[];

  // Columnas fijas para producción
  readonly fixedFields = ['imagen', 'producto', 'descripcion', 'opciones', 'ultimaImpresion'];

  constructor(private ventasService: VentasService, private toastrService: ToastrService) {}

  ngOnInit(): void {
    this.initializeFilterArrays();
    this.transformPedidosToProductsView();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.pedidos) {
      this.transformPedidosToProductsView();
    }
  }

  private transformPedidosToProductsView(): void {
    if (!this.pedidos) {
      this.productsView = [];
      return;
    }
    // Para cada pedido, crear una fila por cada producto en el carrito
    this.productsView = this.pedidos.flatMap((pedido) => {
      if (!pedido.carrito || pedido.carrito.length === 0) return [];
      return pedido.carrito.map((carrito: Carrito) => ({
        nroPedido: pedido.nroPedido,
        producto: carrito.producto,
        referencia: carrito.producto?.crearProducto?.referencia || '-',
        descripcion: carrito.producto?.crearProducto?.descripcion,
        cantidad: carrito.cantidad,
        totalPedidoSinDescuento: pedido.totalPedidoSinDescuento,
        totalDescuento: pedido.totalDescuento,
        totalEnvio: pedido.totalEnvio,
        subtotal: pedido.subtotal,
        totalImpuesto: pedido.totalImpuesto,
        totalPedididoConDescuento: pedido.totalPedididoConDescuento,
        anticipo: pedido.anticipo,
        faltaPorPagar: pedido.faltaPorPagar,
        estadoPago: pedido.estadoPago,
        estadoProceso: pedido.estadoProceso,
        validacion: pedido.validacion,
        cliente: pedido.cliente,
        fechaEntrega: (pedido.carrito && pedido.carrito.length > 0) ? pedido.carrito[0]?.configuracion?.datosEntrega?.fechaEntrega : undefined,
        fechaCreacion: pedido.fechaCreacion,
        ciudad: pedido.envio?.ciudad,
        zonaCobro: pedido.envio?.zonaCobro,
        formaEntrega: carrito.configuracion?.datosEntrega?.formaEntrega,
        horarioEntrega: carrito.configuracion?.datosEntrega?.horarioEntrega,
        channel: pedido.channel,
        vendedor: pedido.asesorAsignado?.name,
        pedidoOriginal: pedido,
        carritoOriginal: carrito
      }));
    });
  }

  printProduct(row: any) {
    // Registrar la fecha/hora de impresión
    const now = new Date().toISOString();
    row.pedidoOriginal.ultimaImpresion = now;
    this.ventasService.editOrder(row.pedidoOriginal).subscribe({
      next: () => {
        this.toastrService.success('Fecha de impresión registrada', 'Pedido actualizado');
      },
      error: () => {
        this.toastrService.error('No se pudo actualizar la fecha de impresión', 'Error');
      }
    });
    this.onPrintProduct.emit({ pedido: row.pedidoOriginal, producto: row.carritoOriginal });
  }

  openOptionsModalProduccion(row: any) {
    this.onOptions.emit({ pedido: row.pedidoOriginal, producto: row.carritoOriginal });
  }

  isColumnVisibleProduccion(field: string): boolean {
    if (this.fixedFields.includes(field)) return true;
    return this.selectedColumns.some(col => col.field === field && col.visible);
    
  }

  handleColumnSelectionChange(newSelected: ColumnDefinition[]) {
    this.onColumnSelectionChange.emit(newSelected);
  }

  isValidDate(value: any): boolean {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value);
    return !isNaN(date.getTime());
  }

  stripHtml(html: string): string {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  private initializeFilterArrays(): void {
    // Estados de proceso para producción
    this.estadosProcesos = Object.values(EstadoProcesoFiltros);
    if (this.isFromProduction) {
      this.estadosProcesos = this.estadosProcesos.filter(estado => 
        estado === EstadoProcesoFiltros.SinProducir || 
        estado === EstadoProcesoFiltros.EnProduccion || 
        estado === EstadoProcesoFiltros.ProducidoParcialmente
      );
    }
    
    // Opciones de validación
    this.validaciones = [
      { value: true, nombre: 'Validado' },
      { value: false, nombre: 'No validado' }
    ];
  }
} 