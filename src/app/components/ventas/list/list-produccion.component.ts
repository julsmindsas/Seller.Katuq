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
  readonly fixedFields = ['imagen', 'producto', 'descripcion', 'opciones'];


  constructor(private ventasService: VentasService, private toastrService: ToastrService) {}

  ngOnInit(): void {
    this.initializeFilterArrays();
    this.transformPedidosToProductsView();
    this.loadColumnConfiguration();
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
        referencia: carrito.producto?.identificacion?.referencia || '-',
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
        fechaEntrega: (pedido.carrito && pedido.carrito.length > 0) ? this.convertFechaEntregaString(pedido.carrito[0]?.configuracion?.datosEntrega?.fechaEntrega) : '',
        fechaCreacion: pedido.fechaCreacion,
        ciudad: pedido.envio?.ciudad,
        zonaCobro: pedido.envio?.zonaCobro,
        formaEntrega: carrito.configuracion?.datosEntrega?.formaEntrega,
        horarioEntrega: carrito.configuracion?.datosEntrega?.horarioEntrega,
        channel: pedido.channel,
        vendedor: pedido.asesorAsignado?.name,
        pedidoOriginal: pedido,
        carritoOriginal: carrito,
        revisadoParaProduccion: pedido.revisadoParaProduccion,
        // Propiedades planas para ordenamiento
        productoTitulo: carrito.producto?.crearProducto?.titulo || '',
        clienteNombre: pedido.cliente?.nombres_completos || '',
        ultimaImpresion: pedido.ultimaImpresion
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
    this.selectedColumns = newSelected;
    this.saveColumnConfiguration();
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

  convertFechaEntregaString(fechaEntrega: {
    day: number;
    month: number;
    year: number;
  }): string {
    if (!fechaEntrega) {
      return '';
    }
    return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
  }

  private initializeFilterArrays(): void {
    // Estados de proceso para producción
    this.estadosProcesos = Object.values(EstadoProcesoFiltros);
    if (this.isFromProduction) {
      this.estadosProcesos = this.estadosProcesos.filter(estado => 
        estado === EstadoProcesoFiltros.SinProducir || 
        estado === EstadoProcesoFiltros.EnProduccion || 
        estado === EstadoProcesoFiltros.ProducidoParcialmente ||
        estado === EstadoProcesoFiltros.ProducidoTotalmente
      );
    }
    
    // Opciones de validación
    this.validaciones = [
      { value: true, nombre: 'Validado' },
      { value: false, nombre: 'No validado' }
    ];
  }

  private loadColumnConfiguration(): void {
    const savedColumns = localStorage.getItem('produccionColumnsConfig');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validar que las columnas guardadas coincidan con las actuales
          const validColumns = parsed.filter(savedCol => 
            this.displayedColumns.some(displayCol => displayCol.field === savedCol.field)
          );
          if (validColumns.length > 0) {
            this.selectedColumns = validColumns;
            // Emitir cambios al componente padre para mantener sincronización
            this.onColumnSelectionChange.emit(validColumns);
          }
        }
      } catch (e) {
        console.error('Error parsing saved production columns configuration', e);
      }
    }
  }

  private saveColumnConfiguration(): void {
    if (this.selectedColumns && this.selectedColumns.length > 0) {
      localStorage.setItem('produccionColumnsConfig', JSON.stringify(this.selectedColumns));
    }
  }

  resetColumnConfiguration(): void {
    localStorage.removeItem('produccionColumnsConfig');
    // Restaurar configuración por defecto - mostrar solo columnas fijas y las visibles por defecto
    const defaultColumns = this.displayedColumns.filter(col => 
      this.fixedFields.includes(col.field) || col.visible
    );
    this.handleColumnSelectionChange(defaultColumns);
  }

  checkIfUserIsBrenda(): boolean {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const isBrenda = (userData.email === 'brendazora@almara.com.co' || userData.email === 'gerencia@almara.com.co');
    console.log('🔍 Verificando usuario Brenda:', { email: userData.email, isBrenda });
    return isBrenda;
  }

  customSort(event: any): void {
    const { data, field, order } = event;

    if (field === 'revisadoParaProduccion') {
      // Ordenamiento personalizado para revisadoParaProduccion
      data.sort((a: any, b: any) => {
        const aValue = a.pedidoOriginal?.revisadoParaProduccion || '';
        const bValue = b.pedidoOriginal?.revisadoParaProduccion || '';

        // Los vacíos van primero cuando es ascendente, al final cuando es descendente
        if (!aValue && bValue) return order === 1 ? -1 : 1;
        if (aValue && !bValue) return order === 1 ? 1 : -1;

        // Si ambos tienen valor o ambos están vacíos, ordenar alfabéticamente
        return aValue.localeCompare(bValue) * order;
      });
    } else {
      // Ordenamiento estándar para otros campos
      data.sort((a: any, b: any) => {
        let aValue = a[field];
        let bValue = b[field];

        // Manejo especial para campos anidados
        if (field === 'productoTitulo') {
          aValue = a.producto?.crearProducto?.titulo || '';
          bValue = b.producto?.crearProducto?.titulo || '';
        } else if (field === 'clienteNombre') {
          aValue = a.cliente?.nombres_completos || '';
          bValue = b.cliente?.nombres_completos || '';
        }

        // Convertir a string para comparación segura
        aValue = String(aValue || '');
        bValue = String(bValue || '');

        return aValue.localeCompare(bValue) * order;
      });
    }
  }

} 