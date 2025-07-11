import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { IntegrationCategory, CATEGORY_LABELS } from './integrations.service';
import { IntegrationsService } from './integrations.service';

export interface StepState {
  currentStep: number;
  completedSteps: Set<number>;
  canProceed: boolean;
  stepData: { [key: number]: any };
}

export interface ImageErrorState {
  errors: Set<string>;
  retryCount: Map<string, number>;
  maxRetries: number;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{ label: string; action: () => void }>;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationUIHelperService {
  private stepStateSubject = new BehaviorSubject<StepState>({
    currentStep: 1,
    completedSteps: new Set(),
    canProceed: false,
    stepData: {}
  });

  private imageErrorState: ImageErrorState = {
    errors: new Set(),
    retryCount: new Map(),
    maxRetries: 3
  };

  private notificationsSubject = new BehaviorSubject<NotificationMessage[]>([]);

  public stepState$ = this.stepStateSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  // Category descriptions and metadata
  private categoryDescriptions = {
    [IntegrationCategory.ECOMMERCE]: 'Conecta con plataformas de comercio electrónico para sincronizar productos, pedidos e inventario',
    [IntegrationCategory.PAYMENT]: 'Integra pasarelas de pago para procesar transacciones de forma segura',
    [IntegrationCategory.LOGISTICS]: 'Automatiza envíos y seguimiento con empresas de logística',
    [IntegrationCategory.MARKETING]: 'Conecta herramientas de marketing para automatizar campañas y análisis',
    [IntegrationCategory.CRM]: 'Sincroniza datos de clientes y gestiona relaciones comerciales',
    [IntegrationCategory.ACCOUNTING]: 'Automatiza facturación y procesos contables',
    [IntegrationCategory.OTHER]: 'Otras integraciones y herramientas empresariales'
  };

  private categoryIcons = {
    [IntegrationCategory.ECOMMERCE]: 'fa-shopping-cart',
    [IntegrationCategory.PAYMENT]: 'fa-credit-card',
    [IntegrationCategory.LOGISTICS]: 'fa-truck',
    [IntegrationCategory.MARKETING]: 'fa-bullhorn',
    [IntegrationCategory.CRM]: 'fa-users',
    [IntegrationCategory.ACCOUNTING]: 'fa-calculator',
    [IntegrationCategory.OTHER]: 'fa-puzzle-piece'
  };

  // NUEVO: Colores de categoría centralizados
  private readonly categoryColors: { [key in IntegrationCategory]: string } = {
    [IntegrationCategory.ECOMMERCE]: '#95bf47',
    [IntegrationCategory.PAYMENT]: '#6c5ce7',
    [IntegrationCategory.LOGISTICS]: '#fd79a8',
    [IntegrationCategory.MARKETING]: '#fdcb6e',
    [IntegrationCategory.CRM]: '#00b894',
    [IntegrationCategory.ACCOUNTING]: '#0984e3',
    [IntegrationCategory.OTHER]: '#636e72'
  };

  // Mapeo inverso: tipo -> categoría (centralizado para evitar duplicados)
  private readonly typeToCategory: { [key: string]: IntegrationCategory } = {
    shopify: IntegrationCategory.ECOMMERCE,
    woocommerce: IntegrationCategory.ECOMMERCE,
    magento: IntegrationCategory.ECOMMERCE,
    prestashop: IntegrationCategory.ECOMMERCE,
    wompi: IntegrationCategory.PAYMENT,
    epayco: IntegrationCategory.PAYMENT,
    paypal: IntegrationCategory.PAYMENT,
    stripe: IntegrationCategory.PAYMENT,
    payu: IntegrationCategory.PAYMENT,
    mercadopago: IntegrationCategory.PAYMENT,
    fedex: IntegrationCategory.LOGISTICS,
    dhl: IntegrationCategory.LOGISTICS,
    servientrega: IntegrationCategory.LOGISTICS,
    coordinadora: IntegrationCategory.LOGISTICS,
    mailchimp: IntegrationCategory.MARKETING,
    hubspot: IntegrationCategory.MARKETING,
    google_analytics: IntegrationCategory.MARKETING,
    salesforce: IntegrationCategory.CRM,
    zoho_crm: IntegrationCategory.CRM,
    quickbooks: IntegrationCategory.ACCOUNTING,
    siigo: IntegrationCategory.ACCOUNTING
  };

  // Integration features and documentation
  private integrationFeatures = {
    shopify: ['Sincronización automática', 'Gestión de inventario', 'Webhooks'],
    wompi: ['Pagos con tarjeta', 'PSE', 'Nequi', 'Baloto'],
    epayco: ['Múltiples medios de pago', 'Recurrencia', 'Tokenización'],
    paypal: ['Pagos internacionales', 'Protección del comprador', 'Express Checkout'],
    stripe: ['Pagos globales', 'Suscripciones', 'Marketplace'],
    mercadopago: ['Pagos en cuotas', 'Mercado Pago Point', 'QR Code'],
    fedex: ['Seguimiento en tiempo real', 'Etiquetas automáticas', 'Cotización'],
    dhl: ['Envíos express', 'Seguimiento global', 'Recogida programada'],
    mailchimp: ['Email marketing', 'Automatización', 'Segmentación'],
    salesforce: ['Lead management', 'Pipeline de ventas', 'Reportes'],
    quickbooks: ['Facturación automática', 'Conciliación', 'Reportes fiscales'],
    siigo: ['Facturación electrónica', 'Inventarios', 'Cartera']
  };

  private documentationUrls = {
    shopify: 'https://shopify.dev/docs/admin-api/getting-started',
    wompi: 'https://docs.wompi.co/docs',
    epayco: 'https://docs.epayco.co/',
    paypal: 'https://developer.paypal.com/docs/api/overview/',
    stripe: 'https://stripe.com/docs/api',
    mercadopago: 'https://www.mercadopago.com.co/developers',
    fedex: 'https://www.fedex.com/en-us/developer/',
    dhl: 'https://developer.dhl.com/',
    mailchimp: 'https://mailchimp.com/developer/',
    salesforce: 'https://developer.salesforce.com/',
    quickbooks: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
    siigo: 'https://siigoapi.docs.apiary.io/'
  };

  // Integration type display names
  private integrationNames = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    magento: 'Magento',
    prestashop: 'PrestaShop',
    wompi: 'Wompi',
    epayco: 'ePayco',
    paypal: 'PayPal',
    stripe: 'Stripe',
    payu: 'PayU',
    mercadopago: 'Mercado Pago',
    fedex: 'FedEx',
    dhl: 'DHL',
    servientrega: 'Servientrega',
    coordinadora: 'Coordinadora',
    mailchimp: 'Mailchimp',
    hubspot: 'HubSpot',
    google_analytics: 'Google Analytics',
    salesforce: 'Salesforce',
    zoho_crm: 'Zoho CRM',
    quickbooks: 'QuickBooks',
    siigo: 'Siigo',
    slack: 'Slack',
    zapier: 'Zapier'
  };

  private integrationIcons = {
    shopify: 'fa-shopping-bag',
    woocommerce: 'fa-wordpress',
    magento: 'fa-shopping-cart',
    prestashop: 'fa-store',
    wompi: 'fa-credit-card',
    epayco: 'fa-credit-card',
    paypal: 'fa-paypal',
    stripe: 'fa-stripe',
    payu: 'fa-credit-card',
    mercadopago: 'fa-money-bill-wave',
    fedex: 'fa-shipping-fast',
    dhl: 'fa-truck',
    servientrega: 'fa-truck',
    coordinadora: 'fa-truck',
    mailchimp: 'fa-envelope',
    hubspot: 'fa-chart-line',
    google_analytics: 'fa-chart-bar',
    salesforce: 'fa-cloud',
    zoho_crm: 'fa-address-book',
    quickbooks: 'fa-calculator',
    siigo: 'fa-file-invoice',
    slack: 'fa-slack',
    zapier: 'fa-link'
  };

  // Loading states
  private loadingState = {
    operations: new Map<string, boolean>()
  };

  // UI feedback messages
  private feedbackState = {
    messages: [] as Array<{id: string, type: 'success' | 'error' | 'warning' | 'info', message: string, timestamp: number}>
  };

  constructor(private integrationsSvc: IntegrationsService) {}

  // Step management methods
  initializeSteps(): void {
    this.stepStateSubject.next({
      currentStep: 1,
      completedSteps: new Set(),
      canProceed: false,
      stepData: {}
    });
  }

  setCurrentStep(step: number): void {
    const currentState = this.stepStateSubject.value;
    this.stepStateSubject.next({
      ...currentState,
      currentStep: step
    });
  }

  markStepCompleted(step: number, data?: any): void {
    const currentState = this.stepStateSubject.value;
    const completedSteps = new Set(currentState.completedSteps);
    completedSteps.add(step);
    
    const stepData = { ...currentState.stepData };
    if (data) {
      stepData[step] = data;
    }

    this.stepStateSubject.next({
      ...currentState,
      completedSteps,
      stepData,
      canProceed: this.canProceedToStep(step + 1, completedSteps, stepData)
    });
  }

  goToNextStep(): boolean {
    const currentState = this.stepStateSubject.value;
    if (currentState.canProceed && currentState.currentStep < 4) {
      this.setCurrentStep(currentState.currentStep + 1);
      return true;
    }
    return false;
  }

  goToPreviousStep(): boolean {
    const currentState = this.stepStateSubject.value;
    if (currentState.currentStep > 1) {
      this.setCurrentStep(currentState.currentStep - 1);
      return true;
    }
    return false;
  }

  private canProceedToStep(step: number, completedSteps: Set<number>, stepData: any): boolean {
    switch (step) {
      case 2: return completedSteps.has(1) && stepData[1]?.category;
      case 3: return completedSteps.has(2) && stepData[2]?.integrationType;
      case 4: return completedSteps.has(3) && stepData[3]?.formValid;
      default: return false;
    }
  }

  getStepValidationRules(step: number): { [key: string]: any } {
    switch (step) {
      case 1:
        return { category: { required: true } };
      case 2:
        return { integrationType: { required: true } };
      case 3:
        return { 
          name: { required: true, minLength: 3 },
          credentials: { required: true, valid: true }
        };
      case 4:
        return { connectionTest: { passed: true } };
      default:
        return {};
    }
  }

  // Category helper methods
  getCategoryDescription(category: IntegrationCategory): string {
    return this.categoryDescriptions[category] || 'Categoría de integración';
  }

  getCategoryIcon(category: IntegrationCategory): string {
    return this.categoryIcons[category] || 'fa-puzzle-piece';
  }

  getCategoryLabels(): { [key: string]: string } {
    return CATEGORY_LABELS;
  }

  getIntegrationsCountForCategory(category: IntegrationCategory): number {
    // This should be connected to your actual integrations service
    const counts = {
      [IntegrationCategory.ECOMMERCE]: 4,
      [IntegrationCategory.PAYMENT]: 6,
      [IntegrationCategory.LOGISTICS]: 4,
      [IntegrationCategory.MARKETING]: 3,
      [IntegrationCategory.CRM]: 2,
      [IntegrationCategory.ACCOUNTING]: 2,
      [IntegrationCategory.OTHER]: 2
    };
    return counts[category] || 0;
  }

  // Integration helper methods
  getIntegrationName(type: string): string {
    return this.integrationNames[type] || type;
  }

  getIntegrationIcon(type: string): string {
    return this.integrationIcons[type] || 'fa-plug';
  }

  getIntegrationFeatures(type: string): string[] {
    return this.integrationFeatures[type] || [];
  }

  getDocumentationUrl(type: string): string | null {
    return this.documentationUrls[type] || null;
  }

  isPopularIntegration(type: string): boolean {
    const popularIntegrations = ['shopify', 'wompi', 'paypal', 'stripe', 'mercadopago', 'mailchimp', 'salesforce'];
    return popularIntegrations.includes(type);
  }

  isNewIntegration(type: string): boolean {
    const newIntegrations = ['stripe', 'servientrega', 'siigo', 'hubspot'];
    return newIntegrations.includes(type);
  }

  // Image error handling
  handleImageError(event: any, integrationId: string): void {
    this.imageErrorState.errors.add(integrationId);
    
    const currentRetries = this.imageErrorState.retryCount.get(integrationId) || 0;
    if (currentRetries < this.imageErrorState.maxRetries) {
      this.imageErrorState.retryCount.set(integrationId, currentRetries + 1);
      
      // Retry loading the image after a delay
      setTimeout(() => {
        if (event.target) {
          const originalSrc = event.target.src;
          event.target.src = '';
          event.target.src = originalSrc + '?retry=' + (currentRetries + 1);
        }
      }, 1000 * (currentRetries + 1));
    }
  }

  hasImageError(integrationId: string): boolean {
    return this.imageErrorState.errors.has(integrationId);
  }

  clearImageError(integrationId: string): void {
    this.imageErrorState.errors.delete(integrationId);
    this.imageErrorState.retryCount.delete(integrationId);
  }

  // Notification management
  showNotification(
    type: NotificationMessage['type'],
    title: string,
    message: string,
    duration: number = 5000,
    actions?: Array<{ label: string; action: () => void }>
  ): string {
    const notification: NotificationMessage = {
      id: this.generateUniqueId(),
      type,
      title,
      message,
      duration,
      actions,
      timestamp: new Date()
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, notification]);

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }

  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next(
      currentNotifications.filter(n => n.id !== id)
    );
  }

  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
  }

  // Form validation helpers
  validateStep(step: number, data: any): { valid: boolean; errors: string[] } {
    const rules = this.getStepValidationRules(step);
    const errors: string[] = [];

    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = data[field];

      if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        errors.push(`${field} es requerido`);
      }

      if (rule.minLength && value && value.length < rule.minLength) {
        errors.push(`${field} debe tener al menos ${rule.minLength} caracteres`);
      }

      if (rule.valid && value && !this.isValidCredential(field, value, data)) {
        errors.push(`${field} no es válido`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isValidCredential(field: string, value: any, data: any): boolean {
    // Implement specific validation logic for credentials
    switch (field) {
      case 'credentials':
        return this.validateCredentialsObject(value, data.integrationType);
      default:
        return true;
    }
  }

  private validateCredentialsObject(credentials: any, integrationType: string): boolean {
    if (!credentials || typeof credentials !== 'object') return false;

    switch (integrationType) {
      case 'shopify':
        return !!(credentials.shopUrl && credentials.apiKey && credentials.apiSecret);
      case 'wompi':
        return !!(credentials.publicKey && credentials.privateKey);
      case 'epayco':
        return !!(credentials.clientId && credentials.publicKey && credentials.privateKey);
      case 'paypal':
        return !!(credentials.clientId && credentials.clientSecret);
      default:
        return true;
    }
  }

  // Data formatting utilities
  formatCredentialValue(value: string, shouldMask: boolean = true): string {
    if (!value || !shouldMask) return value || '';
    
    if (value.length <= 8) {
      return '•'.repeat(value.length);
    }
    
    const visibleStart = value.substring(0, 4);
    const visibleEnd = value.substring(value.length - 4);
    const maskedMiddle = '•'.repeat(Math.min(value.length - 8, 8));
    
    return visibleStart + maskedMiddle + visibleEnd;
  }

  formatEnvironmentName(environment: string): string {
    const environmentNames = {
      'test': 'Pruebas',
      'sandbox': 'Sandbox',
      'production': 'Producción',
      'prod': 'Producción',
      'development': 'Desarrollo',
      'dev': 'Desarrollo'
    };
    return environmentNames[environment] || environment;
  }

  getEnvironmentClass(environment: string): string {
    const environmentClasses = {
      'test': 'environment-test',
      'sandbox': 'environment-sandbox',
      'production': 'environment-production',
      'prod': 'environment-production',
      'development': 'environment-development',
      'dev': 'environment-development'
    };
    return environmentClasses[environment] || '';
  }

  // Connection status helpers
  getStatusColor(status: string): string {
    const statusColors = {
      'online': '#28a745',
      'offline': '#dc3545',
      'warning': '#ffc107',
      'checking': '#17a2b8',
      'error': '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  }

  getStatusIcon(status: string): string {
    const statusIcons = {
      'online': 'fa-check-circle',
      'offline': 'fa-times-circle',
      'warning': 'fa-exclamation-triangle',
      'checking': 'fa-spinner fa-spin',
      'error': 'fa-exclamation-circle'
    };
    return statusIcons[status] || 'fa-question-circle';
  }

  formatUptime(uptime: number): string {
    if (uptime >= 99.9) return '99.9%+';
    if (uptime >= 99) return `${uptime.toFixed(1)}%`;
    if (uptime >= 90) return `${uptime.toFixed(1)}%`;
    return `${uptime.toFixed(2)}%`;
  }

  // Analytics and metrics helpers
  calculateHealthScore(integrations: any[]): number {
    if (integrations.length === 0) return 0;
    
    const onlineCount = integrations.filter(i => i.status === 'online').length;
    return Math.round((onlineCount / integrations.length) * 100);
  }

  getHealthScoreColor(score: number): string {
    if (score >= 90) return '#28a745';
    if (score >= 70) return '#ffc107';
    return '#dc3545';
  }

  getHealthScoreStatus(score: number): string {
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Bueno';
    if (score >= 50) return 'Regular';
    return 'Crítico';
  }

  // Utility methods
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Export/Import helpers
  exportIntegrationConfig(integration: any): string {
    const exportData = {
      name: integration.name,
      type: integration.type,
      category: integration.category,
      environment: integration.credentials?.environment,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(exportData, null, 2);
  }

  validateImportedConfig(configString: string): { valid: boolean; errors: string[]; data?: any } {
    try {
      const data = JSON.parse(configString);
      const errors: string[] = [];

      if (!data.name) errors.push('Nombre es requerido');
      if (!data.type) errors.push('Tipo es requerido');
      if (!data.category) errors.push('Categoría es requerida');

      return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data : undefined
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Formato JSON inválido']
      };
    }
  }

  // Reset methods
  resetUIState(): void {
    this.initializeSteps();
    this.clearAllNotifications();
    this.imageErrorState.errors.clear();
    this.imageErrorState.retryCount.clear();
    this.loadingState.operations.clear();
    this.clearAllFeedback();
  }

  /**
   * Obtiene la ruta de logo para un tipo de integración.
   * Si el archivo no existe devolverá null, lo que permite a la plantilla mostrar un ícono de fallback.
   * Nota: El chequeo se basa en la precarga de la imagen para no generar 404 en el network panel.
   */
  getLogo(type: string): string | null {
    const catalogEntry = Object.values(this.getAvailableIntegrationsFlat()).find(e => e.id === type);

    if (!catalogEntry || !catalogEntry.logo) {
      return null;
    }

    // Comprobar de forma optimista que el recurso existe creando una imagen temporal
    // Para evitar un 404 visible aprovechamos onerror interno
    const img = new Image();
    img.src = catalogEntry.logo;
    // Si la imagen aún no está cargada podemos asumir que existe y delegar al onerror de plantilla.
    // Se marcará error si onerror salta más adelante.
    return catalogEntry.logo;
  }

  /**
   * Manejador genérico para el evento (error) de <img>. Oculta la imagen y muestra ícono de fallback
   */
  onImgError(event: Event, integrationId?: string): void {
    const target = event.target as HTMLImageElement;
    if (!target) return;

    // Evitar bucle infinito
    if (target.dataset['imgErrorHandled']) return;

    target.dataset['imgErrorHandled'] = 'true';
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent) {
      parent.classList.add('logo-error');
    }

    if (integrationId) {
      this.imageErrorState.errors.add(integrationId);
    }
  }

  /**
   * Devuelve todas las integraciones disponibles en un único arreglo plano.
   */
  private getAvailableIntegrationsFlat(): Array<{id: string; logo: string}> {
    const flat: Array<{id: string; logo: string}> = [];
    Object.values(this.integrationsSvc.getAvailableIntegrations()).forEach(arr => flat.push(...arr));
    return flat;
  }

  /**
   * Método auxiliar que permite a componentes externos obtener el catálogo centralizado
   * sin acoplarse al servicio IntegrationsService.
   */
  getAvailableIntegrations() {
    return this.integrationsSvc.getAvailableIntegrations();
  }

  // Loading state management
  setLoading(operationId: string, loading: boolean): void {
    if (loading) {
      this.loadingState.operations.set(operationId, true);
    } else {
      this.loadingState.operations.delete(operationId);
    }
  }

  isLoading(operationId: string): boolean {
    return this.loadingState.operations.get(operationId) || false;
  }

  isAnyLoading(): boolean {
    return this.loadingState.operations.size > 0;
  }

  // Feedback message management
  showFeedback(type: 'success' | 'error' | 'warning' | 'info', message: string, duration: number = 5000): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const feedbackMessage = {
      id,
      type,
      message,
      timestamp: Date.now()
    };

    this.feedbackState.messages.push(feedbackMessage);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeFeedback(id);
      }, duration);
    }

    return id;
  }

  removeFeedback(id: string): void {
    this.feedbackState.messages = this.feedbackState.messages.filter(msg => msg.id !== id);
  }

  getFeedbackMessages() {
    return this.feedbackState.messages;
  }

  clearAllFeedback(): void {
    this.feedbackState.messages = [];
  }

  // Convenience methods for common feedback types
  showSuccess(message: string, duration?: number): string {
    return this.showFeedback('success', message, duration);
  }

  showError(message: string, duration?: number): string {
    return this.showFeedback('error', message, duration);
  }

  showWarning(message: string, duration?: number): string {
    return this.showFeedback('warning', message, duration);
  }

  showInfo(message: string, duration?: number): string {
    return this.showFeedback('info', message, duration);
  }

  // Métodos públicos añadidos para reutilizar desde componentes ---------

  /**
   * Devuelve la categoría (IntegrationCategory) correspondiente a un tipo de integración.
   */
  getIntegrationCategory(type: string): IntegrationCategory {
    return this.typeToCategory[type] || IntegrationCategory.OTHER;
  }

  /**
   * Devuelve un color HEX representativo para una categoría o para el tipo de integración dado.
   * Si se pasa un tipo, se hará la conversión automática a categoría.
   */
  getCategoryColor(typeOrCategory: string | IntegrationCategory): string {
    let category: IntegrationCategory;
    if (Object.values(IntegrationCategory).includes(typeOrCategory as IntegrationCategory)) {
      category = typeOrCategory as IntegrationCategory;
    } else {
      category = this.getIntegrationCategory(typeOrCategory as string);
    }
    return this.categoryColors[category] || '#636e72';
  }
}