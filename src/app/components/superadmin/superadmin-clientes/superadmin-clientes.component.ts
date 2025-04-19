import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import { UserService } from '../../../services/user.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Sede, Contacto, HorarioPV, MarketPlace, CanalComunicacion, RedSocial } from '../../../shared/models/empresa/empresa';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { CompaniesService } from '../../../services/companies.service';
import { catchError, finalize, forkJoin } from 'rxjs';
import { NotificationService } from '../../../shared/services/notification.service';

// Interfaz para definir la estructura del cliente
interface Cliente {
  id: number;
  empresa: {
    nombre: string;
    nit: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    pais: string;
    emailContacto: string;
    telContacto: string;
    nombreSede: string;
    fijoContacto: string;
    emailFactuElec: string;
    cel: string;
    comoLlegarSede: string;
    extensionFijo: string;
    direccionSede: string;
    sedes: Sede[];
    contactos: Contacto[];
    horarios: HorarioPV[];
    marketplaces: MarketPlace[];
    canalesComunicacion: CanalComunicacion[];
    redesSociales: RedSocial[];
  };
  estado: string;
  fechaRegistro: Date;
}

// Agregar nuevas interfaces para análisis avanzado
interface AnalisisUsuario {
  id: number;
  nombre: string;
  actividad: {
    sesiones: number;
    tiempoPromedio: number;
    ultimaActividad: Date;
  };
  conversion: {
    tasa: number;
    valorLTV: number;
  };
  engagement: {
    score: number;
    tendencia: number;
  };
}

interface MetricasGlobales {
  usuariosActivos: number;
  tasaRetencion: number;
  valorLTVPromedio: number;
  tiempoSesionPromedio: number;
}

interface Empresa {
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  pais: string;
  emailContacto: string;
  telContacto: string;
  nombreSede: string;
  fijoContacto: string;
  emailFactuElec: string;
  cel: string;
  comoLlegarSede: string;
  extensionFijo: string;
  direccionSede: string;
  sedes: Sede[];
  contactos: Contacto[];
  horarios: HorarioPV[];
  marketplaces: MarketPlace[];
  canalesComunicacion: CanalComunicacion[];
  redesSociales: RedSocial[];
}

@Component({
  selector: 'app-superadmin-clientes',
  templateUrl: './superadmin-clientes.component.html',
  styleUrls: ['./superadmin-clientes.component.scss']
})
export class SuperadminClientesComponent implements OnInit, AfterViewInit {

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;
  filtroNombre: string = '';
  filtroEstado: string = '';
  cargando: boolean = false;
  error: string = '';

  // Datos mock actualizados con estructura de empresa
  private mockClientes: Cliente[] = [
    {
      id: 1,
      empresa: {
        nombre: 'Empresa X',
        nit: '123456789-0',
        direccion: 'Calle 123 #45-67',
        ciudad: 'Bogotá',
        departamento: 'Cundinamarca',
        pais: 'Colombia',
        emailContacto: 'contacto@empresax.com',
        telContacto: '6012345678',
        nombreSede: 'Sede Principal',
        fijoContacto: '6012345678',
        emailFactuElec: 'facturacion@empresax.com',
        cel: '3001234567',
        comoLlegarSede: 'https://maps.google.com/...',
        extensionFijo: '123',
        direccionSede: 'Calle 123 #45-67',
        sedes: [],
        contactos: [],
        horarios: [],
        marketplaces: [],
        canalesComunicacion: [],
        redesSociales: []
      },
      estado: 'Activo',
      fechaRegistro: new Date(2024, 10, 15)
    },
    {
      id: 2,
      empresa: {
        nombre: 'Empresa Y',
        nit: '987654321-0',
        direccion: 'Carrera 50 #30-40',
        ciudad: 'Medellín',
        departamento: 'Antioquia',
        pais: 'Colombia',
        emailContacto: 'contacto@empresay.com',
        telContacto: '6045678901',
        nombreSede: 'Sede Principal',
        fijoContacto: '6045678901',
        emailFactuElec: 'facturacion@empresay.com',
        cel: '3001234567',
        comoLlegarSede: 'Cerca al metro',
        extensionFijo: '456',
        direccionSede: 'Carrera 50 #30-40',
        sedes: [
          {
            nombreSede: 'Sede Principal',
            rotuloDireccionSede: 'Centro Empresarial',
            ciudadSede: 'Medellín',
            direccionSede: 'Carrera 50 #30-40',
            paisSede: 'Colombia',
            comoLlegarSede: 'Cerca al metro',
            dptoSede: 'Antioquia',
            codigoPostalSede: '050001'
          }
        ],
        contactos: [
          {
            fijoContacto: '6045678901',
            extensionFijoContacto: '456',
            cargoContacto: 'Director',
            emailContacto: 'maria@empresay.com',
            telContacto: '6045678901',
            nomCompletoContacto: 'María Rodríguez',
            indicativoFijoContacto: '604',
            indicativoTelContacto: '604'
          }
        ],
        horarios: [],
        marketplaces: [
          {
            nombreMP: 'Mercado Libre',
            logoMP: 'assets/images/marketplace/mercadolibre.png',
            linkMP: 'https://mercadolibre.com/empresay',
            activoMp: true
          }
        ],
        canalesComunicacion: [],
        redesSociales: []
      },
      estado: 'Pendiente',
      fechaRegistro: new Date(2024, 10, 20)
    },
    {
      id: 3,
      empresa: {
        nombre: 'Empresa Z',
        nit: '123456789-0',
        direccion: 'Avenida 30 #12-34',
        ciudad: 'Bogotá',
        departamento: 'Cundinamarca',
        pais: 'Colombia',
        emailContacto: 'contacto@empresaz.com',
        telContacto: '6023456789',
        nombreSede: 'Sede Principal',
        fijoContacto: '6023456789',
        emailFactuElec: 'facturacion@empresaz.com',
        cel: '3009876543',
        comoLlegarSede: 'Frente al centro comercial',
        extensionFijo: '789',
        direccionSede: 'Avenida 30 #12-34',
        sedes: [
          {
            nombreSede: 'Sede Principal',
            rotuloDireccionSede: 'Edificio Corporativo',
            ciudadSede: 'Bogotá',
            direccionSede: 'Avenida 30 #12-34',
            paisSede: 'Colombia',
            comoLlegarSede: 'Frente al centro comercial',
            dptoSede: 'Cundinamarca',
            codigoPostalSede: '110111'
          }
        ],
        contactos: [
          {
            fijoContacto: '6023456789',
            extensionFijoContacto: '789',
            cargoContacto: 'Gerente',
            emailContacto: 'juan@empresaz.com',
            telContacto: '6023456789',
            nomCompletoContacto: 'Juan Pérez',
            indicativoFijoContacto: '602',
            indicativoTelContacto: '602'
          }
        ],
        horarios: [],
        marketplaces: [
          {
            nombreMP: 'Amazon',
            logoMP: 'assets/images/marketplace/amazon.png',
            linkMP: 'https://amazon.com/empresaz',
            activoMp: true
          }
        ],
        canalesComunicacion: [],
        redesSociales: []
      },
      estado: 'Activo',
      fechaRegistro: new Date(2024, 11, 15)
    },
    {
      id: 4,
      empresa: {
        nombre: 'Empresa X',
        nit: '789123456-0',
        direccion: 'Calle 321 #67-89',
        ciudad: 'Barranquilla',
        departamento: 'Atlántico',
        pais: 'Colombia',
        emailContacto: 'contacto@empresax2.com',
        telContacto: '6056789012',
        nombreSede: 'Sede Principal',
        fijoContacto: '6056789012',
        emailFactuElec: 'facturacion@empresax2.com',
        cel: '3004567890',
        comoLlegarSede: 'Cerca al centro comercial',
        extensionFijo: '789',
        direccionSede: 'Calle 321 #67-89',
        sedes: [],
        contactos: [],
        horarios: [],
        marketplaces: [],
        canalesComunicacion: [],
        redesSociales: []
      },
      estado: 'Activo',
      fechaRegistro: new Date(2023, 8, 1)
    }
  ];

  // Datos para KPIs
  kpiData = {
    ventasTotales: 120000000,
    pedidosPromedio: 320,
    tiempoEntregaPromedio: 28,
    satisfaccionGlobal: 4.6,
    tiendasActivas: 4,
    zonasCobertura: 3,
    conversionPedidos: 0.75,
    ticketPromedio: 35000,
    retencionClientes: 0.85,
    eficienciaEntrega: 0.92
  };

  // Datos para gráficos de KPIs
  private tiendas = [
    { nombre: 'Tienda A', ingresos: 40000000, pedidos: 120, crecimiento: 15 },
    { nombre: 'Tienda B', ingresos: 30000000, pedidos: 80, crecimiento: 5 },
    { nombre: 'Tienda C', ingresos: 25000000, pedidos: 70, crecimiento: -2 },
    { nombre: 'Tienda D', ingresos: 25000000, pedidos: 50, crecimiento: 8 }
  ];

  // Nuevas propiedades para análisis avanzado
  analisisUsuarios: AnalisisUsuario[] = [];
  metricasGlobales: MetricasGlobales = {
    usuariosActivos: 0,
    tasaRetencion: 0,
    valorLTVPromedio: 0,
    tiempoSesionPromedio: 0
  };

  // Nuevas métricas
  activeUsers: number = 0;
  retentionRate: number = 0;
  averageLTV: number = 0;
  averageSessionTime: number = 0;

  // Datos para gráficos
  engagementData: any = {
    series: [{
      name: 'Engagement',
      data: []
    }],
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false
      }
    },
    colors: ['#4CAF50'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    xaxis: {
      categories: []
    }
  };

  ltvData: any = {
    series: [{
      name: 'LTV',
      data: []
    }],
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    colors: ['#2196F3'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: []
    }
  };

  // Datos para la tabla de análisis
  userAnalysis: any[] = [];

  // Nuevas propiedades para métricas mejoradas
  growthMetrics: any = {};
  conversionMetrics: any = {};
  performanceMetrics: any = {};
  categoryTrends: any[] = [];
  marketingMetrics: any = {};

  // Configuración mejorada para gráficos
  revenueChart: any = {
    series: [{
      name: 'Ingresos',
      data: []
    }],
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false
      }
    },
    colors: ['#4CAF50'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: []
    },
    yaxis: {
      labels: {
        formatter: function(val: number) {
          return '$' + (val / 1000000).toFixed(1) + 'M';
        }
      }
    }
  };

  categoryChart: any = {
    series: [{
      name: 'Crecimiento',
      data: []
    }],
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    colors: ['#2196F3'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        dataLabels: {
          position: 'bottom'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val: number) {
        return val + '%';
      }
    },
    xaxis: {
      categories: []
    }
  };

  performanceChart: any = {
    series: [{
      name: 'Rendimiento',
      data: []
    }],
    chart: {
      type: 'radialBar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        dataLabels: {
          name: {
            fontSize: '13px',
            color: '#333',
            offsetY: 80
          },
          value: {
            offsetY: 40,
            fontSize: '16px',
            color: '#333',
            formatter: function(val: number) {
              return val + '%';
            }
          }
        }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        shadeIntensity: 0.15,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 50, 65, 91]
      }
    },
    stroke: {
      dashArray: 4
    },
    labels: ['Uptime', 'Satisfacción', 'Tiempo Respuesta']
  };

  // --- Inicio: Añadir Getters ---
  get totalClientes(): number {
    return this.clientes.length;
  }

  get clientesActivosCount(): number {
    return this.clientes.filter(c => c.estado === 'Activo').length;
  }

  get clientesBloqueadosCount(): number {
    return this.clientes.filter(c => c.estado === 'Bloqueado').length;
  }

  get clientesPendientesCount(): number {
    return this.clientes.filter(c => c.estado === 'Pendiente').length;
  }
  // --- Fin: Añadir Getters ---

  // Declarar instancias de gráficos
  private renderRevenueChartInstance: any;
  private renderCategoryChartInstance: any;
  private renderPerformanceChartInstance: any;

  constructor(
    private userService: UserService,
    private analyticsService: AnalyticsService,
    private maestroService: MaestroService,
    private companiesService: CompaniesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarKPIs();
    this.cargarMetricasGlobales();
  }

  cargarClientes(): void {
    this.cargando = true;
    this.error = '';
    
    this.companiesService.getAllCompanies()
      .pipe(
        catchError(err => {
          this.error = 'Error al conectar con el servidor';
          console.error('Error en la petición de empresas:', err);
          this.notificationService.error('Error', 'No se pudieron cargar los clientes. Intente nuevamente.');
          this.clientes = this.mockClientes; // Usar datos mock como fallback
          return [];
        }),
        finalize(() => {
          this.cargando = false;
          this.filtrarClientes();
        })
      )
      .subscribe(res => {
        if (res && Array.isArray(res)) {
          this.clientes = res.map((empresa: any, index: number) => {
            return {
              id: empresa.id || index + 1,
              empresa: {
                nombre: empresa.nombre || '',
                nit: empresa.nit || '',
                direccion: empresa.direccion || '',
                ciudad: empresa.ciudad || '',
                departamento: empresa.departamento || '',
                pais: empresa.pais || '',
                emailContacto: empresa.emailContacto || '',
                telContacto: empresa.telContacto || '',
                nombreSede: empresa.nombreSede || '',
                fijoContacto: empresa.fijoContacto || '',
                emailFactuElec: empresa.emailFactuElec || '',
                cel: empresa.cel ? empresa.cel.toString() : '',
                comoLlegarSede: empresa.comoLlegarSede || '',
                extensionFijo: empresa.extensionFijo ? empresa.extensionFijo.toString() : '',
                direccionSede: empresa.direccionSede || '',
                sedes: empresa.sedes || [],
                contactos: empresa.contactos || [],
                horarios: empresa.horarios || empresa.horarioPV || [],
                marketplaces: empresa.marketplaces || empresa.marketPlace || [],
                canalesComunicacion: empresa.canalesComunicacion || [],
                redesSociales: empresa.redesSociales || []
              },
              estado: empresa.estado || 'Activo',
              fechaRegistro: empresa.date_edit ? new Date(empresa.date_edit._seconds * 1000) : new Date()
            };
          });
          this.notificationService.success('Éxito', 'Clientes cargados correctamente');
        } else {
          this.error = 'No se pudo obtener la lista de empresas';
          console.error('Error al obtener empresas:', res);
          this.notificationService.error('Error', 'No se pudieron cargar los clientes correctamente');
          this.clientes = this.mockClientes; // Usar datos mock como fallback
        }
      });
  }

  cargarKPIs(): void {
    this.analyticsService.getKpiGeneral()
      .pipe(
        catchError(err => {
          console.error('Error al cargar KPIs:', err);
          return []; // Usar los datos mock que ya están definidos
        })
      )
      .subscribe(data => {
        if (data) {
          // Asegurarse de que los valores son numéricos
          this.kpiData = {
            ventasTotales: this.asegurarNumero(data.ventasTotales, 0),
            pedidosPromedio: this.asegurarNumero(data.pedidosPromedio, 0),
            tiempoEntregaPromedio: this.asegurarNumero(data.tiempoEntregaPromedio, 0),
            satisfaccionGlobal: this.asegurarNumero(data.satisfaccionGlobal, 0),
            tiendasActivas: this.asegurarNumero(data.tiendasActivas, 0),
            zonasCobertura: this.asegurarNumero(data.zonasCobertura, 0),
            conversionPedidos: this.asegurarNumero(data.conversionPedidos, 0),
            ticketPromedio: this.asegurarNumero(data.ticketPromedio, 0),
            retencionClientes: this.asegurarNumero(data.retencionClientes, 0),
            eficienciaEntrega: this.asegurarNumero(data.eficienciaEntrega, 0)
          };
        }
      });
  }

  // Método para asegurar que un valor es numérico
  private asegurarNumero(valor: any, valorPorDefecto: number = 0): number {
    if (valor === null || valor === undefined || isNaN(Number(valor))) {
      return valorPorDefecto;
    }
    return Number(valor);
  }

  cargarMetricasGlobales(): void {
    this.analyticsService.getGlobalMetrics()
      .pipe(
        catchError(err => {
          console.error('Error al cargar métricas globales:', err);
          return []; // Usar los datos mock que ya están definidos
        })
      )
      .subscribe(data => {
        if (data) {
          // Asegurarse de que los valores son numéricos
          this.metricasGlobales = {
            usuariosActivos: this.asegurarNumero(data.usuariosActivos, 0),
            tasaRetencion: this.asegurarNumero(data.tasaRetencion, 0),
            valorLTVPromedio: this.asegurarNumero(data.valorLTVPromedio, 0),
            tiempoSesionPromedio: this.asegurarNumero(data.tiempoSesionPromedio, 0)
          };
        }
      });
  }

  ngAfterViewInit(): void {
    this.cargarDatosGraficos();
  }

  cargarDatosGraficos(): void {
    // Utilizar forkJoin para realizar múltiples solicitudes en paralelo
    forkJoin({
      tiendas: this.analyticsService.getStoresData().pipe(catchError(() => [])),
      engagement: this.analyticsService.getEngagementData().pipe(catchError(() => [])),
      ltv: this.analyticsService.getLTVData().pipe(catchError(() => []))
    }).subscribe(results => {
      // Cargar datos de tiendas si están disponibles
      if (results.tiendas && results.tiendas.length > 0) {
        this.tiendas = results.tiendas;
      }
      
      // Cargar datos de engagement si están disponibles
      if (results.engagement) {
        this.engagementData.series[0].data = results.engagement.data || [];
        this.engagementData.xaxis.categories = results.engagement.categories || [];
      }
      
      // Cargar datos de LTV si están disponibles
      if (results.ltv) {
        this.ltvData.series[0].data = results.ltv.data || [];
        this.ltvData.xaxis.categories = results.ltv.categories || [];
      }
      
      // Renderizar los gráficos con los datos actualizados
      this.renderStoreCharts();
      this.renderKPICharts();
      this.renderEngagementChart();
      this.renderLTVChart();
      this.loadAdvancedMetrics();
    });
  }

  loadAdvancedMetrics(): void {
    this.analyticsService.getAdvancedMetrics()
      .pipe(
        catchError(err => {
          console.error('Error al cargar métricas avanzadas:', err);
          return []; // Usar los datos mock que ya están definidos
        })
      )
      .subscribe(data => {
        if (data) {
          // KPIs Principales - asegurar valores numéricos
          this.activeUsers = this.asegurarNumero(data.activeUsers, 0);
          this.retentionRate = this.asegurarNumero(data.retentionRate, 0);
          this.averageLTV = this.asegurarNumero(data.averageLTV, 0);
          this.averageSessionTime = this.asegurarNumero(data.averageSessionTime, 0);
          
          // Métricas de Crecimiento
          this.growthMetrics = data.growthMetrics || {};
          
          // Métricas de Conversión
          this.conversionMetrics = data.conversionMetrics || {};
          
          // Métricas de Rendimiento
          this.performanceMetrics = data.performanceMetrics || {};
          
          // Tendencias de Categorías
          this.categoryTrends = Array.isArray(data.categoryTrends) ? data.categoryTrends : [];
          
          // Métricas de Marketing
          this.marketingMetrics = data.marketingMetrics || {};
          
          // Actualizar datos de gráficos con verificación de datos válidos
          const ltvTrend = Array.isArray(data.ltvTrend) ? data.ltvTrend.map(val => this.asegurarNumero(val, 0)) : [];
          const ltvDates = Array.isArray(data.ltvDates) ? data.ltvDates : [];
          
          this.revenueChart.series[0].data = ltvTrend;
          this.revenueChart.xaxis.categories = ltvDates;
          
          // Verificar y transformar datos de categorías
          if (Array.isArray(data.categoryTrends)) {
            this.categoryChart.series[0].data = data.categoryTrends.map((cat: any) => 
              this.asegurarNumero(cat?.growth, 0)
            );
            this.categoryChart.xaxis.categories = data.categoryTrends.map((cat: any) => 
              cat?.name || 'Sin nombre'
            );
          }
          
          // Verificar métricas de rendimiento
          if (data.performanceMetrics) {
            this.performanceChart.series[0].data = [
              this.asegurarNumero(data.performanceMetrics.systemUptime, 0),
              this.asegurarNumero(data.performanceMetrics.customerSatisfaction, 0) * 20,
              (100 - this.asegurarNumero(data.performanceMetrics.supportResponseTime, 0))
            ];
          }
          
          this.userAnalysis = Array.isArray(data.userAnalysis) ? data.userAnalysis : [];

          // Renderizar / actualizar los gráficos
          this.renderRevenueChart();
          this.renderCategoryChart();
          this.renderPerformanceChart();
        }
      });
  }

  filtrarClientes(): void {
    this.clientesFiltrados = this.clientes.filter(cliente => {
      const coincideNombre = cliente.empresa.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase()) ||
                             cliente.empresa.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase()) ||
                             cliente.empresa.emailContacto.toLowerCase().includes(this.filtroNombre.toLowerCase());
      const coincideEstado = this.filtroEstado === '' || cliente.estado === this.filtroEstado;
      return coincideNombre && coincideEstado;
    });
  }

  // Métodos para acciones (editar, cambiar estado, etc.)
  editarCliente(cliente: Cliente): void {
    console.log('Editar cliente:', cliente);
    // Implementación pendiente - Podría abrir un modal de edición
  }

  cambiarEstado(cliente: Cliente, nuevoEstado: 'Activo' | 'Bloqueado'): void {
    this.companiesService.updateCompanyStatus(cliente.id.toString(), nuevoEstado)
      .pipe(
        catchError(err => {
          console.error('Error al cambiar estado:', err);
          this.notificationService.error('Error', 'No se pudo cambiar el estado del cliente');
          return [];
        })
      )
      .subscribe(res => {
        if (res && res.success) {
          const index = this.clientes.findIndex(c => c.id === cliente.id);
          if (index !== -1) {
            this.clientes[index].estado = nuevoEstado;
            this.filtrarClientes(); // Actualizar vista
            this.notificationService.success('Éxito', `Estado del cliente actualizado a ${nuevoEstado}`);
          }
        } else {
          this.notificationService.error('Error', 'No se pudo cambiar el estado del cliente');
        }
      });
  }

  verDetalles(cliente: Cliente): void {
    this.clienteSeleccionado = cliente;
    
    // Opcionalmente, cargar datos adicionales desde el API
    this.companiesService.getCompanyById(cliente.id.toString())
      .pipe(
        catchError(err => {
          console.error('Error al cargar detalles del cliente:', err);
          this.notificationService.error('Error', 'No se pudieron cargar los detalles del cliente');
          return []; // Usar los datos que ya tenemos
        })
      )
      .subscribe(data => {
        if (data) {
          // Actualizar el cliente seleccionado con datos más completos
          this.clienteSeleccionado = {
            ...cliente,
            empresa: {
              ...cliente.empresa,
              sedes: data.sedes || cliente.empresa.sedes,
              contactos: data.contactos || cliente.empresa.contactos,
              horarios: data.horarios || data.horarioPV || cliente.empresa.horarios,
              marketplaces: data.marketplaces || data.marketPlace || cliente.empresa.marketplaces,
              canalesComunicacion: data.canalesComunicacion || cliente.empresa.canalesComunicacion,
              redesSociales: data.redesSociales || cliente.empresa.redesSociales
            }
          };
        }
      });
  }

  eliminarCliente(cliente: Cliente): void {
    if (confirm(`¿Está seguro de que desea eliminar al cliente ${cliente.empresa.nombre}?`)) {
      this.companiesService.deleteCompany(cliente.id.toString())
        .pipe(
          catchError(err => {
            console.error('Error al eliminar cliente:', err);
            this.notificationService.error('Error', 'No se pudo eliminar el cliente');
            return [];
          })
        )
        .subscribe(res => {
          if (res && res.success) {
            this.clientes = this.clientes.filter(c => c.id !== cliente.id);
            this.filtrarClientes(); // Actualizar vista
            this.notificationService.success('Éxito', 'Cliente eliminado correctamente');
          } else {
            this.notificationService.error('Error', 'No se pudo eliminar el cliente');
          }
        });
    }
  }

  // Método para inicializar los gráficos de tiendas
  private renderStoreCharts(): void {
    this.renderVentasPorTiendaChart();
    this.renderPedidosPorTiendaChart();
    this.renderCrecimientoTiendasChart();
  }

  // Gráfico de barras para ventas por tienda
  private renderVentasPorTiendaChart(): void {
    const options = {
      chart: { 
        type: 'bar',
        height: 350,
        toolbar: { show: false },
        fontFamily: 'Helvetica, Arial, sans-serif'
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '60%',
          distributed: true,
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: ['#008ffb', '#00e396', '#feb019', '#ff4560'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return '$' + (val / 1000000).toFixed(1) + 'M';
        },
        offsetY: -20,
        style: {
          fontSize: '13px',
          fontWeight: '600',
          colors: ["#304758"]
        }
      },
      series: [{
        name: 'Ingresos',
        data: this.tiendas.map(t => t.ingresos)
      }],
      grid: {
        padding: {
          left: 20,
          right: 20
        }
      },
      xaxis: {
        categories: this.tiendas.map(t => t.nombre),
        position: 'bottom',
        labels: {
          style: {
            fontSize: '14px'
          }
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          formatter: function (val: number) {
            return '$' + (val / 1000000).toFixed(1) + 'M';
          },
          style: {
            fontSize: '13px'
          }
        }
      },
      title: {
        text: 'Ventas por Tienda (Mes Actual)',
        floating: false,
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 600
        },
        margin: 15
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-ventas-tiendas'), options);
    chart.render();
  }

  // Gráfico de donut para distribución de pedidos
  private renderPedidosPorTiendaChart(): void {
    const options = {
      chart: {
        type: 'donut',
        height: 350,
        fontFamily: 'Helvetica, Arial, sans-serif'
      },
      series: this.tiendas.map(t => t.pedidos),
      labels: this.tiendas.map(t => t.nombre),
      colors: ['#008ffb', '#00e396', '#feb019', '#ff4560'],
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px',
        markers: {
          width: 12,
          height: 12,
          radius: 12
        },
        itemMargin: {
          horizontal: 15,
          vertical: 5
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            background: 'transparent',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600
              },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: 700,
                formatter: function(val: number) {
                  return val.toString();
                }
              },
              total: {
                show: true,
                label: 'Total Pedidos',
                fontSize: '16px',
                fontWeight: 600,
                formatter: function (w: any) {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                }
              }
            }
          }
        }
      },
      stroke: {
        width: 2
      },
      dataLabels: {
        enabled: false
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            height: 250
          },
          legend: {
            position: 'bottom'
          }
        }
      }],
      title: {
        text: 'Distribución de Pedidos',
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 600
        },
        margin: 15
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-pedidos-tiendas'), options);
    chart.render();
  }

  // Gráfico de líneas para crecimiento de tiendas
  private renderCrecimientoTiendasChart(): void {
    const options = {
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false },
        fontFamily: 'Helvetica, Arial, sans-serif'
      },
      stroke: {
        curve: 'smooth',
        width: 4
      },
      series: [{
        name: 'Crecimiento %',
        data: this.tiendas.map(t => t.crecimiento)
      }],
      colors: ['#43cea2'],
      grid: {
        borderColor: '#e7e7e7',
        row: {
          colors: ['#f3f3f3', 'transparent'],
          opacity: 0.3
        },
        padding: {
          left: 20,
          right: 20
        }
      },
      xaxis: {
        categories: this.tiendas.map(t => t.nombre),
        labels: {
          style: {
            fontSize: '14px'
          }
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          formatter: function (val: number) {
            return val.toFixed(1) + '%';
          },
          style: {
            fontSize: '13px'
          }
        }
      },
      markers: {
        size: 7,
        strokeWidth: 0,
        hover: {
          size: 9
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: number) {
          return val.toFixed(1) + '%';
        },
        style: {
          fontSize: '13px',
          fontWeight: 'bold',
          colors: ['#333']
        },
        background: {
          enabled: true,
          foreColor: '#fff',
          padding: 4,
          borderRadius: 4,
          borderWidth: 0
        }
      },
      title: {
        text: 'Crecimiento Mensual por Tienda',
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 600
        },
        margin: 15
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-crecimiento-tiendas'), options);
    chart.render();
  }

  private renderKPICharts(): void {
    this.renderVentasMensualesChart();
    this.renderMetricasRendimientoChart();
    this.renderSatisfaccionChart();
  }

  private renderVentasMensualesChart(): void {
    const options = {
      chart: {
        type: 'area',
        height: 200,
        sparkline: {
          enabled: true
        },
        toolbar: { show: false }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.2,
          stops: [0, 90, 100]
        }
      },
      series: [{
        name: 'Ventas',
        data: [30, 40, 35, 50, 49, 60, 70, 91, 125, 100, 120, 150]
      }],
      colors: ['#008ffb'],
      xaxis: {
        categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      },
      tooltip: {
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        y: {
          title: {
            formatter: function (seriesName: string) {
              return '';
            }
          }
        },
        marker: {
          show: false
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-ventas-mensuales'), options);
    chart.render();
  }

  private renderMetricasRendimientoChart(): void {
    const options = {
      chart: {
        type: 'radialBar',
        height: 200,
        toolbar: { show: false }
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          dataLabels: {
            name: {
              fontSize: '13px',
              color: '#333',
              offsetY: 80
            },
            value: {
              offsetY: 40,
              fontSize: '16px',
              color: '#333',
              formatter: function (val: number) {
                return val + '%';
              }
            }
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          shadeIntensity: 0.15,
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 50, 65, 91]
        },
      },
      stroke: {
        dashArray: 4
      },
      series: [this.kpiData.conversionPedidos * 100],
      labels: ['Tasa de Conversión'],
      colors: ['#00e396']
    };

    const chart = new ApexCharts(document.querySelector('#chart-metricas-rendimiento'), options);
    chart.render();
  }

  private renderSatisfaccionChart(): void {
    const options = {
      chart: {
        type: 'radar',
        height: 200,
        toolbar: { show: false }
      },
      series: [{
        name: 'Satisfacción',
        data: [4.8, 4.5, 4.2, 4.6, 4.9]
      }],
      labels: ['Atención', 'Entrega', 'Producto', 'Precio', 'Soporte'],
      colors: ['#ff4560'],
      plotOptions: {
        radar: {
          size: 140,
          polygons: {
            strokeColors: '#e9e9e9',
            fill: {
              colors: ['#f8f8f8', '#fff']
            }
          }
        }
      },
      markers: {
        size: 4,
        colors: ['#fff'],
        strokeColor: '#ff4560',
        strokeWidth: 2,
      },
      tooltip: {
        y: {
          formatter: function(val: number) {
            return val + '/5.0';
          }
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-satisfaccion'), options);
    chart.render();
  }

  // Método para cargar datos de análisis
  private cargarAnalisisUsuarios(): void {
    // Datos mock para ejemplo
    this.analisisUsuarios = [
      {
        id: 1,
        nombre: 'Cliente Alfa',
        actividad: {
          sesiones: 45,
          tiempoPromedio: 25,
          ultimaActividad: new Date(2024, 3, 18)
        },
        conversion: {
          tasa: 0.75,
          valorLTV: 1200000
        },
        engagement: {
          score: 85,
          tendencia: 12
        }
      },
      // ... más datos mock
    ];

    this.calcularMetricasGlobales();
  }

  private calcularMetricasGlobales(): void {
    this.metricasGlobales = {
      usuariosActivos: this.analisisUsuarios.length,
      tasaRetencion: 0.85,
      valorLTVPromedio: 950000,
      tiempoSesionPromedio: 22
    };
  }

  // Nuevo método para gráfico de engagement
  private renderEngagementChart(): void {
    const options = {
      chart: {
        type: 'heatmap',
        height: 300,
        toolbar: { show: false }
      },
      dataLabels: {
        enabled: false
      },
      colors: ['#008ffb'],
      series: [{
        name: 'Engagement',
        data: this.analisisUsuarios.map(usuario => ({
          x: usuario.nombre,
          y: usuario.engagement.score
        }))
      }],
      xaxis: {
        type: 'category',
        categories: this.analisisUsuarios.map(u => u.nombre)
      },
      title: {
        text: 'Score de Engagement por Usuario',
        align: 'center'
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-engagement'), options);
    chart.render();
  }

  // Nuevo método para gráfico de LTV
  private renderLTVChart(): void {
    const options = {
      chart: {
        type: 'bar',
        height: 300,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          dataLabels: {
            position: 'bottom'
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: number) {
          return '$' + (val / 1000) + 'K';
        }
      },
      series: [{
        name: 'LTV',
        data: this.analisisUsuarios.map(usuario => usuario.conversion.valorLTV)
      }],
      xaxis: {
        categories: this.analisisUsuarios.map(u => u.nombre)
      },
      title: {
        text: 'Valor de Vida del Cliente (LTV)',
        align: 'center'
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-ltv'), options);
    chart.render();
  }

  // Métodos de renderizado de nuevos gráficos
  private renderRevenueChart(): void {
    this.revenueChart.chart.height = 350;
    this.revenueChart.chart.fontFamily = 'Helvetica, Arial, sans-serif';
    this.revenueChart.title = {
      text: 'Tendencia de Ingresos',
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 600
      },
      margin: 15
    };
    this.revenueChart.grid = {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f8f9fa', 'transparent'],
        opacity: 0.3
      },
      padding: {
        left: 20,
        right: 20
      }
    };
    this.revenueChart.xaxis.labels = {
      style: {
        fontSize: '13px'
      }
    };
    this.revenueChart.yaxis.labels = {
      style: {
        fontSize: '13px'
      }
    };
    
    if (this.renderRevenueChartInstance) {
      this.renderRevenueChartInstance.updateOptions(this.revenueChart);
    } else {
      this.renderRevenueChartInstance = new ApexCharts(document.querySelector('#chart-revenue'), this.revenueChart);
      this.renderRevenueChartInstance.render();
    }
  }

  private renderCategoryChart(): void {
    this.categoryChart.chart.height = 350;
    this.categoryChart.chart.fontFamily = 'Helvetica, Arial, sans-serif';
    this.categoryChart.title = {
      text: 'Crecimiento por Categoría',
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 600
      },
      margin: 15
    };
    this.categoryChart.grid = {
      padding: {
        left: 20,
        right: 20
      }
    };
    this.categoryChart.plotOptions.bar.borderRadius = 6;
    this.categoryChart.plotOptions.bar.columnWidth = '70%';
    this.categoryChart.xaxis.labels = {
      style: {
        fontSize: '13px'
      }
    };
    this.categoryChart.yaxis = {
      labels: {
        style: {
          fontSize: '13px'
        }
      }
    };
    
    if (this.renderCategoryChartInstance) {
      this.renderCategoryChartInstance.updateOptions(this.categoryChart);
    } else {
      this.renderCategoryChartInstance = new ApexCharts(document.querySelector('#chart-categories'), this.categoryChart);
      this.renderCategoryChartInstance.render();
    }
  }

  private renderPerformanceChart(): void {
    this.performanceChart.chart.height = 350;
    this.performanceChart.chart.fontFamily = 'Helvetica, Arial, sans-serif';
    this.performanceChart.title = {
      text: 'Métricas de Rendimiento',
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 600
      },
      margin: 15
    };
    this.performanceChart.plotOptions.radialBar.dataLabels.name.fontSize = '14px';
    this.performanceChart.plotOptions.radialBar.dataLabels.value.fontSize = '20px';
    this.performanceChart.plotOptions.radialBar.dataLabels.value.fontWeight = 700;
    this.performanceChart.plotOptions.radialBar.dataLabels.total = {
      show: true,
      label: 'Promedio',
      fontSize: '16px',
      fontWeight: 600
    };
    
    if (this.renderPerformanceChartInstance) {
      this.renderPerformanceChartInstance.updateOptions(this.performanceChart);
    } else {
      this.renderPerformanceChartInstance = new ApexCharts(document.querySelector('#chart-performance'), this.performanceChart);
      this.renderPerformanceChartInstance.render();
    }
  }

  // Método para obtener detalles completos de un cliente
  getDetallesCliente(cliente: Cliente): any {
    return {
      infoGeneral: {
        nombre: cliente.empresa.nombre,
        empresa: cliente.empresa.nombre,
        nit: cliente.empresa.nit,
        direccion: cliente.empresa.direccion,
        ciudad: cliente.empresa.ciudad,
        departamento: cliente.empresa.departamento,
        pais: cliente.empresa.pais,
        emailContacto: cliente.empresa.emailContacto,
        telContacto: cliente.empresa.telContacto,
        nombreSede: cliente.empresa.nombreSede,
        fijoContacto: cliente.empresa.fijoContacto,
        emailFactuElec: cliente.empresa.emailFactuElec,
        cel: cliente.empresa.cel,
        comoLlegarSede: cliente.empresa.comoLlegarSede,
        extensionFijo: cliente.empresa.extensionFijo,
        direccionSede: cliente.empresa.direccionSede
      },
      sedes: cliente.empresa.sedes,
      contactos: cliente.empresa.contactos,
      horarios: cliente.empresa.horarios,
      marketplaces: cliente.empresa.marketplaces,
      canalesComunicacion: cliente.empresa.canalesComunicacion,
      redesSociales: cliente.empresa.redesSociales
    };
  }
}
