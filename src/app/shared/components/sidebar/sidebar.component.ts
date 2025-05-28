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
    
    // Configurar estado inicial basado en tamaño de pantalla
    if (this.isMobile()) {
      // En móvil: siempre empezar colapsado
      this.collapseMenu = true;
      this.navServices.collapseSidebar = true;
    } else {
      // En desktop: usar estado guardado o expandido por defecto
      const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
      if (sidebarCollapsed) {
        this.collapseMenu = sidebarCollapsed === 'true';
        this.navServices.collapseSidebar = this.collapseMenu;
      } else {
        this.collapseMenu = false;
        this.navServices.collapseSidebar = false;
      }
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
    
    // Pre-cargar iconos comunes (método implementado más abajo)
    // this.preloadIcons();
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
        // En desktop, asegurar que el sidebar esté visible
        if (this.collapseMenu) {
          this.collapseMenu = false;
          this.navServices.collapseSidebar = false;
        }
        // Restablecer estilos del body
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
      } else {
        // En móvil, asegurar que el sidebar esté cerrado por defecto
        if (!this.collapseMenu) {
          this.collapseMenu = true;
          this.navServices.collapseSidebar = true;
        }
      }
    });

    // Añadir click listener al área de swipe
    setTimeout(() => {
      const swipeIndicator = document.querySelector('.sidebar-swipe-indicator');
      if (swipeIndicator) {
        this.renderer.listen(swipeIndicator, 'click', () => {
          if (this.collapseMenu && this.isMobile()) {
            this.sidebarToggle();
          }
        });
      }
    }, 100);
    
    // Configurar listener para el overlay
    setTimeout(() => {
      const overlay = document.querySelector('.sidebar-overlay');
      if (overlay) {
        this.renderer.listen(overlay, 'click', () => {
          if (!this.collapseMenu && this.isMobile()) {
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
    
    // Manejar overflow del body SOLO en móviles
    if (this.isMobile()) {
      if (!this.collapseMenu) {
        // Menú abierto en móvil - prevenir scroll del body
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = '0';
      } else {
        // Menú cerrado - restaurar scroll del body
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
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
    
    // Guardar estado en localStorage para persistencia
    localStorage.setItem('sidebarCollapsed', this.collapseMenu.toString());
    
    // Forzar actualización del DOM
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
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
      'Importar/Exportar': 'fa-exchange'
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
    };

    // Intentar mapear el icono
    let mappedIcon = iconMap[icon.toLowerCase()];
    
    // Si no se encuentra en el mapa, intentar con el nombre original añadiendo fa-
    if (!mappedIcon) {
      mappedIcon = `fa-${icon.toLowerCase()}`;
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
    return window.innerWidth <= 991;
  }

  // Método para manejar clic fuera del sidebar en móviles
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.isMobile() && !this.collapseMenu) {
      const target = event.target as HTMLElement;
      const sidebar = this.elementRef.nativeElement.querySelector('.sidebar-container');
      const toggleBtn = document.querySelector('.sidebar-toggle-btn');
      
      // Verificar que el clic no sea en el sidebar ni en el botón toggle
      if (sidebar && !sidebar.contains(target) && toggleBtn && !toggleBtn.contains(target)) {
        this.sidebarToggle();
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
    const cacheKey = `${iconClass}-${category}`;
    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey)!;
    }

    let optimizedIcon = iconClass;

    // Asegurar que tiene prefijo fa-
    if (!optimizedIcon.startsWith('fa-')) {
      optimizedIcon = `fa-${optimizedIcon}`;
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
      console.warn(`Icon '${iconClass}' not found in FA 4.7.0, using fallback: ${fallbackIcon}`);
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
      'fa-question-circle': 'fa-question-circle'
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
}
