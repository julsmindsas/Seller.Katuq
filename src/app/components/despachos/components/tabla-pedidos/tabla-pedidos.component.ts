import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { Pedido, EstadoProceso, EstadoPago, EstadoProcesoFiltros } from '../../../ventas/modelo/pedido';
import { ColumnDefinition } from '../../interfaces/column-definition.interface';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FilterService } from 'primeng/api';

@Component({
  selector: 'app-tabla-pedidos',
  templateUrl: './tabla-pedidos.component.html',
  styleUrls: ['./tabla-pedidos.component.scss']
})
export class TablaPedidosComponent implements OnInit {
  @ViewChild('dt1') dt1: Table;
  
  @Input() orders: Pedido[] = [];
  @Input() loading: boolean = true;
  @Input() estadosProcesos: EstadoProcesoFiltros[] = [];
  @Input() estadosPago: EstadoPago[] = [];
  
  @Output() onViewDetails = new EventEmitter<Pedido>();
  @Output() onPrintPdf = new EventEmitter<Pedido>();
  @Output() onViewTags = new EventEmitter<Pedido>();
  @Output() onPrintLabel = new EventEmitter<Pedido>();
  @Output() onChangeStatus = new EventEmitter<{pedido: Pedido, status: number}>();
  @Output() onRefreshData = new EventEmitter<Table>();
  @Output() onClearFilters = new EventEmitter<Table>();
  @Output() onViewNotes = new EventEmitter<Pedido>();
  @Output() onViewFullObservaciones = new EventEmitter<any>();
  
  displayedColumns: ColumnDefinition[] = [
    { field: 'detalles', header: 'Detalles', visible: true },
    { field: 'opciones', header: 'Opciones', visible: true },
    { field: 'nroPedido', header: 'Número de Pedido', visible: true },
    { field: 'nroFactura', header: 'Número de Factura', visible: true },
    { field: 'shippingOrder', header: 'Número orden de envío', visible: true },
    { field: 'estadoPago', header: 'Estado de Pago', visible: true },
    { field: 'estadoProceso', header: 'Estado de Proceso', visible: true },
    { field: 'cliente', header: 'Cliente', visible: true },
    { field: 'totalEnvio', header: 'Domicilio', visible: true },
    { field: 'faltaPorPagar', header: 'Falta por Pagar', visible: true },
    { field: 'fechaCreacion', header: 'Fecha de Compra', visible: true },
    { field: 'ciudad', header: 'Ciudad', visible: true },
    { field: 'zonaCobro', header: 'Zona de Entrega', visible: true },
    { field: 'observaciones', header: 'Observaciones de Entrega', visible: false },
    { field: 'fechaEntrega', header: 'Fecha de Entrega', visible: true },
    { field: 'formaEntrega', header: 'Forma de Entrega', visible: true },
    { field: 'horarioEntrega', header: 'Horario de Entrega', visible: true },
    { field: 'fechaHoraEmpacado', header: 'Fecha y Horario de Empacado', visible: false },
    { field: 'fechaYHorarioDespachado', header: 'Fecha y Horario de Despachado', visible: false },
    { field: 'asesorAsignado', header: 'Vendedor', visible: false },
    { field: 'empacador', header: 'Empacador', visible: false },
    { field: 'despachador', header: 'Despachador', visible: false },
    { field: 'transportador', header: 'Transportador', visible: false },
    { field: 'entregado', header: 'Entregado', visible: false }
  ];
  
  selectedColumns: ColumnDefinition[] = [];
  
  constructor(
    private filterService: FilterService,
    private formBuilder: FormBuilder
  ) {
    // Cargar configuración guardada si existe
    const savedColumns = localStorage.getItem('despachosColumns');
    if (savedColumns) {
      try {
        this.displayedColumns = JSON.parse(savedColumns);
      } catch (e) {
        console.error('Error parsing saved columns configuration', e);
      }
    }
    
    this.registerCustomFilters();
  }

  ngOnInit(): void {
    // Inicializar columnas seleccionadas
    this.selectedColumns = this.displayedColumns.filter(col => col.visible);
  }
  
  // Métodos para registrar filtros personalizados
  private registerCustomFilters() {
    this.filterService.register('horarioEntregaCustom', (value, filter): boolean => {
      if (!filter) return true;
      if (value === undefined || value === null) return false;
      
      return filter.some((item) => {
        const filterString = "Pedido: " + item.nroPedido + ' - ' + item.horarioEntrega;
        return value.includes(item.horarioEntrega.toString());
      });
    });

    this.filterService.register('customDate', (value, filter): boolean => {
      if (filter === undefined || filter === null) return true;
      if (value === undefined || value === null) return false;
      
      return new Date(value).getTime() === filter.getTime();
    });
  }
  
  // Métodos de control de columnas
  isColumnVisible(field: string): boolean {
    return this.selectedColumns.some(col => col.field === field);
  }
  
  onColumnSelectionChange(): void {
    // Actualizar la propiedad visible en displayedColumns basado en selectedColumns
    this.displayedColumns.forEach(col => {
      col.visible = this.selectedColumns.some(selected => selected.field === col.field);
    });
    
    // Guardar la configuración en localStorage
    localStorage.setItem('despachosColumns', JSON.stringify(this.displayedColumns));
  }
  
  resetColumnConfig(): void {
    this.displayedColumns = [
      { field: 'detalles', header: 'Detalles', visible: true },
      { field: 'opciones', header: 'Opciones', visible: true },
      { field: 'nroPedido', header: 'Número de Pedido', visible: true },
      { field: 'nroFactura', header: 'Número de Factura', visible: true },
      { field: 'shippingOrder', header: 'Número orden de envío', visible: true },
      { field: 'estadoPago', header: 'Estado de Pago', visible: true },
      { field: 'estadoProceso', header: 'Estado de Proceso', visible: true },
      { field: 'cliente', header: 'Cliente', visible: true },
      { field: 'totalEnvio', header: 'Domicilio', visible: true },
      { field: 'faltaPorPagar', header: 'Falta por Pagar', visible: true },
      { field: 'fechaCreacion', header: 'Fecha de Compra', visible: true },
      { field: 'ciudad', header: 'Ciudad', visible: true },
      { field: 'zonaCobro', header: 'Zona de Entrega', visible: true },
      { field: 'observaciones', header: 'Observaciones de Entrega', visible: false },
      { field: 'fechaEntrega', header: 'Fecha de Entrega', visible: true },
      { field: 'formaEntrega', header: 'Forma de Entrega', visible: true },
      { field: 'horarioEntrega', header: 'Horario de Entrega', visible: true },
      { field: 'fechaHoraEmpacado', header: 'Fecha y Horario de Empacado', visible: false },
      { field: 'fechaYHorarioDespachado', header: 'Fecha y Horario de Despachado', visible: false },
      { field: 'asesorAsignado', header: 'Vendedor', visible: false },
      { field: 'empacador', header: 'Empacador', visible: false },
      { field: 'despachador', header: 'Despachador', visible: false },
      { field: 'transportador', header: 'Transportador', visible: false },
      { field: 'entregado', header: 'Entregado', visible: false }
    ];
    this.selectedColumns = this.displayedColumns.filter(col => col.visible);
    localStorage.setItem('despachosColumns', JSON.stringify(this.displayedColumns));
  }
  
  // Métodos de utilidad
  getVisibleColumnsCount(): number {
    return this.selectedColumns.length;
  }
  
  getVisibleColumnFields(): string[] {
    return this.selectedColumns.map(col => col.field);
  }
  
  // Handlers de eventos
  onRefresh() {
    // Emitir evento para notificar al componente padre que debe refrescar los datos
    this.onRefreshData.emit(this.dt1);
  }
  
  onClear() {
    // Limpiar filtros y emitir evento para notificar al componente padre
    this.dt1.clear();
    this.onClearFilters.emit(this.dt1);
  }
  
  // Helpers para componente padre
  hasTags(pedido: Pedido): boolean {
    if (!pedido.carrito || pedido.carrito.length === 0) {
      return false;
    }
    
    let hasTags = false;
    pedido.carrito.forEach(producto => {
      if (producto.configuracion && producto.configuracion.tarjetas) {
        producto.configuracion.tarjetas.forEach(tarj => {
          if ((tarj.de && tarj.de !== "") || 
              (tarj.para && tarj.para !== "") || 
              (tarj.mensaje && tarj.mensaje !== "")) {
            hasTags = true;
          }
        });
      }
    });
    
    return hasTags;
  }
  
  // Métodos para emitir eventos
  viewDetails(pedido: Pedido): void {
    this.onViewDetails.emit(pedido);
  }
  
  printPdf(pedido: Pedido): void {
    this.onPrintPdf.emit(pedido);
  }
  
  viewTags(pedido: Pedido): void {
    this.onViewTags.emit(pedido);
  }
  
  printLabel(pedido: Pedido): void {
    this.onPrintLabel.emit(pedido);
  }
  
  changeStatus(pedido: Pedido, status: number): void {
    this.onChangeStatus.emit({ pedido, status });
  }
  
  viewNotes(pedido: Pedido): void {
    this.onViewNotes.emit(pedido);
  }
  
  viewFullObservaciones(envioData: any): void {
    this.onViewFullObservaciones.emit(envioData);
  }
  
  // Métodos para hacer cálculos
  calculateTotalEnvio(orders: Pedido[]): number {
    return orders.reduce((acc, pedido) => acc + (pedido.totalEnvio ?? 0), 0);
  }
  
  calculateFaltaPorPagar(orders: Pedido[]): number {
    return orders.reduce((acc, pedido) => acc + (pedido.faltaPorPagar ?? 0), 0);
  }
  
  // Helper para conversión de fechas
  convertFechaEntregaString(fechaEntrega: { day: number, month: number, year: number }): string {
    if (!fechaEntrega) return '';
    return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
  }
} 