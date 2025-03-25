import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IntegrationsService, Integration, IntegrationCategory, CATEGORY_LABELS } from './integrations.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-integrations',
  templateUrl: './integrations.component.html',
  styleUrls: ['./integrations.component.css']
})
export class IntegrationsComponent implements OnInit {
  @Input() integrationToEdit: Integration | null = null;
  @Input() isModalMode = true;
  @Input() preselectedCategory: IntegrationCategory | null = null; // Nueva propiedad

  // Acceder a las constantes de categoría
  categories = Object.values(IntegrationCategory);
  categoryLabels = CATEGORY_LABELS;
  
  // Integraciones disponibles agrupadas por categoría
  availableIntegrations: { [category: string]: Array<{id: string, name: string, description: string, logo: string}> } = {};
  
  // Categoría actualmente seleccionada
  selectedCategory: IntegrationCategory = IntegrationCategory.ECOMMERCE;

  integrationTypes = [
    { id: 'shopify', name: 'Shopify', logo: 'assets/images/logos/shopify.png' },
    { id: 'wompi', name: 'Wompi', logo: 'assets/images/logos/wompi.png' },
    { id: 'epayco', name: 'ePayco', logo: 'assets/images/logos/epayco.png' },
    { id: 'paypal', name: 'PayPal', logo: 'assets/images/logos/paypal.png' }
  ];
  
  selectedIntegrationType = 'shopify';
  integrationForm: FormGroup;
  
  savedIntegrations: Integration[] = [];
  editingIntegrationId: string | null = null;
  
  isTestMode = true;
  isSaving = false;
  isTesting = false;
  
  statusMessage: { type: 'success' | 'error', message: string } | null = null;

  constructor(
    private fb: FormBuilder,
    private integrationsService: IntegrationsService,
    public activeModal?: NgbActiveModal
  ) {
    this.integrationForm = this.createShopifyForm();
  }

  ngOnInit(): void {
    // Cargar integraciones disponibles
    this.availableIntegrations = this.integrationsService.getAvailableIntegrations();
    
    // Si hay una categoría preseleccionada
    if (this.preselectedCategory) {
      this.selectedCategory = this.preselectedCategory;
      if (this.availableIntegrations[this.preselectedCategory]?.length > 0) {
        // Seleccionar la primera integración de la categoría
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
    this.resetForm();
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
    }
    
    this.statusMessage = null;
    this.editingIntegrationId = null;
  }

  editIntegration(integration: Integration): void {
    this.selectedIntegrationType = integration.type;
    this.editingIntegrationId = integration.id!;
    
    // Cargar datos en el formulario según el tipo
    switch (integration.type) {
      case 'shopify':
        this.integrationForm = this.createShopifyForm();
        this.integrationForm.patchValue({
          name: integration.name,
          enabled: integration.enabled,
          shopUrl: integration.credentials.shopUrl,
          apiKey: integration.credentials.apiKey,
          apiSecret: integration.credentials.apiSecret,
          apiVersion: integration.credentials.apiVersion || '2023-01'
        });
        break;
      case 'wompi':
        this.integrationForm = this.createWompiForm();
        this.integrationForm.patchValue({
          name: integration.name,
          enabled: integration.enabled,
          publicKey: integration.credentials.publicKey,
          privateKey: integration.credentials.privateKey,
          eventKey: integration.credentials.eventKey,
          integrityKey: integration.credentials.integrityKey,
          redirectUrl: integration.credentials.redirectUrl
        });
        this.isTestMode = integration.credentials.environment === 'test';
        break;
      // Agregar otros casos para los demás tipos
    }
  }

  testExistingIntegration(integration: Integration): void {
    this.isTesting = true;
    this.integrationsService.testIntegration(integration).subscribe({
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
      name: ['Shopify', Validators.required],
      enabled: [true],
      shopUrl: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)]],
      apiKey: ['', Validators.required],
      apiSecret: ['', Validators.required],
      apiVersion: ['2023-01']
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

  onSubmit(): void {
    if (this.integrationForm.invalid) {
      this.integrationForm.markAllAsTouched();
      return;
    }
    
    const formData = this.integrationForm.value;
    let credentials: any = {};
    
    // Build credentials object based on integration type
    switch (this.selectedIntegrationType) {
      case 'shopify':
        credentials = {
          shopUrl: formData.shopUrl,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
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
    }
    
    const integration: Integration = {
      type: this.selectedIntegrationType,
      name: formData.name,
      enabled: formData.enabled,
      category: this.getCategoryForType(this.selectedIntegrationType), // Asignar categoría
      credentials
    };
    
    this.isSaving = true;
    
    // Update or create
    if (this.editingIntegrationId) {
      this.integrationsService.updateIntegration(this.editingIntegrationId, integration).subscribe({
        next: (updated) => {
          this.handleSaveSuccess(updated, 'Integración actualizada correctamente');
          if (this.isModalMode && this.activeModal) {
            this.activeModal.close('success');
          }
        },
        error: (error) => {
          this.handleSaveError(error);
        }
      });
    } else {
      this.integrationsService.createIntegration(integration).subscribe({
        next: (created) => {
          this.handleSaveSuccess(created, 'Integración creada correctamente');
          if (this.isModalMode && this.activeModal) {
            this.activeModal.close('success');
          }
        },
        error: (error) => {
          this.handleSaveError(error);
        }
      });
    }
  }
  
  testConnection(): void {
    if (this.integrationForm.invalid) {
      this.integrationForm.markAllAsTouched();
      return;
    }
    
    const formData = this.integrationForm.value;
    let credentials: any = {};
    
    // Similar a onSubmit(), prepara las credenciales según el tipo
    switch (this.selectedIntegrationType) {
      case 'shopify':
        credentials = {
          shopUrl: formData.shopUrl,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret
        };
        break;
      // Repeat for other types
      case 'wompi':
        credentials = {
          publicKey: formData.publicKey,
          privateKey: formData.privateKey,
          environment: this.isTestMode ? 'test' : 'production'
        };
        break;
      case 'epayco':
        credentials = {
          publicKey: formData.publicKey,
          privateKey: formData.privateKey,
          clientId: formData.clientId,
          environment: this.isTestMode ? 'test' : 'production'
        };
        break;
      case 'paypal':
        credentials = {
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          environment: this.isTestMode ? 'sandbox' : 'production'
        };
        break;
    }
    
    const integration: Integration = {
      type: this.selectedIntegrationType,
      name: formData.name,
      enabled: formData.enabled,
      category: this.getCategoryForType(this.selectedIntegrationType), // Añadir la categoría
      credentials
    };
    
    this.isTesting = true;
    this.integrationsService.testIntegration(integration).subscribe({
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

  // Método para obtener el ícono de una categoría
  getCategoryIcon(category: string): string {
    const icons = {
      [IntegrationCategory.ECOMMERCE]: 'fa-shopping-cart',
      [IntegrationCategory.PAYMENT]: 'fa-credit-card',
      [IntegrationCategory.LOGISTICS]: 'fa-truck',
      [IntegrationCategory.MARKETING]: 'fa-bullhorn',
      [IntegrationCategory.CRM]: 'fa-users',
      [IntegrationCategory.ACCOUNTING]: 'fa-calculator',
      [IntegrationCategory.OTHER]: 'fa-puzzle-piece'
    };
    return icons[category] || 'fa-plug';
  }
  
  // Método para cambiar la categoría seleccionada
  selectCategory(category: IntegrationCategory): void {
    this.selectedCategory = category;
  }
}
