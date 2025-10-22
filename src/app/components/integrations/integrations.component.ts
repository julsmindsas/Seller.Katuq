import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn } from '@angular/forms';
import { IntegrationsService, Integration, IntegrationCategory, CATEGORY_LABELS, ValidationResponse, ConfigSchema } from './integrations.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { IntegrationFormValidatorService, ValidationResult } from './integration-form-validator.service';
import { IntegrationUIHelperService } from './integration-ui-helper.service';
import { Subject, timer, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-integrations',
  templateUrl: './integrations.component.html',
  styleUrls: ['./integrations.component.scss']
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
    { id: 'partners_logistics', name: 'Partners Logística', logo: 'assets/images/logos/partners-logistics.svg' }
  ];

  apiVersionOptions = [
    { label: '2025-07 (Recomendada)', value: '2025-07' },
    { label: '2025-04', value: '2025-04' },
    { label: '2025-01', value: '2025-01' },
    { label: '2024-10', value: '2024-10' },
    { label: '2024-07', value: '2024-07' },
    { label: '2024-04', value: '2024-04' },
    { label: '2024-01', value: '2024-01' },
    { label: '2023-10', value: '2023-10' },
    { label: '2023-07', value: '2023-07' },
    { label: '2023-04', value: '2023-04' },
    { label: '2023-01', value: '2023-01' }
  ];
  
  selectedIntegrationType = 'shopify';
  integrationForm: FormGroup;
  
  savedIntegrations: Integration[] = [];
  editingIntegrationId: string | null = null;
  
  isTestMode = true;
  isSaving = false;
  isTesting = false;
  
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

  constructor(
    private fb: FormBuilder,
    private integrationsService: IntegrationsService,
    private formValidator: IntegrationFormValidatorService,
    private uiHelper: IntegrationUIHelperService,
    public activeModal?: NgbActiveModal
  ) {
    this.integrationForm = this.createShopifyForm();
  }

  ngOnInit(): void {
    this.availableIntegrations = this.integrationsService.getAvailableIntegrations();
    this.initializeFilteredIntegrations();
    
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
  }

  editIntegration(integration: Integration): void {
    this.selectedIntegrationType = integration.type;
    this.editingIntegrationId = integration.id!;

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
      default:
        this.integrationForm = this.createShopifyForm();
        break;
    }

    // Parchear únicamente campos seguros (nombre y estado). Las credenciales se dejan vacías por seguridad.
    this.integrationForm.patchValue({
      name: integration.name,
      enabled: integration.enabled
    });

    // Si el backend no envía credenciales, los campos relacionados quedan vacíos. Para evitar que el
    // formulario quede inválido (Validators.required), eliminamos los validadores de todos los
    // campos excepto "name" y "enabled" cuando los valores están vacíos.
    Object.keys(this.integrationForm.controls).forEach(ctrlName => {
      if (['name', 'enabled'].includes(ctrlName)) return;
      const ctrl = this.integrationForm.get(ctrlName);
      if (ctrl && (ctrl.value === '' || ctrl.value === null || ctrl.value === undefined)) {
        ctrl.clearValidators();
        ctrl.updateValueAndValidity({ emitEvent: false });
      }
    });

    // Reiniciar la bandera de modo de pruebas; el backend ya no envía información sensible.
    this.isTestMode = false;
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
      this.integrationsService.deleteIntegration(integration.id!).subscribe({
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
    return this.fb.group({
      name: ['', Validators.required],
      enabled: [true],
      shopUrl: ['', [Validators.required, this.formValidator.createShopifyUrlValidator()]],
      apiKey: ['', Validators.required],
      apiSecret: ['', Validators.required],
      accessToken: ['', Validators.required],
      apiVersion: ['2025-07']
    });
  }

  createWompiForm(): FormGroup {
    return this.fb.group({
      name: ['Wompi', Validators.required],
      enabled: [true],
      publicKey: ['', Validators.required],
      privateKey: ['', Validators.required],
      eventKey: [''],
      integrityKey: [''],
      redirectUrl: ['']
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
      siteUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      consumerKey: ['', Validators.required],
      consumerSecret: ['', Validators.required],
      webhookSecret: ['', Validators.required],
      apiVersion: ['v3'],
      verifySsl: [true]
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
    
    // Paso 1: Validar configuración
    this.integrationsService.validateConfig(provider, credentials).pipe(
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
        const configPayload = {
          ...credentials,
          enabled: formData.enabled,
          name: formData.name
        };
        
        if (this.editingIntegrationId) {
          return this.integrationsService.updateIntegration(provider, configPayload);
        } else {
          return this.integrationsService.createIntegration(provider, configPayload);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result: any) => {
        // El backend ahora responde { success, configId, message }
        if (result && result.success && result.configId) {
          this.isSaving = false;
          this.showStatus('success', result.message || 'Configuración guardada');
          // Notificar lista para refrescar (emitir evento)
          if (this.isModalMode && this.activeModal) {
            this.activeModal.close('saved');
          }
          return;
        }

        // Compatibilidad retro con estructura anterior (Integration)
        const message = this.editingIntegrationId ? 'Integración actualizada correctamente' : 'Integración creada correctamente';
        this.handleSaveSuccess(result as any, message);
        // DESHABILITADO: Health check automático después de guardar
        // this.performHealthCheck();
        if (this.isModalMode && this.activeModal) {
          this.activeModal.close('success');
        }
      },
      error: (error) => {
        this.handleSaveError(error);
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
        if (result.success) {
          this.showStatus('success', '✅ Conexión exitosa: ' + result.message);
          
          // DESHABILITADO: Health check automático después de test exitoso
          // this.performHealthCheck();
        } else {
          this.showStatus('error', '❌ Error de conexión: ' + result.message);
        }
      },
      error: (error) => {
        this.isTesting = false;
        this.showStatus('error', '❌ Error al probar la conexión: ' + error.message);
      }
    });
  }

  // Método centralizado para construir credenciales
  private buildCredentials(formData: any): any {
    let credentials: any = {};
    
    switch (this.selectedIntegrationType) {
      case 'shopify':
        credentials = {
          shopUrl: formData.shopUrl,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          accessToken: formData.accessToken,
          apiVersion: formData.apiVersion
        };
        break;
      case 'wompi':
        credentials = {
          publicKey: formData.publicKey,
          privateKey: formData.privateKey,
          eventKey: formData.eventKey,
          integrityKey: formData.integrityKey,
          redirectUrl: formData.redirectUrl,
          environment: this.isTestMode ? 'test' : 'production'
        };
        break;
      case 'epayco':
        credentials = {
          publicKey: formData.publicKey,
          privateKey: formData.privateKey,
          clientId: formData.clientId,
          p_key: formData.p_key,
          environment: this.isTestMode ? 'test' : 'production'
        };
        break;
      case 'paypal':
        credentials = {
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          merchantId: formData.merchantId,
          environment: this.isTestMode ? 'sandbox' : 'production'
        };
        break;
      case 'stripe':
        credentials = {
          publishableKey: formData.publishableKey,
          secretKey: formData.secretKey,
          webhookSecret: formData.webhookSecret,
          accountId: formData.accountId,
          environment: this.isTestMode ? 'test' : 'live'
        };
        break;
      case 'payu':
        credentials = {
          apiKey: formData.apiKey,
          apiLogin: formData.apiLogin,
          merchantId: formData.merchantId,
          accountId: formData.accountId,
          publicKey: formData.publicKey,
          environment: this.isTestMode ? 'test' : 'production'
        };
        break;
      case 'mercadopago':
        credentials = {
          accessToken: formData.accessToken,
          publicKey: formData.publicKey,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          webhookUrl: formData.webhookUrl,
          environment: this.isTestMode ? 'sandbox' : 'production'
        };
        break;
      case 'woocommerce':
        credentials = {
          storeUrl: formData.siteUrl,
          consumerKey: formData.consumerKey,
          consumerSecret: formData.consumerSecret,
          webhookSecret: formData.webhookSecret,
          version: formData.apiVersion,
          verifySsl: formData.verifySsl
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
  
  toggleEnvironment(): void {
    this.isTestMode = !this.isTestMode;
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
      'siigo': 'https://siigoapi.docs.apiary.io'
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
      'siigo': 'Siigo'
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

}
