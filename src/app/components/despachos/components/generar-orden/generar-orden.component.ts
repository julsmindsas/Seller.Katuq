import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, ViewEncapsulation } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { EstadoPago, EstadoProceso, Pedido } from "../../../ventas/modelo/pedido";
import { LogisticaServiceV2 } from "../../../../shared/services/despachos/logistica.service.v2";
import { VentasService } from "../../../../shared/services/ventas/ventas.service";
import Swal from "sweetalert2";

interface ColumnDefinition {
  field: string;
  header: string;
  visible: boolean;
}

@Component({
  selector: "app-generar-orden",
  templateUrl: "./generar-orden.component.html",
  styleUrls: ["./generar-orden.component.scss"],
  encapsulation: ViewEncapsulation.None
})
export class GenerarOrdenComponent implements OnInit, OnDestroy {
  // Control de modo de operación
  @Input() usarPedidosPadre: boolean = false; // DEFAULT: modo independiente

  // Inputs existentes
  @Input() orders: Pedido[] = [];
  @Input() pedidosSeleccionados: Pedido[] = [];
  @Input() nuevaOrdenEnvio: any;
  @Input() nroShippingOrder: string;
  // isEditMode removed - now computed automatically
  @Input() isGeneratingPDF: boolean = false;
  @Input() pdfProgress: number = 0;
  @Input() generandoRotuloPara: Set<string> = new Set();
  @Input() ordenesExistentes: any[] = []; // Órdenes del componente padre

  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();
  @Output() onAddOrder = new EventEmitter<Pedido>();
  @Output() onRemoveOrder = new EventEmitter<Pedido>();
  @Output() onPrintOrder = new EventEmitter<void>();
  @Output() onDispatchOrder = new EventEmitter<void>();
  @Output() onPrintPdf = new EventEmitter<Pedido>();
  @Output() onViewTags = new EventEmitter<Pedido>();
  @Output() onPrintLabel = new EventEmitter<Pedido>();

  ordenEnvioForm: FormGroup;
  metodoEnvio: string;
  pedidosDisponibles: Pedido[] = [];
  actionColumnVisible = true;

  // Definición de columnas para la tabla de pedidos disponibles
  displayedColumns: ColumnDefinition[] = [
    { field: "nroPedido", header: "Nro. Pedido", visible: true },
    { field: "cliente", header: "Cliente", visible: true },
    { field: "ciudad", header: "Ciudad", visible: true },
    { field: "direccionEntrega", header: "Dirección", visible: true },
    { field: "faltaPorPagar", header: "Valor a Cobrar", visible: true },
    { field: "enOrden", header: "Estado en Orden", visible: true },
    { field: "opciones", header: "Opciones", visible: true },
    { field: "horarioEntrega", header: "Horario Entrega", visible: false },
    { field: "formaEntrega", header: "Forma Entrega", visible: false },
    { field: "estadoProceso", header: "Estado", visible: false },
    { field: "accion", header: "Acción", visible: true },
  ];

  selectedColumns: ColumnDefinition[] = [];
  mostrarPedidosEnOrdenes: boolean = false; // Controla si mostrar pedidos que ya están en órdenes
  pedidosMovidos: Map<string, string> = new Map(); // Mapa para rastrear pedidos movidos: nroPedido -> ordenAnterior
  hayPedidosMovidos: boolean = false; // Flag para indicar si hay pedidos movidos
  pedidoSeleccionadoDetalle: Pedido | null = null; // Pedido seleccionado para mostrar detalles
  isSaving: boolean = false; // Flag para prevenir múltiples clics en guardar

  // Propiedades para búsqueda y filtrado
  searchValue: string = '';
  columnFilters: any = {};
  globalFilterFields: string[] = ['nroPedido', 'clienteNombre', 'ciudadNombre', 'direccionEntregaNombre'];

  // Cache y estado para modo independiente
  private pedidosPropiosCache: Pedido[] = [];
  loadingPedidos: boolean = false;
  private destroy$ = new Subject<void>();
  totalPedidosEncontrados: number = 0;

  // Límite de pedidos
  readonly LIMITE_PEDIDOS = 200;

  constructor(
    private formBuilder: FormBuilder,
    private logisticaService: LogisticaServiceV2,
    private ventasService: VentasService // NUEVO - para modo independiente
  ) {}

  // Computed getter para determinar si estamos en modo edición
  get isEditMode(): boolean {
    return !!this.nroShippingOrder;
  }

  ngOnInit(): void {
    this.initForm();
    this.selectedColumns = this.displayedColumns.filter((col) => col.visible);

    // Detectar modo de operación
    if (!this.usarPedidosPadre) {
      // MODO INDEPENDIENTE: Inicializar fechas por defecto y cargar pedidos
      this.inicializarFechasPorDefecto();
      this.configurarSuscripcionesFechas();

      // Cargar órdenes existentes para detectar pedidos duplicados
      // y permitir mover pedidos entre órdenes
      this.cargarOrdenesExistentes();
    } else {
      // MODO DEPENDIENTE: Funciona como actualmente
      // NO cargar órdenes aquí - esperar a que se seleccione una fecha
      // Las órdenes se cargarán cuando:
      // 1. El usuario seleccione una fecha (mediante valueChanges)
      // 2. Si viene en modo edición con fecha precargada

      // Inicializar datos según el modo (creación o edición)
      if (this.isEditMode && this.nuevaOrdenEnvio) {
        // Debug: Analizar datos de edición
        console.log('=== DEBUG: EDIT MODE ACTIVATION ===');
        console.log('isEditMode:', this.isEditMode);
        console.log('nuevaOrdenEnvio completa:', this.nuevaOrdenEnvio);
        console.log('Estructura de campos relevantes:', {
          metodoEnvio: this.nuevaOrdenEnvio.metodoEnvio,
          metodo_envio: this.nuevaOrdenEnvio.metodo_envio,
          tipoEnvio: this.nuevaOrdenEnvio.tipoEnvio,
          transportador: this.nuevaOrdenEnvio.transportador,
          fecha: this.nuevaOrdenEnvio.fecha
        });

        // En modo edición, cargar los datos de la orden existente
        this.metodoEnvio = this.getShippingMethodFromOrder(this.nuevaOrdenEnvio);

        console.log('Método de envío detectado:', this.metodoEnvio);
        console.log('Fecha formateada:', this.formatDateForInput(this.nuevaOrdenEnvio.fecha));

        // Inicializar el formulario con los valores de la orden existente
        this.ordenEnvioForm.patchValue({
          metodoEnvio: this.metodoEnvio,
        });

        // Si estamos en modo independiente, setear las fechas de búsqueda basadas en la fecha de la orden
        if (!this.usarPedidosPadre && this.nuevaOrdenEnvio.fecha) {
          const fechaOrden = new Date(this.nuevaOrdenEnvio.fecha);
          // p-calendar de PrimeNG espera objetos Date, no strings
          this.ordenEnvioForm.patchValue({
            fechaInicio: fechaOrden,
            fechaFin: fechaOrden
          });
        }

        // Forzar actualización del formulario
        this.ordenEnvioForm.updateValueAndValidity();
        this.ordenEnvioForm.markAllAsTouched();

        console.log('Estado del formulario después del patchValue:', {
          metodoEnvio: this.ordenEnvioForm.get('metodoEnvio')?.value,
          fechaInicio: this.ordenEnvioForm.get('fechaInicio')?.value,
          fechaFin: this.ordenEnvioForm.get('fechaFin')?.value,
          formValid: this.ordenEnvioForm.valid
        });
        console.log('=====================================');

        // Refrescar la lista de pedidos disponibles
        this.actualizarPedidosDisponibles();

        // Cargar órdenes existentes ahora que tenemos fecha
        if (!this.ordenesExistentes || this.ordenesExistentes.length === 0) {
          this.cargarOrdenesExistentes();
        }
      } else {
        // En modo creación, inicializar con valores por defecto
        if (this.nroShippingOrder) {
          // Si ya hay un número de orden, es porque se está editando después de guardar
          this.actualizarPedidosDisponibles();
        }
      }
    }
  }

  private initForm(): void {
    // Determinar validadores según el modo
    const fechaValidators = this.usarPedidosPadre ? [] : [Validators.required];

    this.ordenEnvioForm = this.formBuilder.group({
      // Solo dos fechas para todo
      fechaInicio: ["", fechaValidators],
      fechaFin: ["", fechaValidators],
      metodoEnvio: ["", Validators.required],
    });

    // Suscripción a cambios de método con debouncing
    this.ordenEnvioForm.get("metodoEnvio")?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((value) => {
        this.metodoEnvio = value;
        this.actualizarPedidosDisponibles();
      });
  }

  seleccionarMetodo(metodo: 'mensajeroPropio' | 'transportadora'): void {
    this.ordenEnvioForm.get('metodoEnvio')?.setValue(metodo);
  }

  // ===== NUEVOS MÉTODOS PARA MODO INDEPENDIENTE =====

  private inicializarFechasPorDefecto(): void {
    const hoy = new Date();

    // Setear ambas fechas a hoy por defecto
    // p-calendar de PrimeNG espera objetos Date, no strings
    this.ordenEnvioForm.patchValue({
      fechaInicio: hoy,
      fechaFin: hoy
    });

    // NO cargar pedidos automáticamente - esperar a que el usuario haga clic en Filtrar
  }

  private configurarSuscripcionesFechas(): void {
    // NO suscribirse a cambios automáticos - el usuario debe hacer clic en Filtrar
    // Esta función se mantiene vacía pero disponible para futuras mejoras
  }

  private cargarPedidosPropios(): void {
    if (this.usarPedidosPadre) return;

    const fechaInicio = this.ordenEnvioForm.get('fechaInicio')?.value;
    const fechaFin = this.ordenEnvioForm.get('fechaFin')?.value;

    if (!fechaInicio || !fechaFin) return;

    this.loadingPedidos = true;

    // Formatear fechas al formato YYYY-MM-DD que espera la API
    const formatDateForAPI = (dateValue: string , isDateInicio: boolean = false): string => {
      const date = new Date(dateValue);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      if (isDateInicio) {
        return `${year}-${month}-${day}T00:00:00.000Z`;
      } else {
        return `${year}-${month}-${day}T23:59:59.999Z`;
      }
    };

    const filter = {
      fechaInicial: formatDateForAPI(fechaInicio, true),
      fechaFinal: formatDateForAPI(fechaFin, false),
      company: JSON.parse(localStorage.getItem("currentCompany") || "{}").nomComercial,
      estadoProceso: [
        EstadoProceso.ParaDespachar,
        EstadoProceso.Empacado,
        EstadoProceso.ProducidoTotalmente
      ],
      estadosPago: [
        EstadoPago.PreAprobado,
        EstadoPago.Aprobado,
        EstadoPago.Pendiente,
        EstadoPago.Pospendiente,
      ],
      fields: 'full',
      limit: this.LIMITE_PEDIDOS,
      tipoFecha: "fechaEntrega",
    };

    this.ventasService.getOrdersByFilterOptimized(filter, 1, this.LIMITE_PEDIDOS)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.pedidosPropiosCache = response.orders || [];
          this.totalPedidosEncontrados = response.pagination?.totalItems || 0;
          this.actualizarPedidosDisponibles();
          this.loadingPedidos = false;

          // Mostrar advertencia si hay más pedidos del límite
          if (this.totalPedidosEncontrados > this.LIMITE_PEDIDOS) {
            Swal.fire({
              icon: 'info',
              title: 'Límite de pedidos alcanzado',
              html: `
                <div class="text-start">
                  <p>Se encontraron <strong>${this.totalPedidosEncontrados}</strong> pedidos.</p>
                  <p>Por rendimiento, solo se muestran los primeros <strong>${this.LIMITE_PEDIDOS}</strong>.</p>
                  <p class="text-muted small mt-2">
                    <i class="pi pi-info-circle me-1"></i>
                    Ajusta el rango de fechas para ver pedidos específicos.
                  </p>
                </div>
              `,
              confirmButtonText: 'Entendido'
            });
          }
        },
        error: (error) => {
          console.error('Error cargando pedidos propios:', error);
          this.loadingPedidos = false;
          this.pedidosPropiosCache = [];

          Swal.fire({
            icon: 'error',
            title: 'Error al cargar pedidos',
            text: 'No se pudieron obtener los pedidos. Intenta nuevamente.',
            confirmButtonText: 'Reintentar'
          }).then((result) => {
            if (result.isConfirmed) {
              this.cargarPedidosPropios();
            }
          });
        }
      });
  }

  private validarRangoFechas(): boolean {
    if (this.usarPedidosPadre) return true;

    const fechaInicio = this.ordenEnvioForm.get('fechaInicio')?.value;
    const fechaFin = this.ordenEnvioForm.get('fechaFin')?.value;

    if (!fechaInicio || !fechaFin) return false;

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    // Validar que fin >= inicio
    if (fin < inicio) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas inválidas',
        text: 'La fecha fin debe ser posterior a la fecha inicio',
        timer: 3000,
        showConfirmButton: false
      });
      return false;
    }

    // Validar rango máximo 30 días
    const diffTime = Math.abs(fin.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango muy amplio',
        text: 'El rango máximo permitido es de 30 días',
        timer: 3000,
        showConfirmButton: false
      });
      return false;
    }

    return true;
  }

  // Botón manual de filtrado
  filtrarPedidos(): void {
    if (!this.usarPedidosPadre) {
      if (this.validarRangoFechas()) {
        this.cargarPedidosPropios();
      }
    } else {
      this.actualizarPedidosDisponibles();
    }
  }



  


  private async cargarOrdenesExistentes(): Promise<void> {
    // Cargar órdenes existentes para verificar duplicados usando el método optimizado
    // Usar fechaFin como referencia para cargar las órdenes del mes
    let fechaReferencia = this.ordenEnvioForm.get('fechaFin')?.value;

    // Si no hay fecha seleccionada, usar la fecha actual
    if (!fechaReferencia) {
      fechaReferencia = new Date().toISOString();
      console.log('No hay fecha seleccionada, usando fecha actual');
    }

    const fecha = new Date(fechaReferencia);
    // Formato YYYY-MM-DD
    // Restar una semana a la fecha de inicio
    const fechaInicio = new Date(fecha);
    // Rango del mes de la fecha seleccionada: primer día y último día del mes (local)
    const formatDate = (d: Date,isDateInicio: boolean=false) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (isDateInicio) {
        return `${y}-${m}-${day}T00:00:00.000Z`;
      } else {
        return `${y}-${m}-${day}T23:59:59.999Z`;
      }
    };

    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

    const fechaInicioStr = formatDate(inicioMes,true);
    const fechaFinStr = formatDate(finMes);

    
    let params: any = {
      page: 1,
      limit: 50,
      fields: 'full', // Solo campos necesarios para validación,
      estado: 'Despachado',
      fechaInicio: fechaInicioStr,
      fechaFin: fechaFinStr
    };
    
    console.log('Cargando órdenes con parámetros:', params);
    
    this.logisticaService.getShippingOrdersPaginated(params).subscribe(
      (response) => {
        // Manejar respuesta paginada
        if (response && response.data) {
          this.ordenesExistentes = response.data;
        } else if (Array.isArray(response)) {
          // Fallback para formato antiguo
          this.ordenesExistentes = response;
        } else {
          this.ordenesExistentes = [];
        }
        console.log(
          "Órdenes existentes cargadas (optimizado):",
          this.ordenesExistentes.length,
        );
      },
      (error) => {
        console.error("Error al cargar órdenes existentes:", error);
        this.ordenesExistentes = [];
        
        // Intentar con el método optimizado como fallback
        console.log("Intentando cargar con paginación...");
        this.cargarOrdenesConPaginacion();
      },
    );
  }

  /**
   * Método alternativo que usa la nueva paginación optimizada
   * Se usará automáticamente en futuras versiones
   */
  private cargarOrdenesConPaginacion(): void {
    this.logisticaService.getShippingOrdersPaginated({
      page: 1,
      limit: 100,
      fields: 'minimal' // Solo necesitamos info básica para validación
    }).subscribe(
      (response) => {
        if (response && response.data) {
          this.ordenesExistentes = response.data;
          console.log(
            "Órdenes cargadas con paginación:",
            this.ordenesExistentes.length,
            "de", response.pagination?.hasMore ? "más disponibles" : "total"
          );
          
          // Si hay más páginas y necesitamos todas, cargar el resto
          if (response.pagination?.hasMore) {
            this.cargarTodasLasPaginas();
          }
        }
      },
      (error) => {
        console.error("Error con paginación:", error);
        Swal.fire({
          icon: "warning",
          title: "Advertencia",
          text: "No se pudieron cargar las órdenes existentes. Algunas funciones pueden no estar disponibles.",
          timer: 3000,
          showConfirmButton: false,
        });
      }
    );
  }

  /**
   * Carga todas las páginas de órdenes si es necesario
   */
  private async cargarTodasLasPaginas(): Promise<void> {
    try {
      const allOrders = await this.logisticaService.getAllShippingOrdersV2('minimal');
      this.ordenesExistentes = allOrders;
      console.log(`Total de órdenes cargadas: ${allOrders.length}`);
    } catch (error) {
      console.error("Error cargando todas las páginas:", error);
    }
  }

  actualizarPedidosDisponibles(): void {
    this.pedidosDisponibles = this.loadPedidosDisponibles();
  }

  loadPedidosDisponibles(): Pedido[] {
    try {
      // Filtrar pedidos disponibles sin depender de la fecha de envío
      const pedidosFiltrados = this.obtenerTodosLosPedidos().map((pedido) => {
        // Pre-procesar campos anidados para facilitar el filtrado y búsqueda
        // Siempre asignar para asegurar que los campos existan para el filtrado
        pedido['clienteNombre'] = pedido.cliente?.nombres_completos ||
          pedido.cliente?.apellidos_completos ||
          "N/A";

        pedido['ciudadNombre'] = pedido.envio?.ciudad || "N/A";

        pedido['direccionEntregaNombre'] = pedido.envio?.direccionEntrega || "N/A";
        return pedido;
      }).filter((o) => {
        try {
          // Verificar si el pedido ya está seleccionado en la orden actual
          const yaSeleccionado = this.pedidosSeleccionados.some(
            (p) => p.nroPedido === o.nroPedido,
          );

          // Verificar todas las condiciones
          const estadoValido =
            o.estadoProceso !== EstadoProceso.Entregado &&
            o.estadoProceso !== EstadoProceso.Despachado &&
            o.estadoProceso !== EstadoProceso.EnProduccion &&
            o.estadoProceso !== EstadoProceso.SinProducir;
          let formaEntregaValida = false;
          try {
            if (o.carrito && 
                Array.isArray(o.carrito) && 
                o.carrito.length > 0 &&
                o.carrito[0] &&
                o.carrito[0].configuracion &&
                o.carrito[0].configuracion.datosEntrega &&
                o.carrito[0].configuracion.datosEntrega.formaEntrega) {
              formaEntregaValida = o.carrito[0].configuracion.datosEntrega.formaEntrega
                .toLocaleUpperCase()
                .includes("DOMICILIO");
            }
          } catch (formaEntregaError) {
            console.error("Error verificando forma entrega para pedido:", o.nroPedido, formaEntregaError);
            formaEntregaValida = false;
          }

          // Verificar si el pedido existe en otra orden
          let existeEnOtraOrden = false;
          try {
            existeEnOtraOrden = this.pedidoExisteEnOrden(o);
          } catch (ordenError) {
            console.error("Error verificando si pedido existe en orden:", o.nroPedido, ordenError);
            existeEnOtraOrden = false;
          }

          // Si no queremos mostrar pedidos en órdenes y este pedido está en una orden, ocultarlo
          if (!this.mostrarPedidosEnOrdenes && existeEnOtraOrden) {
            return false;
          }

          return (
            estadoValido &&
            formaEntregaValida &&
            !yaSeleccionado
          );
        } catch (err) {
          console.error("Error al procesar pedido:", o.nroPedido, err);
          console.error("Datos del pedido problemático:", {
            nroPedido: o.nroPedido,
            fechaEntrega: o.fechaEntrega,
            carritoLength: o.carrito?.length,
            carritoFirstItem: o.carrito?.[0],
            estadoProceso: o.estadoProceso,
            errorStack: err instanceof Error ? err.stack : String(err)
          });
          // No mostrar Swal para cada error, solo log
          return false;
        }
      });

      return pedidosFiltrados;
    } catch (err) {
      console.error("Error general en loadPedidosDisponibles:", err);
      return [];
    }
  }

  /**
   * Obtiene todos los pedidos disponibles, incluyendo los que están en órdenes existentes
   * si el checkbox mostrarPedidosEnOrdenes está activado
   */
  private obtenerTodosLosPedidos(): Pedido[] {
    if (this.usarPedidosPadre) {
      // MODO DEPENDIENTE: usar pedidos del padre
      let todosLosPedidos = [...this.orders];

      // Si queremos mostrar pedidos en órdenes y hay órdenes existentes
      if (this.mostrarPedidosEnOrdenes && this.ordenesExistentes && this.ordenesExistentes.length > 0) {
        // Extraer pedidos de cada orden existente
        this.ordenesExistentes.forEach(orden => {
          if (orden.pedidos && Array.isArray(orden.pedidos)) {
            // Agregar los pedidos de esta orden
            todosLosPedidos = [...todosLosPedidos, ...orden.pedidos];
          }
        });

        // Eliminar duplicados basándose en nroPedido
        const pedidosUnicos = new Map<string, Pedido>();
        todosLosPedidos.forEach(pedido => {
          if (pedido.nroPedido && !pedidosUnicos.has(pedido.nroPedido)) {
            pedidosUnicos.set(pedido.nroPedido, pedido);
          }
        });

        return Array.from(pedidosUnicos.values());
      }

      return this.orders || [];
    } else {
      // MODO INDEPENDIENTE: usar cache propio
      if (this.mostrarPedidosEnOrdenes && this.ordenesExistentes?.length > 0) {
        // Combinar pedidos propios con los de órdenes existentes
        const todosLosPedidos = [...this.pedidosPropiosCache];

        this.ordenesExistentes.forEach(orden => {
          if (orden.pedidos && Array.isArray(orden.pedidos)) {
            todosLosPedidos.push(...orden.pedidos);
          }
        });

        // Eliminar duplicados
        const pedidosUnicos = new Map<string, Pedido>();
        todosLosPedidos.forEach(pedido => {
          if (pedido.nroPedido && !pedidosUnicos.has(pedido.nroPedido)) {
            pedidosUnicos.set(pedido.nroPedido, pedido);
          }
        });

        return Array.from(pedidosUnicos.values());
      }

      return this.pedidosPropiosCache || [];
    }
  }

  agregarPedido(pedido: Pedido): void {
    this.onAddOrder.emit(pedido);
    // Actualizar pedidos disponibles después de agregar uno
    this.actualizarPedidosDisponibles();
  }

  retirarPedido(pedido: Pedido): void {
    // Si es un pedido movido, quitarlo del tracking
    if (pedido.nroPedido && this.pedidosMovidos.has(pedido.nroPedido)) {
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

    // Limpiar cache solo en modo independiente
    if (!this.usarPedidosPadre) {
      this.pedidosPropiosCache = [];
      this.totalPedidosEncontrados = 0;
    }

    this.onClose.emit();
  }

  // Método para limpiar el estado de pedidos movidos
  private limpiarEstadoPedidosMovidos(): void {
    this.pedidosMovidos.clear();
    this.hayPedidosMovidos = false;
  }

  guardarOrden(): void {
    // Prevenir múltiples clics
    if (this.isSaving || this.ordenEnvioForm.invalid || this.pedidosSeleccionados.length === 0) {
      return;
    }

    this.isSaving = true;

    // Si hay pedidos movidos, mostrar confirmación adicional
    if (this.hayPedidosMovidos) {
      const listaPedidosMovidos = Array.from(this.pedidosMovidos.entries())
        .map(
          ([nroPedido, ordenAnterior]) =>
            `#${nroPedido} (desde orden ${ordenAnterior})`,
        )
        .join(", ");

      Swal.fire({
        title: "Confirmar cambios",
        html: `
          <div class="text-start">
            <p>Esta acción realizará los siguientes cambios:</p>
            <ul>
              <li><strong>Pedidos movidos:</strong> ${listaPedidosMovidos}</li>
              <li>Estos pedidos serán removidos de sus órdenes anteriores</li>
              <li>Se ${this.nroShippingOrder ? "actualizará" : "creará"} la orden actual</li>
            </ul>
            <div class="alert alert-warning mt-3">
              <i class="pi pi-exclamation-triangle me-2"></i>
              Esta acción no se puede deshacer automáticamente.
            </div>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, guardar cambios",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          this.ejecutarGuardarOrden();
        } else {
          this.isSaving = false; // Resetear si se cancela
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
      pedidosMovidos: Array.from(this.pedidosMovidos.entries()).map(
        ([nroPedido, ordenAnterior]) => ({
          nroPedido,
          ordenAnterior,
        }),
      ),
    };

    this.onSave.emit(ordenData);
    // Nota: isSaving se resetea cuando el componente padre responde
  }

  // Método para resetear el estado de guardado (llamado desde el componente padre)
  resetSavingState(): void {
    this.isSaving = false;
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
      pedido.formaEntrega === "Envío a Domicilio" &&
      !this.pedidosSeleccionados.some((p) => p.nroPedido === pedido.nroPedido)
    );
  }

  // Método para facilitar el acceso a propiedades anidadas para la tabla
  getNestedProperty(pedido: any, field: string): any {
    switch (field) {
      case "cliente":
        const nombreCliente = pedido.cliente?.nombres_completos ||
          pedido.cliente?.apellidos_completos ||
          "N/A";
        // Asignar a una propiedad plana para facilitar el filtrado
        pedido['clienteNombre'] = nombreCliente;
        return nombreCliente;
      case "ciudad":
        const ciudad = pedido.envio?.ciudad || "N/A";
        pedido['ciudadNombre'] = ciudad;
        return ciudad;
      case "direccionEntrega":
        const direccion = pedido.envio?.direccionEntrega || "N/A";
        pedido['direccionEntregaNombre'] = direccion;
        return direccion;
      case "nroPedido":
      case "formaEntrega":
      case "horarioEntrega":
      case "estadoProceso":
        return pedido[field] || "N/A";
      case "faltaPorPagar":
        return pedido[field] || 0; // Retornar 0 en lugar de "N/A" para el currency pipe
      default:
        return "N/A";
    }
  }

  // Método para actualizar la selección de columnas
  onColumnSelectionChange(): void {
    this.displayedColumns.forEach((col) => {
      col.visible = this.selectedColumns.some(
        (selected) => selected.field === col.field,
      );
    });
    this.updateActionColumnVisible();
  }

  // Método para verificar si la columna de acción está visible
  updateActionColumnVisible(): void {
    this.actionColumnVisible = this.selectedColumns.some(
      (col) => col.field === "accion",
    );
  }

  // Método para verificar si una columna específica está visible
  isColumnVisible(field: string): boolean {
    return this.selectedColumns.some((col) => col.field === field);
  }

  // Método específico para verificar si la columna de acción está visible
  isActionColumnVisible(): boolean {
    return this.actionColumnVisible;
  }

  // Método para verificar si un pedido ya existe en una orden
  pedidoExisteEnOrden(pedido: Pedido): boolean {
    // Usar órdenes del padre si están disponibles, sino las cargadas localmente
    const ordenesParaVerificar = (this.ordenesExistentes && this.ordenesExistentes.length > 0) 
      ? this.ordenesExistentes 
      : [];
    
    if (!ordenesParaVerificar || ordenesParaVerificar.length === 0) {
      return false;
    }

    try {
      const existe = ordenesParaVerificar.some((orden) => {
        // Obtener el número de orden correctamente - maneja múltiples formatos
        const numeroOrden = this.getNumeroOrdenFromObject(orden);

        // Excluir la orden actual si estamos en modo edición
        if (
          this.isEditMode &&
          String(numeroOrden) === String(this.nroShippingOrder)
        ) {
          return false;
        }

        // Verificar si el pedido está en esta orden - maneja múltiples formatos
        const pedidosOrden = this.getPedidosFromOrden(orden);
        return pedidosOrden.some((p: any) => {
          const nroPedidoOrden =
            p.nroPedido || p.numero || p.id || p.orderNumber;
          return String(nroPedidoOrden) === String(pedido.nroPedido);
        });
      });

      return existe;
    } catch (error) {
      console.error(
        "Error verificando si pedido existe en orden:",
        error,
        pedido,
      );
      return false;
    }
  }

  // Método para obtener el número de orden donde existe el pedido
  getNumeroOrdenPedido(pedido: Pedido): string {
    if (!this.ordenesExistentes || this.ordenesExistentes.length === 0) {
      return "";
    }

    try {
      const ordenEncontrada = this.ordenesExistentes.find((orden) => {
        // Obtener el número de orden correctamente
        const numeroOrden = this.getNumeroOrdenFromObject(orden);

        // Excluir la orden actual si estamos en modo edición
        if (
          this.isEditMode &&
          String(numeroOrden) === String(this.nroShippingOrder)
        ) {
          return false;
        }

        // Verificar si el pedido está en esta orden
        const pedidosOrden = this.getPedidosFromOrden(orden);
        return pedidosOrden.some((p: any) => {
          const nroPedidoOrden =
            p.nroPedido || p.numero || p.id || p.orderNumber;
          return String(nroPedidoOrden) === String(pedido.nroPedido);
        });
      });

      return ordenEncontrada
        ? String(this.getNumeroOrdenFromObject(ordenEncontrada))
        : "";
    } catch (error) {
      console.error(
        "Error obteniendo número de orden para pedido:",
        error,
        pedido,
      );
      return "";
    }
  }

  // Método para mover un pedido de una orden existente a la orden actual
  moverPedidoDeOrden(pedido: Pedido): void {
    if (!pedido.nroPedido) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Pedido',
        text: 'El pedido no tiene un número de referencia y no puede ser movido.',
      });
      return;
    }
    
    if (
      this.pedidosSeleccionados.some((p) => p.nroPedido === pedido.nroPedido)
    ) {
      Swal.fire({
        icon: "info",
        title: "Pedido ya agregado",
        text: "Este pedido ya está en la lista de pedidos seleccionados.",
      });
      return;
    }

    const ordenAnterior = this.getNumeroOrdenPedido(pedido);

    Swal.fire({
      title: "Mover pedido entre órdenes",
      html: `
        <div class="text-start">
          <p>¿Estás seguro de que deseas mover el pedido <strong>#${pedido.nroPedido}</strong>?</p>
          <p class="text-muted">
            <strong>Desde:</strong> Orden ${ordenAnterior}<br>
            <strong>Hacia:</strong> ${this.nroShippingOrder ? "Orden " + this.nroShippingOrder : "Nueva orden"}
          </p>
          <div class="alert alert-warning mt-3">
            <i class="pi pi-exclamation-triangle me-2"></i>
            Al confirmar, el pedido será removido de la orden ${ordenAnterior} y agregado a esta orden.
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, mover pedido",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0d6efd",
    }).then((result) => {
      if (result.isConfirmed) {
        // Marcar el pedido como movido
        if (pedido.nroPedido) {
          this.pedidosMovidos.set(pedido.nroPedido, ordenAnterior);
          this.hayPedidosMovidos = true;
        }

        // Agregar el pedido a la lista de seleccionados
        this.pedidosSeleccionados.push(pedido);

        // Actualizar la lista de pedidos disponibles
        this.actualizarPedidosDisponibles();

        Swal.fire({
          icon: "success",
          title: "Pedido movido",
          text: `El pedido #${pedido.nroPedido} ha sido movido exitosamente.`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  }

  // Método para verificar si un pedido fue movido de otra orden
  esPedidoMovido(pedido: Pedido): boolean {
    return !!pedido.nroPedido && this.pedidosMovidos.has(pedido.nroPedido);
  }

  // Método para obtener la orden anterior de un pedido movido
  getOrdenAnteriorPedido(pedido: Pedido): string {
    return (pedido.nroPedido && this.pedidosMovidos.get(pedido.nroPedido)) || "";
  }

  // Método para contar pedidos movidos
  contarPedidosMovidos(): number {
    return this.pedidosMovidos.size;
  }

  // Métodos auxiliares para manejar diferentes estructuras de datos
  private getNumeroOrdenFromObject(orden: any): string {
    return (
      orden.nroShippingOrder ||
      orden.nroOrden ||
      orden.numero ||
      orden.id ||
      orden.orderNumber ||
      orden.shippingOrderNumber ||
      ""
    );
  }

  private getPedidosFromOrden(orden: any): any[] {
    return (
      orden.pedidos || orden.orders || orden.orderItems || orden.items || []
    );
  }

  // Método para ver detalles de la orden existente donde está el pedido
  verDetallesOrdenExistente(pedido: Pedido): void {
    const numeroOrden = this.getNumeroOrdenPedido(pedido);

    if (!numeroOrden) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo encontrar la orden donde está el pedido.",
      });
      return;
    }

    const ordenEncontrada = this.ordenesExistentes.find((orden) => {
      const numeroOrdenActual = this.getNumeroOrdenFromObject(orden);
      return String(numeroOrdenActual) === String(numeroOrden);
    });

    if (!ordenEncontrada) {
      Swal.fire({
        icon: "error",
        title: "Error",
        html: `
          <div class="text-start">
            <p>No se pudieron cargar los detalles de la orden <strong>${numeroOrden}</strong>.</p>
            <p class="small text-muted">
              Órdenes disponibles: ${
                this.ordenesExistentes
                  .map((o) => this.getNumeroOrdenFromObject(o))
                  .filter((n) => n)
                  .join(", ") || "Ninguna"
              }
            </p>
          </div>
        `,
      });
      return;
    }

    const pedidosEnOrden = this.getPedidosFromOrden(ordenEncontrada);
    const totalPedidos = pedidosEnOrden.length;
    const totalValor = pedidosEnOrden.reduce(
      (sum: number, p: any) =>
        sum + (p.faltaPorPagar || p.valor || p.amount || 0),
      0,
    );

    const listaPedidos = pedidosEnOrden
      .map((p: any) => {
        const nombreCliente =
          p.cliente?.nombres_completos ||
          p.cliente?.nombres ||
          (p.cliente
            ? `${p.cliente.nombres || ""} ${p.cliente.apellidos || ""}`.trim()
            : "") ||
          p.customerName ||
          p.clientName ||
          "Sin nombre";

        const nroPedido =
          p.nroPedido || p.numero || p.id || p.orderNumber || "S/N";
        const valor = p.faltaPorPagar || p.valor || p.amount || 0;

        return `<li>#${nroPedido} - ${nombreCliente} - ${valor.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</li>`;
      })
      .join("");

    const fechaOrden =
      ordenEncontrada.fecha ||
      ordenEncontrada.fecha ||
      ordenEncontrada.fechaCreacion;
    const transportadorInfo =
      ordenEncontrada.transportador ||
      ordenEncontrada.metodoEnvio ||
      ordenEncontrada.vendor ||
      "No asignado";

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
              <span class="badge bg-success">${totalValor.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</span>
            </div>
          </div>

          <div class="mb-3">
            <strong>Fecha:</strong><br>
            ${fechaOrden ? new Date(fechaOrden).toLocaleDateString("es-CO") : "No especificada"}
          </div>

          <hr>

          <h6>Pedidos en esta orden:</h6>
          <ul class="list-unstyled" style="max-height: 200px; overflow-y: auto;">
            ${listaPedidos || "<li>No hay pedidos en esta orden</li>"}
          </ul>
        </div>
      `,
      width: "600px",
      confirmButtonText: "Cerrar",
    });
  }

  // Método auxiliar para formatear fechas para inputs de tipo date
  private formatDateForInput(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  }

  /**
   * Función helper para detectar el método de envío desde la orden existente
   * Usa lógica robusta similar a isTransportadoraOrder pero retorna el valor específico
   */
  private getShippingMethodFromOrder(order: any): string {
    console.log('🔍 ANALIZANDO MÉTODO DE ENVÍO');
    console.log('Orden recibida:', order);
    
    if (!order) {
      console.log('❌ No hay orden - retornando mensajeroPropio');
      return "mensajeroPropio";
    }

    // Verificar diferentes posibles nombres de campo
    const possibleFields = {
      metodoEnvio: order.metodoEnvio,
      metodo_envio: order.metodo_envio,
      tipoEnvio: order.tipoEnvio,
      tipo_envio: order.tipo_envio,
      shippingMethod: order.shippingMethod,
      metodoenVio: order.metodoenVio, // typo común
    };

    console.log('Campos analizados:', possibleFields);

    // Buscar valor específico en los campos
    for (const [fieldName, fieldValue] of Object.entries(possibleFields)) {
      if (fieldValue && typeof fieldValue === 'string') {
        const value = fieldValue.toLowerCase().trim();
        console.log(`🔎 Analizando ${fieldName}: "${fieldValue}" → "${value}"`);
        
        if (value === 'transportadora' || value === 'transportador' || value === 'carrier') {
          console.log('✅ ENCONTRADO: transportadora');
          return 'transportadora';
        }
        if (value === 'mensajeropropio' || value === 'mensajero_propio' || value === 'mensajero propio' || value === 'propio') {
          console.log('✅ ENCONTRADO: mensajeroPropio');
          return 'mensajeroPropio';
        }
      }
    }

    // Verificar si hay un transportador específico asignado (diferente de mensajero propio)
    console.log('🚛 Analizando transportador:', order.transportador);
    if (order.transportador && 
        order.transportador !== 'mensajero_propio' && 
        order.transportador !== 'Mensajero Propio' &&
        order.transportador !== 'mensajeropropio' &&
        order.transportador !== '') {
      console.log('✅ ENCONTRADO por transportador: transportadora');
      return 'transportadora';
    }

    // Por defecto retornar mensajero propio
    console.log('🔄 FALLBACK: retornando mensajeroPropio');
    return "mensajeroPropio";
  }

  // Método para resetear el formulario y limpiar estado
  resetForm(): void {
    this.ordenEnvioForm.reset();
    this.pedidosSeleccionados = [];
    this.limpiarEstadoPedidosMovidos();
    this.actualizarPedidosDisponibles();
  }

  // ============= MÉTODOS PARA MODAL DE DETALLES DEL PEDIDO =============

  verDetallesPedido(pedido: Pedido): void {
    this.pedidoSeleccionadoDetalle = pedido;

    // Mostrar el modal usando Bootstrap
    const modalElement = document.getElementById("detallesPedidoModal");
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  cerrarDetallesPedido(): void {
    this.pedidoSeleccionadoDetalle = null;

    // Ocultar el modal usando Bootstrap
    const modalElement = document.getElementById("detallesPedidoModal");
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  agregarPedidoDesdeDetalle(): void {
    if (
      this.pedidoSeleccionadoDetalle &&
      !this.pedidoExisteEnOrden(this.pedidoSeleccionadoDetalle)
    ) {
      this.agregarPedido(this.pedidoSeleccionadoDetalle);
      this.cerrarDetallesPedido();
    }
  }

  // Métodos para obtener información del pedido
  getProductosCount(): number {
    return this.pedidoSeleccionadoDetalle?.carrito?.length || 0;
  }

  getProductImage(item: any): string {
    return (
      item.producto?.crearProducto?.imagenes?.[0]?.url ||
      item.producto?.imagenes?.[0]?.url ||
      ""
    );
  }

  getProductTitle(item: any): string {
    return (
      item.producto?.crearProducto?.titulo ||
      item.producto?.titulo ||
      item.producto?.nombre ||
      "Producto sin título"
    );
  }

  getProductReference(item: any): string {
    return (
      item.producto?.identificacion?.referencia ||
      item.producto?.referencia ||
      "Sin referencia"
    );
  }

  getProductVariations(item: any): string {
    if (!item.variableForm) {
      return "";
    }
    const configuracion = item.variableForm;
    const variations: string[] = [];

    if (configuracion.color) {
      variations.push(`Color: ${configuracion.color}`);
    }
    if (configuracion.talla) {
      variations.push(`Talla: ${configuracion.talla}`);
    }
    if (configuracion.material) {
      variations.push(`Material: ${configuracion.material}`);
    }

    return variations.join(", ");
  }

  getProductPrice(item: any): number {
    return item.precio?.precioSinImpuesto || 0;
  }

  getProductSubtotal(item: any): number {
    const precio = this.getProductPrice(item);
    const cantidad = item.cantidad || 1;
    return precio * cantidad;
  }

  getProductsTotalValue(): number {
    if (!this.pedidoSeleccionadoDetalle?.carrito) return 0;

    return this.pedidoSeleccionadoDetalle.carrito.reduce((total, item) => {
      return total + this.getProductSubtotal(item);
    }, 0);
  }

  getDeliveryRecipient(): string {
    const envio = this.pedidoSeleccionadoDetalle?.envio;
    if (!envio) return "N/A";

    const nombres = envio.nombres || "";
    const apellidos = envio.apellidos || "";

    if (nombres || apellidos) {
      return `${nombres} ${apellidos}`.trim();
    }

    // Fallback al cliente
    const cliente = this.pedidoSeleccionadoDetalle?.cliente;
    return cliente?.nombres_completos || cliente?.apellidos_completos || "N/A";
  }

  getDeliveryPhone(): string {
    const envio = this.pedidoSeleccionadoDetalle?.envio;
    return (
      envio?.celular ||
      envio?.otroNumero ||
      this.pedidoSeleccionadoDetalle?.cliente?.numero_celular_comprador ||
      "N/A"
    );
  }

  getFullAddress(): string {
    const envio = this.pedidoSeleccionadoDetalle?.envio;
    if (!envio) return "N/A";

    const addressParts = [
      envio.direccionEntrega,
      envio.nombreUnidad,
      envio.especificacionesInternas,
      envio.barrio,
    ].filter((part) => part && part.trim());

    return addressParts.length > 0 ? addressParts.join(", ") : "N/A";
  }

  getEstadoProcesoClass(estado: string): string {
    switch (estado) {
      case "SinProducir":
        return "bg-secondary";
      case "ProducidoTotalmente":
      case "Producido":
        return "bg-info";
      case "Empacado":
        return "bg-warning text-dark";
      case "Despachado":
        return "bg-primary";
      case "Entregado":
        return "bg-success";
      case "Rechazado":
        return "bg-danger";
      default:
        return "bg-light text-dark";
    }
  }

  getEstadoPagoClass(estado: string): string {
    switch (estado) {
      case "Pendiente":
        return "bg-warning text-dark";
      case "PreAprobado":
        return "bg-info";
      case "Aprobado":
        return "bg-success";
      case "Rechazado":
        return "bg-danger";
      case "Cancelado":
        return "bg-secondary";
      default:
        return "bg-light text-dark";
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Fecha inválida";
    }
  }

  isRotuloGenerando(pedido: Pedido): boolean {
    return !!pedido.nroPedido && this.generandoRotuloPara.has(pedido.nroPedido);
  }

  // ======= MÉTODOS PARA OPCIONES DE CADA PEDIDO =======
  printPdf(pedido: Pedido): void {
    this.onPrintPdf.emit(pedido);
  }

  viewTags(pedido: Pedido): void {
    this.onViewTags.emit(pedido);
  }

  printLabel(pedido: Pedido): void {
    this.onPrintLabel.emit(pedido);
  }

  // Método lifecycle para limpiar suscripciones
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
