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
  private setupMobileGestures(): void {
    // Solo necesitamos registrar eventos tactiles en móviles
    if (window.innerWidth >= 992) {
      return;
    }
    
    // Añadir listeners para eventos táctiles
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    
    // Configurar funcionalidad para overlay
    this.renderer.listen('window', 'resize', () => {
      if (window.innerWidth >= 992) {
        this.collapseMenu = true; // Cerrar menú al redimensionar a escritorio
        document.body.style.overflow = ''; // Restablecer overflow
      }
    });
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
  toggletNavActive(item) {
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
      'Gestión Comercial': 'shopping-cart',
      'Operaciones Internas': 'settings',
      'Logística': 'truck',
      'Inteligencia de Negocios': 'bar-chart-2',
      'Administración Global': 'users',
      'Configuración Plataforma': 'tool'
    };
    return iconMap[sectionTitle] || 'folder';
  }

  // Método para alternar modo compacto
  toggleCompactMode(): void {
    this.isCompactMode = !this.isCompactMode;
    localStorage.setItem('sidebarCompactMode', this.isCompactMode.toString());
    
    if (this.isCompactMode) {
      document.body.classList.add('sidebar-compact-mode');
    } else {
      document.body.classList.remove('sidebar-compact-mode');
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
      return item.title?.toLowerCase().includes(term);
    });
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
}
