import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EstadoProceso, Pedido } from '../../../ventas/modelo/pedido';
import { LogisticaServiceV2 } from '../../../../shared/services/despachos/logistica.service.v2';
import Swal from 'sweetalert2';

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
    { field: 'enOrden', header: 'Estado en Orden', visible: true },
    { field: 'horarioEntrega', header: 'Horario Entrega', visible: false },
    { field: 'formaEntrega', header: 'Forma Entrega', visible: false },
    { field: 'estadoProceso', header: 'Estado', visible: false },
    { field: 'accion', header: 'Acción', visible: true }
  ];

  selectedColumns: ColumnDefinition[] = [];
  ordenesExistentes: any[] = []; // Para almacenar las órdenes existentes y verificar duplicados
  mostrarPedidosEnOrdenes: boolean = false; // Controla si mostrar pedidos que ya están en órdenes
  pedidosMovidos: Map<string, string> = new Map(); // Mapa para rastrear pedidos movidos: nroPedido -> ordenAnterior
  hayPedidosMovidos: boolean = false; // Flag para indicar si hay pedidos movidos

  constructor(
    private formBuilder: FormBuilder,
    private logisticaService: LogisticaServiceV2
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.selectedColumns = this.displayedColumns.filter(col => col.visible);
    this.cargarOrdenesExistentes();

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

  private cargarOrdenesExistentes(): void {
    // Cargar todas las órdenes existentes para verificar duplicados
    this.logisticaService.getShippingOrders().subscribe(
      (ordenes) => {
        this.ordenesExistentes = ordenes || [];
        console.log('Órdenes existentes cargadas:', this.ordenesExistentes.length);
      },
      (error) => {
        console.error('Error al cargar órdenes existentes:', error);
        this.ordenesExistentes = [];
        Swal.fire({
          icon: 'warning',
          title: 'Advertencia',
          text: 'No se pudieron cargar las órdenes existentes. Algunas funciones pueden no estar disponibles.',
          timer: 3000,
          showConfirmButton: false
        });
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



          // Verificar si el pedido ya está seleccionado en la orden actual
          const yaSeleccionado = this.pedidosSeleccionados.some(p => p.nroPedido === o.nroPedido);

          // Verificar todas las condiciones
          const fechasCoinciden = fechaPedidoStr === fechaSeleccionada;
          const estadoValido = (o.estadoProceso !== EstadoProceso.Entregado && o.estadoProceso !== EstadoProceso.Despachado && o.estadoProceso !== EstadoProceso.SinProducir);
          const formaEntregaValida = (o.carrito ? o.carrito[0].configuracion?.datosEntrega.formaEntrega.toLocaleUpperCase().includes('DOMICILIO') : false);



          // Verificar si el pedido existe en otra orden
          const existeEnOtraOrden = this.pedidoExisteEnOrden(o);
          
          // Si no queremos mostrar pedidos en órdenes y este pedido está en una orden, ocultarlo
          if (!this.mostrarPedidosEnOrdenes && existeEnOtraOrden) {
            return false;
          }
          
          return fechasCoinciden && estadoValido && formaEntregaValida && !yaSeleccionado;
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al procesar pedido: ' + o.nroPedido + ' - ' + err
          });
          console.error('Error al procesar pedido:', o.nroPedido, err);
          return false;
        }
      });


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
    // Si es un pedido movido, quitarlo del tracking
    if (this.pedidosMovidos.has(pedido.nroPedido)) {
      this.pedidosMovidos.delete(pedido.nroPedido);
      // Actualizar flag de pedidos movidos
      this.hayPedidosMovidos = this.pedidosMovidos.size > 0;
    }
    
    this.onRemoveOrder.emit(pedido);
    // Actualizar pedidos disponibles después de retirar uno
    this.actualizarPedidosDisponibles();
  }

  closeModal(): void {
    // Limpiar estado de pedidos movidos al cerrar
    this.limpiarEstadoPedidosMovidos();
    this.onClose.emit();
  }

  // Método para limpiar el estado de pedidos movidos
  private limpiarEstadoPedidosMovidos(): void {
    this.pedidosMovidos.clear();
    this.hayPedidosMovidos = false;
  }

  guardarOrden(): void {
    if (this.ordenEnvioForm.invalid || this.pedidosSeleccionados.length === 0) {
      return;
    }

    // Si hay pedidos movidos, mostrar confirmación adicional
    if (this.hayPedidosMovidos) {
      const listaPedidosMovidos = Array.from(this.pedidosMovidos.entries())
        .map(([nroPedido, ordenAnterior]) => `#${nroPedido} (desde orden ${ordenAnterior})`)
        .join(', ');

      Swal.fire({
        title: 'Confirmar cambios',
        html: `
          <div class="text-start">
            <p>Esta acción realizará los siguientes cambios:</p>
            <ul>
              <li><strong>Pedidos movidos:</strong> ${listaPedidosMovidos}</li>
              <li>Estos pedidos serán removidos de sus órdenes anteriores</li>
              <li>Se ${this.nroShippingOrder ? 'actualizará' : 'creará'} la orden actual</li>
            </ul>
            <div class="alert alert-warning mt-3">
              <i class="pi pi-exclamation-triangle me-2"></i>
              Esta acción no se puede deshacer automáticamente.
            </div>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar cambios',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.ejecutarGuardarOrden();
        }
      });
    } else {
      this.ejecutarGuardarOrden();
    }
  }

  private ejecutarGuardarOrden(): void {
    const ordenData = {
      ...this.ordenEnvioForm.value,
      pedidos: this.pedidosSeleccionados,
      pedidosMovidos: Array.from(this.pedidosMovidos.entries()).map(([nroPedido, ordenAnterior]) => ({
        nroPedido,
        ordenAnterior
      }))
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

  // Método para verificar si un pedido ya existe en una orden
  pedidoExisteEnOrden(pedido: Pedido): boolean {
    if (!this.ordenesExistentes || this.ordenesExistentes.length === 0) {
      return false;
    }

    try {
      const existe = this.ordenesExistentes.some(orden => {
        // Obtener el número de orden correctamente - maneja múltiples formatos
        const numeroOrden = this.getNumeroOrdenFromObject(orden);
        
        // Excluir la orden actual si estamos en modo edición
        if (this.isEditMode && String(numeroOrden) === String(this.nroShippingOrder)) {
          return false;
        }

        // Verificar si el pedido está en esta orden - maneja múltiples formatos
        const pedidosOrden = this.getPedidosFromOrden(orden);
        return pedidosOrden.some((p: any) => {
          const nroPedidoOrden = p.nroPedido || p.numero || p.id || p.orderNumber;
          return String(nroPedidoOrden) === String(pedido.nroPedido);
        });
      });

      return existe;
    } catch (error) {
      console.error('Error verificando si pedido existe en orden:', error, pedido);
      return false;
    }
  }

  // Método para obtener el número de orden donde existe el pedido
  getNumeroOrdenPedido(pedido: Pedido): string {
    if (!this.ordenesExistentes || this.ordenesExistentes.length === 0) {
      return '';
    }

    try {
      const ordenEncontrada = this.ordenesExistentes.find(orden => {
        // Obtener el número de orden correctamente
        const numeroOrden = this.getNumeroOrdenFromObject(orden);
        
        // Excluir la orden actual si estamos en modo edición
        if (this.isEditMode && String(numeroOrden) === String(this.nroShippingOrder)) {
          return false;
        }

        // Verificar si el pedido está en esta orden
        const pedidosOrden = this.getPedidosFromOrden(orden);
        return pedidosOrden.some((p: any) => {
          const nroPedidoOrden = p.nroPedido || p.numero || p.id || p.orderNumber;
          return String(nroPedidoOrden) === String(pedido.nroPedido);
        });
      });

      return ordenEncontrada ? String(this.getNumeroOrdenFromObject(ordenEncontrada)) : '';
    } catch (error) {
      console.error('Error obteniendo número de orden para pedido:', error, pedido);
      return '';
    }
  }

  // Método para mover un pedido de una orden existente a la orden actual
  moverPedidoDeOrden(pedido: Pedido): void {
    if (this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
      Swal.fire({
        icon: 'info',
        title: 'Pedido ya agregado',
        text: 'Este pedido ya está en la lista de pedidos seleccionados.'
      });
      return;
    }

    const ordenAnterior = this.getNumeroOrdenPedido(pedido);
    
    Swal.fire({
      title: 'Mover pedido entre órdenes',
      html: `
        <div class="text-start">
          <p>¿Estás seguro de que deseas mover el pedido <strong>#${pedido.nroPedido}</strong>?</p>
          <p class="text-muted">
            <strong>Desde:</strong> Orden ${ordenAnterior}<br>
            <strong>Hacia:</strong> ${this.nroShippingOrder ? 'Orden ' + this.nroShippingOrder : 'Nueva orden'}
          </p>
          <div class="alert alert-warning mt-3">
            <i class="pi pi-exclamation-triangle me-2"></i>
            Al confirmar, el pedido será removido de la orden ${ordenAnterior} y agregado a esta orden.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, mover pedido',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd'
    }).then((result) => {
      if (result.isConfirmed) {
        // Marcar el pedido como movido
        this.pedidosMovidos.set(pedido.nroPedido, ordenAnterior);
        this.hayPedidosMovidos = true;
        
        // Agregar el pedido a la lista de seleccionados
        this.pedidosSeleccionados.push(pedido);
        
        // Actualizar la lista de pedidos disponibles
        this.actualizarPedidosDisponibles();
        
        Swal.fire({
          icon: 'success',
          title: 'Pedido movido',
          text: `El pedido #${pedido.nroPedido} ha sido movido exitosamente.`,
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  }

  // Método para verificar si un pedido fue movido de otra orden
  esPedidoMovido(pedido: Pedido): boolean {
    return this.pedidosMovidos.has(pedido.nroPedido);
  }

  // Método para obtener la orden anterior de un pedido movido
  getOrdenAnteriorPedido(pedido: Pedido): string {
    return this.pedidosMovidos.get(pedido.nroPedido) || '';
  }

  // Método para contar pedidos movidos
  contarPedidosMovidos(): number {
    return this.pedidosMovidos.size;
  }

  // Métodos auxiliares para manejar diferentes estructuras de datos
  private getNumeroOrdenFromObject(orden: any): string {
    return orden.nroShippingOrder || 
           orden.nroOrden || 
           orden.numero || 
           orden.id || 
           orden.orderNumber || 
           orden.shippingOrderNumber || 
           '';
  }

  private getPedidosFromOrden(orden: any): any[] {
    return orden.pedidos || 
           orden.orders || 
           orden.orderItems || 
           orden.items || 
           [];
  }



  // Método para ver detalles de la orden existente donde está el pedido
  verDetallesOrdenExistente(pedido: Pedido): void {
    
    const numeroOrden = this.getNumeroOrdenPedido(pedido);
    
    if (!numeroOrden) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo encontrar la orden donde está el pedido.'
      });
      return;
    }

    const ordenEncontrada = this.ordenesExistentes.find(orden => {
      const numeroOrdenActual = this.getNumeroOrdenFromObject(orden);
      return String(numeroOrdenActual) === String(numeroOrden);
    });

    if (!ordenEncontrada) {
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        html: `
          <div class="text-start">
            <p>No se pudieron cargar los detalles de la orden <strong>${numeroOrden}</strong>.</p>
            <p class="small text-muted">
              Órdenes disponibles: ${this.ordenesExistentes.map(o => 
                this.getNumeroOrdenFromObject(o)
              ).filter(n => n).join(', ') || 'Ninguna'}
            </p>
          </div>
        `
      });
      return;
    }

    const pedidosEnOrden = this.getPedidosFromOrden(ordenEncontrada);
    const totalPedidos = pedidosEnOrden.length;
    const totalValor = pedidosEnOrden.reduce((sum: number, p: any) => sum + (p.faltaPorPagar || p.valor || p.amount || 0), 0);

    const listaPedidos = pedidosEnOrden.map((p: any) => {
      const nombreCliente = p.cliente?.nombres_completos || 
                           p.cliente?.nombres || 
                           (p.cliente ? `${p.cliente.nombres || ''} ${p.cliente.apellidos || ''}`.trim() : '') ||
                           p.customerName ||
                           p.clientName ||
                           'Sin nombre';
      
      const nroPedido = p.nroPedido || p.numero || p.id || p.orderNumber || 'S/N';
      const valor = p.faltaPorPagar || p.valor || p.amount || 0;
      
      return `<li>#${nroPedido} - ${nombreCliente} - ${valor.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}</li>`;
    }).join('');

    const fechaOrden = ordenEncontrada.fecha || ordenEncontrada.fechaEnvio || ordenEncontrada.fechaCreacion;
    const transportadorInfo = ordenEncontrada.transportador || 
                             ordenEncontrada.metodoEnvio || 
                             ordenEncontrada.vendor || 
                             'No asignado';

    Swal.fire({
      title: `Detalles de la Orden ${numeroOrden}`,
      html: `
        <div class="text-start">
          <div class="row mb-3">
            <div class="col-6">
              <strong>Número de orden:</strong><br>
              <span class="badge bg-primary">${numeroOrden}</span>
            </div>
            <div class="col-6">
              <strong>Total de pedidos:</strong><br>
              <span class="badge bg-info">${totalPedidos}</span>
            </div>
          </div>
          
          <div class="row mb-3">
            <div class="col-6">
              <strong>Transportador/Método:</strong><br>
              ${transportadorInfo}
            </div>
            <div class="col-6">
              <strong>Valor total:</strong><br>
              <span class="badge bg-success">${totalValor.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}</span>
            </div>
          </div>

          <div class="mb-3">
            <strong>Fecha:</strong><br>
            ${fechaOrden ? new Date(fechaOrden).toLocaleDateString('es-CO') : 'No especificada'}
          </div>

          <hr>
          
          <h6>Pedidos en esta orden:</h6>
          <ul class="list-unstyled" style="max-height: 200px; overflow-y: auto;">
            ${listaPedidos || '<li>No hay pedidos en esta orden</li>'}
          </ul>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Cerrar'
    });
  }

  // Método auxiliar para formatear fechas para inputs de tipo date
  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  // Método para resetear el formulario y limpiar estado
  resetForm(): void {
    this.ordenEnvioForm.reset();
    this.pedidosSeleccionados = [];
    this.limpiarEstadoPedidosMovidos();
    this.actualizarPedidosDisponibles();
  }


} 