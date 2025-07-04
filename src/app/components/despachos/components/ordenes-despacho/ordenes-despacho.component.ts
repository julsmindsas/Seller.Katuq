import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Pedido } from '../../../ventas/modelo/pedido';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ordenes-despacho',
  templateUrl: './ordenes-despacho.component.html',
  styleUrls: ['./ordenes-despacho.component.scss']
})
export class OrdenesDespachoComponent implements OnInit {
  @Input() dispatchOrders: any[] = [];
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onPrintOrder = new EventEmitter<string>();
  @Output() onViewOrder = new EventEmitter<string>();
  @Output() onDispatchOrder = new EventEmitter<any>();
  @Output() onDispatchPedido = new EventEmitter<any>();
  
  filteredOrders: any[] = [];
  searchTerm: string = '';
  
  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pagedOrders: any[] = [];
  
  // Detalles expandibles
  expandedRows: Set<string> = new Set();
  
  // Para usar Math en el template
  Math = Math;
  
  constructor(private router: Router) { }

  ngOnInit(): void {
    this.filteredOrders = [...this.dispatchOrders];
    this.dispatchOrders.forEach(order => {
      order.pedidos.forEach(pedido => {
        pedido.faltaPorPagar = this.getValorACobrarPorPedido(pedido);
      });
    });
    this.updatePagination();
  }
  
  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredOrders = [...this.dispatchOrders];
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      this.filteredOrders = this.dispatchOrders.filter(order => {
        return (
          (order.nroShippingOrder?.toString().includes(searchTermLower)) ||
          (order.fecha?.toLowerCase().includes(searchTermLower)) ||
          (order.transportador?.toLowerCase().includes(searchTermLower))
        );
      });
    }
    
    // Reset a la primera página cuando se aplica un filtro
    this.currentPage = 1;
    this.updatePagination();
  }
  
  clearFilter(): void {
    this.searchTerm = '';
    this.filteredOrders = [...this.dispatchOrders];
    this.updatePagination();
  }
  
  printOrder(orderId: string): void {
    this.onPrintOrder.emit(orderId);
  }
  
  viewOrder(orderId: string): void {
    // Solo emitir el evento para que el padre maneje la apertura de la orden
    this.onViewOrder.emit(orderId);
  }
  
  dispatchOrder(order: any): void {
    this.onDispatchOrder.emit(order);
  }
  
  dispatchPedido(pedido: any): void {
    this.onDispatchPedido.emit(pedido);
  }
  
  closeModal(): void {
    this.onClose.emit();
  }
  
  // Métodos para la paginación
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    this.updatePagedOrders();
  }
  
  updatePagedOrders(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedOrders = this.filteredOrders.slice(startIndex, endIndex);
  }
  
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.updatePagedOrders();
  }
  
  onPageSizeChange(): void {
    this.currentPage = 1; // Reset a la primera página
    this.updatePagination();
  }
  
  getPagesToShow(): number[] {
    const visiblePages = 5; // Número de páginas para mostrar
    const pages: number[] = [];
    
    let startPage = Math.max(1, this.currentPage - Math.floor(visiblePages / 2));
    let endPage = startPage + visiblePages - 1;
    
    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - visiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
  
  // Métodos para expandir/contraer filas
  toggleRowDetails(order: any): void {
    const key = this.getOrderKey(order);
    if (this.expandedRows.has(key)) {
      this.expandedRows.delete(key);
    } else {
      this.expandedRows.add(key);
    }
  }
  
  isRowExpanded(order: any): boolean {
    return this.expandedRows.has(this.getOrderKey(order));
  }
  
  private getOrderKey(order: any): string {
    return order.nroShippingOrder?.toString() || order.id?.toString() || Math.random().toString();
  }
  
  // Métodos para obtener información de los pedidos
  getFaltaPorPagarSum(order: any): number {
    if (!order.pedidos || !Array.isArray(order.pedidos)) {
      return 0;
    }
    
    return order.pedidos.reduce((sum: number, pedido: any) => {
      // Verifica si faltaPorPagar es un número negativo y, si es así, lo reemplaza por 0
      const faltaPorPagar = pedido.faltaPorPagar < 0 ? 0 : pedido.faltaPorPagar || 0;
      return sum + faltaPorPagar;
    }, 0);
  }
  
  getPedidosCount(order: any): number {
    return order.pedidos?.length || 0;
  }
  
  getEstadoProceso(order: any): string {
    if (!order.pedidos || order.pedidos.length === 0) return 'Sin pedidos';
    return order.pedidos[0].estadoProceso === 'Despachado' ? 'Despachado' : 'Por despachar';
  }
  
  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
  
  getPedidoCliente(pedido: any): string {
    const cliente = pedido.cliente;
    if (!cliente) return 'N/A';
    
    const nombres = cliente.nombres_completos || cliente.nombres || '';
    const apellidos = cliente.apellidos_completos || cliente.apellidos || '';
    
    return nombres && apellidos 
      ? `${nombres} ${apellidos}` 
      : nombres || apellidos || 'N/A';
  }
  getTotalImpuesto(pedido) {
    let totalPrecioIVA = 0;
    let totalPrecioIVADef = 0;
    pedido.carrito.forEach((itemCarrito) => {
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.forEach((x) => {
          if (
            itemCarrito.cantidad >= x.numeroUnidadesInicial &&
            itemCarrito.cantidad <= x.numeroUnidadesLimite
          ) {
            totalPrecioIVA =
              x.valorUnitarioPorVolumenIva * itemCarrito.cantidad;
          } else {
            totalPrecioIVA =
              itemCarrito.producto?.precio?.valorIva * itemCarrito.cantidad;
          }
        });
      } else {
        totalPrecioIVA =
          itemCarrito.producto?.precio?.valorIva * itemCarrito.cantidad;
      }
      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion) => {
          try {
            if (adicion["referencia"]["precioIva"])
              totalPrecioIVA +=
                adicion["cantidad"] *
                adicion["referencia"]["precioIva"] *
                itemCarrito.cantidad;
          } catch (error) {}
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia) => {
          totalPrecioIVA += preferencia["valorIva"] * itemCarrito.cantidad;
        });
      }
      totalPrecioIVADef += totalPrecioIVA;
    });

    return totalPrecioIVADef;
  }

  getValorACobrarPorPedido(pedido) {
    const order = pedido;

    order.totalPedidoSinDescuento = this.getSubTotalPedido(order);
    order.totalImpuesto = this.getTotalImpuesto(order);
    order.subtotal =
      order.totalPedidoSinDescuento +
      order.totalEnvio -
      order.totalDescuento;
    order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;

    // Calcular anticipo basado en PagosAsentados si existen
    if (order.PagosAsentados && order.PagosAsentados.length > 0) {
      order.anticipo = order.PagosAsentados.reduce((acc, pago) => {
        // Para Wompi, verificar que no esté pendiente
        if (
          pago.formaPago?.toLowerCase().includes("wompi") &&
          pago.estadoVerificacion === "Pendiente"
        ) {
          return acc; // No sumar pagos de Wompi pendientes
        }
        // Considerar tanto valor como valorRegistrado
        const valorPago = pago.valor || pago.valorRegistrado || 0;
        return acc + valorPago;
      }, 0);
    } else if (order.anticipo == null || order.anticipo == undefined) {
      order.anticipo = 0;
    }

    // Calcular falta por pagar basado en el total y anticipo real
    order.faltaPorPagar = Math.max(
      0,
      order.totalPedididoConDescuento - order.anticipo,
    );

    return order.faltaPorPagar;
  }

  getSubTotalPedido(pedido) {
    let totalPrecioSinIVA = 0;
    let totalPrecioSinIVADef = 0;
    pedido.carrito.map((itemCarrito) => {
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.map((x) => {
          if (
            itemCarrito.cantidad >= x.numeroUnidadesInicial &&
            itemCarrito.cantidad <= x.numeroUnidadesLimite
          ) {
            totalPrecioSinIVA =
              x.valorUnitarioPorVolumenSinIVA * itemCarrito.cantidad;
          } else {
            totalPrecioSinIVA =
              itemCarrito.producto?.precio?.precioUnitarioSinIva *
              itemCarrito.cantidad;
          }
        });
      } else {
        totalPrecioSinIVA =
          itemCarrito.producto?.precio?.precioUnitarioSinIva *
          itemCarrito.cantidad;
      }

      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion) => {
          try {
            if (adicion["referencia"]["precioUnitario"]) {
              totalPrecioSinIVA +=
                adicion["cantidad"] *
                (adicion["referencia"]["precioUnitario"] ?? 1) *
                itemCarrito.cantidad;
            }
          } catch (error) {
            console.log("Pedido: ", adicion);
          }
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia) => {
          totalPrecioSinIVA +=
            preferencia["valorUnitarioSinIva"] * itemCarrito.cantidad;
        });
      }
      totalPrecioSinIVADef += totalPrecioSinIVA;
    });

    return totalPrecioSinIVADef;
  }
} 