import { Component, ViewEncapsulation, HostListener, OnInit, OnDestroy, ElementRef, Renderer2, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Menu, NavService, PREVIOUS_TITLES_UNTIL } from '../../services/nav.service';
import { LayoutService } from '../../services/layout.service';
import { environment } from '../../../../environments/environment';
import { SecurityService } from '../../services/security/security.service';
import { CompanyInformation } from '../../models/User/CompanyInformation';
import { NotificationManagerService } from '../../services/notifications/notification-manager.service';
import { NotificationStatus } from '../../services/notifications/notification.types';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SubscriptionService } from '../../services/subscription.service';
import { FilaMenu, ResultadoBusqueda, SeccionVista, buscarEntradas, construirVistaMenu, hasNewChild as tieneHijoNuevo, insigniaVigente } from './menu-vista';
import {
  FavoritoGuardado, FavoritoVista, agregarFavorito, cargarFavoritos, esFavorito, guardarFavoritos, quitarFavorito, resolverFavoritos
} from './menu-favoritos';
import { ModoMenu, guardarModo, modoInicial } from './menu-modo';
import { TranslateService } from '@ngx-translate/core';
// Asegúrate de que PlanSelectorComponent esté importado si aún no lo está
// import { PlanSelectorComponent } from '../plan-selector/plan-selector.component';

// Nueva interfaz para las secciones
export interface SidebarSection {
  /** D-546 F3: `id` estable de la sección (el estado plegado se guarda con él). */
  id?: string;
  /** F3: la sección es un grupo `inline` (Finanzas, Comunicaciones): su cabecera lleva la estrella de ese grupo. */
  grupoEnLinea?: { id: string; titulo: string };
  title: string | null;
  /** D-546 F2: ícono Tabler de la sección (`menuIcon` de su cabecera). */
  icono?: string;
  items: Menu[];
  /** D-546: las filas ya resueltas que dibuja la plantilla (`construirVistaMenu`). */
  filas: FilaMenu[];
  collapsed: boolean;
  isHeaderSection: boolean; // Para saber si tiene título o es la sección inicial
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SidebarComponent implements OnInit, OnDestroy, AfterViewInit {

  /** Navega a una ruta y cierra el panel flotante del modo compacto, si hay uno abierto. */
  private navigateAndCleanup(path: string): void {
    this.cerrarPanel();
    this.router.navigate([path]);
  }

  public showPlanModal: boolean = false;
  public currentPlan: any = {
    type: 'Freemium',
    status: 'active',
    progress: 0,
    renewalDate: '',
    walletBalance: 0,
    usage: {
      orders: { current: 0, limit: 15 },
      chatAI: { current: 0, limit: 10 },
      productsAI: { current: 0, limit: 10 },
      voice: { enabled: false },
      video: { enabled: false }
    },
    daysLeft: 0
  };
  private destroy$ = new Subject<void>();
  public iconSidebar;
  // public menuItems: Menu[]; // Ya no usaremos esto directamente en el template
  public url: any;
  public fileurl: any;
  companyInformation: CompanyInformation;

  public margin: any = 0;
  public width: any = window.innerWidth;
  public leftArrowNone: boolean = true;
  public rightArrowNone: boolean = false;
  version = environment.version;

  public isCollapsed: boolean = false;
  public collapseMenu: boolean = false;
  public isPlanCardCollapsed: boolean = true; // compacto por defecto: libera espacio para el menú
  public isAdminUser: boolean = false;

  public searchTerm: string = '';
  public searchResults: ResultadoBusqueda[] = [];
  public isSearchActive: boolean = false;
  /** F3: lo guardado en `sidebarFavoritesV2` (rutas e `id` de grupo) y su resolución contra el menú actual. */
  private favoritosGuardados: FavoritoGuardado[] = [];
  public favoritos: FavoritoVista[] = [];
  private favoritosPendientes = false;
  private vista: SeccionVista[] = [];
  public isSearchFocused: boolean = false;

  // Propiedades del perfil de usuario (Glassmorphism redesign)
  public userName: string = '';
  public userInitials: string = '';
  public userAvatarUrl: string = '';
  public greeting: string = 'shell.sidebar.greetingHello'; // clave del saludo según la hora (D-540: la plantilla la traduce)

  // Solo el primer nombre, para un saludo más limpio
  get firstName(): string {
    return (this.userName || '').trim().split(' ')[0] || this.userName;
  }

  // Variables para control de gestos en móviles
  private touchStartX: number = 0;
  private touchEndX: number = 0;
  private swipeThreshold: number = 50;

  // Nueva propiedad para las secciones colapsables
  public sections: SidebarSection[] = [];

  // La identidad del nodo evita colisiones entre títulos repetidos, como Logística.
  private menuKeys = new WeakMap<Menu, string>();
  private nextMenuKey = 0;

  // Propiedades para notificaciones
  public unreadNotificationCount: number = 0;
  public hasNewNotifications: boolean = false;
  public latestNotification: string = '';
  public notificationSoundEnabled: boolean = true;
  private notificationSubscription: Subscription;
  private newNotificationTimer: any;

  // Propiedades para auto-hide
  public isAutoHideEnabled: boolean = false;
  public isSidebarVisible: boolean = true;
  public isPinned: boolean = true;
  public isHovering: boolean = false;
  private hoverTimeout: any;
  private hideTimeout: any;
  private clickOutsideListener: any;
  private hoverZoneListener: any;
  private sidebarStateSubscription: Subscription;

  constructor(
    private router: Router,
    public navServices: NavService,
    public layout: LayoutService,
    private securityService: SecurityService,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private notificationManager: NotificationManagerService,
    private subscriptionService: SubscriptionService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {
    // Procesar items del menú en secciones cada vez que cambian
    this.navServices.items.pipe(takeUntil(this.destroy$)).subscribe(menuItems => {
      this.processMenuItems(menuItems);
    });

    // Marcar el item activo según la ruta — UNA sola suscripción
    // (antes estaba anidada dentro de items.subscribe, lo que acumulaba suscripciones y filtraba memoria)
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Marcar como activo el item correspondiente a la URL actual
        // (los padres se marcan automáticamente en setActiveRecursive())
        const originalMenuItems = this.navServices.getMenuItems();

        let activeItemFound = false;
        originalMenuItems.forEach(items => {
          if (activeItemFound) return;
          if (items.path === event.url) { this.setNavActive(items); activeItemFound = true; return; }
          if (!items.children) return;
          items.children.forEach(subItems => {
            if (activeItemFound) return;
            if (subItems.path === event.url) { this.setNavActive(subItems); activeItemFound = true; return; }
            if (!subItems.children) return;
            subItems.children.forEach(subSubItems => {
              if (activeItemFound) return;
              if (subSubItems.path === event.url) { this.setNavActive(subSubItems); activeItemFound = true; return; }
            });
          });
        });

        // Reflejar cambios de active state en las secciones procesadas
        this.processMenuItems(originalMenuItems);
        this.collapseMenu = this.navServices.collapseSidebar;

        // En móviles, cerrar el menú después de navegar
        if (window.innerWidth < 992) {
          this.collapseMenu = true;
          this.restoreBodyScroll();
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadSubscriptionData();
    this.securityService.getCompanyInformationLogged$().subscribe((companyInformation: CompanyInformation | null) => {
      if (!companyInformation) {
        companyInformation = this.securityService.getCompanyInformationLogged();
      }
      this.companyInformation = companyInformation || {} as CompanyInformation;
    });

    const savedState = localStorage.getItem('planCardCollapsed');
    if (savedState) {
      this.isPlanCardCollapsed = savedState === 'true';
    }

    // Verificar permisos de administrador para Plan Card
    this.isAdminUser = this.checkIfUserIsAdmin();

    // Configurar estado inicial basado en tamaño de pantalla
    this.initializeSidebarState();

    // Inicializar sistema de notificaciones
    this.initializeNotifications();

    // Cargar favoritos
    this.loadFavoriteItems();

    // Inicializar perfil de usuario para glassmorphism sidebar
    this.initializeUserProfile();

    // Configurar eventos táctiles para dispositivos móviles
    setTimeout(() => {
      this.setupMobileGestures();
    }, 100);

    // Inicializar auto-hide
    this.initializeAutoHide();
  }

  ngAfterViewInit(): void {
    // Configurar zona de hover para auto-hide
    this.setupHoverZone();
  }

  // Configurar eventos táctiles para móviles
  // Inicializar estado del sidebar
  private initializeSidebarState(): void {
    // Inicializar LayoutService con el estado actual de NavService
    const currentCollapsedState = this.navServices.collapseSidebar;
    this.layout.updateSidebarState({
      isCollapsed: currentCollapsedState,
      isAutoHideEnabled: false,
      isAutoCollapseEnabled: false,
      isVisible: true,
      isPinned: false,
      isHovering: false
    });

    if (this.isMobile()) {
      // En móvil: siempre empezar colapsado
      this.collapseMenu = true;
      this.navServices.collapseSidebar = true;
    } else {
      // En desktop: el modo que eligió este usuario (abierto o compacto); abierto por defecto
      this.aplicarModo(this.modoDelUsuario());
    }
  }

  /**
   * Verifica si el usuario actual tiene permisos de administrador
   * @returns true si el usuario es administrador, false en caso contrario
   */
  private checkIfUserIsAdmin(): boolean {
    try {
      // Leer usuario desde localStorage
      const userStr = localStorage.getItem('user');

      if (!userStr) {
        return false;
      }

      // Parsear el objeto usuario
      const user = JSON.parse(userStr);

      if (!user || !user.rol) {
        return false;
      }

      const userRole = user.rol;

      // Verificar si es Super Administrador (case sensitive)
      if (userRole === 'Super Administrador') {
        return true;
      }

      // Verificar si contiene "admin" (case insensitive)
      if (userRole.toLowerCase().includes('admin')) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('[Plan Card Access] Error checking user role:', error);
      return false;
    }
  }

  // Configurar eventos táctiles para dispositivos móviles
  private setupMobileGestures(): void {
    // Limpiar listeners existentes para evitar duplicados
    this.cleanupEventListeners();

    // Añadir listeners para eventos táctiles
    this.touchStartListener = this.handleTouchStart.bind(this);
    this.touchEndListener = this.handleTouchEnd.bind(this);
    this.resizeListener = this.handleResize.bind(this);

    document.addEventListener('touchstart', this.touchStartListener, { passive: true });
    document.addEventListener('touchend', this.touchEndListener, { passive: true });
    window.addEventListener('resize', this.resizeListener);

    // Configurar overlay y swipe indicator después de que el DOM esté listo
    this.setupOverlayListeners();
  }

  // Variables para gestión de listeners
  private touchStartListener: any;
  private touchEndListener: any;
  private resizeListener: any;
  private overlayListener: any;
  private swipeListener: any;

  // Limpiar event listeners
  private cleanupEventListeners(): void {
    if (this.touchStartListener) {
      document.removeEventListener('touchstart', this.touchStartListener);
    }
    if (this.touchEndListener) {
      document.removeEventListener('touchend', this.touchEndListener);
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.overlayListener) {
      this.overlayListener();
    }
    if (this.swipeListener) {
      this.swipeListener();
    }
  }

  // Manejar resize de ventana
  private handleResize(): void {
    const wasMobile = this.isMobile();

    if (window.innerWidth >= 992) {
      // Desktop: restaurar estado normal
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';

      // Al volver a escritorio se recupera el modo que eligió este usuario
      this.aplicarModo(this.modoDelUsuario());
    } else {
      // Móvil: cerrar sidebar
      if (!this.collapseMenu) {
        this.collapseMenu = true;
        this.navServices.collapseSidebar = true;
        this.restoreBodyScroll();
      }
    }
  }

  // Configurar listeners para overlay y swipe
  private setupOverlayListeners(): void {
    setTimeout(() => {
      const overlay = document.querySelector('.sidebar-overlay');
      const swipeIndicator = document.querySelector('.sidebar-swipe-indicator');

      if (overlay) {
        this.overlayListener = this.renderer.listen(overlay, 'click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!this.collapseMenu && this.isMobile()) {
            this.sidebarToggle();
          }
        });
      }

      if (swipeIndicator) {
        this.swipeListener = this.renderer.listen(swipeIndicator, 'click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (this.collapseMenu && this.isMobile()) {
            this.sidebarToggle();
          }
        });
      }
    }, 200);
  }

  // Manejar inicio de toque
  private handleTouchStart(event: TouchEvent): void {
    // Ignorar toques en el botón hamburguesa para evitar conflictos
    const target = event.target as HTMLElement;
    if (target.closest('.sidebar-toggle-btn')) {
      return;
    }

    this.touchStartX = event.touches[0].clientX;
  }

  // Manejar fin de toque y detectar deslizamiento
  private handleTouchEnd(event: TouchEvent): void {
    // Ignorar toques en el botón hamburguesa para evitar conflictos
    const target = event.target as HTMLElement;
    if (target.closest('.sidebar-toggle-btn')) {
      return;
    }

    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  // Detectar tipo de deslizamiento y actuar en consecuencia
  private handleSwipe(): void {
    const distance = this.touchEndX - this.touchStartX;

    // Si estamos en móvil y el swipe es suficientemente largo
    if (this.isMobile() && Math.abs(distance) > this.swipeThreshold && !this.isToggling) {
      // Si auto-hide está activado, usar la lógica de auto-hide
      if (this.isAutoHideEnabled) {
        this.handleSwipeGesture(this.touchStartX, this.touchEndX);
      } else {
        // Lógica original para modo normal
        if (distance > 0 && this.collapseMenu && this.touchStartX < 50) {
          // Deslizamiento de izquierda a derecha desde el borde (abrir menú)
          this.sidebarToggle();
        } else if (distance < 0 && !this.collapseMenu) {
          // Deslizamiento de derecha a izquierda (cerrar menú)
          this.sidebarToggle();
        }
      }
    }
  }

  // Convierte el menú filtrado en secciones con sus filas (D-546: `construirVistaMenu`).
  private processMenuItems(menuItems: Menu[]): void {
    // Ocultar rutas y títulos de Empresa/Usuarios/Roles (viven en Configuración de empresa)
    const shouldHide = (mi: Menu): boolean => {
      const path = (mi.path || '').toLowerCase();
      const title = (mi.title || '').toLowerCase();
      if (path.includes('/empresas') || path.includes('/usuarios') || path.includes('/rol')) return true;
      if (title.includes('empresa') || title.includes('usuario') || title.includes('rol')) return true;
      return false;
    };

    this.vista = construirVistaMenu(menuItems, shouldHide);
    this.sections = this.vista.map(seccion => ({
      id: seccion.id,
      grupoEnLinea: seccion.grupoEnLinea,
      title: seccion.titulo,
      icono: seccion.icono,
      items: seccion.items,
      filas: seccion.filas,
      collapsed: true,
      isHeaderSection: seccion.isHeaderSection
    }));

    // Recuperar estado colapsado de localStorage (por `id`; el formato de antes, por título, se sigue leyendo)
    const savedSectionsState = localStorage.getItem('sidebarSectionsState');
    if (savedSectionsState) {
      try {
        const collapsedStates: { [clave: string]: boolean } = JSON.parse(savedSectionsState);

        // Aplicar estados guardados a las secciones
        this.sections.forEach(section => {
          const guardado = this.estadoGuardadoDe(collapsedStates, section);
          if (guardado !== undefined) {
            section.collapsed = guardado;
          }
        });
      } catch (e) {
        console.error("Error loading sidebar sections state:", e);
        localStorage.removeItem('sidebarSectionsState');
      }
    }

    // Los favoritos se resuelven contra el menú de ahora: un cambio de nombre no los rompe.
    this.sincronizarFavoritos();
  }

  /** El título que tenía cada sección antes de F3, para leer el estado plegado guardado con el formato viejo. */
  private static readonly TITULOS_VIEJOS_DE_SECCIONES: Record<string, string> = {
    'seccion-comercial': 'Gestión Comercial',
    'seccion-inventario': 'Inventarios y Productos',
    'seccion-analitica': 'Inteligencia de Negocios',
  };

  private estadoGuardadoDe(estados: { [clave: string]: boolean }, section: SidebarSection): boolean | undefined {
    if (section.id && estados[section.id] !== undefined) { return estados[section.id]; }
    const viejo = (section.id && SidebarComponent.TITULOS_VIEJOS_DE_SECCIONES[section.id]) || section.title;
    return viejo ? estados[viejo] : undefined;
  }

  // Method to close sidebar after navigation on mobile/tablet
  onMobileLinkClick(): void {
    if (window.innerWidth < 992) {
      // Close sidebar on mobile/tablet after navigation
      setTimeout(() => {
        this.navServices.hideMobileSidebar();
      }, 100); // Small delay to ensure navigation starts
    } else {
      // Compacto: al navegar se cierra el panel flotante del grupo
      this.cerrarPanel();
    }
  }

  // Nueva función para colapsar/expandir secciones
  toggleSection(section: SidebarSection): void {
    if (section.isHeaderSection) {
      // ACCORDION: Si vamos a expandir esta sección, colapsar las demás
      if (section.collapsed) {
        this.sections.forEach(s => {
          if (s !== section && s.isHeaderSection) {
            s.collapsed = true;
          }
        });
      }

      section.collapsed = !section.collapsed;
      this.saveSectionsState(); // Guardar estado
    }
  }

  // Guardar estado colapsado en localStorage
  private saveSectionsState(): void {
    let collapsedStates: { [clave: string]: boolean } = {};
    try {
      collapsedStates = JSON.parse(localStorage.getItem('sidebarSectionsState') || '{}') || {};
    } catch {
      collapsedStates = {};
    }
    this.sections.forEach(section => {
      const clave = section.id || section.title;
      if (clave) {
        collapsedStates[clave] = section.collapsed;
      }
    });
    localStorage.setItem('sidebarSectionsState', JSON.stringify(collapsedStates));
  }

  // Limpiar estados activos recursivamente
  private clearActiveStatesRecursive(item: Menu | null, activeItem: Menu | null): void {
    if (!item) return; // Si el item es null (filtrado), no hacer nada
    if (item !== activeItem) {
      item.active = false;
    }
    if (item.children) {
      item.children.forEach(child => this.clearActiveStatesRecursive(child, activeItem));
    }
  }

  // --- Métodos existentes (adaptar setNavActive si es necesario) ---

  private calculateWidth(windowWidth: number): void {
    this.width = windowWidth - 500;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.calculateWidth((event.target as Window).innerWidth);
  }
  openPlanModal() {
    this.showPlanModal = true;
  }

  viewSubscriptionDetails() {
    this.navigateAndCleanup('/billing');
  }

  closePlanModal() {
    this.showPlanModal = false;
    document.body.style.overflow = '';
    // Refrescar datos de suscripción al cerrar el modal
    this.subscriptionService.refresh();
  }

  private loadSubscriptionData(): void {

    // Cargar estado de suscripción
    this.subscriptionService.subscription$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(subscription => {
      if (subscription) {
        this.currentPlan.type = subscription.plan === 'premium' ? 'Premium' : 'Freemium';
        this.currentPlan.status = subscription.status;

        // En Premium la tarjeta dice "Próximo cobro", por lo que debe usar la
        // fecha canónica de facturación. `orders.resetDate` solo corresponde al
        // reinicio mensual del contador de pedidos y puede contener datos legacy.
        const renewalDate = subscription.plan === 'premium'
          ? (subscription.nextBillingDate || subscription.premiumUntil)
          : subscription.limits?.orders?.resetDate;

        this.currentPlan.renewalDate = renewalDate
          ? this.formatDate(renewalDate)
          : null; // D-540: sin fecha, la plantilla muestra «No definida» traducido
        this.currentPlan.daysLeft = renewalDate
          ? this.calculateDaysUntilReset(renewalDate)
          : 0;
      }
    });

    // Cargar estadísticas de uso
    this.subscriptionService.usage$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(usage => {
      if (usage) {
        this.currentPlan.usage = {
          orders: {
            current: usage.orders?.current ?? 0,
            limit: usage.orders?.limit ?? 15
          },
          chatAI: {
            current: usage.ai?.chat?.used ?? 0,
            limit: usage.ai?.chat?.limit ?? 10
          },
          productsAI: {
            current: usage.ai?.products?.used ?? 0,
            limit: usage.ai?.products?.limit ?? 10
          },
          voice: {
            enabled: (usage.ai?.voice?.limit || 0) > 0
          },
          video: {
            enabled: (usage.ai?.video?.limit || 0) > 0
          }
        };

        this.currentPlan.progress = this.calculateOrderProgress(usage);
      }
    });

    // Trigger initial load
    this.subscriptionService.loadSubscriptionStatus().subscribe({
      error: (err) => console.error('❌ Error cargando suscripción:', err)
    });

    this.subscriptionService.getUsageStats().subscribe({
      error: (err) => console.error('❌ Error cargando uso:', err)
    });
  }

  private calculateOrderProgress(usage: any): number {
    const current = usage.orders?.current ?? 0;
    const limit = usage.orders?.limit ?? 0;
    if (limit <= 0 || limit === -1) return 0;
    return Math.min(100, Math.round((current / limit) * 100));
  }

  private calculateDaysUntilReset(resetDate: any): number {
    try {
      const today = new Date();
      const reset = new Date(resetDate);
      const diffTime = reset.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch (e) {
      return 0;
    }
  }

  private formatDate(date: any): string | null {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return null;
    }
  }

  onPlanSelected(planData: any) {
    // Actualizar el plan actual con los nuevos datos
    if (planData && planData.nombrePlan) {
      this.currentPlan.type = planData.nombrePlan;

      // Guardar actualización en sessionStorage
      try {
        const currentCompanyStr = sessionStorage.getItem('currentCompany');
        if (currentCompanyStr) {
          const currentCompany = JSON.parse(currentCompanyStr);
          if (currentCompany && currentCompany.plan) {
            // Actualizar los datos del plan
            currentCompany.plan.nombre = planData.nombrePlan;
            currentCompany.plan.planPago = planData.planPago;
            currentCompany.plan.tipoPrecio = planData.tipoPrecio;

            // Guardar en sessionStorage
            sessionStorage.setItem('currentCompany', JSON.stringify(currentCompany));
          }
        }
      } catch (error) {
        console.error('Error al actualizar plan en sessionStorage:', error);
      }
    }

    this.closePlanModal();
  }

  sidebarToggle() {
    // Prevenir toggle múltiple rápido
    if (this.isToggling) {
      return;
    }

    this.isToggling = true;

    // Cambiar estado via LayoutService
    this.layout.toggleCollapse();
    this.collapseMenu = this.layout.getSidebarState().isCollapsed;
    this.navServices.collapseSidebar = this.collapseMenu;

    // Actualizar ContentComponent para que refleje el cambio inmediatamente
    this.updateContentMargin();

    // Cerrar el panel flotante si está abierto
    this.cerrarPanel();

    // Manejar body scroll SOLO en móviles
    if (this.isMobile()) {
      if (!this.collapseMenu) {
        // Menú abierto en móvil
        this.preventBodyScroll();
      } else {
        // Menú cerrado - restaurar scroll
        this.restoreBodyScroll();
      }
    }

    // Cerrar búsqueda activa cuando se cierra el sidebar
    if (this.collapseMenu && this.isSearchActive) {
      this.clearSearch();
    }

    // Compacto: los grupos abiertos de antes no se ven; se cierran para que no reaparezcan abiertos
    if (this.collapseMenu && !this.isMobile()) {
      this.closeAllSubmenus();
    }

    // Recordar la elección de este usuario SOLO en escritorio
    this.persistirModo();

    // Liberar lock de toggle después de animación - optimizado para responsividad inmediata
    setTimeout(() => {
      this.isToggling = false;
    }, 100);
  }

  // Variable para prevenir toggle múltiple
  private isToggling = false;

  // Método simplificado para toggle móvil
  toggleSidebarMobile(event: Event): void {
    // Prevenir que el evento se propague a otros listeners
    event.stopPropagation();
    event.preventDefault();

    // Ejecutar toggle directamente sin complicaciones
    if (!this.isToggling) {
      this.sidebarToggle();
    }
  }

  // Métodos auxiliares para manejo de scroll
  private preventBodyScroll(): void {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-scroll-y', scrollY.toString());
  }

  private restoreBodyScroll(): void {
    const scrollY = document.body.getAttribute('data-scroll-y');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';

    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY));
      document.body.removeAttribute('data-scroll-y');
    }
  }

  // Active Nav state - Marca el item activo y sus ancestros en la fuente original
  setNavActive(item) {
    if (!item) return;
    const originalMenuItems = this.navServices.getMenuItems(); // Trabajar con la fuente
    originalMenuItems.forEach(menuItem => this.setActiveRecursive(menuItem, item));
    this.processMenuItems(originalMenuItems); // Actualizar la vista (secciones)
    this.collapseMenu = this.navServices.collapseSidebar;
  }

  // Helper recursivo para marcar el estado activo en el item y sus ancestros
  // MEJORA: Solo marca como activo, NO desactiva items (para mantener submenús abiertos)
  private setActiveRecursive(currentItem: Menu, activeItem: Menu): boolean {
    let isActive = false;
    if (currentItem === activeItem) {
      isActive = true;
    } else if (currentItem.children) {
      currentItem.children.forEach(child => {
        if (this.setActiveRecursive(child, activeItem)) {
          isActive = true;
        }
      });
    }
    // Solo marcar como activo si es el item o un ancestro
    // NO desactivar items que el usuario abrió manualmente
    if (isActive) {
      currentItem.active = true;
    }
    return isActive; // Devolver si este subárbol contiene el item activo
  }

  // ==================== ESTADO DEL ACORDEÓN ====================

  /**
   * Genera una clave única para identificar un item del menú
   */
  getMenuKey(item: Menu): string {
    if (!this.menuKeys.has(item)) {
      this.menuKeys.set(item, `sidebar-menu-${this.nextMenuKey++}`);
    }
    return this.menuKeys.get(item);
  }

  /**
   * Ticket 1078 (D-356): ruta del menú siempre absoluta. El menú trae rutas
   * relativas ("inventario/inventario-catalogo") y un `[routerLink]` relativo se
   * resuelve contra la ruta donde está montado el layout: estando en /pricing
   * (a donde manda el guard de suscripción) cada clic iba a
   * /pricing/inventario/... y daba 404.
   */
  rutaMenu(path: string | undefined): string | undefined {
    if (!path) { return path; }
    return path.startsWith('/') ? path : `/${path}`;
  }

  /**
   * Usa el mismo estado que renderiza la plantilla, también tras navegar o cambiar de tamaño.
   */
  isMenuOpen(item: Menu): boolean {
    return !!item.active;
  }

  /**
   * Cierra TODOS los menús de primer nivel (ACCORDION GLOBAL)
   */
  private closeAllFirstLevelMenus(): void {
    this.sections.forEach(section => {
      section.items.forEach(menuItem => {
        if (menuItem.children) {
          menuItem.active = false;
          this.closeChildrenRecursive(menuItem);
        }
      });
    });
  }

  // Click Toggle menu - Para submenús dentro de items
  toggletNavActive(item: Menu, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const isCurrentlyOpen = this.isMenuOpen(item);
    const isFirstLevel = this.isFirstLevelItem(item);

    // Compacto en escritorio: el grupo abre su panel flotante (D-546 D8), no se despliega en la lista.
    if (this.compacto) {
      if (item.path && !item.children) {
        this.navigateAndCleanup(item.path);
        return;
      }
      const fila = this.filaDeFuente(item);
      if (fila) { this.abrirPanel(fila, event); }
      return;
    }

    // En móviles, manejar con delay
    if (this.isMobile() && item.children) {
      // Aplicar accordion antes del toggle móvil
      if (!isCurrentlyOpen && isFirstLevel) {
        this.closeAllFirstLevelMenus();
      }
      this.handleMobileSubmenuToggle(item, event);
      return;
    }

    // ACCORDION GLOBAL: Si vamos a ABRIR y tiene hijos, cerrar hermanos (para todos los niveles)
    if (!isCurrentlyOpen && item.children) {
      this.closeSiblings(item);
    }

    // Alternar el estado que usa la vista.
    if (isCurrentlyOpen) {
      this.closeChildrenRecursive(item);
      item.active = false;
    } else {
      item.active = true;
    }

    this.cdr.detectChanges();
  }

  // Helper para resetear el estado activo al hacer toggle en submenús
  private resetActiveState(currentItem: Menu, toggledItem: Menu): void {
    // Solo desactivar si NO es el item clickeado Y NO es un ancestro del item clickeado
    if (currentItem !== toggledItem && !this.isAncestor(currentItem, toggledItem)) {
      currentItem.active = false;
    }
    // Recorrer hijos independientemente de si se desactivó el padre
    if (currentItem.children) {
      currentItem.children.forEach(child => this.resetActiveState(child, toggledItem));
    }
  }

  // Helper para verificar si un item es ancestro de otro
  private isAncestor(potentialAncestor: Menu, item: Menu): boolean {
    if (!potentialAncestor.children) return false;
    if (potentialAncestor.children.includes(item)) return true;
    return potentialAncestor.children.some(child => this.isAncestor(child, item));
  }

  // Helper para cerrar todos los hijos de un item recursivamente
  private closeChildrenRecursive(item: Menu): void {
    if (item.children) {
      item.children.forEach(child => {
        child.active = false;
        this.closeChildrenRecursive(child);
      });

    }
  }

  // ACCORDION GLOBAL: Cerrar hermanos del item en el mismo nivel (TODAS las secciones)
  private closeSiblings(item: Menu): void {
    const isFirstLevel = this.isFirstLevelItem(item);

    // Si es de primer nivel, cerrar TODOS los otros items de primer nivel en TODAS las secciones
    if (isFirstLevel) {
      // Cerrar directamente en sections (la vista que se renderiza)
      this.sections.forEach(section => {
        section.items.forEach(menuItem => {
          if (menuItem !== item && menuItem.active && menuItem.children) {
            menuItem.active = false;
            this.closeChildrenRecursive(menuItem);
          }
        });
      });

      // También cerrar en originalMenuItems para mantener sincronizado
      const originalMenuItems = this.navServices.getMenuItems();
      originalMenuItems.forEach(menuItem => {
        if (menuItem !== item && menuItem.active && menuItem.children) {
          menuItem.active = false;
          this.closeChildrenRecursive(menuItem);
        }
      });
    } else {
      // Si es de segundo nivel o más, buscar y cerrar hermanos en el mismo padre
      this.sections.forEach(section => {
        section.items.forEach(menuItem => {
          if (menuItem.children) {
            this.closeSiblingsInChildren(menuItem.children, item);
          }
        });
      });

      const originalMenuItems = this.navServices.getMenuItems();
      originalMenuItems.forEach(menuItem => {
        if (menuItem.children) {
          this.closeSiblingsInChildren(menuItem.children, item);
        }
      });
    }
  }

  // Helper para cerrar hermanos dentro de un array de hijos
  private closeSiblingsInChildren(children: Menu[], targetItem: Menu): void {
    // Verificar si el targetItem está en este nivel
    const isInThisLevel = children.includes(targetItem);

    if (isInThisLevel) {
      // Cerrar todos los hermanos excepto el target
      children.forEach(child => {
        if (child !== targetItem && child.active) {
          child.active = false;
          this.closeChildrenRecursive(child);
        }
      });
    } else {
      // Buscar recursivamente en niveles más profundos
      children.forEach(child => {
        if (child.children) {
          this.closeSiblingsInChildren(child.children, targetItem);
        }
      });
    }
  }

  // Verificar si un item es de primer nivel (está directamente en sections.items)
  private isFirstLevelItem(item: Menu): boolean {
    const result = this.sections.some(section =>
      section.items.includes(item)
    );
    return result;
  }

  /** Click en una entrada del menú principal: cierra el panel flotante del modo compacto. */
  onMenuItemClick(item: Menu): void {
    this.cerrarPanel();
  }

  /** Click en un hijo de un grupo. */
  onSubMenuItemClick(event: Event): void {
    this.cerrarPanel();
  }

  // For Horizontal Menu (Sin cambios)
  scrollToLeft() {
    if (this.margin >= -this.width) {
      this.margin = 0;
      this.leftArrowNone = true;
      this.rightArrowNone = false;
    } else {
      this.margin += this.width;
      this.rightArrowNone = false;
    }
  }

  scrollToRight() {
    if (this.margin <= -3051) { // Ajustar este valor si es necesario
      this.margin = -3464; // Ajustar este valor si es necesario
      this.leftArrowNone = false;
      this.rightArrowNone = true;
    } else {
      this.margin += -this.width;
      this.leftArrowNone = false;
    }
  }

  togglePlanCard() {
    this.isPlanCardCollapsed = !this.isPlanCardCollapsed;
    localStorage.setItem('planCardCollapsed', this.isPlanCardCollapsed ? 'true' : 'false');
  }

  // Método para calcular días restantes hasta la renovación
  getDaysLeft(): number {
    try {
      if (!this.currentPlan || !this.currentPlan.renewalDate) {
        return 0;
      }

      // Parsear la fecha de renovación (formato DD/MM/YYYY)
      const parts = this.currentPlan.renewalDate.split('/');
      if (parts.length !== 3) return 0;

      const renewalDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      const today = new Date();

      // Calcular diferencia en días
      const diffTime = renewalDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Retornar 0 si es negativo (vencido)
      return diffDays > 0 ? diffDays : 0;
    } catch (e) {
      console.error('Error al calcular días restantes:', e);
      return 0;
    }
  }

  // Método para crear etiqueta para enlaces externos
  getExtLinkLabel(title: string): string {
    return `${title} (enlace externo)`;
  }

  // Método para crear etiqueta para enlaces que abren en nueva ventana
  getNewWindowLabel(title: string): string {
    return `${title} (se abre en nueva ventana)`;
  }

  // D11: busca por nombre, ruta y, hasta PREVIOUS_TITLES_UNTIL, por el nombre de antes; sin mayúsculas ni tildes.
  searchMenu(): void {
    const term = this.searchTerm.trim();

    // Activar/desactivar modo búsqueda según exista término
    this.isSearchActive = term.length > 0;

    if (!this.isSearchActive) {
      this.searchResults = [];
      return;
    }

    this.searchResults = buscarEntradas(this.vista, term, new Date(), PREVIOUS_TITLES_UNTIL);
  }

  // Método para limpiar la búsqueda
  clearSearch(): void {
    this.searchTerm = '';
    this.searchResults = [];
    this.isSearchActive = false;
    this.isSearchFocused = false;
  }

  // Obtener todos los items de menú para la búsqueda
  private getAllMenuItems(): Menu[] {
    const allItems: Menu[] = [];

    const processItem = (item: Menu) => {
      allItems.push(item);

      if (item.children) {
        item.children.forEach(child => processItem(child));
      }
    };

    const originalItems = this.navServices.getMenuItems();
    originalItems.forEach(item => {
      if (!item.headTitle1 && !item.headTitle2) {
        processItem(item);
      }
    });

    return allItems;
  }

  // ===================== FAVORITOS (D-546 F3: se guardan por ruta o por `id` de grupo) =====================

  /** Resuelve los favoritos guardados contra el menú actual; si aún estaban sin convertir, los convierte. */
  private sincronizarFavoritos(): void {
    if (this.favoritosPendientes && this.vista.length > 0) {
      this.loadFavoriteItems();
    }
    this.favoritos = resolverFavoritos(this.favoritosGuardados, this.vista);
    this.favoritosMemo = new WeakMap();
  }

  /**
   * Carga `sidebarFavoritesV2`. La primera vez que se abre el menú nuevo en un navegador, convierte los de antes
   * (`sidebarFavoriteItems`) sin tocarlos ni borrar nada. Sin menú cargado espera a tenerlo.
   */
  private loadFavoriteItems(): void {
    try {
      const { lista, pendiente } = cargarFavoritos(localStorage, this.vista);
      this.favoritosGuardados = lista;
      this.favoritosPendientes = pendiente;
    } catch (e) {
      console.error('Error loading favorite items:', e);
      this.favoritosGuardados = [];
      this.favoritosPendientes = false;
    }
    this.favoritos = resolverFavoritos(this.favoritosGuardados, this.vista);
  }

  private guardarFavoritosActuales(): void {
    guardarFavoritos(localStorage, this.favoritosGuardados);
    this.favoritos = resolverFavoritos(this.favoritosGuardados, this.vista);
  }

  /** Lo que la estrella de una fila marca: la pantalla o el grupo. Un enlace que sale de un grupo de un hijo también cuenta por el grupo. */
  private favoritosMemo = new WeakMap<FilaMenu, { fav: FavoritoGuardado; alt?: FavoritoGuardado } | null>();
  public favoritoDeFila(fila: FilaMenu): { fav: FavoritoGuardado; alt?: FavoritoGuardado } | null {
    let valor = this.favoritosMemo.get(fila);
    if (valor === undefined) {
      if (fila.tipo === 'grupo' && fila.id && fila.hijos.length > 0) {
        valor = { fav: { kind: 'group', id: fila.id } };
      } else if (fila.tipo === 'enlace' && fila.ruta) {
        valor = { fav: { kind: 'screen', path: fila.ruta }, alt: fila.deGrupo && fila.id ? { kind: 'group', id: fila.id } : undefined };
      } else {
        valor = null;
      }
      this.favoritosMemo.set(fila, valor);
    }
    return valor;
  }

  /** La estrella de la cabecera de una sección hecha de un grupo `inline` (Finanzas, Comunicaciones). */
  private favoritoSeccionMemo = new Map<string, { fav: FavoritoGuardado }>();
  public favoritoDeSeccion(section: SidebarSection): { fav: FavoritoGuardado } | null {
    if (!section.grupoEnLinea?.id) { return null; }
    let valor = this.favoritoSeccionMemo.get(section.grupoEnLinea.id);
    if (!valor) {
      valor = { fav: { kind: 'group', id: section.grupoEnLinea.id } };
      this.favoritoSeccionMemo.set(section.grupoEnLinea.id, valor);
    }
    return valor;
  }

  public esFavorita(estrella: { fav: FavoritoGuardado; alt?: FavoritoGuardado } | null | undefined): boolean {
    if (!estrella) { return false; }
    return esFavorito(this.favoritosGuardados, estrella.fav) || (!!estrella.alt && esFavorito(this.favoritosGuardados, estrella.alt));
  }

  /** Nombre accesible de la estrella. */
  public etiquetaEstrella(estrella: { fav: FavoritoGuardado; alt?: FavoritoGuardado } | null | undefined): string {
    return this.translate.instant(this.esFavorita(estrella) ? 'shell.sidebar.removeFavorite' : 'shell.sidebar.addFavorite');
  }

  /**
   * Agrega o quita un favorito. Con el límite de 5 (D-517) sale el último. Lo que se guarda es la ruta o el `id`,
   * nunca el nombre.
   */
  public alternarFavorito(estrella: { fav: FavoritoGuardado; alt?: FavoritoGuardado } | null | undefined, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!estrella) { return; }
    if (this.esFavorita(estrella)) {
      this.favoritosGuardados = quitarFavorito(this.favoritosGuardados, estrella.fav);
      if (estrella.alt) { this.favoritosGuardados = quitarFavorito(this.favoritosGuardados, estrella.alt); }
    } else {
      this.favoritosGuardados = agregarFavorito(this.favoritosGuardados, estrella.fav);
    }
    this.guardarFavoritosActuales();
  }

  /** Quitar un favorito desde la lista de arriba (su estrella siempre está rellena). */
  public quitarDeLista(favorito: FavoritoVista, event?: Event): void {
    this.alternarFavorito(favorito.estrella, event);
  }

  /**
   * Un favorito que es un grupo (sin ruta) abre ese grupo en el menú y lo deja a la vista (ticket 1232). Si el grupo
   * es `inline` (Finanzas, Comunicaciones), abre su sección.
   */
  abrirSeccionFavorita(favorito: FavoritoVista, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const seccion = this.sections.find(s => (favorito.seccionId ? s.id === favorito.seccionId : s.filas.some(f => f === favorito.filaGrupo)));
    if (!seccion) { return; }

    // Acordeón de secciones: abrir esta, plegar las demás.
    this.sections.forEach(s => { if (s !== seccion && s.isHeaderSection) { s.collapsed = true; } });
    seccion.collapsed = false;
    this.saveSectionsState();

    let destinoId = 'section-header-' + this.sections.indexOf(seccion);
    if (favorito.filaGrupo) {
      this.closeAllFirstLevelMenus();
      favorito.filaGrupo.fuente.active = true;
      destinoId = this.getMenuKey(favorito.filaGrupo.fuente) + '-toggle';
    }
    this.cdr.detectChanges();
    setTimeout(() => {
      document.getElementById(destinoId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Métodos para perfil de usuario (Glassmorphism redesign)
  private initializeUserProfile(): void {
    this.greeting = this.computeGreeting();
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.userName = user.nombre || user.name || user.displayName || 'Usuario';
      this.userInitials = this.userName
        .split(' ')
        .filter((n: string) => n.length > 0)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'US';
      // Buscar imagen en múltiples propiedades posibles (incluyendo 'image' del header)
      this.userAvatarUrl = user.image || user.avatar || user.photoUrl || user.photoURL || '';
    } catch (e) {
      console.error('Error initializing user profile:', e);
      this.userName = 'Usuario';
      this.userInitials = 'US';
      this.userAvatarUrl = '';
    }
  }

  // Saludo en español según la franja horaria
  private computeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'shell.sidebar.greetingMorning';
    if (h < 19) return 'shell.sidebar.greetingAfternoon';
    return 'shell.sidebar.greetingEvening';
  }

  onAvatarError(event: Event): void {
    this.userAvatarUrl = '';
  }

  // Método para cerrar todos los submenús
  private closeAllSubmenus(): void {
    const allMenuItems = this.getAllMenuItems();
    allMenuItems.forEach(item => {
      if (item.children) {
        item.active = false;
        this.closeSubmenuRecursive(item);
      }
    });
  }

  // Método recursivo para cerrar submenús
  private closeSubmenuRecursive(item: Menu): void {
    if (item.children) {
      item.children.forEach(child => {
        child.active = false;
        if (child.children) {
          this.closeSubmenuRecursive(child);
        }
      });
    }
  }

  // Método para detectar si estamos en móvil
  public isMobile(): boolean {
    return window.innerWidth <= 991.98;
  }

  // Método para manejar clic fuera del sidebar en móviles
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Compacto: un toque fuera de la fila y de su panel cierra el panel.
    if (this.panel) {
      const destino = event.target as HTMLElement;
      if (!destino.closest?.('.menu-item.panel-activo')) { this.cerrarPanel(); }
    }
    if (this.isMobile() && !this.collapseMenu && !this.isToggling) {
      const target = event.target as HTMLElement;
      const sidebar = this.elementRef.nativeElement.querySelector('.sidebar-container');
      const toggleBtn = document.querySelector('.sidebar-toggle-btn');
      const overlay = document.querySelector('.sidebar-overlay');

      // Verificar que el clic no sea en elementos del sidebar
      if (sidebar && !sidebar.contains(target) &&
        toggleBtn && !toggleBtn.contains(target) &&
        overlay && !overlay.contains(target)) {

        // Verificar que no sea un elemento interno del sidebar
        const isInsideSidebar = target.closest('.sidebar-container') ||
          target.closest('.sidebar-toggle-btn') ||
          target.closest('.sidebar-overlay');

        if (!isInsideSidebar) {
          this.sidebarToggle();
        }
      }
    }
  }

  // Método para manejar toggle de submenús en móviles con mejor experiencia táctil
  private handleMobileSubmenuToggle(item: Menu, event?: Event): void {
    // Añadir clase de feedback táctil
    const targetElement = (event?.target as HTMLElement)?.closest('.menu-link');
    if (targetElement) {
      targetElement.classList.add('touch-feedback');
      setTimeout(() => {
        targetElement.classList.remove('touch-feedback');
      }, 150);
    }

    // Toggle normal del submenú
    const currentlyActive = item.active;
    if (!currentlyActive) {
      this.sections.forEach(section => {
        section.items.forEach(menuItem => {
          this.resetActiveState(menuItem, item);
        });
      });
    }
    item.active = !currentlyActive;

    // SOLUCION ACCORDION MOBILE: Forzar detección de cambios para que Angular actualice la UI
    this.cdr.detectChanges();
  }

  // Método para resetear el sidebar al estado inicial
  resetSidebar(): void {
    this.searchTerm = '';
    this.searchResults = [];
    this.isSearchActive = false;
    this.isSearchFocused = false;
    this.closeAllSubmenus();
    this.cerrarPanel();

    // Resetear estado de secciones si es necesario
    this.sections.forEach(section => {
      if (section.isHeaderSection) {
        section.collapsed = true;
      }
    });
    this.saveSectionsState();
  }

  // ===================================================
  // EFECTOS CINEMATOGRÁFICOS
  // ===================================================

  /**
   * Inicializar efectos cinematográficos después de que la vista esté lista
   */
  /**
   * Activar estado de demo highlight para video
   */
  activateDemoHighlight(element: HTMLElement): void {
    this.renderer.addClass(element, 'demo-highlight');
    this.renderer.addClass(element, 'active');

    // Quitar después de 3 segundos
    setTimeout(() => {
      this.renderer.removeClass(element, 'demo-highlight');
      this.renderer.removeClass(element, 'active');
    }, 3000);
  }

  /**
   * Activar estado de demo focus para video
   */
  activateDemoFocus(element: HTMLElement): void {
    this.renderer.addClass(element, 'demo-focus');

    // Quitar después de 2 segundos
    setTimeout(() => {
      this.renderer.removeClass(element, 'demo-focus');
    }, 2000);
  }

  /**
   * Simular loading state con shimmer effect
   */
  simulateLoadingState(element: HTMLElement): void {
    this.renderer.addClass(element, 'shimmer-loading');

    setTimeout(() => {
      this.renderer.removeClass(element, 'shimmer-loading');
    }, 1500);
  }

  /**
   * Aplicar efecto de resplandor cinematográfico
   */
  applyCinematicGlow(element: HTMLElement): void {
    this.renderer.addClass(element, 'cinematic-glow');

    setTimeout(() => {
      this.renderer.removeClass(element, 'cinematic-glow');
    }, 2000);
  }

  // ===================================================
  // MÉTODOS DE NOTIFICACIONES
  // ===================================================

  private initializeNotifications(): void {
    // Suscribirse a las notificaciones del NotificationManagerService
    if (this.notificationManager) {
      this.notificationSubscription = this.notificationManager.notifications$.subscribe(notifications => {
        // Contar notificaciones no leídas
        this.unreadNotificationCount = notifications.filter(n => n.status !== NotificationStatus.READ).length;

        // Obtener la última notificación para el preview
        if (notifications.length > 0) {
          const latest = notifications[0];
          this.latestNotification = latest.message || latest.title || '';

          // Si hay nuevas notificaciones, activar animación
          if (this.unreadNotificationCount > 0) {
            this.triggerNewNotificationAnimation();
          }
        } else {
          this.latestNotification = '';
        }
      });
    }

    // Cargar preferencia de sonido
    const soundPref = localStorage.getItem('notificationSound');
    this.notificationSoundEnabled = soundPref !== 'false';
  }

  private triggerNewNotificationAnimation(): void {
    this.hasNewNotifications = true;

    // Reproducir sonido si está habilitado. Ticket 1178: el toggle ahora vive en
    // el panel de notificaciones (otro componente), así que la preferencia se
    // relee de localStorage en el momento de sonar.
    this.notificationSoundEnabled = localStorage.getItem('notificationSound') !== 'false';
    if (this.notificationSoundEnabled) {
      this.playNotificationSound();
    }

    // Desactivar la animación después de 3 segundos
    if (this.newNotificationTimer) {
      clearTimeout(this.newNotificationTimer);
    }

    this.newNotificationTimer = setTimeout(() => {
      this.hasNewNotifications = false;
    }, 3000);
  }

  private playNotificationSound(): void {
    try {
      // Crear un sonido simple usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
    }
  }

  public openNotificationCenter(): void {
    // Emitir evento para abrir el panel de notificaciones
    // Esto puede comunicarse con el notification-center component
    const notificationBell = document.querySelector('app-notification-center .notification-bell') as HTMLElement;
    if (notificationBell) {
      notificationBell.click();
    }
  }

  public markAllNotificationsAsRead(event: Event): void {
    event.stopPropagation();

    if (this.notificationManager) {
      this.notificationManager.markAllAsRead();
    }
  }

  /** Ticket 1177: la insignia del ítem se muestra mientras no venza badgeUntil. */
  public badgeVisible(item: Menu): boolean {
    return insigniaVigente(item);
  }

  /** D-546: un grupo marca el punto en el ícono solo si algún hijo tiene NUEVO vigente (PRONTO no cuenta). */
  public hasNewChild(item: Menu): boolean {
    return tieneHijoNuevo(item);
  }

  /**
   * D-546 (D8): escritorio con el menú en modo compacto (72 px: solo íconos y un panel flotante por grupo).
   * En el celular no hay compacto: `collapseMenu` significa «cajón cerrado» y las filas siempre van completas.
   */
  public get compacto(): boolean {
    return this.collapseMenu && !this.isMobile();
  }

  /** El modo que la plantilla muestra en el botón alternar. */
  public get modo(): ModoMenu {
    return this.compacto ? 'compacto' : 'abierto';
  }

  /** `trackBy` de las filas: la clave es estable mientras el menú no cambie de forma. */
  public porClave(_indice: number, fila: FilaMenu): string {
    return fila.clave;
  }

  /** El ícono de un resultado de la búsqueda. */
  public iconoDeResultado(resultado: ResultadoBusqueda): string {
    return resultado.icono || '';
  }

  // ===================== MODO DEL MENÚ (D-546 D8): abierto o compacto =====================

  /** Correo de la sesión: la preferencia se guarda por usuario (con hash, nunca en claro). */
  private correoUsuario(): string {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.email || '';
    } catch {
      return '';
    }
  }

  private modoDelUsuario(): ModoMenu {
    return modoInicial(localStorage, this.correoUsuario());
  }

  /** Deja el menú en un modo, en escritorio, y avisa a NavService y LayoutService (ellos derivan de aquí). */
  private aplicarModo(modo: ModoMenu): void {
    this.collapseMenu = modo === 'compacto';
    this.navServices.collapseSidebar = this.collapseMenu;
    this.layout.updateSidebarState({ isCollapsed: this.collapseMenu });
  }

  /** Recuerda la elección de este usuario. En el celular «colapsado» es solo el cajón cerrado: no se guarda. */
  private persistirModo(): void {
    if (this.isMobile()) { return; }
    guardarModo(localStorage, this.correoUsuario(), this.collapseMenu ? 'compacto' : 'abierto');
  }

  // ===================== PANEL FLOTANTE DEL RIEL COMPACTO (D-546 D8) =====================

  /** El panel abierto: la clave de su fila y su posición vertical (se pinta con `position: fixed`). */
  public panel: { clave: string; top: number } | null = null;

  public filaDeFuente(fuente: Menu): FilaMenu | undefined {
    for (const seccion of this.sections) {
      const fila = seccion.filas.find(f => f.fuente === fuente);
      if (fila) { return fila; }
    }
    return undefined;
  }

  /**
   * Abre el panel de un grupo (sus pantallas) o de un enlace directo (solo su nombre).
   * La posición vertical es la de la fila, con tope para que no se salga de la ventana.
   */
  public abrirPanel(fila: FilaMenu, evento?: Event): void {
    if (!this.compacto || this.sinAbrirPanel) { return; }
    if (this.panel?.clave === fila.clave) { return; }
    const origen = evento?.currentTarget as HTMLElement | null;
    const item = origen?.closest?.('.menu-item') as HTMLElement | null;
    const boton = (item?.querySelector('.menu-link') || origen) as HTMLElement | null;
    const rect = boton?.getBoundingClientRect?.();
    const alto = fila.tipo === 'grupo' ? 56 + fila.hijos.length * 40 : 40;
    const arriba = rect ? Math.max(8, Math.min(rect.top, window.innerHeight - alto - 8)) : 8;
    this.panel = { clave: fila.clave, top: Math.round(arriba) };
  }

  private sinAbrirPanel = false;

  public cerrarPanel(): void {
    if (this.panel) { this.panel = null; }
  }

  /** El puntero entra a una fila del riel (el panel no se abre con el dedo: ahí manda el toque). */
  public alEntrarPuntero(fila: FilaMenu, evento: PointerEvent): void {
    if (evento.pointerType === 'touch') { return; }
    this.cancelarCierrePanel();
    this.abrirPanel(fila, evento);
  }

  /**
   * Ticket 1379 (ALMARA): entre el ícono y el panel queda la barra de desplazamiento
   * del riel; al cruzarla el puntero «sale» de la fila y el panel se cerraba antes del
   * clic. Se espera un momento: si el puntero llega al panel (o vuelve a la fila), sigue abierto.
   */
  private cierrePanelTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly ESPERA_CIERRE_PANEL_MS = 300;

  private cancelarCierrePanel(): void {
    if (this.cierrePanelTimer) {
      clearTimeout(this.cierrePanelTimer);
      this.cierrePanelTimer = null;
    }
  }

  public alSalirPuntero(evento: PointerEvent): void {
    if (evento.pointerType === 'touch') { return; }
    this.cancelarCierrePanel();
    this.cierrePanelTimer = setTimeout(() => {
      this.cierrePanelTimer = null;
      this.cerrarPanel();
      this.cdr.markForCheck();
    }, SidebarComponent.ESPERA_CIERRE_PANEL_MS);
  }

  /** El foco sale de la fila y de su panel: se cierra. */
  public alPerderFoco(evento: FocusEvent): void {
    const item = evento.currentTarget as HTMLElement;
    const siguiente = evento.relatedTarget as Node | null;
    if (!siguiente || !item.contains(siguiente)) { this.cerrarPanel(); }
  }

  /** Enter, espacio o flecha derecha abren el panel y llevan el foco a su primer enlace. */
  public abrirPanelConTeclado(fila: FilaMenu, evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (!this.compacto) { return; }
    this.panel = null;
    this.abrirPanel(fila, evento);
    this.cdr.detectChanges();
    const item = (evento.currentTarget as HTMLElement).closest('.menu-item');
    (item?.querySelector('.panel-flotante a, .panel-flotante [role="menuitem"]:not([aria-disabled])') as HTMLElement | null)?.focus();
  }

  /** Esc cierra el panel y devuelve el foco al botón de la fila. */
  public cerrarPanelConTeclado(evento: Event): void {
    if (!this.panel) { return; }
    const item = (evento.currentTarget as HTMLElement).closest('.menu-item');
    this.cerrarPanel();
    // Devolver el foco al botón no debe volver a abrir el panel (`focusin` de la fila).
    this.sinAbrirPanel = true;
    (item?.querySelector('.menu-link') as HTMLElement | null)?.focus();
    this.sinAbrirPanel = false;
  }

  /** Flechas arriba y abajo entre los enlaces del panel. */
  public moverFocoPanel(evento: Event, paso: 1 | -1): void {
    const panel = evento.currentTarget as HTMLElement;
    const enlaces = Array.from(panel.querySelectorAll<HTMLElement>('a'));
    if (!enlaces.length) { return; }
    evento.preventDefault();
    const actual = enlaces.indexOf(document.activeElement as HTMLElement);
    const siguiente = actual < 0 ? 0 : (actual + paso + enlaces.length) % enlaces.length;
    enlaces[siguiente].focus();
  }

  /** El punto del ícono: una novedad vigente o, en el riel compacto, también un favorito dentro del grupo. */
  public puntoVisible(fila: FilaMenu): boolean {
    if (fila.punto) { return true; }
    if (!this.compacto) { return false; }
    return this.esFavorita(this.favoritoDeFila(fila)) || fila.hijos.some(hijo => this.esFavorita(this.favoritoDeFila(hijo)));
  }

  /** Puede ser favorita la entrada que lleva a una pantalla o abre un grupo (D-517); los avisos «pronto» no. */
  public puedeSerFavorita(fila: FilaMenu): boolean {
    return this.favoritoDeFila(fila) !== null;
  }

  public toggleNotificationSound(event: Event): void {
    event.stopPropagation();

    this.notificationSoundEnabled = !this.notificationSoundEnabled;
    localStorage.setItem('notificationSound', this.notificationSoundEnabled.toString());
  }

  // ========================= AUTO-HIDE FUNCTIONALITY =========================

  /**
   * Inicializa el sistema de auto-hide
   */
  private initializeAutoHide(): void {
    // Suscribirse a los cambios de estado del sidebar desde LayoutService
    this.sidebarStateSubscription = this.layout.sidebarState$.subscribe(state => {
      this.isAutoHideEnabled = state.isAutoHideEnabled;
      this.isSidebarVisible = state.isVisible;
      this.isPinned = state.isPinned;
      this.isHovering = state.isHovering;
      // Mantener sincronizado el estado de colapso para plantillas y hover-zone
      if (this.collapseMenu !== state.isCollapsed) { this.cerrarPanel(); }
      this.collapseMenu = state.isCollapsed;
      // El botón del encabezado también alterna el menú: la elección del usuario se recuerda venga de donde venga
      this.persistirModo();

      // Aplicar clases CSS correspondientes
      this.updateSidebarClasses();
    });

    // Configurar listener para clicks fuera del sidebar
    this.setupClickOutsideListener();
  }

  /**
   * Configura la zona de hover para mostrar el sidebar
   */
  private setupHoverZone(): void {
    // Crear zona de hover invisible
    const hoverZone = this.renderer.createElement('div');
    this.renderer.addClass(hoverZone, 'sidebar-hover-zone');
    this.renderer.appendChild(document.body, hoverZone);

    // Listener para mostrar sidebar en hover (solo auto-hide: el menú compacto ya no se expande al pasar el puntero)
    this.hoverZoneListener = this.renderer.listen(hoverZone, 'mouseenter', () => {
      if (this.isAutoHideEnabled && !this.isSidebarVisible) {
        // Limpiar timeout de ocultar si existe
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
        }

        // Aplicar delay antes de mostrar
        this.hoverTimeout = setTimeout(() => {
          this.layout.showSidebar();
          this.layout.setHovering(true);
        }, this.layout.autoHideConfig.hoverDelay);
      }
    });

    const sidebarElement = this.elementRef.nativeElement;
    this.renderer.listen(sidebarElement, 'mouseleave', () => {
      if (this.isAutoHideEnabled && this.isHovering) {
        // Limpiar timeout de mostrar si existe
        if (this.hoverTimeout) {
          clearTimeout(this.hoverTimeout);
        }

        // Aplicar delay antes de ocultar
        this.hideTimeout = setTimeout(() => {
          this.layout.hideSidebar();
          this.layout.setHovering(false);
        }, this.layout.autoHideConfig.hideDelay);
      }
    });

    // Listener para cuando el mouse entra al sidebar
    this.renderer.listen(sidebarElement, 'mouseenter', () => {
      // Cancelar timeout de ocultar si existe
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
      }
    });
  }

  /**
   * Configura el listener para detectar clicks fuera del sidebar
   */
  private setupClickOutsideListener(): void {
    this.clickOutsideListener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const sidebarElement = this.elementRef.nativeElement;

      // Verificar si el click fue fuera del sidebar
      if (!sidebarElement.contains(target) &&
        !target.closest('.sidebar-hover-zone') &&
        !target.closest('.sidebar-toggle-btn')) {

        // Solo ocultar si auto-hide está activo
        if (this.isAutoHideEnabled && this.isSidebarVisible) {
          this.layout.hideSidebar();
        }
      }
    });
  }

  /**
   * Actualiza las clases CSS del sidebar según su estado
   */
  private updateSidebarClasses(): void {
    const sidebarElement = this.elementRef.nativeElement;

    // Remover todas las clases de estado
    this.renderer.removeClass(sidebarElement, 'auto-hide-enabled');
    this.renderer.removeClass(sidebarElement, 'sidebar-hidden');
    this.renderer.removeClass(sidebarElement, 'sidebar-pinned');
    this.renderer.removeClass(sidebarElement, 'sidebar-hovering');

    // Aplicar clases para auto-hide
    if (this.isAutoHideEnabled) {
      this.renderer.addClass(sidebarElement, 'auto-hide-enabled');

      if (!this.isSidebarVisible) {
        this.renderer.addClass(sidebarElement, 'sidebar-hidden');
      }

      // Funcionalidad de pin eliminada

      if (this.isHovering) {
        this.renderer.addClass(sidebarElement, 'sidebar-hovering');
      }
    }

    // Actualizar el contenido principal
    this.updateContentMargin();
  }

  /**
   * Actualiza el margen del contenido principal
   */
  private updateContentMargin(): void {
    const contentElement = document.querySelector('.page-wrapper');
    if (contentElement) {
      if (this.isAutoHideEnabled && !this.isSidebarVisible) {
        this.renderer.addClass(contentElement, 'sidebar-auto-hidden');
      } else {
        this.renderer.removeClass(contentElement, 'sidebar-auto-hidden');
      }
    }
  }

  /**
   * Alterna el modo auto-hide
   */
  public toggleAutoHide(): void {
    // Si el sidebar está colapsado, expandirlo primero
    if (this.collapseMenu) {
      this.collapseMenu = false;
      this.navServices.collapseSidebar = false;
    }
    this.layout.toggleAutoHide();
  }

  // Funcionalidad de pin eliminada - ya no es necesaria

  /**
   * Manejador para swipe en dispositivos móviles
   */
  private handleSwipeGesture(startX: number, endX: number): void {
    const swipeDistance = endX - startX;
    const threshold = this.layout.autoHideConfig.swipeThreshold;

    if (Math.abs(swipeDistance) < threshold) {
      return;
    }

    // Swipe hacia la derecha desde el borde izquierdo: mostrar sidebar
    if (startX < 50 && swipeDistance > threshold && !this.isSidebarVisible) {
      this.layout.showSidebar();
    }
    // Swipe hacia la izquierda: ocultar sidebar
    else if (swipeDistance < -threshold && this.isSidebarVisible && this.isAutoHideEnabled) {
      this.layout.hideSidebar();
    }
  }

  /**
   * Limpia los recursos cuando el componente se destruye
   */
  ngOnDestroy(): void {
    this.cancelarCierrePanel();
    // Limpiar suscripciones
    this.destroy$.next();
    this.destroy$.complete();

    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    if (this.sidebarStateSubscription) {
      this.sidebarStateSubscription.unsubscribe();
    }

    // Limpiar timeouts
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    if (this.newNotificationTimer) {
      clearTimeout(this.newNotificationTimer);
    }

    // Limpiar listeners
    if (this.clickOutsideListener) {
      this.clickOutsideListener();
    }
    if (this.hoverZoneListener) {
      this.hoverZoneListener();
    }

    // Limpiar otros event listeners
    this.cleanupEventListeners();

    // Remover la zona de hover
    const hoverZone = document.querySelector('.sidebar-hover-zone');
    if (hoverZone) {
      hoverZone.remove();
    }
  }

}
