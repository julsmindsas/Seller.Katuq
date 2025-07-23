import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Pedido, Carrito } from '../modelo/pedido';
import { ColumnDefinition } from '../interfaces/column-definition.interface';

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

  // Columnas fijas para producción
  readonly fixedFields = ['imagen', 'producto', 'descripcion', 'opciones'];

  constructor() {}

  ngOnInit(): void {
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
      return pedido.carrito.map((carrito: Carrito, idx: number) => ({
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
} 