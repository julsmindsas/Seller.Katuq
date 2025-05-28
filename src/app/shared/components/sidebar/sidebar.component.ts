import { Component, ViewEncapsulation, HostListener, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Menu, NavService } from '../../services/nav.service';
import { LayoutService } from '../../services/layout.service';
import { environment } from '../../../../environments/environment';
import { SecurityService } from '../../services/security/security.service';
import { CompanyInformation } from '../../models/User/CompanyInformation';
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
export class SidebarComponent implements OnInit {
  public showPlanModal: boolean = false;
  public currentPlan: any = {
    type: 'Completo',
    progress: 75,
    renewalDate: '15/08/2025',
    walletBalance: 0
  };
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
  
  // Nuevas propiedades
  public isCompactMode: boolean = false;
  public searchTerm: string = '';
  public searchResults: Menu[] = [];
  public isSearchActive: boolean = false;
  public favoriteItems: Menu[] = [];
  public isSearchFocused: boolean = false;
  
  // Variables para control de gestos en móviles
  private touchStartX: number = 0;
  private touchEndX: number = 0;
  private swipeThreshold: number = 50;
  
  // Nueva propiedad para las secciones colapsables
  public sections: SidebarSection[] = [];

  constructor(
    private router: Router,
    public navServices: NavService,
    public layout: LayoutService,
    private securityService: SecurityService,
    private renderer: Renderer2,
    private elementRef: ElementRef
  ) {
    this.navServices.items.subscribe(menuItems => {
      this.processMenuItems(menuItems); // Procesar items para crear secciones

      // El resto de la lógica de suscripción para activar items se mantiene
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          // Actualizar active state en los items originales o en las secciones
           // Primero, obtenemos los items originales de NavService para limpiarlos
          const originalMenuItems = this.navServices.getMenuItems(); // Asumiendo que NavService tiene un método así o acceso a la lista original
          originalMenuItems.forEach(item => this.clearActiveStatesRecursive(item, null)); // Limpiar estados activos primero en la fuente original

          // Volver a marcar como activo basado en la URL actual
          let activeItemFound = false;
          originalMenuItems.forEach(items => {
            if (activeItemFound) return; // Si ya encontramos el activo, no seguir
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
          // Usamos los items originales actualizados de NavService para reprocesar
          this.processMenuItems(originalMenuItems);
          this.collapseMenu = this.navServices.collapseSidebar;
          
          // En móviles, cerrar el menú después de navegar
          if (window.innerWidth < 992) {
            this.collapseMenu = true;
          }
        }
      });
    });
  }

  ngOnInit(): void {
    this.loadPlanFromLocalStorage();
    this.securityService.getCompanyInformationLogged$().subscribe((companyInformation: CompanyInformation) => {
      if (!companyInformation) {
        companyInformation = this.securityService.getCompanyInformationLogged();
      }
      this.companyInformation = companyInformation;
    });

    const savedState = localStorage.getItem('planCardCollapsed');
    if (savedState) {
      this.isPlanCardCollapsed = savedState === 'true';
    }
    
    // Cargar estado persistente del sidebar
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
    if (sidebarCollapsed) {
      this.collapseMenu = sidebarCollapsed === 'true';
      this.navServices.collapseSidebar = this.collapseMenu;
    }
    
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
    
    // Configurar eventos táctiles para dispositivos móviles
    this.setupMobileGestures();
  }
  
  // Configurar eventos táctiles para móviles
  // Configurar eventos táctiles para dispositivos móviles
  private setupMobileGestures(): void {
    // Añadir listeners para eventos táctiles
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    
    // Configurar funcionalidad para overlay y swipe indicator
    this.renderer.listen('window', 'resize', () => {
      if (window.innerWidth >= 992) {
        this.collapseMenu = true; // Cerrar menú al redimensionar a escritorio
        document.body.style.overflow = ''; // Restablecer overflow
      }
    });

    // Añadir click listener al área de swipe
    setTimeout(() => {
      const swipeIndicator = document.querySelector('.sidebar-swipe-indicator');
      if (swipeIndicator) {
        this.renderer.listen(swipeIndicator, 'click', () => {
          if (this.collapseMenu && window.innerWidth < 992) {
            this.sidebarToggle();
          }
        });
      }
    }, 100);
  }
  
  // Manejar inicio de toque
  private handleTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }
  
  // Manejar fin de toque y detectar deslizamiento
  private handleTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }
  
  // Detectar tipo de deslizamiento y actuar en consecuencia
  private handleSwipe(): void {
    const distance = this.touchEndX - this.touchStartX;
    
    // Si estamos en móvil y el swipe es suficientemente largo
    if (window.innerWidth < 992 && Math.abs(distance) > this.swipeThreshold) {
      if (distance > 0 && this.collapseMenu) {
        // Deslizamiento de izquierda a derecha (abrir menú)
        this.collapseMenu = false;
        document.body.style.overflow = 'hidden'; // Evitar scroll del body
      } else if (distance < 0 && !this.collapseMenu) {
        // Deslizamiento de derecha a izquierda (cerrar menú)
        this.collapseMenu = true;
        document.body.style.overflow = ''; // Restaurar scroll del body
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
    menuItems.forEach(item => {
      // Ignorar items nulos
      if (!item) return;
      
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

  // Nueva función para colapsar/expandir secciones
  toggleSection(section: SidebarSection): void {
    if (section.isHeaderSection) {
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
    this.showPlanModal = true;
    document.body.style.overflow = 'hidden';
  }

  closePlanModal() {
    this.showPlanModal = false;
    document.body.style.overflow = '';
  }

  private loadPlanFromLocalStorage(): void {
    const defaultPlan = { type: 'Plan Básico', progress: 0, renewalDate: 'No definida', walletBalance: 0 };
    try {
      const currentCompanyStr = sessionStorage.getItem('currentCompany');
      if (!currentCompanyStr) { this.currentPlan = defaultPlan; return; }
      const currentCompany = JSON.parse(currentCompanyStr);
      if (!currentCompany || typeof currentCompany !== 'object') { this.currentPlan = defaultPlan; return; }
      const plan = currentCompany.plan;
      if (!plan || typeof plan !== 'object') { this.currentPlan = defaultPlan; return; }
      this.currentPlan = {
        type: this.getPlanName(plan.nombre),
        progress: this.calculatePlanProgress(plan.fechaInicio, plan.fechaFin),
        renewalDate: this.formatRenewalDate(plan.fechaFin, plan.fechaUltimoPago),
        walletBalance: this.calculateWalletBalance(plan.precio)
      };
    } catch (error) { console.error('Error loading plan:', error); this.currentPlan = defaultPlan; }
  }

  private getPlanName(planName: any): string {
    const validNames = ['Early Adopters', 'Plan Básico', 'Plan Avanzado', 'Plan Empresarial'];
    return typeof planName === 'string' && validNames.includes(planName) ? planName : 'Plan Básico';
  }

  private calculatePlanProgress(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    try {
      const start = new Date(startDate); const end = new Date(endDate); const today = new Date();
      if (today >= end) return 100; if (today <= start) return 0;
      const totalDuration = end.getTime() - start.getTime(); const elapsedDuration = today.getTime() - start.getTime();
      return Math.round((elapsedDuration / totalDuration) * 100);
    } catch (e) { return 0; }
  }

  private formatRenewalDate(endDate: any, lastPaymentDate: any): string {
    try {
      const dateToUse = endDate || lastPaymentDate; if (!dateToUse) return 'No definida';
      const date = new Date(dateToUse);
      return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return 'No definida'; }
  }

  private calculateWalletBalance(price: any): number {
    try {
      if (price === '0' || price === 0) return 0;
      const balance = parseFloat(price); return isNaN(balance) ? 0 : balance;
    } catch { return 0; }
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
    this.navServices.collapseSidebar = !this.navServices.collapseSidebar;
    this.collapseMenu = this.navServices.collapseSidebar;
    
    // Cerrar submenú flotante si está abierto
    this.closeCollapsedSubmenu();
    
    // Manejar overflow del body en móviles
    if (window.innerWidth < 992) {
      if (!this.collapseMenu) {
        // Menú abierto en móvil - prevenir scroll del body
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      } else {
        // Menú cerrado - restaurar scroll del body
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      }
    } else {
      // En desktop, asegurar que el body no tenga restricciones
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    // Cerrar búsqueda activa cuando se cierra el sidebar
    if (this.collapseMenu && this.isSearchActive) {
      this.clearSearch();
    }
    
    // En modo compacto, cerrar submenús al colapsar
    if (this.collapseMenu && this.isCompactMode) {
      this.closeAllSubmenus();
    }
    
    // Guardar estado en localStorage para persistencia
    localStorage.setItem('sidebarCollapsed', this.collapseMenu.toString());
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
       currentItem.active = isActive; // Marcar como activo si es el item o un ancestro
       return isActive; // Devolver si este subárbol contiene el item activo
   }


  // Click Toggle menu - Para submenús dentro de items (Funciona sobre item recibido)
  toggletNavActive(item, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    // En estado colapsado para desktop, mostrar submenú flotante
    if (this.collapseMenu && !this.isMobile()) {
      if (item.path && !item.children) {
        // Si es un item sin hijos, navegar directamente
        this.router.navigate([item.path]);
        return;
      }
      // Si tiene hijos, mostrar submenú flotante
      this.showCollapsedSubmenu(item, event);
      return;
    }
    
    // En móviles, manejar con delay para mejor experiencia táctil
    if (this.isMobile() && item.children) {
      this.handleMobileSubmenuToggle(item, event);
      return;
    }

    const currentlyActive = item.active; // Guardar estado actual
    // Si no está activo, cerramos otros menús del mismo nivel o superiores antes de abrir
    if (!currentlyActive) {
       this.sections.forEach(section => {
         section.items.forEach(menuItem => {
           this.resetActiveState(menuItem, item); // Resetear hermanos y tíos, etc.
         });
       });
    }
     item.active = !currentlyActive; // Cambiar estado del item clickeado

     // No necesitamos reprocesar las secciones aquí si solo cambia el 'active' de un submenú
     // Pero si el cambio de active debe reflejarse en this.sections, sí haría falta
     // this.processMenuItems(this.navServices.getMenuItems()); // Descomentar si es necesario
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
      // Secciones principales
      'Gestión Comercial': 'fa-store',
      'Operaciones Internas': 'fa-gears',
      'Logística': 'fa-truck-fast',
      'Inteligencia de Negocios': 'fa-brain',
      'Administración Global': 'fa-users-gear',
      'Configuración Plataforma': 'fa-sliders',
      
      // Módulos específicos
      'Ventas': 'fa-chart-line-up',
      'Inventario': 'fa-warehouse',
      'Reportes': 'fa-chart-column',
      'Usuarios': 'fa-user-group',
      'Configuración': 'fa-gear',
      'Finanzas': 'fa-hand-holding-dollar',
      'Marketing': 'fa-bullhorn',
      'Soporte': 'fa-headset',
      'Análisis': 'fa-magnifying-glass-chart',
      'Productos': 'fa-cubes',
      'Clientes': 'fa-handshake',
      'Facturación': 'fa-file-invoice-dollar',
      'Compras': 'fa-cart-shopping',
      'Contabilidad': 'fa-calculator',
      'Recursos Humanos': 'fa-people-group',
      'Calidad': 'fa-award',
      'Seguridad': 'fa-shield-halved',
      'Comunicaciones': 'fa-comments',
      'Herramientas': 'fa-toolbox',
      'Integraciones': 'fa-puzzle-piece',
      'API': 'fa-code',
      'Notificaciones': 'fa-bell',
      'Alertas': 'fa-triangle-exclamation',
      'Estadísticas': 'fa-chart-simple',
      'Dashboard': 'fa-chart-pie',
      'Panel Control': 'fa-gauge-high',
      'Monitoreo': 'fa-desktop',
      'Auditoría': 'fa-magnifying-glass',
      'Backup': 'fa-cloud-arrow-up',
      'Importar/Exportar': 'fa-right-left'
    };
    return iconMap[sectionTitle] || 'fa-folder-open';
  }

  // Método inteligente para obtener iconos de menú con mapeo exhaustivo
  getMenuIcon(icon: string | undefined, title?: string, isSubmenu: boolean = false): string {
    // Si no hay icono, intentar inferir del título
    if (!icon && title) {
      icon = this.inferIconFromTitle(title);
    }
    
    if (!icon) {
      return isSubmenu ? 'fa-circle-dot' : 'fa-circle';
    }

    // Si ya tiene el prefijo fa-, devolverlo tal como está
    if (icon.startsWith('fa-')) {
      return icon;
    }

    // Mapeo exhaustivo de iconos con FontAwesome 6
    const iconMap: { [key: string]: string } = {
      // === COMERCIAL Y VENTAS ===
      'shopping-cart': 'fa-cart-shopping',
      'cart': 'fa-cart-shopping',
      'store': 'fa-store',
      'shop': 'fa-store',
      'receipt': 'fa-receipt',
      'cash-register': 'fa-cash-register',
      'credit-card': 'fa-credit-card',
      'payment': 'fa-credit-card',
      'dollar-sign': 'fa-dollar-sign',
      'euro-sign': 'fa-euro-sign',
      'peso': 'fa-dollar-sign',
      'money': 'fa-money-bill-wave',
      'coins': 'fa-coins',
      'wallet': 'fa-wallet',
      'pos': 'fa-cash-register',
      'sale': 'fa-tags',
      'discount': 'fa-percent',
      'price': 'fa-tag',
      'invoice': 'fa-file-invoice-dollar',
      'billing': 'fa-file-invoice',
      'quotation': 'fa-file-contract',
      'order': 'fa-clipboard-list',
      'purchase': 'fa-cart-shopping',
      'sell': 'fa-handshake',
      
      // === USUARIOS Y PERSONAS ===
      'user': 'fa-user',
      'users': 'fa-users',
      'user-tie': 'fa-user-tie',
      'user-cog': 'fa-user-gear',
      'user-friends': 'fa-user-group',
      'user-shield': 'fa-user-shield',
      'customer': 'fa-user-tie',
      'client': 'fa-handshake',
      'supplier': 'fa-truck-field',
      'employee': 'fa-id-badge',
      'team': 'fa-people-group',
      'profile': 'fa-address-card',
      'contact': 'fa-address-book',
      'permission': 'fa-key',
      'role': 'fa-user-tag',
      'group': 'fa-users',
      'organization': 'fa-sitemap',
      
      // === INVENTARIO Y PRODUCTOS ===
      'box': 'fa-box',
      'boxes': 'fa-boxes-stacked',
      'cube': 'fa-cube',
      'cubes': 'fa-cubes',
      'warehouse': 'fa-warehouse',
      'inventory': 'fa-warehouse',
      'stock': 'fa-boxes-stacked',
      'product': 'fa-cube',
      'category': 'fa-layer-group',
      'barcode': 'fa-barcode',
      'qrcode': 'fa-qrcode',
      'package': 'fa-box-open',
      'shipment': 'fa-truck-fast',
      'delivery': 'fa-truck-fast',
      'pickup': 'fa-hand-holding-box',
      'transfer': 'fa-arrow-right-arrow-left',
      'movement': 'fa-arrows-turn-to-dots',
      'catalog': 'fa-book',
      
      // === REPORTES Y ANÁLISIS ===
      'chart-bar': 'fa-chart-column',
      'chart-line': 'fa-chart-line',
      'chart-pie': 'fa-chart-pie',
      'analytics': 'fa-magnifying-glass-chart',
      'graph': 'fa-chart-area',
      'trending-up': 'fa-arrow-trend-up',
      'trending-down': 'fa-arrow-trend-down',
      'statistics': 'fa-chart-simple',
      'metrics': 'fa-gauge-high',
      'dashboard': 'fa-gauge',
      'kpi': 'fa-bullseye',
      'performance': 'fa-chart-line-up',
      'insights': 'fa-lightbulb',
      'business-intelligence': 'fa-brain',
      'report': 'fa-file-chart-column',
      
      // === DOCUMENTOS Y ARCHIVOS ===
      'file': 'fa-file',
      'document': 'fa-file-lines',
      'file-invoice': 'fa-file-invoice',
      'file-invoice-dollar': 'fa-file-invoice-dollar',
      'file-pdf': 'fa-file-pdf',
      'file-excel': 'fa-file-excel',
      'file-word': 'fa-file-word',
      'file-image': 'fa-file-image',
      'file-video': 'fa-file-video',
      'clipboard': 'fa-clipboard',
      'clipboard-list': 'fa-clipboard-list',
      'note': 'fa-note-sticky',
      'contract': 'fa-file-contract',
      'certificate': 'fa-certificate',
      'archive': 'fa-file-zipper',
      'folder': 'fa-folder',
      'folder-open': 'fa-folder-open',
      
      // === CONFIGURACIÓN Y SISTEMA ===
      'cog': 'fa-gear',
      'cogs': 'fa-gears',
      'settings': 'fa-gears',
      'config': 'fa-sliders',
      'tools': 'fa-toolbox',
      'wrench': 'fa-wrench',
      'preferences': 'fa-toggle-on',
      'customize': 'fa-palette',
      'system': 'fa-microchip',
      'server': 'fa-server',
      'database': 'fa-database',
      'api': 'fa-code',
      'integration': 'fa-puzzle-piece',
      'plugin': 'fa-plug',
      
      // === NAVEGACIÓN Y UI ===
      'home': 'fa-house',
      'menu': 'fa-bars',
      'list': 'fa-list',
      'grid': 'fa-table-cells',
      'bookmark': 'fa-bookmark',
      'star': 'fa-star',
      'favorite': 'fa-heart',
      'pin': 'fa-thumbtack',
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
      'message': 'fa-message',
      'notification': 'fa-bell',
      'announcement': 'fa-bullhorn',
      'news': 'fa-newspaper',
      'broadcast': 'fa-broadcast-tower',
      'support': 'fa-headset',
      
      // === LOGÍSTICA Y TRANSPORTE ===
      'truck': 'fa-truck',
      'shipping': 'fa-truck-fast',
      'plane': 'fa-plane',
      'train': 'fa-train',
      'ship': 'fa-ship',
      'map': 'fa-map',
      'route': 'fa-route',
      'location': 'fa-location-dot',
      'gps': 'fa-location-crosshairs',
      'tracking': 'fa-location-arrow',
      'logistics': 'fa-truck-field',
      
      // === ESTADOS Y ALERTAS ===
      'check': 'fa-check',
      'success': 'fa-check-circle',
      'times': 'fa-xmark',
      'error': 'fa-circle-xmark',
      'exclamation': 'fa-triangle-exclamation',
      'warning': 'fa-triangle-exclamation',
      'info': 'fa-circle-info',
      'question': 'fa-circle-question',
      'help': 'fa-circle-question',
      'alert': 'fa-exclamation',
      'pending': 'fa-clock',
      'processing': 'fa-spinner',
      'completed': 'fa-check-double',
      'status': 'fa-circle-dot',
      
      // === ACCIONES ===
      'plus': 'fa-plus',
      'add': 'fa-plus',
      'create': 'fa-plus',
      'new': 'fa-plus',
      'minus': 'fa-minus',
      'remove': 'fa-minus',
      'edit': 'fa-pen-to-square',
      'modify': 'fa-pen-to-square',
      'update': 'fa-pen-to-square',
      'delete': 'fa-trash',
      'trash': 'fa-trash-can',
      'save': 'fa-floppy-disk',
      'download': 'fa-download',
      'upload': 'fa-upload',
      'import': 'fa-file-import',
      'export': 'fa-file-export',
      'print': 'fa-print',
      'copy': 'fa-copy',
      'duplicate': 'fa-copy',
      'move': 'fa-arrows-up-down-left-right',
      'sync': 'fa-arrows-rotate',
      'refresh': 'fa-rotate',
      'reload': 'fa-arrow-rotate-right',
      
      // === BÚSQUEDA Y FILTROS ===
      'search': 'fa-magnifying-glass',
      'find': 'fa-magnifying-glass',
      'filter': 'fa-filter',
      'sort': 'fa-arrow-up-z-a',
      'sort-asc': 'fa-arrow-up-1-9',
      'sort-desc': 'fa-arrow-down-9-1',
      'view': 'fa-eye',
      'hide': 'fa-eye-slash',
      'show': 'fa-eye',
      
      // === TIEMPO Y CALENDARIO ===
      'calendar': 'fa-calendar-days',
      'date': 'fa-calendar-day',
      'time': 'fa-clock',
      'schedule': 'fa-calendar-check',
      'appointment': 'fa-calendar-plus',
      'event': 'fa-calendar-week',
      'deadline': 'fa-hourglass-end',
      'timer': 'fa-stopwatch',
      'history': 'fa-clock-rotate-left',
      
      // === EMPRESARIAL Y NEGOCIOS ===
      'building': 'fa-building',
      'company': 'fa-building',
      'office': 'fa-building-user',
      'industry': 'fa-industry',
      'factory': 'fa-industry',
      'handshake': 'fa-handshake',
      'deal': 'fa-handshake',
      'partnership': 'fa-handshake-simple',
      'briefcase': 'fa-briefcase',
      'business': 'fa-briefcase',
      'calculator': 'fa-calculator',
      'accounting': 'fa-calculator',
      'finance': 'fa-hand-holding-dollar',
      'budget': 'fa-money-bill-trend-up',
      'investment': 'fa-chart-line-up',
      'profit': 'fa-arrow-trend-up',
      'loss': 'fa-arrow-trend-down',
      
      // === CALIDAD Y CERTIFICACIONES ===
      'quality': 'fa-award',
      'medal': 'fa-medal',
      'trophy': 'fa-trophy',
      'badge': 'fa-badge',
      'verification': 'fa-badge-check',
      'approval': 'fa-stamp',
      'signature': 'fa-signature',
      
      // === SEGURIDAD ===
      'security': 'fa-shield-halved',
      'shield': 'fa-shield',
      'lock': 'fa-lock',
      'unlock': 'fa-unlock',
      'key': 'fa-key',
      'password': 'fa-key',
      'encryption': 'fa-user-secret',
      'privacy': 'fa-user-shield',
      'backup': 'fa-cloud-arrow-up',
      'restore': 'fa-cloud-arrow-down',
      
      // === TECNOLOGÍA ===
      'computer': 'fa-computer',
      'laptop': 'fa-laptop',
      'mobile': 'fa-mobile-screen-button',
      'tablet': 'fa-tablet-screen-button',
      'wifi': 'fa-wifi',
      'bluetooth': 'fa-bluetooth',
      'usb': 'fa-usb',
      'cloud': 'fa-cloud',
      'network': 'fa-network-wired',
      'internet': 'fa-globe',
      
      // === GENÉRICOS MEJORADOS ===
      'circle': 'fa-circle',
      'dot': 'fa-circle-dot',
      'point': 'fa-location-dot',
      'marker': 'fa-map-pin',
      'flag': 'fa-flag',
      'tag': 'fa-tag',
      'label': 'fa-tag',
      'external-link': 'fa-arrow-up-right-from-square',
      'link-external': 'fa-arrow-up-right-from-square',
      'window': 'fa-window-restore',
      'tab': 'fa-window-maximize'
    };

    // Intentar mapear el icono
    let mappedIcon = iconMap[icon.toLowerCase()];
    
    // Si no se encuentra en el mapa, intentar con el nombre original añadiendo fa-
    if (!mappedIcon) {
      mappedIcon = `fa-${icon.toLowerCase()}`;
    }
    
    // Si aún no es válido, usar icono por defecto más moderno
    return mappedIcon || (isSubmenu ? 'fa-circle-dot' : 'fa-circle');
  }

  // Método para obtener icono contextual inteligente
  private getContextualIcon(title: string, position: number, hasSubmenu: boolean): string {
    const titleLower = title.toLowerCase();
    
    // Iconos específicos por posición (primeros items suelen ser más importantes)
    if (position === 0) {
      if (titleLower.includes('inicio') || titleLower.includes('dashboard')) return 'fa-house';
      if (titleLower.includes('principal')) return 'fa-star';
    }
    
    // Iconos para items con submenús (más elaborados)
    if (hasSubmenu) {
      if (titleLower.includes('venta')) return 'fa-store';
      if (titleLower.includes('inventario')) return 'fa-warehouse';
      if (titleLower.includes('reporte')) return 'fa-chart-line';
      if (titleLower.includes('usuario')) return 'fa-users-gear';
      if (titleLower.includes('config')) return 'fa-gears';
    }
    
    // Usar el método de inferencia estándar como fallback
    return this.inferIconFromTitle(title);
  }

  // Método para inferir iconos basado en el título del menú
  private inferIconFromTitle(title: string): string {
    const titleLower = title.toLowerCase();
    
    // Patrones de títulos comunes y sus iconos
    const titlePatterns: { [key: string]: string } = {
      // Dashboard y home
      'inicio': 'home',
      'dashboard': 'dashboard',
      'panel': 'gauge',
      'escritorio': 'desktop',
      
      // Ventas y comercial
      'venta': 'cart-shopping',
      'ventas': 'chart-line-up',
      'factura': 'file-invoice-dollar',
      'cotiza': 'file-contract',
      'pedido': 'clipboard-list',
      'orden': 'clipboard-list',
      'cliente': 'user-tie',
      'prospecto': 'user-plus',
      
      // Inventario
      'producto': 'cube',
      'inventario': 'warehouse',
      'stock': 'boxes-stacked',
      'categoria': 'layer-group',
      'almacén': 'warehouse',
      'bodega': 'warehouse',
      
      // Finanzas
      'finanza': 'hand-holding-dollar',
      'contab': 'calculator',
      'pago': 'credit-card',
      'cobro': 'money-bill-wave',
      'gasto': 'money-bill-trend-down',
      'ingreso': 'money-bill-trend-up',
      'presupuesto': 'calculator',
      
      // Reportes
      'reporte': 'chart-column',
      'estadística': 'chart-simple',
      'análisis': 'magnifying-glass-chart',
      'gráfico': 'chart-pie',
      'métrica': 'gauge-high',
      
      // Usuarios y administración
      'usuario': 'user',
      'empleado': 'id-badge',
      'equipo': 'people-group',
      'rol': 'user-tag',
      'permiso': 'key',
      'configuración': 'gear',
      'ajuste': 'sliders',
      
      // Logística
      'envío': 'truck-fast',
      'entrega': 'truck-fast',
      'transporte': 'truck',
      'ruta': 'route',
      'ubicación': 'location-dot',
      
      // Comunicación
      'mensaje': 'message',
      'notificación': 'bell',
      'correo': 'envelope',
      'chat': 'comments',
      'soporte': 'headset',
      
      // Documentos
      'documento': 'file-lines',
      'archivo': 'file',
      'carpeta': 'folder',
      'pdf': 'file-pdf',
      'excel': 'file-excel',
      'word': 'file-word',
      
      // Procesos
      'proceso': 'gears',
      'flujo': 'arrows-rotate',
      'tarea': 'list-check',
      'actividad': 'clock',
      'historial': 'clock-rotate-left',
      
      // Calidad y control
      'calidad': 'award',
      'auditoría': 'magnifying-glass',
      'control': 'shield-halved',
      'seguridad': 'lock',
      'backup': 'cloud-arrow-up',
      
      // Herramientas
      'herramienta': 'toolbox',
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
    return 'circle-dot';
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
    this.isSearchActive = this.searchTerm.length > 0;
    
    if (!this.isSearchActive) {
      this.searchResults = [];
      return;
    }
    
    const term = this.searchTerm.toLowerCase();
    this.searchResults = this.getAllMenuItems().filter(item => {
      // Buscar tanto en el título como en posibles palabras clave
      const titleMatch = item.title?.toLowerCase().includes(term);
      const pathMatch = item.path?.toLowerCase().includes(term);
      return titleMatch || pathMatch;
    }).slice(0, 8); // Limitar a 8 resultados para mejor performance
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
      } catch(e) {
        console.error('Error loading favorite items:', e);
        this.favoriteItems = [];
      }
    }
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
    if (this.isMobile() && !this.collapseMenu) {
      const target = event.target as HTMLElement;
      const sidebar = this.elementRef.nativeElement.querySelector('.sidebar-container');
      
      if (sidebar && !sidebar.contains(target)) {
        this.collapseMenu = true;
        this.navServices.collapseSidebar = true;
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
    this.renderer.setStyle(submenuElement, 'left', `${rect.right + 12}px`);
    this.renderer.setStyle(submenuElement, 'top', `${topPosition}px`);
    this.renderer.setStyle(submenuElement, 'z-index', '1200');
    this.renderer.setStyle(submenuElement, 'max-height', `${viewportHeight - topPosition - 32}px`);
    this.renderer.setStyle(submenuElement, 'overflow-y', 'auto');
    
    // Crear contenido del submenú con diseño mejorado
    item.children.forEach((childItem, index) => {
      const itemElement = this.renderer.createElement('a');
      
      if (childItem.type === 'link') {
        this.renderer.setAttribute(itemElement, 'href', childItem.path || '#');
        this.renderer.listen(itemElement, 'click', (e) => {
          e.preventDefault();
          if (childItem.path) {
            this.router.navigate([childItem.path]);
            this.closeCollapsedSubmenu();
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
      this.renderer.setStyle(itemElement, 'animation-delay', `${index * 0.05}s`);
      
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
}
