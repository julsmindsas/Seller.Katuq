import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';
import { forkJoin, of, Observable } from 'rxjs';

import { LogisticaServiceV2 } from '../../../../../shared/services/despachos/logistica.service.v2';
import { ShipmentPreparationService, BodegaAnalysis } from '../../../../../shared/services/despachos/shipment-preparation.service';
import { EnviameHelperService } from '../services/enviame-helper.service';
import { DaneCodesService } from '../../../../../shared/services/dane-codes.service';
import { MunicipioDane } from '../../../../../shared/data/colombia-dane-codes';
import {
  EnviameRate,
  EnviameQuoteRequest,
  EnviameRatesResponse,
  PedidoQuoteData
} from '../models/enviame.interfaces';
import { Pedido } from '../../../../ventas/modelo/pedido';

@Component({
  selector: 'app-enviame-rates-modal',
  templateUrl: './enviame-rates-modal.component.html',
  styleUrls: ['./enviame-rates-modal.component.scss']
})
export class EnviameRatesModalComponent implements OnInit {

  // FORMULARIO NO NULO - Se inicializa ANTES de cualquier cosa
  public quoteForm: FormGroup = new FormGroup({});

  availableRates: EnviameRate[] = [];
  selectedRate: EnviameRate | null = null;

  // Mejoras UX: Estados y filtros
  filteredRates: EnviameRate[] = [];
  recommendedRates: EnviameRate[] = [];
  otherRates: EnviameRate[] = [];

  // Controles de filtrado y ordenamiento
  sortBy: string = 'price'; // price | time | carrier
  filterCarrier: string = '';
  showOnlyRecommended: boolean = false;

  loading = false;
  quotingRates = false;
  creatingShipment = false;

  order: any;
  companyId: string;

  // Estado de carga de datos
  loadingShipmentData = false;

  // ========================================
  // SOPORTE MULTI-PEDIDO
  // ========================================
  pedidosQuotesList: PedidoQuoteData[] = [];
  isMultiPedidoMode: boolean = false;
  selectedPedidoTabUbicaciones: number | string = 0;
  selectedPedidoTabPaquete: number | string = 0;
  selectedPedidoTabResultados: number | string = 0;
  currentPedidoIndex: number = 0; // Índice del pedido actualmente mostrado en el formulario

  // Estados de carga mejorados
  loadingStep: number = 0;
  loadingMessages = [
    'Validando direcciones...',
    'Calculando rutas disponibles...',
    'Obteniendo tarifas actualizadas...'
  ];

  // Un solo flag para controlar cuando TODO está listo
  isReady = false;

  // Control de pestañas con validación
  activeTabIndex: number = 0;
  tabsValidation = {
    locations: { valid: false, errors: [] as string[] },
    package: { valid: false, errors: [] as string[] }
  };

  // UI Enhancement States
  dimensionsCollapsed = false;

  // Municipios para autocompletado
  municipiosSugeridosOrigen: any[] = [];
  municipiosSugeridosDestino: any[] = [];
  municipioSeleccionadoOrigen: MunicipioDane | null = null;
  municipioSeleccionadoDestino: MunicipioDane | null = null;

  // Estados de búsqueda de municipios
  searchingMunicipiosOrigen: boolean = false;
  searchingMunicipiosDestino: boolean = false;

  // Tipos de envío disponibles con información mejorada
  tiposEnvio = [
    {
      label: 'Estándar',
      value: 'estandar',
      icon: 'pi-box',
      description: '3-5 días hábiles',
      priceRange: 'Desde $15.000',
      popular: true,
      features: ['Cobertura nacional', 'Seguro básico incluido'],
      badge: null,
      badgeType: null,
      recommended: false
    },
    {
      label: 'Express',
      value: 'express',
      icon: 'pi-forward',
      description: '1-2 días hábiles',
      priceRange: 'Desde $35.000',
      recommended: true,
      features: ['Tracking en tiempo real', 'Prioridad en despacho'],
      badge: 'Más rápido',
      badgeType: 'fast',
      popular: false
    },
    {
      label: 'Prioritario',
      value: 'prioritario',
      icon: 'pi-bolt',
      description: 'Entrega en 24 horas',
      priceRange: 'Desde $50.000',
      features: ['Entrega garantizada', 'Seguro premium'],
      badge: 'Premium',
      badgeType: 'premium',
      recommended: false,
      popular: false
    },
    {
      label: 'Mismo Día',
      value: 'sameday',
      icon: 'pi-clock',
      description: 'Entrega hoy mismo',
      priceRange: 'Desde $70.000',
      features: ['Solo ciudades principales', 'Máx. 10kg'],
      badge: 'Urgente',
      badgeType: 'urgent',
      recommended: false,
      popular: false
    },
    {
      label: 'Día Siguiente',
      value: 'nextday',
      icon: 'pi-calendar-plus',
      description: 'Entrega mañana',
      priceRange: 'Desde $40.000',
      features: ['Amplia cobertura', 'Entrega antes 6pm'],
      badge: null,
      badgeType: null,
      recommended: false,
      popular: false
    },
    {
      label: 'Logística Inversa',
      value: 'logistica-inversa',
      icon: 'pi-replay',
      description: 'Para devoluciones',
      priceRange: 'Desde $20.000',
      features: ['Recolección incluida', 'Gestión simplificada'],
      badge: 'Devoluciones',
      badgeType: 'return',
      recommended: false,
      popular: false
    }
  ];

  // Opciones de ordenamiento para el dropdown
  sortOptions = [
    { label: 'Precio: Menor a mayor', value: 'price_asc' },
    { label: 'Precio: Mayor a menor', value: 'price_desc' },
    { label: 'Tiempo: Más rápido', value: 'time_asc' },
    { label: 'Tiempo: Más lento', value: 'time_desc' },
    { label: 'Transportadora A-Z', value: 'carrier_asc' },
    { label: 'Transportadora Z-A', value: 'carrier_desc' }
  ];

  selectedSort: string = 'price_asc';

  // Control de confirmación mejorado
  showConfirmDialog: boolean = false;
  confirmedDetails: boolean = false;

  // Control de opciones colapsables (nuevo diseño)
  optionsExpanded: boolean = false;

  // Propiedades para tracking de auto-llenado
  isAutoFilledOrigin: boolean = false;
  isAutoFilledDestination: boolean = false;
  originalOriginCity: string = '';
  originalDestinationCity: string = '';

  // Cache para búsquedas
  private searchCache = new Map<string, any[]>();

  // ========================================
  // ACCORDION INTELIGENTE CON AUTO-GUIADO
  // ========================================
  activeStep: number = 0;
  stepStates = [
    { completed: false, locked: false, optional: false }, // Paso 1: Tipo + Distancia
    { completed: false, locked: true, optional: false },  // Paso 2: Ubicaciones
    { completed: false, locked: true, optional: false },  // Paso 3: Paquete
    { completed: false, locked: false, optional: true }   // Paso 4: Opciones (opcional)
  ];

  constructor(
    private fb: FormBuilder,
    private logisticaService: LogisticaServiceV2,
    private shipmentPreparation: ShipmentPreparationService,
    private enviameHelper: EnviameHelperService,
    private daneCodesService: DaneCodesService,
    private toastr: ToastrService,
    private dialogRef: DynamicDialogRef,
    private dialogConfig: DynamicDialogConfig,
    private cdr: ChangeDetectorRef
  ) {
    // Obtener datos del modal
    this.order = this.dialogConfig.data?.order;
    this.companyId = this.dialogConfig.data?.companyId || 'default_company';

    // CREAR EL FORMULARIO INMEDIATAMENTE
    this.createForm();
  }

  ngOnInit(): void {
    // Dar tiempo a Angular para procesar el binding
    setTimeout(() => {
      this.loadOrderDataSync();
      this.isReady = true;
      console.log('✅ Componente completamente inicializado');

      // Forzar actualización de valores después de la inicialización
      setTimeout(() => {
        if (this.quoteForm) {
          // Validar el formulario inicialmente
          this.validateTabs();
          this.cdr.detectChanges();
        }
      }, 200);
    }, 100); // 100ms es suficiente para que Angular procese todo

    // Suscribirse a cambios del formulario para validación progresiva
    this.setupFormValidation();

    // Configurar validación dinámica de distancia según tipo de envío
    this.setupDistanceValidation();
  }

  private createForm(): void {
    console.log('🔧 Creando formulario completo...');

    // CREAR FORMULARIO COMPLETO DE UNA VEZ
    this.quoteForm = this.fb.group({
        // Municipios DANE
        originMunicipio: ['', Validators.required],
        destinationMunicipio: ['', Validators.required],

        // Tipo de envío
        shippingType: ['estandar', Validators.required],

        // Distancia (requerida solo para Express)
        distanceKm: [null],

        // Origen
        originAddress: [''],
        originCity: ['', Validators.required],
        originCountry: ['CO', Validators.required],
        originPostalCode: [''],

        // Destino
        destinationAddress: [''],
        destinationCity: ['', Validators.required],
        destinationCountry: ['CO', Validators.required],
        destinationPostalCode: [''],

        // Destinatario
        recipientName: ['', Validators.required],
        recipientPhone: ['', Validators.required],
        recipientEmail: ['', [Validators.email]],

        // Paquete
        weight: [1, [Validators.required, Validators.min(0.1), Validators.max(50)]],
        length: [30, [Validators.min(1)]],  // Opcional
        width: [20, [Validators.min(1)]],    // Opcional
        height: [15, [Validators.min(1)]],   // Opcional
        value: [0, [Validators.required, Validators.min(0)]],
        description: ['Productos varios'],

        // Opciones
        insurance: [false],
        cashOnDelivery: [false],
        signature: [true]
      });

      console.log('✅ Formulario creado con', Object.keys(this.quoteForm.controls).length, 'controles');
  }

  // Método síncrono para cargar datos durante la inicialización
  private loadOrderDataSync(): void {
    console.log('📦 Cargando datos del pedido de forma síncrona...', this.order);

    if (!this.order) {
      console.warn('⚠️ No hay orden disponible para cotizar');
      return;
    }

    // Detectar si es multi-pedido
    const pedidos = this.order.pedidos || [];
    this.isMultiPedidoMode = pedidos.length > 1;

    if (this.isMultiPedidoMode) {
      console.log(`📦 Modo multi-pedido activado: ${pedidos.length} pedidos detectados`);
      this.initializePedidosQuotes();
      return; // Salir temprano si es multi-pedido
    }

    // TEMPORALMENTE DESHABILITADO: No bloquear por validación
    const validation = this.shipmentPreparation.validateOrderForShipment(this.order);
    if (!validation.valid) {
      console.warn('⚠️ Orden con advertencias (continuando de todas formas):', validation.errors);
      // NO RETORNAR - Continuar con el procesamiento
    }

    // Preparar datos del envío de forma síncrona
    this.loadingShipmentData = true;
    this.shipmentPreparation.prepareShipment(this.order).subscribe({
      next: (shipment) => {
        this.loadingShipmentData = false;

        if (this.quoteForm) {
          const formData = {
            // Origen
            originAddress: shipment.origin?.address || '',
            originCity: shipment.origin?.city || '',
            originCountry: shipment.origin?.country || 'CO',
            originPostalCode: shipment.origin?.postalCode || '',

            // Destino
            destinationAddress: shipment.destination?.address || '',
            destinationCity: shipment.destination?.city || '',
            destinationCountry: shipment.destination?.country || 'CO',
            destinationPostalCode: shipment.destination?.postalCode || '',

            // Destinatario
            recipientName: shipment.destination?.recipient?.name || '',
            recipientPhone: shipment.destination?.recipient?.phone || '',
            recipientEmail: shipment.destination?.recipient?.email || '',

            // Paquete (consolidado)
            weight: shipment.package?.weight || 1,
            length: shipment.package?.dimensions?.length || 30,
            width: shipment.package?.dimensions?.width || 20,
            height: shipment.package?.dimensions?.height || 15,
            value: shipment.package?.value || 0,
            description: shipment.package?.description || 'Productos varios',

            // Opciones
            cashOnDelivery: shipment.isCashOnDelivery || false,
            insurance: false,
            signature: false
          };

          this.quoteForm.patchValue(formData);

          // Pre-cargar datos de ciudades con búsqueda inteligente
          this.preloadCityData(shipment);

          // Forzar detección de cambios
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        this.loadingShipmentData = false;
        console.error('❌ Error al preparar datos del envío:', error);
      }
    });
  }

  /**
   * Inicializa array de quotes para múltiples pedidos
   */
  private initializePedidosQuotes(): void {
    console.log('🔄 Inicializando quotes para múltiples pedidos...');

    const pedidos = this.order.pedidos || [];
    this.loadingShipmentData = true;
    this.pedidosQuotesList = [];

    // Procesar cada pedido
    pedidos.forEach((pedido: Pedido, index: number) => {
      // Llamar al servicio de preparación para cada pedido
      this.shipmentPreparation.prepareShipment(this.order, pedido).subscribe({
        next: (shipment) => {
          console.log(`✅ Pedido ${index + 1} preparado:`, shipment);

          // Crear objeto PedidoQuoteData
          const pedidoQuoteData: PedidoQuoteData = {
            pedido: pedido,
            pedidoIndex: index,

            // Bodega (origen)
            bodegaId: pedido.bodegaId || 'sin_bodega',
            bodegaNombre: shipment.origin?.warehouse?.nombre ||
                          shipment.origin?.city ||
                          'Bodega sin nombre',
            bodegaData: {
              address: shipment.origin?.address || '',
              city: shipment.origin?.city || '',
              department: shipment.origin?.department || '',
              country: shipment.origin?.country || 'CO',
              postalCode: shipment.origin?.postalCode || ''
            },

            // Destino
            destinoData: {
              address: shipment.destination?.address || '',
              city: shipment.destination?.city || '',
              department: shipment.destination?.department || '',
              country: shipment.destination?.country || 'CO',
              postalCode: shipment.destination?.postalCode || '',
              recipient: {
                name: shipment.destination?.recipient?.name || '',
                phone: shipment.destination?.recipient?.phone || '',
                email: shipment.destination?.recipient?.email || ''
              }
            },

            // Paquete
            packageData: {
              weight: shipment.package?.weight || 1,
              dimensions: shipment.package?.dimensions || undefined,
              value: shipment.package?.value || 0,
              description: shipment.package?.description || 'Productos varios'
            },

            // Municipios (se cargarán después)
            municipioOrigen: null,
            municipioDestino: null,

            // Estado inicial
            availableRates: [],
            selectedRate: null,
            quotingStatus: 'pending',
            errorMessage: undefined
          };

          this.pedidosQuotesList.push(pedidoQuoteData);

          // Pre-cargar códigos DANE para este pedido
          this.preloadMunicipiosForPedido(index, shipment);

          // Verificar si todos los pedidos están listos
          if (this.pedidosQuotesList.length === pedidos.length) {
            this.loadingShipmentData = false;
            console.log('✅ Todos los pedidos inicializados:', this.pedidosQuotesList);

            // Cargar el primer pedido al formulario
            if (this.pedidosQuotesList.length > 0) {
              this.loadPedidoDataToForm(0);
            }

            this.toastr.success(
              `${pedidos.length} pedidos listos para cotizar`,
              'Datos cargados'
            );
          }
        },
        error: (error) => {
          console.error(`❌ Error al preparar pedido ${index + 1}:`, error);
          this.loadingShipmentData = false;
          this.toastr.error(
            `Error al preparar datos del pedido #${pedido.nroPedido || index + 1}`,
            'Error de preparación'
          );
        }
      });
    });
  }

  /**
   * Pre-carga códigos DANE para un pedido específico
   */
  private preloadMunicipiosForPedido(pedidoIndex: number, shipment: any): void {
    const pedidoData = this.pedidosQuotesList[pedidoIndex];
    if (!pedidoData) return;

    // Pre-cargar origen
    if (shipment.origin?.city) {
      const searchTerm = this.normalizeText(shipment.origin.city).substring(0, 4);
      this.daneCodesService.searchMunicipios(searchTerm).subscribe(municipios => {
        const municipiosConScore = municipios
          .map(m => ({
            municipio: m,
            score: this.fuzzySearchCity(shipment.origin.city, m.nombre)
          }))
          .filter(item => item.score > 40)
          .sort((a, b) => b.score - a.score);

        if (municipiosConScore.length > 0) {
          pedidoData.municipioOrigen = municipiosConScore[0].municipio;
          console.log(`✅ Municipio origen cargado para pedido ${pedidoIndex + 1}:`,
                      pedidoData.municipioOrigen.nombre);
        }
      });
    }

    // Pre-cargar destino
    if (shipment.destination?.city) {
      const searchTerm = this.normalizeText(shipment.destination.city).substring(0, 4);
      this.daneCodesService.searchMunicipios(searchTerm).subscribe(municipios => {
        const municipiosConScore = municipios
          .map(m => ({
            municipio: m,
            score: this.fuzzySearchCity(shipment.destination.city, m.nombre)
          }))
          .filter(item => item.score > 40)
          .sort((a, b) => b.score - a.score);

        if (municipiosConScore.length > 0) {
          pedidoData.municipioDestino = municipiosConScore[0].municipio;
          console.log(`✅ Municipio destino cargado para pedido ${pedidoIndex + 1}:`,
                      pedidoData.municipioDestino.nombre);
        }
      });
    }
  }

  loadOrderData(): void {
    if (!this.order) {
      this.toastr.warning('No hay orden disponible para cotizar', 'Sin datos');
      return;
    }

    // TEMPORALMENTE DESHABILITADO: Validación estricta
    // Solo mostrar advertencias pero permitir continuar
    const validation = this.shipmentPreparation.validateOrderForShipment(this.order);

    if (!validation.valid) {
      console.warn('⚠️ Orden con advertencias (continuando de todas formas):', validation.errors);

      // Solo mostrar como advertencia, no bloquear
      if (validation.bodegaAnalysis?.hasMultipleBodegas) {
        this.toastr.warning(
          `⚠️ Múltiples bodegas detectadas. Procesando de todas formas...`,
          'Advertencia',
          {
            enableHtml: true,
            timeOut: 5000,
            closeButton: true
          }
        );
      } else if (validation.errors && validation.errors.length > 0) {
        this.toastr.warning(
          'Advertencias en la orden:<br>' + validation.errors.join('<br>'),
          'Procesando con advertencias',
          {
            enableHtml: true,
            timeOut: 5000,
            closeButton: true
          }
        );
      }
      // NO RETORNAR - Continuar con el procesamiento
    }

    // Mostrar advertencias adicionales si las hay
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('Advertencias adicionales:', validation.warnings);
    }

    this.loadingShipmentData = true;

    // Preparar envío consolidado (sin pasar pedido específico)
    this.shipmentPreparation.prepareShipment(this.order).subscribe({
      next: (shipment) => {
        this.loadingShipmentData = false;

        // Validar que el formulario esté disponible antes de hacer patchValue
        if (!this.quoteForm) {
          console.error('❌ FormGroup no disponible para patchValue');
          return;
        }

        try {
          // Mapear datos del envío preparado al formulario con validación defensiva
          const formData = {
            // Origen
            originAddress: shipment.origin?.address || '',
            originCity: shipment.origin?.city || '',
            originCountry: shipment.origin?.country || 'CO',
            originPostalCode: shipment.origin?.postalCode || '',

            // Destino
            destinationAddress: shipment.destination?.address || '',
            destinationCity: shipment.destination?.city || '',
            destinationCountry: shipment.destination?.country || 'CO',
            destinationPostalCode: shipment.destination?.postalCode || '',

            // Destinatario
            recipientName: shipment.destination?.recipient?.name || '',
            recipientPhone: shipment.destination?.recipient?.phone || '',
            recipientEmail: shipment.destination?.recipient?.email || '',

            // Paquete (consolidado)
            weight: shipment.package?.weight || 1,
            length: shipment.package?.dimensions?.length || 30,
            width: shipment.package?.dimensions?.width || 20,
            height: shipment.package?.dimensions?.height || 15,
            value: shipment.package?.value || 0,
            description: shipment.package?.description || 'Productos varios',

            // Opciones
            cashOnDelivery: shipment.isCashOnDelivery || false,
            insurance: false,
            signature: false
          };

          this.quoteForm.patchValue(formData);

          // Pre-cargar datos de ciudades con búsqueda inteligente
          this.preloadCityData(shipment);

          // Forzar detección de cambios
          this.cdr.detectChanges();
        } catch (error) {
          console.error('❌ Error al actualizar formulario:', error);
          this.toastr.error('Error al cargar datos del envío en el formulario', 'Error interno');
        }

        // Mensaje de éxito con información adicional
        const pedidosCount = this.order.pedidos?.length || 0;
        const message = pedidosCount > 1
          ? `Datos consolidados de ${pedidosCount} pedidos cargados exitosamente`
          : 'Datos del envío cargados exitosamente';

        this.toastr.success(message, 'Información completa');
      },
      error: (error) => {
        this.loadingShipmentData = false;
        console.error('Error al preparar datos del envío:', error);

        let errorMessage = 'Error al cargar los datos del envío';
        if (error.message) {
          errorMessage += ': ' + error.message;
        }

        this.toastr.error(errorMessage, 'Error de preparación');
      }
    });
  }

  onQuoteRates(): void {
    // Validar que el formulario existe antes de usarlo
    if (!this.quoteForm) {
      console.error('❌ FormGroup no disponible en onQuoteRates');
      this.toastr.error('El formulario no está disponible. Intenta recargar la página.', 'Error interno');
      return;
    }

    if (this.quoteForm.invalid) {
      this.markFormGroupTouched(this.quoteForm);
      this.toastr.warning('Por favor completa todos los campos requeridos', 'Formulario incompleto');
      return;
    }

    const formData = this.quoteForm.value;

    // Preparar datos con códigos DANE si están disponibles
    const originData: any = {
      address: formData.originAddress || 'Dirección pendiente',
      city: formData.originCity,
      country: formData.originCountry,
      postalCode: formData.originPostalCode
    };

    const destinationData: any = {
      address: formData.destinationAddress || 'Dirección pendiente',
      city: formData.destinationCity,
      country: formData.destinationCountry,
      postalCode: formData.destinationPostalCode
    };

    // Agregar códigos DANE si hay municipios seleccionados
    if (this.municipioSeleccionadoOrigen) {
      originData.municipioCode = this.municipioSeleccionadoOrigen.codigo;
      originData.municipioName = this.municipioSeleccionadoOrigen.nombre;
      originData.placeCode = this.daneCodesService.getPlaceCode(this.municipioSeleccionadoOrigen.codigo);
    }

    if (this.municipioSeleccionadoDestino) {
      destinationData.municipioCode = this.municipioSeleccionadoDestino.codigo;
      destinationData.municipioName = this.municipioSeleccionadoDestino.nombre;
      destinationData.department = this.municipioSeleccionadoDestino.departamento;
      destinationData.placeCode = this.daneCodesService.getPlaceCode(this.municipioSeleccionadoDestino.codigo);
    }

    // Preparar paquete (dimensiones opcionales)
    const packageData: any = {
      weight: formData.weight,
      value: formData.value,
      description: formData.description
    };

    // Solo incluir dimensiones si están completas
    if (formData.length && formData.width && formData.height) {
      packageData.dimensions = {
        length: formData.length,
        width: formData.width,
        height: formData.height
      };
    }

    const quoteRequest: EnviameQuoteRequest = {
      companyId: this.companyId,
      provider: 'enviame',
      origin: originData,
      destination: destinationData,
      package: packageData,
      shippingType: formData.shippingType,
      options: {
        insuranceValue: formData.insurance ? formData.value : 0,
        cashOnDelivery: formData.cashOnDelivery,
        signature: formData.signature
      }
    };

    // Agregar distancia si el tipo de envío es Express
    if (formData.shippingType === 'express' && formData.distanceKm) {
      (quoteRequest as any).distanceKm = formData.distanceKm;
    }

    this.quotingRates = true;
    this.availableRates = [];
    this.selectedRate = null;

    // Iniciar simulación de progreso de carga
    this.simulateLoadingProgress();

    this.logisticaService.getRates(quoteRequest).subscribe({
      next: (response: EnviameRatesResponse) => {
        this.quotingRates = false;

        if (response.success && response.rates && response.rates.length > 0) {
          this.availableRates = response.rates;
          this.filteredRates = [...response.rates];
          // Ordenar y categorizar tarifas
          this.sortAndFilterRates();
          this.toastr.success(`Se encontraron ${response.rates.length} opciones de envío`, 'Cotización exitosa');
        } else {
          this.toastr.warning('No se encontraron opciones de envío disponibles', 'Sin resultados');
        }
      },
      error: (error) => {
        console.error('Error al obtener cotización:', error);
        this.quotingRates = false;
        this.toastr.error('Error al obtener las tarifas de envío. Intenta nuevamente.', 'Error de cotización');
      }
    });
  }

  onSelectRate(rate: EnviameRate): void {
    this.selectedRate = rate;
    console.log('Tarifa seleccionada:', {
      carrier: rate.carrier,
      carrierCode: rate.carrierCode,
      service: rate.service,
      serviceCode: rate.serviceCode,
      price: rate.price
    });
  }

  // ========================================
  // MÉTODOS PARA MULTI-PEDIDO
  // ========================================

  /**
   * Cotiza todos los pedidos en paralelo
   */
  cotizarTodosPedidos(): void {
    if (!this.isMultiPedidoMode || this.pedidosQuotesList.length === 0) {
      this.toastr.warning('No hay pedidos para cotizar', 'Sin pedidos');
      return;
    }

    // Guardar datos del pedido actual antes de cotizar
    this.savePedidoDataFromForm(this.currentPedidoIndex);

    console.log('📦 Cotizando todos los pedidos...');
    const cotizaciones = this.pedidosQuotesList.map((pedido, index) =>
      this.cotizarPedidoObservable(index)
    );

    forkJoin(cotizaciones).subscribe({
      next: (resultados) => {
        console.log('✅ Todas las cotizaciones completadas:', resultados);
        const exitosos = resultados.filter(r => r.success).length;
        const fallidos = resultados.length - exitosos;

        if (exitosos > 0) {
          this.toastr.success(
            `${exitosos} pedido(s) cotizado(s) exitosamente${fallidos > 0 ? `, ${fallidos} fallido(s)` : ''}`,
            'Cotizaciones completas'
          );
        } else {
          this.toastr.error('No se pudieron cotizar los pedidos', 'Error de cotización');
        }
      },
      error: (error) => {
        console.error('❌ Error al cotizar pedidos:', error);
        this.toastr.error('Error al procesar las cotizaciones', 'Error');
      }
    });
  }

  /**
   * Cotiza un pedido específico
   */
  cotizarPedido(pedidoIndex: number): void {
    if (!this.pedidosQuotesList[pedidoIndex]) {
      console.error(`❌ Pedido ${pedidoIndex} no existe`);
      return;
    }

    console.log(`📦 Cotizando pedido ${pedidoIndex + 1}...`);

    this.cotizarPedidoObservable(pedidoIndex).subscribe({
      next: (resultado) => {
        if (resultado.success) {
          this.toastr.success(
            `${resultado.ratesCount} opciones disponibles`,
            `Pedido #${resultado.pedidoNro || pedidoIndex + 1} cotizado`
          );
        } else {
          this.toastr.error(
            resultado.error || 'Error desconocido',
            `Error en pedido #${resultado.pedidoNro || pedidoIndex + 1}`
          );
        }
      },
      error: (error) => {
        console.error(`❌ Error al cotizar pedido ${pedidoIndex + 1}:`, error);
        this.toastr.error('Error al cotizar', 'Error');
      }
    });
  }

  /**
   * Observable para cotizar un pedido (usado en forkJoin)
   */
  private cotizarPedidoObservable(pedidoIndex: number): Observable<any> {
    const pedidoData = this.pedidosQuotesList[pedidoIndex];
    if (!pedidoData) {
      return of({ success: false, pedidoIndex, error: 'Pedido no encontrado' });
    }

    // Marcar como loading
    pedidoData.quotingStatus = 'loading';
    pedidoData.errorMessage = undefined;

    // Construir request de cotización
    const quoteRequest = this.buildQuoteRequestForPedido(pedidoData);

    return this.logisticaService.getRates(quoteRequest).pipe(
      map((response: EnviameRatesResponse) => {
        if (response.success && response.rates && response.rates.length > 0) {
          pedidoData.availableRates = response.rates;
          pedidoData.quotingStatus = 'success';

          console.log(`✅ Pedido ${pedidoIndex + 1}: ${response.rates.length} tarifas`);

          return {
            success: true,
            pedidoIndex,
            pedidoNro: pedidoData.pedido.nroPedido,
            ratesCount: response.rates.length
          };
        } else {
          pedidoData.quotingStatus = 'error';
          pedidoData.errorMessage = 'No se encontraron tarifas disponibles';

          return {
            success: false,
            pedidoIndex,
            pedidoNro: pedidoData.pedido.nroPedido,
            error: pedidoData.errorMessage
          };
        }
      }),
      catchError((error) => {
        console.error(`❌ Error cotizando pedido ${pedidoIndex + 1}:`, error);
        pedidoData.quotingStatus = 'error';
        pedidoData.errorMessage = error?.message || 'Error al obtener cotización';

        return of({
          success: false,
          pedidoIndex,
          pedidoNro: pedidoData.pedido.nroPedido,
          error: pedidoData.errorMessage
        });
      })
    );
  }

  /**
   * Construye el EnviameQuoteRequest para un pedido específico
   */
  private buildQuoteRequestForPedido(pedidoData: PedidoQuoteData): EnviameQuoteRequest {
    // Preparar origen con códigos DANE
    const originData: any = {
      address: pedidoData.bodegaData.address || 'Dirección pendiente',
      city: pedidoData.bodegaData.city,
      country: pedidoData.bodegaData.country,
      postalCode: pedidoData.bodegaData.postalCode
    };

    if (pedidoData.municipioOrigen) {
      originData.municipioCode = pedidoData.municipioOrigen.codigo;
      originData.municipioName = pedidoData.municipioOrigen.nombre;
      originData.placeCode = this.daneCodesService.getPlaceCode(pedidoData.municipioOrigen.codigo);
    }

    // Preparar destino con códigos DANE
    const destinationData: any = {
      address: pedidoData.destinoData.address || 'Dirección pendiente',
      city: pedidoData.destinoData.city,
      country: pedidoData.destinoData.country,
      postalCode: pedidoData.destinoData.postalCode
    };

    if (pedidoData.municipioDestino) {
      destinationData.municipioCode = pedidoData.municipioDestino.codigo;
      destinationData.municipioName = pedidoData.municipioDestino.nombre;
      destinationData.department = pedidoData.municipioDestino.departamento;
      destinationData.placeCode = this.daneCodesService.getPlaceCode(pedidoData.municipioDestino.codigo);
    }

    // Preparar paquete
    const packageData: any = {
      weight: pedidoData.packageData.weight,
      value: pedidoData.packageData.value,
      description: pedidoData.packageData.description
    };

    // Agregar dimensiones si existen
    if (pedidoData.packageData.dimensions) {
      packageData.dimensions = pedidoData.packageData.dimensions;
    }

    // Construir request
    const quoteRequest: EnviameQuoteRequest = {
      companyId: this.companyId,
      provider: 'enviame',
      origin: originData,
      destination: destinationData,
      package: packageData,
      shippingType: this.quoteForm?.get('shippingType')?.value || 'estandar',
      options: {
        insuranceValue: this.quoteForm?.get('insurance')?.value ? packageData.value : 0,
        cashOnDelivery: this.quoteForm?.get('cashOnDelivery')?.value || false,
        signature: this.quoteForm?.get('signature')?.value || false
      }
    };

    // Agregar distancia si es Express
    const distanceKm = this.quoteForm?.get('distanceKm')?.value;
    if (quoteRequest.shippingType === 'express' && distanceKm) {
      (quoteRequest as any).distanceKm = distanceKm;
    }

    return quoteRequest;
  }

  /**
   * Selecciona una tarifa para un pedido específico
   */
  onSelectRateForPedido(pedidoIndex: number, rate: EnviameRate): void {
    if (this.pedidosQuotesList[pedidoIndex]) {
      this.pedidosQuotesList[pedidoIndex].selectedRate = rate;
      console.log(`✅ Tarifa seleccionada para pedido ${pedidoIndex + 1}:`, rate.service);
    }
  }

  /**
   * Obtiene el tab header para un pedido
   */
  getPedidoTabHeader(pedidoData: PedidoQuoteData): string {
    const nroPedido = pedidoData.pedido.nroPedido || `#${pedidoData.pedidoIndex + 1}`;
    return `Pedido ${nroPedido}`;
  }

  /**
   * Verifica si todos los pedidos tienen tarifa seleccionada
   */
  allPedidosHaveSelectedRate(): boolean {
    return this.pedidosQuotesList.length > 0 &&
           this.pedidosQuotesList.every(p => p.selectedRate !== null);
  }

  /**
   * Cuenta cuántos pedidos tienen tarifas cotizadas
   */
  getQuotedPedidosCount(): number {
    return this.pedidosQuotesList.filter(p => p.quotingStatus === 'success').length;
  }

  /**
   * Guarda los datos actuales del formulario en el pedido correspondiente
   */
  savePedidoDataFromForm(pedidoIndex: number): void {
    if (!this.pedidosQuotesList[pedidoIndex] || !this.quoteForm) {
      return;
    }

    const pedidoData = this.pedidosQuotesList[pedidoIndex];
    const formData = this.quoteForm.value;

    // Actualizar datos de bodega (origen)
    pedidoData.bodegaData = {
      address: formData.originAddress || pedidoData.bodegaData.address,
      city: formData.originCity || pedidoData.bodegaData.city,
      department: pedidoData.bodegaData.department,
      country: formData.originCountry || pedidoData.bodegaData.country,
      postalCode: formData.originPostalCode || pedidoData.bodegaData.postalCode
    };

    // Actualizar municipio origen si cambió
    if (this.municipioSeleccionadoOrigen) {
      pedidoData.municipioOrigen = this.municipioSeleccionadoOrigen;
    }

    // Actualizar datos de destino
    pedidoData.destinoData = {
      address: formData.destinationAddress || pedidoData.destinoData.address,
      city: formData.destinationCity || pedidoData.destinoData.city,
      department: pedidoData.destinoData.department,
      country: formData.destinationCountry || pedidoData.destinoData.country,
      postalCode: formData.destinationPostalCode || pedidoData.destinoData.postalCode,
      recipient: {
        name: formData.recipientName || pedidoData.destinoData.recipient.name,
        phone: formData.recipientPhone || pedidoData.destinoData.recipient.phone,
        email: formData.recipientEmail || pedidoData.destinoData.recipient.email
      }
    };

    // Actualizar municipio destino si cambió
    if (this.municipioSeleccionadoDestino) {
      pedidoData.municipioDestino = this.municipioSeleccionadoDestino;
    }

    // Actualizar datos del paquete
    pedidoData.packageData = {
      weight: formData.weight || pedidoData.packageData.weight,
      dimensions: (formData.length && formData.width && formData.height) ? {
        length: formData.length,
        width: formData.width,
        height: formData.height
      } : pedidoData.packageData.dimensions,
      value: formData.value || pedidoData.packageData.value,
      description: formData.description || pedidoData.packageData.description
    };

    console.log(`💾 Datos guardados para pedido ${pedidoIndex + 1}`);
  }

  /**
   * Carga los datos de un pedido al formulario
   */
  loadPedidoDataToForm(pedidoIndex: number): void {
    if (!this.pedidosQuotesList[pedidoIndex] || !this.quoteForm) {
      console.warn(`⚠️ No se puede cargar pedido ${pedidoIndex}: datos no disponibles`);
      return;
    }

    const pedidoData = this.pedidosQuotesList[pedidoIndex];

    console.log(`📥 Cargando datos del pedido ${pedidoIndex + 1} al formulario:`, {
      bodega: pedidoData.bodegaNombre,
      ciudad: pedidoData.bodegaData.city,
      destino: pedidoData.destinoData.city,
      destinatario: pedidoData.destinoData.recipient.name
    });

    // Actualizar referencias de municipios primero
    if (pedidoData.municipioOrigen) {
      this.municipioSeleccionadoOrigen = pedidoData.municipioOrigen;
    }
    if (pedidoData.municipioDestino) {
      this.municipioSeleccionadoDestino = pedidoData.municipioDestino;
    }

    // Construir objeto de valores consolidado
    const formValues: any = {
      // Origen
      originAddress: pedidoData.bodegaData.address || '',
      originCity: pedidoData.bodegaData.city || '',
      originCountry: pedidoData.bodegaData.country || 'CO',
      originPostalCode: pedidoData.bodegaData.postalCode || '',

      // Destino
      destinationAddress: pedidoData.destinoData.address || '',
      destinationCity: pedidoData.destinoData.city || '',
      destinationCountry: pedidoData.destinoData.country || 'CO',
      destinationPostalCode: pedidoData.destinoData.postalCode || '',

      // Destinatario
      recipientName: pedidoData.destinoData.recipient.name || '',
      recipientPhone: pedidoData.destinoData.recipient.phone || '',
      recipientEmail: pedidoData.destinoData.recipient.email || '',

      // Paquete
      weight: pedidoData.packageData.weight || 1,
      value: pedidoData.packageData.value || 0,
      description: pedidoData.packageData.description || ''
    };

    // Añadir municipio origen si existe
    if (pedidoData.municipioOrigen) {
      formValues.originMunicipio = {
        nombre: pedidoData.municipioOrigen.nombre,
        departamento: pedidoData.municipioOrigen.departamento,
        codigo: pedidoData.municipioOrigen.codigo,
        label: `${pedidoData.municipioOrigen.nombre}, ${pedidoData.municipioOrigen.departamento}`
      };
    }

    // Añadir municipio destino si existe
    if (pedidoData.municipioDestino) {
      formValues.destinationMunicipio = {
        nombre: pedidoData.municipioDestino.nombre,
        departamento: pedidoData.municipioDestino.departamento,
        codigo: pedidoData.municipioDestino.codigo,
        label: `${pedidoData.municipioDestino.nombre}, ${pedidoData.municipioDestino.departamento}`
      };
    }

    // Añadir dimensiones si existen
    if (pedidoData.packageData.dimensions) {
      formValues.length = pedidoData.packageData.dimensions.length || 30;
      formValues.width = pedidoData.packageData.dimensions.width || 20;
      formValues.height = pedidoData.packageData.dimensions.height || 15;
    }

    // Actualizar índice actual
    this.currentPedidoIndex = pedidoIndex;

    // RESETEAR el formulario primero para forzar la actualización
    this.quoteForm.reset(formValues, { emitEvent: false });

    // Luego hacer un patchValue para asegurar que todos los valores se actualicen
    setTimeout(() => {
      this.quoteForm.patchValue(formValues, { emitEvent: false });

      // Forzar detección de cambios múltiples veces
      this.cdr.detectChanges();
      this.cdr.markForCheck();

      console.log(`✅ Formulario actualizado - Pedido ${pedidoIndex + 1}:`, {
        destinatario: this.quoteForm.get('recipientName')?.value,
        ciudad: this.quoteForm.get('destinationCity')?.value
      });
    }, 100);
  }

  /**
   * Selecciona un pedido para editar (reemplaza los tabs)
   */
  selectPedido(newIndex: number): void {
    console.log(`🔄 Seleccionando pedido: ${this.currentPedidoIndex} → ${newIndex}`);

    // Si es el mismo índice, no hacer nada
    if (this.currentPedidoIndex === newIndex) {
      console.log(`⏭️  Ya está seleccionado el pedido ${newIndex + 1}`);
      return;
    }

    const pedidoData = this.pedidosQuotesList[newIndex];
    console.log(`📦 Pedido seleccionado:`, {
      nroPedido: pedidoData.pedido.nroPedido,
      bodega: pedidoData.bodegaNombre,
      destinatario: pedidoData.destinoData.recipient.name
    });

    // Guardar datos del pedido actual antes de cambiar
    this.savePedidoDataFromForm(this.currentPedidoIndex);

    // Actualizar el índice actual
    this.currentPedidoIndex = newIndex;

    // Cargar datos del nuevo pedido inmediatamente
    this.loadPedidoDataToForm(newIndex);

    // Scroll suave al formulario
    setTimeout(() => {
      const formElement = document.querySelector('.locations-grid-2col, .package-form-enhanced');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 200);

    console.log(`✅ Pedido ${newIndex + 1} cargado correctamente`);
  }

  onConfirmShipment(): void {
    if (!this.selectedRate) {
      this.toastr.warning('Selecciona una opción de envío para continuar', 'Opción requerida');
      return;
    }

    const formData = this.quoteForm.value;

    const shipmentPayload = {
      companyId: this.companyId,
      provider: 'enviame',
      order: {
        nroShippingOrder: this.order.nroShippingOrder,
        fecha: this.order.fecha,
        pedidos: this.order.pedidos
      },
      selectedService: {
        service: this.selectedRate.service,
        serviceCode: this.selectedRate.serviceCode,
        carrier: this.selectedRate.carrier,
        carrierCode: this.selectedRate.carrierCode,
        price: this.selectedRate.price,
        basePrice: this.selectedRate.basePrice,
        taxes: this.selectedRate.taxes
      },
      origin: {
        address: formData.originAddress,
        city: formData.originCity,
        country: formData.originCountry,
        postalCode: formData.originPostalCode
      },
      destination: {
        address: formData.destinationAddress,
        city: formData.destinationCity,
        department: this.municipioSeleccionadoDestino?.departamento || '',
        country: formData.destinationCountry,
        postalCode: formData.destinationPostalCode,
        recipient: {
          name: formData.recipientName,
          phone: formData.recipientPhone,
          email: formData.recipientEmail
        }
      },
      package: {
        weight: formData.weight,
        dimensions: {
          length: formData.length,
          width: formData.width,
          height: formData.height
        },
        value: formData.value,
        description: formData.description
      },
      options: {
        insuranceValue: formData.insurance ? formData.value : 0,
        cashOnDelivery: formData.cashOnDelivery,
        signature: formData.signature,
        normalizeResponse: false
      }
    };

    this.creatingShipment = true;

    this.logisticaService.createShipment(shipmentPayload).subscribe({
      next: (response) => {
        this.creatingShipment = false;
        this.toastr.success('Envío creado exitosamente con Enviame.io', 'Envío creado');

        // Cerrar modal con resultado exitoso
        this.dialogRef.close({
          confirmed: true,
          selectedService: this.selectedRate,
          shipmentData: response
        });
      },
      error: (error) => {
        console.error('Error al crear envío:', error);
        this.creatingShipment = false;
        this.toastr.error('Error al crear el envío. Verifica los datos e intenta nuevamente.', 'Error al crear envío');
      }
    });
  }

  /**
   * Confirma y crea múltiples envíos (uno por pedido)
   */
  onConfirmMultipleShipments(): void {
    // Verificar que todos tengan tarifa seleccionada
    if (!this.allPedidosHaveSelectedRate()) {
      this.toastr.warning('Todos los pedidos deben tener una tarifa seleccionada', 'Selección incompleta');
      return;
    }

    // Guardar datos del pedido actual antes de confirmar
    this.savePedidoDataFromForm(this.currentPedidoIndex);

    console.log('📦 Creando múltiples envíos...');

    this.creatingShipment = true;

    // Crear array de observables para crear cada envío
    const shipmentCreations = this.pedidosQuotesList.map((pedidoData, index) => {
      const shipmentPayload = {
        companyId: this.companyId,
        provider: 'enviame',
        order: {
          nroShippingOrder: this.order.nroShippingOrder,
          fecha: this.order.fecha,
          pedidos: [pedidoData.pedido] // Solo este pedido
        },
        selectedService: {
          service: pedidoData.selectedRate!.service,
          serviceCode: pedidoData.selectedRate!.serviceCode,
          carrier: pedidoData.selectedRate!.carrier,
          carrierCode: pedidoData.selectedRate!.carrierCode,
          price: pedidoData.selectedRate!.price,
          basePrice: pedidoData.selectedRate!.basePrice,
          taxes: pedidoData.selectedRate!.taxes
        },
        origin: {
          address: pedidoData.bodegaData.address,
          city: pedidoData.bodegaData.city,
          country: pedidoData.bodegaData.country,
          postalCode: pedidoData.bodegaData.postalCode
        },
        destination: {
          address: pedidoData.destinoData.address,
          city: pedidoData.destinoData.city,
          country: pedidoData.destinoData.country,
          postalCode: pedidoData.destinoData.postalCode,
          recipient: {
            name: pedidoData.destinoData.recipient.name,
            phone: pedidoData.destinoData.recipient.phone,
            email: pedidoData.destinoData.recipient.email
          }
        },
        package: {
          weight: pedidoData.packageData.weight,
          dimensions: pedidoData.packageData.dimensions,
          value: pedidoData.packageData.value,
          description: pedidoData.packageData.description
        },
        options: {
          insuranceValue: this.quoteForm?.get('insurance')?.value ? pedidoData.packageData.value : 0,
          cashOnDelivery: this.quoteForm?.get('cashOnDelivery')?.value || false,
          signature: this.quoteForm?.get('signature')?.value || false,
          normalizeResponse: false
        }
      };

      return this.logisticaService.createShipment(shipmentPayload).pipe(
        map((response) => ({
          success: true,
          pedidoIndex: index,
          pedidoNro: pedidoData.pedido.nroPedido,
          response
        })),
        catchError((error) => {
          console.error(`❌ Error creando envío para pedido ${index + 1}:`, error);
          return of({
            success: false,
            pedidoIndex: index,
            pedidoNro: pedidoData.pedido.nroPedido,
            error: error?.message || 'Error desconocido'
          });
        })
      );
    });

    // Ejecutar todas las creaciones en paralelo
    forkJoin(shipmentCreations).subscribe({
      next: (resultados) => {
        this.creatingShipment = false;

        const exitosos = resultados.filter(r => r.success).length;
        const fallidos = resultados.length - exitosos;

        console.log('✅ Creación de envíos completada:', {
          exitosos,
          fallidos,
          total: resultados.length
        });

        if (exitosos === resultados.length) {
          // Todos exitosos
          this.toastr.success(
            `${exitosos} envío(s) creado(s) exitosamente`,
            'Envíos creados'
          );

          // Cerrar modal con resultado exitoso
          this.dialogRef.close({
            confirmed: true,
            multiShipment: true,
            shipmentsData: resultados.filter(r => r.success)
          });
        } else if (exitosos > 0) {
          // Algunos exitosos, algunos fallidos
          this.toastr.warning(
            `${exitosos} envío(s) creado(s), ${fallidos} fallido(s)`,
            'Creación parcial'
          );

          // Cerrar modal con resultado parcial
          this.dialogRef.close({
            confirmed: true,
            multiShipment: true,
            partial: true,
            shipmentsData: resultados
          });
        } else {
          // Todos fallaron
          this.toastr.error(
            'No se pudo crear ningún envío. Verifica los datos e intenta nuevamente.',
            'Error al crear envíos'
          );
        }
      },
      error: (error) => {
        this.creatingShipment = false;
        console.error('❌ Error general al crear envíos:', error);
        this.toastr.error('Error al procesar los envíos', 'Error');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  // Utility methods
  markFormGroupTouched(formGroup: FormGroup): void {
    if (!formGroup) {
      console.warn('❌ FormGroup no disponible para marcar como touched');
      return;
    }

    try {
      Object.keys(formGroup.controls).forEach(key => {
        const control = formGroup.get(key);
        if (control) {
          control.markAsTouched();

          if (control instanceof FormGroup) {
            this.markFormGroupTouched(control);
          }
        } else {
          console.warn(`❌ Control '${key}' es null en markFormGroupTouched`);
        }
      });
    } catch (error) {
      console.error('❌ Error en markFormGroupTouched:', error);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    if (!this.quoteForm) {
      console.warn(`❌ FormGroup no disponible para validar campo: ${fieldName}`);
      return false;
    }

    const field = this.quoteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    if (!this.quoteForm) {
      console.warn(`❌ FormGroup no disponible para obtener error del campo: ${fieldName}`);
      return '';
    }

    const field = this.quoteForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${fieldName} es obligatorio`;
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
    }
    return '';
  }

  getCheapestRate(): EnviameRate | null {
    return this.enviameHelper.getCheapestRate(this.availableRates);
  }

  getFastestRate(): EnviameRate | null {
    return this.enviameHelper.getFastestRate(this.availableRates);
  }

  formatPrice = (price: number, currency?: string) => this.enviameHelper.formatPrice(price, currency);

  /**
   * Buscar municipios para origen con tolerancia a tildes
   */
  buscarMunicipiosOrigen(event: any): void {
    const query = this.normalizeText(event.query);
    this.searchingMunicipiosOrigen = true;

    // Buscar con al menos 2 caracteres
    if (query.length < 2) {
      this.municipiosSugeridosOrigen = [];
      this.searchingMunicipiosOrigen = false;
      return;
    }

    // Verificar caché primero
    const cacheKey = `origen_${query}`;
    if (this.searchCache.has(cacheKey)) {
      this.municipiosSugeridosOrigen = this.searchCache.get(cacheKey) || [];
      this.searchingMunicipiosOrigen = false;
      return;
    }

    this.daneCodesService.searchMunicipios(query).subscribe(municipios => {
      // Calcular score para cada municipio
      let sugeridos = municipios.map(m => ({
        label: this.daneCodesService.formatMunicipioLabel(m),
        value: m,
        score: this.fuzzySearchCity(event.query, m.nombre),
        ...m
      }))
      .filter(item => item.score > 15) // Filtrar resultados irrelevantes
      .sort((a, b) => {
        // Priorizar la ciudad original si está en los resultados
        if (this.originalOriginCity) {
          const scoreA = this.compareTexts(a.nombre, this.originalOriginCity) ? 1000 : a.score;
          const scoreB = this.compareTexts(b.nombre, this.originalOriginCity) ? 1000 : b.score;
          return scoreB - scoreA;
        }
        return b.score - a.score;
      })
      .slice(0, 25); // Limitar a 25 resultados

      this.municipiosSugeridosOrigen = sugeridos;
      this.searchCache.set(cacheKey, sugeridos); // Guardar en caché
      this.searchingMunicipiosOrigen = false;
    });
  }

  /**
   * Buscar municipios para destino con tolerancia a tildes
   */
  buscarMunicipiosDestino(event: any): void {
    const query = this.normalizeText(event.query);
    this.searchingMunicipiosDestino = true;

    // Buscar con al menos 2 caracteres
    if (query.length < 2) {
      this.municipiosSugeridosDestino = [];
      this.searchingMunicipiosDestino = false;
      return;
    }

    // Verificar caché primero
    const cacheKey = `destino_${query}`;
    if (this.searchCache.has(cacheKey)) {
      this.municipiosSugeridosDestino = this.searchCache.get(cacheKey) || [];
      this.searchingMunicipiosDestino = false;
      return;
    }

    this.daneCodesService.searchMunicipios(query).subscribe(municipios => {
      // Calcular score para cada municipio
      let sugeridos = municipios.map(m => ({
        label: this.daneCodesService.formatMunicipioLabel(m),
        value: m,
        score: this.fuzzySearchCity(event.query, m.nombre),
        ...m
      }))
      .filter(item => item.score > 15) // Filtrar resultados irrelevantes
      .sort((a, b) => {
        // Priorizar la ciudad original si está en los resultados
        if (this.originalDestinationCity) {
          const scoreA = this.compareTexts(a.nombre, this.originalDestinationCity) ? 1000 : a.score;
          const scoreB = this.compareTexts(b.nombre, this.originalDestinationCity) ? 1000 : b.score;
          return scoreB - scoreA;
        }
        return b.score - a.score;
      })
      .slice(0, 25); // Limitar a 25 resultados

      this.municipiosSugeridosDestino = sugeridos;
      this.searchCache.set(cacheKey, sugeridos); // Guardar en caché
      this.searchingMunicipiosDestino = false;
    });
  }

  /**
   * Al seleccionar municipio de origen
   */
  onSelectMunicipioOrigen(municipio: any): void {
    if (municipio && municipio.value) {
      this.municipioSeleccionadoOrigen = municipio.value;
      const mun = municipio.value as MunicipioDane;

      // Actualizar ciudad y código postal
      this.quoteForm.patchValue({
        originCity: mun.nombre,
        originPostalCode: mun.codigo.substring(0, 5)
      });

      // Guardar como frecuente
      this.daneCodesService.addMunicipioFrecuente(mun);
    }
  }

  /**
   * Al seleccionar municipio de destino
   */
  onSelectMunicipioDestino(municipio: any): void {
    if (municipio && municipio.value) {
      this.municipioSeleccionadoDestino = municipio.value;
      const mun = municipio.value as MunicipioDane;

      // Actualizar ciudad y código postal
      this.quoteForm.patchValue({
        destinationCity: mun.nombre,
        destinationPostalCode: mun.codigo.substring(0, 5)
      });

      // Guardar como frecuente
      this.daneCodesService.addMunicipioFrecuente(mun);
    }
  }

  // ========= NUEVOS MÉTODOS PARA MEJORAS UX =========

  /**
   * Configurar validación de formulario en tiempo real
   */
  private setupFormValidation(): void {
    if (this.quoteForm) {
      this.quoteForm.valueChanges.pipe(
        debounceTime(300)
      ).subscribe(() => {
        this.validateTabs();
        this.updateStepStates(); // Actualizar estados del accordion automáticamente
      });
    }
  }

  /**
   * Validar pestañas y actualizar estado
   */
  validateTabs(): void {
    // Validar pestaña de Ubicaciones
    const locationFields = ['originMunicipio', 'originCity', 'originCountry',
                           'destinationMunicipio', 'destinationCity', 'destinationCountry',
                           'recipientName'];

    const locationErrors: string[] = [];
    locationFields.forEach(field => {
      const control = this.quoteForm.get(field);
      if (control && control.invalid) {
        locationErrors.push(this.getFieldLabel(field));
      }
    });

    this.tabsValidation.locations = {
      valid: locationErrors.length === 0,
      errors: locationErrors
    };

    // Validar pestaña de Paquete
    const packageFields = ['weight', 'value'];
    const packageErrors: string[] = [];

    packageFields.forEach(field => {
      const control = this.quoteForm.get(field);
      if (control && control.invalid) {
        packageErrors.push(this.getFieldLabel(field));
      }
    });

    this.tabsValidation.package = {
      valid: packageErrors.length === 0,
      errors: packageErrors
    };
  }

  /**
   * Obtener etiqueta amigable para el campo
   */
  private getFieldLabel(field: string): string {
    const labels: {[key: string]: string} = {
      originMunicipio: 'Municipio de origen',
      originCity: 'Ciudad de origen',
      originCountry: 'País de origen',
      destinationMunicipio: 'Municipio de destino',
      destinationCity: 'Ciudad de destino',
      destinationCountry: 'País de destino',
      recipientName: 'Nombre del destinatario',
      recipientPhone: 'Teléfono del destinatario',
      recipientEmail: 'Email del destinatario',
      weight: 'Peso del paquete',
      value: 'Valor declarado'
    };
    return labels[field] || field;
  }

  /**
   * Verificar si la pestaña de ubicaciones está completa
   */
  isLocationTabComplete(): boolean {
    return this.tabsValidation.locations.valid;
  }

  /**
   * Verificar si la pestaña de paquete está completa
   */
  isPackageTabComplete(): boolean {
    return this.tabsValidation.package.valid;
  }

  /**
   * Obtener clase CSS para validación de pestaña
   */
  getTabValidationClass(tab: string): string {
    if (tab === 'locations') {
      return this.tabsValidation.locations.valid ? 'tab-valid' :
             this.tabsValidation.locations.errors.length > 0 ? 'tab-invalid' : '';
    } else if (tab === 'package') {
      return this.tabsValidation.package.valid ? 'tab-valid' :
             this.tabsValidation.package.errors.length > 0 ? 'tab-invalid' : '';
    }
    return '';
  }

  /**
   * Verificar si el formulario es válido para cotizar
   */
  isFormValidForQuote(): boolean {
    return this.tabsValidation.locations.valid && this.tabsValidation.package.valid;
  }

  /**
   * Obtener resumen de origen
   */
  getOriginSummary(): string {
    const formData = this.quoteForm.value;
    const parts = [];
    if (formData.originCity) parts.push(formData.originCity);
    if (formData.originAddress) parts.push(formData.originAddress);
    return parts.join(', ') || 'No especificado';
  }

  /**
   * Obtener resumen de destino
   */
  getDestinationSummary(): string {
    const formData = this.quoteForm.value;
    const parts = [];
    if (formData.destinationCity) parts.push(formData.destinationCity);
    if (formData.destinationAddress) parts.push(formData.destinationAddress);
    if (formData.recipientName) parts.push(`(${formData.recipientName})`);
    return parts.join(' ') || 'No especificado';
  }

  /**
   * Obtener resumen de dimensiones
   */
  getDimensionsSummary(): string {
    const formData = this.quoteForm.value;
    if (formData.length && formData.width && formData.height) {
      return `${formData.length} x ${formData.width} x ${formData.height} cm`;
    }
    return 'No especificadas';
  }

  /**
   * Manejar cambio de pestaña con validación
   */
  onTabChange(event: any): void {
    // Si está intentando ir a la pestaña de paquete (index 1)
    if (event.index === 1) {
      // Validar primero la pestaña de ubicaciones
      this.validateTabs();

      // Si la pestaña de ubicaciones no está completa, no permitir el cambio
      if (!this.tabsValidation.locations.valid) {
        // Mostrar mensaje de error
        this.toastr.warning(
          'Por favor complete los campos requeridos en Ubicaciones antes de continuar',
          'Información incompleta',
          { timeOut: 3000 }
        );

        // Forzar a quedarse en la pestaña actual
        setTimeout(() => {
          this.activeTabIndex = 0;
          this.cdr.detectChanges();
        }, 50);
        return;
      }
    }

    this.activeTabIndex = event.index;
    this.validateTabs();
  }

  /**
   * Verificar si puede navegar a la pestaña de paquete
   */
  canNavigateToPackage(): boolean {
    return this.tabsValidation.locations.valid;
  }

  /**
   * Ordenar y filtrar tarifas
   */
  sortAndFilterRates(): void {
    let rates = [...this.availableRates];

    // Filtrar por transportadora
    if (this.filterCarrier) {
      rates = rates.filter(r =>
        r.carrier?.toLowerCase().includes(this.filterCarrier.toLowerCase()) ||
        r.service?.toLowerCase().includes(this.filterCarrier.toLowerCase())
      );
    }

    // Ordenar según criterio seleccionado
    switch(this.selectedSort) {
      case 'price_asc':
        rates.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        rates.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'time_asc':
        rates.sort((a, b) => this.getEstimatedDays(a) - this.getEstimatedDays(b));
        break;
      case 'time_desc':
        rates.sort((a, b) => this.getEstimatedDays(b) - this.getEstimatedDays(a));
        break;
      case 'carrier_asc':
        rates.sort((a, b) => (a.carrier || '').localeCompare(b.carrier || ''));
        break;
      case 'carrier_desc':
        rates.sort((a, b) => (b.carrier || '').localeCompare(a.carrier || ''));
        break;
    }

    this.filteredRates = rates;

    // Separar recomendadas y otras
    this.categorizeRates();
  }

  /**
   * Categorizar tarifas en recomendadas y otras
   */
  private categorizeRates(): void {
    const cheapest = this.getCheapestRate();
    const fastest = this.getFastestRate();

    this.recommendedRates = this.filteredRates.filter(rate =>
      rate === cheapest || rate === fastest ||
      (rate.serviceTypes && rate.serviceTypes.includes('express'))
    );

    this.otherRates = this.filteredRates.filter(rate =>
      !this.recommendedRates.includes(rate)
    );
  }

  /**
   * Obtener días estimados de una tarifa
   */
  private getEstimatedDays(rate: EnviameRate): number {
    if (rate.estimatedDays) {
      const match = rate.estimatedDays.match(/\d+/);
      return match ? parseInt(match[0]) : 999;
    }
    if (rate.estimatedTime) {
      const match = rate.estimatedTime.match(/\d+/);
      return match ? parseInt(match[0]) : 999;
    }
    return 999;
  }

  /**
   * Manejar cambio de filtro de transportadora
   */
  onCarrierFilterChange(): void {
    this.sortAndFilterRates();
  }

  /**
   * Manejar cambio de ordenamiento
   */
  onSortChange(): void {
    this.sortAndFilterRates();
  }

  /**
   * Alternar mostrar solo recomendadas
   */
  toggleRecommendedOnly(): void {
    this.showOnlyRecommended = !this.showOnlyRecommended;
    if (this.showOnlyRecommended) {
      this.filteredRates = this.recommendedRates;
    } else {
      this.sortAndFilterRates();
    }
  }

  /**
   * Obtener tarifas para mostrar
   */
  getRatesToDisplay(): EnviameRate[] {
    return this.showOnlyRecommended ? this.recommendedRates : this.filteredRates;
  }

  /**
   * Verificar si una tarifa es recomendada
   */
  isRecommended(rate: EnviameRate): boolean {
    return this.recommendedRates.includes(rate);
  }

  /**
   * Simular progreso de carga
   */
  private simulateLoadingProgress(): void {
    this.loadingStep = 0;
    const interval = setInterval(() => {
      this.loadingStep++;
      if (this.loadingStep >= this.loadingMessages.length || !this.quotingRates) {
        clearInterval(interval);
      }
    }, 800);
  }

  /**
   * Obtener mensaje de carga actual
   */
  getCurrentLoadingMessage(): string {
    return this.loadingMessages[Math.min(this.loadingStep, this.loadingMessages.length - 1)];
  }

  /**
   * Calcular porcentaje de progreso para la barra móvil
   */
  getProgressPercentage(): number {
    if (this.selectedRate) return 100;
    if (this.availableRates.length > 0) return 75;
    if (this.isPackageTabComplete()) return 50;
    if (this.isLocationTabComplete()) return 25;
    return 10;
  }

  /**
   * UI Enhancement Methods
   */
  toggleDimensionsSection(): void {
    this.dimensionsCollapsed = !this.dimensionsCollapsed;
  }

  calculateVolume(): number {
    const length = this.quoteForm?.get('length')?.value || 0;
    const width = this.quoteForm?.get('width')?.value || 0;
    const height = this.quoteForm?.get('height')?.value || 0;
    return length * width * height;
  }

  calculateVolumetricWeight(): number {
    const volume = this.calculateVolume();
    // Standard formula: volume (cm³) / 5000 for air shipping
    return Math.round((volume / 5000) * 10) / 10;
  }

  setDescription(text: string): void {
    this.quoteForm?.get('description')?.setValue(text);
  }

  /**
   * Pre-cargar datos de ciudades con búsqueda inteligente
   */
  private preloadCityData(shipment: any): void {
    // Pre-seleccionar municipio de ORIGEN basado en la bodega
    if (shipment.origin?.city) {
      const searchTerm = this.normalizeText(shipment.origin.city).substring(0, 4);

      this.daneCodesService.searchMunicipios(searchTerm).subscribe(municipios => {
        // Ordenar por mejor coincidencia
        const municipiosConScore = municipios.map(m => ({
          municipio: m,
          score: this.fuzzySearchCity(shipment.origin.city, m.nombre)
        }))
        .filter(item => item.score > 40) // Solo mostrar coincidencias relevantes
        .sort((a, b) => b.score - a.score);

        if (municipiosConScore.length > 0) {
          const bestMatch = municipiosConScore[0].municipio;
          this.municipioSeleccionadoOrigen = bestMatch;

          // Actualizar el formulario
          this.quoteForm.patchValue({
            originMunicipio: {
              label: this.daneCodesService.formatMunicipioLabel(bestMatch),
              value: bestMatch,
              ...bestMatch
            },
            originCity: bestMatch.nombre // Usar el nombre correcto con tildes
          });

          // Marcar como auto-llenado
          this.isAutoFilledOrigin = true;
          this.originalOriginCity = shipment.origin.city;

          // Agregar las primeras sugerencias
          this.municipiosSugeridosOrigen = municipiosConScore.slice(0, 5).map(item => ({
            label: this.daneCodesService.formatMunicipioLabel(item.municipio),
            value: item.municipio,
            ...item.municipio
          }));

          console.log(`✅ Ciudad origen pre-cargada: "${shipment.origin.city}" → "${bestMatch.nombre}"`);
        } else {
          console.warn(`⚠️ No se encontró municipio para origen: "${shipment.origin.city}"`);
        }
      });
    }

    // Pre-seleccionar municipio de DESTINO basado en la orden
    if (shipment.destination?.city) {
      const searchTerm = this.normalizeText(shipment.destination.city).substring(0, 4);

      this.daneCodesService.searchMunicipios(searchTerm).subscribe(municipios => {
        // Ordenar por mejor coincidencia
        const municipiosConScore = municipios.map(m => ({
          municipio: m,
          score: this.fuzzySearchCity(shipment.destination.city, m.nombre)
        }))
        .filter(item => item.score > 40)
        .sort((a, b) => b.score - a.score);

        if (municipiosConScore.length > 0) {
          const bestMatch = municipiosConScore[0].municipio;
          this.municipioSeleccionadoDestino = bestMatch;

          // Actualizar el formulario
          this.quoteForm.patchValue({
            destinationMunicipio: {
              label: this.daneCodesService.formatMunicipioLabel(bestMatch),
              value: bestMatch,
              ...bestMatch
            },
            destinationCity: bestMatch.nombre // Usar el nombre correcto con tildes
          });

          // Marcar como auto-llenado
          this.isAutoFilledDestination = true;
          this.originalDestinationCity = shipment.destination.city;

          // Agregar las primeras sugerencias
          this.municipiosSugeridosDestino = municipiosConScore.slice(0, 5).map(item => ({
            label: this.daneCodesService.formatMunicipioLabel(item.municipio),
            value: item.municipio,
            ...item.municipio
          }));

          console.log(`✅ Ciudad destino pre-cargada: "${shipment.destination.city}" → "${bestMatch.nombre}"`);
        } else {
          console.warn(`⚠️ No se encontró municipio para destino: "${shipment.destination.city}"`);
        }
      });
    }
  }

  /**
   * Normaliza texto para comparación (elimina tildes y convierte a minúsculas)
   */
  private normalizeText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
      .trim();
  }

  /**
   * Compara textos ignorando tildes y mayúsculas
   */
  private compareTexts(text1: string, text2: string): boolean {
    return this.normalizeText(text1) === this.normalizeText(text2);
  }

  /**
   * Búsqueda fuzzy para ciudades (tolerante a errores)
   */
  private fuzzySearchCity(searchTerm: string, cityName: string): number {
    const normalized1 = this.normalizeText(searchTerm);
    const normalized2 = this.normalizeText(cityName);

    // Coincidencia exacta
    if (normalized1 === normalized2) return 100;

    // Coincidencia al inicio
    if (normalized2.startsWith(normalized1)) return 90;
    if (normalized1.startsWith(normalized2)) return 85;

    // Contiene el término
    if (normalized2.includes(normalized1)) return 70;
    if (normalized1.includes(normalized2)) return 65;

    // Coincidencia de las primeras 3 letras
    if (normalized1.length >= 3 && normalized2.length >= 3) {
      if (normalized1.substring(0, 3) === normalized2.substring(0, 3)) return 50;
    }

    return 0;
  }

  /**
   * Maneja específicamente el error de múltiples bodegas con mensaje mejorado
   */
  private handleMultipleBodegasError(bodegaAnalysis: BodegaAnalysis, errors: string[]): void {
    const bodegasCount = bodegaAnalysis.bodegasInfo.length;
    const totalPedidos = this.order?.pedidos?.length || 0;

    // Construir lista detallada de bodegas
    const bodegasDetails = bodegaAnalysis.bodegasInfo.map(info => {
      const bodegaName = info.bodegaId === 'sin_bodega'
        ? '🚫 <strong>Sin bodega asignada</strong>'
        : `📍 <strong>Bodega: ${info.bodegaId}</strong>`;

      const pedidosInfo = info.pedidosIds.length > 0
        ? `<br>&nbsp;&nbsp;&nbsp;&nbsp;Pedidos: ${info.pedidosIds.join(', ')}`
        : `<br>&nbsp;&nbsp;&nbsp;&nbsp;${info.pedidosCount} pedido${info.pedidosCount > 1 ? 's' : ''}`;

      return `${bodegaName}${pedidosInfo}`;
    }).join('<br>');

    const errorMessage = `
      <div style="text-align: left;">
        <p><strong>❌ NO SE PUEDE PROCESAR ESTA ORDEN</strong></p>
        <p>La orden <strong>${this.order?.nroShippingOrder || 'sin número'}</strong> contiene <strong>${totalPedidos} pedidos</strong> distribuidos en <strong>${bodegasCount} bodegas diferentes</strong>:</p>
        <div style="margin: 10px 0; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #dc3545;">
          ${bodegasDetails}
        </div>
        <p><strong>💡 SOLUCIONES DISPONIBLES:</strong></p>
        <ul style="margin: 5px 0 0 20px;">
          <li>Crear envíos separados para cada bodega</li>
          <li>Reasignar todos los pedidos a una sola bodega</li>
          <li>Contactar al administrador para configuraciones especiales</li>
        </ul>
      </div>
    `;

    this.toastr.error(
      errorMessage,
      `Múltiples Bodegas Detectadas (${bodegasCount})`,
      {
        enableHtml: true,
        timeOut: 0, // No auto-cerrar para que el usuario lea bien
        closeButton: true,
        tapToDismiss: false,
        positionClass: 'toast-top-center'
      }
    );

    // Log adicional para debugging
    console.error('🚫 MÚLTIPLES BODEGAS DETECTADAS:', {
      orden: this.order?.nroShippingOrder,
      totalPedidos,
      bodegasCount,
      bodegasInfo: bodegaAnalysis.bodegasInfo,
      erroresCompletos: errors
    });
  }

  /**
   * Configura validación dinámica del campo distancia según tipo de envío
   */
  private setupDistanceValidation(): void {
    if (!this.quoteForm) return;

    this.quoteForm.get('shippingType')?.valueChanges.subscribe(shippingType => {
      const distanceControl = this.quoteForm.get('distanceKm');

      if (shippingType === 'express') {
        // Hacer obligatorio para Express
        distanceControl?.setValidators([Validators.required, Validators.min(1)]);
        distanceControl?.markAsUntouched(); // Reset touched state
      } else {
        // Opcional para otros tipos
        distanceControl?.clearValidators();
        distanceControl?.setValue(null);
      }

      distanceControl?.updateValueAndValidity();
    });
  }

  /**
   * Indica si se debe mostrar el campo de distancia
   */
  get shouldShowDistanceInput(): boolean {
    return this.quoteForm?.get('shippingType')?.value === 'express';
  }

  /**
   * Verifica si el formulario es válido considerando el campo de distancia
   */
  isFormValidForQuoteWithDistance(): boolean {
    const baseValid = this.tabsValidation.locations.valid && this.tabsValidation.package.valid;

    // Si es Express, validar que tenga origen, destino Y distancia
    if (this.quoteForm.get('shippingType')?.value === 'express') {
      const hasOrigin = this.quoteForm.get('originMunicipio')?.valid && this.quoteForm.get('originCity')?.valid;
      const hasDestination = this.quoteForm.get('destinationMunicipio')?.valid && this.quoteForm.get('destinationCity')?.valid;
      const distanceKm = this.quoteForm.get('distanceKm')?.value;

      return baseValid && hasOrigin && hasDestination && distanceKm > 0;
    }

    return baseValid;
  }

  /**
   * Toggle para expandir/colapsar opciones adicionales
   */
  toggleOptionsExpanded(): void {
    this.optionsExpanded = !this.optionsExpanded;
  }

  /**
   * Verifica si hay datos mínimos para mostrar el resumen sticky
   */
  hasMinimumData(): boolean {
    return !!(
      this.quoteForm.get('originCity')?.value ||
      this.quoteForm.get('destinationCity')?.value ||
      this.quoteForm.get('weight')?.value
    );
  }

  /**
   * Scroll al inicio del modal (para botón "Cambiar Datos")
   */
  scrollToTop(): void {
    const modalBody = document.querySelector('.modal-body-single-view');
    if (modalBody) {
      modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ========================================
  // MÉTODOS DEL ACCORDION INTELIGENTE
  // ========================================

  /**
   * Ir al siguiente paso (con validación)
   */
  goToNextStep(): void {
    if (this.activeStep < this.stepStates.length - 1) {
      // Validar paso actual antes de avanzar
      if (this.isStepCompleted(this.activeStep) || this.stepStates[this.activeStep].optional) {
        // Marcar paso actual como completado
        this.stepStates[this.activeStep].completed = true;

        // Desbloquear siguiente paso
        const nextStep = this.activeStep + 1;
        this.stepStates[nextStep].locked = false;

        // Avanzar
        this.activeStep = nextStep;

        // Auto-focus en el primer campo del nuevo paso
        setTimeout(() => this.autoFocusFirstField(this.activeStep), 300);
      } else {
        this.toastr.warning(
          'Por favor completa todos los campos requeridos antes de continuar',
          'Paso incompleto'
        );
      }
    }
  }

  /**
   * Ir al paso anterior
   */
  goToPreviousStep(): void {
    if (this.activeStep > 0) {
      this.activeStep--;
    }
  }

  /**
   * Verificar si se puede proceder a un paso específico
   */
  canProceedToStep(stepIndex: number): boolean {
    // Siempre se puede volver atrás
    if (stepIndex <= this.activeStep) {
      return true;
    }

    // Para avanzar, verificar que el paso no esté bloqueado
    return !this.stepStates[stepIndex].locked;
  }

  /**
   * Verificar si un paso está completado
   */
  isStepCompleted(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: // Tipo de Envío + Distancia
        const shippingType = this.quoteForm.get('shippingType')?.value;
        if (shippingType === 'express') {
          const distanceKm = this.quoteForm.get('distanceKm')?.value;
          return !!shippingType && distanceKm > 0;
        }
        return !!shippingType;

      case 1: // Ubicaciones
        const originValid = this.quoteForm.get('originMunicipio')?.valid &&
                           this.quoteForm.get('originCity')?.valid;
        const destinationValid = this.quoteForm.get('destinationMunicipio')?.valid &&
                                this.quoteForm.get('destinationCity')?.valid;
        const recipientValid = this.quoteForm.get('recipientName')?.valid;
        return !!(originValid && destinationValid && recipientValid);

      case 2: // Paquete
        const weightValid = this.quoteForm.get('weight')?.valid;
        return !!weightValid;

      case 3: // Opciones (siempre completado porque es opcional)
        return true;

      default:
        return false;
    }
  }

  /**
   * Obtener resumen del paso cuando está colapsado
   */
  getStepSummary(stepIndex: number): string {
    if (!this.isStepCompleted(stepIndex)) {
      return '';
    }

    switch (stepIndex) {
      case 0: // Tipo de Envío
        const shippingType = this.quoteForm.get('shippingType')?.value;
        const tipoLabel = this.tiposEnvio.find(t => t.value === shippingType)?.label || shippingType;
        const distanceKm = this.quoteForm.get('distanceKm')?.value;
        return distanceKm ? `${tipoLabel} (${distanceKm}km)` : tipoLabel;

      case 1: // Ubicaciones
        const originCity = this.quoteForm.get('originCity')?.value;
        const destinationCity = this.quoteForm.get('destinationCity')?.value;
        return `${originCity} → ${destinationCity}`;

      case 2: // Paquete
        const weight = this.quoteForm.get('weight')?.value;
        const value = this.quoteForm.get('value')?.value;
        const weightStr = weight ? `${weight}kg` : '';
        const valueStr = value > 0 ? `, ${this.formatPrice(value)}` : '';
        return `${weightStr}${valueStr}`;

      case 3: // Opciones
        const options: string[] = [];
        if (this.quoteForm.get('insurance')?.value) options.push('Seguro');
        if (this.quoteForm.get('cashOnDelivery')?.value) options.push('Pago contraentrega');
        if (this.quoteForm.get('signature')?.value) options.push('Firma');
        return options.length > 0 ? options.join(', ') : 'Sin opciones';

      default:
        return '';
    }
  }

  /**
   * Calcular porcentaje de progreso general
   */
  getProgressPercentageAccordion(): number {
    // Calcular pasos completados (sin contar el último que es opcional)
    const totalSteps = 3; // Solo contamos los 3 primeros (obligatorios)
    let completedSteps = 0;

    for (let i = 0; i < totalSteps; i++) {
      if (this.isStepCompleted(i)) {
        completedSteps++;
      }
    }

    // Si hay tarifas disponibles, 100%
    if (this.availableRates.length > 0) {
      return 100;
    }

    // Calcular porcentaje
    return Math.round((completedSteps / totalSteps) * 100);
  }

  /**
   * Auto-focus en el primer campo del paso
   */
  autoFocusFirstField(stepIndex: number): void {
    let selector = '';

    switch (stepIndex) {
      case 0: // Tipo de envío (ya tiene valor por defecto, focus en distancia si es express)
        if (this.shouldShowDistanceInput) {
          selector = 'input[formControlName="distanceKm"]';
        }
        break;

      case 1: // Ubicaciones
        selector = 'p-autoComplete[formControlName="originMunicipio"] input';
        break;

      case 2: // Paquete
        selector = 'input[formControlName="weight"]';
        break;

      case 3: // Opciones
        // No hacer focus en checkboxes
        break;
    }

    if (selector) {
      setTimeout(() => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          element.focus();
        }
      }, 100);
    }
  }

  /**
   * Manejar clic en header del accordion
   */
  onAccordionHeaderClick(stepIndex: number): void {
    // Solo permitir clic si no está bloqueado
    if (!this.stepStates[stepIndex].locked) {
      this.activeStep = stepIndex;
      setTimeout(() => this.autoFocusFirstField(stepIndex), 300);
    } else {
      this.toastr.info(
        'Completa el paso anterior para desbloquear este paso',
        'Paso bloqueado'
      );
    }
  }

  /**
   * Obtener clase CSS para el header del paso
   */
  getStepHeaderClass(stepIndex: number): string {
    const classes: string[] = ['step-header'];

    if (this.stepStates[stepIndex].completed && stepIndex !== this.activeStep) {
      classes.push('completed');
    } else if (stepIndex === this.activeStep) {
      classes.push('active');
    } else if (this.stepStates[stepIndex].locked) {
      classes.push('locked');
    } else if (!this.isStepCompleted(stepIndex)) {
      classes.push('incomplete');
    }

    return classes.join(' ');
  }

  /**
   * Obtener icono del estado del paso
   */
  getStepIcon(stepIndex: number): string {
    if (this.stepStates[stepIndex].completed && stepIndex !== this.activeStep) {
      return 'pi-check-circle'; // Verde - Completado
    } else if (stepIndex === this.activeStep) {
      return 'pi-chevron-down'; // Azul - Activo
    } else if (this.stepStates[stepIndex].locked) {
      return 'pi-lock'; // Gris - Bloqueado
    } else if (!this.isStepCompleted(stepIndex)) {
      return 'pi-exclamation-circle'; // Naranja - Incompleto
    }
    return 'pi-circle';
  }

  /**
   * Validar y actualizar estados de pasos automáticamente
   */
  private updateStepStates(): void {
    // Paso 1: Tipo de Envío
    if (this.isStepCompleted(0)) {
      this.stepStates[0].completed = true;
      this.stepStates[1].locked = false; // Desbloquear paso 2
    } else {
      this.stepStates[0].completed = false;
      this.stepStates[1].locked = true; // Bloquear paso 2
      this.stepStates[2].locked = true; // Bloquear paso 3
    }

    // Paso 2: Ubicaciones
    if (this.isStepCompleted(1)) {
      this.stepStates[1].completed = true;
      this.stepStates[2].locked = false; // Desbloquear paso 3
    } else {
      this.stepStates[1].completed = false;
      this.stepStates[2].locked = true; // Bloquear paso 3
    }

    // Paso 3: Paquete
    if (this.isStepCompleted(2)) {
      this.stepStates[2].completed = true;
      this.stepStates[3].locked = false; // Desbloquear paso 4
    } else {
      this.stepStates[2].completed = false;
    }

    // Paso 4: Opciones (siempre desbloqueado si llegamos aquí)
    this.stepStates[3].completed = true; // Siempre completado porque es opcional
  }

  /**
   * Verificar si puede cotizar (todos los pasos obligatorios completados)
   */
  canQuote(): boolean {
    return this.isStepCompleted(0) && this.isStepCompleted(1) && this.isStepCompleted(2);
  }
}