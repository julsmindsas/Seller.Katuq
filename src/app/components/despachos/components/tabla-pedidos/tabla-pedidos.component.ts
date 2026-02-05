import { Component, EventEmitter, Input, OnInit, Output, ViewChild, OnChanges, SimpleChanges, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Table } from 'primeng/table';
import { LazyLoadEvent } from 'primeng/api';
import { Pedido, EstadoProceso, EstadoPago, EstadoProcesoFiltros } from '../../../ventas/modelo/pedido';
import { ColumnDefinition } from '../../interfaces/column-definition.interface';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FilterService, MenuItem } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { DialogService } from 'primeng/dynamicdialog';
import { EnviameHelperService } from '../enviame/services/enviame-helper.service';
import { TrackingDetailsModalComponent } from '../enviame/tracking-details/tracking-details-modal.component';
import { EnviameCancelModalComponent } from '../enviame/cancel-modal/enviame-cancel-modal.component';
import { EvidenciaEmpacadoModalComponent } from '../evidencia-empacado-modal/evidencia-empacado-modal.component';

@Component({
  selector: 'app-tabla-pedidos',
  templateUrl: './tabla-pedidos.component.html',
  styleUrls: ['./tabla-pedidos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TablaPedidosComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('dt1') dt1: Table;
  
  @Input() orders: Pedido[] = [];
  @Input() loading: boolean = true;
  @Input() estadosProcesos: EstadoProcesoFiltros[] = [];
  @Input() estadosPago: EstadoPago[] = [];
  
  // NEW - Lazy loading mode (2025.09.05)
  @Input() useLazyMode: boolean = false;  // Default false for backward compatibility
  @Input() totalRecords: number = 0;
  @Input() rowsPerPage: number = 50;  // Dynamic rows per page
  
  @Output() onViewDetails = new EventEmitter<Pedido>();
  @Output() onPrintPdf = new EventEmitter<Pedido>();
  @Output() onViewTags = new EventEmitter<Pedido>();
  @Output() onPrintLabel = new EventEmitter<Pedido>();
  @Output() onChangeStatus = new EventEmitter<{pedido: Pedido, status: number}>();
  @Output() onRefreshData = new EventEmitter<Table>();
  @Output() onClearFilters = new EventEmitter<Table>();
  @Output() onViewNotes = new EventEmitter<Pedido>();
  @Output() onViewFullObservaciones = new EventEmitter<any>();
  @Output() onTrackShipment = new EventEmitter<Pedido>();
  @Output() onFindShipment = new EventEmitter<Pedido>();

  // NEW - Enviame specific actions
  @Output() onEnviameTrackingDetails = new EventEmitter<Pedido>();
  @Output() onEnviameCancelShipment = new EventEmitter<Pedido>();
  @Output() onEnviameDownloadLabel = new EventEmitter<Pedido>();

  // NEW - Evidencia empacado action
  @Output() onUploadEvidenciaEmpacado = new EventEmitter<Pedido>();

  // NEW - Lazy loading output (2025.09.05)
  @Output() onLazyLoad = new EventEmitter<LazyLoadEvent>();
  
  // Debouncing properties for column filters
  private filterSubject = new Subject<{ value: string, filterCallback: Function }>();
  private filterSubscription: any;
  
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
    { field: 'seguimiento', header: 'Seguimiento', visible: true },
    { field: 'entregado', header: 'Entregado', visible: false }
  ];
  
  selectedColumns: ColumnDefinition[] = [];
  public rowMenuItems: MenuItem[];

  // Subject para cleanup de subscripciones (evita memory leaks)
  private destroy$ = new Subject<void>();

  constructor(
    private filterService: FilterService,
    private formBuilder: FormBuilder,
    private dialogService: DialogService,
    private enviameHelper: EnviameHelperService,
    private cdr: ChangeDetectorRef
  ) {
    // Cargar configuración guardada si existe
    const savedColumns = localStorage.getItem('despachosColumns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Fusionar columnas guardadas con columnas por defecto (para agregar nuevas columnas)
          const defaultColumns = [...this.displayedColumns];
          const savedFields = parsed.map((col: any) => col.field);

          // Agregar columnas nuevas que no existen en las guardadas
          const newColumns = defaultColumns.filter(col => !savedFields.includes(col.field));
          if (newColumns.length > 0) {
            console.log('📋 [Despachos] Nuevas columnas detectadas:', newColumns.map(c => c.field).join(', '));
            this.displayedColumns = [...parsed, ...newColumns];
          } else {
            this.displayedColumns = parsed;
          }
        }
      } catch (e) {
        console.error('Error parsing saved columns configuration', e);
      }
    }
    
    this.registerCustomFilters();
  }

  ngOnInit(): void {
    // Inicializar columnas seleccionadas
    this.selectedColumns = this.displayedColumns.filter(col => col.visible);
    
    // Setup debouncing for filter inputs
    this.filterSubscription = this.filterSubject.pipe(
      debounceTime(300), // Wait 300ms after the last event
      distinctUntilChanged((prev, curr) => prev.value === curr.value)
    ).subscribe(({ value, filterCallback }) => {
      filterCallback(value);
      console.log('🔍 TablaPedidos - Filter applied after debounce:', value);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cambios en rowsPerPage para sincronizar con la tabla
    if (changes['rowsPerPage'] && this.useLazyMode && this.dt1) {
      console.log(`🔄 TablaPedidos - rowsPerPage changed from ${changes['rowsPerPage'].previousValue} to ${changes['rowsPerPage'].currentValue}`);

      // Si hay una discrepancia entre el valor del input y el estado interno, corregirla
      if (changes['rowsPerPage'].currentValue !== this.rowsPerPage) {
        this.rowsPerPage = changes['rowsPerPage'].currentValue;
      }
    }

    // Marcar para detección de cambios cuando hay nuevos datos (OnPush strategy)
    if (changes['orders'] || changes['loading'] || changes['totalRecords']) {
      this.cdr.markForCheck();
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscription to avoid memory leaks
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
    // Emitir en destroy$ para cancelar todas las subscripciones pendientes
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Handles column filter input with debouncing
   * @param event - Input event from filter field
   * @param filterCallback - PrimeNG filter callback function
   */
  onColumnFilterInput(event: Event, filterCallback: Function): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterSubject.next({ value, filterCallback });
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
  
  // TrackBy functions para optimizar rendering de *ngFor
  trackByColumnField(index: number, col: ColumnDefinition): string {
    return col.field;
  }

  trackByPedidoId(index: number, pedido: Pedido): string {
    return pedido._id || pedido.nroPedido || `pedido-${index}`;
  }

  trackByCarritoIndex(index: number, item: any): string {
    return item?.productoId || item?.producto?._id || `carrito-${index}`;
  }

  trackByPreferenciaIndex(index: number, pref: any): string {
    return pref?.id || pref?.titulo || `pref-${index}`;
  }

  trackByAdicionIndex(index: number, adicion: any): string {
    return adicion?.id || adicion?.titulo || `adicion-${index}`;
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
  
  trackShipment(pedido: Pedido): void {
    this.onTrackShipment.emit(pedido);
  }
  
  findShipment(pedido: Pedido): void {
    this.onFindShipment.emit(pedido);
  }
  
  // Método para verificar si un pedido puede ser manipulado
  puedeManipularPedido(pedido: Pedido): boolean {
    // Los pedidos en estado "Sin Producir" no pueden ser manipulados
    if (pedido.estadoProceso === EstadoProceso.SinProducir) {
      return false;
    }
    return true;
  }

  public onRowMenuClick(event: Event, menu: any, pedido: Pedido): void {
    this.rowMenuItems = this.buildRowMenuItems(pedido);
    menu.toggle(event);
  }

  private buildRowMenuItems(pedido: Pedido): MenuItem[] {
    const puedeManipular = this.puedeManipularPedido(pedido);

    const items: MenuItem[] = [
      { label: 'Imprimir Pdf', icon: 'pi pi-file-pdf', command: () => this.printPdf(pedido) },
      { label: 'Rótulo', icon: 'pi pi-file', command: () => this.printLabel(pedido) }
    ];

    if (this.hasTags(pedido)) {
      items.push({ label: 'Tarjeta', icon: 'pi pi-tag', command: () => this.viewTags(pedido) });
    }

    items.push({ separator: true });

    // Evidencia de Empacado - Available for Empacado and Despachado states
    const canUploadEvidencia = pedido.estadoProceso === EstadoProceso.Empacado ||
                                pedido.estadoProceso === EstadoProceso.Despachado ||
                                pedido.estadoProceso === EstadoProceso.EnDespacho;

    if (canUploadEvidencia) {
      items.push({
        label: 'Subir Evidencia',
        icon: 'pi pi-camera',
        command: () => this.openEvidenciaEmpacadoModal(pedido)
      });
      items.push({ separator: true });
    }

    // Si está en SinProducir, solo puede cambiar a ProducidoTotalmente
    if (pedido.estadoProceso === EstadoProceso.SinProducir) {
      items.push({
        label: 'Producir Totalmente',
        icon: 'pi pi-cog',
        disabled: false,
        command: () => this.changeStatus(pedido, 0)
      });
    } else {
      // Para otros estados, mostrar todas las opciones disponibles
      
      // ProducirTotalmente: Disponible para estados que pueden ser producidos (excepto SinProducir)
      const puedeProducirTotalmente = puedeManipular && 
                                     pedido.estadoProceso !== EstadoProceso.Empacado && 
                                     pedido.estadoProceso !== EstadoProceso.Despachado && 
                                     pedido.estadoProceso !== EstadoProceso.Entregado &&
                                     pedido.estadoProceso !== EstadoProceso.EnDespacho &&
                                     pedido.estadoProceso !== EstadoProceso.ProducidoTotalmente;
      
      items.push({
        label: 'Producir Totalmente',
        icon: 'pi pi-cog',
        disabled: !puedeProducirTotalmente,
        command: () => { if (puedeProducirTotalmente) this.changeStatus(pedido, 0); }
      });

      // Empacar: Siempre visible pero deshabilitado en ciertos estados
      const puedeEmpacar = puedeManipular && 
                           pedido.estadoProceso !== EstadoProceso.Empacado && 
                           pedido.estadoProceso !== EstadoProceso.Despachado && 
                           pedido.estadoProceso !== EstadoProceso.Entregado &&
                           pedido.estadoProceso !== EstadoProceso.EnDespacho;
      
      items.push({
        label: 'Empacar',
        icon: 'pi pi-inbox',
        disabled: !puedeEmpacar,
        command: () => { if (puedeEmpacar) this.changeStatus(pedido, 1); }
      });

      if (pedido.estadoProceso === EstadoProceso.Empacado) {
        items.push({ label: 'Desempacar', icon: 'pi pi-box', command: () => this.changeStatus(pedido, 2) });
      }

      // Despachar: Siempre visible pero deshabilitado en ciertos estados
      const puedeDespachar = puedeManipular && 
                             pedido.estadoProceso !== EstadoProceso.Despachado && 
                             pedido.estadoProceso !== EstadoProceso.Entregado &&
                             pedido.estadoProceso !== EstadoProceso.EnDespacho;
      
      items.push({
        label: 'Despachar',
        icon: 'pi pi-send',
        disabled: !puedeDespachar,
        command: () => { if (puedeDespachar) this.changeStatus(pedido, 4); }
      });

      if (pedido.estadoProceso === EstadoProceso.Despachado) {
        items.push({ label: 'Entregar', icon: 'pi pi-check-circle', command: () => this.changeStatus(pedido, 5) });
      }
    }

    return items;
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

  // Helper para mostrar estados abreviados con tooltips
  getStatusDisplay(status: string): { short: string, full: string } {
    const statusMap: { [key: string]: { short: string, full: string } } = {
      'ProducidoTotalmente': { short: 'Prod. Total', full: 'Producido Totalmente' },
      'ProducidoParcialmente': { short: 'Prod. Parcial', full: 'Producido Parcialmente' },
      'SinProducir': { short: 'Sin Producir', full: 'Sin Producir' },
      'ParaDespachar': { short: 'P. Despachar', full: 'Para Despachar' },
      'Despachado': { short: 'Despachado', full: 'Despachado' },
      'Entregado': { short: 'Entregado', full: 'Entregado' },
      'Empacado': { short: 'Empacado', full: 'Empacado' },
      'Producido': { short: 'Producido', full: 'Producido' },
      'Rechazado': { short: 'Rechazado', full: 'Rechazado' },
      'Cerrado': { short: 'Cerrado', full: 'Cerrado' }
    };
    return statusMap[status] || { short: status, full: status };
  }

  // Helper para mostrar estados de pago abreviados con tooltips
  getPaymentStatusDisplay(status: string): { short: string, full: string } {
    const statusMap: { [key: string]: { short: string, full: string } } = {
      'Pospendiente': { short: 'Pendiente', full: 'Pospendiente' },
      'Pendiente': { short: 'Pendiente', full: 'Pendiente' },
      'PreAprobado': { short: 'Pre-Aprob.', full: 'Pre-Aprobado' },
      'Aprobado': { short: 'Aprobado', full: 'Aprobado' },
      'Rechazado': { short: 'Rechazado', full: 'Rechazado' },
      'Cancelado': { short: 'Cancelado', full: 'Cancelado' },
      'Precancelado': { short: 'Pre-Cancel', full: 'Pre-Cancelado' }
    };
    return statusMap[status] || { short: status, full: status };
  }

  // NEW - Lazy loading handler (2025.09.05)
  /**
   * Handles lazy loading events from PrimeNG table
   * Only emits events when useLazyMode is enabled
   * Now includes column filters and sorting for server-side processing
   * @since 2025.09.14 - Enhanced to properly log and emit sorting information
   */
  loadOrdersLazy(event: LazyLoadEvent): void {
    if (this.useLazyMode) {
      // Sincronizar rowsPerPage con el evento para mantener el estado del paginador
      if (event.rows && event.rows !== this.rowsPerPage) {
        console.log(`📏 TablaPedidos - Page size changed from ${this.rowsPerPage} to ${event.rows}`);
        this.rowsPerPage = event.rows;
      }

      // Enhanced logging to include filters and sorting
      console.log('🔄 TablaPedidos - Lazy load event with filters and sorting:', {
        first: event.first,
        rows: event.rows,
        rowsPerPage: this.rowsPerPage,
        page: Math.floor(event.first / (event.rows || this.rowsPerPage)) + 1,
        sortField: event.sortField,
        sortOrder: event.sortOrder,
        sortDirection: event.sortOrder === 1 ? 'ASC' : event.sortOrder === -1 ? 'DESC' : 'NONE',
        filters: event.filters,
        globalFilter: event.globalFilter
      });

      // Special logging for sorting changes
      if (event.sortField) {
        console.log(`📊 TablaPedidos - Sorting by "${event.sortField}" in ${event.sortOrder === 1 ? 'ascending' : 'descending'} order`);
      }

      // Emit complete event with filters and sorting for server-side processing
      this.onLazyLoad.emit(event);
    }
  }

  // =====================================
  // ENVIAME.IO SPECIFIC METHODS
  // =====================================

  /**
   * Checks if a pedido uses Enviame.io as shipping provider
   */
  isEnviameShipment(pedido: Pedido): boolean {
    return this.enviameHelper.isEnviameShipment(pedido);
  }

  /**
   * Checks if an Enviame shipment can be cancelled
   */
  canCancelEnviameShipment(pedido: Pedido): boolean {
    if (!this.isEnviameShipment(pedido)) return false;

    // Check if we have shipping tracking information
    const shippingNumber = pedido.shippingOrder;
    if (!shippingNumber) return false;

    // Use helper to check cancellation possibility based on current status
    const currentStatus = pedido.estadoProceso?.toString();
    return this.enviameHelper.canCancelShipment(currentStatus);
  }

  /**
   * Opens tracking details modal (TEMPORAL: Habilitado para TODOS los pedidos)
   * Detecta automáticamente el proveedor: Enviame, Servientrega, Interrapidísimo, etc.
   */
  openEnviameTrackingDetails(pedido: Pedido): void {
    // TEMPORAL: Comentado para permitir TODOS los pedidos
    // if (!this.isEnviameShipment(pedido)) {
    //   console.warn('⚠️ TablaPedidos - Attempted to open Enviame tracking for non-Enviame shipment');
    //   return;
    // }

    const trackingNumber = pedido?.shippment?.trackingNumber || pedido.shippingOrder || pedido.nroPedido; // Usar nroPedido como fallback

    // TEMPORAL: No requerir tracking number
    // if (!trackingNumber) {
    //   console.warn('⚠️ TablaPedidos - No tracking number found for shipment');
    //   return;
    // }

    console.log('🚀 TablaPedidos - Abriendo modal de tracking multiprovider para pedido:', {
      nroPedido: pedido.nroPedido,
      shippingOrder: pedido.shippingOrder,
      estadoProceso: pedido.estadoProceso,
      providerShipment: pedido.providerShipment
    });

    const ref = this.dialogService.open(TrackingDetailsModalComponent, {
      header: `Seguimiento de Envío - ${trackingNumber || 'Sin Guía'}`,
      width: '900px',
      modal: true,
      closable: true,
      data: {
        trackingNumber: trackingNumber,
        pedido: pedido,
        companyId: pedido.company || localStorage.getItem('x_idEmpresa') || localStorage.getItem('companyId')
      }
    });

    ref.onClose
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          console.log('🔄 TablaPedidos - Tracking modal closed with result:', result);
          // Refresh order data if needed
          this.onRefreshData.emit(this.dt1);
        }
      });

    // Emit event for parent component tracking
    this.onEnviameTrackingDetails.emit(pedido);
  }

  /**
   * Opens Enviame cancellation modal
   */
  openEnviameCancelModal(pedido: Pedido): void {
    if (!this.canCancelEnviameShipment(pedido)) {
      console.warn('⚠️ TablaPedidos - Cannot cancel this Enviame shipment');
      return;
    }

    const trackingNumber = pedido.shippingOrder;

    const ref = this.dialogService.open(EnviameCancelModalComponent, {
      header: `Cancelar Envío Enviame.io - ${trackingNumber}`,
      width: '600px',
      modal: true,
      closable: true,
      data: {
        trackingNumber: trackingNumber,
        pedido: pedido,
        companyId: pedido.company || localStorage.getItem('companyId')
      }
    });

    ref.onClose
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result && result.cancelled) {
          console.log('✅ TablaPedidos - Enviame shipment cancelled successfully');
          // Refresh order data
          this.onRefreshData.emit(this.dt1);
        }
      });

    // Emit event for parent component tracking
    this.onEnviameCancelShipment.emit(pedido);
  }

  /**
   * Downloads/views Enviame shipping label
   */
  downloadEnviameLabel(pedido: Pedido): void {
    if (!this.isEnviameShipment(pedido)) {
      console.warn('⚠️ TablaPedidos - Attempted to download label for non-Enviame shipment');
      return;
    }

    const trackingNumber = pedido.shippingOrder;
    if (!trackingNumber) {
      console.warn('⚠️ TablaPedidos - No tracking number found for Enviame shipment');
      return;
    }

    console.log('📄 TablaPedidos - Downloading Enviame label for:', trackingNumber);

    // Emit event for parent component to handle the actual download
    // The parent component should have access to LogisticaServiceV2
    this.onEnviameDownloadLabel.emit(pedido);
  }

  /**
   * Gets display information for Enviame shipments
   */
  getEnviameShipmentInfo(pedido: Pedido): {
    trackingNumber: string;
    status: string;
    canCancel: boolean;
    canTrack: boolean;
    canDownloadLabel: boolean;
  } {
    if (!this.isEnviameShipment(pedido)) {
      return {
        trackingNumber: '',
        status: '',
        canCancel: false,
        canTrack: false,
        canDownloadLabel: false
      };
    }

    const trackingNumber = pedido.shippingOrder || '';
    const status = pedido.estadoProceso?.toString() || '';

    return {
      trackingNumber,
      status,
      canCancel: this.canCancelEnviameShipment(pedido),
      canTrack: !!trackingNumber,
      canDownloadLabel: !!trackingNumber
    };
  }

  // =====================================
  // PRINDEL SPECIFIC METHODS
  // =====================================

  /**
   * Checks if a pedido uses Prindel as shipping provider
   */
  isPrindelShipment(pedido: Pedido): boolean {
    const transportador = pedido.transportador?.toLowerCase() || '';
    const providerShipment = pedido.providerShipment?.toLowerCase() || '';
    return transportador === 'prindel' || providerShipment === 'prindel';
  }

  /**
   * Checks if we can track a Prindel shipment
   * Prindel shipments can be tracked if estadoProceso is Despachado
   */
  canTrackPrindelShipment(pedido: Pedido): boolean {
    if (!this.isPrindelShipment(pedido)) return false;
    return pedido.estadoProceso === 'Despachado';
  }

  /**
   * Opens tracking for Prindel shipments
   */
  openPrindelTracking(pedido: Pedido): void {
    console.log('📍 TablaPedidos - Opening Prindel tracking for pedido:', pedido.nroPedido);
    this.onTrackShipment.emit(pedido);
  }

  // =====================================
  // EVIDENCIA EMPACADO METHODS
  // =====================================

  /**
   * Opens the evidencia empacado modal for uploading packing evidence photos
   */
  openEvidenciaEmpacadoModal(pedido: Pedido): void {
    console.log('📸 TablaPedidos - Opening evidencia empacado modal for pedido:', pedido.nroPedido);

    const ref = this.dialogService.open(EvidenciaEmpacadoModalComponent, {
      header: `Evidencia de Empacado - Pedido ${pedido.nroPedido}`,
      width: '900px',
      modal: true,
      closable: true,
      data: {
        pedido: pedido,
        companyId: pedido.company || localStorage.getItem('x_idEmpresa') || localStorage.getItem('companyId')
      }
    });

    ref.onClose
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result && result.updated) {
          console.log('✅ TablaPedidos - Evidencia empacado modal closed with update');
          // Refresh order data
          this.onRefreshData.emit(this.dt1);
        }
      });

    // Emit event for parent component tracking
    this.onUploadEvidenciaEmpacado.emit(pedido);
  }
}