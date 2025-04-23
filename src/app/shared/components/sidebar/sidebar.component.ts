import { Component, ViewEncapsulation, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Menu, NavService } from '../../services/nav.service';
import { LayoutService } from '../../services/layout.service';
import { environment } from '../../../../environments/environment';
import { SecurityService } from '../../services/security/security.service';
import { CompanyInformation } from '../../models/User/CompanyInformation';
// Asegúrate de que PlanSelectorComponent esté importado si aún no lo está
// import { PlanSelectorComponent } from '../plan-selector/plan-selector.component';

// Nueva interfaz para las secciones
interface SidebarSection {
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

  // Nueva propiedad para las secciones colapsables
  public sections: SidebarSection[] = [];

  constructor(
    private router: Router,
    public navServices: NavService,
    public layout: LayoutService,
    private securityService: SecurityService
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

     // Ya procesamos los items en el constructor y aplicamos el estado guardado ahí
     // Si navServices.items emite después de ngOnInit, processMenuItems se llamará de nuevo
     // y aplicará el estado guardado.
  }

  // Nueva función para procesar los items del menú en secciones
  private processMenuItems(menuItems: Menu[]): void {
    const sections: SidebarSection[] = [];
    let currentSection: SidebarSection | null = null;

    menuItems.forEach(item => {
       // Si item es null (puede pasar por el filtrado en NavService), saltarlo
       if (!item) return;

      if (item.headTitle1) {
        // Si la sección anterior existe, es de tipo header y no tiene items, la eliminamos antes de crear la nueva.
        if (currentSection && currentSection.isHeaderSection && currentSection.items.length === 0) {
          sections.pop();
        }
        // Es un encabezado, crea una nueva sección
        currentSection = {
          title: item.headTitle1,
          items: [],
          collapsed: true, // <--- Cambiado a true para que inicien colapsadas
          isHeaderSection: true
        };
        sections.push(currentSection);
      } else if (item.headTitle2) {
        // Ignorar headTitle2 o manejar como necesites. No afecta a currentSection aquí.
      } else {
        // Es un item normal
        if (!currentSection) {
          // Items antes del primer header, crea una sección inicial sin título
          // Esta sección usualmente no será colapsable visualmente, pero mantenemos la consistencia
          currentSection = { title: null, items: [], collapsed: true, isHeaderSection: false }; 
          sections.push(currentSection);
        }
         // Asegurarse de que currentSection no es null antes de añadir items
         // y que el item no es un headTitle (aunque ya filtrado arriba, doble check)
         if (currentSection && !item.headTitle1 && !item.headTitle2) {
             currentSection.items.push(item);
         }
      }
    });

    // Revisar la última sección creada: si es de tipo header y no tiene items, eliminarla.
    if (currentSection && currentSection.isHeaderSection && currentSection.items.length === 0) {
       sections.pop();
    }

    // Recuperar estado colapsado (esta parte sobrescribe el 'true' por defecto si hay estado guardado)
    const savedSectionsState = localStorage.getItem('sidebarSectionsState');
    let collapsedStates: { [title: string]: boolean } = {};
    if (savedSectionsState) {
      try {
        collapsedStates = JSON.parse(savedSectionsState);
      } catch (e) {
        console.error("Error loading sidebar sections state:", e);
        localStorage.removeItem('sidebarSectionsState');
      }
    }
    sections.forEach(section => {
      // Solo sobrescribir si existe un estado guardado para esta sección
      if (section.title && collapsedStates[section.title] !== undefined) {
        section.collapsed = collapsedStates[section.title];
      } 
      // Si no tiene título o no hay estado guardado, se queda con el valor por defecto (true)
    });

    this.sections = sections;
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

  onPlanSelected(planId: string) {
    this.currentPlan.type = this.getPlanName(planId);
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
}
