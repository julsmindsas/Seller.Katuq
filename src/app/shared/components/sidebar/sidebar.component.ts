import { Component, ViewEncapsulation, HostListener, OnInit, OnDestroy, ElementRef, Renderer2, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Menu, NavService } from '../../services/nav.service';
import { LayoutService } from '../../services/layout.service';
import { environment } from '../../../../environments/environment';
import { SecurityService } from '../../services/security/security.service';
import { CompanyInformation } from '../../models/User/CompanyInformation';
import { NotificationManagerService } from '../../services/notifications/notification-manager.service';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SubscriptionService } from '../../services/subscription.service';
// Asegúrate de que PlanSelectorComponent esté importado si aún no lo está
// import { PlanSelectorComponent } from '../plan-selector/plan-selector.component';

// Nueva interfaz para las secciones
export interface SidebarSection {
  title: string | null;
  items: Menu[];
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

  /**
   * Host Listener para manejar hover-expand en colapso tradicional
   * OPTIMIZADO: Expansión instantánea y mejor control
   */
  @HostListener('mouseenter')
  onMouseEnter() {
    // Solo activar si está en modo colapso tradicional (no auto-collapse)
    console.log('Sidebar mouseenter - collapseMenu:', this.collapseMenu, 'isAutoCollapseEnabled:', this.isAutoCollapseEnabled, 'isMobile:', this.isMobile(), 'isTemporarilyExpanded:', this.isTemporarilyExpanded);
    if (this.collapseMenu && !this.isAutoCollapseEnabled && !this.isMobile()) {
      // Limpiar cualquier timeout pendiente de colapso
      if (this.hoverExpandTimeout) {
        clearTimeout(this.hoverExpandTimeout);
        this.hoverExpandTimeout = null;
      }

      // Expandir INSTANTÁNEAMENTE sin delay
      this.isTemporarilyExpanded = true;
      this.isMouseInsideSidebar = true;

      // Marcar visualmente para que el header se ajuste
      const wrapper = document.querySelector('.page-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.classList.add('sidebar-temporarily-expanded');
        console.log('Added class sidebar-temporarily-expanded to page-wrapper');
        // Forzar actualización del layout
        wrapper.style.display = 'block';
      }

      const sidebar = this.elementRef.nativeElement.querySelector('.sidebar-container');
      if (sidebar) {
        this.renderer.addClass(sidebar, 'temporarily-expanded');
        console.log('Added class temporarily-expanded to sidebar-container');
      }

      // Marcar header directamente (modo Dubai)
      const headerEl = document.querySelector('.page-header') as HTMLElement;
      if (headerEl) {
        headerEl.classList.add('temporarily-expanded');
        console.log('Added class temporarily-expanded to page-header');
        // Forzar reflow para que CSS se aplique inmediatamente
        headerEl.offsetHeight;

        // Debug: mostrar estado actual de clases CSS
        const wrapperClassName = wrapper?.className || 'undefined';
        const sidebarClassName = sidebar?.className || 'undefined';
        const headerClassName = headerEl.className;
        const computedMargin = getComputedStyle(headerEl).marginLeft;

        console.log('Current CSS classes on page-wrapper:', wrapperClassName);
        console.log('Current CSS classes on sidebar-container:', sidebarClassName);
        console.log('Current CSS classes on page-header:', headerClassName);
        console.log('Computed margin-left of header:', computedMargin);

        // Verificar si hay clases del tema Dubai
        const bodyClassName = document.body.className;
        console.log('Current body classes (theme):', bodyClassName);
        const compactWrapper = document.querySelector('.compact-wrapper');
        console.log('Has compact-wrapper:', !!compactWrapper);

        // Verificar si las reglas CSS específicas están siendo aplicadas
        const style = getComputedStyle(headerEl);
        console.log('All computed styles for header:');
        console.log('- margin-left:', style.marginLeft);
        console.log('- width:', style.width);
        console.log('- transform:', style.transform);
        console.log('- position:', style.position);
        console.log('- z-index:', style.zIndex);
        console.log('- left:', style.left);
        console.log('- right:', style.right);

        // Verificar si hay estilos inline o reglas CSS que están sobreescribiendo
        console.log('Checking for inline styles and CSS conflicts...');
        console.log('- inline styles:', headerEl.getAttribute('style'));
        console.log('- header style property:', headerEl.style.cssText);

        // Verificar si hay alguna regla CSS específica que esté aplicando 90px
        const allStyles = getComputedStyle(headerEl);
        console.log('All CSS properties that contain "margin":');
        for (let i = 0; i < allStyles.length; i++) {
          const prop = allStyles[i];
          if (prop.includes('margin')) {
            console.log(`- ${prop}: ${allStyles.getPropertyValue(prop)}`);
          }
        }

        // Verificar si hay reglas CSS que podrían estar sobreescribiendo
        console.log('Header parent computed styles:');
        const parentStyle = getComputedStyle(headerEl.parentElement!);
        console.log('- parent margin-left:', parentStyle.marginLeft);
        console.log('- parent width:', parentStyle.width);
        console.log('- parent position:', parentStyle.position);

        // Verificar si hay algún elemento que esté sobreescribiendo el margin
        console.log('Checking for CSS specificity conflicts...');
        console.log('Header classes:', headerEl.className);
        console.log('Parent classes:', headerEl.parentElement?.className);
        console.log('Grandparent classes:', headerEl.parentElement?.parentElement?.className);

        // Verificar computed styles del wrapper
        if (wrapper) {
          const wrapperStyle = getComputedStyle(wrapper);
          console.log('Page wrapper computed styles:');
          console.log('- margin-left:', wrapperStyle.marginLeft);
          console.log('- width:', wrapperStyle.width);
          console.log('- position:', wrapperStyle.position);

          // Verificar si nuestras reglas específicas están siendo aplicadas
          console.log('Checking if our CSS rules are being applied...');
          const computedStyle = getComputedStyle(headerEl);
          const marginLeftValue = computedStyle.marginLeft;

          // Si el margin-left es 260px, nuestras reglas están funcionando
          if (marginLeftValue === '260px') {
            console.log('✅ SUCCESS: Header margin-left is 260px - our CSS rules are working!');
          } else if (marginLeftValue === '90px') {
            console.log('❌ PROBLEM: Header margin-left is still 90px - global CSS rules are overriding ours');
            console.log('This means we need even higher CSS specificity');
          } else {
            console.log('⚠️  WARNING: Header margin-left is', marginLeftValue, '- unexpected value');
          }
        }
      }
    }
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.isMouseInsideSidebar = false;

    // Si está temporalmente expandido por hover, colapsar al salir el mouse
    if (this.isTemporarilyExpanded && this.collapseMenu && !this.isMobile()) {
      // Pequeño delay para evitar colapsos accidentales
      if (this.hoverExpandTimeout) {
        clearTimeout(this.hoverExpandTimeout);
      }

      this.hoverExpandTimeout = setTimeout(() => {
        if (!this.isMouseInsideSidebar) {
          this.collapseTemporaryExpansion();
        }
      }, 150); // 150ms de delay
    }
  }

  /**
   * Colapsa el sidebar temporalmente expandido y limpia las clases CSS
   */
  private collapseTemporaryExpansion(): void {
    this.isTemporarilyExpanded = false;
    this.cleanupTemporaryExpansionClasses();
    console.log('Sidebar collapsed from temporary expansion');
  }

  /**
   * Limpia TODAS las clases relacionadas con la expansión temporal
   * Se llama tanto al colapsar como al anclar el sidebar
   */
  private cleanupTemporaryExpansionClasses(): void {
    // Remover clase del sidebar
    const sidebar = this.elementRef.nativeElement.querySelector('.sidebar-container');
    if (sidebar) {
      this.renderer.removeClass(sidebar, 'temporarily-expanded');
    }

    // Remover clase del page-wrapper
    const wrapper = document.querySelector('.page-wrapper') as HTMLElement;
    if (wrapper) {
      wrapper.classList.remove('sidebar-temporarily-expanded');
    }

    // Remover clase del header
    const headerEl = document.querySelector('.page-header') as HTMLElement;
    if (headerEl) {
      headerEl.classList.remove('temporarily-expanded');
    }
  }

  /**
   * Navega a una ruta y limpia las clases de expansión temporal
   * Resuelve el bug donde el header queda colapsado después de navegar
   */
  private navigateAndCleanup(path: string): void {
    // Resetear estado de expansión temporal
    this.isTemporarilyExpanded = false;

    // Limpiar todas las clases de expansión temporal
    this.cleanupTemporaryExpansionClasses();

    // Cerrar cualquier submenú flotante abierto
    this.closeCollapsedSubmenu();

    // Limpiar timeouts pendientes
    if (this.hoverExpandTimeout) {
      clearTimeout(this.hoverExpandTimeout);
      this.hoverExpandTimeout = null;
    }

    // Navegar a la ruta
    this.router.navigate([path]);
  }

  /**
   * NUEVO: Listener para clicks dentro del sidebar
   * COMENTADO: Se desactiva para evitar extensiones no deseadas del timer
   * Los clicks ahora se manejan específicamente en cada tipo de elemento
   */
  /*@HostListener('click', ['$event'])
  onSidebarClick(event: Event) {
    // Si está temporalmente expandido, resetear el timer de colapso
    if (this.isTemporarilyExpanded) {
      this.resetCollapseTimer();
    }
  }*/

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
  public isPlanCardCollapsed: boolean = false;
  public isAdminUser: boolean = false;

  // Nuevas propiedades
  public isCompactMode: boolean = false;
  public searchTerm: string = '';
  public searchResults: Menu[] = [];
  public isSearchActive: boolean = false;
  public favoriteItems: Menu[] = [];
  public isSearchFocused: boolean = false;

  // Propiedades del perfil de usuario (Glassmorphism redesign)
  public userName: string = '';
  public userInitials: string = '';
  public userAvatarUrl: string = '';

  // Variables para control de gestos en móviles
  private touchStartX: number = 0;
  private touchEndX: number = 0;
  private swipeThreshold: number = 50;

  // Nueva propiedad para las secciones colapsables
  public sections: SidebarSection[] = [];

  // ACCORDION: Set centralizado para trackear menús abiertos (soluciona problema de referencias)
  public openMenus: Set<string> = new Set();

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

  // Propiedades para hover-expand en colapso tradicional (MEJORADAS)
  public isTemporarilyExpanded: boolean = false;
  private hoverExpandTimeout: any;
  private isMouseInsideSidebar: boolean = false;
  private collapseDelayMs: number = 300; // ✅ Optimizado: 500ms → 300ms

  // Propiedades para auto-collapse (DEPRECADO - será eliminado)
  public isAutoCollapseEnabled: boolean = false;
  private autoCollapseTimeout: any;

  constructor(
    private router: Router,
    public navServices: NavService,
    public layout: LayoutService,
    private securityService: SecurityService,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private notificationManager: NotificationManagerService,
    private subscriptionService: SubscriptionService,
    private cdr: ChangeDetectorRef
  ) {
    this.navServices.items.subscribe(menuItems => {
      this.processMenuItems(menuItems); // Procesar items para crear secciones

      // El resto de la lógica de suscripción para activar items se mantiene
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          // Actualizar active state en los items originales o en las secciones
          const originalMenuItems = this.navServices.getMenuItems();

          // MEJORA: NO limpiar los estados activos - mantener submenús abiertos
          // Solo marcamos el item correspondiente a la URL actual como activo
          // Los padres se marcan automáticamente en setActiveRecursive()

          // Volver a marcar como activo basado en la URL actual
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
            this.restoreBodyScroll(); // Restaurar scroll del body
          }
        }
      });
    });
  }

  // Propiedades para efectos cinematográficos
  private spotlightElement: HTMLElement | null = null;
  private isMouseInSidebar: boolean = false;
  private animationFrameId: number | null = null;

  // Método de debug público para verificar estado del hover
  public debugHoverState() {
    console.log('=== DEBUG HOVER STATE ===');
    console.log('collapseMenu:', this.collapseMenu);
    console.log('isAutoCollapseEnabled:', this.isAutoCollapseEnabled);
    console.log('isMobile():', this.isMobile());
    console.log('isTemporarilyExpanded:', this.isTemporarilyExpanded);
    console.log('LayoutService state:', this.layout.getSidebarState());

    const wrapper = document.querySelector('.page-wrapper') as HTMLElement;
    const sidebar = this.elementRef.nativeElement.querySelector('.sidebar-container');
    const headerEl = document.querySelector('.page-header') as HTMLElement;

    console.log('page-wrapper classes:', wrapper?.className || 'undefined');
    console.log('sidebar-container classes:', sidebar?.className || 'undefined');
    console.log('page-header classes:', headerEl?.className || 'undefined');
    console.log('header computed margin-left:', headerEl ? getComputedStyle(headerEl).marginLeft : 'undefined');
    console.log('=========================');
  }

  // Método público para forzar hover manualmente
  public forceHoverExpand() {
    console.log('Forcing hover expand...');
    this.onMouseEnter();
    setTimeout(() => {
      console.log('Hover expand applied, checking result:');
      this.debugHoverState();
    }, 100);
  }

  // Método público para forzar colapso manualmente
  public forceHoverCollapse() {
    console.log('Forcing hover collapse...');
    this.onMouseLeave();
    setTimeout(() => {
      console.log('Hover collapse applied, checking result:');
      this.debugHoverState();
    }, 400);
  }

  // Método para verificar qué reglas CSS están siendo aplicadas
  public debugCSSRules() {
    console.log('=== DEBUG CSS RULES ===');
    const headerEl = document.querySelector('.page-header') as HTMLElement;
    if (headerEl) {
      const style = getComputedStyle(headerEl);

      // Verificar si nuestras reglas específicas se están aplicando
      console.log('Header computed styles:');
      console.log('- margin-left:', style.marginLeft);
      console.log('- width:', style.width);
      console.log('- left:', style.left);
      console.log('- position:', style.position);
      console.log('- transform:', style.transform);

      // Verificar specificity de las clases aplicadas
      console.log('Applied CSS classes:', headerEl.className);

      // Verificar si hay reglas CSS que están sobreescribiendo
      const wrapper = document.querySelector('.page-wrapper') as HTMLElement;
      if (wrapper) {
        console.log('Page wrapper classes:', wrapper.className);
        const wrapperStyle = getComputedStyle(wrapper);
        console.log('Page wrapper computed margin-left:', wrapperStyle.marginLeft);
      }

      // Verificar specificity de selectores
      console.log('Checking CSS specificity...');
      const allSelectors = [
        '.page-header.close_icon.temporarily-expanded',
        '.compact-wrapper .page-header.temporarily-expanded.close_icon',
        '.compact-wrapper .page-wrapper.sidebar-temporarily-expanded .page-header.close_icon',
        '.page-wrapper.ng-tns-c127-1.sidebar-temporarily-expanded .page-header.close_icon',
        ':host-context(.compact-wrapper) .page-wrapper.sidebar-temporarily-expanded .page-header.close_icon'
      ];

      allSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}": ${elements.length} matches`);
      });
    }
    console.log('=========================');
  }

  // Método para verificar el estado actual del header
  public checkCurrentHeaderState() {
    console.log('=== CURRENT HEADER STATE ===');
    const headerEl = document.querySelector('.page-header') as HTMLElement;
    if (headerEl) {
      const style = getComputedStyle(headerEl);
      console.log('Header classes:', headerEl.className);
      console.log('Header computed margin-left:', style.marginLeft);
      console.log('Header computed width:', style.width);
      console.log('Header computed position:', style.position);
      console.log('Header computed transform:', style.transform);
      console.log('Header computed z-index:', style.zIndex);

      const wrapper = document.querySelector('.page-wrapper') as HTMLElement;
      if (wrapper) {
        console.log('Page wrapper classes:', wrapper.className);
        const wrapperStyle = getComputedStyle(wrapper);
        console.log('Page wrapper computed margin-left:', wrapperStyle.marginLeft);
      }
    }
    console.log('============================');
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

    // Cargar preferencia de modo compacto
    const compactMode = localStorage.getItem('sidebarCompactMode');
    if (compactMode) {
      this.isCompactMode = compactMode === 'true';
      if (this.isCompactMode) {
        document.body.classList.add('sidebar-compact-mode');
      }
    }

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
    // Inicializar efectos cinematográficos después de que la vista esté lista
    this.initializeCinematographicEffects();

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
      isHovering: false,
      isTemporarilyExpanded: false
    });

    if (this.isMobile()) {
      // En móvil: siempre empezar colapsado
      this.collapseMenu = true;
      this.navServices.collapseSidebar = true;
    } else {
      // En desktop: usar estado guardado o expandido por defecto
      const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
      if (sidebarCollapsed !== null) {
        this.collapseMenu = sidebarCollapsed === 'true';
        this.navServices.collapseSidebar = this.collapseMenu;
      } else {
        this.collapseMenu = false;
        this.navServices.collapseSidebar = false;
      }

      // Sincronizar LayoutService con el estado final
      this.layout.updateSidebarState({ isCollapsed: this.collapseMenu });
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
        console.log('[Plan Card Access] No user found in localStorage');
        return false;
      }

      // Parsear el objeto usuario
      const user = JSON.parse(userStr);

      if (!user || !user.rol) {
        console.log('[Plan Card Access] User object or role not found', user);
        return false;
      }

      const userRole = user.rol;
      console.log('[Plan Card Access] User role detected:', userRole);

      // Verificar si es Super Administrador (case sensitive)
      if (userRole === 'Super Administrador') {
        console.log('[Plan Card Access] User is Super Administrador - Access GRANTED');
        return true;
      }

      // Verificar si contiene "admin" (case insensitive)
      if (userRole.toLowerCase().includes('admin')) {
        console.log('[Plan Card Access] User role contains "admin" - Access GRANTED');
        return true;
      }

      console.log('[Plan Card Access] User is not an administrator - Access DENIED');
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

      // Solo cambiar estado si no estaba guardado intencionalmente
      const savedCollapsed = localStorage.getItem('sidebarCollapsed');
      if (savedCollapsed === null) {
        this.collapseMenu = false;
        this.navServices.collapseSidebar = false;
      }
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

  // Nueva función para procesar los items del menú en secciones
  private processMenuItems(menuItems: Menu[]): void {
    // Limpiar las secciones existentes
    this.sections = [];

    // Variables para seguimiento de la sección actual
    let currentTitle: string | null = null;
    let currentItems: Menu[] = [];
    let isHeaderSection = false;

    // Recorrer cada ítem
    const shouldHide = (mi: Menu): boolean => {
      const path = (mi.path || '').toLowerCase();
      const title = (mi.title || '').toLowerCase();
      // Ocultar rutas y títulos de Empresa/Usuarios/Roles
      if (path.includes('/empresas') || path.includes('/usuarios') || path.includes('/rol')) return true;
      if (title.includes('empresa') || title.includes('usuario') || title.includes('rol')) return true;
      return false;
    };

    menuItems.forEach(item => {
      // Ignorar items nulos
      if (!item) return;
      // Filtrar items que deben ocultarse del sidebar
      if (shouldHide(item)) return;

      // Si es un encabezado, crear nueva sección con el encabezado anterior (si existe)
      if (item.headTitle1) {
        // Si ya hay una sección en curso, guardarla (si tiene items)
        if (currentItems.length > 0) {
          this.sections.push({
            title: currentTitle,
            items: [...currentItems],
            collapsed: true,
            isHeaderSection
          });

          // Reiniciar los items
          currentItems = [];
        }

        // Actualizar variables para la nueva sección
        currentTitle = item.headTitle1;
        isHeaderSection = true;
      }
      // Si es un ítem normal (no headTitle)
      else if (!item.headTitle1 && !item.headTitle2) {
        // Si aún no hay sección, crear una sin título
        if (currentTitle === null && currentItems.length === 0) {
          isHeaderSection = false;
        }
        // Si el item tiene hijos, filtrarlos también
        if (item.children && item.children.length) {
          item.children = item.children.filter(ch => !shouldHide(ch));
          // Filtrado en nietos
          item.children.forEach(ch => {
            if (ch.children && ch.children.length) {
              ch.children = ch.children.filter(gn => !shouldHide(gn));
            }
          });
        }

        // Añadir el ítem a la sección actual
        currentItems.push(item);
      }
      // Ignorar headTitle2 u otros tipos
    });

    // No olvidar añadir la última sección si tiene items
    if (currentItems.length > 0) {
      this.sections.push({
        title: currentTitle,
        items: [...currentItems],
        collapsed: true,
        isHeaderSection
      });
    }

    // Recuperar estado colapsado de localStorage
    const savedSectionsState = localStorage.getItem('sidebarSectionsState');
    let collapsedStates: { [title: string]: boolean } = {};

    if (savedSectionsState) {
      try {
        collapsedStates = JSON.parse(savedSectionsState);

        // Aplicar estados guardados a las secciones
        this.sections.forEach(section => {
          if (section.title && collapsedStates[section.title] !== undefined) {
            section.collapsed = collapsedStates[section.title];
          }
        });
      } catch (e) {
        console.error("Error loading sidebar sections state:", e);
        localStorage.removeItem('sidebarSectionsState');
      }
    }
  }

  // Method to close sidebar after navigation on mobile/tablet
  // MEJORADO: También colapsa inmediatamente en desktop con hover-expand
  onMobileLinkClick(): void {
    if (window.innerWidth < 992) {
      // Close sidebar on mobile/tablet after navigation
      setTimeout(() => {
        this.navServices.hideMobileSidebar();
      }, 100); // Small delay to ensure navigation starts
    } else if (this.collapseMenu && this.isTemporarilyExpanded) {
      // Para desktop con hover-expand, colapsar inmediatamente
      this.collapseImmediately();
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
    const collapsedStates: { [title: string]: boolean } = {};
    this.sections.forEach(section => {
      if (section.title) {
        collapsedStates[section.title] = section.collapsed;
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
    console.log('🚀 Abriendo modal de upgrade...');
    this.showPlanModal = true;
  }

  viewSubscriptionDetails() {
    console.log('📊 Mostrando detalles de uso...');
    // Por ahora, redirigir a pricing donde se ve todo
    // En el futuro puede ser una página dedicada de detalles
    this.navigateAndCleanup('/pricing');
  }

  closePlanModal() {
    this.showPlanModal = false;
    document.body.style.overflow = '';
    // Refrescar datos de suscripción al cerrar el modal
    this.subscriptionService.refresh();
  }

  private loadSubscriptionData(): void {
    console.log('📊 Cargando datos de suscripción...');

    // Cargar estado de suscripción
    this.subscriptionService.subscription$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(subscription => {
      if (subscription) {
        console.log('✅ Suscripción cargada:', subscription);
        this.currentPlan.type = subscription.plan === 'premium' ? 'Premium' : 'Freemium';
        this.currentPlan.status = subscription.status;

        if (subscription.limits?.orders?.resetDate) {
          this.currentPlan.renewalDate = this.formatDate(subscription.limits.orders.resetDate);
          this.currentPlan.daysLeft = this.calculateDaysUntilReset(subscription.limits.orders.resetDate);
        }
      }
    });

    // Cargar estadísticas de uso
    this.subscriptionService.usage$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(usage => {
      if (usage) {
        console.log('📈 Uso cargado:', usage);
        this.currentPlan.usage = {
          orders: {
            current: usage.orders?.current || 0,
            limit: usage.orders?.limit || 15
          },
          chatAI: {
            current: usage.ai?.chat?.used || 0,
            limit: usage.ai?.chat?.limit || 10
          },
          productsAI: {
            current: usage.ai?.products?.used || 0,
            limit: usage.ai?.products?.limit || 10
          },
          voice: {
            enabled: (usage.ai?.voice?.limit || 0) > 0
          },
          video: {
            enabled: (usage.ai?.video?.limit || 0) > 0
          }
        };

        this.currentPlan.progress = this.calculateOverallProgress(usage);
      }
    });

    // Trigger initial load
    this.subscriptionService.loadSubscriptionStatus().subscribe({
      next: () => console.log('✅ Estado de suscripción cargado'),
      error: (err) => console.error('❌ Error cargando suscripción:', err)
    });

    this.subscriptionService.getUsageStats().subscribe({
      next: () => console.log('✅ Estadísticas de uso cargadas'),
      error: (err) => console.error('❌ Error cargando uso:', err)
    });
  }

  private calculateOverallProgress(usage: any): number {
    const metrics = [];

    // Solo calcular % de features habilitadas
    if (usage.orders?.limit > 0 && usage.orders?.limit !== -1) {
      metrics.push((usage.orders.current / usage.orders.limit) * 100);
    }
    if (usage.ai?.chat?.limit > 0 && usage.ai?.chat?.limit !== -1) {
      metrics.push((usage.ai.chat.used / usage.ai.chat.limit) * 100);
    }
    if (usage.ai?.products?.limit > 0 && usage.ai?.products?.limit !== -1) {
      metrics.push((usage.ai.products.used / usage.ai.products.limit) * 100);
    }

    if (metrics.length === 0) return 0;

    const average = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    return Math.min(100, Math.round(average));
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

  private formatDate(date: any): string {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'No definida';
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

    // Resetear estado temporal cuando se hace click manual
    this.isTemporarilyExpanded = false;

    // ★ IMPORTANTE: Limpiar TODAS las clases de expansión temporal
    this.cleanupTemporaryExpansionClasses();

    // Limpiar timeouts de hover
    if (this.hoverExpandTimeout) {
      clearTimeout(this.hoverExpandTimeout);
      this.hoverExpandTimeout = null;
    }

    // Cerrar submenú flotante si está abierto
    this.closeCollapsedSubmenu();

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

    // En modo compacto, cerrar submenús al colapsar
    if (this.collapseMenu && this.isCompactMode) {
      this.closeAllSubmenus();
    }

    // Guardar estado en localStorage SOLO en desktop
    if (!this.isMobile()) {
      localStorage.setItem('sidebarCollapsed', this.collapseMenu.toString());
    }

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


  // ==================== ACCORDION CON SET CENTRALIZADO ====================

  /**
   * Genera una clave única para identificar un item del menú
   */
  getMenuKey(item: Menu): string {
    return item.title || item.path || '';
  }

  /**
   * Verifica si un menú está abierto usando el Set centralizado
   */
  isMenuOpen(item: Menu): boolean {
    return this.openMenus.has(this.getMenuKey(item));
  }

  /**
   * Cierra TODOS los menús de primer nivel (ACCORDION GLOBAL)
   */
  private closeAllFirstLevelMenus(): void {
    // Limpiar el Set y también item.active para que la UI se actualice
    this.sections.forEach(section => {
      section.items.forEach(menuItem => {
        if (menuItem.children) {
          const key = this.getMenuKey(menuItem);
          this.openMenus.delete(key);
          menuItem.active = false; // Actualizar estado visual
          // También cerrar submenús
          this.closeChildrenInSet(menuItem);
          this.closeChildrenActive(menuItem);
        }
      });
    });
  }

  /**
   * Cierra los hijos de un item (propiedad active)
   */
  private closeChildrenActive(item: Menu): void {
    if (item.children) {
      item.children.forEach(child => {
        child.active = false;
        this.closeChildrenActive(child);
      });
    }
  }

  /**
   * Cierra los hijos de un item en el Set
   */
  private closeChildrenInSet(item: Menu): void {
    if (item.children) {
      item.children.forEach(child => {
        this.openMenus.delete(this.getMenuKey(child));
        this.closeChildrenInSet(child);
      });
    }
  }

  // Click Toggle menu - Para submenús dentro de items
  toggletNavActive(item: Menu, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const menuKey = this.getMenuKey(item);
    const isCurrentlyOpen = this.openMenus.has(menuKey);
    const isFirstLevel = this.isFirstLevelItem(item);

    // En estado colapsado para desktop (sin expansión temporal), mostrar submenú flotante
    if (this.collapseMenu && !this.isTemporarilyExpanded && !this.isMobile()) {
      if (item.path && !item.children) {
        this.navigateAndCleanup(item.path);
        return;
      }
      this.showCollapsedSubmenu(item, event);
      // Accordion en modo colapsado
      if (!isCurrentlyOpen && isFirstLevel) {
        this.closeAllFirstLevelMenus();
      }
      this.openMenus.add(menuKey);
      item.active = true;
      this.cdr.detectChanges();
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

    // Toggle del estado en el Set
    if (isCurrentlyOpen) {
      this.openMenus.delete(menuKey);
      this.closeChildrenInSet(item);
      item.active = false;
    } else {
      this.openMenus.add(menuKey);
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
        this.openMenus.delete(this.getMenuKey(child));
        child.active = false;
        this.closeChildrenRecursive(child);
      });

    }
  }

  // ACCORDION GLOBAL: Cerrar hermanos del item en el mismo nivel (TODAS las secciones)
  private closeSiblings(item: Menu): void {
    const itemTitle = item.title;
    const isFirstLevel = this.isFirstLevelItem(item);

    // Si es de primer nivel, cerrar TODOS los otros items de primer nivel en TODAS las secciones
    if (isFirstLevel) {
      // Cerrar directamente en sections (la vista que se renderiza)
      this.sections.forEach(section => {
        section.items.forEach(menuItem => {
          if (menuItem.title && menuItem.title !== itemTitle && menuItem.active && menuItem.children) {
            this.openMenus.delete(this.getMenuKey(menuItem));
            menuItem.active = false;
            this.closeChildrenRecursive(menuItem);
          }
        });
      });

      // También cerrar en originalMenuItems para mantener sincronizado
      const originalMenuItems = this.navServices.getMenuItems();
      originalMenuItems.forEach(menuItem => {
        if (menuItem.title && menuItem.title !== itemTitle && menuItem.active && menuItem.children) {
          this.openMenus.delete(this.getMenuKey(menuItem));
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
    const isInThisLevel = children.some(child => child === targetItem || child.title === targetItem.title);

    if (isInThisLevel) {
      // Cerrar todos los hermanos excepto el target
      children.forEach(child => {
        if (child !== targetItem && child.title !== targetItem.title && child.active) {
          this.openMenus.delete(this.getMenuKey(child));
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
      section.items.some(menuItem => menuItem === item || menuItem.title === item.title)
    );
    return result;
  }

  /**
   * NUEVO: Verificar si hay algún submenú abierto en todo el sidebar
   * Esto previene el colapso automático cuando el usuario está interactuando con submenús
   */
  private hasOpenSubmenu(): boolean {
    // Verificar en todas las secciones
    for (const section of this.sections) {
      for (const item of section.items) {
        if (this.hasActiveChildren(item)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * NUEVO: Verificar recursivamente si un item o sus hijos están activos
   */
  private hasActiveChildren(item: Menu): boolean {
    if (!item) return false;

    // Si el item está activo y tiene hijos, hay un submenú abierto
    if (item.active && item.children && item.children.length > 0) {
      return true;
    }

    // Verificar recursivamente en los hijos
    if (item.children) {
      return item.children.some(child => this.hasActiveChildren(child));
    }

    return false;
  }

  /**
   * NUEVO: Resetear el timer de colapso cuando el usuario está interactuando
   * Esto da más tiempo al usuario para navegar por los menús
   */
  private resetCollapseTimer(): void {
    // Limpiar timeout existente
    if (this.hoverExpandTimeout) {
      clearTimeout(this.hoverExpandTimeout);
      this.hoverExpandTimeout = null;
    }

    // Establecer nuevo timeout con delay extendido
    this.hoverExpandTimeout = setTimeout(() => {
      // Solo colapsar si no hay submenús abiertos y el mouse no está dentro
      if (!this.hasOpenSubmenu() && !this.isMouseInsideSidebar) {
        this.isTemporarilyExpanded = false;
      }
    }, 800); // Tiempo extendido para mejor UX
  }

  /**
   * NUEVO: Método para colapsar inmediatamente el sidebar
   * Usado cuando el usuario hace click en un link de navegación
   */
  private collapseImmediately(): void {
    this.isTemporarilyExpanded = false;
    this.isMouseInsideSidebar = false;
    if (this.hoverExpandTimeout) {
      clearTimeout(this.hoverExpandTimeout);
      this.hoverExpandTimeout = null;
    }
  }

  /**
   * Manejar click en items del menú principal
   * Limpia las clases de expansión temporal cuando se navega
   */
  onMenuItemClick(item: Menu): void {
    // Si está temporalmente expandido, limpiar estado para que el header se ajuste
    if (this.isTemporarilyExpanded) {
      this.isTemporarilyExpanded = false;
      this.cleanupTemporaryExpansionClasses();

      // Limpiar timeouts pendientes
      if (this.hoverExpandTimeout) {
        clearTimeout(this.hoverExpandTimeout);
        this.hoverExpandTimeout = null;
      }
    }
  }

  /**
   * Manejar click en items de submenús
   * Limpia las clases de expansión temporal cuando se navega
   */
  onSubMenuItemClick(event: Event): void {
    // Si está temporalmente expandido, limpiar estado para que el header se ajuste
    if (this.isTemporarilyExpanded) {
      this.isTemporarilyExpanded = false;
      this.cleanupTemporaryExpansionClasses();

      // Limpiar timeouts pendientes
      if (this.hoverExpandTimeout) {
        clearTimeout(this.hoverExpandTimeout);
        this.hoverExpandTimeout = null;
      }
    }
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

  getSectionIcon(sectionTitle: string): string {
    const iconMap: { [key: string]: string } = {
      // Secciones principales - Compatible con FontAwesome 4.7.0
      'Gestión Comercial': 'fa-shopping-bag',
      'Operaciones Internas': 'fa-cogs',
      'Logística': 'fa-truck',
      'Inteligencia de Negocios': 'fa-lightbulb-o',
      'Administración Global': 'fa-users',
      'Configuración Plataforma': 'fa-sliders',

      // Módulos específicos
      'Ventas': 'fa-line-chart',
      'Inventario': 'fa-building-o',
      'Reportes': 'fa-bar-chart',
      'Usuarios': 'fa-users',
      'Configuración': 'fa-cog',
      'Finanzas': 'fa-dollar',
      'Marketing': 'fa-bullhorn',
      'Soporte': 'fa-headphones',
      'Análisis': 'fa-line-chart',
      'Productos': 'fa-cubes',
      'Clientes': 'fa-handshake-o',
      'Facturación': 'fa-file-text-o',
      'Compras': 'fa-shopping-cart',
      'Contabilidad': 'fa-calculator',
      'Recursos Humanos': 'fa-users',
      'Calidad': 'fa-star',
      'Seguridad': 'fa-shield',
      'Comunicaciones': 'fa-comments',
      'Herramientas': 'fa-wrench',
      'Integraciones': 'fa-puzzle-piece',
      'API': 'fa-code',
      'Notificaciones': 'fa-bell',
      'Alertas': 'fa-exclamation-triangle',
      'Estadísticas': 'fa-bar-chart',
      'Dashboard': 'fa-pie-chart',
      'Panel Control': 'fa-tachometer',
      'Monitoreo': 'fa-desktop',
      'Auditoría': 'fa-search',
      'Backup': 'fa-cloud-upload',
      'Importar/Exportar': 'fa-exchange',
      // === LOGÍSTICA Y TRANSPORTE ===
      'truck': 'fa-truck',
      // Iconos adicionales mapeados para compatibilidad
      'map-pin': 'fa-map-marker',
      'user-check': 'fa-user',
      'layers': 'fa-th-large',
      'grid': 'fa-th',
      'shipping': 'fa-truck',
      'map': 'fa-map-o',
      'route': 'fa-road',
      'location': 'fa-map-marker',
      'gps': 'fa-crosshairs',
      'tracking': 'fa-location-arrow',
      'logistics': 'fa-truck',

      // === ESTADOS Y ALERTAS ===
      'check': 'fa-check',
      'success': 'fa-check-circle',
      'times': 'fa-times',
      'error': 'fa-times-circle',
      'exclamation': 'fa-exclamation-triangle',
      'warning': 'fa-exclamation-triangle',
      'info': 'fa-info-circle',
      'question': 'fa-question-circle',
      'help': 'fa-question-circle',
      'alert': 'fa-exclamation',
      'pending': 'fa-clock-o',
      'processing': 'fa-spinner',
      'completed': 'fa-check',
      'status': 'fa-circle',

      // === ACCIONES ===
      'plus': 'fa-plus',
      'add': 'fa-plus',
      'create': 'fa-plus',
      'new': 'fa-plus',
      'minus': 'fa-minus',
      'remove': 'fa-minus',
      'edit': 'fa-edit',
      'modify': 'fa-edit',
      'update': 'fa-edit',
      'delete': 'fa-trash',
      'trash': 'fa-trash-o',
      'save': 'fa-save',
      'download': 'fa-download',
      'upload': 'fa-upload',
      'import': 'fa-download',
      'export': 'fa-upload',
      'print': 'fa-print',
      'copy': 'fa-copy',
      'duplicate': 'fa-copy',
      'move': 'fa-arrows',
      'sync': 'fa-refresh',
      'refresh': 'fa-refresh',
      'reload': 'fa-repeat',

      // === BÚSQUEDA Y FILTROS ===
      'search': 'fa-search',
      'find': 'fa-search',
      'filter': 'fa-filter',
      'sort': 'fa-sort',
      'sort-asc': 'fa-sort-up',
      'sort-desc': 'fa-sort-down',
      'view': 'fa-eye',
      'hide': 'fa-eye-slash',
      'show': 'fa-eye',

      // === TIEMPO Y CALENDARIO ===
      'calendar': 'fa-calendar',
      'date': 'fa-calendar-o',
      'time': 'fa-clock-o',
      'schedule': 'fa-calendar-check-o',
      'appointment': 'fa-calendar-plus-o',
      'event': 'fa-calendar',
      'deadline': 'fa-hourglass-end',
      'timer': 'fa-clock-o',
      'history': 'fa-history',

      // === EMPRESARIAL Y NEGOCIOS ===
      'building': 'fa-building',
      'company': 'fa-building',
      'office': 'fa-building',
      'industry': 'fa-industry',
      'factory': 'fa-industry',
      'handshake': 'fa-handshake-o',
      'deal': 'fa-handshake-o',
      'partnership': 'fa-handshake-o',
      'briefcase': 'fa-briefcase',
      'business': 'fa-briefcase',
      'calculator': 'fa-calculator',
      'accounting': 'fa-calculator',
      'finance': 'fa-dollar',
      'budget': 'fa-money',
      'investment': 'fa-line-chart',
      'profit': 'fa-arrow-up',
      'loss': 'fa-arrow-down',

      // === CALIDAD Y CERTIFICACIONES ===
      'quality': 'fa-star',
      'medal': 'fa-star',
      'trophy': 'fa-trophy',
      'badge': 'fa-certificate',
      'verification': 'fa-check-circle',
      'approval': 'fa-check-square-o',
      'signature': 'fa-pencil-square-o',

      // === SEGURIDAD ===
      'security': 'fa-shield',
      'shield': 'fa-shield',
      'lock': 'fa-lock',
      'unlock': 'fa-unlock',
      'key': 'fa-key',
      'password': 'fa-key',
      'encryption': 'fa-user-secret',
      'privacy': 'fa-user-secret',
      'backup': 'fa-cloud-upload',
      'restore': 'fa-cloud-download',

      // === TECNOLOGÍA ===
      'computer': 'fa-desktop',
      'laptop': 'fa-laptop',
      'mobile': 'fa-mobile',
      'tablet': 'fa-tablet',
      'wifi': 'fa-wifi',
      'bluetooth': 'fa-bluetooth-b',
      'usb': 'fa-usb',
      'cloud': 'fa-cloud',
      'network': 'fa-sitemap',
      'internet': 'fa-globe',

      // === GENÉRICOS MEJORADOS ===
      'circle': 'fa-circle',
      'dot': 'fa-circle',
      'point': 'fa-map-marker',
      'marker': 'fa-map-marker',
      'flag': 'fa-flag',
      'tag': 'fa-tag',
      'label': 'fa-tag',
      'external-link': 'fa-external-link',
    };
    return iconMap[sectionTitle] || 'fa-folder-open-o';
  }

  // Método inteligente para obtener iconos de menú con mapeo para FontAwesome 4.7.0
  getMenuIcon(icon: string | undefined, title?: string, isSubmenu: boolean = false): string {
    // Si no hay icono, intentar inferir del título
    if (!icon && title) {
      icon = this.inferIconFromTitle(title);
    }

    if (!icon) {
      return isSubmenu ? 'fa-circle-o' : 'fa-circle-o';
    }

    // Si ya tiene el prefijo fa-, devolverlo tal como está
    if (icon.startsWith('fa-')) {
      return icon;
    }

    // Mapeo de iconos compatible con FontAwesome 4.7.0
    const iconMap: { [key: string]: string } = {
      // === COMERCIAL Y VENTAS ===
      'shopping-cart': 'fa-shopping-cart',
      'cart': 'fa-shopping-cart',
      'store': 'fa-shopping-bag',
      'shop': 'fa-shopping-bag',
      'receipt': 'fa-file-text-o',
      'cash-register': 'fa-calculator',
      'credit-card': 'fa-credit-card',
      'payment': 'fa-credit-card',
      'dollar-sign': 'fa-dollar',
      'euro-sign': 'fa-eur',
      'peso': 'fa-dollar',
      'money': 'fa-money',
      'coins': 'fa-money',
      'wallet': 'fa-credit-card-alt',
      'pos': 'fa-calculator',
      'sale': 'fa-tags',
      'discount': 'fa-percent',
      'price': 'fa-tag',
      'invoice': 'fa-file-text-o',
      'billing': 'fa-file-text-o',
      'quotation': 'fa-file-text-o',
      'order': 'fa-clipboard',
      'purchase': 'fa-shopping-cart',
      'sell': 'fa-handshake-o',

      // === USUARIOS Y PERSONAS ===
      'user': 'fa-user',
      'users': 'fa-users',
      'user-check': 'fa-user',
      'user-tie': 'fa-user',
      'user-cog': 'fa-user',
      'user-friends': 'fa-users',
      'user-shield': 'fa-user',
      'customer': 'fa-user',
      'client': 'fa-handshake-o',
      'supplier': 'fa-truck',
      'employee': 'fa-id-card-o',
      'team': 'fa-users',
      'profile': 'fa-address-card-o',
      'contact': 'fa-address-book-o',
      'permission': 'fa-key',
      'role': 'fa-user-circle-o',
      'group': 'fa-users',
      'organization': 'fa-sitemap',

      // === INVENTARIO Y PRODUCTOS ===
      'box': 'fa-cube',
      'boxes': 'fa-cubes',
      'layers': 'fa-th-large',
      'cube': 'fa-cube',
      'cubes': 'fa-cubes',
      'warehouse': 'fa-building-o',
      'inventory': 'fa-building-o',
      'stock': 'fa-cubes',
      'product': 'fa-cube',
      'category': 'fa-folder-o',
      'barcode': 'fa-barcode',
      'qrcode': 'fa-qrcode',
      'package': 'fa-cube',
      'shipment': 'fa-truck',
      'delivery': 'fa-truck',
      'pickup': 'fa-hand-paper-o',
      'transfer': 'fa-exchange',
      'movement': 'fa-arrows',
      'catalog': 'fa-book',

      // === REPORTES Y ANÁLISIS ===
      'chart-bar': 'fa-bar-chart',
      'chart-line': 'fa-line-chart',
      'chart-pie': 'fa-pie-chart',
      'analytics': 'fa-line-chart',
      'graph': 'fa-area-chart',
      'trending-up': 'fa-arrow-up',
      'trending-down': 'fa-arrow-down',
      'statistics': 'fa-bar-chart',
      'metrics': 'fa-tachometer',
      'dashboard': 'fa-tachometer',
      'kpi': 'fa-bullseye',
      'performance': 'fa-line-chart',
      'insights': 'fa-lightbulb-o',
      'business-intelligence': 'fa-lightbulb-o',
      'report': 'fa-file-text-o',

      // === DOCUMENTOS Y ARCHIVOS ===
      'file': 'fa-file-o',
      'document': 'fa-file-text-o',
      'file-invoice': 'fa-file-text-o',
      'file-invoice-dollar': 'fa-file-text-o',
      'file-pdf': 'fa-file-pdf-o',
      'file-excel': 'fa-file-excel-o',
      'file-word': 'fa-file-word-o',
      'file-image': 'fa-file-image-o',
      'file-video': 'fa-file-video-o',
      'clipboard': 'fa-clipboard',
      'clipboard-list': 'fa-clipboard',
      'note': 'fa-sticky-note-o',
      'contract': 'fa-file-text-o',
      'certificate': 'fa-certificate',
      'archive': 'fa-file-archive-o',
      'folder': 'fa-folder-o',
      'folder-open': 'fa-folder-open-o',

      // === CONFIGURACIÓN Y SISTEMA ===
      'cog': 'fa-cog',
      'cogs': 'fa-cogs',
      'settings': 'fa-cogs',
      'config': 'fa-sliders',
      'tools': 'fa-wrench',
      'wrench': 'fa-wrench',
      'preferences': 'fa-toggle-on',
      'customize': 'fa-paint-brush',
      'system': 'fa-desktop',
      'server': 'fa-server',
      'database': 'fa-database',
      'api': 'fa-code',
      'integration': 'fa-puzzle-piece',
      'plugin': 'fa-plug',

      // === NAVEGACIÓN Y UI ===
      'home': 'fa-home',
      'menu': 'fa-bars',
      'list': 'fa-list',
      'grid': 'fa-th',
      'bookmark': 'fa-bookmark',
      'star': 'fa-star',
      'favorite': 'fa-heart',
      'pin': 'fa-thumb-tack',
      'link': 'fa-link',
      'back': 'fa-arrow-left',
      'forward': 'fa-arrow-right',
      'up': 'fa-arrow-up',
      'down': 'fa-arrow-down',
      'expand': 'fa-expand',
      'collapse': 'fa-compress',
      'sidebar': 'fa-bars',

      // === COMUNICACIÓN ===
      'envelope': 'fa-envelope',
      'email': 'fa-envelope',
      'phone': 'fa-phone',
      'comments': 'fa-comments',
      'chat': 'fa-comment',
      'bell': 'fa-bell',
      'message': 'fa-comment',
      'notification': 'fa-bell',
      'announcement': 'fa-bullhorn',
      'news': 'fa-newspaper-o',
      'broadcast': 'fa-bullhorn',
      'support': 'fa-headphones',

      // === LOGÍSTICA Y TRANSPORTE ===
      'truck': 'fa-truck',
      'shipping': 'fa-truck',
      'plane': 'fa-plane',
      'train': 'fa-train',
      'ship': 'fa-ship',
      'map': 'fa-map-o',
      'route': 'fa-road',
      'location': 'fa-map-marker',
      'gps': 'fa-crosshairs',
      'tracking': 'fa-location-arrow',
      'logistics': 'fa-truck',

      // === ESTADOS Y ALERTAS ===
      'check': 'fa-check',
      'success': 'fa-check-circle',
      'times': 'fa-times',
      'error': 'fa-times-circle',
      'exclamation': 'fa-exclamation-triangle',
      'warning': 'fa-exclamation-triangle',
      'info': 'fa-info-circle',
      'question': 'fa-question-circle',
      'help': 'fa-question-circle',
      'alert': 'fa-exclamation',
      'pending': 'fa-clock-o',
      'processing': 'fa-spinner',
      'completed': 'fa-check',
      'status': 'fa-circle',

      // === ACCIONES ===
      'plus': 'fa-plus',
      'add': 'fa-plus',
      'create': 'fa-plus',
      'new': 'fa-plus',
      'minus': 'fa-minus',
      'remove': 'fa-minus',
      'edit': 'fa-edit',
      'modify': 'fa-edit',
      'update': 'fa-edit',
      'delete': 'fa-trash',
      'trash': 'fa-trash-o',
      'save': 'fa-save',
      'download': 'fa-download',
      'upload': 'fa-upload',
      'import': 'fa-download',
      'export': 'fa-upload',
      'print': 'fa-print',
      'copy': 'fa-copy',
      'duplicate': 'fa-copy',
      'move': 'fa-arrows',
      'sync': 'fa-refresh',
      'refresh': 'fa-refresh',
      'reload': 'fa-repeat',

      // === BÚSQUEDA Y FILTROS ===
      'search': 'fa-search',
      'find': 'fa-search',
      'filter': 'fa-filter',
      'sort': 'fa-sort',
      'sort-asc': 'fa-sort-up',
      'sort-desc': 'fa-sort-down',
      'view': 'fa-eye',
      'hide': 'fa-eye-slash',
      'show': 'fa-eye',

      // === TIEMPO Y CALENDARIO ===
      'calendar': 'fa-calendar',
      'date': 'fa-calendar-o',
      'time': 'fa-clock-o',
      'schedule': 'fa-calendar-check-o',
      'appointment': 'fa-calendar-plus-o',
      'event': 'fa-calendar',
      'deadline': 'fa-hourglass-end',
      'timer': 'fa-clock-o',
      'history': 'fa-history',

      // === EMPRESARIAL Y NEGOCIOS ===
      'building': 'fa-building',
      'company': 'fa-building',
      'office': 'fa-building',
      'industry': 'fa-industry',
      'factory': 'fa-industry',
      'handshake': 'fa-handshake-o',
      'deal': 'fa-handshake-o',
      'partnership': 'fa-handshake-o',
      'briefcase': 'fa-briefcase',
      'business': 'fa-briefcase',
      'calculator': 'fa-calculator',
      'accounting': 'fa-calculator',
      'finance': 'fa-dollar',
      'budget': 'fa-money',
      'investment': 'fa-line-chart',
      'profit': 'fa-arrow-up',
      'loss': 'fa-arrow-down',

      // === CALIDAD Y CERTIFICACIONES ===
      'quality': 'fa-star',
      'medal': 'fa-star',
      'trophy': 'fa-trophy',
      'badge': 'fa-certificate',
      'verification': 'fa-check-circle',
      'approval': 'fa-check-square-o',
      'signature': 'fa-pencil-square-o',

      // === SEGURIDAD ===
      'security': 'fa-shield',
      'shield': 'fa-shield',
      'lock': 'fa-lock',
      'unlock': 'fa-unlock',
      'key': 'fa-key',
      'password': 'fa-key',
      'encryption': 'fa-user-secret',
      'privacy': 'fa-user-secret',
      'backup': 'fa-cloud-upload',
      'restore': 'fa-cloud-download',

      // === TECNOLOGÍA ===
      'computer': 'fa-desktop',
      'laptop': 'fa-laptop',
      'mobile': 'fa-mobile',
      'tablet': 'fa-tablet',
      'wifi': 'fa-wifi',
      'bluetooth': 'fa-bluetooth-b',
      'usb': 'fa-usb',
      'cloud': 'fa-cloud',
      'network': 'fa-sitemap',
      'internet': 'fa-globe',

      // === GENÉRICOS MEJORADOS ===
      'circle': 'fa-circle',
      'dot': 'fa-circle',
      'point': 'fa-map-marker',
      'marker': 'fa-map-marker',
      'flag': 'fa-flag',
      'tag': 'fa-tag',
      'label': 'fa-tag',
      'external-link': 'fa-external-link',
      'map-pin': 'fa-map-marker',

      // === ICONOS FEATHER ADICIONALES ===
      'target': 'fa-bullseye',
      'bar-chart-2': 'fa-bar-chart',
      'pie-chart': 'fa-pie-chart',
      'toggle-right': 'fa-toggle-on',
      'toggle-left': 'fa-toggle-off',
      'share-2': 'fa-share-alt',
      'git-branch': 'fa-code-fork',
      'git-merge': 'fa-code-fork',
      'link-2': 'fa-link',
      'gift': 'fa-gift',
      'user-plus': 'fa-user-plus',
      'shopping-bag': 'fa-shopping-bag',
      'monitor': 'fa-desktop',
      'tool': 'fa-wrench',
      'plus-circle': 'fa-plus-circle',
      'minus-circle': 'fa-minus-circle',
      'clock': 'fa-clock-o',
      'send': 'fa-paper-plane',
      'plus-square': 'fa-plus-square',
      'minus-square': 'fa-minus-square',
      'edit-3': 'fa-pencil',
      'edit-2': 'fa-pencil',
      'refresh-cw': 'fa-refresh',
      'rotate-cw': 'fa-refresh',
      'activity': 'fa-line-chart',
      'zap': 'fa-bolt',
      'award': 'fa-trophy',
      'file-text': 'fa-file-text-o',
      'smartphone': 'fa-mobile',
      'cpu': 'fa-microchip',
      'navigation': 'fa-location-arrow',
      'navigation-2': 'fa-location-arrow',
      'chevron-right': 'fa-chevron-right',
      'chevron-left': 'fa-chevron-left',
      'chevron-down': 'fa-chevron-down',
      'chevron-up': 'fa-chevron-up',
    };

    // Intentar mapear el icono
    let mappedIcon = iconMap[icon.toLowerCase()];

    // Si no se encuentra en el mapa, intentar con el nombre original añadiendo fa-
    if (!mappedIcon) {
      mappedIcon = `fa - ${icon.toLowerCase()} `;
    }

    // Si aún no es válido, usar icono por defecto
    return mappedIcon || (isSubmenu ? 'fa-circle-o' : 'fa-circle-o');
  }

  // Método para obtener icono contextual inteligente - Compatible con FontAwesome 4.7.0
  private getContextualIcon(title: string, position: number, hasSubmenu: boolean): string {
    const titleLower = title.toLowerCase();

    // Iconos específicos por posición (primeros items suelen ser más importantes)
    if (position === 0) {
      if (titleLower.includes('inicio') || titleLower.includes('dashboard')) return 'fa-home';
      if (titleLower.includes('principal')) return 'fa-star';
    }

    // Iconos para items con submenús (más elaborados)
    if (hasSubmenu) {
      if (titleLower.includes('venta')) return 'fa-shopping-bag';
      if (titleLower.includes('inventario')) return 'fa-building-o';
      if (titleLower.includes('reporte')) return 'fa-line-chart';
      if (titleLower.includes('usuario')) return 'fa-users';
      if (titleLower.includes('config')) return 'fa-cogs';
    }

    // Usar el método de inferencia estándar como fallback
    return this.inferIconFromTitle(title);
  }

  // Método para inferir iconos basado en el título del menú - Compatible con FontAwesome 4.7.0
  private inferIconFromTitle(title: string): string {
    const titleLower = title.toLowerCase();

    // Patrones de títulos comunes y sus iconos (FontAwesome 4.7.0)
    const titlePatterns: { [key: string]: string } = {
      // Dashboard y home
      'inicio': 'home',
      'dashboard': 'tachometer',
      'panel': 'tachometer',
      'escritorio': 'desktop',

      // Ventas y comercial
      'venta': 'shopping-cart',
      'ventas': 'line-chart',
      'factura': 'file-text-o',
      'cotiza': 'file-text-o',
      'pedido': 'clipboard',
      'orden': 'clipboard',
      'cliente': 'user',
      'prospecto': 'user-plus',

      // Inventario
      'producto': 'cube',
      'inventario': 'building-o',
      'stock': 'cubes',
      'categoria': 'folder-o',
      'almacén': 'building-o',
      'bodega': 'building-o',

      // Finanzas
      'finanza': 'dollar',
      'contab': 'calculator',
      'pago': 'credit-card',
      'cobro': 'money',
      'gasto': 'arrow-down',
      'ingreso': 'arrow-up',
      'presupuesto': 'calculator',

      // Reportes
      'reporte': 'bar-chart',
      'estadística': 'bar-chart',
      'análisis': 'search',
      'gráfico': 'pie-chart',
      'métrica': 'tachometer',

      // Usuarios y administración
      'usuario': 'user',
      'empleado': 'id-card-o',
      'equipo': 'users',
      'rol': 'user-circle-o',
      'permiso': 'key',
      'configuración': 'cog',
      'ajuste': 'sliders',

      // Logística
      'envío': 'truck',
      'entrega': 'truck',
      'transporte': 'truck',
      'ruta': 'road',
      'ubicación': 'map-marker',

      // Comunicación
      'mensaje': 'comment',
      'notificación': 'bell',
      'correo': 'envelope',
      'chat': 'comments',
      'soporte': 'headphones',

      // Documentos
      'documento': 'file-text-o',
      'archivo': 'file-o',
      'carpeta': 'folder-o',
      'pdf': 'file-pdf-o',
      'excel': 'file-excel-o',
      'word': 'file-word-o',

      // Procesos
      'proceso': 'cogs',
      'flujo': 'refresh',
      'tarea': 'list',
      'actividad': 'clock-o',
      'historial': 'history',

      // Calidad y control
      'calidad': 'star',
      'auditoría': 'search',
      'control': 'shield',
      'seguridad': 'lock',
      'backup': 'cloud-upload',

      // Herramientas
      'herramienta': 'wrench',
      'utilidad': 'wrench',
      'integración': 'puzzle-piece',
      'api': 'code',
      'webhook': 'link'
    };

    // Buscar patrones en el título
    for (const [pattern, icon] of Object.entries(titlePatterns)) {
      if (titleLower.includes(pattern)) {
        return icon;
      }
    }

    // Si no se encuentra patrón, retornar icono genérico
    return 'circle-o';
  }

  // Método específico para iconos de subitems
  getSubmenuIcon(icon: string | undefined, title?: string): string {
    return this.getMenuIcon(icon, title, true);
  }

  // Método para alternar modo compacto
  toggleCompactMode(): void {
    this.isCompactMode = !this.isCompactMode;
    localStorage.setItem('sidebarCompactMode', this.isCompactMode.toString());

    // Aplicar clase CSS para el modo compacto
    if (this.isCompactMode) {
      document.body.classList.add('sidebar-compact-mode');
    } else {
      document.body.classList.remove('sidebar-compact-mode');
    }

    // Cerrar submenús abiertos en modo compacto para evitar conflictos
    if (this.isCompactMode) {
      this.closeAllSubmenus();
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

  // Método para buscar en el menú
  searchMenu(): void {
    // Eliminar espacios innecesarios y normalizar término
    const term = this.searchTerm.trim().toLowerCase();

    // Activar/desactivar modo búsqueda según exista término
    this.isSearchActive = term.length > 0;

    if (!this.isSearchActive) {
      this.searchResults = [];
      return;
    }

    // Filtrar por coincidencia en título o ruta
    this.searchResults = this.getAllMenuItems()
      .filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(term);
        const pathMatch = item.path?.toLowerCase().includes(term);
        return titleMatch || pathMatch;
      })
      .slice(0, 8); // Limitar resultados para performance
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

  // Método para agregar/quitar de favoritos
  toggleFavorite(item: Menu, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const index = this.favoriteItems.findIndex(fav =>
      fav.path === item.path && fav.title === item.title
    );

    if (index > -1) {
      this.favoriteItems.splice(index, 1);
    } else {
      // Limitar a 5 favoritos
      if (this.favoriteItems.length >= 5) {
        this.favoriteItems.pop();
      }
      this.favoriteItems.unshift(item);
    }

    this.saveFavoriteItems();
  }

  // Comprobar si un item está en favoritos
  isFavorite(item: Menu): boolean {
    return this.favoriteItems.some(fav =>
      fav.path === item.path && fav.title === item.title
    );
  }

  // Guardar favoritos en localStorage
  private saveFavoriteItems(): void {
    const favoritesToSave = this.favoriteItems.map(item => ({
      title: item.title,
      path: item.path,
      icon: item.icon,
      type: item.type
    }));

    localStorage.setItem('sidebarFavoriteItems', JSON.stringify(favoritesToSave));
  }

  // Cargar favoritos desde localStorage
  private loadFavoriteItems(): void {
    const savedFavorites = localStorage.getItem('sidebarFavoriteItems');
    if (savedFavorites) {
      try {
        this.favoriteItems = JSON.parse(savedFavorites);
      } catch (e) {
        console.error('Error loading favorite items:', e);
        this.favoriteItems = [];
      }
    }
  }

  // Métodos para perfil de usuario (Glassmorphism redesign)
  private initializeUserProfile(): void {
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

  // Método mejorado para mostrar submenú flotante en estado colapsado
  private showCollapsedSubmenu(item: Menu, event?: Event): void {
    if (!item.children || this.isMobile()) return;

    // Cerrar cualquier submenú flotante existente
    this.closeCollapsedSubmenu();

    // Crear elemento del submenú flotante
    const submenuElement = this.renderer.createElement('div');
    this.renderer.addClass(submenuElement, 'collapsed-submenu-floating');
    this.renderer.setAttribute(submenuElement, 'role', 'menu');

    // Obtener posición del elemento padre
    const parentElement = (event?.target as HTMLElement)?.closest('.menu-link');
    if (!parentElement) return;

    const rect = parentElement.getBoundingClientRect();

    // Calcular posición óptima del submenú
    const viewportHeight = window.innerHeight;
    const submenuHeight = item.children.length * 48 + 16; // Estimación
    let topPosition = rect.top;

    // Ajustar posición si se sale de la pantalla
    if (topPosition + submenuHeight > viewportHeight) {
      topPosition = Math.max(16, viewportHeight - submenuHeight - 16);
    }

    // Posicionar el submenú
    this.renderer.setStyle(submenuElement, 'position', 'fixed');
    this.renderer.setStyle(submenuElement, 'left', `${rect.right + 12} px`);
    this.renderer.setStyle(submenuElement, 'top', `${topPosition} px`);
    this.renderer.setStyle(submenuElement, 'z-index', '1200');
    this.renderer.setStyle(submenuElement, 'max-height', `${viewportHeight - topPosition - 32} px`);
    this.renderer.setStyle(submenuElement, 'overflow-y', 'auto');

    // Crear contenido del submenú con diseño mejorado
    item.children.forEach((childItem, index) => {
      const itemElement = this.renderer.createElement('a');

      if (childItem.type === 'link') {
        this.renderer.setAttribute(itemElement, 'href', childItem.path || '#');
        this.renderer.listen(itemElement, 'click', (e) => {
          e.preventDefault();
          if (childItem.path) {
            this.navigateAndCleanup(childItem.path);
          }
        });
      } else if (childItem.type === 'extLink') {
        this.renderer.setAttribute(itemElement, 'href', childItem.path || '#');
        this.renderer.setAttribute(itemElement, 'target', '_blank');
        this.renderer.setAttribute(itemElement, 'rel', 'noopener noreferrer');
      }

      this.renderer.addClass(itemElement, 'collapsed-submenu-item');
      this.renderer.setAttribute(itemElement, 'role', 'menuitem');
      this.renderer.setAttribute(itemElement, 'title', childItem.title || '');
      this.renderer.setStyle(itemElement, 'animation-delay', `${index * 0.05} s`);

      // Crear wrapper de icono
      const iconWrapper = this.renderer.createElement('div');
      this.renderer.addClass(iconWrapper, 'submenu-icon-wrapper');

      // Crear icono con sistema mejorado y contexto
      const iconElement = this.renderer.createElement('i');
      this.renderer.addClass(iconElement, 'fa');
      const iconClass = this.getMenuIcon(childItem.icon, childItem.title);
      this.renderer.addClass(iconElement, iconClass);
      this.renderer.addClass(iconElement, 'floating-submenu-icon');
      this.renderer.setAttribute(iconElement, 'aria-hidden', 'true');
      this.renderer.setStyle(iconElement, '--floating-icon-index', index.toString());

      this.renderer.appendChild(iconWrapper, iconElement);

      // Crear wrapper de contenido
      const contentWrapper = this.renderer.createElement('div');
      this.renderer.addClass(contentWrapper, 'submenu-content');

      // Crear texto principal
      const textElement = this.renderer.createElement('span');
      this.renderer.addClass(textElement, 'submenu-text');
      this.renderer.appendChild(textElement, this.renderer.createText(childItem.title || ''));

      this.renderer.appendChild(contentWrapper, textElement);

      // Añadir indicador para enlaces externos
      if (childItem.type === 'extLink') {
        const externalIcon = this.renderer.createElement('i');
        this.renderer.addClass(externalIcon, 'fa');
        this.renderer.addClass(externalIcon, 'fa-arrow-up-right-from-square');
        this.renderer.addClass(externalIcon, 'external-indicator');
        this.renderer.setAttribute(externalIcon, 'aria-hidden', 'true');
        this.renderer.appendChild(contentWrapper, externalIcon);
      }

      // Añadir indicador para submenús anidados
      if (childItem.children && childItem.children.length > 0) {
        const chevronIcon = this.renderer.createElement('i');
        this.renderer.addClass(chevronIcon, 'fa');
        this.renderer.addClass(chevronIcon, 'fa-chevron-right');
        this.renderer.addClass(chevronIcon, 'submenu-chevron');
        this.renderer.setAttribute(chevronIcon, 'aria-hidden', 'true');
        this.renderer.appendChild(contentWrapper, chevronIcon);
      }

      this.renderer.appendChild(itemElement, iconWrapper);
      this.renderer.appendChild(itemElement, contentWrapper);
      this.renderer.appendChild(submenuElement, itemElement);

      // Añadir eventos de hover para mejor UX
      this.renderer.listen(itemElement, 'mouseenter', () => {
        this.renderer.addClass(itemElement, 'hovered');
      });

      this.renderer.listen(itemElement, 'mouseleave', () => {
        this.renderer.removeClass(itemElement, 'hovered');
      });
    });

    // Añadir al DOM
    this.renderer.appendChild(document.body, submenuElement);

    // Listener para cerrar al hacer clic fuera con debounce
    setTimeout(() => {
      const closeListener = this.renderer.listen('document', 'click', (e) => {
        if (!submenuElement.contains(e.target) && !parentElement.contains(e.target)) {
          this.closeCollapsedSubmenu();
          closeListener();
        }
      });

      // Guardar referencia para poder cerrarlo después
      (submenuElement as any)._closeListener = closeListener;
    }, 100);

    this.currentCollapsedSubmenu = submenuElement;
  }

  private currentCollapsedSubmenu: any = null;

  private closeCollapsedSubmenu(): void {
    if (this.currentCollapsedSubmenu) {
      if (this.currentCollapsedSubmenu._closeListener) {
        this.currentCollapsedSubmenu._closeListener();
      }
      this.renderer.removeChild(document.body, this.currentCollapsedSubmenu);
      this.currentCollapsedSubmenu = null;
    }
  }

  // Método para resetear el sidebar al estado inicial
  resetSidebar(): void {
    this.searchTerm = '';
    this.searchResults = [];
    this.isSearchActive = false;
    this.isSearchFocused = false;
    this.closeAllSubmenus();
    this.closeCollapsedSubmenu();

    // Resetear estado de secciones si es necesario
    this.sections.forEach(section => {
      if (section.isHeaderSection) {
        section.collapsed = true;
      }
    });
    this.saveSectionsState();
  }


  // ===================================================
  // VALIDACIÓN Y OPTIMIZACIÓN DE ICONOS FA 4.7.0
  // ===================================================

  // Cache para iconos validados
  private iconCache = new Map<string, string>();

  // Lista de iconos válidos en FontAwesome 4.7.0
  private readonly validFA4Icons = new Set([
    'fa-home', 'fa-user', 'fa-users', 'fa-cog', 'fa-cogs', 'fa-search', 'fa-bell',
    'fa-envelope', 'fa-star', 'fa-heart', 'fa-shopping-cart', 'fa-truck', 'fa-calendar',
    'fa-clock-o', 'fa-file-o', 'fa-folder-o', 'fa-folder-open-o', 'fa-edit', 'fa-trash-o',
    'fa-save', 'fa-download', 'fa-upload', 'fa-print', 'fa-copy', 'fa-cut', 'fa-paste',
    'fa-undo', 'fa-repeat', 'fa-refresh', 'fa-lock', 'fa-unlock', 'fa-key', 'fa-shield',
    'fa-check', 'fa-times', 'fa-plus', 'fa-minus', 'fa-question', 'fa-info', 'fa-exclamation',
    'fa-warning', 'fa-ban', 'fa-arrow-up', 'fa-arrow-down', 'fa-arrow-left', 'fa-arrow-right',
    'fa-chevron-up', 'fa-chevron-down', 'fa-chevron-left', 'fa-chevron-right', 'fa-angle-up',
    'fa-angle-down', 'fa-angle-left', 'fa-angle-right', 'fa-sort', 'fa-sort-up', 'fa-sort-down',
    'fa-list', 'fa-th', 'fa-th-list', 'fa-table', 'fa-columns', 'fa-bars', 'fa-navicon',
    'fa-filter', 'fa-tag', 'fa-tags', 'fa-bookmark', 'fa-flag', 'fa-thumbs-up', 'fa-thumbs-down',
    'fa-share', 'fa-external-link', 'fa-link', 'fa-chain', 'fa-unlink', 'fa-chain-broken',
    'fa-paperclip', 'fa-quote-left', 'fa-quote-right', 'fa-comment', 'fa-comments', 'fa-sitemap',
    'fa-umbrella', 'fa-lightbulb-o', 'fa-exchange', 'fa-cloud-download', 'fa-cloud-upload',
    'fa-user-md', 'fa-stethoscope', 'fa-suitcase', 'fa-bell-o', 'fa-coffee', 'fa-cutlery',
    'fa-file-text-o', 'fa-building-o', 'fa-hospital-o', 'fa-ambulance', 'fa-medkit', 'fa-fighter-jet',
    'fa-beer', 'fa-h-square', 'fa-plus-square', 'fa-angle-double-left', 'fa-angle-double-right',
    'fa-angle-double-up', 'fa-angle-double-down', 'fa-angle-left', 'fa-angle-right', 'fa-angle-up',
    'fa-angle-down', 'fa-desktop', 'fa-laptop', 'fa-tablet', 'fa-mobile', 'fa-circle-o',
    'fa-quote-left', 'fa-quote-right', 'fa-spinner', 'fa-circle', 'fa-reply', 'fa-github-alt',
    'fa-folder-o', 'fa-folder-open-o', 'fa-smile-o', 'fa-frown-o', 'fa-meh-o', 'fa-gamepad',
    'fa-keyboard-o', 'fa-flag-o', 'fa-flag-checkered', 'fa-terminal', 'fa-code', 'fa-reply-all',
    'fa-mail-reply-all', 'fa-star-half-empty', 'fa-star-half-full', 'fa-star-half-o', 'fa-star-o',
    'fa-location-arrow', 'fa-crop', 'fa-code-fork', 'fa-unlink', 'fa-chain-broken', 'fa-question',
    'fa-info', 'fa-exclamation', 'fa-superscript', 'fa-subscript', 'fa-eraser', 'fa-puzzle-piece',
    'fa-microphone', 'fa-microphone-slash', 'fa-shield', 'fa-calendar-o', 'fa-fire-extinguisher',
    'fa-rocket', 'fa-maxcdn', 'fa-chevron-circle-left', 'fa-chevron-circle-right', 'fa-chevron-circle-up',
    'fa-chevron-circle-down', 'fa-html5', 'fa-css3', 'fa-anchor', 'fa-unlock-alt', 'fa-bullseye',
    'fa-ellipsis-h', 'fa-ellipsis-v', 'fa-rss-square', 'fa-play-circle', 'fa-ticket', 'fa-minus-square',
    'fa-minus-square-o', 'fa-level-up', 'fa-level-down', 'fa-check-square', 'fa-pencil-square',
    'fa-external-link-square', 'fa-share-square', 'fa-compass', 'fa-toggle-down', 'fa-caret-down',
    'fa-toggle-up', 'fa-caret-up', 'fa-toggle-right', 'fa-caret-right', 'fa-euro', 'fa-eur',
    'fa-gbp', 'fa-dollar', 'fa-usd', 'fa-rupee', 'fa-inr', 'fa-cny', 'fa-rmb', 'fa-yen',
    'fa-jpy', 'fa-ruble', 'fa-rouble', 'fa-rub', 'fa-won', 'fa-krw', 'fa-bitcoin', 'fa-btc',
    'fa-file', 'fa-file-text', 'fa-sort-alpha-asc', 'fa-sort-alpha-desc', 'fa-sort-amount-asc',
    'fa-sort-amount-desc', 'fa-sort-numeric-asc', 'fa-sort-numeric-desc', 'fa-thumbs-up',
    'fa-thumbs-down', 'fa-youtube-square', 'fa-youtube', 'fa-xing', 'fa-xing-square', 'fa-youtube-play',
    'fa-dropbox', 'fa-stack-overflow', 'fa-instagram', 'fa-flickr', 'fa-adn', 'fa-bitbucket',
    'fa-bitbucket-square', 'fa-tumblr', 'fa-tumblr-square', 'fa-long-arrow-down', 'fa-long-arrow-up',
    'fa-long-arrow-left', 'fa-long-arrow-right', 'fa-apple', 'fa-windows', 'fa-android', 'fa-linux',
    'fa-dribbble', 'fa-skype', 'fa-foursquare', 'fa-trello', 'fa-female', 'fa-male', 'fa-gittip',
    'fa-sun-o', 'fa-moon-o', 'fa-archive', 'fa-bug', 'fa-vk', 'fa-weibo', 'fa-renren', 'fa-pagelines',
    'fa-stack-exchange', 'fa-arrow-circle-o-right', 'fa-arrow-circle-o-left', 'fa-toggle-left',
    'fa-caret-left', 'fa-dot-circle-o', 'fa-wheelchair', 'fa-vimeo-square', 'fa-turkish-lira',
    'fa-try', 'fa-plus-square-o', 'fa-space-shuttle', 'fa-slack', 'fa-envelope-square', 'fa-wordpress',
    'fa-openid', 'fa-institution', 'fa-bank', 'fa-university', 'fa-mortar-board', 'fa-graduation-cap',
    'fa-yahoo', 'fa-google', 'fa-reddit', 'fa-reddit-square', 'fa-stumbleupon-circle', 'fa-stumbleupon',
    'fa-delicious', 'fa-digg', 'fa-pied-piper-pp', 'fa-pied-piper-alt', 'fa-drupal', 'fa-joomla',
    'fa-language', 'fa-fax', 'fa-building', 'fa-child', 'fa-paw', 'fa-spoon', 'fa-cube', 'fa-cubes',
    'fa-behance', 'fa-behance-square', 'fa-steam', 'fa-steam-square', 'fa-recycle', 'fa-automobile',
    'fa-car', 'fa-cab', 'fa-taxi', 'fa-tree', 'fa-spotify', 'fa-deviantart', 'fa-soundcloud',
    'fa-database', 'fa-file-pdf-o', 'fa-file-word-o', 'fa-file-excel-o', 'fa-file-powerpoint-o',
    'fa-file-photo-o', 'fa-file-picture-o', 'fa-file-image-o', 'fa-file-zip-o', 'fa-file-archive-o',
    'fa-file-sound-o', 'fa-file-audio-o', 'fa-file-movie-o', 'fa-file-video-o', 'fa-file-code-o',
    'fa-vine', 'fa-codepen', 'fa-jsfiddle', 'fa-life-bouy', 'fa-life-buoy', 'fa-life-saver',
    'fa-support', 'fa-life-ring', 'fa-circle-o-notch', 'fa-ra', 'fa-resistance', 'fa-rebel',
    'fa-ge', 'fa-empire', 'fa-git-square', 'fa-git', 'fa-y-combinator-square', 'fa-yc-square',
    'fa-hacker-news', 'fa-tencent-weibo', 'fa-qq', 'fa-wechat', 'fa-weixin', 'fa-send', 'fa-paper-plane',
    'fa-send-o', 'fa-paper-plane-o', 'fa-history', 'fa-circle-thin', 'fa-header', 'fa-paragraph',
    'fa-sliders', 'fa-share-alt', 'fa-share-alt-square', 'fa-bomb', 'fa-soccer-ball-o', 'fa-futbol-o',
    'fa-tty', 'fa-binoculars', 'fa-plug', 'fa-slideshare', 'fa-twitch', 'fa-yelp', 'fa-newspaper-o',
    'fa-wifi', 'fa-calculator', 'fa-paypal', 'fa-google-wallet', 'fa-cc-visa', 'fa-cc-mastercard',
    'fa-cc-discover', 'fa-cc-amex', 'fa-cc-paypal', 'fa-cc-stripe', 'fa-bell-slash', 'fa-bell-slash-o',
    'fa-trash', 'fa-copyright', 'fa-at', 'fa-eyedropper', 'fa-paint-brush', 'fa-birthday-cake',
    'fa-area-chart', 'fa-pie-chart', 'fa-line-chart', 'fa-lastfm', 'fa-lastfm-square', 'fa-toggle-off',
    'fa-toggle-on', 'fa-bicycle', 'fa-bus', 'fa-ioxhost', 'fa-angellist', 'fa-cc', 'fa-shekel',
    'fa-sheqel', 'fa-ils', 'fa-meanpath', 'fa-buysellads', 'fa-connectdevelop', 'fa-dashcube',
    'fa-forumbee', 'fa-leanpub', 'fa-sellsy', 'fa-shirtsinbulk', 'fa-simplybuilt', 'fa-skyatlas',
    'fa-cart-plus', 'fa-cart-arrow-down', 'fa-diamond', 'fa-ship', 'fa-user-secret', 'fa-motorcycle',
    'fa-street-view', 'fa-heartbeat', 'fa-venus', 'fa-mars', 'fa-mercury', 'fa-intersex',
    'fa-transgender', 'fa-transgender-alt', 'fa-venus-double', 'fa-mars-double', 'fa-venus-mars',
    'fa-mars-stroke', 'fa-mars-stroke-v', 'fa-mars-stroke-h', 'fa-neuter', 'fa-genderless',
    'fa-facebook-official', 'fa-pinterest-p', 'fa-whatsapp', 'fa-server', 'fa-user-plus',
    'fa-user-times', 'fa-hotel', 'fa-bed', 'fa-viacoin', 'fa-train', 'fa-subway', 'fa-medium',
    'fa-yc', 'fa-y-combinator', 'fa-optin-monster', 'fa-opencart', 'fa-expeditedssl', 'fa-battery-4',
    'fa-battery', 'fa-battery-full', 'fa-battery-3', 'fa-battery-three-quarters', 'fa-battery-2',
    'fa-battery-half', 'fa-battery-1', 'fa-battery-quarter', 'fa-battery-0', 'fa-battery-empty',
    'fa-mouse-pointer', 'fa-i-cursor', 'fa-object-group', 'fa-object-ungroup', 'fa-sticky-note',
    'fa-sticky-note-o', 'fa-cc-jcb', 'fa-cc-diners-club', 'fa-clone', 'fa-balance-scale',
    'fa-hourglass-o', 'fa-hourglass-1', 'fa-hourglass-start', 'fa-hourglass-2', 'fa-hourglass-half',
    'fa-hourglass-3', 'fa-hourglass-end', 'fa-hourglass', 'fa-hand-grab-o', 'fa-hand-rock-o',
    'fa-hand-stop-o', 'fa-hand-paper-o', 'fa-hand-scissors-o', 'fa-hand-lizard-o', 'fa-hand-spock-o',
    'fa-hand-pointer-o', 'fa-hand-peace-o', 'fa-trademark', 'fa-registered', 'fa-creative-commons',
    'fa-gg', 'fa-gg-circle', 'fa-tripadvisor', 'fa-odnoklassniki', 'fa-odnoklassniki-square',
    'fa-get-pocket', 'fa-wikipedia-w', 'fa-safari', 'fa-chrome', 'fa-firefox', 'fa-opera',
    'fa-internet-explorer', 'fa-tv', 'fa-television', 'fa-contao', 'fa-500px', 'fa-amazon',
    'fa-calendar-plus-o', 'fa-calendar-minus-o', 'fa-calendar-times-o', 'fa-calendar-check-o',
    'fa-industry', 'fa-map-pin', 'fa-map-signs', 'fa-map-o', 'fa-map', 'fa-commenting',
    'fa-commenting-o', 'fa-houzz', 'fa-vimeo', 'fa-black-tie', 'fa-fonticons', 'fa-reddit-alien',
    'fa-edge', 'fa-credit-card-alt', 'fa-codiepie', 'fa-modx', 'fa-fort-awesome', 'fa-usb',
    'fa-product-hunt', 'fa-mixcloud', 'fa-scribd', 'fa-pause-circle', 'fa-pause-circle-o',
    'fa-stop-circle', 'fa-stop-circle-o', 'fa-shopping-bag', 'fa-shopping-basket', 'fa-hashtag',
    'fa-bluetooth', 'fa-bluetooth-b', 'fa-percent'
  ]);

  // Iconos de fallback por categoría
  private readonly fallbackIcons = {
    'user': 'fa-user',
    'file': 'fa-file-o',
    'folder': 'fa-folder-o',
    'settings': 'fa-cog',
    'navigation': 'fa-bars',
    'action': 'fa-circle-o',
    'status': 'fa-circle',
    'communication': 'fa-comment',
    'data': 'fa-database',
    'business': 'fa-briefcase',
    'default': 'fa-circle-o'
  };

  /**
   * Valida si un icono existe en FontAwesome 4.7.0
   */
  private isValidFA4Icon(iconClass: string): boolean {
    return this.validFA4Icons.has(iconClass);
  }

  /**
   * Optimiza y valida un icono para FontAwesome 4.7.0
   */
  validateAndOptimizeIcon(iconClass: string, category: string = 'default'): string {
    // Verificar cache primero
    const cacheKey = `${iconClass} -${category} `;
    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey)!;
    }

    let optimizedIcon = iconClass;

    // Asegurar que tiene prefijo fa-
    if (!optimizedIcon.startsWith('fa-')) {
      optimizedIcon = `fa - ${optimizedIcon} `;
    }

    // Verificar si es válido
    if (this.isValidFA4Icon(optimizedIcon)) {
      this.iconCache.set(cacheKey, optimizedIcon);
      return optimizedIcon;
    }

    // Intentar mapear iconos de FA5/6 a FA4
    const fa4Mapped = this.mapToFA4Icon(optimizedIcon);
    if (fa4Mapped && this.isValidFA4Icon(fa4Mapped)) {
      this.iconCache.set(cacheKey, fa4Mapped);
      return fa4Mapped;
    }

    // Usar icono de fallback
    const fallbackIcon = this.fallbackIcons[category] || this.fallbackIcons['default'];
    this.iconCache.set(cacheKey, fallbackIcon);

    // Log para debugging en desarrollo
    if (!environment.production) {
      console.warn(`Icon '${iconClass}' not found in FA 4.7.0, using fallback: ${fallbackIcon} `);
    }

    return fallbackIcon;
  }

  /**
   * Mapea iconos de FontAwesome 5/6 a equivalentes en 4.7.0
   */
  private mapToFA4Icon(iconClass: string): string | null {
    const fa5ToFa4Map: { [key: string]: string } = {
      'fa-house': 'fa-home',
      'fa-house-user': 'fa-home',
      'fa-bars': 'fa-bars',
      'fa-navicon': 'fa-bars',
      'fa-chart-bar': 'fa-bar-chart',
      'fa-chart-line': 'fa-line-chart',
      'fa-chart-pie': 'fa-pie-chart',
      'fa-chart-area': 'fa-area-chart',
      'fa-file-alt': 'fa-file-text-o',
      'fa-file-text': 'fa-file-text-o',
      'fa-folder-open': 'fa-folder-open-o',
      'fa-calendar-alt': 'fa-calendar-o',
      'fa-clock': 'fa-clock-o',
      'fa-user-tie': 'fa-user',
      'fa-user-cog': 'fa-user',
      'fa-users-cog': 'fa-users',
      'fa-shield-alt': 'fa-shield',
      'fa-shopping-bag': 'fa-shopping-bag',
      'fa-shipping-fast': 'fa-truck',
      'fa-warehouse': 'fa-building-o',
      'fa-boxes': 'fa-cubes',
      'fa-layer-group': 'fa-folder-o',
      'fa-tachometer-alt': 'fa-tachometer',
      'fa-dollar-sign': 'fa-dollar',
      'fa-euro-sign': 'fa-eur',
      'fa-pound-sign': 'fa-gbp',
      'fa-yen-sign': 'fa-yen',
      'fa-ruble-sign': 'fa-rub',
      'fa-rupee-sign': 'fa-inr',
      'fa-won-sign': 'fa-krw',
      'fa-external-link-alt': 'fa-external-link',
      'fa-mobile-alt': 'fa-mobile',
      'fa-tablet-alt': 'fa-tablet',
      'fa-desktop': 'fa-desktop',
      'fa-laptop': 'fa-laptop',
      'fa-headset': 'fa-headphones',
      'fa-newspaper': 'fa-newspaper-o',
      'fa-handshake': 'fa-handshake-o',
      'fa-map-marker-alt': 'fa-map-marker',
      'fa-route': 'fa-road',
      'fa-id-badge': 'fa-id-card-o',
      'fa-address-card': 'fa-address-card-o',
      'fa-address-book': 'fa-address-book-o',
      'fa-sticky-note': 'fa-sticky-note-o',
      'fa-file-pdf': 'fa-file-pdf-o',
      'fa-file-word': 'fa-file-word-o',
      'fa-file-excel': 'fa-file-excel-o',
      'fa-file-powerpoint': 'fa-file-powerpoint-o',
      'fa-file-image': 'fa-file-image-o',
      'fa-file-video': 'fa-file-video-o',
      'fa-file-audio': 'fa-file-audio-o',
      'fa-file-archive': 'fa-file-archive-o',
      'fa-sliders-h': 'fa-sliders',
      'fa-tools': 'fa-wrench',
      'fa-cogs': 'fa-cogs',
      'fa-microchip': 'fa-desktop',
      'fa-palette': 'fa-paint-brush',
      'fa-sync': 'fa-refresh',
      'fa-sync-alt': 'fa-refresh',
      'fa-redo': 'fa-repeat',
      'fa-undo': 'fa-undo',
      'fa-trash-alt': 'fa-trash-o',
      'fa-eye-slash': 'fa-eye-slash',
      'fa-lightbulb': 'fa-lightbulb-o',
      'fa-brain': 'fa-lightbulb-o',
      'fa-award': 'fa-star',
      'fa-medal': 'fa-star',
      'fa-crown': 'fa-star',
      'fa-stamp': 'fa-certificate',
      'fa-signature': 'fa-pencil-square-o',
      'fa-user-shield': 'fa-user-secret',
      'fa-cloud-upload-alt': 'fa-cloud-upload',
      'fa-cloud-download-alt': 'fa-cloud-download',
      'fa-bluetooth-b': 'fa-bluetooth-b',
      'fa-compress': 'fa-compress',
      'fa-expand': 'fa-expand',
      'fa-thumbtack': 'fa-thumb-tack',
      'fa-arrows-alt': 'fa-arrows',
      'fa-exchange-alt': 'fa-exchange',
      'fa-money-bill-alt': 'fa-money',
      'fa-coins': 'fa-money',
      'fa-wallet': 'fa-credit-card',
      'fa-cash-register': 'fa-calculator',
      'fa-receipt': 'fa-file-text-o',
      'fa-clipboard-list': 'fa-clipboard',
      'fa-file-contract': 'fa-file-text-o',
      'fa-file-invoice': 'fa-file-text-o',
      'fa-file-invoice-dollar': 'fa-file-text-o',
      'fa-check-double': 'fa-check',
      'fa-check-circle': 'fa-check-circle',
      'fa-times-circle': 'fa-times-circle',
      'fa-exclamation-triangle': 'fa-warning',
      'fa-info-circle': 'fa-info-circle',
      'fa-question-circle': 'fa-question-circle',
      // Mapeos adicionales para iconos problemáticos
      'fa-pencil-alt': 'fa-pencil',
      'fa-user-edit': 'fa-user',
      'fa-battery-empty': 'fa-battery-0',
      'fa-hand-holding-usd': 'fa-usd',
      'fa-industry': 'fa-cogs',
      'fa-box': 'fa-cube'
    };

    return fa5ToFa4Map[iconClass] || null;
  }

  /**
   * Detecta el tipo de elemento para mejor mapeo de iconos
   */
  private detectIconCategory(title: string, hasChildren: boolean = false): string {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('usuario') || titleLower.includes('empleado') || titleLower.includes('cliente')) {
      return 'user';
    }
    if (titleLower.includes('archivo') || titleLower.includes('documento') || titleLower.includes('reporte')) {
      return 'file';
    }
    if (titleLower.includes('carpeta') || titleLower.includes('categoria') || hasChildren) {
      return 'folder';
    }
    if (titleLower.includes('config') || titleLower.includes('ajuste') || titleLower.includes('setting')) {
      return 'settings';
    }
    if (titleLower.includes('menú') || titleLower.includes('navegación') || titleLower.includes('inicio')) {
      return 'navigation';
    }
    if (titleLower.includes('mensaje') || titleLower.includes('correo') || titleLower.includes('chat')) {
      return 'communication';
    }
    if (titleLower.includes('base') || titleLower.includes('datos') || titleLower.includes('inventario')) {
      return 'data';
    }
    if (titleLower.includes('empresa') || titleLower.includes('negocio') || titleLower.includes('comercial')) {
      return 'business';
    }
    if (titleLower.includes('agregar') || titleLower.includes('crear') || titleLower.includes('nuevo')) {
      return 'action';
    }
    if (titleLower.includes('estado') || titleLower.includes('estatus') || titleLower.includes('activo')) {
      return 'status';
    }

    return 'default';
  }

  /**
   * Método público mejorado para obtener iconos optimizados
   */
  getOptimizedMenuIcon(icon: string | undefined, title?: string, hasChildren: boolean = false): string {
    // Si no hay icono, inferir del título
    if (!icon && title) {
      icon = this.inferIconFromTitle(title);
    }

    if (!icon) {
      const category = this.detectIconCategory(title || '', hasChildren);
      return this.validateAndOptimizeIcon('circle-o', category);
    }

    // Detectar categoría para mejor fallback
    const category = this.detectIconCategory(title || '', hasChildren);

    // Usar mapeo existente primero
    const mappedIcon = this.getMenuIcon(icon, title, false);

    // Validar y optimizar el resultado
    return this.validateAndOptimizeIcon(mappedIcon, category);
  }

  /**
   * Limpiar cache de iconos (útil para desarrollo)
   */
  clearIconCache(): void {
    this.iconCache.clear();
    if (!environment.production) {
      console.log('Icon cache cleared');
    }
  }

  /**
   * Obtener estadísticas del cache de iconos
   */
  getIconCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.iconCache.size,
      keys: Array.from(this.iconCache.keys())
    };
  }

  // ===================================================
  // EFECTOS CINEMATOGRÁFICOS
  // ===================================================

  /**
   * Inicializar efectos cinematográficos después de que la vista esté lista
   */
  private initializeCinematographicEffects(): void {
    this.createSpotlightElement();
    this.setupMouseTrackingEvents();
    this.setupMagneticEffects();
    this.animateInitialLoad();
  }

  /**
   * Crear elemento spotlight para seguir el cursor
   */
  private createSpotlightElement(): void {
    const sidebar = this.elementRef.nativeElement.querySelector('.sidebar-container');
    if (sidebar) {
      this.spotlightElement = this.renderer.createElement('div');
      this.renderer.addClass(this.spotlightElement, 'sidebar-spotlight');
      this.renderer.appendChild(sidebar, this.spotlightElement);
    }
  }

  /**
   * Configurar eventos de seguimiento del mouse
   */
  private setupMouseTrackingEvents(): void {
    const sidebar = this.elementRef.nativeElement.querySelector('.sidebar-container');
    if (!sidebar) return;

    // Mouse enter - activar spotlight
    this.renderer.listen(sidebar, 'mouseenter', () => {
      this.isMouseInSidebar = true;
      if (this.spotlightElement) {
        this.renderer.setStyle(this.spotlightElement, 'opacity', '1');
      }
    });

    // Mouse leave - desactivar spotlight
    this.renderer.listen(sidebar, 'mouseleave', () => {
      this.isMouseInSidebar = false;
      if (this.spotlightElement) {
        this.renderer.setStyle(this.spotlightElement, 'opacity', '0');
      }
    });

    // Mouse move - seguir cursor con spotlight
    this.renderer.listen(sidebar, 'mousemove', (event: MouseEvent) => {
      if (this.isMouseInSidebar && this.spotlightElement) {
        const rect = sidebar.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }

        this.animationFrameId = requestAnimationFrame(() => {
          if (this.spotlightElement) {
            this.renderer.setStyle(this.spotlightElement, 'left', `${x} px`);
            this.renderer.setStyle(this.spotlightElement, 'top', `${y} px`);
          }
        });
      }
    });
  }

  /**
   * Configurar efectos magnéticos en elementos del menú
   */
  private setupMagneticEffects(): void {
    // Aplicar efecto magnético a todos los enlaces del menú
    const menuLinks = this.elementRef.nativeElement.querySelectorAll('.menu-link');

    menuLinks.forEach((link: HTMLElement) => {
      this.renderer.listen(link, 'mouseenter', () => {
        this.renderer.addClass(link, 'magnetic-hover');
      });

      this.renderer.listen(link, 'mouseleave', () => {
        this.renderer.removeClass(link, 'magnetic-hover');
      });
    });
  }

  /**
   * Inicializar elementos con efectos suaves (sin animaciones problemáticas)
   */
  private animateInitialLoad(): void {
    const menuItems = this.elementRef.nativeElement.querySelectorAll('.menu-item');

    menuItems.forEach((item: HTMLElement) => {
      // Asegurar que todos los elementos sean visibles
      this.renderer.setStyle(item, 'opacity', '1');
      this.renderer.setStyle(item, 'transform', 'translateY(0) scale(1)');

      // Agregar clases para animaciones breathing sutiles (solo algunas)
      if (Math.random() > 0.7) {
        this.renderer.addClass(item, 'breathing-element');
      }
    });
  }

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
        this.unreadNotificationCount = notifications.filter(n => n.status !== 'READ').length;

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

    // Reproducir sonido si está habilitado
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
      console.log('No se pudo reproducir el sonido de notificación', error);
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
      this.isAutoCollapseEnabled = state.isAutoCollapseEnabled;
      this.isTemporarilyExpanded = state.isTemporarilyExpanded;
      this.isSidebarVisible = state.isVisible;
      this.isPinned = state.isPinned;
      this.isHovering = state.isHovering;
      // Mantener sincronizado el estado de colapso para plantillas y hover-zone
      this.collapseMenu = state.isCollapsed;

      // Aplicar clases CSS correspondientes
      this.updateSidebarClasses();
    });

    // Configurar listener para clicks fuera del sidebar
    this.setupClickOutsideListener();

    // Configurar eventos de hover para auto-collapse
    this.setupAutoCollapseListeners();
  }

  /**
   * Configura la zona de hover para mostrar el sidebar
   */
  private setupHoverZone(): void {
    // Crear zona de hover invisible
    const hoverZone = this.renderer.createElement('div');
    this.renderer.addClass(hoverZone, 'sidebar-hover-zone');
    this.renderer.appendChild(document.body, hoverZone);

    // Listener para mostrar sidebar en hover
    this.hoverZoneListener = this.renderer.listen(hoverZone, 'mouseenter', () => {
      // Forzar expansión temporal visual del header/sidebar cuando está colapsado
      if (this.collapseMenu && !this.isAutoCollapseEnabled && !this.isMobile()) {
        console.log('Hover zone ACTIVATING - calling onMouseEnter()');
        this.onMouseEnter();
      } else {
        // Debug: log para verificar si la condición se cumple
        console.log('Hover zone mouseenter - collapseMenu:', this.collapseMenu, 'isAutoCollapseEnabled:', this.isAutoCollapseEnabled, 'isMobile:', this.isMobile(), 'isTemporarilyExpanded:', this.isTemporarilyExpanded);
      }
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

    // Listener para ocultar sidebar cuando el mouse sale
    this.renderer.listen(hoverZone, 'mouseleave', () => {
      console.log('Hover zone mouseleave - collapseMenu:', this.collapseMenu, 'isTemporarilyExpanded:', this.isTemporarilyExpanded, 'isAutoCollapseEnabled:', this.isAutoCollapseEnabled, 'isMobile:', this.isMobile());
      if (this.collapseMenu && this.isTemporarilyExpanded && !this.isAutoCollapseEnabled && !this.isMobile()) {
        console.log('Hover zone DEACTIVATING - calling onMouseLeave()');
        this.onMouseLeave();
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
    this.renderer.removeClass(sidebarElement, 'auto-collapse-enabled');
    this.renderer.removeClass(sidebarElement, 'auto-collapse-expanded');
    this.renderer.removeClass(sidebarElement, 'temporarily-expanded');

    // Aplicar clases para auto-collapse
    if (this.isAutoCollapseEnabled) {
      this.renderer.addClass(sidebarElement, 'auto-collapse-enabled');

      if (this.isTemporarilyExpanded) {
        this.renderer.addClass(sidebarElement, 'auto-collapse-expanded');
      }
    }
    // Aplicar clases para auto-hide (solo si auto-collapse no está activo)
    else if (this.isAutoHideEnabled) {
      this.renderer.addClass(sidebarElement, 'auto-hide-enabled');

      if (!this.isSidebarVisible) {
        this.renderer.addClass(sidebarElement, 'sidebar-hidden');
      }

      // Funcionalidad de pin eliminada

      if (this.isHovering) {
        this.renderer.addClass(sidebarElement, 'sidebar-hovering');
      }
    }

    // Marcar temporalmente expandido para ajustar el header por CSS
    if (this.collapseMenu && this.isTemporarilyExpanded && !this.isMobile()) {
      this.renderer.addClass(sidebarElement, 'temporarily-expanded');
      document.querySelector('.page-wrapper')?.classList.add('sidebar-temporarily-expanded');
    } else {
      document.querySelector('.page-wrapper')?.classList.remove('sidebar-temporarily-expanded');
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

  /**
   * Método deprecado - Auto-collapse ha sido reemplazado por hover-expand en colapso tradicional
   * @deprecated Usar el botón de flecha con hover-expand
   */
  public toggleAutoCollapse(): void {
    // Función desactivada - redirigir al colapso tradicional
    console.warn('Auto-collapse está deprecado. Use el botón de flecha con hover-expand.');
    this.sidebarToggle();
  }

  /**
   * Configura los listeners para auto-collapse
   */
  private setupAutoCollapseListeners(): void {
    const sidebarElement = this.elementRef.nativeElement.querySelector('.sidebar-container');
    if (!sidebarElement) return;

    // Mouse enter - expandir inmediatamente
    this.renderer.listen(sidebarElement, 'mouseenter', () => {
      if (this.isAutoCollapseEnabled && !this.isTemporarilyExpanded) {
        // Limpiar cualquier timeout de colapso pendiente
        if (this.autoCollapseTimeout) {
          clearTimeout(this.autoCollapseTimeout);
          this.autoCollapseTimeout = null;
        }

        this.isMouseInsideSidebar = true;
        this.layout.setTemporarilyExpanded(true);
      }
    });

    // Mouse leave - colapsar después de un delay
    this.renderer.listen(sidebarElement, 'mouseleave', () => {
      if (this.isAutoCollapseEnabled && this.isTemporarilyExpanded) {
        this.isMouseInsideSidebar = false;

        // Aplicar delay antes de colapsar
        this.autoCollapseTimeout = setTimeout(() => {
          if (!this.isMouseInsideSidebar && this.isAutoCollapseEnabled) {
            this.layout.setTemporarilyExpanded(false);
          }
        }, this.layout.autoCollapseConfig.collapseDelay);
      }
    });
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
