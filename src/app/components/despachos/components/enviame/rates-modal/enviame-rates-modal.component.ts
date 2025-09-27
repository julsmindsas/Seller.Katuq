import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { LogisticaServiceV2 } from '../../../../../shared/services/despachos/logistica.service.v2';
import { ShipmentPreparationService, BodegaAnalysis } from '../../../../../shared/services/despachos/shipment-preparation.service';
import { EnviameHelperService } from '../services/enviame-helper.service';
import { DaneCodesService } from '../../../../../shared/services/dane-codes.service';
import { MunicipioDane } from '../../../../../shared/data/colombia-dane-codes';
import {
  EnviameRate,
  EnviameQuoteRequest,
  EnviameRatesResponse
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

  // Municipios para autocompletado
  municipiosSugeridosOrigen: any[] = [];
  municipiosSugeridosDestino: any[] = [];
  municipioSeleccionadoOrigen: MunicipioDane | null = null;
  municipioSeleccionadoDestino: MunicipioDane | null = null;

  // Estados de búsqueda de municipios
  searchingMunicipiosOrigen: boolean = false;
  searchingMunicipiosDestino: boolean = false;

  // Tipos de envío disponibles
  tiposEnvio = [
    { label: 'Estándar', value: 'estandar', icon: 'pi-box' },
    { label: 'Express', value: 'express', icon: 'pi-forward' },
    { label: 'Prioritario', value: 'prioritario', icon: 'pi-bolt' }
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
   * Buscar municipios para origen
   */
  buscarMunicipiosOrigen(event: any): void {
    const query = event.query;
    this.searchingMunicipiosOrigen = true;
    this.daneCodesService.searchMunicipios(query).subscribe(municipios => {
      this.municipiosSugeridosOrigen = municipios.map(m => ({
        label: this.daneCodesService.formatMunicipioLabel(m),
        value: m,
        ...m
      }));
      this.searchingMunicipiosOrigen = false;
    });
  }

  /**
   * Buscar municipios para destino
   */
  buscarMunicipiosDestino(event: any): void {
    const query = event.query;
    this.searchingMunicipiosDestino = true;
    this.daneCodesService.searchMunicipios(query).subscribe(municipios => {
      this.municipiosSugeridosDestino = municipios.map(m => ({
        label: this.daneCodesService.formatMunicipioLabel(m),
        value: m,
        ...m
      }));
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
}