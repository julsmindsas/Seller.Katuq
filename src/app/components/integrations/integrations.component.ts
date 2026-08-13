import { Component, OnInit, Input, OnDestroy, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn } from '@angular/forms';
import { IntegrationsService, Integration, IntegrationCategory, CATEGORY_LABELS, ValidationResponse, ConfigSchema } from './integrations.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { IntegrationFormValidatorService, ValidationResult } from './integration-form-validator.service';
import { IntegrationUIHelperService } from './integration-ui-helper.service';
import { BodegaService } from '../../shared/services/bodegas/bodega.service';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, timer, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError, filter } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { VentasService } from '../../shared/services/ventas/ventas.service';
import { DaneCodesService } from '../../shared/services/dane-codes.service';
import { MunicipioDane } from '../../shared/data/colombia-dane-codes';

@Component({
  selector: 'app-integrations',
  templateUrl: './integrations.component.html',
  styleUrls: ['./integrations.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class IntegrationsComponent implements OnInit, OnDestroy {
  @Input() integrationToEdit: Integration | null = null;
  @Input() isModalMode = true;
  @Input() preselectedCategory: IntegrationCategory | null = null; // Nueva propiedad

  // Propiedades para optimización de template
  additionalFields: any[] = [];
  selectedIntegrationName: string = '';
  documentationUrl: string | null = '';

  categories = Object.values(IntegrationCategory);
  categoryLabels = CATEGORY_LABELS;
  
  availableIntegrations: { [category: string]: Array<{id: string, name: string, description: string, logo: string}> } = {};
  filteredIntegrations: { [category: string]: Array<{id: string, name: string, description: string, logo: string}> } = {};
  
  selectedCategory: IntegrationCategory = IntegrationCategory.ECOMMERCE;
  
  searchTerm: string = '';
  isPlatformSelectorCollapsed: boolean = true;
  showOnlyForm: boolean = false;
  
  isConfigurationMode: boolean = false;
  isStoreCollapsed: boolean = false;
  isCategoriesCollapsed: boolean = false;

  integrationTypes = [
    { id: 'shopify', name: 'Shopify', logo: 'assets/images/logos/shopify.svg' },
    { id: 'wompi', name: 'Wompi', logo: 'assets/images/logos/wompi.svg' },
    { id: 'epayco', name: 'ePayco', logo: 'assets/images/logos/epayco.svg' },
    { id: 'paypal', name: 'PayPal', logo: 'assets/images/logos/paypal.svg' },
    { id: 'partners_logistics', name: 'Partners Logística', logo: 'assets/images/logos/partners-logistics.svg' },
    { id: 'whatsapp_kapso', name: 'WhatsApp Business', logo: 'assets/images/logos/whatsapp.svg' }
  ];

  apiVersionOptions = [
    { label: '2026-04 (Última estable)', value: '2026-04' },
    { label: '2026-01', value: '2026-01' },
    { label: '2025-10', value: '2025-10' },
    { label: '2025-07', value: '2025-07' },
    { label: '2025-04', value: '2025-04' },
    { label: '2025-01', value: '2025-01' },
    { label: '2024-10', value: '2024-10' },
    { label: '2024-07', value: '2024-07' }
  ];
  
  selectedIntegrationType = 'shopify';
  integrationForm: FormGroup;
  
  savedIntegrations: Integration[] = [];
  editingIntegrationId: string | null = null;

  isSaving = false;
  isTesting = false;
  dianTestOrderIds = '';
  dianHabilitationLoading = false;
  dianZipKey = '';
  dianHabilitationStatus: any = null;
  dianTestOrders: any[] = [];
  dianSelectedOrderIds: string[] = [];
  dianOrdersLoading = false;
  dianStep = 1;
  dianStepError = '';
  dianRevealSecrets = false;
  dianShowAdvancedNumbering = false;
  dianShowFiscalDetails = false;
  dianCertificateFileName = '';
  dianMunicipalitySearch = '';
  dianMunicipalityResults: MunicipioDane[] = [];
  dianDirectMode = false;
  readonly dianSteps = [
    { number: 1, title: 'Comercio', subtitle: 'Confirmar datos del RUT' },
    { number: 2, title: 'Firma digital', subtitle: 'Copiar códigos y subir certificado' },
    { number: 3, title: 'Rango de facturas', subtitle: 'Copiar la numeración autorizada' },
    { number: 4, title: 'Revisar', subtitle: 'Confirmar antes de guardar' },
    { number: 5, title: 'Activar', subtitle: 'Completar pruebas o comenzar' }
  ];

  // World Office master data (loaded after successful test connection)
  woEmpresas: any[] = [];
  woPaymentTypes: any[] = [];
  woDocumentTypes: any[] = [];
  woMonedas: any[] = [];
  woBodegas: any[] = [];
  woPrefijos: any[] = [];
  woDefaults: any = null;
  woMasterDataLoading: boolean = false;
  woMasterDataLoaded: boolean = false;
  isLoadingEdit = false;
  
  statusMessage: { type: 'success' | 'error', message: string } | null = null;

  credentialStrength: ValidationResult | null = null;
  isAnalyzingCredentials = false;
  showAdvancedValidation = false;

  validationResult: ValidationResponse | null = null;
  validationInProgress = false;
  currentSchema: ConfigSchema | null = null;
  
  healthStatus: { status: string; services: any; timestamp: string } | null = null;
  lastHealthCheck: Date | null = null;
  healthCheckInterval: any;
  
  isDynamicForm = false;
  configPreview: any = null;
  showPreview = false;
  fieldSuggestions: { [fieldName: string]: string[] } = {};
  fieldHelp: { [fieldName: string]: any } = {};
  
  private destroy$ = new Subject<void>();

  private validationSubject = new Subject<{ provider: string; config: any }>();

  // Spec 003.1 — UX onboarding WooCommerce.
  wooBodegas: any[] = [];
  wooBodegasLoading = false;
  wooBodegasError: string | null = null;
  wooWebhookCopyOk = false;

  constructor(
    private fb: FormBuilder,
    private integrationsService: IntegrationsService,
    private formValidator: IntegrationFormValidatorService,
    private uiHelper: IntegrationUIHelperService,
    private bodegaService: BodegaService,
    private ventasService: VentasService,
    private daneCodesService: DaneCodesService,
    private router: Router,
    private route: ActivatedRoute,
    public activeModal?: NgbActiveModal
  ) {
    this.integrationForm = this.createShopifyForm();
  }

  ngOnInit(): void {
    this.availableIntegrations = this.integrationsService.getAvailableIntegrations();
    this.initializeFilteredIntegrations();

    // La ruta directa de DIAN debe pintar el asistente inmediatamente. Antes se
    // ejecutaban primero varias consultas genéricas de integraciones; cualquier
    // problema de contexto de empresa o de red podía lanzar un error sincrónico
    // y dejar el router-outlet completamente en blanco.
    if (this.route.snapshot.queryParamMap.get('provider') === 'dian') {
      this.openDianFromDirectRoute();
      return;
    }
    
    if (this.preselectedCategory) {
      this.selectedCategory = this.preselectedCategory;
      if (this.availableIntegrations[this.preselectedCategory]?.length > 0) {
        this.onSelectIntegrationType(this.availableIntegrations[this.preselectedCategory][0].id);
      }
    }
    
    if (this.integrationToEdit) {
      this.editIntegration(this.integrationToEdit);
      if (this.integrationToEdit.category) {
        this.selectedCategory = this.integrationToEdit.category;
      }
    } else {
      this.loadIntegrations();
    }

    this.setupFormValidation();
    this.setupRealTimeValidation();
    this.startHealthChecks();
    this.loadConfigSchema();
    this.updateTemplateProperties(); // Carga inicial

  }

  private openDianFromDirectRoute(): void {
    this.dianDirectMode = true;
    this.isModalMode = false;
    this.selectedIntegrationType = 'dian';
    this.showOnlyForm = true;
    this.isConfigurationMode = true;

    // El formulario nuevo es el fallback visible mientras se consulta si el
    // comercio ya tiene una configuración. Esto también cubre comercios nuevos.
    this.resetForm();
    this.showOnlyForm = true;
    this.dianStep = 1;
    this.updateTemplateProperties();
    this.setupRealTimeValidation();

    try {
      this.integrationsService.getIntegration('dian').pipe(takeUntil(this.destroy$)).subscribe({
        next: (integration) => {
          if (integration?.type || integration?.provider) {
            this.editIntegration({ ...integration, type: 'dian', provider: 'dian' });
          }
          this.showOnlyForm = true;
          this.dianStep = 1;
        },
        error: () => {
          // Un 404 significa que este comercio aún no ha configurado DIAN. El
          // formulario vacío ya está listo; no se oculta ni se redirige.
          this.showOnlyForm = true;
          this.dianStep = 1;
        }
      });
    } catch (_) {
      // getCurrentCompanyId puede fallar antes de crear el Observable si el
      // contexto del comercio todavía está cargando. La pantalla debe seguir
      // disponible para que el usuario pueda volver o reintentar.
      this.showOnlyForm = true;
      this.dianStep = 1;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  private setupFormValidation(): void {
    this.integrationForm.valueChanges.pipe(
      debounceTime(300), // <-- OPTIMIZACIÓN
      takeUntil(this.destroy$)
    ).subscribe(formValue => {
      if (this.isDynamicForm && this.currentSchema) {
        this.updateDynamicSuggestions(formValue);
      }
    });
  }

  private updateTemplateProperties(): void {
    this.selectedIntegrationName = this.getSelectedIntegrationName();
    this.documentationUrl = this.getDocumentationUrl(this.selectedIntegrationType);
    this.additionalFields = this.getAdditionalFields();
  }

  private setupRealTimeValidation(): void {
    // DESHABILITADO: Validación en tiempo real automática
    // this.validationSubject.pipe(
    //   debounceTime(800), // Esperar 800ms después del último cambio
    //   distinctUntilChanged((a, b) => JSON.stringify(a.config) === JSON.stringify(b.config)),
    //   switchMap(({ provider, config }) => {
    //     this.validationInProgress = true;
    //     return this.integrationsService.validateConfig(provider, config).pipe(
    //       catchError(error => {
    //         console.warn('Error en validación tiempo real:', error);
    //         return of({ success: false, errors: ['Error de validación: ' + error.message] });
    //       })
    //     );
    //   }),
    //   takeUntil(this.destroy$)
    // ).subscribe(result => {
    //   this.validationResult = result;
    //   this.validationInProgress = false;
    //   this.updateFormValidationState();
    // });
  }

  private shouldTriggerValidation(formValue: any): boolean {
    // Solo validar si hay suficientes datos
    const credentials = this.buildCredentials(formValue);
    const keys = Object.keys(credentials).filter(key => credentials[key]);
    return keys.length >= 2; // Al menos 2 campos con datos
  }

  private updateDynamicSuggestions(formValue: any): void {
    if (!this.currentSchema) return;
    
    // Actualizar sugerencias basadas en valores actuales
    this.currentSchema.fields.forEach(field => {
      const currentValue = formValue[field.name] || '';
      
      if (currentValue && currentValue.length > 2) {
        // TODO: Implementar sugerencias dinámicas
        this.fieldSuggestions[field.name] = [];
      }
    });
  }

  private updateFormValidationState(): void {
    if (!this.validationResult) return;
    
    // Actualizar estilos y mensajes de validación en tiempo real
    Object.keys(this.integrationForm.controls).forEach(controlName => {
      const control = this.integrationForm.get(controlName);
      if (control) {
        // Remover clases de validación anteriores
        control.setErrors(null);
        
        // Aplicar errores de validación específicos del backend
        if (this.validationResult?.errors) {
          const fieldErrors = this.validationResult.errors.filter(err => 
            err.toLowerCase().includes(controlName.toLowerCase())
          );
          if (fieldErrors.length > 0) {
            control.setErrors({ backendValidation: fieldErrors[0] });
          }
        }
      }
    });
  }

  private startHealthChecks(): void {
    // DESHABILITADO: Health check inicial automático
    // this.performHealthCheck();
    
    // DESHABILITADO: Health checks periódicos automáticos
    // this.healthCheckInterval = setInterval(() => {
    //   this.performHealthCheck();
    // }, 5 * 60 * 1000);
  }

  private performHealthCheck(): void {
    this.integrationsService.getHealthCheck().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.warn('Health check falló:', error);
        return of({
          status: 'error',
          services: { integration_api: 'down' },
          timestamp: new Date().toISOString()
        });
      })
    ).subscribe(health => {
      this.healthStatus = health;
      this.lastHealthCheck = new Date();
    });
  }

  private loadConfigSchema(): void {
    if (!this.selectedIntegrationType) return;
    
    this.integrationsService.getConfigSchema(this.selectedIntegrationType).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.warn('No se pudo cargar esquema:', error);
        this.isDynamicForm = false;
        return of(null);
      })
    ).subscribe(schema => {
      this.currentSchema = schema;
      
      if (schema) {
        // Usar formulario dinámico si tenemos esquema
        this.isDynamicForm = true;
        this.generateDynamicForm();
        this.loadFieldMetadata();
      } else {
        // Fallback a formularios estáticos
        this.isDynamicForm = false;
        this.updateFormWithSchema();
      }
    });
  }

  private generateDynamicForm(): void {
    if (!this.currentSchema) return;
    
    // Obtener valores existentes si estamos editando
    const existingValues = this.editingIntegrationId ? this.integrationForm.value : null;
    
    // TODO: Generar formulario dinámico
    // Por ahora, usar formulario estático
    this.updateFormWithSchema();
    
    // Reconfigurar validación para el nuevo formulario
    this.setupFormValidation();
  }

  private loadFieldMetadata(): void {
    if (!this.currentSchema) return;
    
    // Cargar sugerencias y ayuda para cada campo
    this.currentSchema.fields.forEach(field => {
      // TODO: Implementar sugerencias dinámicas
      this.fieldSuggestions[field.name] = [];
      
      // TODO: Implementar ayuda de campos
      this.fieldHelp[field.name] = null;
    });
  }

  private updateFormWithSchema(): void {
    if (!this.currentSchema) return;
    
    // Actualizar validaciones del formulario basado en el esquema (fallback estático)
    this.currentSchema.fields.forEach(field => {
      const control = this.integrationForm.get(field.name);
      if (control) {
        const validators: ValidatorFn[] = [];
        
        if (field.required) {
          validators.push(Validators.required);
        }
        
        if (field.validation?.minLength) {
          validators.push(Validators.minLength(field.validation.minLength));
        }
        
        if (field.validation?.maxLength) {
          validators.push(Validators.maxLength(field.validation.maxLength));
        }
        
        if (field.validation?.pattern) {
          validators.push(Validators.pattern(field.validation.pattern));
        }
        
        control.setValidators(validators);
        control.updateValueAndValidity();
      }
    });
  }

  private shouldAnalyzeCredentials(formValue: any): boolean {
    // Solo analizar si hay credenciales mínimas
    return !!(formValue.apiKey || formValue.publicKey || formValue.clientId);
  }

  /**
   * Genera preview de la configuración antes de guardar
   */
  generatePreview(): void {
    if (!this.currentSchema || this.integrationForm.invalid) {
      this.uiHelper.showWarning('Completa el formulario correctamente para generar el preview');
      return;
    }
    
    const formValue = this.integrationForm.value;
    // TODO: Implementar preview de configuración
    this.configPreview = {
      config: formValue,
      security: { securityScore: 80, encryptedFields: [], exposedFields: [] },
      validation: { isValid: true, warnings: [], missingOptional: [] }
    };
    
    this.showPreview = true;
    
    // Mostrar resumen del preview
    const { security, validation } = this.configPreview;
    
    if (security.securityScore >= 80) {
      this.uiHelper.showSuccess(`✨ Configuración segura (${security.securityScore}/100)`);
    } else if (security.securityScore >= 60) {
      this.uiHelper.showWarning(`⚠️ Configuración aceptable (${security.securityScore}/100)`);
    } else {
      this.uiHelper.showError(`🔓 Configuración poco segura (${security.securityScore}/100)`);
    }
  }

  /**
   * Oculta el preview de configuración
   */
  hidePreview(): void {
    this.showPreview = false;
    this.configPreview = null;
  }

  /**
   * Obtiene sugerencias para un campo específico
   */
  getSuggestionsForField(fieldName: string, currentValue: string): string[] {
    if (!this.isDynamicForm) return [];
    
    // TODO: Implementar sugerencias dinámicas
    return [];
  }

  /**
   * Aplica una sugerencia a un campo
   */
  applySuggestion(fieldName: string, suggestion: string): void {
    const control = this.integrationForm.get(fieldName);
    if (control) {
      control.setValue(suggestion);
      control.markAsTouched();
    }
  }

  /**
   * Obtiene información de ayuda para un campo
   */
  getFieldHelpInfo(fieldName: string): any {
    return this.fieldHelp[fieldName] || null;
  }

  /**
   * Verifica si un campo está encriptado según el esquema
   */
  isFieldEncrypted(fieldName: string): boolean {
    return this.currentSchema?.encrypted?.includes(fieldName) || false;
  }

  /**
   * Obtiene el tipo de campo según el esquema
   */
  getFieldType(fieldName: string): string {
    const field = this.currentSchema?.fields?.find(f => f.name === fieldName);
    return field?.type || 'string';
  }

  /**
   * Verifica si un campo es requerido
   */
  isFieldRequired(fieldName: string): boolean {
    return this.currentSchema?.required?.includes(fieldName) || false;
  }

  private analyzeCredentialStrength(formValue: any): void {
    if (this.isAnalyzingCredentials) return;
    
    this.isAnalyzingCredentials = true;
    
    // Simular análisis async (podrías hacer esto más sofisticado)
    setTimeout(() => {
      this.credentialStrength = this.formValidator.analyzeCredentialStrength(
        formValue, 
        this.selectedIntegrationType
      );
      this.isAnalyzingCredentials = false;
      
      // Mostrar feedback en UI
      if (this.credentialStrength) {
        this.showCredentialFeedback();
      }
    }, 800);
  }

  private showCredentialFeedback(): void {
    if (!this.credentialStrength) return;
    
    if (this.credentialStrength.securityLevel === 'high') {
      this.uiHelper.showSuccess(`🔒 Configuración de seguridad excelente (${this.credentialStrength.score}/100)`);
    } else if (this.credentialStrength.securityLevel === 'medium') {
      this.uiHelper.showWarning(`⚠️ Configuración de seguridad aceptable (${this.credentialStrength.score}/100)`);
    } else {
      this.uiHelper.showError(`🔓 Configuración de seguridad baja (${this.credentialStrength.score}/100) - Revisa las recomendaciones`);
    }
  }

  toggleAdvancedValidation(): void {
    this.showAdvancedValidation = !this.showAdvancedValidation;
  }

  loadIntegrations(): void {
    this.integrationsService.getIntegrations().subscribe({
      next: (integrations) => {
        this.savedIntegrations = integrations;
      },
      error: (error) => {
        this.showStatus('error', 'Error al cargar integraciones: ' + error.message);
      }
    });
  }

  onSelectIntegrationType(type: string): void {
    if (this.selectedIntegrationType === type) return;
    this.selectedIntegrationType = type;
    this.showOnlyForm = true; // Mostrar solo el formulario
    this.resetForm();
    
    // DESHABILITADO: Carga automática del esquema
    // this.loadConfigSchema();
    
    // Limpiar validaciones anteriores
    this.validationResult = null;
    this.credentialStrength = null;
  }

  resetForm(): void {
    // Resetea el formulario según el tipo seleccionado
    switch (this.selectedIntegrationType) {
      case 'shopify':
        this.integrationForm = this.createShopifyForm();
        break;
      case 'wompi':
        this.integrationForm = this.createWompiForm();
        break;
      case 'epayco':
        this.integrationForm = this.createEpaycoForm();
        break;
      case 'paypal':
        this.integrationForm = this.createPaypalForm();
        break;
      case 'stripe':
        this.integrationForm = this.createStripeForm();
        break;
      case 'payu':
        this.integrationForm = this.createPayUForm();
        break;
      case 'mercadopago':
        this.integrationForm = this.createMercadoPagoForm();
        break;
      case 'woocommerce':
        this.integrationForm = this.createWooCommerceForm();
        this.loadBodegasForWooForm();
        break;
      case 'magento':
        this.integrationForm = this.createMagentoForm();
        break;
      case 'prestashop':
        this.integrationForm = this.createPrestaShopForm();
        break;
      case 'enviame':
        this.integrationForm = this.createEnviameForm();
        break;
      case 'partners_logistics':
        this.integrationForm = this.createPartnersLogisticsForm();
        break;
      case 'aliaddo_fulfillment':
        this.integrationForm = this.createAliaddoFulfillmentForm();
        break;
      case 'siigo':
        this.integrationForm = this.createSiigoForm();
        break;
      case 'dian':
        this.integrationForm = this.createDianForm();
        this.dianStep = 1;
        this.prefillDianCompanyData();
        break;
      case 'prindel':
        this.integrationForm = this.createPrindelForm();
        break;
      case 'multiop':
        this.integrationForm = this.createMultiopForm();
        break;
      case 'world_office':
        this.integrationForm = this.createWorldOfficeForm();
        this.woMasterDataLoaded = false;
        this.woMasterDataLoading = false;
        this.woEmpresas = [];
        this.woPaymentTypes = [];
        this.woMonedas = [];
        this.woBodegas = [];
        this.woPrefijos = [];
        this.woDefaults = null;
        this.setupWOAutoLoad();
        break;
      case 'osmosis':
        this.integrationForm = this.createOsmosisForm();
        break;
      case 'fullpi':
        this.integrationForm = this.createFullpiForm();
        break;
      case 'whatsapp_kapso':
        // WhatsApp Business (Kapso) usa el componente dedicado
        // <app-whatsapp-kapso-config>. Creamos un FormGroup minimal para
        // que los bindings genéricos del template no truenen.
        this.integrationForm = this.fb.group({
          name: ['WhatsApp Business'],
          enabled: [true]
        });
        break;
      default:
        this.integrationForm = this.createShopifyForm();
        break;
    }

    this.statusMessage = null;
    this.editingIntegrationId = null;
    
    // Limpiar estado de validación
    this.validationResult = null;
    this.credentialStrength = null;
    this.validationInProgress = false;
    this.configPreview = null;
    this.showPreview = false;
    this.fieldSuggestions = {};
    this.fieldHelp = {};
    
    // Reconfigurar validación para el nuevo formulario
    this.setupFormValidation();

    // Establecer modo de pruebas como default para nuevas integraciones (más seguro)
    if (this.integrationForm.get('testMode')) {
      this.integrationForm.patchValue({
        testMode: true
      });
    }
  }

  editIntegration(integration: Integration): void {
    this.selectedIntegrationType = integration.type;
    this.editingIntegrationId = integration.id!;
    this.isLoadingEdit = true;

    // Crear el formulario base según el tipo seleccionado
    switch (integration.type) {
      case 'shopify':
        this.integrationForm = this.createShopifyForm();
        break;
      case 'wompi':
        this.integrationForm = this.createWompiForm();
        break;
      case 'epayco':
        this.integrationForm = this.createEpaycoForm();
        break;
      case 'paypal':
        this.integrationForm = this.createPaypalForm();
        break;
      case 'stripe':
        this.integrationForm = this.createStripeForm();
        break;
      case 'payu':
        this.integrationForm = this.createPayUForm();
        break;
      case 'mercadopago':
        this.integrationForm = this.createMercadoPagoForm();
        break;
      case 'woocommerce':
        this.integrationForm = this.createWooCommerceForm();
        this.loadBodegasForWooForm();
        break;
      case 'magento':
        this.integrationForm = this.createMagentoForm();
        break;
      case 'prestashop':
        this.integrationForm = this.createPrestaShopForm();
        break;
      case 'enviame':
        this.integrationForm = this.createEnviameForm();
        break;
      case 'partners_logistics':
        this.integrationForm = this.createPartnersLogisticsForm();
        break;
      case 'aliaddo_fulfillment':
        this.integrationForm = this.createAliaddoFulfillmentForm();
        break;
      case 'siigo':
        this.integrationForm = this.createSiigoForm();
        break;
      case 'dian':
        this.integrationForm = this.createDianForm();
        break;
      case 'prindel':
        this.integrationForm = this.createPrindelForm();
        break;
      case 'multiop':
        this.integrationForm = this.createMultiopForm();
        break;
      case 'world_office':
        this.integrationForm = this.createWorldOfficeForm();
        // Auto-load usando config guardada en Firestore (sin necesidad de token)
        setTimeout(() => this.loadWOMasterData(), 0);
        break;
      case 'osmosis':
        this.integrationForm = this.createOsmosisForm();
        break;
      case 'fullpi':
        this.integrationForm = this.createFullpiForm();
        break;
      case 'whatsapp_kapso':
        // WhatsApp Business (Kapso) usa el componente dedicado
        // <app-whatsapp-kapso-config>. Creamos un FormGroup minimal para
        // que los bindings genéricos del template no truenen.
        this.integrationForm = this.fb.group({
          name: ['WhatsApp Business'],
          enabled: [true]
        });
        break;
      default:
        this.integrationForm = this.createShopifyForm();
        break;
    }

    // Parchar name y enabled desde los datos del listado mientras carga el detalle
    this.integrationForm.patchValue({
      name: integration.name,
      enabled: integration.enabled
    });

    // Cargar datos completos desde el backend para poblar las credenciales
    this.integrationsService.getIntegration(integration.type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fullIntegration) => {
          this.isLoadingEdit = false;
          const config = fullIntegration.config || fullIntegration.credentials || {};

          // Parchar todos los campos disponibles del backend
          this.integrationForm.patchValue({
            name: fullIntegration.name || integration.name,
            enabled: fullIntegration.enabled ?? integration.enabled,
            ...config
          });
          if (integration.type === 'dian') {
            const issuer = config.issuer || {};
            this.dianMunicipalitySearch = issuer.cityName
              ? `${issuer.cityName}${issuer.department ? ' - ' + issuer.department : ''}`
              : '';
          }

          // Para campos que el backend NO devuelve por seguridad (ej. accessKey encriptado),
          // limpiar validators solo de esos campos vacíos
          Object.keys(this.integrationForm.controls).forEach(ctrlName => {
            if (['name', 'enabled'].includes(ctrlName)) return;
            const ctrl = this.integrationForm.get(ctrlName);
            if (ctrl && (ctrl.value === '' || ctrl.value === null || ctrl.value === undefined)) {
              ctrl.clearValidators();
              ctrl.updateValueAndValidity({ emitEvent: false });
            }
          });
        },
        error: () => {
          this.isLoadingEdit = false;
          // Fallback: si el backend falla, al menos name/enabled están listos.
          // Limpiar validators de credenciales para permitir guardar sin re-ingresarlas.
          Object.keys(this.integrationForm.controls).forEach(ctrlName => {
            if (['name', 'enabled'].includes(ctrlName)) return;
            const ctrl = this.integrationForm.get(ctrlName);
            if (ctrl && (ctrl.value === '' || ctrl.value === null || ctrl.value === undefined)) {
              ctrl.clearValidators();
              ctrl.updateValueAndValidity({ emitEvent: false });
            }
          });
        }
      });
  }

  testExistingIntegration(integration: Integration): void {
    this.isTesting = true;
    this.integrationsService.testIntegration(integration.type, integration.credentials).subscribe({
      next: (result) => {
        this.isTesting = false;
        if (result.success) {
          this.showStatus('success', 'Conexión exitosa: ' + result.message);
        } else {
          this.showStatus('error', 'Error de conexión: ' + result.message);
        }
      },
      error: (error) => {
        this.isTesting = false;
        this.showStatus('error', 'Error al probar la conexión: ' + error.message);
      }
    });
  }

  deleteIntegration(integration: Integration): void {
    if (confirm(`¿Está seguro que desea eliminar la integración "${integration.name}"?`)) {
      const provider = integration.provider || integration.type || integration.id!;
      this.integrationsService.deleteIntegration(provider).subscribe({
        next: () => {
          this.savedIntegrations = this.savedIntegrations.filter(i => i.id !== integration.id);
          this.showStatus('success', 'Integración eliminada correctamente');
          if (this.editingIntegrationId === integration.id) {
            this.resetForm();
          }
        },
        error: (error) => {
          this.showStatus('error', 'Error al eliminar la integración: ' + error.message);
        }
      });
    }
  }

  getIntegrationTypeName(): string {
    const type = this.integrationTypes.find(t => t.id === this.selectedIntegrationType);
    return type ? type.name : '';
  }

  getIntegrationName(typeId: string): string {
    const type = this.integrationTypes.find(t => t.id === typeId);
    return type ? type.name : typeId;
  }

  clearStatus(): void {
    this.statusMessage = null;
  }
  
  createShopifyForm(): FormGroup {
    // accessToken es opcional cuando se proveen apiKey+apiSecret (clientId+clientSecret).
    // El backend genera el access token vía OAuth client_credentials y lo refresca
    // automáticamente al recibir 401 (Custom Apps post-2026 expiran cada 24h).
    return this.fb.group({
      name: ['', Validators.required],
      enabled: [true],
      shopUrl: ['', [Validators.required, this.formValidator.createShopifyUrlValidator()]],
      apiKey: ['', Validators.required],
      apiSecret: ['', Validators.required],
      accessToken: [''],
      apiVersion: ['2026-04']
    });
  }

  createWompiForm(): FormGroup {
    return this.fb.group({
      name: ['Wompi', Validators.required],
      enabled: [true],
      publicKey: ['', Validators.required],           // Widget frontend
      privateKey: ['', Validators.required],          // API backend
      eventsSecret: ['', Validators.required],        // Webhooks (homologado)
      integritySecret: ['', Validators.required],     // Firmar widget (homologado)
      testMode: [false],                              // Toggle test/prod
      currency: ['COP']                               // Default COP
    });
  }

  createEpaycoForm(): FormGroup {
    return this.fb.group({
      name: ['ePayco', Validators.required],
      enabled: [true],
      publicKey: ['', Validators.required],
      privateKey: ['', Validators.required],
      clientId: ['', Validators.required],
      p_key: ['']
    });
  }

  createPaypalForm(): FormGroup {
    return this.fb.group({
      name: ['PayPal', Validators.required],
      enabled: [true],
      clientId: ['', Validators.required],
      clientSecret: ['', Validators.required],
      merchantId: ['']
    });
  }

  createStripeForm(): FormGroup {
    return this.fb.group({
      name: ['Stripe', Validators.required],
      enabled: [true],
      publishableKey: ['', Validators.required],
      secretKey: ['', Validators.required],
      webhookSecret: [''],
      accountId: ['']
    });
  }

  createPayUForm(): FormGroup {
    return this.fb.group({
      name: ['PayU', Validators.required],
      enabled: [true],
      apiKey: ['', Validators.required],
      apiLogin: ['', Validators.required],
      merchantId: ['', Validators.required],
      accountId: ['', Validators.required],
      publicKey: ['']
    });
  }

  createMercadoPagoForm(): FormGroup {
    return this.fb.group({
      name: ['Mercado Pago', Validators.required],
      enabled: [true],
      accessToken: ['', Validators.required],
      publicKey: ['', Validators.required],
      clientId: [''],
      clientSecret: [''],
      webhookUrl: ['']
    });
  }

  createWooCommerceForm(): FormGroup {
    return this.fb.group({
      name: ['WooCommerce', Validators.required],
      enabled: [true],
      storeUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      consumerKey: ['', Validators.required],
      consumerSecret: ['', Validators.required],
      // webhookSecret se pega después de crear el webhook en WC admin — opcional al crear,
      // requerido cuando 003.2 active la verificación HMAC.
      webhookSecret: [''],
      apiVersion: ['v3'],
      verifySsl: [true],
      // Spec 003.1 AC-003.1-04 — bodega Katuq donde se registra el stock sincronizado desde Woo.
      bodegaCode: ['', Validators.required]
    });
  }

  createMagentoForm(): FormGroup {
    return this.fb.group({
      name: ['Magento', Validators.required],
      enabled: [true],
      baseUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      adminToken: ['', Validators.required],
      username: [''],
      password: ['']
    });
  }

  createPrestaShopForm(): FormGroup {
    return this.fb.group({
      name: ['PrestaShop', Validators.required],
      enabled: [true],
      shopUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      webserviceKey: ['', Validators.required],
      language: ['es'],
      outputFormat: ['JSON']
    });
  }

  createEnviameForm(): FormGroup {
    return this.fb.group({
      name: ['Enviame.io', Validators.required],
      enabled: [true],
      apiKey: ['', [Validators.required, Validators.minLength(10)]],
      id_seller: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      apiUrl: ['https://api.enviame.io/api/s2/v2/companies/', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      webhookUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      environment: ['production', Validators.required],
      country: ['CL', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
      carrier_code: ['', [Validators.required]],
      timeout: [30],
      notifyErrors: [true],
      // Campos adicionales específicos de Enviame
      warehouse_code: ['', [Validators.required]],
      default_carrier: ['', [Validators.required]],
      default_service: ['', [Validators.required]],
      // Configuración de webhooks
      webhook_secret: ['', [Validators.minLength(10)]],
      webhook_events: [['delivery_created', 'delivery_updated', 'delivery_completed'], Validators.required],
      // Configuración de ambiente
      stage_url: ['https://stage.api.enviame.io', [Validators.pattern(/^https?:\/\/.+/)]],
      production_url: ['https://api.enviame.io', [Validators.pattern(/^https?:\/\/.+/)]],
      // Configuración de reintentos
      retry_attempts: [3, [Validators.min(1), Validators.max(10)]],
      retry_delay: [1000, [Validators.min(500), Validators.max(10000)]]
    });
  }

  createPartnersLogisticsForm(): FormGroup {
    return this.fb.group({
      name: ['Partners Logística', Validators.required],
      enabled: [true],
      apiKey: ['', [Validators.required, Validators.minLength(10)]],
      apiUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      webhookUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      environment: ['production', Validators.required],
      timeout: [30],
      retryAttempts: [3],
      notifyErrors: [true]
    });
  }

  createAliaddoFulfillmentForm(): FormGroup {
    return this.fb.group({
      name: ['Aliaddo Fulfillment', Validators.required],
      enabled: [true],
      // API Configuration
      apiToken: ['', [Validators.required, Validators.minLength(20)]],
      apiUrl: ['https://app.aliaddo.net/v1', Validators.required],
      environment: ['production', Validators.required],
      // Warehouse Configuration
      defaultWarehouseId: ['', []],
      // Tercero Interno para Remisiones de Venta (REQUERIDO para sincronizar stock)
      terceroInternoId: ['', [Validators.required]],
      // Advanced Settings
      timeout: [30, [Validators.min(5), Validators.max(300)]],
      retryAttempts: [3, [Validators.min(1), Validators.max(10)]],
      enableAutoSync: [true],
      // Webhook (optional for future)
      webhookUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      webhookSecret: ['']
    });
  }

  createSiigoForm(): FormGroup {
    return this.fb.group({
      name: ['Siigo', Validators.required],
      enabled: [true],
      environment: ['production'],
      // Credenciales requeridas
      username: ['', [Validators.required, Validators.minLength(5)]],
      accessKey: ['', [Validators.required, Validators.minLength(10)]],
      // Configuración básica
      partnerId: ['Katuq'],
      testMode: [false],
      // Configuración de bodega y centros de costo
      defaultWarehouse: [''],
      defaultCostCenter: [''],
      // Configuración de documentos y precios
      documentTypeId: [''],
      defaultPriceList: [1, [Validators.min(1)]],
      defaultTaxRate: [19, [Validators.min(0), Validators.max(100)]],
      // Opciones de automatización
      enableAutoInvoicing: [false],
      autoSyncInventory: [false],
      syncFrequency: ['manual'],
      // Mapeo de cuentas contables (opcional - se maneja en Advanced Options)
      accountGroup: [''],
      incomeAccount: [''],
      costAccount: [''],
      inventoryAccount: [''],
      discountAccount: [''],
      // Opciones avanzadas
      webhookUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      notifyErrors: [true]
    });
  }

  createDianForm(): FormGroup {
    return this.fb.group({
      name: ['DIAN directo', Validators.required],
      enabled: [true],
      environment: ['habilitacion', Validators.required],
      issuer: this.fb.group({
        businessName: ['', Validators.required],
        nit: ['', [Validators.required, Validators.pattern(/^\d{6,10}$/)]],
        dv: ['', [Validators.pattern(/^\d$/)]],
        address: ['', Validators.required],
        municipalityCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
        cityName: ['', Validators.required],
        department: ['', Validators.required],
        responsibilities: ['R-99-PN'],
        email: ['', Validators.email]
      }),
      numbering: this.fb.group({
        resolutionNumber: ['', Validators.required],
        prefix: ['', Validators.required],
        from: [1, [Validators.required, Validators.min(1)]],
        to: [1, [Validators.required, Validators.min(1)]],
        current: [1, [Validators.required, Validators.min(1)]],
        validFrom: ['', Validators.required],
        validTo: ['', Validators.required]
      }),
      noteNumbering: this.fb.group({
        creditPrefix: ['NC', Validators.required],
        creditCurrent: [1, [Validators.required, Validators.min(1)]],
        debitPrefix: ['ND', Validators.required],
        debitCurrent: [1, [Validators.required, Validators.min(1)]]
      }),
      softwareId: ['', Validators.required],
      softwarePin: ['', Validators.required],
      testSetId: [''],
      technicalKey: ['', Validators.required],
      certificateP12Base64: ['', Validators.required],
      certificatePassword: ['', Validators.required],
      enableAutoInvoicing: [false],
      sendEmail: [true],
      timeoutMs: [90000, [Validators.min(10000), Validators.max(180000)]]
    });
  }

  onDianCertificateSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    if (!/\.(p12|pfx)$/i.test(file.name)) {
      this.uiHelper.showError('Selecciona un certificado .p12 o .pfx válido.');
      input.value = '';
      return;
    }
    this.dianCertificateFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      this.integrationForm.get('certificateP12Base64')?.setValue(value.split(',').pop() || '');
      this.integrationForm.get('certificateP12Base64')?.markAsDirty();
    };
    reader.onerror = () => this.uiHelper.showError('No fue posible leer el certificado.');
    reader.readAsDataURL(file);
  }

  searchDianMunicipalities(event: Event): void {
    const query = (event.target as HTMLInputElement)?.value || '';
    this.dianMunicipalitySearch = query;
    if (query.trim().length < 2) {
      this.dianMunicipalityResults = [];
      return;
    }
    this.daneCodesService.searchMunicipios(query.trim()).pipe(takeUntil(this.destroy$)).subscribe((results) => {
      this.dianMunicipalityResults = results.slice(0, 8);
    });
  }

  selectDianMunicipality(municipality: MunicipioDane): void {
    this.integrationForm.get('issuer')?.patchValue({
      municipalityCode: municipality.codigo,
      cityName: municipality.nombre,
      department: municipality.departamento,
    });
    this.dianMunicipalitySearch = `${municipality.nombre} - ${municipality.departamento}`;
    this.dianMunicipalityResults = [];
    this.daneCodesService.addMunicipioFrecuente(municipality);
  }

  syncDianCurrentFromRange(): void {
    const from = Number(this.integrationForm.get('numbering.from')?.value);
    const current = this.integrationForm.get('numbering.current');
    if (Number.isFinite(from) && from > 0 && (current?.pristine || !current?.value)) {
      current?.setValue(from);
    }
  }

  goToDianStep(step: number): void {
    if (step < 1 || step > 5 || step > this.dianStep + 1) return;
    if (step === this.dianStep + 1 && !this.validateDianStep(this.dianStep)) return;
    this.dianStepError = '';
    this.dianStep = step;
  }

  nextDianStep(): void {
    if (!this.validateDianStep(this.dianStep)) return;
    this.dianStepError = '';
    this.dianStep = Math.min(5, this.dianStep + 1);
  }

  previousDianStep(): void {
    this.dianStepError = '';
    this.dianStep = Math.max(1, this.dianStep - 1);
  }

  finishDianSetup(): void {
    if (this.dianDirectMode) {
      this.router.navigate(['/facturacion-electronica']);
      return;
    }
    if (this.isModalMode && this.activeModal) this.activeModal.close('saved');
    else this.backToSelection();
  }

  exitDianSetup(): void {
    this.router.navigate(['/facturacion-electronica']);
  }

  loadDianTestOrders(): void {
    this.dianOrdersLoading = true;
    this.ventasService.getOrdersByFilterOptimized({ sortField: 'fechaCreacion', sortOrder: -1 }, 1, 30, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.dianOrdersLoading = false;
          this.dianTestOrders = (response?.orders || []).filter((order: any) =>
            !order?.nroFactura && Array.isArray(order?.carrito) && order.carrito.length > 0
          );
        },
        error: () => {
          this.dianOrdersLoading = false;
          this.uiHelper.showError('No pudimos cargar las ventas de prueba. Puedes reintentar.');
        }
      });
  }

  toggleDianTestOrder(order: any): void {
    const id = String(order?._id || order?.cd || order?.id || '');
    if (!id) return;
    const selected = this.dianSelectedOrderIds.includes(id);
    if (!selected && this.dianSelectedOrderIds.length >= 8) {
      this.uiHelper.showWarning('Ya seleccionaste las ocho ventas necesarias.');
      return;
    }
    this.dianSelectedOrderIds = selected
      ? this.dianSelectedOrderIds.filter((value) => value !== id)
      : [...this.dianSelectedOrderIds, id];
    this.dianTestOrderIds = this.dianSelectedOrderIds.join('\n');
  }

  isDianTestOrderSelected(order: any): boolean {
    const id = String(order?._id || order?.cd || order?.id || '');
    return this.dianSelectedOrderIds.includes(id);
  }

  private validateDianStep(step: number): boolean {
    const paths: { [key: number]: string[] } = {
      1: ['environment', 'issuer'],
      2: ['softwareId', 'softwarePin', 'technicalKey', 'certificateP12Base64', 'certificatePassword'],
      3: ['numbering', 'noteNumbering']
    };
    if (step === 2 && this.integrationForm.get('environment')?.value === 'habilitacion') paths[2].push('testSetId');
    const controls = (paths[step] || []).map((path) => this.integrationForm.get(path)).filter(Boolean);
    controls.forEach((control) => control?.markAllAsTouched());
    let valid = controls.every((control) => control?.valid !== false);
    if (step === 2 && !this.editingIntegrationId && this.integrationForm.get('environment')?.value === 'habilitacion') {
      valid = valid && !!this.integrationForm.get('testSetId')?.value;
    }
    if (!valid) {
      const labels: { [key: string]: string } = {
        environment: 'el punto del proceso', issuer: 'los datos legales del comercio',
        softwareId: 'Software ID', softwarePin: 'PIN del software', technicalKey: 'clave técnica',
        testSetId: 'TestSetId', certificateP12Base64: 'archivo del certificado',
        certificatePassword: 'contraseña del certificado', numbering: 'numeración autorizada',
        noteNumbering: 'numeración de notas'
      };
      const missing = (paths[step] || [])
        .filter((path) => this.integrationForm.get(path)?.invalid)
        .map((path) => labels[path] || path);
      this.dianStepError = `Para continuar falta revisar: ${missing.join(', ')}.`;
      setTimeout(() => {
        const invalid = document.querySelector('.integration-form .ng-invalid.ng-touched') as HTMLElement | null;
        invalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        invalid?.focus();
      });
    }
    return valid;
  }

  private prefillDianCompanyData(): void {
    try {
      const current = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const issuer = this.integrationForm.get('issuer');
      if (!issuer) return;
      issuer.patchValue({
        businessName: current.razonSocial || current.nombre || current.nomComercial || '',
        nit: String(current.nit || user.nit || '').replace(/\D/g, ''),
        dv: String(current.dv || current.digitoVerificacion || ''),
        address: current.direccion || current.address || '',
        municipalityCode: current.codigoMunicipio || current.municipalityCode || '',
        cityName: current.ciudad || current.city || '',
        department: current.departamento || current.department || '',
        email: current.email || user.email || ''
      }, { emitEvent: false });
      const city = current.ciudad || current.city || '';
      const department = current.departamento || current.department || '';
      this.dianMunicipalitySearch = city ? `${city}${department ? ' - ' + department : ''}` : '';
    } catch (_) {
      // El usuario puede completar los datos manualmente si el perfil legacy no es JSON válido.
    }
  }

  submitDianHabilitation(): void {
    const orderIds = this.dianTestOrderIds.split(/[\s,;]+/).map((id) => id.trim()).filter(Boolean);
    const uniqueIds = [...new Set(orderIds)];
    if (uniqueIds.length !== 8) {
      this.uiHelper.showError(`Debe ingresar exactamente 8 IDs de pedidos diferentes. Encontrados: ${uniqueIds.length}.`);
      return;
    }
    if (this.integrationForm.get('environment')?.value !== 'habilitacion') {
      this.uiHelper.showError('El set oficial solo se puede ejecutar en ambiente de habilitación.');
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: '¿Enviar el set oficial a la DIAN?',
      html: 'Se consumirán consecutivos y se transmitirán <strong>8 facturas, 1 nota crédito y 1 nota débito</strong>.',
      showCancelButton: true,
      confirmButtonText: 'Enviar set',
      cancelButtonText: 'Cancelar'
    }).then((confirmation) => {
      if (!confirmation.isConfirmed) return;
      this.dianHabilitationLoading = true;
      this.dianHabilitationStatus = null;
      this.integrationsService.submitDianHabilitationSet(uniqueIds).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          this.dianHabilitationLoading = false;
          const data = response?.data || response;
          this.dianZipKey = data?.zipKey || '';
          this.uiHelper.showSuccess(`Set enviado. ZipKey: ${this.dianZipKey}`);
        },
        error: (error) => {
          this.dianHabilitationLoading = false;
          this.uiHelper.showError(error?.error?.message || error?.message || 'No se pudo enviar el set DIAN.');
        }
      });
    });
  }

  checkDianHabilitationStatus(): void {
    const zipKey = this.dianZipKey.trim();
    if (!zipKey) {
      this.uiHelper.showError('Ingrese el ZipKey devuelto por la DIAN.');
      return;
    }
    this.dianHabilitationLoading = true;
    this.integrationsService.getDianHabilitationStatus(zipKey).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.dianHabilitationLoading = false;
        this.dianHabilitationStatus = response?.data || response;
        const accepted = this.dianHabilitationStatus?.isValid === true;
        if (accepted) this.uiHelper.showSuccess('La DIAN reporta el set como aceptado.');
        else this.uiHelper.showError('El set sigue pendiente o contiene rechazos. Revise el detalle mostrado.');
      },
      error: (error) => {
        this.dianHabilitationLoading = false;
        this.uiHelper.showError(error?.error?.message || error?.message || 'No se pudo consultar el ZipKey.');
      }
    });
  }

  createPrindelForm(): FormGroup {
    return this.fb.group({
      name: ['Prindel', Validators.required],
      enabled: [true],
      // Credencial principal - X-Customer-Token
      customerToken: ['', [Validators.required, Validators.minLength(10)]],
      // URL de la API
      apiUrl: ['https://api.prindel.com.co', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      // Configuración
      environment: ['production', Validators.required],
      // Tarifa por defecto (Prindel no tiene endpoint de cotización)
      defaultRate: [0, [Validators.min(0)]],
      // Días estimados de entrega
      estimatedDays: ['1-3'],
      // Modo de prueba
      testMode: [false]
    });
  }

  createMultiopForm(): FormGroup {
    return this.fb.group({
      name: ['MultiOP', Validators.required],
      enabled: [true],
      apiUrl: ['https://back.katuq.com/api/', [Validators.required]],
      apiKey: ['', [Validators.required, Validators.minLength(20)]],
    });
  }

  createOsmosisForm(): FormGroup {
    return this.fb.group({
      name: ['Guiacereza', Validators.required],
      enabled: [true],
      // URL base del API (opcional, si no se pone se usa el default)
      apiUrl: [''],
      // Identificador del nodo en Osmosis (requerido)
      nodeSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/i)]],
      // Credenciales OAuth2 (requeridas, sensibles)
      clientId: ['', Validators.required],
      clientSecret: ['', Validators.required],
      // Opciones de sincronizacion
      syncProducts: [true],
      syncOrders: [true],
      autoSyncProducts: [false],
      productSyncInterval: [6, [Validators.min(1), Validators.max(24)]]
    });
  }

  createFullpiForm(): FormGroup {
    // [Spec 017] Fullpi (WMS). El secret lo encripta el backend
    // (PROVIDER_SCHEMAS.fullpi.sensitive) — acá solo viaja en el POST.
    return this.fb.group({
      name: ['Fullpi', Validators.required],
      enabled: [true],
      // URL del API (requerida, https). Confirmar dominio con el correo de Fullpi.
      apiUrl: ['https://wms.tiendiempresa.com.co', [Validators.required, Validators.pattern(/^https:\/\/.+/)]],
      // Secret de autenticación (llega por correo de Fullpi; sensible)
      secret: ['', Validators.required],
      // Bodega Katuq espejo del WMS (business code, ej. BOD-FULLPI-1)
      bodegaCode: ['BOD-FULLPI-1', Validators.required],
      // Código de bodega que asigna Fullpi (ej. ECF1, llega por correo)
      codigoBodegaWms: [''],
      // Ambiente: pruebas (staging) o producción — mismo endpoint, distinto secret
      environment: ['staging']
    });
  }

  createWorldOfficeForm(): FormGroup {
    return this.fb.group({
      name: ['World Office', Validators.required],
      enabled: [true],
      // Credenciales
      apiToken: ['', [Validators.required, Validators.minLength(10)]],
      apiUrl: ['https://api.worldoffice.cloud'],
      // Configuración de empresa (auto-seleccionado si solo hay 1)
      idEmpresa: [''],
      idTerceroInterno: [''],
      // Facturación (requeridos por API WO para crear documentos)
      idFormaPago: [''],
      prefijo: [''],
      idMoneda: [''],
      idBodega: [''],
      concepto: ['Venta Katuq'],
      // Configuración avanzada de inventario (IDs de WO para crear productos)
      idCiudadDefault: [''],
      unidadMedidaDefault: ['UND'],
      // Automatización
      enableAutoInvoicing: [false],
      sendToDian: [true],
      sendEmail: [false],
      testMode: [false]
    });
  }

  onSubmit(): void {
    if (this.integrationForm.invalid) {
      this.integrationForm.markAllAsTouched();
      return;
    }
    
    // Validación previa con API V2 antes de guardar
    const formData = this.integrationForm.value;
    const credentials = this.buildCredentials(formData);
    const provider = this.selectedIntegrationType;
    
    this.isSaving = true;

    // En modo edición, filtrar campos vacíos del payload para no sobreescribir
    // credenciales existentes que el backend no devuelve por seguridad.
    const buildPayload = (creds: any) => {
      const base = { enabled: formData.enabled, name: formData.name };
      if (this.editingIntegrationId) {
        const nonEmpty = Object.entries(creds).reduce((acc, [k, v]) => {
          if (v !== '' && v !== null && v !== undefined) acc[k] = v;
          return acc;
        }, {} as any);
        return { ...nonEmpty, ...base };
      }
      return { ...creds, ...base };
    };

    // Paso 1: Validar configuración. Si el endpoint falla, se procede con el guardado igual.
    this.integrationsService.validateConfig(provider, credentials).pipe(
      catchError(() => of({ success: true, errors: [] } as ValidationResponse)),
      switchMap(validationResult => {
        if (!validationResult.success && validationResult.errors?.length) {
          // Si hay errores críticos, no proceder
          const criticalErrors = validationResult.errors.filter(err =>
            !err.toLowerCase().includes('warning') &&
            !err.toLowerCase().includes('opcional')
          );

          if (criticalErrors.length > 0) {
            throw new Error('Errores de validación: ' + criticalErrors.join(', '));
          }
        }

        // Paso 2: Proceder con el guardado
        const configPayload = buildPayload(credentials);

        if (this.editingIntegrationId) {
          return this.integrationsService.updateIntegration(provider, configPayload);
        } else {
          return this.integrationsService.createIntegration(provider, configPayload);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result: any) => {
        this.isSaving = false;

        if (provider === 'dian') {
          this.dianStep = 5;
          this.loadDianTestOrders();
          this.uiHelper.showSuccess('Configuración DIAN guardada. Ya puedes hacer la prueba de habilitación.');
          return;
        }

        // El backend ahora responde { success, configId, message }
        if (result && result.success) {
          const successMessage = result.message || 'Configuración guardada exitosamente';

          // Usar uiHelper para mostrar toast que persiste después de cerrar modal
          this.uiHelper.showSuccess(successMessage);

          // Debug: verificar estado del modal
          console.log('=== SAVE SUCCESS ===');
          console.log('isModalMode:', this.isModalMode);
          console.log('activeModal defined:', !!this.activeModal);

          // Cerrar modal si está en modo modal
          if (this.isModalMode && this.activeModal) {
            console.log('Closing modal...');
            this.activeModal.close('saved');
          } else {
            console.log('Modal NOT closed - isModalMode:', this.isModalMode, 'activeModal:', this.activeModal);
          }
          return;
        }

        // Compatibilidad retro con estructura anterior (Integration)
        const message = this.editingIntegrationId ? 'Integración actualizada correctamente' : 'Integración creada correctamente';
        this.uiHelper.showSuccess(message);

        if (this.isModalMode && this.activeModal) {
          this.activeModal.close('success');
        }
      },
      error: (error) => {
        this.isSaving = false;
        const errorMessage = error?.error?.message || error?.message || 'Error al guardar la integración';
        this.uiHelper.showError(errorMessage);
      }
    });
  }
  
  testConnection(): void {
    if (this.integrationForm.invalid) {
      this.integrationForm.markAllAsTouched();
      return;
    }
    
    const formData = this.integrationForm.value;
    const credentials = this.buildCredentials(formData);
    
    const integration: Integration = {
      type: this.selectedIntegrationType,
      name: formData.name,
      enabled: formData.enabled,
      category: this.getCategoryForType(this.selectedIntegrationType),
      credentials
    };
    
    this.isTesting = true;
    this.integrationsService.testIntegration(integration.type, integration.credentials).subscribe({
      next: (result) => {
        this.isTesting = false;
        this.pruebaConexion = result.success ? 'ok' : 'error';
        if (result.success) {
          this.showStatus('success', '✅ Conexión exitosa: ' + result.message);

          // Cargar datos maestros de World Office tras conexión exitosa
          if (this.selectedIntegrationType === 'world_office') {
            const formData = this.integrationForm.value;
            this.loadWOMasterData({ apiToken: formData.apiToken, apiUrl: formData.apiUrl });
          }
        } else {
          this.showStatus('error', '❌ Error de conexión: ' + result.message);
        }
      },
      error: (error) => {
        this.isTesting = false;
        this.pruebaConexion = 'error';
        this.showStatus('error', '❌ Error al probar la conexión: ' + error.message);
      }
    });
  }

  trackById(index: number, item: any): any {
    return item?.id ?? index;
  }

  /**
   * Carga todos los datos maestros de World Office en una sola llamada.
   * Sin credentials → usa config guardada en Firestore (modo edición).
   * Con credentials → los pasa al backend (nueva integración aún no guardada).
   */
  private loadWOMasterData(credentials?: { apiToken?: string; apiUrl?: string }): void {
    this.woMasterDataLoading = true;
    this.integrationsService.getWOMasterData(credentials).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result: any) => {
        this.woMasterDataLoading = false;
        const data = result.data || result;
        if (data.empresas?.length)     { this.woEmpresas = data.empresas; }
        if (data.paymentTypes?.length) { this.woPaymentTypes = data.paymentTypes; }
        if (data.documentTypes?.length){ this.woDocumentTypes = data.documentTypes; }
        if (data.currencies?.length)   { this.woMonedas = data.currencies; }
        if (data.warehouses?.length)   { this.woBodegas = data.warehouses; }
        console.log(`🔍 [WO] Prefijos en respuesta:`, data.prefijos?.length || 0, 'keys:', Object.keys(data));
        if (data.prefijos?.length)     { this.woPrefijos = data.prefijos.filter((p: any) => (p.nombre || p.codigo || '').trim() !== ''); }
        console.log(`🔍 [WO] Prefijos filtrados:`, this.woPrefijos.length);
        this.woDefaults = data.defaults || null;
        this.woMasterDataLoaded = true;

        // Auto-aplicar defaults inteligentes al formulario
        this.applyWODefaults();

        console.log(`✅ [WO] Conectado. Defaults auto-aplicados:`, this.woDefaults);
      },
      error: () => {
        this.woMasterDataLoading = false;
        console.warn('⚠️ [WO] No se pudieron cargar los datos maestros');
      }
    });
  }

  /**
   * Aplica defaults inteligentes al formulario de WO.
   * Solo aplica si el campo esta vacio (no sobreescribe valores existentes del usuario).
   */
  private applyWODefaults(): void {
    if (!this.woDefaults || !this.integrationForm) return;

    const d = this.woDefaults;
    const form = this.integrationForm;

    // Solo parchear campos vacios
    const patchIfEmpty = (field: string, value: any) => {
      if (value != null && !form.get(field)?.value) {
        form.get(field)?.setValue(String(value));
      }
    };

    patchIfEmpty('idEmpresa', d.idEmpresa);
    patchIfEmpty('idFormaPago', d.idFormaPago);
    patchIfEmpty('idMoneda', d.idMoneda);
    patchIfEmpty('idBodega', d.idBodega);
    patchIfEmpty('prefijo', d.prefijo);
    patchIfEmpty('idTerceroInterno', d.idTerceroInterno);
  }

  /**
   * Suscribe al campo apiToken para auto-cargar datos maestros al escribir (nueva integración).
   * Debounce de 1.2s, mínimo 10 chars.
   */
  private setupWOAutoLoad(): void {
    this.integrationForm.get('apiToken')?.valueChanges.pipe(
      debounceTime(1200),
      distinctUntilChanged(),
      filter((token: string) => !!token && token.length >= 10),
      takeUntil(this.destroy$)
    ).subscribe(token => {
      const apiUrl = this.integrationForm.get('apiUrl')?.value || 'https://api.worldoffice.cloud';
      this.loadWOMasterData({ apiToken: token, apiUrl });
    });
  }

  // Método centralizado para construir credenciales
  private buildCredentials(formData: any): any {
    let credentials: any = {};
    
    switch (this.selectedIntegrationType) {
      case 'shopify':
        // Mapeo dual a nombres canónicos del backend (shopDomain/clientId/clientSecret)
        // manteniendo los aliases previos (shopUrl/apiKey/apiSecret) para retro-compat.
        credentials = {
          shopUrl: formData.shopUrl,
          shopDomain: formData.shopUrl,
          apiKey: formData.apiKey,
          clientId: formData.apiKey,
          apiSecret: formData.apiSecret,
          clientSecret: formData.apiSecret,
          accessToken: formData.accessToken || undefined,
          apiVersion: formData.apiVersion
        };
        break;
      case 'wompi':
        credentials = {
          publicKey: formData.publicKey,
          privateKey: formData.privateKey,
          eventsSecret: formData.eventsSecret,       // Homologado
          integritySecret: formData.integritySecret, // Homologado
          testMode: formData.testMode || false,      // Boolean explícito
          currency: formData.currency || 'COP'       // Default COP
        };
        break;
      case 'epayco':
        credentials = {
          publicKey: formData.publicKey,
          privateKey: formData.privateKey,
          clientId: formData.clientId,
          p_key: formData.p_key,
          environment: formData.testMode ? 'test' : 'production'
        };
        break;
      case 'paypal':
        credentials = {
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          merchantId: formData.merchantId,
          environment: formData.testMode ? 'sandbox' : 'production'
        };
        break;
      case 'stripe':
        credentials = {
          publishableKey: formData.publishableKey,
          secretKey: formData.secretKey,
          webhookSecret: formData.webhookSecret,
          accountId: formData.accountId,
          environment: formData.testMode ? 'test' : 'live'
        };
        break;
      case 'payu':
        credentials = {
          apiKey: formData.apiKey,
          apiLogin: formData.apiLogin,
          merchantId: formData.merchantId,
          accountId: formData.accountId,
          publicKey: formData.publicKey,
          environment: formData.testMode ? 'test' : 'production'
        };
        break;
      case 'mercadopago':
        credentials = {
          accessToken: formData.accessToken,
          publicKey: formData.publicKey,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          webhookUrl: formData.webhookUrl,
          environment: formData.testMode ? 'sandbox' : 'production'
        };
        break;
      case 'woocommerce':
        credentials = {
          storeUrl: formData.storeUrl,
          consumerKey: formData.consumerKey,
          consumerSecret: formData.consumerSecret,
          webhookSecret: formData.webhookSecret,
          version: formData.apiVersion,
          verifySsl: formData.verifySsl,
          bodegaCode: formData.bodegaCode
        };
        break;
      case 'magento':
        credentials = {
          baseUrl: formData.baseUrl,
          adminToken: formData.adminToken,
          username: formData.username,
          password: formData.password
        };
        break;
      case 'prestashop':
        credentials = {
          shopUrl: formData.shopUrl,
          webserviceKey: formData.webserviceKey,
          language: formData.language,
          outputFormat: formData.outputFormat
        };
        break;
      case 'enviame':
        credentials = {
          apiKey: formData.apiKey,
          id_seller: formData.id_seller,
          apiUrl: formData.apiUrl,
          webhookUrl: formData.webhookUrl,
          environment: formData.environment,
          country: formData.country,
          carrier_code: formData.carrier_code,
          timeout: formData.timeout,
          notifyErrors: formData.notifyErrors,
          // Campos adicionales específicos de Enviame
          warehouse_code: formData.warehouse_code,
          default_carrier: formData.default_carrier,
          default_service: formData.default_service,
          webhook_secret: formData.webhook_secret,
          webhook_events: formData.webhook_events,
          stage_url: formData.stage_url,
          production_url: formData.production_url,
          retry_attempts: formData.retry_attempts,
          retry_delay: formData.retry_delay
        };
        break;
      case 'partners_logistics':
        credentials = {
          apiKey: formData.apiKey,
          apiUrl: formData.apiUrl,
          webhookUrl: formData.webhookUrl,
          environment: formData.environment,
          timeout: formData.timeout,
          retryAttempts: formData.retryAttempts,
          notifyErrors: formData.notifyErrors
        };
        break;
      case 'aliaddo_fulfillment':
        credentials = {
          apiToken: formData.apiToken,
          apiUrl: formData.apiUrl,
          environment: formData.environment,
          defaultWarehouseId: formData.defaultWarehouseId,
          timeout: formData.timeout,
          retryAttempts: formData.retryAttempts,
          enableAutoSync: formData.enableAutoSync,
          webhookUrl: formData.webhookUrl,
          webhookSecret: formData.webhookSecret
        };
        break;
      case 'prindel':
        credentials = {
          customerToken: formData.customerToken,
          apiUrl: formData.apiUrl,
          environment: formData.environment,
          defaultRate: formData.defaultRate,
          estimatedDays: formData.estimatedDays,
          testMode: formData.testMode
        };
        break;
      case 'multiop':
        credentials = {
          apiUrl: formData.apiUrl,
          apiKey: formData.apiKey,
        };
        break;
      case 'siigo':
        credentials = {
          username: formData.username,
          accessKey: formData.accessKey,
          partnerId: formData.partnerId || 'Katuq',
          testMode: formData.testMode || false,
          defaultWarehouse: formData.defaultWarehouse,
          defaultCostCenter: formData.defaultCostCenter,
          documentTypeId: formData.documentTypeId,
          defaultPriceList: formData.defaultPriceList || 1,
          defaultTaxRate: formData.defaultTaxRate || 19,
          enableAutoInvoicing: formData.enableAutoInvoicing || false,
          autoSyncInventory: formData.autoSyncInventory || false,
          syncFrequency: formData.syncFrequency || 'manual',
          accountGroup: formData.accountGroup,
          incomeAccount: formData.incomeAccount,
          costAccount: formData.costAccount,
          inventoryAccount: formData.inventoryAccount,
          discountAccount: formData.discountAccount
        };
        break;
      case 'dian':
        credentials = {
          environment: formData.environment,
          issuer: {
            ...formData.issuer,
            responsibilities: String(formData.issuer?.responsibilities || 'R-99-PN').split(/[;,]+/).map((value: string) => value.trim()).filter(Boolean)
          },
          numbering: formData.numbering,
          noteNumbering: formData.noteNumbering,
          softwareId: formData.softwareId,
          softwarePin: formData.softwarePin,
          testSetId: formData.testSetId,
          technicalKey: formData.technicalKey,
          certificateP12Base64: formData.certificateP12Base64,
          certificatePassword: formData.certificatePassword,
          enableAutoInvoicing: formData.environment === 'produccion' && !!formData.enableAutoInvoicing,
          sendEmail: !!formData.sendEmail,
          timeoutMs: formData.timeoutMs || 90000
        };
        break;
      case 'osmosis':
        credentials = {
          nodeSlug:            formData.nodeSlug,
          clientId:            formData.clientId,
          clientSecret:        formData.clientSecret,
          syncProducts:        formData.syncProducts        ?? true,
          syncOrders:          formData.syncOrders          ?? true,
          autoSyncProducts:    formData.autoSyncProducts    ?? false,
          productSyncInterval: formData.productSyncInterval ?? 6
        };
        break;
      case 'fullpi':
        credentials = {
          apiUrl:      formData.apiUrl,
          secret:      formData.secret,
          bodegaCode:  formData.bodegaCode || 'BOD-FULLPI-1',
          environment: formData.environment || 'staging'
        };
        // Opcional: solo viaja si tiene valor (validateConfig lo valida si viene)
        if (formData.codigoBodegaWms) {
          credentials.codigoBodegaWms = formData.codigoBodegaWms;
        }
        break;
      case 'world_office':
        credentials = {
          apiToken: formData.apiToken,
          apiUrl: formData.apiUrl || 'https://api.worldoffice.cloud',
          idEmpresa: formData.idEmpresa,
          idTerceroInterno: formData.idTerceroInterno,
          idFormaPago: formData.idFormaPago,
          prefijo: formData.prefijo,
          idMoneda: formData.idMoneda,
          idBodega: formData.idBodega,
          idCiudadDefault: formData.idCiudadDefault,
          unidadMedidaDefault: formData.unidadMedidaDefault || 'UND',
          concepto: formData.concepto || 'Venta Katuq',
          enableAutoInvoicing: formData.enableAutoInvoicing || false,
          sendToDian: formData.sendToDian !== false,
          sendEmail: formData.sendEmail || false,
          testMode: formData.testMode || false
        };
        break;
    }

    return credentials;
  }
  
  private handleSaveSuccess(integration: Integration, message: string): void {
    this.isSaving = false;
    
    if (this.editingIntegrationId) {
      // Update in list
      const index = this.savedIntegrations.findIndex(i => i.id === integration.id);
      if (index >= 0) {
        this.savedIntegrations[index] = integration;
      }
    } else {
      // Add to list
      this.savedIntegrations.push(integration);
    }
    
    this.showStatus('success', message);
    this.editingIntegrationId = integration.id!;
  }
  
  private handleSaveError(error: any): void {
    this.isSaving = false;
    this.showStatus('error', 'Error al guardar la integración: ' + error.message);
  }
  
  private showStatus(type: 'success' | 'error', message: string): void {
    this.statusMessage = { type, message };
    setTimeout(() => {
      if (this.statusMessage && this.statusMessage.type === 'success' && this.statusMessage.message === message) {
        this.statusMessage = null;
      }
    }, 5000);
  }

  cancel(): void {
    if (this.isModalMode && this.activeModal) {
      this.activeModal.dismiss('cancel');
    } else {
      this.resetForm();
    }
  }

  // Método para obtener la categoría de un tipo de integración
  private getCategoryForType(type: string): IntegrationCategory {
    // Buscar en qué categoría se encuentra este tipo
    for (const [category, integrations] of Object.entries(this.availableIntegrations)) {
      if (integrations.some(i => i.id === type)) {
        return category as IntegrationCategory;
      }
    }
    return IntegrationCategory.OTHER;
  }

  // Delegar obtención de icono de categoría al servicio UI Helper
  getCategoryIcon(category: string): string {
    return this.uiHelper.getCategoryIcon(category as IntegrationCategory);
  }

  // Método para cambiar la categoría seleccionada
  selectCategory(category: IntegrationCategory): void {
    this.selectedCategory = category;
  }

  // ===========================================================================
  // Rediseño del modal (2 pasos: elegir plataforma → credenciales).
  // Todo esto deriva del catálogo que ya carga `integrationsService`; no hay
  // consultas nuevas ni cambios en cómo se guarda una integración.
  // ===========================================================================

  /** Muestra también las plataformas que aún no están disponibles. */
  mostrarProximamente = true;

  /** `true` = catálogo completo; `false` = solo `selectedCategory`. */
  verTodasCategorias = true;

  /** Resultado de la última prueba de conexión, para el aviso del paso 2. */
  pruebaConexion: "idle" | "ok" | "error" = "idle";

  elegirCategoria(category: IntegrationCategory | null): void {
    if (category === null) {
      this.verTodasCategorias = true;
      return;
    }
    this.verTodasCategorias = false;
    this.selectCategory(category);
  }

  categoriaEstaActiva(category: IntegrationCategory | null): boolean {
    if (category === null) return this.verTodasCategorias;
    return !this.verTodasCategorias && this.selectedCategory === category;
  }

  /**
   * Catálogo plano de la categoría en curso (o de todas), con la etiqueta de
   * categoría adjunta: los ítems no la traen, va como llave del mapa.
   */
  private catalogoBase(): any[] {
    const fuente = this.availableIntegrations || {};
    const conCategoria = (cat: IntegrationCategory) =>
      (fuente[cat] || []).map((p: any) => ({
        ...p,
        categoriaLabel: this.categoryLabels?.[cat] || cat,
      }));

    if (!this.verTodasCategorias) {
      return conCategoria(this.selectedCategory);
    }
    return this.categories.reduce(
      (acc: any[], cat: IntegrationCategory) => acc.concat(conCategoria(cat)),
      [],
    );
  }

  /**
   * Lo que se pinta en la cuadrícula. El buscador antes no filtraba nada:
   * la plantilla leía `availableIntegrations` directo e ignoraba `searchTerm`.
   */
  getCatalogoVisible(): any[] {
    const texto = (this.searchTerm || "").trim().toLowerCase();
    return this.catalogoBase().filter((p: any) => {
      if (!this.mostrarProximamente && !p.active) return false;
      if (!texto) return true;
      return (
        (p.name || "").toLowerCase().includes(texto) ||
        (p.description || "").toLowerCase().includes(texto)
      );
    });
  }

  contarCategoria(category: IntegrationCategory | null): number {
    const fuente = this.availableIntegrations || {};
    const lista =
      category === null
        ? this.categories.reduce(
            (acc: any[], c: IntegrationCategory) => acc.concat(fuente[c] || []),
            [],
          )
        : fuente[category] || [];
    return lista.filter((p: any) => this.mostrarProximamente || p.active).length;
  }

  /** La plataforma marcada, con sus datos del catálogo. */
  get plataformaElegida(): any | null {
    if (!this.selectedIntegrationType) return null;
    const fuente = this.availableIntegrations || {};
    for (const cat of this.categories) {
      const hit = (fuente[cat] || []).find(
        (p: any) => p.id === this.selectedIntegrationType,
      );
      if (hit) return { ...hit, categoriaLabel: this.categoryLabels?.[cat] || cat };
    }
    return null;
  }

  /**
   * Marca la plataforma SIN saltar al formulario. `onSelectIntegrationType`
   * avanza de una; acá se separa elegir de continuar para poder comparar
   * antes de comprometerse (y para que el pie diga qué quedó elegido).
   */
  elegirPlataforma(integration: any): void {
    if (!integration?.active) return;
    if (this.selectedIntegrationType === integration.id) return;
    this.selectedIntegrationType = integration.id;
    this.pruebaConexion = "idle";
    this.resetForm();
    this.validationResult = null;
    this.credentialStrength = null;
  }

  puedeContinuar(): boolean {
    return !!this.plataformaElegida && this.plataformaElegida.active === true;
  }

  continuarAlFormulario(): void {
    if (!this.puedeContinuar()) return;
    this.showOnlyForm = true;
  }

  /** Inicial para el recuadro cuando el logo no carga. */
  inicialDe(nombre: string): string {
    return (nombre || "?").trim().charAt(0).toUpperCase();
  }

  // Método para manejar errores de imágenes
  onImageError(event: any, integration: any): void {
    event.target.style.display = 'none';
    // Mostrar icono como fallback
    const iconElement = event.target.nextElementSibling;
    if (iconElement) {
      iconElement.style.display = 'flex';
    }
  }

  // Delegar icono de integración al servicio centralizado
  getIntegrationIcon(integrationId: string): string {
    return this.uiHelper.getIntegrationIcon(integrationId);
  }

  // Métodos para health check y validación
  getHealthStatusClass(): string {
    if (!this.healthStatus) return 'text-muted';
    
    switch (this.healthStatus.status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-danger';
      default: return 'text-muted';
    }
  }

  getHealthStatusIcon(): string {
    if (!this.healthStatus) return 'fa-question-circle';
    
    switch (this.healthStatus.status) {
      case 'healthy': return 'fa-check-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-times-circle';
      default: return 'fa-question-circle';
    }
  }

  getHealthStatusText(): string {
    if (!this.healthStatus) return 'Verificando...';
    
    const timestamp = this.lastHealthCheck ? 
      this.lastHealthCheck.toLocaleTimeString() : '';
    
    switch (this.healthStatus.status) {
      case 'healthy': 
        return `Sistema operativo ${timestamp}`;
      case 'warning': 
        return `Sistema con advertencias ${timestamp}`;
      case 'error': 
        return `Sistema con errores ${timestamp}`;
      default: 
        return `Estado desconocido ${timestamp}`;
    }
  }

  getValidationStatusClass(): string {
    if (this.validationInProgress) return 'text-info';
    if (!this.validationResult) return 'text-muted';
    
    if (this.validationResult.success) {
      return this.validationResult.warnings?.length ? 'text-warning' : 'text-success';
    }
    return 'text-danger';
  }

  getValidationStatusIcon(): string {
    if (this.validationInProgress) return 'fa-spinner fa-spin';
    if (!this.validationResult) return 'fa-question-circle';
    
    if (this.validationResult.success) {
      return this.validationResult.warnings?.length ? 'fa-exclamation-triangle' : 'fa-check-circle';
    }
    return 'fa-times-circle';
  }

  getValidationStatusText(): string {
    if (this.validationInProgress) return 'Validando configuración...';
    if (!this.validationResult) return 'Ingresa datos para validar';
    
    if (this.validationResult.success) {
      if (this.validationResult.warnings?.length) {
        return `Válido con ${this.validationResult.warnings.length} advertencia(s)`;
      }
      return 'Configuración válida';
    }
    
    const errorCount = this.validationResult.errors?.length || 0;
    return `${errorCount} error(es) de validación`;
  }

  getValidationErrors(): string[] {
    return this.validationResult?.errors || [];
  }

  getValidationWarnings(): string[] {
    return this.validationResult?.warnings || [];
  }

  getValidationSuggestions(): string[] {
    return this.validationResult?.suggestions || [];
  }

  // Método para forzar validación manual
  forceValidation(): void {
    if (this.integrationForm.valid) {
      const formData = this.integrationForm.value;
      const credentials = this.buildCredentials(formData);
      
      this.validationSubject.next({
        provider: this.selectedIntegrationType,
        config: credentials
      });
    }
  }

  /**
   * Método para refrescar health check manual
   */
  refreshHealthCheck(): void {
    this.performHealthCheck();
  }

  /**
   * Método para validar credenciales manualmente desde el modal
   */
  manualValidateCredentials(): void {
    if (this.integrationForm.valid) {
      const formValue = this.integrationForm.value;
      const credentials = this.buildCredentials(formValue);
      
      this.validationSubject.next({
        provider: this.selectedIntegrationType,
        config: credentials
      });
    }
  }

  /**
   * Método para analizar fortaleza de credenciales manualmente desde el modal
   */
  manualAnalyzeCredentialStrength(): void {
    const formValue = this.integrationForm.value;
    if (this.shouldAnalyzeCredentials(formValue)) {
      this.analyzeCredentialStrength(formValue);
    }
  }

  /**
   * Método para cargar esquema manualmente desde el modal
   */
  manualLoadConfigSchema(): void {
    this.loadConfigSchema();
  }

  /**
   * Método público para realizar health check manual
   * (reemplaza los health checks automáticos deshabilitados)
   */
  manualHealthCheck(): void {
    this.performHealthCheck();
  }

  /**
   * Método para limpiar todo el cache
   */
  // Métodos para formularios dinámicos
  getDynamicFormFields(): any[] {
    if (!this.currentSchema) return [];
    
    return this.currentSchema.fields.filter(field => 
      !['name', 'enabled'].includes(field.name)
    );
  }

  getFieldDisplayName(fieldName: string): string {
    // Convertir nombres de campo técnicos a nombres amigables
    const displayNames: { [key: string]: string } = {
      'apiKey': 'Clave API',
      'apiSecret': 'Clave Secreta',
      'publicKey': 'Clave Pública',
      'privateKey': 'Clave Privada',
      'clientId': 'ID de Cliente',
      'clientSecret': 'Secreto de Cliente',
      'shopUrl': 'URL de la Tienda',
      'webhookSecret': 'Secreto de Webhook',
      'redirectUrl': 'URL de Redirección',
      'eventKey': 'Clave de Eventos',
      'integrityKey': 'Clave de Integridad',
      'merchantId': 'ID de Comerciante',
      'accountId': 'ID de Cuenta',
      'accessToken': 'Token de Acceso',
      'apiVersion': 'Versión de API',
      'baseUrl': 'URL Base',
      'adminToken': 'Token de Admin',
      'consumerKey': 'Clave de Consumidor',
      'consumerSecret': 'Secreto de Consumidor',
      'webserviceKey': 'Clave de Webservice',
      'storeUrl': 'URL de la Tienda',
      'environment': 'Ambiente'
    };
    
    return displayNames[fieldName] || fieldName;
  }

  getFieldIcon(fieldName: string): string {
    const iconMap: { [key: string]: string } = {
      'apiKey': 'fa-key',
      'apiSecret': 'fa-lock',
      'publicKey': 'fa-unlock',
      'privateKey': 'fa-lock',
      'clientId': 'fa-id-card',
      'clientSecret': 'fa-user-secret',
      'shopUrl': 'fa-link',
      'storeUrl': 'fa-link',
      'baseUrl': 'fa-link',
      'webhookSecret': 'fa-webhook',
      'redirectUrl': 'fa-external-link',
      'merchantId': 'fa-store',
      'accountId': 'fa-user',
      'accessToken': 'fa-ticket',
      'environment': 'fa-cog'
    };
    
    return iconMap[fieldName] || 'fa-edit';
  }

  /**
   * Método para obtener campos adicionales específicos según el tipo de integración
   */
  getAdditionalFields(): Array<{id: string, label: string, type: string, placeholder: string, icon: string, tooltip?: string}> {
    switch (this.selectedIntegrationType) {
      case 'enviame':
        return [
          {
            id: 'id_seller',
            label: 'ID Seller',
            type: 'text',
            placeholder: 'Ej: 12345',
            icon: 'fa-user-tag',
            tooltip: 'ID de la empresa/seller generado por Enviame'
          },
          {
            id: 'warehouse_code',
            label: 'Código de Bodega',
            type: 'text',
            placeholder: 'Ej: bod_sell',
            icon: 'fa-warehouse',
            tooltip: 'Código de la bodega donde se originarán los envíos'
          },
          {
            id: 'default_carrier',
            label: 'Carrier por Defecto',
            type: 'text',
            placeholder: 'Ej: STARKEN, BLUEXPRESS',
            icon: 'fa-truck',
            tooltip: 'Carrier predeterminado para los envíos'
          },
          {
            id: 'default_service',
            label: 'Servicio por Defecto',
            type: 'text',
            placeholder: 'Ej: priority, standard',
            icon: 'fa-shipping-fast',
            tooltip: 'Servicio de envío predeterminado'
          },
          {
            id: 'country',
            label: 'País',
            type: 'text',
            placeholder: 'CL, CO, PE, MX',
            icon: 'fa-flag',
            tooltip: 'Código de país (2 caracteres)'
          },
          {
            id: 'carrier_code',
            label: 'Código de Carrier',
            type: 'text',
            placeholder: 'Ej: SKN, BLX',
            icon: 'fa-barcode',
            tooltip: 'Código específico del carrier'
          },
          {
            id: 'webhook_secret',
            label: 'Secret del Webhook',
            type: 'password',
            placeholder: 'Secret para validar webhooks',
            icon: 'fa-shield-alt',
            tooltip: 'Clave secreta para validar las notificaciones de webhook'
          }
        ];
      case 'partners_logistics':
        return [
          {
            id: 'retryAttempts',
            label: 'Reintentos',
            type: 'number',
            placeholder: '3',
            icon: 'fa-redo',
            tooltip: 'Número de reintentos en caso de fallo'
          }
        ];
      case 'siigo':
        return [
          {
            id: 'partnerId',
            label: 'Partner ID',
            type: 'text',
            placeholder: 'Katuq',
            icon: 'fa-handshake',
            tooltip: 'Identificador del partner en Siigo (usualmente "Katuq")'
          },
          {
            id: 'defaultWarehouse',
            label: 'Bodega por Defecto',
            type: 'text',
            placeholder: 'Código de bodega',
            icon: 'fa-warehouse',
            tooltip: 'Código de la bodega predeterminada para inventario'
          },
          {
            id: 'defaultCostCenter',
            label: 'Centro de Costo',
            type: 'text',
            placeholder: 'Código de centro de costo',
            icon: 'fa-building',
            tooltip: 'Código del centro de costo predeterminado'
          },
          {
            id: 'documentTypeId',
            label: 'Tipo de Documento',
            type: 'text',
            placeholder: 'ID del tipo de documento',
            icon: 'fa-file-invoice',
            tooltip: 'ID del tipo de documento para facturas (ej: 1 para Factura de Venta)'
          },
          {
            id: 'accountGroup',
            label: 'Grupo de Cuenta',
            type: 'text',
            placeholder: 'Código de grupo contable',
            icon: 'fa-folder',
            tooltip: 'Código del grupo de cuenta contable para productos'
          },
          {
            id: 'incomeAccount',
            label: 'Cuenta de Ingresos',
            type: 'text',
            placeholder: 'Código de cuenta de ingresos',
            icon: 'fa-dollar-sign',
            tooltip: 'Código de la cuenta contable para ingresos'
          },
          {
            id: 'costAccount',
            label: 'Cuenta de Costos',
            type: 'text',
            placeholder: 'Código de cuenta de costos',
            icon: 'fa-money-bill-wave',
            tooltip: 'Código de la cuenta contable para costos'
          },
          {
            id: 'inventoryAccount',
            label: 'Cuenta de Inventario',
            type: 'text',
            placeholder: 'Código de cuenta de inventario',
            icon: 'fa-boxes',
            tooltip: 'Código de la cuenta contable para inventario'
          }
        ];
      case 'world_office':
        return [
          {
            id: 'idTerceroInterno',
            label: 'Tercero Interno',
            type: 'text',
            placeholder: 'ID del tercero interno en WO',
            icon: 'fa-user-tie',
            tooltip: 'ID del tercero interno (empresa) en World Office'
          },
          {
            id: 'idFormaPago',
            label: 'Forma de Pago',
            type: 'text',
            placeholder: 'ID de la forma de pago',
            icon: 'fa-credit-card',
            tooltip: 'ID de la forma de pago por defecto en World Office'
          },
          {
            id: 'prefijo',
            label: 'Prefijo de Factura',
            type: 'text',
            placeholder: 'Ej: FE, FV',
            icon: 'fa-hashtag',
            tooltip: 'Prefijo para numeración de facturas electrónicas'
          },
          {
            id: 'concepto',
            label: 'Concepto',
            type: 'text',
            placeholder: 'Venta Katuq',
            icon: 'fa-file-alt',
            tooltip: 'Concepto por defecto para las facturas'
          }
        ];
      case 'osmosis':
        return [
          {
            id: 'nodeSlug',
            label: 'Node Slug',
            type: 'string',
            placeholder: 'Ej: mi-tienda-colombia',
            icon: 'fa-plug',
            tooltip: 'Identificador del nodo de tu tienda en Osmosis (solo letras, números y guiones)'
          },
          {
            id: 'syncProducts',
            label: 'Sincronizar productos',
            type: 'boolean',
            placeholder: '',
            icon: 'fa-box',
            tooltip: 'Importa el catálogo de productos desde Osmosis/Guiacereza'
          },
          {
            id: 'syncOrders',
            label: 'Sincronizar pedidos',
            type: 'boolean',
            placeholder: '',
            icon: 'fa-shopping-cart',
            tooltip: 'Envía los pedidos de Katuq al ERP de Guiacereza'
          },
          {
            id: 'autoSyncProducts',
            label: 'Sincronización automática de productos',
            type: 'boolean',
            placeholder: '',
            icon: 'fa-sync',
            tooltip: 'Activa la sincronización periódica automática del catálogo'
          },
          {
            id: 'productSyncInterval',
            label: 'Intervalo de sincronización (horas)',
            type: 'number',
            placeholder: '6',
            icon: 'fa-clock',
            tooltip: 'Cada cuántas horas se sincroniza el catálogo automáticamente (1-24)'
          }
        ];
      case 'fullpi':
        return [
          {
            id: 'apiUrl',
            label: 'URL del API',
            type: 'string',
            placeholder: 'https://wms.tiendiempresa.com.co',
            icon: 'fa-link',
            tooltip: 'Endpoint del WMS Fullpi (https). Confirmar el dominio con el correo de credenciales'
          },
          {
            id: 'secret',
            label: 'Secret de autenticación',
            type: 'password',
            placeholder: 'Secret enviado por correo por Fullpi',
            icon: 'fa-key',
            tooltip: 'Credencial del API. Katuq la guarda encriptada; pruebas y producción usan secrets distintos'
          },
          {
            id: 'bodegaCode',
            label: 'Bodega Katuq',
            type: 'string',
            placeholder: 'BOD-FULLPI-1',
            icon: 'fa-warehouse',
            tooltip: 'Código de la bodega Katuq espejo del WMS (los pedidos de esta bodega viajan a Fullpi)'
          },
          {
            id: 'codigoBodegaWms',
            label: 'Código de bodega en Fullpi',
            type: 'string',
            placeholder: 'ECF1',
            icon: 'fa-boxes',
            tooltip: 'Código que Fullpi asigna a tu bodega (llega en el correo de credenciales)'
          }
        ];
      default:
        return [];
    }
  }

  /**
   * Método para verificar si la integración necesita campo URL
   */
  needsUrl(): boolean {
    return ['partners_logistics', 'enviame'].includes(this.selectedIntegrationType);
  }

  /**
   * Indica si la integración seleccionada usa un componente dedicado
   * (no el wizard genérico de 4 pasos).
   */
  get isWhatsappKapso(): boolean {
    return this.selectedIntegrationType === 'whatsapp_kapso';
  }

  /**
   * Método para obtener la URL de documentación de Enviame
   */
  getDocumentationUrl(integrationType: string): string | null {
    const urls: { [key: string]: string } = {
      'enviame': 'https://docs.enviame.io/docs/v2#tag/Envios/operation/Crear-Envios-Seller',
      'shopify': 'https://shopify.dev/docs/admin-api/getting-started',
      'wompi': 'https://docs.wompi.co/docs',
      'epayco': 'https://docs.epayco.co/',
      'paypal': 'https://developer.paypal.com/docs/api/overview/',
      'stripe': 'https://stripe.com/docs/api',
      'mercadopago': 'https://www.mercadopago.com.co/developers',
      'siigo': 'https://siigoapi.docs.apiary.io',
      'osmosis': 'https://osmosis-api.guiacereza.tech/api',
      'woocommerce': 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
      'whatsapp_kapso': 'https://docs.kapso.com',
      'kapso': 'https://docs.kapso.com',
      'whatsapp': 'https://docs.kapso.com'
    };
    return urls[integrationType] || null;
  }

  /**
   * Método para obtener el nombre de la integración seleccionada
   */
  getSelectedIntegrationName(): string {
    const names: { [key: string]: string } = {
      'enviame': 'Enviame.io',
      'shopify': 'Shopify',
      'wompi': 'Wompi',
      'epayco': 'ePayco',
      'paypal': 'PayPal',
      'stripe': 'Stripe',
      'mercadopago': 'Mercado Pago',
      'partners_logistics': 'Partners Logística',
      'siigo': 'Siigo',
      'osmosis': 'Guiacereza',
      'woocommerce': 'WooCommerce',
      'whatsapp_kapso': 'WhatsApp Business',
      'kapso': 'WhatsApp Business',
      'whatsapp': 'WhatsApp Business'
    };
    return names[this.selectedIntegrationType] || this.selectedIntegrationType;
  }

  /**
   * Método para mostrar/ocultar visibilidad de campos de contraseña
   */
  showApiKey = false;
  showApiSecret = false;

  toggleApiKeyVisibility(): void {
    this.showApiKey = !this.showApiKey;
  }

  toggleApiSecretVisibility(): void {
    this.showApiSecret = !this.showApiSecret;
  }

  // ===== FUNCIONALIDADES DE BÚSQUEDA Y ACORDEÓN =====

  /**
   * Inicializar integraciones filtradas con todas las integraciones
   */
  initializeFilteredIntegrations(): void {
    this.filteredIntegrations = JSON.parse(JSON.stringify(this.availableIntegrations));
  }

  /**
   * Filtrar integraciones basado en el término de búsqueda
   */
  filterIntegrations(searchTerm: string): void {
    this.searchTerm = searchTerm;
    
    if (!searchTerm.trim()) {
      // Si no hay término de búsqueda, mostrar todas
      this.filteredIntegrations = JSON.parse(JSON.stringify(this.availableIntegrations));
    } else {
      // Filtrar por nombre y descripción
      const term = searchTerm.toLowerCase().trim();
      this.filteredIntegrations = {};
      
      for (const [category, integrations] of Object.entries(this.availableIntegrations)) {
        const filtered = integrations.filter(integration => 
          integration.name.toLowerCase().includes(term) ||
          integration.description.toLowerCase().includes(term)
        );
        
        if (filtered.length > 0) {
          this.filteredIntegrations[category] = filtered;
        }
      }
    }
  }

  /**
   * Alternar el estado del acordeón de selección de plataformas
   */
  togglePlatformSelector(): void {
    this.isPlatformSelectorCollapsed = !this.isPlatformSelectorCollapsed;
  }

  /**
   * Volver a la vista de selección de integraciones
   */
  backToSelection(): void {
    this.showOnlyForm = false;
    this.isPlatformSelectorCollapsed = true;
  }

  /**
   * Navegar al Dashboard de Shopify
   */
  goToShopifyDashboard(): void {
    if (this.isModalMode && this.activeModal) {
      this.activeModal.dismiss('navigate');
    }
    this.router.navigate(['/integrations/shopify']);
  }

  /**
   * Verifica si la integración seleccionada es Shopify (para mostrar botón de dashboard)
   */
  isShopifySelected(): boolean {
    return this.selectedIntegrationType === 'shopify';
  }

  // ============================================================
  // Spec 003.1 — Onboarding WooCommerce (helpers UX)
  // ============================================================

  /**
   * Carga las bodegas activas del comercio para alimentar el picker `bodegaCode`
   * del form WooCommerce. Se invoca al seleccionar o editar una integración Woo.
   * Spec 003.1 AC-003.1-04 + Q-003.1-01 (solo activas).
   */
  loadBodegasForWooForm(): void {
    this.wooBodegasLoading = true;
    this.wooBodegasError = null;

    this.bodegaService.getActiveBodegas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bodegas) => {
          this.wooBodegas = Array.isArray(bodegas) ? bodegas : [];
          this.wooBodegasLoading = false;
        },
        error: (err) => {
          this.wooBodegasError = 'No pudimos cargar las bodegas. Intentá de nuevo.';
          this.wooBodegas = [];
          this.wooBodegasLoading = false;
          console.error('[Integrations][Woo] loadBodegasForWooForm error', err);
        }
      });
  }

  /**
   * URL pública del webhook entrante WooCommerce para este comercio.
   * Spec 003.1 AC-003.1-05.
   *
   * Pattern: `{API_BASE}/v1/woocommerceWebhook/{companyId-url-encoded}`.
   * companyId viene de localStorage.user.company (consistente con
   * HttpInterceptor2 que ya lo lee de ahí — ver CLAUDE.md frontend).
   */
  get webhookUrlForWooCommerce(): string {
    let companyId = '';
    try {
      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        companyId = (u && u.company) || '';
      }
    } catch (_) {
      // localStorage corrupto — devolver placeholder visible al usuario.
    }
    if (!companyId) return 'https://back.katuq.com/v1/woocommerceWebhook/{COMPANY}';
    const base = (environment as any).urlApi || 'https://back.katuq.com';
    return `${base}/v1/woocommerceWebhook/${encodeURIComponent(companyId)}`;
  }

  /**
   * Copia la URL del webhook al portapapeles + feedback visual 2s.
   * Spec 003.1 AC-003.1-05 + T-08.
   */
  copyWebhookUrl(): void {
    const url = this.webhookUrlForWooCommerce;
    const onDone = () => {
      this.wooWebhookCopyOk = true;
      setTimeout(() => { this.wooWebhookCopyOk = false; }, 2000);
    };

    if (navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
      (navigator as any).clipboard.writeText(url).then(onDone).catch(() => this._fallbackCopy(url, onDone));
    } else {
      this._fallbackCopy(url, onDone);
    }
  }

  private _fallbackCopy(text: string, onDone: () => void): void {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      onDone();
    } catch (e) {
      console.error('[Integrations][Woo] copyWebhookUrl fallback failed', e);
    }
  }

}
