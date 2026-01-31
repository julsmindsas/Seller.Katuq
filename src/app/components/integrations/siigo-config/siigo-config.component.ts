import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IntegrationsService } from '../integrations.service';
import { MessageService } from 'primeng/api';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

interface SiigoMasterData {
  costCenters: any[];
  documentTypes: any[];
  paymentTypes: any[];
  taxes: any[];
  priceLists: any[];
  accountGroups: any[];
  warehouses: any[];
}

interface SyncResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors?: string[];
}

@Component({
  selector: 'app-siigo-config',
  templateUrl: './siigo-config.component.html',
  styleUrls: ['./siigo-config.component.scss'],
  providers: [MessageService]
})
export class SiigoConfigComponent implements OnInit, OnDestroy {

  // Form
  siigoForm: FormGroup;

  // Connection state
  connectionStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
  connectionMessage: string = '';

  // Loading states
  isLoading = false;
  isSaving = false;
  isSyncing = false;
  isLoadingMasterData = false;

  // Master data from Siigo
  masterData: SiigoMasterData = {
    costCenters: [],
    documentTypes: [],
    paymentTypes: [],
    taxes: [],
    priceLists: [],
    accountGroups: [],
    warehouses: []
  };

  // Sync result
  syncResult: SyncResult | null = null;
  syncProgress = 0;

  // Existing config
  existingConfig: any = null;

  // Katuq payment methods (loaded from the merchant's configuration)
  katuqPaymentMethods: any[] = [];
  isLoadingPaymentMethods = false;

  // Toggle for password visibility
  showAccessKey = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private integrationsService: IntegrationsService,
    private messageService: MessageService,
    private maestroService: MaestroService
  ) {
    this.siigoForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadKatuqPaymentMethods();
    this.loadExistingConfig();
  }

  /**
   * Loads the merchant's configured payment methods from Katuq
   */
  loadKatuqPaymentMethods(): void {
    this.isLoadingPaymentMethods = true;

    this.maestroService.consultarFormaPago()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading payment methods:', error);
          return of([]);
        }),
        finalize(() => this.isLoadingPaymentMethods = false)
      )
      .subscribe((paymentMethods: any[]) => {
        this.katuqPaymentMethods = paymentMethods || [];
        console.log('Katuq payment methods loaded:', this.katuqPaymentMethods);

        // Create form controls for each payment method
        this.createPaymentMethodsMappingControls();

        // If we have existing config, apply the mapping
        if (this.existingConfig?.paymentMethodsMapping) {
          this.applyPaymentMethodsMapping(this.existingConfig.paymentMethodsMapping);
        }
      });
  }

  /**
   * Creates form controls dynamically based on loaded payment methods
   */
  private createPaymentMethodsMappingControls(): void {
    const mappingGroup = this.siigoForm.get('paymentMethodsMapping') as FormGroup;

    // Clear existing controls
    Object.keys(mappingGroup.controls).forEach(key => {
      mappingGroup.removeControl(key);
    });

    // Add a control for each payment method
    this.katuqPaymentMethods.forEach(method => {
      const controlName = this.sanitizeControlName(method.nombre);
      mappingGroup.addControl(controlName, this.fb.control(''));
    });
  }

  /**
   * Applies saved mapping to form controls
   */
  private applyPaymentMethodsMapping(mapping: any): void {
    const mappingGroup = this.siigoForm.get('paymentMethodsMapping') as FormGroup;

    Object.keys(mapping).forEach(key => {
      if (mappingGroup.contains(key)) {
        mappingGroup.get(key)?.setValue(mapping[key]);
      }
    });
  }

  /**
   * Sanitizes payment method name to be used as form control name
   */
  private sanitizeControlName(name: string): string {
    return name?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Remove multiple underscores
      .replace(/^_|_$/g, '') || 'unknown'; // Remove leading/trailing underscores
  }

  /**
   * Gets the sanitized control name for a payment method
   */
  getPaymentMethodControlName(method: any): string {
    return this.sanitizeControlName(method.nombre);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Credentials
      username: ['', [Validators.required, Validators.minLength(5)]],
      accessKey: ['', [Validators.required, Validators.minLength(10)]],
      partnerId: [{ value: 'Katuq', disabled: true }],
      testMode: [false],

      // Accounting Configuration
      defaultWarehouse: [''],
      defaultCostCenter: [''],
      documentTypeId: [''],
      defaultPaymentTypeId: [''],  // Tipo de pago por defecto para facturas
      defaultPriceList: [1],
      defaultTaxRate: [19, [Validators.min(0), Validators.max(100)]],

      // Tax IDs from Siigo (required for correct invoice creation)
      tax0Id: [''],   // ID del impuesto 0% (Excluido/Exento)
      tax5Id: [''],   // ID del impuesto 5%
      tax19Id: [''],  // ID del impuesto 19% (IVA estándar)

      // Automation Options
      enableAutoInvoicing: [false],
      autoSyncInventory: [false],
      syncFrequency: ['manual'],

      // Account Mapping (using sub-form)
      accountsMapping: this.fb.group({
        accountGroup: [''],
        incomeAccount: [''],
        costAccount: [''],
        inventoryAccount: [''],
        discountAccount: ['']
      }),

      // Payment Methods Mapping (Katuq → Siigo payment type IDs)
      // Maps each Katuq payment method (by name) to a Siigo payment type ID
      // This determines which account (e.g., 13050501 - Clientes nacionales) is used
      // This will be dynamically populated based on the merchant's configured payment methods
      paymentMethodsMapping: this.fb.group({})
    });
  }

  loadExistingConfig(): void {
    this.isLoading = true;

    this.integrationsService.loadSiigoConfig()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          // No config found is not an error
          if (error.status === 404) {
            return of(null);
          }
          console.error('Error loading Siigo config:', error);
          return of(null);
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe(response => {
        if (response && response.config) {
          this.existingConfig = response.config;
          this.patchFormWithConfig(response.config);
          this.connectionStatus = 'success';
          this.connectionMessage = 'Configuración cargada correctamente';

          // Auto-load master data if credentials exist
          if (response.config.username && response.config.accessKey) {
            this.loadMasterData();
          }
        }
      });
  }

  private patchFormWithConfig(config: any): void {
    this.siigoForm.patchValue({
      username: config.username || '',
      // accessKey is not returned from backend for security
      partnerId: config.partnerId || 'Katuq',
      testMode: config.testMode || false,
      defaultWarehouse: config.defaultWarehouse || '',
      defaultCostCenter: config.defaultCostCenter || '',
      documentTypeId: config.documentTypeId || '',
      defaultPaymentTypeId: config.defaultPaymentTypeId || '',
      defaultPriceList: config.defaultPriceList || 1,
      defaultTaxRate: config.defaultTaxRate || 19,
      tax0Id: config.tax0Id || '',
      tax5Id: config.tax5Id || '',
      tax19Id: config.tax19Id || '',
      enableAutoInvoicing: config.enableAutoInvoicing || false,
      autoSyncInventory: config.autoSyncInventory || false,
      syncFrequency: config.syncFrequency || 'manual'
    });

    if (config.accountsMapping) {
      this.siigoForm.get('accountsMapping')?.patchValue(config.accountsMapping);
    }

    if (config.paymentMethodsMapping) {
      this.siigoForm.get('paymentMethodsMapping')?.patchValue(config.paymentMethodsMapping);
    }
  }

  testConnection(): void {
    // Debug: Log form state before validation
    console.log('=== testConnection called ===');
    console.log('username value:', this.siigoForm.get('username')?.value);
    console.log('accessKey value:', this.siigoForm.get('accessKey')?.value);
    console.log('username valid:', !this.siigoForm.get('username')?.invalid);
    console.log('accessKey valid:', !this.siigoForm.get('accessKey')?.invalid);
    console.log('Full form value:', this.siigoForm.value);
    console.log('Full form getRawValue:', this.siigoForm.getRawValue());

    if (this.siigoForm.get('username')?.invalid || this.siigoForm.get('accessKey')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Ingresa usuario y Access Key para probar conexión'
      });
      return;
    }

    this.connectionStatus = 'testing';
    this.connectionMessage = 'Probando conexión con Siigo...';

    const credentials = {
      username: this.siigoForm.get('username')?.value,
      accessKey: this.siigoForm.get('accessKey')?.value,
      partnerId: 'Katuq'
    };

    console.log('Credentials to send:', credentials);

    this.integrationsService.testSiigoConnection(credentials)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          return of({ success: false, message: error.error?.message || error.message || 'Error de conexión' });
        })
      )
      .subscribe(result => {
        if (result.success) {
          this.connectionStatus = 'success';
          this.connectionMessage = result.message || 'Conexión exitosa con Siigo';
          this.messageService.add({
            severity: 'success',
            summary: 'Conexión exitosa',
            detail: 'Las credenciales de Siigo son válidas'
          });

          // Auto-load master data on successful connection
          this.loadMasterData();
        } else {
          this.connectionStatus = 'error';
          this.connectionMessage = result.message || 'Error de conexión';
          this.messageService.add({
            severity: 'error',
            summary: 'Error de conexión',
            detail: result.message || 'No se pudo conectar con Siigo'
          });
        }
      });
  }

  loadMasterData(): void {
    this.isLoadingMasterData = true;

    forkJoin({
      costCenters: this.integrationsService.getSiigoCostCenters().pipe(catchError(() => of({ data: [] }))),
      documentTypes: this.integrationsService.getSiigoDocumentTypes().pipe(catchError(() => of({ data: [] }))),
      paymentTypes: this.integrationsService.getSiigoPaymentTypes().pipe(catchError(() => of({ data: [] }))),
      taxes: this.integrationsService.getSiigoTaxes().pipe(catchError(() => of({ data: [] }))),
      priceLists: this.integrationsService.getSiigoPriceLists().pipe(catchError(() => of({ data: [] }))),
      accountGroups: this.integrationsService.getSiigoAccountGroups().pipe(catchError(() => of({ data: [] }))),
      warehouses: this.integrationsService.getSiigoWarehouses().pipe(catchError(() => of({ data: [] })))
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoadingMasterData = false)
    )
    .subscribe(results => {
      this.masterData = {
        costCenters: results.costCenters?.data || [],
        documentTypes: results.documentTypes?.data || [],
        paymentTypes: results.paymentTypes?.data || [],
        taxes: results.taxes?.data || [],
        priceLists: results.priceLists?.data || [],
        accountGroups: results.accountGroups?.data || [],
        warehouses: results.warehouses?.data || []
      };

      this.messageService.add({
        severity: 'info',
        summary: 'Datos cargados',
        detail: 'Datos maestros de Siigo cargados correctamente'
      });
    });
  }

  saveConfig(): void {
    // Debug logging
    console.log('=== saveConfig called ===');
    console.log('Form valid:', !this.siigoForm.invalid);
    console.log('Form errors:', this.siigoForm.errors);
    console.log('Connection status:', this.connectionStatus);
    console.log('Form raw value:', this.siigoForm.getRawValue());
    console.log('Form value:', this.siigoForm.value);

    // Log individual control values
    console.log('username control value:', this.siigoForm.get('username')?.value);
    console.log('accessKey control value:', this.siigoForm.get('accessKey')?.value);

    if (this.siigoForm.invalid) {
      this.siigoForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    if (this.connectionStatus !== 'success') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Conexión no verificada',
        detail: 'Por favor prueba la conexión antes de guardar'
      });
      return;
    }

    this.isSaving = true;

    const formValue = this.siigoForm.getRawValue();
    console.log('formValue after getRawValue:', formValue);

    const config = {
      username: formValue.username,
      accessKey: formValue.accessKey,
      partnerId: 'Katuq',
      testMode: formValue.testMode,
      defaultWarehouse: formValue.defaultWarehouse,
      defaultCostCenter: formValue.defaultCostCenter,
      documentTypeId: formValue.documentTypeId,
      defaultPaymentTypeId: formValue.defaultPaymentTypeId,
      defaultPriceList: formValue.defaultPriceList,
      defaultTaxRate: formValue.defaultTaxRate,
      tax0Id: formValue.tax0Id,
      tax5Id: formValue.tax5Id,
      tax19Id: formValue.tax19Id,
      enableAutoInvoicing: formValue.enableAutoInvoicing,
      autoSyncInventory: formValue.autoSyncInventory,
      syncFrequency: formValue.syncFrequency,
      accountsMapping: formValue.accountsMapping,
      paymentMethodsMapping: formValue.paymentMethodsMapping
    };

    console.log('Config to save:', config);

    this.integrationsService.saveSiigoConfig(config)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSaving = false)
      )
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Configuración guardada',
            detail: 'La configuración de Siigo se guardó correctamente'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Error al guardar configuración'
          });
        }
      });
  }

  syncProducts(): void {
    if (this.connectionStatus !== 'success') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Conexión requerida',
        detail: 'Primero verifica la conexión con Siigo'
      });
      return;
    }

    this.isSyncing = true;
    this.syncProgress = 0;
    this.syncResult = null;

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (this.syncProgress < 90) {
        this.syncProgress += 10;
      }
    }, 500);

    const options = {
      updateExisting: true,
      batchSize: 50
    };

    this.integrationsService.syncSiigoProducts(options)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          clearInterval(progressInterval);
          this.syncProgress = 100;
          this.isSyncing = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.syncResult = response.summary || response;
          this.messageService.add({
            severity: 'success',
            summary: 'Sincronización completada',
            detail: `${this.syncResult?.total || 0} productos procesados`
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error de sincronización',
            detail: error.error?.message || 'Error al sincronizar productos'
          });
        }
      });
  }

  getConnectionStatusIcon(): string {
    switch (this.connectionStatus) {
      case 'idle': return 'pi-circle';
      case 'testing': return 'pi-spin pi-spinner';
      case 'success': return 'pi-check-circle';
      case 'error': return 'pi-times-circle';
      default: return 'pi-circle';
    }
  }

  getConnectionStatusClass(): string {
    switch (this.connectionStatus) {
      case 'idle': return 'idle';
      case 'testing': return 'testing';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'idle';
    }
  }

  getConnectionStatusMessage(): string {
    switch (this.connectionStatus) {
      case 'idle': return 'Sin conexión verificada';
      case 'testing': return 'Probando conexión...';
      case 'success': return this.connectionMessage || 'Conexión exitosa con Siigo';
      case 'error': return this.connectionMessage || 'Error en la conexión con Siigo';
      default: return 'Sin conexión verificada';
    }
  }

  // Frequency options for dropdown
  syncFrequencyOptions = [
    { label: 'Manual', value: 'manual' },
    { label: 'Cada hora', value: 'hourly' },
    { label: 'Diariamente', value: 'daily' },
    { label: 'Semanalmente', value: 'weekly' }
  ];

}
