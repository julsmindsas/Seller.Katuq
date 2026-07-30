import { Component, OnInit, OnDestroy, ViewEncapsulation } from "@angular/core";
import {
  IntegrationsService,
  Integration,
  IntegrationCategory,
  CATEGORY_LABELS,
} from "./integrations.service";
import { IntegrationStateService } from "./integration-state.service";
import { IntegrationCacheService } from "./integration-cache.service";
import { IntegrationUIHelperService } from "./integration-ui-helper.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { IntegrationsComponent } from "./integrations.component";
import { Subject, combineLatest } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { IntegrationManualControlService } from "./integration-manual-control.service";
import { Router } from "@angular/router";
import { listSupportedProviders } from "../provider-dashboard/provider-registry";

interface Toast {
  type: "success" | "error" | "warning" | "info";
  message: string;
}

@Component({
  selector: "app-integrations-list",
  templateUrl: "./integrations-list.component.html",
  styleUrls: ["./integrations-list.component.scss"],
  encapsulation: ViewEncapsulation.None
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
  searchTerm = "";
  loading = false;

  // Stats dashboard
  totalIntegrations = 0;
  activeIntegrations = 0;
  errorIntegrations = 0;

  // UI State
  viewMode: "grid" | "list" = "grid";
  sortBy: "name" | "type" | "status" = "name";
  sortDirection: "asc" | "desc" = "asc";
  selectedIntegrations: string[] = [];

  constructor(
    private integrationsService: IntegrationsService,
    private stateService: IntegrationStateService,
    private cacheService: IntegrationCacheService,
    public uiHelper: IntegrationUIHelperService,
    private modal: NgbModal,
    private manualControlService: IntegrationManualControlService,
    private router: Router,
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

    // Inicializar integraciones disponibles - SOLO ACTIVAS
    const allIntegrations = this.integrationsService.getAvailableIntegrations();
    this.availableIntegrations = {};

    // Filtrar solo las integraciones activas
    Object.keys(allIntegrations).forEach((category) => {
      this.availableIntegrations[category] = allIntegrations[category].filter(
        (integration) => integration.active,
      );
    });

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
    // Suscripción a integraciones => actualizar stats/local cache
    this.integrations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((integrations) => {
        this.integrations = integrations || [];
        this.updateStats(this.integrations);
      });

    // Suscripción a integraciones filtradas
    this.filteredIntegrations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.filteredIntegrations = list || [];
      });

    // Estado de carga
    this.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading) => {
      this.loading = loading.list;
    });

    // Errores globales
    this.errors$.pipe(takeUntil(this.destroy$)).subscribe((errors) => {
      if (errors.list) {
        this.uiHelper.showError(
          `Error al cargar integraciones: ${errors.list}`,
        );
      }
      if (errors.delete) {
        this.uiHelper.showError(`Error al eliminar: ${errors.delete}`);
      }
    });

    // Filtros UI
    this.filters$.pipe(takeUntil(this.destroy$)).subscribe((filters) => {
      this.searchTerm = filters.search;
      this.filterCategory = filters.category;
      this.filterStatus = filters.status;
    });
  }

  private setupSearch(): void {
    // Implementar búsqueda con debounce
    this.filters$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev: any, curr: any) => prev.search === curr.search,
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((filters: any) => {
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
    this.activeIntegrations = integrations.filter((i) => i.enabled).length;
    this.errorIntegrations = integrations.filter((i) => !i.enabled).length;
  }

  loadIntegrations(): void {
    this.stateService.setLoading("list", true);
    this.stateService.setError("list", null);
    this.integrationsService.getIntegrations().subscribe({
      next: (integrations) => {
        if (!integrations || integrations.length === 0) {
          this.uiHelper.showInfo(
            "No se encontraron integraciones configuradas",
          );
        } else {
          this.uiHelper.showSuccess(
            `Se cargaron ${integrations.length} integraciones correctamente`,
          );
          this.stateService.setIntegrations(integrations);
        }
      },
      error: (error) => {
        this.stateService.setError(
          "list",
          error.message || "Error al cargar integraciones",
        );
        this.uiHelper.showError(
          "No se pudieron cargar las integraciones. Verificar conexión con el servidor.",
        );
      },
      complete: () => {
        this.stateService.setLoading("list", false);
      },
    });
  }

  private performSearch(query: string): void {
    this.integrationsService.searchIntegrations(query).subscribe();
  }

  onCategoryChange(category: IntegrationCategory | null): void {
    this.stateService.updateFilters({ category });
  }

  onSearchChange(searchTerm: string): void {
    this.stateService.updateFilters({ search: searchTerm });
  }

  onStatusFilterChange(status: "all" | "active" | "inactive" | "error"): void {
    this.stateService.updateFilters({ status });
  }

  onSort(field: "name" | "type" | "lastModified" | "status"): void {
    const currentUI = this.stateService.currentState.ui;
    const newDirection =
      currentUI.sortBy === field && currentUI.sortDirection === "asc"
        ? "desc"
        : "asc";

    this.stateService.updateUI({
      sortBy: field,
      sortDirection: newDirection,
    });
  }

  onViewModeChange(mode: "grid" | "list"): void {
    this.stateService.updateUI({ viewMode: mode });
  }

  toggleSelection(integrationId: string): void {
    this.stateService.toggleSelection(integrationId);
  }

  selectAll(): void {
    this.filteredIntegrations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((integrations) => {
        const ids = integrations.map((i) => i.id!).filter((id) => id);
        this.stateService.selectAll(ids);
      });
  }

  clearSelection(): void {
    this.stateService.clearSelection();
  }

  deleteSelectedIntegrations(): void {
    const selectedIds = this.stateService.currentState.ui.selectedIds;
    if (selectedIds.length === 0) {
      this.uiHelper.showWarning("No hay integraciones seleccionadas");
      return;
    }

    if (
      confirm(
        `¿Estás seguro de eliminar ${selectedIds.length} integración(es)?`,
      )
    ) {
      selectedIds.forEach((id) => {
        this.integrationsService.deleteIntegration(id).subscribe();
      });
      this.stateService.clearSelection();
    }
  }

  refreshData(forceRefresh: boolean = false): void {
    console.log("🔄 Refrescando datos...", { forceRefresh });

    if (forceRefresh) {
      console.log("🗑️ Invalidando cache...");
      this.integrationsService.invalidateAllCache();

      // Resetear filtros si están causando problemas
      this.resetFilters();
    }

    this.loadIntegrations();
  }

  // Métodos para acciones específicas
  openIntegrationModal(
    integration?: Integration,
    category?: IntegrationCategory,
  ): void {
    const modalRef = this.modal.open(IntegrationsComponent, {
      size: "xl",
      backdrop: "static",
      keyboard: false,
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
        if (result === "saved") {
          this.uiHelper.showSuccess("Integración guardada correctamente");
          this.refreshData(true); // Force refresh después de guardar
        }
      },
      (dismissed) => {
        this.stateService.selectIntegration(null);
      },
    );
  }

  duplicateIntegration(integration: Integration): void {
    const duplicated = {
      ...integration,
      id: undefined,
      name: `${integration.name} (Copia)`,
      enabled: false, // Iniciar deshabilitada por seguridad
    };

    this.openIntegrationModal(duplicated);
  }

  toggleIntegrationStatus(integration: Integration): void {
    const updatedConfig = {
      ...integration.credentials,
      enabled: !integration.enabled,
    };

    this.integrationsService
      .updateIntegration(integration.type, updatedConfig)
      .subscribe({
        next: () => {
          const status = updatedConfig.enabled ? "activada" : "desactivada";
          this.uiHelper.showSuccess(`Integración ${status} correctamente`);
        },
        error: (error) => {
          this.uiHelper.showError(
            "Error al cambiar el estado de la integración",
          );
        },
      });
  }

  testIntegration(integration: Integration): void {
    this.integrationsService
      .testIntegration(integration.type, integration.credentials)
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.uiHelper.showSuccess(`✅ Conexión exitosa: ${result.message}`);
          } else {
            this.uiHelper.showError(`❌ Error de conexión: ${result.message}`);
          }
        },
        error: (error) => {
          this.uiHelper.showError("Error al probar la conexión");
        },
      });
  }

  deleteIntegration(integration: Integration): void {
    if (
      confirm(`¿Estás seguro de eliminar la integración "${integration.name}"?`)
    ) {
      this.integrationsService.deleteIntegration(integration.id!).subscribe({
        next: () => {
          this.uiHelper.showSuccess("Integración eliminada correctamente");
        },
        error: (error) => {
          this.uiHelper.showError("Error al eliminar la integración");
        },
      });
    }
  }

  // Métodos de utilidad para el template
  trackByIntegration(index: number, integration: Integration): string {
    return integration.id || index.toString();
  }

  getCategoryIcon(category: IntegrationCategory): string {
    return this.uiHelper.getCategoryIcon(category);
  }

  getStatusBadgeClass(integration: Integration): string {
    return integration.enabled
      ? "badge badge-success"
      : "badge badge-secondary";
  }

  getStatusText(integration: Integration): string {
    return integration.enabled ? "Activo" : "Inactivo";
  }

  // Métodos para depuración y monitoreo
  // showCacheStats() eliminado - duplicado con la nueva implementación

  clearCache(): void {
    if (confirm("¿Estás seguro de limpiar todo el cache?")) {
      this.cacheService.clear();
      this.uiHelper.showSuccess("Cache limpiado correctamente");
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

  setViewMode(mode: "grid" | "list"): void {
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
    this.pendingOnly = false;
  }

  getTopCategories(limit: number = 3): IntegrationCategory[] {
    return this.categories.slice(0, limit);
  }

  // ===========================================================================
  // Helpers de PRESENTACIÓN del rediseño (solo derivan de datos ya cargados;
  // no consultan al backend ni alteran el estado de las integraciones).
  // ===========================================================================

  /** Una integración con credencial realmente configurada. */
  hasCredential(integration: Integration): boolean {
    const masked = this.getMaskedCredential(integration);
    return !!masked && masked !== "No configurado";
  }

  /**
   * Activas pero sin credencial: están encendidas y no pueden procesar nada.
   * Es el caso que el aviso superior destaca.
   */
  getPendingCredentialsCount(): number {
    return this.integrations.filter(
      (i) => i.enabled && !this.hasCredential(i),
    ).length;
  }

  /** Filtra el listado a las que les falta credencial (botón del aviso). */
  togglePendingOnly(): void {
    this.pendingOnly = !this.pendingOnly;
  }

  pendingOnly = false;

  /** Inicial para el recuadro de logo cuando no hay imagen. */
  getInitial(integration: Integration): string {
    const nombre = (integration.name || integration.type || "?").trim();
    return nombre.charAt(0).toUpperCase();
  }

  /** Frase de actividad en vez de un "N/A" que no le dice nada a nadie. */
  getActivityText(integration: Integration): string {
    if (!this.isDateValid(integration.updatedAt)) {
      return "Sin actividad registrada aún";
    }
    const fecha = new Date(integration.updatedAt as string);
    const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
    if (minutos < 1) return "Actualizada hace un momento";
    if (minutos < 60) return `Actualizada hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Actualizada hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return "Actualizada ayer";
    if (dias < 30) return `Actualizada hace ${dias} días`;
    return `Actualizada el ${fecha.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }

  /** Cuántas integraciones de esa categoría quedan por conectar. */
  getAvailableCount(category: IntegrationCategory): number {
    return this.availableIntegrations?.[category]?.length || 0;
  }

  /** Nombre en singular para el recuadro de "Añadir…" de cada sección. */
  getCategorySingular(category: IntegrationCategory): string {
    const label = this.getCategoryLabel(category);
    return label ? label.toLowerCase() : "integración";
  }

  getInactiveIntegrationsCount(): number {
    return this.integrations.filter((i) => !i.enabled).length;
  }

  /**
   * Orden vigente, leído del servicio de estado — que es quien realmente ordena.
   * Las propiedades locales `sortBy`/`sortField`/`sortDirection` nunca se
   * sincronizaron, así que los indicadores del diseño anterior no reflejaban
   * nada; estos getters sí.
   */
  get ordenCampo(): string {
    return this.stateService.currentState?.ui?.sortBy || "name";
  }

  get ordenAscendente(): boolean {
    return (this.stateService.currentState?.ui?.sortDirection || "asc") === "asc";
  }

  /** Hay algún filtro puesto (habilita el botón de limpiar). */
  isFiltered(): boolean {
    return (
      !!this.searchTerm ||
      !!this.filterCategory ||
      this.filterStatus !== "all" ||
      this.pendingOnly
    );
  }

  // Propiedades adicionales requeridas por el template
  filterCategory: IntegrationCategory | null = null;
  filterStatus: "all" | "active" | "inactive" | "error" = "all";
  errorMessage: string | null = null;
  showTutorial = false;
  toast: any = null;

  // Métodos helper para acceso seguro a propiedades
  getCategoryLabel(category: IntegrationCategory): string {
    return this.categoryLabels?.[category] || category;
  }

  openIntegrationConfigByCategory(category: IntegrationCategory): void {
    this.openIntegrationModal(undefined, category);
  }

  hasError(integration: Integration): boolean {
    return !integration.enabled; // Simplificado
  }

  isFeatured(integration: Integration): boolean {
    const featured = ["shopify", "wompi", "paypal", "stripe"];
    return featured.includes(integration.type);
  }

  getIntegrationLogo(type: string): string | null {
    return this.uiHelper.getLogo(type);
  }

  hasLogoError(integration: Integration): boolean {
    return this.uiHelper.hasImageError(integration.type);
  }

  handleImageError(event: any): void {
    const integrationId = event.target.getAttribute("data-integration-id");
    if (integrationId) {
      this.uiHelper.onImgError(integrationId, event);
    }
  }

  getIntegrationTypeName(type: string): string {
    // Convertir tipo a nombre amigable
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  getMaskedCredential(integration: Integration): string {
    if (!integration.credentials) return "No configurado";

    const creds = integration.credentials;
    let key: string | undefined;

    switch (integration.type) {
      case "shopify":
        key = creds.apiKey;
        break;
      case "wompi":
      case "stripe":
      case "mercadopago":
        key = creds.publicKey || creds.publishableKey;
        break;
      case "woocommerce":
        key = creds.consumerKey;
        break;
      case "epayco":
      case "paypal":
        key = creds.clientId;
        break;
      case "payu":
        key = creds.apiLogin;
        break;
      case "magento":
        return "Token Oculto";
      default:
        key =
          creds.apiKey ||
          creds.publicKey ||
          creds.clientId ||
          creds.access_token ||
          creds.accessToken;
    }

    if (!key || typeof key !== "string" || key.length < 4)
      return "No configurado";

    return "***" + key.slice(-4);
  }

  getEnvironmentClass(integration: Integration): string {
    const creds = integration.credentials;
    if (!creds) return "env-prod";

    if (creds.environment) {
      const env = creds.environment.toLowerCase();
      if (env === "sandbox" || env === "test") return "env-test";
      return "env-prod";
    }

    const key =
      creds.apiKey ||
      creds.publicKey ||
      creds.accessToken ||
      creds.publishableKey ||
      "";
    if (
      key.includes("test") ||
      key.includes("TEST-") ||
      key.includes("sandbox")
    )
      return "env-test";

    return "env-prod";
  }

  getEnvironmentName(integration: Integration): string {
    const creds = integration.credentials;
    if (!creds) return "Producción";

    if (creds.environment) {
      const env = creds.environment.toLowerCase();
      if (env === "sandbox" || env === "test") return "Pruebas";
      return "Producción";
    }

    const key =
      creds.apiKey ||
      creds.publicKey ||
      creds.accessToken ||
      creds.publishableKey ||
      "";
    if (
      key.includes("test") ||
      key.includes("TEST-") ||
      key.includes("sandbox")
    )
      return "Pruebas";

    return "Producción";
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
      case "test":
        return loadingState.test;
      case "toggle":
      case "save":
        return loadingState.save;
      case "delete":
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

  /**
   * Indica si el provider de la integracion tiene un dashboard generico
   * disponible (esta registrado en provider-registry.ts).
   * Usado para mostrar el boton "Dashboard" solo cuando aplica.
   */
  hasDashboard(integration: Integration): boolean {
    const provider = String(integration?.provider || integration?.type || '').toLowerCase();
    return listSupportedProviders().includes(provider);
  }

  /**
   * Navega al dashboard generico del provider, ej:
   *   /integrations/osmosis/dashboard
   * Multi-tenant safe: solo se navega cuando el provider esta registrado.
   */
  goToDashboard(integration: Integration, event: Event): void {
    event.stopPropagation();
    const provider = String(integration?.provider || integration?.type || '').toLowerCase();
    if (!provider) return;
    this.router.navigate(['/integrations', provider, 'dashboard']);
  }

  // Propiedades para la vista de lista
  sortField = "name";

  // Métodos adicionales para el template
  openIntegrationConfigByType(category: string, type: string): void {
    // Placeholder para abrir configuración por tipo específico
    console.log("Opening config for:", category, type);
  }

  getCategoryColor(type: string): string {
    return this.uiHelper.getCategoryColor(type);
  }

  private getIntegrationCategory(type: string): string {
    return this.uiHelper.getIntegrationCategory(type);
  }

  getIntegrationIcon(type: string): string {
    return this.uiHelper.getIntegrationIcon(type);
  }

  getTopSuggestionsForCategory(
    category: IntegrationCategory,
    limit: number,
  ): any[] {
    // Retornar solo integraciones activas
    const availableIntegrations =
      this.integrationsService.getAvailableIntegrations();
    const activeIntegrations = (availableIntegrations[category] || []).filter(
      (integration) => integration.active,
    );
    return activeIntegrations.slice(0, limit);
  }

  configureIntegration(
    integration: any,
    category: IntegrationCategory,
    event: Event,
  ): void {
    event.stopPropagation();
    // Crear nueva integración basada en la sugerencia
    const newIntegration: Partial<Integration> = {
      type: integration.id,
      name: integration.name,
      category: category,
      enabled: false,
      credentials: {},
    };
    this.openIntegrationModal(newIntegration as Integration);
  }

  getToastIcon(): string {
    if (!this.toast) return "";
    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };
    return icons[this.toast.type] || "fa-info-circle";
  }

  clearToast(): void {
    this.toast = null;
  }

  // Propiedades que necesita el template
  availableIntegrations: any = {};

  // Método helper para debugging
  private getCurrentCompanyId(): string {
    return localStorage.getItem("currentCompanyId") || "default";
  }

  // Método para debugging del estado
  debugState(): void {
    console.log("🐛 DEBUG STATE:");
    console.log("- Integrations from service:", this.integrations);
    console.log("- Filtered integrations:", this.filteredIntegrations);
    console.log("- Loading state:", this.loading);
    console.log("- Current filters:", this.stateService.currentState.filters);
    console.log(
      "- State service integrations:",
      this.stateService.currentState.integrations,
    );
  }

  // Método para forzar la actualización manual (para debugging)
  forceRefreshFromAPI(): void {
    console.log("💪 Forzando refresh completo desde API...");

    // Limpiar todo el estado
    this.stateService.reset();

    // Invalidar cache
    this.integrationsService.invalidateAllCache();

    // Recargar
    setTimeout(() => {
      this.loadIntegrations();
    }, 100);
  }

  // Método para verificar conectividad con la API
  async testAPIConnection(): Promise<void> {
    console.log("🔌 Probando conexión con la API...");

    try {
      // Hacer una llamada de prueba directamente
      const response = await fetch(this.getAPIUrl(), {
        method: "GET",
        headers: this.getAPIHeaders(),
      });

      console.log("📡 Respuesta de la API:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Datos recibidos:", data);
        this.uiHelper.showSuccess("Conexión con la API exitosa");
      } else {
        console.error(
          "❌ Error en la respuesta:",
          response.status,
          response.statusText,
        );
        this.uiHelper.showError(
          `Error de API: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("❌ Error de conexión:", error);
      this.uiHelper.showError("Error de conexión con la API");
    }
  }

  private getAPIUrl(): string {
    // Adapta esta URL según tu configuración
    const baseUrl = "http://localhost:3000"; // o tu URL base
    const companyId = this.getCurrentCompanyId();
    return `${baseUrl}/v1/integration/config?companyId=${companyId}`;
  }

  private getAPIHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.getAuthToken()}`,
      // Agrega otros headers según tu configuración
    };
  }

  private getAuthToken(): string {
    // Adapta según tu sistema de autenticación
    return localStorage.getItem("authToken") || "";
  }

  // Métodos de debugging mejorados para el template
  getSortedAndFilteredIntegrations(): Integration[] {
    return this.applyPendingOnly(this.filteredIntegrations);
  }

  /** Capa extra del aviso "sin credencial"; no toca los filtros del servicio. */
  private applyPendingOnly(lista: Integration[]): Integration[] {
    if (!this.pendingOnly) return lista;
    return lista.filter((i) => !this.hasCredential(i));
  }

  isDateValid(date: string | undefined | null): boolean {
    if (!date) {
      return false;
    }
    return !isNaN(new Date(date).getTime());
  }

  getFilteredIntegrationsByCategory(
    category: IntegrationCategory,
  ): Integration[] {
    return this.applyPendingOnly(this.filteredIntegrations).filter(
      (i) => i.category === category,
    );
  }

  shouldShowCategory(category: IntegrationCategory): boolean {
    const hasIntegrations =
      this.getFilteredIntegrationsByCategory(category).length > 0;
    return (
      hasIntegrations &&
      (!this.selectedCategory || this.selectedCategory === category)
    );
  }

  countIntegrationsInCategory(category: IntegrationCategory): number {
    return this.integrations.filter((i) => i.category === category).length;
  }

  // Método temporal para mostrar toda la información de debugging en una sola llamada
  showCompleteDebugInfo(): void {
    console.log("🐛 COMPLETE DEBUG INFO:");
    console.log("=".repeat(50));

    console.log("📊 BASIC STATE:");
    console.log("- loading:", this.loading);
    console.log("- errorMessage:", this.errorMessage);
    console.log("- viewMode:", this.viewMode);
    console.log("- integrations.length:", this.integrations.length);
    console.log(
      "- filteredIntegrations.length:",
      this.filteredIntegrations.length,
    );

    console.log("\n🎛️ FILTERS:");
    console.log("- searchTerm:", this.searchTerm);
    console.log("- filterCategory:", this.filterCategory);
    console.log("- filterStatus:", this.filterStatus);
    console.log("- selectedCategory:", this.selectedCategory);

    console.log("\n📁 CATEGORIES BREAKDOWN:");
    this.categories.forEach((category) => {
      const totalInCategory = this.countIntegrationsInCategory(category);
      const filteredInCategory =
        this.getFilteredIntegrationsByCategory(category).length;
      const shouldShow = this.shouldShowCategory(category);

      console.log(`  ${category}:`, {
        total: totalInCategory,
        filtered: filteredInCategory,
        shouldShow: shouldShow,
      });
    });

    console.log("\n📋 INTEGRATIONS DATA:");
    if (this.integrations.length > 0) {
      console.log("First integration sample:", this.integrations[0]);
    }

    console.log("\n🔍 FILTERED DATA:");
    if (this.filteredIntegrations.length > 0) {
      console.log("First filtered integration:", this.filteredIntegrations[0]);
    }

    console.log("\n🏪 STATE SERVICE:");
    const currentState = this.stateService.currentState;
    console.log(
      "- state.integrations.length:",
      currentState.integrations.length,
    );
    console.log("- state.filters:", currentState.filters);
    console.log("- state.loading:", currentState.loading);
    console.log("- state.errors:", currentState.errors);

    console.log("=".repeat(50));
  }

  // Métodos de control manual
  manualCleanupCache(): void {
    this.manualControlService.cleanupCache();
    this.showToast("success", "Cache limpiado manualmente");
  }

  manualUpdateCacheStats(): void {
    this.manualControlService.updateCacheStats();
    this.showToast("success", "Estadísticas del cache actualizadas");
  }

  manualRefreshState(): void {
    this.manualControlService.refreshIntegrationsState();
    this.showToast("success", "Estado de integraciones refrescado");
  }

  manualHealthCheck(): void {
    this.manualControlService.performHealthCheck();
    this.showToast("info", "Health check iniciado manualmente");
  }

  clearAllCache(): void {
    this.manualControlService.clearAllCache();
    this.showToast("success", "Todo el cache limpiado");
  }

  showCacheStats(): void {
    const stats = this.manualControlService.getCacheStats();
    const info = this.manualControlService.getCacheInfo();
    console.log("📊 Cache Stats:", stats);
    console.log("📋 Cache Info:", info);
    this.showToast("info", "Estadísticas del cache mostradas en consola");
  }

  private showToast(
    type: "success" | "error" | "warning" | "info",
    message: string,
  ): void {
    this.toast = { type, message };
    setTimeout(() => this.clearToast(), 3000);
  }

  navigateToShopifyDashboard(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/integrations/shopify']);
  }

  // Métodos para formularios dinámicos
}
