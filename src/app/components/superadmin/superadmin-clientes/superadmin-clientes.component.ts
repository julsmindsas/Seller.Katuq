import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import { UserService } from '../../../services/user.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Sede, Contacto, HorarioPV, MarketPlace, CanalComunicacion, RedSocial } from '../../../shared/models/empresa/empresa';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { CompaniesService } from '../../../services/companies.service';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';
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

  // Datos para KPIs
  kpiData: any = {
    ventasTotales: 0,
    pedidosPromedio: 0,
    tiempoEntregaPromedio: 0,
    satisfaccionGlobal: 0,
    tiendasActivas: 0,
    zonasCobertura: 0,
    conversionPedidos: 0,
    ticketPromedio: 0,
    retencionClientes: 0,
    eficienciaEntrega: 0
  };

  // Datos para gráficos de KPIs
  storePerformanceData: any[] = [];
  monthlySalesData: any = { series: [{ data: [] }], xaxis: { categories: [] } };
  satisfactionData: any = { series: [{ data: [] }], labels: [] };
  loadingInitialCharts: boolean = false;

  // Propiedades para datos secundarios (se cargan bajo demanda)
  analisisUsuarios: AnalisisUsuario[] = [];
  metricasGlobales: MetricasGlobales = {
    usuariosActivos: 0,
    tasaRetencion: 0,
    valorLTVPromedio: 0,
    tiempoSesionPromedio: 0
  };
  userAnalysis: any[] = [];
  growthMetrics: any = {};
  conversionMetrics: any = {};
  performanceMetrics: any = {};
  categoryTrends: any[] = [];
  marketingMetrics: any = {};

  // Banderas de carga para secciones secundarias
  loadingUserAnalysis: boolean = false;
  loadingGrowthPerformance: boolean = false;
  loadingCategoryMarketing: boolean = false;

  // Banderas para saber si los datos ya se cargaron
  userAnalysisLoaded: boolean = false;
  growthPerformanceLoaded: boolean = false;
  categoryMarketingLoaded: boolean = false;

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

  // Propiedad para datos reales de tiendas
  storesData: any[] = []; 
  loadingStoresData: boolean = false;

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

  // Instancias de gráficos (se inicializan/actualizan en los métodos de carga)
  private renderVentasTiendasChartInstance: any;
  private renderPedidosTiendasChartInstance: any;
  private renderCrecimientoTiendasChartInstance: any;
  private renderVentasMensualesChartInstance: any;
  private renderMetricasRendimientoChartInstance: any;
  private renderSatisfaccionChartInstance: any;
  private renderRevenueChartInstance: any;
  private renderCategoryChartInstance: any;
  private renderPerformanceChartInstance: any;
  private renderEngagementChartInstance: any;
  private renderLTVChartInstance: any;

  // Propiedades para la vista mejorada
  percentageActiveClients: number = 0;
  filtroFecha: string;
  viewMode: string = 'table'; // o 'cards' para vista móvil

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
    this.cargarDatosTiendas();
    this.calcularPorcentajeClientesActivos();
    this.initializeResponsiveView();
    this.initializeCharts();
  }

  ngAfterViewInit(): void {
    this.renderStoreCharts();
    this.renderKPICharts();
  }

  cargarClientes(): void {
    this.cargando = true;
    this.error = '';
    this.clientes = [];
    this.clientesFiltrados = [];
    const filters = {
      nombre: this.filtroNombre || undefined,
      estado: this.filtroEstado || undefined
    };
    
    let serviceCall: Observable<any[]>;
    if (this.filtroNombre || this.filtroEstado) {
      serviceCall = this.companiesService.filterCompanies(filters);
    } else {
      serviceCall = this.companiesService.getAllCompanies();
    }

    serviceCall.pipe(
        catchError(err => {
          this.error = 'Error al conectar con el servidor. No se pudieron cargar los clientes.';
          console.error('Error en la petición de empresas:', err);
          this.notificationService.error('Error', this.error); 
          this.clientes = [];
          this.clientesFiltrados = [];
          return of([]);
        }),
        finalize(() => {
          this.cargando = false;
        })
      )
      .subscribe(res => {
        if (this.error === '') { 
          this.procesarRespuestaClientes(res);
          this.filtrarClientes(); 
        } 
      });
  }
  
  private procesarRespuestaClientes(res: any[]): void {
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
      this.error = 'La respuesta del servidor para empresas no fue válida.';
      console.error('Error al obtener empresas (respuesta inválida):', res);
      this.notificationService.error('Error', this.error);
      this.clientes = [];
      this.clientesFiltrados = [];
    }
  }

  cargarKPIs(): void {
    this.analyticsService.getKpiGeneral()
    .pipe(
        catchError(err => {
            console.error('Error al cargar KPIs generales:', err);
            this.notificationService.info('Información', 'No se pudieron cargar KPIs generales, usando valores por defecto.');
            return of({ 
                pedidosPromedio: 320,
                tiempoEntregaPromedio: 28,
                satisfaccionGlobal: 4.6,
                tiendasActivas: 4,
                zonasCobertura: 3,
                conversionPedidos: 0.75,
                ticketPromedio: 35000,
                retencionClientes: 0.85,
                eficienciaEntrega: 0.92
            }); 
        }),
    )
    .subscribe(data => {
        const kpiDataResponse = data || {};
        this.kpiData = {
            ...this.kpiData,
            pedidosPromedio: this.asegurarNumero(kpiDataResponse.pedidosPromedio),
            tiempoEntregaPromedio: this.asegurarNumero(kpiDataResponse.tiempoEntregaPromedio),
            satisfaccionGlobal: this.asegurarNumero(kpiDataResponse.satisfaccionGlobal, 0, 1),
            tiendasActivas: this.asegurarNumero(kpiDataResponse.tiendasActivas),
            zonasCobertura: this.asegurarNumero(kpiDataResponse.zonasCobertura),
            conversionPedidos: this.asegurarNumero(kpiDataResponse.conversionPedidos, 0, 2),
            ticketPromedio: this.asegurarNumero(kpiDataResponse.ticketPromedio),
            retencionClientes: this.asegurarNumero(kpiDataResponse.retencionClientes, 0, 2),
            eficienciaEntrega: this.asegurarNumero(kpiDataResponse.eficienciaEntrega, 0, 2)
        };
        
        // Re-renderizar gráficos dependientes que ya estén inicializados
        if (this.renderMetricasRendimientoChartInstance) {
             this.renderMetricasRendimientoChart();
        }
    });
  }

  cargarMetricasGlobales(): void {
    this.analyticsService.getGlobalMetrics()
      .pipe(
        catchError(err => {
          console.error('Error al cargar métricas globales:', err);
          this.notificationService.info('Información', 'No se pudieron cargar métricas globales, mostrando valores por defecto.');
          return of({
             usuariosActivos: 500,
             tasaRetencion: 0.85,
             valorLTVPromedio: 950000,
             tiempoSesionPromedio: 22
          });
        })
      )
      .subscribe(data => {
        if (data) {
          this.metricasGlobales = {
            usuariosActivos: this.asegurarNumero(data.usuariosActivos, 0),
            tasaRetencion: this.asegurarNumero(data.tasaRetencion, 0.85),
            valorLTVPromedio: this.asegurarNumero(data.valorLTVPromedio, 950000),
            tiempoSesionPromedio: this.asegurarNumero(data.tiempoSesionPromedio, 22)
          };
        }
      });
  }

  loadUserAnalysisData(): void {
    if (this.userAnalysisLoaded) return;
    
    this.loadingUserAnalysis = true;
    this.analyticsService.getAnalysisUsers()
      .pipe(
        catchError(err => {
          console.error('Error al cargar análisis de usuarios:', err);
          this.notificationService.error('Error', 'No se pudo cargar el análisis de usuarios.');
          return of([]);
        }),
        finalize(() => { 
          this.loadingUserAnalysis = false;
          this.userAnalysisLoaded = true;
        })
      )
      .subscribe(users => {
        this.analisisUsuarios = users.map((u: any) => ({
           id: u.id || 0,
           nombre: u.nombre || 'Usuario Desconocido',
           actividad: {
             sesiones: this.asegurarNumero(u.actividad?.sesiones),
             tiempoPromedio: this.asegurarNumero(u.actividad?.tiempoPromedio),
             ultimaActividad: u.actividad?.ultimaActividad ? new Date(u.actividad.ultimaActividad) : new Date()
           },
           conversion: {
             tasa: this.asegurarNumero(u.conversion?.tasa),
             valorLTV: this.asegurarNumero(u.conversion?.valorLTV)
           },
           engagement: {
             score: this.asegurarNumero(u.engagement?.score),
             tendencia: this.asegurarNumero(u.engagement?.tendencia)
           }
        }));
        this.userAnalysis = this.analisisUsuarios;
        
        this.renderEngagementChart(); 
        this.renderLTVChart();
        this.notificationService.success('Éxito', 'Análisis de usuarios cargado.');
      });
  }

  loadGrowthPerformanceData(): void {
    if (this.growthPerformanceLoaded) return; 

    this.loadingGrowthPerformance = true;
    forkJoin({
      growth: this.analyticsService.getGrowthMetrics().pipe(catchError(() => of({}))),
      performance: this.analyticsService.getPerformanceMetrics().pipe(catchError(() => of({})))
    })
    .pipe(
      finalize(() => {
         this.loadingGrowthPerformance = false;
         this.growthPerformanceLoaded = true;
      })
    )
    .subscribe(results => {
        this.growthMetrics = results.growth || {};
        this.performanceMetrics = results.performance || {};
        
        this.cargarDatosGraficosCrecimientoRendimiento(results);
        this.notificationService.success('Éxito', 'Métricas de crecimiento y rendimiento cargadas.');
    });
  }
  
  loadCategoryMarketingData(): void {
     if (this.categoryMarketingLoaded) return; 
     
     this.loadingCategoryMarketing = true;
     forkJoin({
        categories: this.analyticsService.getCategoryTrends().pipe(catchError(() => of([]))),
        marketing: this.analyticsService.getMarketingMetrics().pipe(catchError(() => of({})))
     })
     .pipe(
       finalize(() => {
          this.loadingCategoryMarketing = false;
          this.categoryMarketingLoaded = true;
       })
     )
     .subscribe(results => {
         this.categoryTrends = Array.isArray(results.categories) ? results.categories : [];
         this.marketingMetrics = results.marketing || {};
         
         this.cargarDatosGraficosCategoriaMarketing(results);
         this.notificationService.success('Éxito', 'Datos de categorías y marketing cargados.');
     });
  }

  private asegurarNumero(valor: any, valorPorDefecto: number = 0, decimales: number | null = null): number {
    let numero = valorPorDefecto;
    if (valor !== null && valor !== undefined && !isNaN(Number(valor))) {
      numero = Number(valor);
    }
    if (decimales !== null) {
        return parseFloat(numero.toFixed(decimales));
    }
    return numero;
  }

  filtrarClientes(): void {
    if (!this.clientes) {
       this.clientesFiltrados = [];
       return;
    }
    this.clientesFiltrados = this.clientes.filter(cliente => {
      const nombreEmpresa = cliente.empresa?.nombre?.toLowerCase() || '';
      const emailContacto = cliente.empresa?.emailContacto?.toLowerCase() || '';
      const filtro = this.filtroNombre.toLowerCase();
      
      const coincideNombre = nombreEmpresa.includes(filtro) || emailContacto.includes(filtro);
      const coincideEstado = !this.filtroEstado || cliente.estado === this.filtroEstado;
      return coincideNombre && coincideEstado;
    });
  }

  editarCliente(cliente: Cliente): void {
    console.log('Editar cliente:', cliente);
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
      .subscribe((res: any) => {
        if (res?.success) {
          const index = this.clientes.findIndex(c => c.id === cliente.id);
          if (index !== -1) {
            this.clientes[index].estado = nuevoEstado;
            this.filtrarClientes();
            this.notificationService.success('Éxito', `Estado del cliente actualizado a ${nuevoEstado}`);
          }
        } else {
          const errorMsg = res?.message || 'No se pudo cambiar el estado del cliente';
          this.notificationService.error('Error', errorMsg);
        }
      });
  }

  verDetalles(cliente: Cliente): void {
    this.clienteSeleccionado = cliente;
    
    this.companiesService.getCompanyById(cliente.id.toString())
      .pipe(
        catchError(err => {
          console.error('Error al cargar detalles del cliente:', err);
          this.notificationService.error('Error', 'No se pudieron cargar los detalles del cliente');
          return of(null);
        })
      )
      .subscribe(data => {
        if (data) {
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
            return of(null);
          })
        )
        .subscribe((res: any) => {
          if (res?.success) {
            this.clientes = this.clientes.filter(c => c.id !== cliente.id);
            this.filtrarClientes();
            this.notificationService.success('Éxito', 'Cliente eliminado correctamente');
          } else {
            const errorMsg = res?.message || 'No se pudo eliminar el cliente';
            this.notificationService.error('Error', errorMsg);
          }
        });
    }
  }
  
  private renderStoreCharts(): void {
    if (!this.storesData || this.storesData.length === 0) { 
        console.warn("No hay datos de tiendas para renderizar gráficos.");
        if(this.renderVentasTiendasChartInstance) this.renderVentasTiendasChartInstance.destroy();
        if(this.renderPedidosTiendasChartInstance) this.renderPedidosTiendasChartInstance.destroy();
        if(this.renderCrecimientoTiendasChartInstance) this.renderCrecimientoTiendasChartInstance.destroy();
        this.renderVentasTiendasChartInstance = null;
        this.renderPedidosTiendasChartInstance = null;
        this.renderCrecimientoTiendasChartInstance = null;
        return;
    }
    this.renderVentasPorTiendaChart();
    this.renderPedidosPorTiendaChart();
    this.renderCrecimientoTiendasChart();
  }
  
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
        data: this.storesData.map(t => this.asegurarNumero(t.ingresos))
      }],
      grid: {
        padding: {
          left: 20,
          right: 20
        }
      },
      xaxis: {
        categories: this.storesData.map(t => t.nombre || 'Desconocida'),
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

    const chartElement = document.querySelector('#chart-ventas-tiendas');
    if (chartElement) {
       if (this.renderVentasTiendasChartInstance) this.renderVentasTiendasChartInstance.updateOptions(options, true);
       else { this.renderVentasTiendasChartInstance = new ApexCharts(chartElement, options); this.renderVentasTiendasChartInstance.render(); }
    } else console.warn('Elemento #chart-ventas-tiendas no encontrado.');
  }

  private renderPedidosPorTiendaChart(): void {
    const options = {
      chart: {
        type: 'donut',
        height: 350,
        fontFamily: 'Helvetica, Arial, sans-serif'
      },
      series: this.storesData.map(t => this.asegurarNumero(t.pedidos)),
      labels: this.storesData.map(t => t.nombre || 'Desconocida'),
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

    const chartElement = document.querySelector('#chart-pedidos-tiendas');
    if (chartElement) {
       if (this.renderPedidosTiendasChartInstance) this.renderPedidosTiendasChartInstance.updateOptions(options, true);
       else { this.renderPedidosTiendasChartInstance = new ApexCharts(chartElement, options); this.renderPedidosTiendasChartInstance.render(); }
    } else console.warn('Elemento #chart-pedidos-tiendas no encontrado.');
  }

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
        data: this.storesData.map(t => this.asegurarNumero(t.crecimiento, 0, 1))
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
        categories: this.storesData.map(t => t.nombre || 'Desconocida'),
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

    const chartElement = document.querySelector('#chart-crecimiento-tiendas');
    if (chartElement) {
       if (this.renderCrecimientoTiendasChartInstance) this.renderCrecimientoTiendasChartInstance.updateOptions(options, true);
       else { this.renderCrecimientoTiendasChartInstance = new ApexCharts(chartElement, options); this.renderCrecimientoTiendasChartInstance.render(); }
    } else console.warn('Elemento #chart-crecimiento-tiendas no encontrado.');
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
        // Las categorías no son relevantes para un sparkline simple
        // categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      },
      tooltip: { enabled: false }
    };

    const chartElement = document.querySelector('#chart-ventas-mensuales');
    if (chartElement) {
        try {
           if (this.renderVentasMensualesChartInstance) { 
               this.renderVentasMensualesChartInstance.updateOptions(options, true);
           } else { 
               this.renderVentasMensualesChartInstance = new ApexCharts(chartElement, options);
               this.renderVentasMensualesChartInstance.render(); 
           }
        } catch (e) {
            console.error("Error renderizando/actualizando gráfico de ventas mensuales:", e);
            if(this.renderVentasMensualesChartInstance) this.renderVentasMensualesChartInstance.destroy();
            this.renderVentasMensualesChartInstance = null;
        }
    } 
  }

  private renderMetricasRendimientoChart(): void {
    const conversionRate = this.asegurarNumero(this.kpiData?.conversionPedidos * 100, 0, 1);
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
                return val.toFixed(1) + '%';
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
      series: [conversionRate], 
      labels: ['Tasa Conversión'],
      colors: ['#00e396']
    };

    const chartElement = document.querySelector('#chart-metricas-rendimiento');
     if (chartElement) {
       if (this.renderMetricasRendimientoChartInstance) {
           this.renderMetricasRendimientoChartInstance.updateOptions(options);
       } else {
           this.renderMetricasRendimientoChartInstance = new ApexCharts(chartElement, options);
           this.renderMetricasRendimientoChartInstance.render();
       }
    }
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
        y: { formatter: (val: number) => val.toFixed(1) + '/5.0' }
      }
    };

     const chartElement = document.querySelector('#chart-satisfaccion');
     if (chartElement) {
       if (this.renderSatisfaccionChartInstance) {
           this.renderSatisfaccionChartInstance.updateOptions(options);
       } else {
           this.renderSatisfaccionChartInstance = new ApexCharts(chartElement, options);
           this.renderSatisfaccionChartInstance.render();
       }
    }
  }

  private cargarDatosGraficosCrecimientoRendimiento(results: any): void {
    if (results.growth && results.growth.revenueTrend) {
      const revenueTrend = Array.isArray(results.growth.revenueTrend.data) ? 
                      results.growth.revenueTrend.data.map((val: any) => this.asegurarNumero(val, 0)) : 
                      [];
      const revenueDates = Array.isArray(results.growth.revenueTrend.categories) ? 
                      results.growth.revenueTrend.categories : 
                      [];
      
      this.revenueChart.series[0].data = revenueTrend;
      this.revenueChart.xaxis.categories = revenueDates;
      this.renderRevenueChart();
    }
    
    if (results.performance) {
      this.performanceChart.series = [
        this.asegurarNumero(results.performance.systemUptime, 0),
        this.asegurarNumero(results.performance.customerSatisfaction, 0),
        this.asegurarNumero(results.performance.supportResponseTime, 0)
      ];
      this.performanceChart.labels = [
        `Uptime (${this.performanceChart.series[0]}%)`,
        `Satisfacción (${this.performanceChart.series[1]}%)`,
        `Resp. Soporte (${this.performanceChart.series[2]}%)`
      ];
      this.renderPerformanceChart();
    }
  }
  
  private cargarDatosGraficosCategoriaMarketing(results: any): void {
    if (Array.isArray(results.categories)) {
      this.categoryChart.series[0].data = results.categories.map((cat: any) => 
        this.asegurarNumero(cat?.growth, 0)
      );
      this.categoryChart.xaxis.categories = results.categories.map((cat: any) => 
        cat?.name || 'Sin nombre'
      );
       this.renderCategoryChart();
    }
  }

  private renderEngagementChart(): void {
    if (!this.analisisUsuarios || this.analisisUsuarios.length === 0) return;
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
    
    const chartElement = document.querySelector('#chart-engagement');
    if (chartElement) {
       if (this.renderEngagementChartInstance) {
          this.renderEngagementChartInstance.updateOptions(options);
       } else {
          this.renderEngagementChartInstance = new ApexCharts(chartElement, options);
          this.renderEngagementChartInstance.render();
       }
    } else {
       console.warn('Elemento #chart-engagement no encontrado para renderizar gráfico.');
    }
  }

  private renderLTVChart(): void {
    if (!this.analisisUsuarios || this.analisisUsuarios.length === 0) return;
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
          return '$' + (val / 1000).toFixed(0) + 'K';
        },
        style: {
           fontSize: '12px',
           colors: ["#304758"]
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

     const chartElement = document.querySelector('#chart-ltv');
     if (chartElement) {
       if (this.renderLTVChartInstance) {
          this.renderLTVChartInstance.updateOptions(options);
       } else {
          this.renderLTVChartInstance = new ApexCharts(chartElement, options);
          this.renderLTVChartInstance.render();
       }
    } else {
       console.warn('Elemento #chart-ltv no encontrado para renderizar gráfico.');
    }
  }

  private renderRevenueChart(): void {
    if (!this.revenueChart?.series?.[0]?.data?.length) return;
    const options = this.revenueChart;
    const chartElement = document.querySelector('#chart-revenue');
    if (chartElement) {
       if (this.renderRevenueChartInstance) {
          this.renderRevenueChartInstance.updateOptions(options);
       } else {
          this.renderRevenueChartInstance = new ApexCharts(chartElement, options);
          this.renderRevenueChartInstance.render();
       }
    } else {
       console.warn('Elemento #chart-revenue no encontrado para renderizar gráfico.');
    }
  }

  private renderCategoryChart(): void {
    if (!this.categoryChart?.series?.[0]?.data?.length) return;
    const options = this.categoryChart;
    const chartElement = document.querySelector('#chart-categories');
    if (chartElement) {
       if (this.renderCategoryChartInstance) {
          this.renderCategoryChartInstance.updateOptions(options);
       } else {
          this.renderCategoryChartInstance = new ApexCharts(chartElement, options);
          this.renderCategoryChartInstance.render();
       }
    } else {
       console.warn('Elemento #chart-categories no encontrado para renderizar gráfico.');
    }
  }

  private renderPerformanceChart(): void {
    if (!this.performanceChart?.series?.length) return;
    const options = this.performanceChart;
    const chartElement = document.querySelector('#chart-performance');
    if (chartElement) {
        if (this.renderPerformanceChartInstance) {
            this.renderPerformanceChartInstance.updateOptions(options);
        } else {
            this.renderPerformanceChartInstance = new ApexCharts(chartElement, options);
            this.renderPerformanceChartInstance.render();
        }
    } else {
       console.warn('Elemento #chart-performance no encontrado para renderizar gráfico.');
    }
  }

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

  cargarDatosTiendas(): void {
    this.loadingStoresData = true;
    this.analyticsService.getStoresData()
      .pipe(
          catchError(err => {
              console.error('Error al cargar datos de tiendas:', err);
              this.notificationService.error('Error', 'No se pudieron cargar los datos de rendimiento de tiendas.');
              return of([]);
          }),
          finalize(() => {
              this.loadingStoresData = false;
          })
      )
      .subscribe(data => {
          this.storesData = Array.isArray(data) ? data : [];
          
          // CALCULAR ventasTotales desde storesData
          const totalVentasTiendas = this.storesData.reduce((sum, tienda) => 
              sum + this.asegurarNumero(tienda.ingresos), 0
          );
          // Actualizar kpiData.ventasTotales
          this.kpiData.ventasTotales = totalVentasTiendas;
          
          // Renderizar gráficos de tiendas 
          this.renderStoreCharts(); 
          
          // Notificar
          if (this.storesData.length > 0) {
             this.notificationService.success('Éxito', 'Datos de tiendas cargados.');
          } else {
             this.notificationService.info('Información', 'No se encontraron datos de rendimiento de tiendas.');
             // Si no hay tiendas, las ventas totales también son 0 (ya asignado arriba)
          }
      });
  }

  // Nuevos métodos UI
  refreshData() {
    console.log('Actualizando datos...');
    this.cargarClientes();
  }

  exportData() {
    console.log('Exportando datos...');
    // Implementar lógica de exportación
  }

  openNewClientModal() {
    console.log('Abriendo modal de nuevo cliente...');
    // Implementar lógica para abrir modal
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getClienteColor(cliente: any): string {
    if (cliente.estado === 'Activo') return 'success-dark';
    if (cliente.estado === 'Bloqueado') return 'danger-dark';
    if (cliente.estado === 'Pendiente') return 'warning-dark';
    return 'info-dark';
  }

  private calcularPorcentajeClientesActivos() {
    if (this.totalClientes > 0) {
      this.percentageActiveClients = (this.clientesActivosCount / this.totalClientes) * 100;
    }
  }

  private initializeResponsiveView() {
    // Detectar dispositivo móvil para mostrar vista de tarjetas automáticamente
    if (window.innerWidth < 768) {
      this.viewMode = 'cards';
    }
    
    // Listener para cambiar vista en resize
    window.addEventListener('resize', () => {
      if (window.innerWidth < 768 && this.viewMode === 'table') {
        this.viewMode = 'cards';
      }
    });
  }

  private initializeCharts() {
    // Inicialización de gráficos cuando se cargue la página
    // (Se implementará con ApexCharts o similar)
    console.log('Inicializando gráficos...');
  }
}
