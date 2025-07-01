import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationsService, Integration, IntegrationCategory, CATEGORY_LABELS } from './integrations.service';
import { IntegrationStateService } from './integration-state.service';
import { IntegrationCacheService } from './integration-cache.service';
import { IntegrationUIHelperService } from './integration-ui-helper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IntegrationsComponent } from './integrations.component';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  private destroy$ = new Subject<void>();
  
  // Observables del estado (se inicializan en ngOnInit)
  integrations$: any;
  filteredIntegrations$: any;
  loading$: any;
  errors$: any;
  filters$: any;
  ui$: any;
  cacheStats$: any;
  
  // Propiedades del componente
  categories = Object.values(IntegrationCategory);
  categoryLabels = CATEGORY_LABELS;
  selectedCategory: IntegrationCategory | null = null;
  integrations: Integration[] = [];
  filteredIntegrations: Integration[] = [];
  searchTerm = '';
  loading = false;
  
  // Stats dashboard
  totalIntegrations = 0;
  activeIntegrations = 0;
  errorIntegrations = 0;
  
  // UI State
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'type' | 'status' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  selectedIntegrations: string[] = [];
  
  constructor(
    private integrationsService: IntegrationsService,
    private stateService: IntegrationStateService,
    private cacheService: IntegrationCacheService,
    public uiHelper: IntegrationUIHelperService,
    private modal: NgbModal
  ) {}

  ngOnInit(): void {
    // Inicializar observables del estado
    this.integrations$ = this.stateService.integrations$;
    this.filteredIntegrations$ = this.stateService.filteredIntegrations$;
    this.loading$ = this.stateService.loading$;
    this.errors$ = this.stateService.errors$;
    this.filters$ = this.stateService.filters$;
    this.ui$ = this.stateService.ui$;
    this.cacheStats$ = this.cacheService.stats$;
    
    // Inicializar integraciones disponibles
    this.availableIntegrations = this.integrationsService.getAvailableIntegrations();
    
    this.setupSubscriptions();
    this.setupSearch();
    this.initializePrefetch();
    
    // Cargar integraciones al final
    this.loadIntegrations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSubscriptions(): void {
    // Suscribirse a cambios en las integraciones para actualizar stats
    this.integrations$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(integrations => {
      console.log('Integraciones cargadas:', integrations);
      this.integrations = integrations || [];
      this.updateStats(integrations || []);
    });

    // Suscribirse a integraciones filtradas
    this.filteredIntegrations$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filteredIntegrations => {
      console.log('Integraciones filtradas:', filteredIntegrations);
      this.filteredIntegrations = filteredIntegrations || [];
    });

    // Suscribirse a estado de carga
    this.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading.list;
    });

    // Suscribirse a errores para mostrar notificaciones
    this.errors$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(errors => {
      if (errors.list) {
        console.error('Error al cargar integraciones:', errors.list);
        this.uiHelper.showError(`Error al cargar integraciones: ${errors.list}`);
      }
      if (errors.delete) {
        this.uiHelper.showError(`Error al eliminar: ${errors.delete}`);
      }
    });
  }

  private setupSearch(): void {
    // Implementar búsqueda con debounce
    this.filters$.pipe(
      debounceTime(300),
      distinctUntilChanged((prev: any, curr: any) => prev.search === curr.search),
      takeUntil(this.destroy$)
    ).subscribe((filters: any) => {
      if (filters.search) {
        this.performSearch(filters.search);
      }
    });
  }

  private initializePrefetch(): void {
    // Prefetch de datos comunes
    this.integrationsService.prefetchCommonData();
  }

  private updateStats(integrations: Integration[]): void {
    this.totalIntegrations = integrations.length;
    this.activeIntegrations = integrations.filter(i => i.enabled).length;
    this.errorIntegrations = integrations.filter(i => !i.enabled).length;
  }
  
  loadIntegrations(): void {
    console.log('Iniciando carga de integraciones...');
    // El estado se actualiza automáticamente a través del servicio
    this.integrationsService.getIntegrations().subscribe({
      next: (integrations) => {
        console.log('Integraciones recibidas del servicio:', integrations);
      },
      error: (error) => {
        console.error('Error al cargar integraciones:', error);
        this.uiHelper.showError('No se pudieron cargar las integraciones. Verificar conexión con el servidor.');
      }
    });
  }
  
  private performSearch(query: string): void {
    this.integrationsService.searchIntegrations(query).subscribe();
  }
  
  onCategoryChange(category: IntegrationCategory | null): void {
    this.selectedCategory = category;
    this.stateService.updateFilters({ category });
    this.stateService.setCurrentCategory(category);
  }
  
  onSearchChange(searchTerm: string): void {
    this.stateService.updateFilters({ search: searchTerm });
  }
  
  onStatusFilterChange(status: 'all' | 'active' | 'inactive' | 'error'): void {
    this.stateService.updateFilters({ status });
  }
  
  onSort(field: 'name' | 'type' | 'lastModified' | 'status'): void {
    const currentUI = this.stateService.currentState.ui;
    const newDirection = currentUI.sortBy === field && currentUI.sortDirection === 'asc' ? 'desc' : 'asc';
    
    this.stateService.updateUI({
      sortBy: field,
      sortDirection: newDirection
    });
  }
  
  onViewModeChange(mode: 'grid' | 'list'): void {
    this.stateService.updateUI({ viewMode: mode });
  }
  
  toggleSelection(integrationId: string): void {
    this.stateService.toggleSelection(integrationId);
  }
  
  selectAll(): void {
    this.filteredIntegrations$.pipe(takeUntil(this.destroy$)).subscribe(integrations => {
      const ids = integrations.map(i => i.id!).filter(id => id);
      this.stateService.selectAll(ids);
    });
  }
  
  clearSelection(): void {
    this.stateService.clearSelection();
  }
  
  deleteSelectedIntegrations(): void {
    const selectedIds = this.stateService.currentState.ui.selectedIds;
    if (selectedIds.length === 0) {
      this.uiHelper.showWarning('No hay integraciones seleccionadas');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar ${selectedIds.length} integración(es)?`)) {
      selectedIds.forEach(id => {
        this.integrationsService.deleteIntegration(id).subscribe();
      });
      this.stateService.clearSelection();
    }
  }
  
  refreshData(forceRefresh: boolean = false): void {
    if (forceRefresh) {
      this.integrationsService.invalidateAllCache();
    }
    this.loadIntegrations();
  }

  // Métodos para acciones específicas
  openIntegrationModal(integration?: Integration, category?: IntegrationCategory): void {
    const modalRef = this.modal.open(IntegrationsComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    if (integration) {
      modalRef.componentInstance.integrationToEdit = integration;
      this.stateService.selectIntegration(integration);
    }

    if (category) {
      modalRef.componentInstance.preselectedCategory = category;
      this.stateService.setCurrentCategory(category);
    }

    modalRef.result.then(
      (result) => {
        if (result === 'saved') {
          this.uiHelper.showSuccess('Integración guardada correctamente');
          this.refreshData(true); // Force refresh después de guardar
        }
      },
      (dismissed) => {
        this.stateService.selectIntegration(null);
      }
    );
  }

  duplicateIntegration(integration: Integration): void {
    const duplicated = {
      ...integration,
      id: undefined,
      name: `${integration.name} (Copia)`,
      enabled: false // Iniciar deshabilitada por seguridad
    };

    this.openIntegrationModal(duplicated);
  }

  toggleIntegrationStatus(integration: Integration): void {
    const updated = {
      ...integration,
      enabled: !integration.enabled
    };

    this.integrationsService.updateIntegration(integration.id!, updated).subscribe({
      next: () => {
        const status = updated.enabled ? 'activada' : 'desactivada';
        this.uiHelper.showSuccess(`Integración ${status} correctamente`);
      },
      error: (error) => {
        this.uiHelper.showError('Error al cambiar el estado de la integración');
      }
    });
  }

  testIntegration(integration: Integration): void {
    this.integrationsService.testIntegration(integration).subscribe({
      next: (result) => {
        if (result.success) {
          this.uiHelper.showSuccess(`✅ Conexión exitosa: ${result.message}`);
        } else {
          this.uiHelper.showError(`❌ Error de conexión: ${result.message}`);
        }
      },
      error: (error) => {
        this.uiHelper.showError('Error al probar la conexión');
      }
    });
  }

  deleteIntegration(integration: Integration): void {
    if (confirm(`¿Estás seguro de eliminar la integración "${integration.name}"?`)) {
      this.integrationsService.deleteIntegration(integration.id!).subscribe({
        next: () => {
          this.uiHelper.showSuccess('Integración eliminada correctamente');
        },
        error: (error) => {
          this.uiHelper.showError('Error al eliminar la integración');
        }
      });
    }
  }

  // Métodos de utilidad para el template
  trackByIntegration(index: number, integration: Integration): string {
    return integration.id || index.toString();
  }

  getCategoryIcon(category: IntegrationCategory): string {
    const icons = {
      [IntegrationCategory.ECOMMERCE]: 'fa-shopping-cart',
      [IntegrationCategory.PAYMENT]: 'fa-credit-card',
      [IntegrationCategory.LOGISTICS]: 'fa-truck',
      [IntegrationCategory.MARKETING]: 'fa-bullhorn',
      [IntegrationCategory.CRM]: 'fa-users',
      [IntegrationCategory.ACCOUNTING]: 'fa-calculator',
      [IntegrationCategory.OTHER]: 'fa-cog'
    };
    return icons[category] || 'fa-cog';
  }

  getStatusBadgeClass(integration: Integration): string {
    return integration.enabled ? 'badge badge-success' : 'badge badge-secondary';
  }

  getStatusText(integration: Integration): string {
    return integration.enabled ? 'Activo' : 'Inactivo';
  }

  // Métodos para depuración y monitoreo
  showCacheStats(): void {
    this.cacheStats$.subscribe(stats => {
      console.log('Cache Stats:', stats);
      this.uiHelper.showInfo(`Cache: ${stats.entries} entradas, ${stats.hitRate.toFixed(1)}% hit rate`);
    });
  }

  clearCache(): void {
    if (confirm('¿Estás seguro de limpiar todo el cache?')) {
      this.cacheService.clear();
      this.uiHelper.showSuccess('Cache limpiado correctamente');
      return;
    }
  }

  // Métodos requeridos por el template
  getTotalIntegrationsCount(): number {
    return this.totalIntegrations;
  }

  getActiveIntegrationsCount(): number {
    return this.activeIntegrations;
  }

  getErroredIntegrationsCount(): number {
    return this.errorIntegrations;
  }

  getRecentTransactionsCount(): number {
    // Placeholder - podrías implementar lógica real aquí
    return 0;
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.onViewModeChange(mode);
  }

  openTutorial(): void {
    this.showTutorial = true;
  }

  closeTutorial(): void {
    this.showTutorial = false;
  }

  resetFilters(): void {
    this.stateService.resetFilters();
    this.selectedCategory = null;
  }

  getSortedAndFilteredIntegrations(): Integration[] {
    // Obtener del estado actual
    return this.filteredIntegrations;
  }

  getTopCategories(limit: number = 3): IntegrationCategory[] {
    return this.categories.slice(0, limit);
  }

  // Propiedades adicionales requeridas por el template
  filterCategory: IntegrationCategory | null = null;
  filterStatus: 'all' | 'active' | 'inactive' | 'error' = 'all';
  errorMessage: string | null = null;
  showTutorial = false;
  toast: any = null;

  // Métodos helper para acceso seguro a propiedades
  getCategoryLabel(category: IntegrationCategory): string {
    return this.categoryLabels?.[category] || category;
  }

  // Métodos requeridos por el template que faltan
  shouldShowCategory(category: IntegrationCategory): boolean {
    if (!this.selectedCategory) return true;
    return this.selectedCategory === category;
  }

  countIntegrationsInCategory(category: IntegrationCategory): number {
    return this.integrations.filter(i => i.category === category).length;
  }

  openIntegrationConfigByCategory(category: IntegrationCategory): void {
    this.openIntegrationModal(undefined, category);
  }

  getFilteredIntegrationsByCategory(category: IntegrationCategory): Integration[] {
    return this.filteredIntegrations.filter(i => i.category === category);
  }

  hasError(integration: Integration): boolean {
    return !integration.enabled; // Simplificado
  }

  isFeatured(integration: Integration): boolean {
    return false; // Placeholder
  }

  getIntegrationLogo(type: string): string | null {
    return this.uiHelper.getLogo(type);
  }

  hasLogoError(integration: Integration): boolean {
    return this.uiHelper.hasImageError(integration.type);
  }

  handleImageError(event: any): void {
    const integrationId = event.target.getAttribute('data-integration-id');
    if (integrationId) {
      this.uiHelper.onImgError(integrationId, event);
    }
  }

  getIntegrationTypeName(type: string): string {
    // Convertir tipo a nombre amigable
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  getMaskedCredential(integration: Integration): string {
    const apiKey = integration.credentials?.apiKey || integration.credentials?.publicKey;
    if (!apiKey) return 'No configurado';
    return '***' + apiKey.slice(-4);
  }

  getEnvironmentClass(integration: Integration): string {
    const apiKey = integration.credentials?.apiKey || integration.credentials?.publicKey || '';
    return apiKey.includes('test') ? 'env-test' : 'env-prod';
  }

  getEnvironmentName(integration: Integration): string {
    const apiKey = integration.credentials?.apiKey || integration.credentials?.publicKey || '';
    return apiKey.includes('test') ? 'Pruebas' : 'Producción';
  }

  hasStats(integration: Integration): boolean {
    return false; // Placeholder - implementar cuando haya stats reales
  }

  getSuccessfulTransactions(integration: Integration): number {
    return 0; // Placeholder
  }

  getFailedTransactions(integration: Integration): number {
    return 0; // Placeholder
  }

  getTotalAmount(integration: Integration): number {
    return 0; // Placeholder
  }

  isOperationLoading(operation: string, integrationId?: string): boolean {
    const loadingState = this.stateService.currentState.loading;
    switch (operation) {
      case 'test':
        return loadingState.test;
      case 'toggle':
      case 'save':
        return loadingState.save;
      case 'delete':
        return loadingState.delete;
      default:
        return false;
    }
  }

  openIntegrationConfig(integration: Integration): void {
    this.openIntegrationModal(integration);
  }

  editIntegration(integration: Integration, event: Event): void {
    event.stopPropagation();
    this.openIntegrationModal(integration);
  }

  // Propiedades para la vista de lista
  sortField = 'name';

  // Métodos adicionales para el template
  openIntegrationConfigByType(category: string, type: string): void {
    // Placeholder para abrir configuración por tipo específico
    console.log('Opening config for:', category, type);
  }

  getCategoryColor(type: string): string {
    // Colores por categoría de integración
    const colors = {
      ecommerce: '#95bf47',
      payment: '#6c5ce7',
      logistics: '#fd79a8',
      marketing: '#fdcb6e',
      crm: '#00b894',
      accounting: '#0984e3',
      other: '#636e72'
    };
    
    // Intentar obtener la categoría desde el tipo
    const category = this.getIntegrationCategory(type);
    return colors[category] || colors.other;
  }

  private getIntegrationCategory(type: string): string {
    // Mapeo de tipos a categorías
    const typeToCategory: { [key: string]: string } = {
      shopify: 'ecommerce',
      woocommerce: 'ecommerce',
      magento: 'ecommerce',
      prestashop: 'ecommerce',
      wompi: 'payment',
      epayco: 'payment',
      paypal: 'payment',
      stripe: 'payment',
      payu: 'payment',
      mercadopago: 'payment',
      fedex: 'logistics',
      dhl: 'logistics',
      servientrega: 'logistics',
      coordinadora: 'logistics',
      mailchimp: 'marketing',
      hubspot: 'marketing',
      google_analytics: 'marketing',
      salesforce: 'crm',
      zoho_crm: 'crm',
      quickbooks: 'accounting',
      siigo: 'accounting'
    };
    
    return typeToCategory[type] || 'other';
  }

  getIntegrationIcon(type: string): string {
    return this.uiHelper.getIntegrationIcon(type);
  }

  getTopSuggestionsForCategory(category: IntegrationCategory, limit: number): any[] {
    // Placeholder - retornar sugerencias basadas en el servicio
    const availableIntegrations = this.integrationsService.getAvailableIntegrations();
    return (availableIntegrations[category] || []).slice(0, limit);
  }

  configureIntegration(integration: any, category: IntegrationCategory, event: Event): void {
    event.stopPropagation();
    // Crear nueva integración basada en la sugerencia
    const newIntegration: Partial<Integration> = {
      type: integration.id,
      name: integration.name,
      category: category,
      enabled: false,
      credentials: {}
    };
    this.openIntegrationModal(newIntegration as Integration);
  }

  getToastIcon(): string {
    if (!this.toast) return '';
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle', 
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[this.toast.type] || 'fa-info-circle';
  }

  clearToast(): void {
    this.toast = null;
  }

  // Propiedades que necesita el template  
  availableIntegrations: any = {};
}
