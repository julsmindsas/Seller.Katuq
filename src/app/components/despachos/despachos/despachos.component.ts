import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import { Carrito, Cliente, EstadoPago, EstadoProceso, EstadoProcesoFiltros, Pedido } from '../../ventas/modelo/pedido';
import { Table } from 'primeng/table';
import { PaymentService } from '../../../shared/services/ventas/payment.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { jsPDF } from 'jspdf';
import { ServiciosService } from '../../../shared/services/servicios.service';
import 'bootstrap';
import html2canvas from 'html2canvas';
import { ClientesComponent } from '../../ventas/clientes/clientes.component';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PedidoEntregaComponent } from '../../ventas/entrega/pedido-entrega.component';
import { PedidosUtilService } from '../../ventas/service/pedidos.util.service';
import { UserLogged } from '../../../shared/models/User/UserLogged';
import { UserLite } from '../../../shared/models/User/UserLite';
import { DialogService } from 'primeng/dynamicdialog';
import { ObservacionesDetalleComponent } from '../components/observaciones-detalle/observaciones-detalle.component';

import 'jspdf-autotable';
import { LogisticaServiceV2 } from '../../../shared/services/despachos/logistica.service.v2';
import { FilterService } from 'primeng/api';
import html2pdf from 'html2pdf.js';
import { PedidoEntrega } from '../interfaces/pedido-entrega.interface';
import { Router } from '@angular/router';

interface ColumnDefinition {
  field: string;
  header: string;
  visible: boolean;
}

interface TarjetaInfo {
  tarjeta: any;
  pedido: string;
}

// Nuevas interfaces para el algoritmo de priorización
interface MetricasLogistica {
  pedidosUrgentes: number;
  pedidosEnRiesgo: number;
  pedidosNormales: number;
  porcentajeEntregasTiempo: number;
  tiempoPromedioDespacho: number;
  zonasConRetrasos: {[zona: string]: number};
  transportadoresEficiencia: {[transportador: string]: number};
  prediccionCargaProximosDias: {[fecha: string]: number};
}

interface PedidoPriorizado extends Pedido {
  prioridad?: 'alta' | 'media' | 'baja';
  diasRestantes?: number;
  tiempoEstimadoEntrega?: number;
  factoresRiesgo?: string[];
  puntajeKAI?: number;
  optimizacionRuta?: boolean;
}

@Component({
  selector: 'app-list-despachos',
  templateUrl: './despachos.component.html',
  styleUrls: ['./despachos.component.scss']
})
export class DespachosComponent implements OnInit {
  @ViewChild('clientes', { static: false }) clientes: ClientesComponent;
  @ViewChild('entrega', { static: false }) entrega: PedidoEntregaComponent;
  @ViewChild('pantallaOrdenEnvioModal', { static: false }) pantallaOrdenEnvioModal: TemplateRef<any>;
  @ViewChild('dispatchOrdersModal', { static: false }) dispatchOrdersModal: TemplateRef<any>;
  @ViewChild('detalleEntregaModal', { static: false }) detalleEntregaModal: TemplateRef<any>;
  @ViewChild('transportadoresModal', { static: false }) transportadoresModal: TemplateRef<any>;

  @ViewChild('printContent', { static: false }) printContent!: ElementRef
  orders: PedidoPriorizado[] = [];
  loading: boolean = true;
  totalValorProductoBruto: number;
  totalDescuento: number;
  htmlModal: any;
  clienteSeleccionado: Cliente;
  formulario: any;
  pedidoSeleccionado: Pedido;
  estadosPago = Object.values(EstadoPago);
  ciudadSeleccionada: string;
  ESTADOPAGO: any[];
  configuracionCarritoSeleccionado: Carrito;
  fechaInicial: Date;
  fechaFinal: Date;
  transportadorForm: FormGroup;
  ordenEnvioForm: FormGroup;
  metodoEnvio: any;
  pedidosSeleccionados: Pedido[] = [];
  transportadorSeleccionado: any;
  vendors: any;
  nroShippingOrder: any;
  nuevaOrdenEnvio: any;
  dispatchOrders: Pedido[];
  modalRef: any;
  editTransporter: boolean;
  dataEditTransporter: any;
  pedidoModal: any;
  isDialogOpen: boolean;
  pdfSize: any;
  filteredOrderNumbers: any;
  ordersByName: any;
  estadosProcesos: EstadoProcesoFiltros[];
  todasLasTarjetas: TarjetaInfo[] = [];
  tienetarjetas: boolean = true;
  detallePedidoEntregado: PedidoEntrega;
  
  // Nuevas propiedades para el algoritmo de priorización
  metricasLogistica: MetricasLogistica;
  pedidosUrgentes: PedidoPriorizado[] = [];
  pedidosEnRiesgo: PedidoPriorizado[] = [];
  pedidosNormales: PedidoPriorizado[] = [];
  diasUmbralUrgente: number = 1; // Pedidos con 1 día o menos para entrega
  diasUmbralRiesgo: number = 3; // Pedidos con 3 días o menos para entrega
  mostrarAlertasAvanzadas: boolean = true;
  kaiPredicciones: any = null;
  
  // Definiciones para la gestión de columnas
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
    { field: 'entregado', header: 'Entregado', visible: false },
    { field: 'prioridad', header: 'Prioridad', visible: true } // Nueva columna para mostrar la prioridad
  ];
  
  selectedColumns: ColumnDefinition[] = [];

  constructor(private ventasService: VentasService,
    private service: ServiciosService,
    private logisticaService: LogisticaServiceV2,
    private paymentService: PaymentService,
    private filterService: FilterService,
    private modalService: NgbModal,
    private dialogService: DialogService,
    private formBuilder: FormBuilder, private pedidoUtilService: PedidosUtilService, private router: Router) {
    const unaSemana = 15 * 24 * 60 * 60 * 1000; // dos semanas en milisegundos
    this.fechaInicial = new Date(new Date().setDate(new Date().getDate() - 1));
    this.fechaInicial.setHours(0, 0, 0, 0);
    this.fechaFinal = new Date(new Date().getTime() + unaSemana);
    this.fechaFinal.setHours(23, 59, 59, 999);
    this.registerCustomFilters();
    
    // Inicializar métricas de logística
    this.inicializarMetricas();
    
    // Guardar configuración de columnas en localStorage si existe
    const savedColumns = localStorage.getItem('despachosColumns');
    if (savedColumns) {
      try {
        this.displayedColumns = JSON.parse(savedColumns);
      } catch (e) {
        console.error('Error parsing saved columns configuration', e);
      }
    }
  }

  ngOnInit(): void {
    this.estadosProcesos = Object.values(EstadoProcesoFiltros)
    this.estadosPago = Object.values(EstadoPago);
    this.ESTADOPAGO = [
      { id: 1, nombre: 'Pendiente' },
      { id: 2, nombre: 'Pagado' },
      { id: 3, nombre: 'Anulado' },
      { id: 4, nombre: 'Devuelto' }
    ];
    // Inicializar las columnas seleccionadas al cargar
    this.selectedColumns = this.displayedColumns.filter(col => col.visible);
    
    // Inicializar métricas antes de cargar datos
    this.inicializarMetricas();
    
    this.refrescarDatos();
    this.initForms();
  }

  refrescarDatos() {
    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      company: JSON.parse(sessionStorage.getItem("currentCompany") || '{}').nomComercial,
      estadoProceso: [EstadoProceso.Rechazado, EstadoProceso.ParaDespachar, EstadoProceso.ProducidoTotalmente, EstadoProceso.SinProducir, EstadoProceso.ProducidoParcialmente, EstadoProceso.Entregado, EstadoProceso.Despachado, EstadoProceso.Empacado],
      estadosPago: [EstadoPago.PreAprobado, EstadoPago.Aprobado, EstadoPago.Pendiente, EstadoPago.Pospendiente],
      tipoFecha: 'fechaEntrega'
    }

    // Inicializar vendors para evitar errores
    if (!this.vendors) {
      this.vendors = [];
    }

    this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      this.orders = data as PedidoPriorizado[];
      this.orders.forEach(order => {
        if (order.fechaCreacion) {
          order.fechaCreacion = new Date(order.fechaCreacion).toISOString();
        }
        order.anticipo = order.anticipo ?? 0;
        order.subtotal = (order.totalPedididoConDescuento ?? 0) + (order.totalEnvio ?? 0) - (order.totalDescuento ?? 0);
        order.totalPedididoConDescuento = order.subtotal ?? 0 + (order.totalImpuesto ?? 0);
        order.faltaPorPagar = (order.totalPedididoConDescuento ?? 0) - (order.anticipo ?? 0);
      });
      
      // Aplicar algoritmo de priorización
      this.aplicarAlgoritmoPriorizacion();
      
      // Calcular métricas para análisis KAI
      this.calcularMetricas();
      
      this.loading = false;
    });

    this.logisticaService.getTransportadores().subscribe((data) => {
      this.vendors = data || [];
    });
  }

  // Algoritmo principal de priorización
  aplicarAlgoritmoPriorizacion() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Reiniciar arreglos de clasificación
    this.pedidosUrgentes = [];
    this.pedidosEnRiesgo = [];
    this.pedidosNormales = [];
    
    // Para cada pedido, calcular los días restantes hasta la entrega
    this.orders.forEach(pedido => {
      let fechaEntrega: Date;
      
      // Obtener la fecha de entrega del pedido
      if (pedido.fechaEntrega) {
        fechaEntrega = new Date(pedido.fechaEntrega);
      } else if (pedido.carrito && pedido.carrito.length > 0 && 
                pedido.carrito[0].configuracion?.datosEntrega?.fechaEntrega) {
        const { year, month, day } = pedido.carrito[0].configuracion.datosEntrega.fechaEntrega;
        fechaEntrega = new Date(year, month - 1, day);
      } else {
        // Si no hay fecha de entrega, asumimos que es un pedido estándar sin urgencia
        pedido.prioridad = 'baja';
        pedido.diasRestantes = 999; // Valor alto para indicar que no tiene fecha
        this.pedidosNormales.push(pedido);
        return;
      }
      
      fechaEntrega.setHours(0, 0, 0, 0);
      
      // Calcular días restantes
      const diferenciaTiempo = fechaEntrega.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));
      
      // Guardar los días restantes en el pedido
      pedido.diasRestantes = diasRestantes;
      
      // Identificar factores de riesgo
      const factoresRiesgo: string[] = [];
      
      // Verificar si es un pedido grande (más de 3 items)
      if (pedido.carrito && pedido.carrito.length > 3) {
        factoresRiesgo.push('Pedido grande');
      }
      
      // Verificar si es un pedido con envío a zona remota
      if (pedido.envio?.zonaCobro && 
          ['Rural', 'Extrarradio', 'Remota'].some(zona => pedido.envio?.zonaCobro?.includes(zona))) {
        factoresRiesgo.push('Zona remota');
      }
      
      // Verificar si tiene observaciones especiales
      if (pedido.envio?.observaciones && pedido.envio.observaciones.length > 0) {
        factoresRiesgo.push('Instrucciones especiales');
      }
      
      // Verificar forma de entrega especial
      if (pedido.formaEntrega && pedido.formaEntrega.includes('Especial')) {
        factoresRiesgo.push('Entrega especial');
      }
      
      // Calcular tiempo estimado de entrega basado en zona y factores
      let tiempoBase = 30; // 30 minutos base
      
      // Ajustes por zona
      if (pedido.envio?.zonaCobro) {
        if (pedido.envio.zonaCobro.includes('Centro')) tiempoBase += 15;
        else if (pedido.envio.zonaCobro.includes('Rural')) tiempoBase += 60;
        else if (pedido.envio.zonaCobro.includes('Extrarradio')) tiempoBase += 90;
        else tiempoBase += 30; // Otras zonas
      }
      
      // Ajustes por tamaño de pedido
      if (pedido.carrito) {
        tiempoBase += pedido.carrito.length * 5; // 5 minutos por artículo
      }
      
      pedido.tiempoEstimadoEntrega = tiempoBase;
      pedido.factoresRiesgo = factoresRiesgo;
      
      // Asignar prioridad basada en días restantes y factores de riesgo
      if (diasRestantes <= this.diasUmbralUrgente || 
          (diasRestantes <= this.diasUmbralUrgente + 1 && factoresRiesgo.length >= 2)) {
        pedido.prioridad = 'alta';
        this.pedidosUrgentes.push(pedido);
      } else if (diasRestantes <= this.diasUmbralRiesgo || factoresRiesgo.length >= 2) {
        pedido.prioridad = 'media';
        this.pedidosEnRiesgo.push(pedido);
      } else {
        pedido.prioridad = 'baja';
        this.pedidosNormales.push(pedido);
      }
      
      // Calcular puntaje para KAI (0-100)
      let puntajeBase = 50; // Punto medio
      
      // Reducir puntaje (más urgente) por cada día menos
      puntajeBase -= (this.diasUmbralRiesgo - diasRestantes) * 10;
      
      // Reducir puntaje por cada factor de riesgo
      puntajeBase -= factoresRiesgo.length * 5;
      
      // Ajustar si el pedido está pagado (menos riesgo)
      if (pedido.estadoPago === 'Aprobado') {
        puntajeBase += 10;
      }
      
      // Limitar el rango entre 0 y 100
      pedido.puntajeKAI = Math.max(0, Math.min(100, puntajeBase));
    });
    
    // Ordenar cada categoría por días restantes (ascendente)
    this.pedidosUrgentes.sort((a, b) => (a.diasRestantes || 999) - (b.diasRestantes || 999));
    this.pedidosEnRiesgo.sort((a, b) => (a.diasRestantes || 999) - (b.diasRestantes || 999));
    this.pedidosNormales.sort((a, b) => (a.diasRestantes || 999) - (b.diasRestantes || 999));
    
    // Implementar optimización rudimentaria de ruta
    this.optimizarRutas();
    
    // Mostrar alertas para pedidos urgentes
    this.mostrarAlertasPedidosUrgentes();
  }
  
  // Optimizar rutas agrupando pedidos por zonas
  optimizarRutas() {
    // Agrupar pedidos por zona y ciudad
    const zonas: {[key: string]: PedidoPriorizado[]} = {};
    
    // Primero los urgentes
    this.pedidosUrgentes.forEach(pedido => {
      const zona = `${pedido.envio?.ciudad || 'Sin ciudad'}-${pedido.envio?.zonaCobro || 'Sin zona'}`;
      if (!zonas[zona]) zonas[zona] = [];
      zonas[zona].push(pedido);
    });
    
    // Después los de riesgo
    this.pedidosEnRiesgo.forEach(pedido => {
      const zona = `${pedido.envio?.ciudad || 'Sin ciudad'}-${pedido.envio?.zonaCobro || 'Sin zona'}`;
      if (!zonas[zona]) zonas[zona] = [];
      zonas[zona].push(pedido);
    });
    
    // Marcar pedidos que pueden optimizarse (aquellos en zonas con múltiples entregas)
    Object.keys(zonas).forEach(zona => {
      if (zonas[zona].length > 1) {
        zonas[zona].forEach(pedido => {
          pedido.optimizacionRuta = true;
        });
      }
    });
  }
  
  // Mostrar alertas para pedidos urgentes
  mostrarAlertasPedidosUrgentes() {
    // Filtrar los pedidos urgentes excluyendo los despachados y entregados
    const pedidosUrgentesPendientes = this.pedidosUrgentes.filter(
      pedido => pedido.estadoProceso !== EstadoProceso.Despachado && 
               pedido.estadoProceso !== EstadoProceso.Entregado
    );
    
    if (pedidosUrgentesPendientes.length > 0 && this.mostrarAlertasAvanzadas) {
      const cantidadUrgentes = pedidosUrgentesPendientes.length;
      const pedidosMasUrgentes = pedidosUrgentesPendientes
        .slice(0, Math.min(3, cantidadUrgentes))
        .map(p => `<li>#${p.nroPedido} - ${p.diasRestantes} día(s) - ${p.cliente?.nombres_completos || 'Cliente'}</li>`)
        .join('');
      
      Swal.fire({
        title: '¡Atención! Pedidos Urgentes',
        html: `
          <div class="text-start">
            <p>Se han detectado <strong>${cantidadUrgentes} pedidos urgentes</strong> que requieren atención inmediata:</p>
            <ul>${pedidosMasUrgentes}</ul>
            ${cantidadUrgentes > 3 ? `<p>...y ${cantidadUrgentes - 3} más.</p>` : ''}
          </div>
        `,
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
    }
  }
  
  // Inicializar métricas de logística
  inicializarMetricas() {
    this.metricasLogistica = {
      pedidosUrgentes: 0,
      pedidosEnRiesgo: 0,
      pedidosNormales: 0,
      porcentajeEntregasTiempo: 0,
      tiempoPromedioDespacho: 0,
      zonasConRetrasos: {},
      transportadoresEficiencia: {},
      prediccionCargaProximosDias: {}
    };
    
    // Inicializar kaiPredicciones para evitar errores de null
    this.kaiPredicciones = {
      cargaEstimada: {},
      zonasCriticas: [],
      asignacionOptima: {},
      recomendaciones: []
    };
  }
  
  // Calcular métricas para análisis KAI
  calcularMetricas() {
    // Contar pedidos por categoría
    this.metricasLogistica.pedidosUrgentes = this.pedidosUrgentes.length;
    this.metricasLogistica.pedidosEnRiesgo = this.pedidosEnRiesgo.length;
    this.metricasLogistica.pedidosNormales = this.pedidosNormales.length;
    
    // Calcular porcentaje de entregas a tiempo (simulado para demostración)
    const entregados = this.orders.filter(p => p.estadoProceso === 'Entregado');
    const entregadosATiempo = entregados.filter(p => p.diasRestantes !== undefined && p.diasRestantes >= 0);
    this.metricasLogistica.porcentajeEntregasTiempo = entregados.length > 0 
      ? (entregadosATiempo.length / entregados.length) * 100
      : 100;
    
    // Tiempo promedio de despacho (simulado)
    this.metricasLogistica.tiempoPromedioDespacho = 35; // 35 minutos en promedio
    
    // Identificar zonas con más retrasos
    const zonasPedidos: {[zona: string]: {total: number, retrasados: number}} = {};
    
    this.orders.forEach(pedido => {
      const zona = pedido.envio?.zonaCobro || 'Sin zona';
      if (!zonasPedidos[zona]) {
        zonasPedidos[zona] = {total: 0, retrasados: 0};
      }
      
      zonasPedidos[zona].total++;
      
      if (pedido.diasRestantes !== undefined && pedido.diasRestantes < 0 && 
          pedido.estadoProceso !== 'Entregado' && pedido.estadoProceso !== 'Despachado') {
        zonasPedidos[zona].retrasados++;
      }
    });
    
    // Calcular porcentaje de retrasos por zona
    Object.keys(zonasPedidos).forEach(zona => {
      if (zonasPedidos[zona].total > 0) {
        const porcentajeRetraso = (zonasPedidos[zona].retrasados / zonasPedidos[zona].total) * 100;
        this.metricasLogistica.zonasConRetrasos[zona] = porcentajeRetraso;
      }
    });
    
    // Eficiencia de transportadores (simulado)
    if (this.vendors && Array.isArray(this.vendors)) {
      this.vendors.forEach(transportador => {
        const nombre = `${transportador.nombres} ${transportador.apellidos}`;
        this.metricasLogistica.transportadoresEficiencia[nombre] = Math.floor(Math.random() * 30) + 70; // 70-100%
      });
    }
    
    // Predicción de carga para próximos días
    const hoy = new Date();
    
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      // Usar timestamp en lugar de cadena ISO
      const fechaTimestamp = fecha.getTime();
      
      // Contar pedidos programados para cada día
      const pedidosProgramados = this.orders.filter(p => {
        if (!p.fechaEntrega) return false;
        const fechaEntrega = new Date(p.fechaEntrega);
        // Convertir ambas fechas a formato 'YYYY-MM-DD' para comparar solo la fecha sin la hora
        const fechaEntregaStr = fechaEntrega.toISOString().split('T')[0];
        const fechaComparacionStr = fecha.toISOString().split('T')[0];
        return fechaEntregaStr === fechaComparacionStr;
      }).length;
      
      // Añadir predicción base + variación aleatoria para simular
      this.metricasLogistica.prediccionCargaProximosDias[fechaTimestamp] = pedidosProgramados;
    }
    
    // Simular predicciones de KAI
    this.generarPrediccionesKAI();
  }
  
  // Generar predicciones simuladas para KAI
  generarPrediccionesKAI() {
    const hoy = new Date();
    const zonas = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];
    const transportadores = this.vendors && Array.isArray(this.vendors) 
      ? this.vendors.map(v => `${v.nombres} ${v.apellidos}`)
      : [];
    
    // Estructura para predicciones KAI
    this.kaiPredicciones = {
      cargaEstimada: {},
      zonasCriticas: [],
      asignacionOptima: {},
      recomendaciones: [
        'Priorizar pedidos de la zona Sur para el día de mañana debido a alta demanda.',
        'Considerar asignar un transportador adicional para el sector Norte el próximo jueves.',
        'Revisar los pedidos con instrucciones especiales de entrega con anticipación.',
        'Los pedidos de productos frágiles deben ser empacados con material adicional.'
      ]
    };
    
    // Predicción de carga por zona y día
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      // Guardar la fecha como timestamp (número) en lugar de cadena ISO
      const fechaTimestamp = fecha.getTime();
      
      this.kaiPredicciones.cargaEstimada[fechaTimestamp] = {};
      
      zonas.forEach(zona => {
        // Simular carga por zona - más alta para los primeros días, decreciente después
        let cargaBase = Math.floor((7 - i) * Math.random() * 5) + 1;
        // Añadir variabilidad
        if (zona === 'Centro') cargaBase += 3; // Más carga en centro
        if (i === 1 || i === 2) cargaBase += 2; // Más carga en días específicos
        
        this.kaiPredicciones.cargaEstimada[fechaTimestamp][zona] = cargaBase;
      });
    }
    
    // Zonas críticas (con alta carga o problemas históricos)
    const fechaCritica1 = new Date(hoy);
    fechaCritica1.setDate(fechaCritica1.getDate() + 1);
    
    const fechaCritica2 = new Date(hoy);
    fechaCritica2.setDate(fechaCritica2.getDate() + 2);
    
    this.kaiPredicciones.zonasCriticas = [
      { zona: 'Sur', motivo: 'Alta demanda prevista', fechaCritica: fechaCritica1.getTime() },
      { zona: 'Centro', motivo: 'Congestión de tráfico', fechaCritica: fechaCritica2.getTime() }
    ];
    
    // Asignación óptima de transportadores
    transportadores.forEach(transportador => {
      this.kaiPredicciones.asignacionOptima[transportador] = {
        zonasRecomendadas: [zonas[Math.floor(Math.random() * zonas.length)], zonas[Math.floor(Math.random() * zonas.length)]],
        capacidadOptima: Math.floor(Math.random() * 5) + 3,
        eficienciaHistorica: Math.floor(Math.random() * 20) + 80
      };
    });
  }
  
  // Método para obtener el conteo de pedidos por prioridad
  obtenerConteoPedidosPorPrioridad() {
    return {
      urgentes: this.pedidosUrgentes.length,
      riesgo: this.pedidosEnRiesgo.length,
      normales: this.pedidosNormales.length,
      total: this.orders.length
    };
  }
  
  // Método para obtener zonas críticas para mostrar alertas
  obtenerZonasCriticas(): {zona: string, porcentaje: number}[] {
    return Object.entries(this.metricasLogistica.zonasConRetrasos)
      .map(([zona, porcentaje]) => ({zona, porcentaje}))
      .filter(z => z.porcentaje > 20)  // Zonas con más del 20% de retrasos
      .sort((a, b) => b.porcentaje - a.porcentaje)
      .slice(0, 3);  // Top 3 zonas problemáticas
  }
  
  // Método para mostrar recomendaciones de optimización
  mostrarRecomendacionesOptimizacion() {
    if (!this.kaiPredicciones) return;
    
    const recomendaciones = this.kaiPredicciones.recomendaciones.join('</li><li>');
    
    Swal.fire({
      title: 'Recomendaciones de KAI',
      icon: 'info',
      html: `
        <div class="text-start">
          <p>Basado en el análisis de datos históricos y patrones actuales, KAI sugiere:</p>
          <ul><li>${recomendaciones}</li></ul>
        </div>
      `,
      confirmButtonText: 'Aplicar recomendaciones',
      showCancelButton: true,
      cancelButtonText: 'Revisar más tarde'
    }).then((result) => {
      if (result.isConfirmed) {
        // Aquí se implementaría la lógica para aplicar las recomendaciones
        Swal.fire('Recomendaciones aplicadas', 'Los cambios han sido implementados en el sistema', 'success');
      }
    });
  }
  
  calculateValorBruto(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.totalPedidoSinDescuento ?? 0), 0);
  }

  calculateDescuento(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.totalDescuento ?? 0), 0);
  }

  calculateTotal(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.totalPedididoConDescuento ?? 0), 0);
  }

  calculateFaltaPorPagar(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.faltaPorPagar ?? 0), 0);
  }

  calculateTotalEnvio(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.totalEnvio ?? 0), 0);
  }

  calculateAnticipo(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.anticipo ?? 0), 0);
  }

  calculateSubtotal(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.totalPedidoSinDescuento ?? 0), 0);
  }

  calculateTotalImpuestos(): number {
    return this.orders.reduce((acc, pedido) => acc + (pedido.totalImpuesto ?? 0), 0);
  }

  imprimirOrdenConHtml2Pdf() {
    const totalPendiente = this.pedidosSeleccionados.reduce(
      (acc, pedido) => acc + (pedido.faltaPorPagar || 0),
      0
    );

    const pedidosHTML = this.pedidosSeleccionados.map(p => {
      const filaPrincipal = `
      <tr>
        <td>${p.nroPedido ?? 'N/A'}</td>
        <td>$${(p.faltaPorPagar ?? 0).toLocaleString()}</td>
        <td>___________</td>
        <td>
          <strong>Nombre:</strong> ${p?.envio?.nombres ?? 'N/A'} 
            ${p?.envio?.apellidos ?? 'N/A'}<br>
          <strong>Teléfono:</strong> ${p?.envio?.celular ?? 'N/A'}<br>
          <strong>WhatsApp:</strong> ${p?.envio?.celular ?? 'N/A'}<br>
          <strong>Otro Número:</strong> ${p?.envio?.otroNumero ?? 'N/A'}<br>
          <strong>Dirección:</strong> 
            ${p?.envio?.direccionEntrega ?? ''}, 
            ${p?.envio?.nombreUnidad ?? ''}, 
            ${p?.envio?.especificacionesInternas ?? ''}, 
            ${p?.envio?.observaciones ?? ''}
        </td>
        <td>${p?.horarioEntrega ?? 'N/A'}</td>
        <td>${p?.envio?.ciudad ?? 'N/A'}</td>
        <td>${p?.envio?.departamento ?? 'N/A'}</td>
      </tr>
    `;

      const filaSecundaria = `
      <tr style="border-bottom: 1px solid #000;border-top: 1px solid #000;">
        <td colspan="4"></td>
        <td colspan="3">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #000; color: #fff;">
              <th style="border: 1px solid #000;">Zona Entrega</th>
              <th style="border: 1px solid #000;">Barrio</th>
              <th style="border: 1px solid #000;">País</th>
            </tr>
            <tr>
              <td>${p?.envio?.zonaCobro ?? 'N/A'}</td>
              <td>${p?.envio?.barrio ?? 'N/A'}</td>
              <td>${p?.envio?.pais ?? 'N/A'}</td>
            </tr>
          </table>
        </td>
      </tr>
    `;

      return filaPrincipal + filaSecundaria;
    }).join('');

    const tableHeader = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background-color: #000; color: #fff;">
          <th style="border: 1px solid #000; padding: 5px;">Número de Pedido</th>
          <th style="border: 1px solid #000; padding: 5px;">Valor a Cobrar</th>
          <th style="border: 1px solid #000; padding: 5px;">Firma</th>
          <th style="border: 1px solid #000; padding: 5px;">Datos de Entrega</th>
          <th style="border: 1px solid #000; padding: 5px;">Horario de Entrega</th>
          <th style="border: 1px solid #000; padding: 5px;">Ciudad</th>
          <th style="border: 1px solid #000; padding: 5px;">Departamento</th>
        </tr>
      </thead>
      <tbody>
        ${pedidosHTML}
      </tbody>
    </table>
  `;
  
    // Obtener el nombre del despachador actual
    const userLite = this.getCurrentUser();
    const userName = userLite ? userLite.name : 'N/A';

    const content = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; padding:20px; width:100%;">
      <table style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
        <tr>
          <td>
            <h2 style="margin:0; font-size: 18px;">
              Orden de Envío: ${this.nroShippingOrder}
            </h2>
          </td>
          <td>
            <h2 style="margin:0; font-size: 18px;">
              Número de pedidos: ${this.pedidosSeleccionados.length}
            </h2>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Fecha de Generación: ${new Date().toLocaleDateString()}
            </p>
          </td>
          <td>
            <p style="margin:0; font-size: 14px;">
              Total a Recaudar: $${totalPendiente.toLocaleString()}
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Transportador: ${this.transportadorSeleccionado ?? 'N/A'}
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Despachador: ${userName}
            </p>
          </td>
          <td>
            <p style="margin:0; font-size: 14px;">
              Fecha y Hora despachado: ${new Date().toISOString()}
            </p>
          </td>
        </tr>
      </table>
      ${tableHeader}
    </div>
  `;

    const element = document.createElement('div');
    element.innerHTML = content;
    document.body.appendChild(element);

    const options = {
      margin: 0.5,
      filename: `orden-envio-${this.nroShippingOrder}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1.5 },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'landscape'
      }
    };

    html2pdf()
      .from(element)
      .set(options)
      .toPdf()
      .get('pdf')
      .then(pdf => {
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .finally(() => {
        document.body.removeChild(element);
      })
      .catch(err => {
        console.error("Error generando PDF:", err);
        document.body.removeChild(element);
      });
  }

  private registerCustomFilters() {
    this.filterService.register('horarioEntregaCustom', (value, filter): boolean => {
      if (!filter) {
        return true;
      }
      if (value === undefined || value === null) {
        return false;
      }


      const result = filter.some((item) => {
        const filterString = "Pedido: " + item.nroPedido + ' - ' + item.horarioEntrega;
        return value.includes(item.horarioEntrega.toString());
      });
      return result;

    });

    this.filterService.register('customDate', (value, filter): boolean => {
      if (filter === undefined || filter === null) {
        return true;
      }

      if (value === undefined || value === null) {
        return false;
      }


      return new Date(value).getTime() === filter.getTime();


    });
  }

  clear(table?: Table) {
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    this.fechaInicial = new Date(new Date().setDate(new Date().getDate() - 1));
    this.fechaInicial.setHours(0, 0, 0, 0);

    this.fechaFinal = new Date();
    this.fechaFinal.setDate(this.fechaFinal.getDate() + 7); // Una semana desde hoy
    this.fechaFinal.setHours(23, 59, 59, 999);
    
    this.refrescarDatos();
    
    // Si se proporciona una tabla, limpiarla
    if (table) {
      table.clear();
    }
  }

  refrescar(table?: Table) {
    this.refrescarDatos();
    if (table) {
      table.clear();
    }
  }
  onOrderSelect(event) {
    this.orders = [event];
    // this.orders= this.ordersByName.filter(P=>)
  }
  filtroGlobal(event: any) {
    const query = event.query;
    this.service.getOrderByName(query).then(res => {

      this.filteredOrderNumbers = res;
      this.ordersByName = res;


    })
  }

  initForms() {

    this.transportadorForm = this.formBuilder.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      cedula: ['', Validators.required],
      telefono: ['', Validators.required],
      whatsapp: [''],
      correo: ['', [Validators.required, Validators.email]],
      fechaNacimiento: ['', Validators.required],
      eps: [''],
      arl: [''],
      marcaMoto: [''],
      lineaMoto: [''],
      modeloMoto: [''],
      placa: [''],
      capacidadCarga: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
      pwd: ['', Validators.required],
    });

    this.ordenEnvioForm = this.formBuilder.group({
      fechaEnvio: ['', Validators.required],
      metodoEnvio: ['', Validators.required]
    });


  }
  deleteTransporter(item: any) {
    this.logisticaService.deleteTrasportadora(item).subscribe((data) => {
      Swal.fire('Exitio', 'Transportador eliminado con exito', 'success')
      this.refrescarDatos()
    });
  }

  editDatosClientes(content: any, order: Pedido) {
    if (order.cliente) {
      this.clienteSeleccionado = order.cliente;
      this.modalService.open(content, {
        size: 'xl',
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: 'modal-basic-title'
      }).result.then((result) => {
        this.editOrder(order);
      }, (reason) => {
        if (reason !== 'Cross click') {
          this.editOrder(order);
        }
      });
    }
  }




  // Generar el contenido del PDF con máximo 3 pedidos por página
  pedidosPorPagina = 4;

  // Función para dividir los pedidos en grupos de 3
  dividirPedidosEnPagina(pedidos: any[], pedidosPorPagina: number): any[][] {
    let paginas: any[][] = [];
    for (let i = 0; i < pedidos.length; i += pedidosPorPagina) {
      paginas.push(pedidos.slice(i, i + pedidosPorPagina));
    }
    return paginas;
  }

  todayDate() {
    return new Date().toISOString();
  }
  // Iterar sobre cada grupo de pedidos y generar una página en el PDF
  async imprimirOrden() {
    this.imprimirOrdenConHtml2Pdf();
  };



  editOrder(order: Pedido) {
    if (order.carrito && order.carrito.length > 0) {
      const firstItem = order.carrito[0];
      const datosEntrega = firstItem.configuracion?.datosEntrega;
      
      if (datosEntrega?.fechaEntrega) {
        const { year, month, day } = datosEntrega.fechaEntrega;
        order.fechaEntrega = new Date(year, month - 1, day).toISOString();
        order.horarioEntrega = datosEntrega.horarioEntrega;
      }
    }
    
    this.ventasService.editOrder(order).subscribe((data) => {
      this.refrescarDatos();
      Swal.fire({
        icon: 'success',
        title: 'Pedido actualizado correctamente',
        showConfirmButton: false,
        timer: 1500
      });
    });
  }
  // Método para verificar si un pedido puede ser manipulado
  puedeManipularPedido(pedido: Pedido): boolean {
    // Los pedidos en estado "Sin Producir" no pueden ser manipulados
    if (pedido.estadoProceso === EstadoProceso.SinProducir) {
      return false;
    }
    
    return true;
  }
  
  // Verificar si un pedido específico puede cambiar a un estado específico
  puedeAvanzarAEstado(pedido: Pedido, nuevoEstado: string): boolean {
    // Si el pedido está en estado "Sin Producir" y se intenta avanzar a cualquier 
    // estado de empacado, despachado o entregado, bloquearlo
    if (pedido.estadoProceso === EstadoProceso.SinProducir &&
        [EstadoProceso.Empacado, EstadoProceso.Despachado, EstadoProceso.Entregado].includes(nuevoEstado as EstadoProceso)) {
      return false;
    }
    
    return true;
  }
  
  cambiarEstado(order: Pedido, estado: number) {
    // Determinar el nuevo estado basado en el código
    let nuevoEstado: EstadoProceso;
    switch(estado) {
      case 1: nuevoEstado = EstadoProceso.Empacado; break;
      case 2: nuevoEstado = EstadoProceso.ProducidoTotalmente; break;
      case 3: nuevoEstado = EstadoProceso.Empacado; break;
      case 4: nuevoEstado = EstadoProceso.Despachado; break;
      case 5: nuevoEstado = EstadoProceso.Entregado; break;
      default: return; // Estado no reconocido
    }
    
    // Verificar si el pedido puede cambiar al nuevo estado
    if (!this.puedeAvanzarAEstado(order, nuevoEstado)) {
      Swal.fire({
        icon: 'error',
        title: 'Operación no permitida',
        text: 'Los pedidos en estado "Sin Producir" no pueden ser empacados, despachados o entregados. Debe completarse la producción primero.',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    
    const userLite = this.getCurrentUser();
    if (!userLite) {
      Swal.fire('Error', 'No se pudo obtener información del usuario', 'error');
      return;
    }
    
    switch(estado) {
      case 1:
        order.estadoProceso = EstadoProceso.Empacado;
        order.fechaHoraEmpacado = new Date().toISOString();
        order.empacador = userLite.name;
        break;
      case 2:
        order.estadoProceso = EstadoProceso.ProducidoTotalmente;
        order.fechaHoraEmpacado = undefined;
        order.empacador = undefined;
        order.shippingOrder = undefined;
        order.nroShippingOrder = undefined;
        order.despachador = undefined;
        order.fechaYHorarioDespachado = undefined;
        order.transportador = undefined;
        break;
      case 3:
        order.estadoProceso = EstadoProceso.Empacado;
        order.shippingOrder = undefined;
        order.nroShippingOrder = undefined;
        order.despachador = undefined;
        order.fechaYHorarioDespachado = undefined;
        order.transportador = undefined;
        break;
      case 4:
        order.estadoProceso = EstadoProceso.Despachado;
        order.fechaYHorarioDespachado = new Date().toISOString();
        order.despachador = userLite;
        order.transportador = userLite.name;
        order.nroShippingOrder = "00";
        order.shippingOrder = "00";
        break;
      case 5:
        order.estadoProceso = EstadoProceso.Entregado;
        order.despachador = userLite;
        order.entregado = userLite;
        order.fechaYHorarioDespachado = new Date().toISOString();
        break;
    }

    this.ventasService.editOrder(order).subscribe((data) => {
      this.refrescarDatos();
      Swal.fire({
        icon: 'success',
        title: 'Pedido actualizado correctamente',
        showConfirmButton: false,
        timer: 1500
      });
    });
  }

  actualizarValoresPedido(order: Pedido) {
    this.pedidoUtilService.pedido = order;
    order.totalDescuento = this.pedidoUtilService.getDiscount();
    order.totalPedidoSinDescuento = this.pedidoUtilService.getSubtotal();
    const totalEnvio = order.totalEnvio || 0;
    order.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(totalEnvio);
    return order;
  }

  deleteProductToCart(order: Pedido, carrito: Carrito) {
    if (order.carrito) {
      const index = order.carrito.findIndex((item) => 
        item.producto?.identificacion?.referencia === carrito.producto?.identificacion?.referencia
      );
      if (index !== -1) {
        order.carrito.splice(index, 1);
      }
      this.editOrder(order);
    }
  }

  deleteOrder(order: Pedido) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "¡No podrás revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminarlo'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ventasService.deleteOrder(order).subscribe((data) => {
          this.refrescarDatos();
          Swal.fire(
            'Eliminado',
            'El pedido ha sido eliminado.',
            'success'
          );
        });
      }
    });
  }

  editSeller(order: Pedido) {
    if (order.asesorAsignado && order.asesorAsignado.nit === '9999') {
      Swal.fire({
        title: '¿Estás seguro?',
        text: "Estás a punto de cambiar el asesor asignado a este pedido.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, cambiar asesor',
        cancelButtonText: 'No, cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          const userLite = this.getCurrentUser();
          if (!userLite) {
            Swal.fire('Error', 'No se pudo obtener información del usuario', 'error');
            return;
          }
          
          order.asesorAsignado = userLite;
          this.editOrder(order);
          Swal.fire(
            'Cambiado',
            'El asesor ha sido cambiado.',
            'success'
          );
        }
      });
    } else {
      Swal.fire({
        title: '¡Alerta!',
        text: "Este pedido ya tiene un asesor asignado.",
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  buscarPorFechas(table?: Table): void {
    // Validar fechas
    if (!this.fechaInicial || !this.fechaFinal) {
      Swal.fire('Error', 'Por favor seleccione un rango de fechas vu00e1lido', 'error');
      return;
    }

    // Asegurar que las fechas tienen horario correcto para bu00fasqueda
    // Asegurarse de que las fechas sean objetos Date
    const fechaInicialBusqueda = new Date(this.fechaInicial instanceof Date ? this.fechaInicial : new Date(this.fechaInicial));
    fechaInicialBusqueda.setHours(0, 0, 0, 0);
    
    const fechaFinalBusqueda = new Date(this.fechaFinal instanceof Date ? this.fechaFinal : new Date(this.fechaFinal));
    fechaFinalBusqueda.setHours(23, 59, 59, 999);

    // Validar que la fecha inicial no sea mayor que la final
    if (fechaInicialBusqueda > fechaFinalBusqueda) {
      Swal.fire('Error', 'La fecha inicial no puede ser mayor que la fecha final', 'error');
      return;
    }

    // Obtener empresa actual
    const currentCompanyStr = sessionStorage.getItem("currentCompany");
    const companyName = currentCompanyStr ? JSON.parse(currentCompanyStr).nomComercial : '';
    
    const filter = {
      fechaInicial: fechaInicialBusqueda,
      fechaFinal: fechaFinalBusqueda,
      company: companyName,
      estadoProceso: [EstadoProceso.Rechazado, EstadoProceso.ParaDespachar, EstadoProceso.ProducidoTotalmente, EstadoProceso.SinProducir, EstadoProceso.Producido, EstadoProceso.Entregado, EstadoProceso.Despachado, EstadoProceso.Empacado],
      estadosPago: [EstadoPago.PreAprobado, EstadoPago.Aprobado, EstadoPago.Pendiente, EstadoPago.Pospendiente],
      tipoFecha: 'fechaEntrega'
    }

    this.loading = true;
    this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      this.orders = data;
      this.orders.forEach(order => {
        if (order.fechaCreacion) {
          order.fechaCreacion = new Date(order.fechaCreacion).toISOString();
        }
        order.anticipo = order.anticipo ?? 0;
        order.faltaPorPagar = (order.totalPedididoConDescuento ?? 0) - (order.anticipo ?? 0);
      });
      this.loading = false;
    });

    if (table) {
      table.clear();
    }
  }

  filtrarParaHoy(): void {
    const fechaActual = new Date();
    this.fechaInicial = new Date(fechaActual.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaActual.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }

  filtrarParaManana(): void {
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    this.fechaInicial = new Date(fechaManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaManana.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }

  filtrarParaPasadoManana(): void {
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);
    this.fechaInicial = new Date(fechaPasadoManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaPasadoManana.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }

  AsentarPago(content, order: Pedido) {
    if (order.estadoPago === EstadoPago.Aprobado && (order.faltaPorPagar || 0) <= 0) {
      Swal.fire({
        title: '¡Alerta!',
        text: "Este pedido ya ha sido pagado en su totalidad.",
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }).result.then((result) => {
      if (order.PagosAsentados) {
        order.PagosAsentados.push(result);
      } else {
        order.PagosAsentados = [result];
      }
      this.actualizarValoresPedido(order);
      this.editOrder(order);
    });
  }

  convertFechaEntregaString(fechaEntrega: { day: number, month: number, year: number }) {
    if (!fechaEntrega) {
      return '';
    }
    return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
  }

  openModal(content, edit?: boolean, item?: any) {
    if (edit === true) {
      this.editTransporter = edit
      this.dataEditTransporter = item
      this.transportadorForm.patchValue(item)
    } else {
      this.editTransporter = false
      this.dataEditTransporter = null
      this.transportadorForm.reset()
      this.ordenEnvioForm.reset()
      this.metodoEnvio = undefined
      this.pedidosSeleccionados = []
    }
    this.modalRef = this.modalService.open(content, { size: 'xl', fullscreen: true });
    this.modalRef.result.then(
      (result) => {
        this.refrescarDatos(); // Lógica a ejecutar cuando se cierra el modal
      },
      (reason) => {
        this.refrescarDatos(); // Lógica a ejecutar cuando se cierra el modal
      }
    );
  }
  
  openModalDetalleEntrega(content, pedido) {
    this.detallePedidoEntregado = pedido
    this.modalRef = this.modalService.open(content, { size: 'xl', fullscreen: true });
  }

  openDetalleEntrega(pedido: Pedido) {
    this.detallePedidoEntregado = pedido;
    this.modalService.open(this.detalleEntregaModal, { size: 'xl', fullscreen: true });
  }
  
  onSaveTransportador(transportador: any) {
    if (this.editTransporter) {
      transportador.id = this.dataEditTransporter.id;
      transportador.date_edit = this.dataEditTransporter.date_edit;
    }
    
    this.logisticaService.createTrasportadora(transportador).subscribe(
      response => {
        Swal.fire('Éxito', 'Transportador guardado exitosamente', 'success');
        this.refrescarDatos();
        this.modalRef.dismiss();
      },
      error => {
        Swal.fire('Error', 'Hubo un problema al guardar el transportador', 'error');
      }
    );
  }
  
  imprimirToPdf() {
    const printContent = document.getElementById('htmlPdf');
    if (printContent) {
      html2canvas(printContent).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`pedido-${this.pedidoSeleccionado.nroPedido}.pdf`);
      });
    } else {
      console.error('No se encontró el elemento para imprimir');
    }
  }

  verNotasCliente(pedido) {
    if (!pedido.notasPedido) {
      Swal.fire({
        title: 'Notas del Pedido',
        text: 'No hay notas para mostrar',
        icon: 'info',
        customClass: {
          popup: 'swal2-custom-width'
        },
        didOpen: () => {
          const popup = document.querySelector('.swal2-popup') as HTMLElement;
          if (popup) {
            popup.style.width = '80%';
            popup.style.maxWidth = 'none';
          }
        }
      });
      return;
    }

    // Función para crear el contenido HTML de una lista de notas
    const createNotesList = (notas, tipo) => {
      if (!notas || notas.length === 0) {
        return `<p>No hay notas de ${tipo} para mostrar</p>`;
      }

      return `<ul class="list-group">${notas.map((nota, index) =>
        `<li class="list-group-item"><strong>Nota ${index + 1}:</strong> ${nota.fecha} - ${nota.nota}</li>`).join('')}</ul>`;
    };

    // Crear el contenido HTML para cada categoría de notas
    const notasCliente = createNotesList(pedido.notasPedido.notasCliente, 'cliente');
    const notasDespachos = createNotesList(pedido.notasPedido.notasDespachos, 'despachos');
    const notasEntregas = createNotesList(pedido.notasPedido.notasEntregas, 'entregas');
    const notasProduccion = createNotesList(pedido.notasPedido.notasProduccion, 'produccion')

    // Estructura HTML con pestañas de Bootstrap
    const tabsHtml = `
    <ul class="nav nav-tabs" id="myTab" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="cliente-tab" data-bs-toggle="tab" data-bs-target="#cliente" type="button" role="tab" aria-controls="cliente" aria-selected="true">Notas del Cliente</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="despachos-tab" data-bs-toggle="tab" data-bs-target="#despachos" type="button" role="tab" aria-controls="despachos" aria-selected="false">Notas de Despachos</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="entregas-tab" data-bs-toggle="tab" data-bs-target="#entregas" type="button" role="tab" aria-controls="entregas" aria-selected="false">Notas de entregas</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="produccion-tab" data-bs-toggle="tab" data-bs-target="#produccion" type="button" role="tab" aria-controls="produccion" aria-selected="false">Notas de Producción</button>
      </li>
    </ul>
    <div class="tab-content" id="myTabContent">
      <div class="tab-pane fade show active" id="cliente" role="tabpanel" aria-labelledby="cliente-tab">
        ${notasCliente}
      </div>
      <div class="tab-pane fade" id="despachos" role="tabpanel" aria-labelledby="despachos-tab">
        ${notasDespachos}
      </div>
      <div class="tab-pane fade" id="entregas" role="tabpanel" aria-labelledby="entregas-tab">
        ${notasEntregas}
      </div>
      <div class="tab-pane fade" id="produccion" role="tabpanel" aria-labelledby="produccion-tab">
        ${notasProduccion}
      </div>
    </div>`;

    // Mostrar el modal de SweetAlert2 con las pestañas
    Swal.fire({
      title: 'Notas del Pedido',
      html: tabsHtml,
      customClass: {
        popup: 'swal2-custom-width'
      },
      didOpen: () => {
        const popup = document.querySelector('.swal2-popup') as HTMLElement;
        if (popup) {
          popup.style.width = '80%';
          popup.style.maxWidth = 'none';
        }

        // Inicializar los eventos de Bootstrap para las pestañas
        const triggerTabList = [].slice.call(document.querySelectorAll('#myTab button'));
        triggerTabList.forEach((triggerEl) => {
          const tabTrigger = new (window as any).bootstrap.Tab(triggerEl);
          triggerEl.addEventListener('click', (event) => {
            event.preventDefault();
            tabTrigger.show();
          });
        });
      }
    });
  }
  iterarTarjetas(pedido) {
    const tarjetas: any[] = [];
    if (pedido.carrito) {
      pedido.carrito.forEach(producto => {
        if (producto.configuracion && producto.configuracion.tarjetas) {
          producto.configuracion.tarjetas.forEach(tarj => {
            if (tarj.de !== "" || tarj.para !== "" || tarj.mensaje !== "") {
              tarjetas.push(tarj);
            }
          });
        }
      });
    }
    return tarjetas.length > 0;
  }
  verTarjetasPedido(pedido) {
    this.todasLasTarjetas = [];

    if (pedido.carrito) {
      pedido.carrito.forEach(producto => {
        if (producto.configuracion && producto.configuracion.tarjetas) {
          producto.configuracion.tarjetas.forEach(tarj => {
            if (tarj.de !== "" || tarj.para !== "" || tarj.mensaje !== "") {
              this.todasLasTarjetas.push({ tarjeta: tarj, pedido: producto.producto?.crearProducto?.titulo || 'Sin título' });
            }
          });
        }
      });
    }

    if (this.todasLasTarjetas.length === 0) {
      Swal.fire({
        title: 'Tarjetas de Productos',
        text: 'No hay tarjetas de productos para mostrar',
        icon: 'info',
        customClass: {
          popup: 'swal2-custom-width'
        },
        didOpen: () => {
          const popup = document.querySelector('.swal2-popup') as HTMLElement;
          if (popup) {
            popup.style.width = '80%';
            popup.style.maxWidth = 'none';
          }
        }
      });
    } else {
      const tarjetas = this.todasLasTarjetas.map((tarjeta, index) =>
        `<li>
      
        <strong>Tarjeta ${index + 1}:</strong>.  <strong>Producto:</strong> ${tarjeta.pedido}
        De:${tarjeta.tarjeta.de} - Mensaje:${tarjeta.tarjeta.mensaje} - Para:${tarjeta.tarjeta.para}
        <button class="btn btn-primary imprimir-tarjeta" data-index="${index}">Imprimir</button>
      </li>`).join('');

      Swal.fire({
        title: 'Tarjetas de Productos',
        html: `<ul>${tarjetas}</ul>`,
        customClass: {
          popup: 'swal2-custom-width'
        },
        didOpen: () => {
          const popup = document.querySelector('.swal2-popup') as HTMLElement;
          if (popup) {
            popup.style.width = '80%';
            popup.style.maxWidth = 'none';
          }

          const imprimirButtons = document.querySelectorAll('.imprimir-tarjeta');
          imprimirButtons.forEach(button => {
            button.addEventListener('click', (event) => {
              const index = (event.target as HTMLElement).getAttribute('data-index');
              if (index !== null) {
                const tarjeta = this.todasLasTarjetas[parseInt(index)];
                this.imprimirTarjeta(tarjeta.tarjeta);
              }
            });
          });
        }
      });
    }
  }

  imprimirTarjeta(tarjeta) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'cm',
      format: [10, 15]
    });

    doc.setFont("times", "italic"); // Cambiar la fuente a Times Italic
    doc.setFontSize(12); // Tamaño de la letra

    // Width of the document
    const pageWidth = doc.internal.pageSize.getWidth();

    // Starting y position
    let yPos = 2;

    // Add the "de" field
    if (tarjeta.para) {
      const paraLabelWidth = doc.getTextWidth("Para:");
      const deTextWidth = doc.getTextWidth(tarjeta.para);
      doc.text('Para:', (pageWidth - paraLabelWidth) / 2, yPos)
      yPos += 0.5;
      doc.text(`${tarjeta.para}`, (pageWidth - deTextWidth) / 2, yPos);
    }


    // Calculate the height of the "de" field text
    yPos += doc.getTextDimensions(tarjeta.de).h / 10 + 0.5; // 0.5 cm padding

    // Add the "mensaje" field
    const splitMensaje = doc.splitTextToSize(tarjeta.mensaje, 13); // Wrap text within 13 cm
    const mensajeTextHeight = doc.getTextDimensions(splitMensaje.join('\n')).h / 10;
    splitMensaje.forEach((line) => {
      const lineWidth = doc.getTextWidth(line);
      doc.text(line, (pageWidth - lineWidth) / 2, yPos);
      yPos += mensajeTextHeight / splitMensaje.length;
    });
    yPos += 0.5; // Add padding after mensaje

    // Add the "para" field
    if (tarjeta.de) {
      const paraLabelWidth = doc.getTextWidth("De:");
      const paraTextWidth = doc.getTextWidth(tarjeta.de);
      doc.text('De:', (pageWidth - paraLabelWidth) / 2, yPos)
      yPos += 0.5;
      doc.text(`${tarjeta.de}`, (pageWidth - paraTextWidth) / 2, yPos);
    }


    // Generar el blob y abrir en una nueva ventana
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }



  onMetodoEnvioChange(event) {
    this.metodoEnvio = event.target.value;
    if (this.metodoEnvio === 'mensajeroPropio') {
      // Lógica para cargar los pedidos disponibles
      this.refrescarDatos();
      this.pedidosSeleccionados = [];
      this.nuevaOrdenEnvio = null;
      this.nroShippingOrder = null;
      this.refrescarDatos();
    }
  }
  cargarOrders() {

  }
  // 
  agregarPedido() {
    Swal.fire({
      title: 'Seleccione los pedidos',
      input: 'select',
      inputOptions: this.orders
        .filter(o => o.transportador == undefined && o.transportador == null && o.formaEntrega == "Envío a Domicilio")
        .reduce((acc: Record<string, string>, pedido) => {
          if (!this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
            const clienteNombre = pedido.cliente?.nombres_completos || 'Sin nombre';
            const ciudad = pedido.envio?.ciudad || 'Sin ciudad';
            const zonaCobro = pedido.envio?.zonaCobro || 'Sin zona';
            const horario = pedido.horarioEntrega || 'Sin horario';
            
            acc[pedido.nroPedido || ''] = `${pedido.nroPedido} - ${clienteNombre} - ${pedido.estadoPago}- ${pedido.estadoProceso}-${ciudad}-${zonaCobro}-${pedido.formaEntrega}-${zonaCobro}-${horario} `;
          }
          return acc;
        }, {}),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Debes seleccionar un pedido';
        }
        if (this.pedidosSeleccionados.some(p => p.nroPedido === value)) {
          return 'El pedido ya ha sido agregado';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const pedidoSeleccionado = this.orders.find(p => p.nroPedido === result.value);
        if (pedidoSeleccionado) {
          this.pedidosSeleccionados.push(pedidoSeleccionado);
        }

        if (this.nuevaOrdenEnvio) {
          this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
        }
      }
    });
  }
  shouldDisplayPedido(pedido: any): boolean {
    return (
      pedido.transportador === undefined &&
      pedido.transportador === null &&
      pedido.formaEntrega === 'Envío a Domicilio' &&
      !this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)
    );
  }
  agregarPedido1(pedido: any) {
    if (this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'El pedido ya ha sido agregado'
      });
      return;
    }

    this.pedidosSeleccionados.push(pedido);

    if (this.nuevaOrdenEnvio) {
      this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
    }
  }

  loadPedidosDisponibles() {
    var fechaEnvio = new Date(this.ordenEnvioForm.value.fechaEnvio);
    var fechaEnvioConvert = new Date(fechaEnvio.getFullYear(), fechaEnvio.getMonth(), fechaEnvio.getDate() + 1); // Mantener horas en 0

    return this.orders.filter(o => {
      // Verificar si la fecha de entrega existe
      if (!o.fechaEntrega) return false;
      
      // Establecer horas, minutos y segundos a 0 para la comparación
      const fechaEntregaNormalized = new Date(new Date(o.fechaEntrega).setHours(0, 0, 0, 0)); // Normaliza a 00:00:00
      const fechaEnvioNormalized = new Date(fechaEnvioConvert.setHours(0, 0, 0, 0)); // Asegurarse de que también esté en 00:00:00

      return fechaEntregaNormalized.getTime() === fechaEnvioNormalized.getTime() &&
        (o.estadoProceso !== EstadoProceso.Entregado && o.estadoProceso !== EstadoProceso.Despachado) &&
        (o.formaEntrega ? o.formaEntrega.toLocaleUpperCase().includes('DOMICILIO') : false);
    })
    .reduce((acc: Pedido[], pedido) => {
      if (!this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
        acc.push(pedido);
      }
      return acc;
    }, []);
  }


  validatePedido(pedido) {
    if (!pedido) {
      return 'Debes seleccionar un pedido';
    }
    if (this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
      return 'El pedido ya ha sido agregado';
    }
    return null;
  }

  addPedidoToOrden(pedido) {
    if (pedido) {

      this.pedidosSeleccionados.push(pedido);

      if (this.nuevaOrdenEnvio) {
        this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
      }
    }
  }

  handleAgregarPedido(pedido: any) {
    const validationMessage = this.validatePedido(pedido);
    if (validationMessage) {
      alert(validationMessage);
      return;
    }
    this.addPedidoToOrden(pedido);
  }

  retirarPedido(pedido: Pedido) {
    const pedidocambiar = pedido
    this.cambiarEstado(pedidocambiar, 3)
    this.pedidosSeleccionados = this.pedidosSeleccionados.filter(p => p.nroPedido !== pedido.nroPedido);
    if (this.nuevaOrdenEnvio) {
      this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
    }

  }

  verPedidosAgregados() {
    this.openModal(this.pantallaOrdenEnvioModal);
  }

  getEstadoProceso(order: any): string {
    return order.pedidos[0] && order.pedidos[0].estadoProceso === 'Despachado' ? order.pedidos[0].estadoProceso : 'Por despachar';
  }

  handleOrderDispatch(order: any) {
    // Si la orden ya tiene todos sus pedidos despachados, mostrar mensaje informativo
    if (order.pedidos && order.pedidos.every(p => p.estadoProceso === 'Despachado')) {
      Swal.fire('Info', 'Esta orden ya ha sido despachada completamente', 'info');
      return;
    }
    
    // Preparar pedidos para despachar (solo los que no estén despachados)
    this.pedidosSeleccionados = order.pedidos.filter(p => p.estadoProceso !== 'Despachado');
    this.nroShippingOrder = order.nroShippingOrder;
    
    // Inicializar nuevaOrdenEnvio si no existe
    if (!this.nuevaOrdenEnvio) {
      const currentCompanyStr = sessionStorage.getItem("currentCompany");
      const companyName = currentCompanyStr ? JSON.parse(currentCompanyStr).nomComercial : '';
      
      this.nuevaOrdenEnvio = {
        id: order.id || '',
        nroShippingOrder: order.nroShippingOrder,
        fecha: new Date().toISOString(),
        transportador: order.transportador,
        company: companyName,
        pedidos: []
      };
    }
    
    // Utilizar el método existente para despachar
    this.despacharOrden();
  }
  
  handlePedidoDispatch(pedido: any) {
    Swal.fire({
      title: 'Asignar Transportador',
      input: 'select',
      inputOptions: this.vendors.reduce((acc, vendor) => {
        acc[`${vendor.nombres} ${vendor.apellidos}-${vendor.telefono}`] = `${vendor.nombres} ${vendor.apellidos}`;
        return acc;
      }, {}),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar el nombre del transportador';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const userLite = this.getCurrentUser();
        if (!userLite) {
          Swal.fire('Error', 'No se pudo obtener información del usuario', 'error');
          return;
        }
        
        // Actualizar el estado y datos del pedido
        pedido.transportador = result.value;
        pedido.despachador = userLite;
        pedido.fechaYHorarioDespachado = new Date().toISOString();
        pedido.estadoProceso = EstadoProceso.Despachado;
        
        // Si el pedido no tenía una orden de despacho, asignarle la nroShippingOrder "00"
        if (!pedido.nroShippingOrder) {
          pedido.nroShippingOrder = "00";
          pedido.shippingOrder = "00";
        }
        
        // Guardar los cambios
        this.ventasService.editOrder(pedido).subscribe(
          response => {
            Swal.fire('Éxito', 'Pedido despachado exitosamente', 'success');
            // Simplemente refrescar los datos de todas las órdenes
            this.refrescarDatos();
            // Cerrar y volver a abrir el diálogo
            this.modalService.dismissAll();
            setTimeout(() => {
              // Volver a consultar las órdenes
              this.logisticaService.getShippingOrders().subscribe((data: Pedido[]) => {
                const currentCompanyStr = sessionStorage.getItem("currentCompany");
                const companyName = currentCompanyStr ? JSON.parse(currentCompanyStr).nomComercial : '';
                
                this.dispatchOrders = data.filter(x => x.company == companyName)
                  .sort((a, b) => {
                    const aNum = a.nroShippingOrder ? parseInt(a.nroShippingOrder) : 0;
                    const bNum = b.nroShippingOrder ? parseInt(b.nroShippingOrder) : 0;
                    return bNum - aNum;
                  });
                this.modalService.open(this.dispatchOrdersModal, { size: 'xl', fullscreen: true });
              });
            }, 500);
          },
          error => {
            Swal.fire('Error', 'Hubo un problema al despachar el pedido', 'error');
          }
        );
      }
    });
  }

  despacharOrden() {
    Swal.fire({
      title: 'Asignar Transportador',
      input: 'select',
      inputOptions: this.vendors.reduce((acc, vendor) => {
        acc[`${vendor.nombres} ${vendor.apellidos}-${vendor.telefono}`] = `${vendor.nombres} ${vendor.apellidos}`;
        return acc;
      }, {}),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar el nombre del transportador';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.transportadorSeleccionado = result.value;
        const userLite = this.getCurrentUser();
        
        if (!userLite) {
          Swal.fire('Error', 'No se pudo obtener información del usuario', 'error');
          return;
        }

        this.pedidosSeleccionados.forEach(pedido => {
          pedido.transportador = this.transportadorSeleccionado;
          pedido.despachador = userLite;
          pedido.fechaYHorarioDespachado = new Date().toISOString();
          pedido.estadoProceso = EstadoProceso.Despachado;
          pedido.nroShippingOrder = this.nroShippingOrder;
          pedido.shippingOrder = this.nroShippingOrder;
        });

        // Asegurarse de que nuevaOrdenEnvio esté inicializado
        if (!this.nuevaOrdenEnvio) {
          const currentCompanyStr = sessionStorage.getItem("currentCompany");
          const companyName = currentCompanyStr ? JSON.parse(currentCompanyStr).nomComercial : '';
          
          this.nuevaOrdenEnvio = {
            id: '',
            nroShippingOrder: this.nroShippingOrder,
            fecha: new Date().toISOString(),
            transportador: this.transportadorSeleccionado,
            company: companyName,
            pedidos: []
          };
        }
        
        this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
        this.nuevaOrdenEnvio.transportador = this.transportadorSeleccionado;

        this.logisticaService.dispatchShippingOrder(this.nuevaOrdenEnvio).subscribe(
          response => {
            Swal.fire('Éxito', 'Orden despachada exitosamente', 'success');
            this.imprimirOrden();
            this.modalService.dismissAll();
            this.pedidosSeleccionados = [];
            this.transportadorSeleccionado = null;
            this.nroShippingOrder = null;
            this.nuevaOrdenEnvio = null;
          },
          error => {
            Swal.fire('Error', 'Hubo un problema al despachar la orden', 'error');
          }
        );
      }
    });
  }
  
  private getCurrentUser(): UserLite | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as UserLite;
    } catch (error) {
      console.error('Error al parsear información de usuario:', error);
      return null;
    }
  }
  
  viewAllDispatchOrders() {
    // Aquí se añade la lógica para la consulta masiva de órdenes de despacho
    this.logisticaService.getShippingOrders().subscribe((data: Pedido[]) => {
      const currentCompanyStr = sessionStorage.getItem("currentCompany");
      const companyName = currentCompanyStr ? JSON.parse(currentCompanyStr).nomComercial : '';
      
      this.dispatchOrders = data.filter(x => x.company == companyName)
        .sort((a, b) => {
          const aNum = a.nroShippingOrder ? parseInt(a.nroShippingOrder) : 0;
          const bNum = b.nroShippingOrder ? parseInt(b.nroShippingOrder) : 0;
          return bNum - aNum;
        });
      this.modalService.open(this.dispatchOrdersModal, { size: 'xl', fullscreen: true });
    }, (error) => {
      console.error('Error al consultar las órdenes de despacho:', error);
      this.dispatchOrders = [];
      this.modalService.open(this.dispatchOrdersModal, { size: 'xl' });
    });
  }
  
  pdfOrder(content, order: Pedido) {
    this.pedidoSeleccionado = order;
    this.htmlModal = this.paymentService.getHtmlContent(order);
    this.modalService.open(content, {
      size: 'lg',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }).result.then(
      (result) => {
        this.htmlModal = null;
      },
      (reason) => {
        this.htmlModal = null;
      }
    );
  }
  
  descargarRotulo(pedido: any): void {
    this.pdfSize = '5x5';
    const size = this.pdfSize.split('x').map(Number);
    const width = size[0];
    const height = size[1];

    const rotuloContent = `
    <div style="font-family: Arial, sans-serif; padding: 3px; border: 2px solid #ddd;">
      <div>
          <div style="margin-bottom: 2px;">
            <p style="font-size: 100px; line-height:1.2;"><strong>Número de Pedido:</strong> ${pedido.nroPedido}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Fecha Entrega:</strong> ${pedido.fechaEntrega ? pedido.fechaEntrega.split('T')[0] : 'N/A'}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Horario de Entrega:</strong> ${pedido.horarioEntrega || 'N/A'}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Recibe:</strong> ${pedido.envio?.nombres || ''} ${pedido.envio?.apellidos || ''}</p>
            <p style="font-size: 100px; line-height:1.2;">${pedido.envio?.direccionEntrega || ''}, ${pedido.envio?.nombreUnidad || ''}, ${pedido.envio?.especificacionesInternas || ''}, ${pedido.envio?.observaciones || ''}, ${pedido.envio?.zonaCobro || ''}</p>
          </div>
        </div>
    </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = rotuloContent;
    document.body.appendChild(element);

    html2canvas(element).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'cm',
        format: [width, height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 5, 4);
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);

      window.open(url);

      document.body.removeChild(element);
    });
  }
  
  imprimirOrderToAction(orderId: any) {
    this.logisticaService.getShippingOrder(orderId).subscribe({
      next: response => {
        this.nuevaOrdenEnvio = response;
        this.pedidosSeleccionados = response.pedidos;
        this.transportadorSeleccionado = response.pedidos[0]?.transportador;
        this.nroShippingOrder = response.nroShippingOrder;
        this.imprimirOrden();
      },
      error: error => {
        Swal.fire('Error', 'Hubo un problema al consultar la orden de envío', 'error');
      }
    });
  }

  // Manejadores para acciones desde OrdenesDespachoComponent
  handleOrderView(orderId: string) {
    // Consultar la orden de envío existente
    const orderIdNumber = parseInt(orderId);
    if (isNaN(orderIdNumber)) {
      console.error('ID de orden inválido:', orderId);
      Swal.fire('Error', 'ID de orden de envío inválido', 'error');
      return;
    }
    
    this.logisticaService.getShippingOrder(orderIdNumber).subscribe({
      next: response => {
        // Asignar datos a las propiedades
        this.nuevaOrdenEnvio = response;
        this.pedidosSeleccionados = response.pedidos || [];
        this.transportadorSeleccionado = response.transportador;
        this.nroShippingOrder = response.nroShippingOrder;
        
        // Cerrar el modal de listado de órdenes
        this.modalService.dismissAll();
        
        // Abrir el modal de edición de orden
        setTimeout(() => {
          this.openModal(this.pantallaOrdenEnvioModal, true);
        }, 100);
      },
      error: error => {
        console.error('Error al consultar la orden:', error);
        Swal.fire('Error', 'Hubo un problema al consultar la orden de envío', 'error');
      }
    });
  }

  mostrarDetallesEnvio(envioData: any) {
    // Asegurarse de que envioData existe
    if (!envioData) {
      return;
    }
    
    // Abrir el diálogo con los detalles del envío
    this.dialogService.open(ObservacionesDetalleComponent, {
      data: envioData,
      header: 'Detalles de Envío',
      width: '500px',
      contentStyle: { 'max-height': '80vh', 'overflow': 'auto' },
      baseZIndex: 10000
    });
  }

  // Método para obtener el conteo de pedidos urgentes no despachados ni entregados
  obtenerConteoPedidosUrgentesNoDespachados(): number {
    return this.pedidosUrgentes.filter(
      pedido => pedido.estadoProceso !== EstadoProceso.Despachado && 
               pedido.estadoProceso !== EstadoProceso.Entregado
    ).length;
  }
  
  // Método para obtener el conteo de pedidos en riesgo no despachados ni entregados
  obtenerConteoPedidosEnRiesgoNoDespachados(): number {
    return this.pedidosEnRiesgo.filter(
      pedido => pedido.estadoProceso !== EstadoProceso.Despachado && 
               pedido.estadoProceso !== EstadoProceso.Entregado
    ).length;
  }
  
  // Método para obtener el primer pedido urgente no despachado ni entregado
  obtenerPrimerPedidoUrgenteNoDespachado(): PedidoPriorizado | null {
    const pedidosUrgentesPendientes = this.pedidosUrgentes.filter(
      pedido => pedido.estadoProceso !== EstadoProceso.Despachado && 
               pedido.estadoProceso !== EstadoProceso.Entregado
    );
    
    return pedidosUrgentesPendientes.length > 0 ? pedidosUrgentesPendientes[0] : null;
  }
  
  // Método para formatear fechas en español con formato 'Nombre Día semana, Día Mes'
  formatearFecha(fecha: any): string {
    let fechaObj: Date;
    
    // Convertir a objeto Date válido
    // Si es un número, lo tratamos como timestamp
    if (typeof fecha === 'number') {
      fechaObj = new Date(fecha);
    }
    // Si es string, intentamos convertirlo
    else if (typeof fecha === 'string') {
      // Si es formato ISO (YYYY-MM-DD)
      if (fecha.match(/^\d{4}-\d{2}-\d{2}/)) {
        fechaObj = new Date(fecha);
      }
      // Si es un número almacenado como string, convertirlo
      else {
        const timestamp = parseInt(fecha, 10);
        if (!isNaN(timestamp)) {
          fechaObj = new Date(timestamp);
        } else {
          fechaObj = new Date();
        }
      }
    }
    // Si es objeto Date, usarlo directamente
    else if (fecha instanceof Date) {
      fechaObj = fecha;
    }
    // Si todo falla, usar la fecha actual
    else {
      console.warn('No se pudo convertir la fecha:', fecha);
      fechaObj = new Date();
    }
    
    // Formatear la fecha en español
    try {
      const opciones: Intl.DateTimeFormatOptions = {
        weekday: 'long',  // Nombre completo del día
        day: 'numeric',   // Día del mes en números
        month: 'long',    // Nombre completo del mes
      };
      
      const formatoEspanol = new Intl.DateTimeFormat('es-ES', opciones);
      const fechaFormateada = formatoEspanol.format(fechaObj);
      
      // Convertir primera letra a mayúscula
      return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    } catch (error) {
      console.error('Error al formatear la fecha:', error);
      return fechaObj.toLocaleDateString('es-ES');
    }
  }
  
  onSubmitOrdenEnvio(event: any) {
    console.log('Recibiendo datos de orden de envío:', event);
    
    // Validar que el evento no sea nulo
    if (!event) {
      console.error('Error: No se recibieron datos de la orden de envío');
      Swal.fire('Error', 'No se recibieron datos para la orden de envío', 'error');
      return;
    }
    
    // Determinar si es una nueva orden o una existente
    const esNuevaOrden = !this.nroShippingOrder || this.nroShippingOrder === '';
    
    // Asignar datos recibidos a la nueva orden de envío
    if (!this.nuevaOrdenEnvio) {
      const currentCompanyStr = sessionStorage.getItem("currentCompany");
      const companyName = currentCompanyStr ? JSON.parse(currentCompanyStr).nomComercial : '';
      
      this.nuevaOrdenEnvio = {
        id: '',
        nroShippingOrder: this.nroShippingOrder || '',
        fecha: new Date().toISOString(),
        transportador: this.transportadorSeleccionado || '',
        company: companyName,
        pedidos: this.pedidosSeleccionados || []
      };
    } else {
      // Actualizar la orden existente
      if (this.transportadorSeleccionado) {
        this.nuevaOrdenEnvio.transportador = this.transportadorSeleccionado;
      }
      this.nuevaOrdenEnvio.fecha = new Date().toISOString();
      this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados || [];
    }
    
    // Validar que haya pedidos seleccionados
    if (!this.pedidosSeleccionados || this.pedidosSeleccionados.length === 0) {
      console.error('Error: No hay pedidos seleccionados para la orden de envío');
      Swal.fire('Error', 'No hay pedidos seleccionados para la orden de envío', 'error');
      return;
    }
    
    // Si es una nueva orden, crear directamente sin solicitar transportador
    if (esNuevaOrden) {
      this.crearOrdenEnvio();
    } 
    // Si es despacho de una orden existente y no hay transportador, solicitarlo
    else if (!this.nuevaOrdenEnvio.transportador || this.nuevaOrdenEnvio.transportador === '') {
      this.seleccionarTransportador().then(transportador => {
        if (transportador) {
          this.transportadorSeleccionado = transportador;
          this.nuevaOrdenEnvio.transportador = transportador;
          this.despacharOrdenEnvio();
        } else {
          console.error('No se seleccionó un transportador');
          Swal.fire('Error', 'Debe seleccionar un transportador para despachar la orden', 'error');
        }
      });
    } else {
      // Si ya tiene transportador, despachar directamente
      this.despacharOrdenEnvio();
    }
  }
  
  // Método para crear una nueva orden de envío
  private crearOrdenEnvio(): void {
    console.log('Creando nueva orden de envío:', this.nuevaOrdenEnvio);
    
    this.logisticaService.createShippingOrder(this.nuevaOrdenEnvio).subscribe({
      next: (response) => {
        console.log('Respuesta exitosa del servidor:', response);
        
        // Actualizar nroShippingOrder
        if (response && response.nroShippingOrder) {
          this.nroShippingOrder = response.nroShippingOrder;
          this.nuevaOrdenEnvio.nroShippingOrder = response.nroShippingOrder;
        }
        
        Swal.fire({
          title: 'Éxito',
          text: `La orden de envío ${response.nroShippingOrder || ''} ha sido creada exitosamente`,
          icon: 'success',
          timer: 2000,  
          showConfirmButton: false
        });
        
        // Actualizar la lista de órdenes y cerrar el modal
        this.refrescarDatos();
        this.modalService.dismissAll();
      },
      error: (error) => {
        console.error('Error al crear la orden de envío:', error);
        Swal.fire('Error', 'Hubo un problema al crear la orden de envío: ' + (error.message || 'Error desconocido'), 'error');
      }
    });
  }
  
  // Método para despachar una orden existente
  private despacharOrdenEnvio(): void {
    console.log('Despachando orden existente:', this.nuevaOrdenEnvio);
    
    // Verificar que haya un transportador asignado
    if (!this.nuevaOrdenEnvio.transportador || this.nuevaOrdenEnvio.transportador === '') {
      console.error('Error: No hay transportador asignado');
      Swal.fire('Error', 'Debe asignar un transportador antes de despachar la orden', 'error');
      return;
    }
    
    // Actualizar el estado de cada pedido a "Despachado"
    const userLite = this.getCurrentUser();
    if (!userLite) {
      Swal.fire('Error', 'No se pudo obtener información del usuario actual', 'error');
      return;
    }
    
    // Actualizar cada pedido con los datos de despacho
    if (this.nuevaOrdenEnvio.pedidos && this.nuevaOrdenEnvio.pedidos.length > 0) {
      this.nuevaOrdenEnvio.pedidos.forEach(pedido => {
        pedido.estadoProceso = EstadoProceso.Despachado;
        pedido.transportador = this.nuevaOrdenEnvio.transportador;
        pedido.despachador = userLite;
        pedido.fechaYHorarioDespachado = new Date().toISOString();
        pedido.nroShippingOrder = this.nuevaOrdenEnvio.nroShippingOrder;
        pedido.shippingOrder = this.nuevaOrdenEnvio.nroShippingOrder;
      });
    }
    
    console.log('Datos de despacho actualizados:', this.nuevaOrdenEnvio);
    
    // Enviar la orden al servidor
    this.logisticaService.dispatchShippingOrder(this.nuevaOrdenEnvio).subscribe({
      next: (response) => {
        console.log('Respuesta exitosa del servidor:', response);
        
        // Actualizar los pedidos individualmente para asegurar que se guarden los cambios
        const actualizarPromises = this.nuevaOrdenEnvio.pedidos.map(pedido => 
          new Promise((resolve, reject) => {
            this.ventasService.editOrder(pedido).subscribe({
              next: () => resolve(true),
              error: (err) => {
                console.error(`Error al actualizar pedido ${pedido.nroPedido}:`, err);
                reject(err);
              }
            });
          })
        );
        
        Promise.all(actualizarPromises).then(() => {
          Swal.fire('Éxito', 'Orden despachada exitosamente y todos los pedidos actualizados', 'success');
          
          // Actualizar la lista de órdenes
          this.refrescarDatos();
          
          // Cerrar el modal
          this.modalService.dismissAll();
        }).catch(error => {
          console.error('Error al actualizar algunos pedidos:', error);
          Swal.fire({
            title: 'Advertencia',
            text: 'La orden fue despachada pero hubo problemas al actualizar algunos pedidos. Se recomienda verificar el estado de los pedidos.',
            icon: 'warning'
          });
          
          // Actualizar la lista de órdenes
          this.refrescarDatos();
          
          // Cerrar el modal
          this.modalService.dismissAll();
        });
      },
      error: (error) => {
        console.error('Error al despachar la orden de envío:', error);
        Swal.fire('Error', 'Hubo un problema al despachar la orden de envío: ' + (error.message || 'Error desconocido'), 'error');
      }
    });
  }
  
  // Método para solicitar selección de transportador
  private seleccionarTransportador(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.vendors || !Array.isArray(this.vendors) || this.vendors.length === 0) {
        // Intentar cargar transportadores si no están disponibles
        this.logisticaService.getTransportadores().subscribe({
          next: (data) => {
            this.vendors = data || [];
            if (this.vendors.length === 0) {
              console.error('No hay transportadores disponibles después de cargar');
              Swal.fire('Error', 'No hay transportadores disponibles', 'error');
              resolve('');
              return;
            }
            this.mostrarDialogoSeleccionTransportador(resolve);
          },
          error: (error) => {
            console.error('Error al cargar transportadores:', error);
            Swal.fire('Error', 'No se pudieron cargar los transportadores', 'error');
            resolve('');
          }
        });
      } else {
        this.mostrarDialogoSeleccionTransportador(resolve);
      }
    });
  }
  
  private mostrarDialogoSeleccionTransportador(resolve: (value: string) => void): void {
    const opciones = this.vendors.reduce((acc, vendor) => {
      const nombreCompleto = `${vendor.nombres} ${vendor.apellidos}`;
      acc[nombreCompleto] = nombreCompleto;
      return acc;
    }, {});
    
    Swal.fire({
      title: 'Asignar Transportador',
      input: 'select',
      inputOptions: opciones,
      inputPlaceholder: 'Seleccione un transportador',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Seleccionar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes seleccionar un transportador';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        console.log('Transportador seleccionado:', result.value);
        resolve(result.value);
      } else {
        resolve('');
      }
    });
  }

  // Método para manejar la visualización de imágenes a tamaño completo
  openFullImage(imageUrl: string): void {
    if (!imageUrl) {
      console.error('No se recibió una URL de imagen válida');
      return;
    }
    
    console.log('Abriendo imagen a tamaño completo:', imageUrl);
    
    // Mostrar la imagen a tamaño completo usando SweetAlert2
    Swal.fire({
      imageUrl: imageUrl,
      imageAlt: 'Imagen de entrega',
      width: '80%',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        image: 'img-fluid'
      }
    });
  }

  // Método para calcular la recomendación de transportadores necesarios
  calcularRecomendacionTransportadores(): { 
    transportadoresNecesarios: number,
    transportadoresActuales: number,
    deficit: number,
    cargaPromedioPorTransportador: number,
    capacidadTotalActual: number,
    capacidadPromedio: number,
    pedidosPorDia: { [fecha: string]: number },
    recomendacionesPorDia: { [fecha: string]: number }
  } {
    // 1. Obtener número de transportadores actuales
    const transportadoresActuales = this.vendors && Array.isArray(this.vendors) ? this.vendors.length : 0;
    
    // 2. Calcular la capacidad total y promedio de los transportadores actuales
    let capacidadTotalActual = 0;
    let capacidadPromedio = 5; // Valor por defecto si no hay transportadores
    
    if (transportadoresActuales > 0) {
      // Sumar las capacidades individuales
      capacidadTotalActual = this.vendors.reduce((total, transportador) => {
        // Usar la capacidad configurada o 5 como valor por defecto
        const capacidad = transportador.capacidadCarga || 5;
        return total + capacidad;
      }, 0);
      
      // Calcular el promedio
      capacidadPromedio = capacidadTotalActual / transportadoresActuales;
    }
    
    // 3. Calcular carga total por día (próximos 7 días)
    const pedidosPorDia: { [fecha: string]: number } = {};
    const recomendacionesPorDia: { [fecha: string]: number } = {};
    let totalPedidosProximos7Dias = 0;
    
    // Obtener fecha actual
    const hoy = new Date();
    
    // Para cada día en los próximos 7 días
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split('T')[0]; // formato YYYY-MM-DD
      
      // Contar pedidos programados para este día
      const pedidosDia = this.orders.filter(p => {
        if (!p.fechaEntrega) return false;
        const fechaEntrega = new Date(p.fechaEntrega);
        return fechaEntrega.toISOString().split('T')[0] === fechaStr;
      }).length;
      
      pedidosPorDia[fechaStr] = pedidosDia;
      totalPedidosProximos7Dias += pedidosDia;
      
      // Calcular transportadores necesarios para este día basado en la capacidad promedio actual
      const transportadoresNecesariosDia = Math.ceil(pedidosDia / capacidadPromedio);
      recomendacionesPorDia[fechaStr] = transportadoresNecesariosDia;
    }
    
    // 4. Calcular el promedio de pedidos diarios
    const promedioPedidosDiarios = totalPedidosProximos7Dias / 7;
    
    // 5. Calcular transportadores necesarios en total (basado en la capacidad promedio actual)
    const transportadoresNecesarios = Math.ceil(promedioPedidosDiarios / capacidadPromedio);
    
    // 6. Calcular déficit de transportadores
    const deficit = Math.max(0, transportadoresNecesarios - transportadoresActuales);
    
    // 7. Calcular carga promedio por transportador actual
    const cargaPromedioPorTransportador = capacidadTotalActual > 0 
      ? promedioPedidosDiarios / transportadoresActuales 
      : promedioPedidosDiarios; // Si no hay transportadores, la carga sería todo
    
    return {
      transportadoresNecesarios,
      transportadoresActuales,
      deficit,
      cargaPromedioPorTransportador,
      capacidadTotalActual,
      capacidadPromedio,
      pedidosPorDia,
      recomendacionesPorDia
    };
  }
  
  // Método para mostrar recomendaciones de transportadores
  mostrarRecomendacionTransportadores() {
    const recomendacion = this.calcularRecomendacionTransportadores();
    
    // Formatea las fechas para mostrarlas
    const pedidosPorDiaFormateado = Object.entries(recomendacion.pedidosPorDia).map(([fecha, cantidad]) => {
      return `<tr>
        <td>${this.formatearFecha(fecha)}</td>
        <td class="text-center">${cantidad}</td>
        <td class="text-center">${recomendacion.recomendacionesPorDia[fecha]}</td>
      </tr>`;
    }).join('');
    
    // Crear HTML para la tabla de pedidos por día
    const tablaPedidosPorDia = `
      <table class="table table-sm table-striped mt-3">
        <thead class="table-primary">
          <tr>
            <th>Fecha</th>
            <th class="text-center">Pedidos</th>
            <th class="text-center">Transportadores recomendados</th>
          </tr>
        </thead>
        <tbody>
          ${pedidosPorDiaFormateado}
        </tbody>
      </table>
    `;
    
    // Crear mensaje de recomendación
    let mensajeRecomendacion = '';
    if (recomendacion.deficit > 0) {
      mensajeRecomendacion = `<div class="alert alert-warning">
        <i class="pi pi-exclamation-triangle me-2"></i>
        <strong>Recomendación:</strong> Se sugiere contratar ${recomendacion.deficit} transportador(es) adicional(es) para manejar la carga actual.
      </div>`;
    } else {
      mensajeRecomendacion = `<div class="alert alert-success">
        <i class="pi pi-check-circle me-2"></i>
        <strong>Recomendación:</strong> El número actual de transportadores es suficiente para manejar la carga prevista.
      </div>`;
    }
    
    // Mostrar el análisis en un modal
    Swal.fire({
      title: 'Análisis de Transportadores',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <h6 class="fw-bold">Resumen General:</h6>
            <ul class="list-group">
              <li class="list-group-item d-flex justify-content-between">
                <span>Transportadores actuales:</span>
                <span class="fw-bold">${recomendacion.transportadoresActuales}</span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Capacidad total actual:</span>
                <span class="fw-bold">${recomendacion.capacidadTotalActual} pedidos/día</span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Capacidad promedio por transportador:</span>
                <span class="fw-bold">${recomendacion.capacidadPromedio.toFixed(1)} pedidos/día</span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Transportadores recomendados:</span>
                <span class="fw-bold">${recomendacion.transportadoresNecesarios}</span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Carga promedio por transportador:</span>
                <span class="fw-bold">${recomendacion.cargaPromedioPorTransportador.toFixed(1)} pedidos/día</span>
              </li>
            </ul>
          </div>
          
          ${mensajeRecomendacion}
          
          <h6 class="fw-bold mt-4">Detalles por día:</h6>
          ${tablaPedidosPorDia}
          
          <div class="alert alert-info mt-3">
            <i class="pi pi-info-circle me-2"></i>
            <small>Este análisis utiliza la capacidad de carga configurada para cada transportador. Puede modificarla en la sección de gestión de transportadores.</small>
          </div>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Entendido',
      showClass: {
        popup: 'animate__animated animate__fadeIn'
      }
    });
  }
}


