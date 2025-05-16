import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Pedido } from '../../../ventas/modelo/pedido';
import { LogisticaServiceV2 } from '../../../../shared/services/despachos/logistica.service.v2';

interface ColumnDefinition {
  field: string;
  header: string;
  visible: boolean;
}

@Component({
  selector: 'app-generar-orden',
  templateUrl: './generar-orden.component.html',
  styleUrls: ['./generar-orden.component.scss']
})
export class GenerarOrdenComponent implements OnInit {
  @Input() orders: Pedido[] = [];
  @Input() pedidosSeleccionados: Pedido[] = [];
  @Input() nuevaOrdenEnvio: any;
  @Input() nroShippingOrder: string;
  @Input() isEditMode: boolean = false;
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();
  @Output() onAddOrder = new EventEmitter<Pedido>();
  @Output() onRemoveOrder = new EventEmitter<Pedido>();
  @Output() onPrintOrder = new EventEmitter<void>();
  @Output() onDispatchOrder = new EventEmitter<void>();
  
  ordenEnvioForm: FormGroup;
  metodoEnvio: string;
  pedidosDisponibles: Pedido[] = [];
  transportadores: any[] = [];
  actionColumnVisible = true;
  
  // Definición de columnas para la tabla de pedidos disponibles
  displayedColumns: ColumnDefinition[] = [
    { field: 'nroPedido', header: 'Nro. Pedido', visible: true },
    { field: 'cliente', header: 'Cliente', visible: true },
    { field: 'ciudad', header: 'Ciudad', visible: true },
    { field: 'direccionEntrega', header: 'Dirección', visible: true },
    { field: 'faltaPorPagar', header: 'Valor a Cobrar', visible: true },
    { field: 'horarioEntrega', header: 'Horario Entrega', visible: false },
    { field: 'formaEntrega', header: 'Forma Entrega', visible: false },
    { field: 'estadoProceso', header: 'Estado', visible: false },
    { field: 'accion', header: 'Acción', visible: true }
  ];
  
  selectedColumns: ColumnDefinition[] = [];
  
  constructor(
    private formBuilder: FormBuilder,
    private logisticaService: LogisticaServiceV2
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.selectedColumns = this.displayedColumns.filter(col => col.visible);
    
    // Inicializar datos según el modo (creación o edición)
    if (this.isEditMode && this.nuevaOrdenEnvio) {
      // En modo edición, cargar los datos de la orden existente
      this.metodoEnvio = 'mensajeroPropio'; // O el valor correspondiente según los datos
      
      // Inicializar el formulario con los valores de la orden existente
      this.ordenEnvioForm.patchValue({
        fechaEnvio: this.formatDateForInput(this.nuevaOrdenEnvio.fecha),
        metodoEnvio: 'mensajeroPropio' // O el valor que corresponda
      });
      
      // Refrescar la lista de pedidos disponibles
      this.actualizarPedidosDisponibles();
    } else {
      // En modo creación, inicializar con valores por defecto
      if (this.nroShippingOrder) {
        // Si ya hay un número de orden, es porque se está editando después de guardar
        this.actualizarPedidosDisponibles();
      }
    }
  }
  
  private initForm(): void {
    this.ordenEnvioForm = this.formBuilder.group({
      fechaEnvio: ['', Validators.required],
      metodoEnvio: ['', Validators.required]
    });
    
    // Suscribirse a cambios en metodoEnvio
    this.ordenEnvioForm.get('metodoEnvio')?.valueChanges
      .subscribe(value => {
        this.metodoEnvio = value;
        if (value && this.ordenEnvioForm.get('fechaEnvio')?.valid) {
          this.actualizarPedidosDisponibles();
        }
      });
    
    // Cargar transportadores
    this.cargarTransportadores();
  }
  
  private cargarTransportadores(): void {
    this.logisticaService.getTransportadores().subscribe(
      (data) => {
        this.transportadores = data;
      },
      (error) => {
        console.error('Error al cargar transportadores:', error);
      }
    );
  }
  
  actualizarPedidosDisponibles(): void {
    this.pedidosDisponibles = this.loadPedidosDisponibles();
  }
  
  loadPedidosDisponibles(): Pedido[] {
    const fechaEnvioValue = this.ordenEnvioForm.get('fechaEnvio')?.value;
    if (!fechaEnvioValue) {
      return [];
    }
    
    console.log('Tipo de fecha input:', typeof fechaEnvioValue, 'Valor:', fechaEnvioValue);
    
    try {
      // Para evitar problemas con timezone, vamos a trabajar solo con la parte del string de fecha
      // El formato del input date es 'YYYY-MM-DD'
      let fechaSeleccionada = '';
      if (typeof fechaEnvioValue === 'string') {
        // Si es string, tomamos solo la parte de la fecha (YYYY-MM-DD)
        fechaSeleccionada = fechaEnvioValue.split('T')[0];
      } else {
        // Si es un objeto Date, lo convertimos a string en formato YYYY-MM-DD
        const d = new Date(fechaEnvioValue);
        // Usamos UTC para evitar problemas de timezone
        fechaSeleccionada = [
          d.getFullYear(),
          ('0' + (d.getMonth() + 1)).slice(-2), // Mes en formato 01-12
          ('0' + d.getDate()).slice(-2)         // Día en formato 01-31
        ].join('-');
      }
      
      console.log('Fecha seleccionada normalizada para comparación:', fechaSeleccionada);
      
      // Usamos la fecha seleccionada directamente como string para comparar
      const pedidosFiltrados = this.orders.filter(o => {
        try {
          // Verificar si la fecha de entrega existe
          if (!o.fechaEntrega) {
            return false;
          }
          
          // Normalizar la fecha del pedido a formato YYYY-MM-DD
          let fechaPedidoStr = '';
          
          if (typeof o.fechaEntrega === 'string') {
            // Si es un string ISO (2023-05-15T00:00:00.000Z)
            fechaPedidoStr = o.fechaEntrega.split('T')[0];
          } else {
            // Si es un objeto Date
            const fechaPedido = new Date(o.fechaEntrega);
            fechaPedidoStr = [
              fechaPedido.getFullYear(),
              ('0' + (fechaPedido.getMonth() + 1)).slice(-2),
              ('0' + fechaPedido.getDate()).slice(-2)
            ].join('-');
          }
          
          console.log(`Pedido ${o.nroPedido} - Fecha entrega: ${o.fechaEntrega}, Normalizada: ${fechaPedidoStr}`);
          
          // Verificar si el pedido ya está seleccionado
          const yaSeleccionado = this.pedidosSeleccionados.some(p => p.nroPedido === o.nroPedido);
          
          // Verificar todas las condiciones
          const fechasCoinciden = fechaPedidoStr === fechaSeleccionada;
          const estadoValido = (o.estadoProceso !== 'Entregado' && o.estadoProceso !== 'Despachado');
          const formaEntregaValida = (o.formaEntrega ? o.formaEntrega.toLocaleUpperCase().includes('DOMICILIO') : false);
          
          console.log(`Pedido ${o.nroPedido} - ¿Fechas coinciden?: ${fechasCoinciden} (${fechaPedidoStr} === ${fechaSeleccionada})`);
          console.log(`Pedido ${o.nroPedido} - Estado: ${estadoValido}(${o.estadoProceso}), Forma entrega: ${formaEntregaValida}(${o.formaEntrega})`);
          
          return fechasCoinciden && estadoValido && formaEntregaValida && !yaSeleccionado;
        } catch (err) {
          console.error('Error al procesar pedido:', o.nroPedido, err);
          return false;
        }
      });
      
      console.log('Pedidos filtrados:', pedidosFiltrados.length);
      return pedidosFiltrados;
    } catch (err) {
      console.error('Error general en loadPedidosDisponibles:', err);
      return [];
    }
  }
  
  agregarPedido(pedido: Pedido): void {
    this.onAddOrder.emit(pedido);
    // Actualizar pedidos disponibles después de agregar uno
    this.actualizarPedidosDisponibles();
  }
  
  retirarPedido(pedido: Pedido): void {
    this.onRemoveOrder.emit(pedido);
    // Actualizar pedidos disponibles después de retirar uno
    this.actualizarPedidosDisponibles();
  }
  
  closeModal(): void {
    this.onClose.emit();
  }
  
  guardarOrden(): void {
    if (this.ordenEnvioForm.invalid || this.pedidosSeleccionados.length === 0) {
      return;
    }
    
    const ordenData = {
      ...this.ordenEnvioForm.value,
      pedidos: this.pedidosSeleccionados
    };
    
    this.onSave.emit(ordenData);
  }
  
  imprimirOrden(): void {
    this.onPrintOrder.emit();
  }
  
  despacharOrden(): void {
    this.onDispatchOrder.emit();
  }
  
  shouldDisplayPedido(pedido: any): boolean {
    return (
      (pedido.transportador === undefined || pedido.transportador === null) &&
      pedido.formaEntrega === 'Envío a Domicilio' &&
      !this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)
    );
  }
  
  // Método para facilitar el acceso a propiedades anidadas para la tabla
  getNestedProperty(pedido: any, field: string): any {
    switch (field) {
      case 'cliente':
        return pedido.cliente?.nombres_completos || 
               pedido.cliente?.nombres || 
               (pedido.cliente ? `${pedido.cliente.nombres || ''} ${pedido.cliente.apellidos || ''}` : 'N/A');
      case 'ciudad':
        return pedido.envio?.ciudad || 'N/A';
      case 'direccionEntrega':
        return pedido.envio?.direccionEntrega || 'N/A';
      case 'nroPedido':
      case 'formaEntrega':
      case 'horarioEntrega':
      case 'estadoProceso':
      case 'faltaPorPagar':
        return pedido[field] || 'N/A';
      default:
        return 'N/A';
    }
  }
  
  // Método para actualizar la selección de columnas
  onColumnSelectionChange(): void {
    this.displayedColumns.forEach(col => {
      col.visible = this.selectedColumns.some(selected => selected.field === col.field);
    });
    this.updateActionColumnVisible();
  }
  
  // Método para verificar si la columna de acción está visible
  updateActionColumnVisible(): void {
    this.actionColumnVisible = this.selectedColumns.some(col => col.field === 'accion');
  }
  
  // Método para verificar si una columna específica está visible
  isColumnVisible(field: string): boolean {
    return this.selectedColumns.some(col => col.field === field);
  }
  
  // Método específico para verificar si la columna de acción está visible
  isActionColumnVisible(): boolean {
    return this.actionColumnVisible;
  }
  
  // Método auxiliar para formatear fechas para inputs de tipo date
  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }
} 