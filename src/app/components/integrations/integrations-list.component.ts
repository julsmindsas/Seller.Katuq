import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationsService, Integration, IntegrationCategory, CATEGORY_LABELS } from './integrations.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IntegrationsComponent } from './integrations.component';
import { Subject, Subscription, timer } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

interface Toast {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Component({
  selector: 'app-integrations-list',
  templateUrl: './integrations-list.component.html',
  styleUrls: ['./integrations-list.component.css']
})
export class IntegrationsListComponent implements OnInit, OnDestroy {
  integrations: Integration[] = [];
  loading = true;
  errorMessage: string | null = null;
  searchTerm = '';

  // Nueva propiedad para las integraciones agrupadas por categoría
  groupedIntegrations: { [category: string]: Integration[] } = {};

  // Categorías disponibles
  categories = Object.values(IntegrationCategory);
  categoryLabels = CATEGORY_LABELS;

  // Integraciones disponibles para añadir
  availableIntegrations: { [category: string]: any[] } = {};

  viewMode: 'grid' | 'list' = 'grid'; // Modo de visualización
  filterCategory: string = ''; // Categoría seleccionada
  filterStatus: string = ''; // Estado seleccionado
  sortField: string = 'updatedAt'; // Campo de ordenación
  sortDirection: 'asc' | 'desc' = 'desc'; // Dirección de ordenación
  showTutorial: boolean = false; // Mostrar tutorial
  toast: Toast | null = null; // Notificación toast

  private destroy$ = new Subject<void>();
  private toastTimer: Subscription | null = null;

  constructor(
    private integrationsService: IntegrationsService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    this.loadIntegrations();
    // Cargar las integraciones disponibles
    this.availableIntegrations = this.integrationsService.getAvailableIntegrations();

    // Si es primera visita, mostrar tutorial
    if (!localStorage.getItem('integration_tutorial_seen')) {
      this.openTutorial();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimer) {
      this.toastTimer.unsubscribe();
    }
  }

  loadIntegrations(): void {
    this.loading = true;
    this.integrationsService.getIntegrations().subscribe({
      next: (data: any) => {
        this.integrations = data.result as Integration[];
        this.groupIntegrationsByCategory();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = `Error al cargar integraciones: ${error.message}`;
        this.loading = false;
      }
    });
  }

  openIntegrationConfig(integration?: Integration): void {
    const modalRef = this.modalService.open(IntegrationsComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      windowClass: 'integration-modal'
    });

    if (integration) {
      modalRef.componentInstance.integrationToEdit = integration;
    }

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.loadIntegrations();
      }
    }, () => {
      // Modal dismissed
    });
  }

  // Método para agrupar integraciones por categoría
  private groupIntegrationsByCategory(): void {
    this.groupedIntegrations = {};

    // Inicializar categorías vacías
    Object.values(IntegrationCategory).forEach(category => {
      this.groupedIntegrations[category] = [];
    });

    // Agrupar integraciones por categoría
    this.integrations.forEach(integration => {
      const category = integration.category || IntegrationCategory.OTHER;
      if (!this.groupedIntegrations[category]) {
        this.groupedIntegrations[category] = [];
      }
      this.groupedIntegrations[category].push(integration);
    });
  }

  // Método para abrir el modal con una categoría preseleccionada
  openIntegrationConfigByCategory(category: IntegrationCategory): void {
    const modalRef = this.modalService.open(IntegrationsComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      windowClass: 'integration-modal'
    });

    modalRef.componentInstance.preselectedCategory = category;

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.loadIntegrations();
      }
    }, () => {
      // Modal dismissed
    });
  }

  getIntegrationTypeName(type: string): string {
    const types = {
      'shopify': 'Shopify',
      'wompi': 'Wompi',
      'epayco': 'ePayco',
      'paypal': 'PayPal'
    };
    return types[type] || type;
  }

  getIntegrationIcon(type: string): string {
    const icons = {
      'shopify': 'fa-shopping-bag',
      'wompi': 'fa-credit-card',
      'epayco': 'fa-credit-card',
      'paypal': 'fa-paypal'
    };
    return icons[type] || 'fa-plug';
  }

  deleteIntegration(integration: Integration, event: Event): void {
    event.stopPropagation();

    if (confirm(`¿Está seguro que desea eliminar la integración "${integration.name}"?`)) {
      this.integrationsService.deleteIntegration(integration.id!).subscribe({
        next: () => {
          this.integrations = this.integrations.filter(i => i.id !== integration.id);
          this.showNotification('success', 'Integración eliminada correctamente');
        },
        error: (error) => {
          this.showNotification('error', 'Error al eliminar la integración: ' + error.message);
        }
      });
    }
  }

  toggleIntegrationStatus(integration: Integration, event: Event): void {
    event.stopPropagation();

    const updatedIntegration = {
      ...integration,
      enabled: !integration.enabled
    };

    this.integrationsService.updateIntegration(integration.id!, updatedIntegration).subscribe({
      next: (result) => {
        const index = this.integrations.findIndex(i => i.id === result.id);
        if (index !== -1) {
          this.integrations[index] = result;
        }
        this.showNotification('success', `Integración ${result.enabled ? 'activada' : 'desactivada'} correctamente`);
      },
      error: (error) => {
        this.showNotification('error', 'Error al actualizar el estado: ' + error.message);
      }
    });
  }

  testIntegration(integration: Integration, event: Event): void {
    event.stopPropagation();

    this.integrationsService.testIntegration(integration).subscribe({
      next: (result) => {
        if (result.success) {
          this.showNotification('success', 'Conexión exitosa: ' + result.message);
        } else {
          this.showNotification('error', 'Error de conexión: ' + result.message);
        }
      },
      error: (error) => {
        this.showNotification('error', 'Error al probar la conexión: ' + error.message);
      }
    });
  }

  private showNotification(type: 'success' | 'error', message: string): void {
    // Aquí puedes implementar notificaciones toast o similar
    console.log(`[${type}] ${message}`);
    // Para implementaciones reales, podrías usar un servicio de notificaciones
  }

  // Sobrescribir el método get para filtrar también por categoría
  get filteredIntegrations(): Integration[] {
    if (!this.searchTerm) {
      return this.integrations;
    }

    const term = this.searchTerm.toLowerCase();
    return this.integrations.filter(integration =>
      integration.name.toLowerCase().includes(term) ||
      this.getIntegrationTypeName(integration.type).toLowerCase().includes(term) ||
      CATEGORY_LABELS[integration.category]?.toLowerCase().includes(term)
    );
  }

  // Método para contar integraciones por categoría
  countIntegrationsInCategory(category: string): number {
    return this.groupedIntegrations[category]?.length || 0;
  }

  // Método para verificar si una categoría tiene integraciones
  hasCategoryIntegrations(category: string): boolean {
    return this.countIntegrationsInCategory(category) > 0;
  }

  /**
   * Mostrar/ocultar tutorial
   */
  openTutorial(): void {
    this.showTutorial = true;
  }

  closeTutorial(): void {
    this.showTutorial = false;
    localStorage.setItem('integration_tutorial_seen', 'true');
  }

  /**
   * Mostrar notificación toast
   */
  showToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    this.toast = { type, message };

    // Limpiar cualquier timer existente
    if (this.toastTimer) {
      this.toastTimer.unsubscribe();
    }

    // Auto cerrar después de 5 segundos
    this.toastTimer = timer(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.clearToast());
  }

  clearToast(): void {
    this.toast = null;
    if (this.toastTimer) {
      this.toastTimer.unsubscribe();
      this.toastTimer = null;
    }
  }

  getToastIcon(): string {
    if (!this.toast) return '';

    switch (this.toast.type) {
      case 'success': return 'fa-check-circle';
      case 'error': return 'fa-exclamation-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'info': return 'fa-info-circle';
      default: return '';
    }
  }

  /**
   * Cambiar modo de visualización
   */
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    localStorage.setItem('integration_view_mode', mode);
  }

  /**
   * Métodos para estadísticas y conteo
   */
  getTotalIntegrationsCount(): number {
    return this.integrations.length;
  }

  getActiveIntegrationsCount(): number {
    return this.integrations.filter(i => i.enabled).length;
  }

  getErroredIntegrationsCount(): number {
    return this.integrations.filter(i => this.hasError(i)).length;
  }

  getRecentTransactionsCount(): number {
    // Implementación simulada
    return Math.floor(Math.random() * 100);
  }

  hasError(integration: Integration): boolean {
    // Implementación simulada - podría implementarse realmente revisando el estado de integración
    return Math.random() > 0.8;
  }

  isFeatured(integration: Integration): boolean {
    // Implementación simulada - podría implementarse basado en la configuración
    return integration.type === 'wompi' || integration.type === 'shopify';
  }

  hasStats(integration: Integration): boolean {
    // Simulado - debería verificar si hay estadísticas reales disponibles
    return ['wompi', 'epayco', 'paypal'].includes(integration.type);
  }

  getSuccessfulTransactions(integration: Integration): number {
    // Simulado
    return Math.floor(Math.random() * 100);
  }

  getFailedTransactions(integration: Integration): number {
    // Simulado
    return Math.floor(Math.random() * 10);
  }

  getTotalAmount(integration: Integration): number {
    // Simulado
    return Math.floor(Math.random() * 10000);
  }

  /**
   * Métodos para filtrado y ordenación
   */
  resetFilters(): void {
    this.searchTerm = '';
    this.filterCategory = '';
    this.filterStatus = '';
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      // Toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  getSortedAndFilteredIntegrations(): Integration[] {
    let result = [...this.integrations];

    // Apply filters
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(term) ||
        this.getIntegrationTypeName(i.type).toLowerCase().includes(term)
      );
    }

    if (this.filterCategory) {
      result = result.filter(i => i.category === this.filterCategory);
    }

    if (this.filterStatus) {
      switch (this.filterStatus) {
        case 'active':
          result = result.filter(i => i.enabled);
          break;
        case 'inactive':
          result = result.filter(i => !i.enabled);
          break;
        case 'error':
          result = result.filter(i => this.hasError(i));
          break;
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (this.sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'enabled':
          comparison = (a.enabled === b.enabled) ? 0 : a.enabled ? -1 : 1;
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt || '').getTime() - new Date(b.updatedAt || '').getTime();
          break;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }

  getFilteredIntegrationsByCategory(category: string): Integration[] {
    return this.integrations.filter(i => i.category === category);
  }

  shouldShowCategory(category: string): boolean {
    if (this.filterCategory && this.filterCategory !== category) return false;
    if (this.searchTerm) return false;
    return this.countIntegrationsInCategory(category) > 0;
  }

  /**
   * Métodos para UI y helpers visuales
   */
  getIntegrationLogo(type: string): string | null {
    // Buscar el logo en las integraciones disponibles
    for (const [category, integrations] of Object.entries(this.availableIntegrations)) {
      const integration = integrations.find(i => i.id === type);
      if (integration && integration.logo) {
        return integration.logo;
      }
    }
    return null;
  }

  getMaskedCredential(integration: Integration): string {
    // Muestra una versión enmascarada de la credencial principal
    let credential = '';

    if (integration.type === 'shopify') {
      credential = integration.credentials?.apiKey || '';
    } else if (['wompi', 'epayco'].includes(integration.type)) {
      credential = integration.credentials?.publicKey || '';
    } else {
      credential = integration.credentials?.clientId || '';
    }

    // Enmascarar todo excepto los primeros 4 y últimos 4 caracteres
    if (credential.length > 8) {
      const firstChars = credential.substring(0, 4);
      const lastChars = credential.substring(credential.length - 4);
      credential = firstChars + '••••••' + lastChars;
    }

    return credential;
  }

  getEnvironmentName(integration: Integration): string {
    if (integration.type === 'shopify') return 'N/A';

    const env = integration.credentials?.environment || '';
    if (env === 'test' || env === 'sandbox') return 'Pruebas';
    if (env === 'production') return 'Producción';
    return env || 'Desconocido';
  }

  getEnvironmentClass(integration: Integration): string {
    if (integration.type === 'shopify') return '';

    const env = integration.credentials?.environment || '';
    if (env === 'test' || env === 'sandbox') return 'test';
    if (env === 'production') return 'production';
    return '';
  }

  /**
   * Métodos para recomendaciones
   */
  getTopCategories(count: number = 3): string[] {
    // Devuelve las categorías más populares (aquí simplificado)
    return [
      IntegrationCategory.PAYMENT,
      IntegrationCategory.ECOMMERCE,
      IntegrationCategory.LOGISTICS
    ].slice(0, count);
  }

  getTopSuggestionsForCategory(category: string, count: number = 3): any[] {
    // Obtener las integraciones más populares para la categoría
    const suggestions = [...(this.availableIntegrations[category] || [])];

    // Filtrar las que ya están configuradas
    const configuredTypes = this.integrations
      .filter(i => i.category === category)
      .map(i => i.type);

    // Añadir flags de popularidad para UI
    const result = suggestions
      .filter(s => !configuredTypes.includes(s.id))
      .map(s => ({
        ...s,
        popular: ['shopify', 'wompi', 'paypal', 'mailchimp'].includes(s.id),
        new: ['stripe', 'servientrega', 'siigo'].includes(s.id)
      }))
      .slice(0, count);

    return result;
  }

  configureIntegration(integration: any, category: string, event: Event): void {
    event.stopPropagation();

    const modalRef = this.modalService.open(IntegrationsComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      windowClass: 'integration-modal'
    });

    modalRef.componentInstance.preselectedCategory = category;
    modalRef.componentInstance.preselectedType = integration.id;

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.showToast('success', `Integración con ${integration.name} configurada correctamente`);
        this.loadIntegrations();
      }
    }).catch(() => { });
  }

  /**
   * Handler para editar integración con prevención de propagación
   */
  editIntegration(integration: Integration, event: Event): void {
    event.stopPropagation();
    this.openIntegrationConfig(integration);
  }

  /**
   * Método para obtener el ícono de una categoría
   */
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
}
