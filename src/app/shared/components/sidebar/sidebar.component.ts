import { Component, ViewEncapsulation, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Menu, NavService } from '../../services/nav.service';
import { LayoutService } from '../../services/layout.service';
import { environment } from '../../../../environments/environment';
import { SecurityService } from '../../services/security/security.service';
import { CompanyInformation } from '../../models/User/CompanyInformation';
import { PlanSelectorComponent } from '../plan-selector/plan-selector.component';
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
  public menuItems: Menu[];
  public url: any;
  public fileurl: any;
  companyInformation: CompanyInformation

  // For Horizontal Menu
  public margin: any = 0;
  public width: any = window.innerWidth;
  public leftArrowNone: boolean = true;
  public rightArrowNone: boolean = false;
  version = environment.version;

  public isCollapsed: boolean = false;
  public collapseMenu: boolean = false

  constructor(private router: Router, public navServices: NavService,
    public layout: LayoutService,
    private securityService: SecurityService) {
    this.navServices.items.subscribe(menuItems => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // if (user.rol !== 'Super Administrador') {
      //   this.menuItems = menuItems.filter(item => !item.isOnlySuperAdministrador); // Filter Only Administrador 
      // } else {
      this.menuItems = menuItems;
      // }
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          menuItems.filter(items => {
            if (items.path === event.url) {
              this.setNavActive(items);
            }
            if (!items.children) { return false; }
            items.children.filter(subItems => {
              if (subItems.path === event.url) {
                this.setNavActive(subItems);
              }
              if (!subItems.children) { return false; }
              subItems.children.filter(subSubItems => {
                if (subSubItems.path === event.url) {
                  this.setNavActive(subSubItems);
                }
              });
            });
          });
          this.collapseMenu = this.navServices.collapseSidebar
        }
      });
    });
  }


  async ngOnInit(): Promise<void> {
    this.loadPlanFromLocalStorage();
    // const res: any = await JSON.parse(localStorage.getItem(environment.user));
    // this.idUsuario = res.email;

    // this.navServices.collapseSidebar = true || false;
    // this.collapseMenu = true || false;

    this.securityService.getCompanyInformationLogged$().subscribe((companyInformation: CompanyInformation) => {
      if (!companyInformation) {
        companyInformation = this.securityService.getCompanyInformationLogged();
      }
      this.companyInformation = companyInformation;
    });
  }

  private calculateWidth(windowWidth: number): void {
    this.width = windowWidth - 500;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.calculateWidth((event.target as Window).innerWidth);
  }
  openPlanModal() {
    this.showPlanModal = true;
    document.body.style.overflow = 'hidden'; // Bloquear scroll del body
  }

  closePlanModal() {
    this.showPlanModal = false;
    document.body.style.overflow = ''; // Restaurar scroll del body
  }
  // sidebar.component.ts
private loadPlanFromLocalStorage(): void {
  const defaultPlan = {
    type: 'Plan Básico',
    progress: 0,
    renewalDate: 'No definida',
    walletBalance: 0
  };

  try {
    // 1. Obtener el objeto del localStorage
    const currentCompanyStr = sessionStorage.getItem('currentCompany');
    if (!currentCompanyStr) {
      this.currentPlan = defaultPlan;
      return;
    }

    // 2. Parsear y verificar la estructura
    const currentCompany = JSON.parse(currentCompanyStr);
    if (!currentCompany || typeof currentCompany !== 'object') {
      this.currentPlan = defaultPlan;
      return;
    }

    // 3. Extraer específicamente la propiedad plan
    const plan = currentCompany.plan;
    if (!plan || typeof plan !== 'object') {
      this.currentPlan = defaultPlan;
      return;
    }

    // 4. Asignar valores con protecciones
    this.currentPlan = {
      type: this.getPlanName(plan.nombre),
      progress: this.calculatePlanProgress(plan.fechaInicio, plan.fechaFin),
      renewalDate: this.formatRenewalDate(plan.fechaFin, plan.fechaUltimoPago),
      walletBalance: this.calculateWalletBalance(plan.precio)
    };

  } catch (error) {
    console.error('Error loading plan:', error);
    this.currentPlan = defaultPlan;
  }
}

// Helper para nombres de planes
private getPlanName(planName: any): string {
  const validNames = ['Early Adopters', 'Plan Básico', 'Plan Avanzado', 'Plan Empresarial'];
  return typeof planName === 'string' && validNames.includes(planName) 
    ? planName 
    : 'Plan Básico';
}

// Helper para cálculo de progreso
private calculatePlanProgress(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    if (today >= end) return 100;
    if (today <= start) return 0;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = today.getTime() - start.getTime();
    
    return Math.round((elapsedDuration / totalDuration) * 100);
  } catch (e) {
    return 0;
  }
}

// Helper para formatear fecha de renovación
private formatRenewalDate(endDate: any, lastPaymentDate: any): string {
  try {
    const dateToUse = endDate || lastPaymentDate;
    if (!dateToUse) return 'No definida';

    const date = new Date(dateToUse);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'No definida';
  }
}

// Helper para calcular el saldo
private calculateWalletBalance(price: any): number {
  try {
    if (price === '0' || price === 0) return 0;
    const balance = parseFloat(price);
    return isNaN(balance) ? 0 : balance;
  } catch {
    return 0;
  }
}
  onPlanSelected(planId: string) {
    // Actualizar el plan actual
    this.currentPlan.type = this.getPlanName(planId);
    
    // Aquí deberías llamar a tu servicio para guardar el cambio
    // Ejemplo:
    // this.planService.updateUserPlan(planId).subscribe(() => {
    //   this.showSuccessNotification('Plan actualizado correctamente');
    // });
    
    this.closePlanModal();
  }
  
  // private getPlanName(planId: string): string {
  //   const planNames = {
  //     'basico': 'Básico',
  //     'completo': 'Completo',
  //     'empresarial': 'Empresarial'
  //   };
  //   return planNames[planId] || 'Completo';
  // }


  sidebarToggle() {
    // this.navServices.collapseSidebar = !this.navServices.collapseSidebar;
    this.navServices.collapseSidebar = !this.navServices.collapseSidebar;
    this.collapseMenu = this.navServices.collapseSidebar
    // this.navServices.megaMenu = false;
    // this.navServices.levelMenu = false;

    // let country: ICountry = this.manageLocalStorageService.getCurrentCountryActive()

    // const item = {
    //   email: this.idUsuario,
    //   emailAnt: this.idUsuario,
    //   collapsible: this.navServices.collapseSidebar,
    //   settings: '1',
    //   country
    // }

    // await this.service.editUsuario(item).then(res => {

    //   const res2: any = JSON.parse(localStorage.getItem(environment.user));
    //   res2.collapsible = this.navServices.collapseSidebar;

    //   localStorage.setItem(environment.user, JSON.stringify(res2));

    // });
  }

  // Active Nave state
  setNavActive(item) {
    this.menuItems.filter(menuItem => {
      if (menuItem !== item) {
        menuItem.active = false;
      }
      if (menuItem.children && menuItem.children.includes(item)) {
        menuItem.active = true;
      }
      if (menuItem.children) {
        menuItem.children.filter(submenuItems => {
          if (submenuItems.children && submenuItems.children.includes(item)) {
            menuItem.active = true;
            submenuItems.active = true;
          }
        });
      }
      this.collapseMenu = this.navServices.collapseSidebar
    });
  }

  // Click Toggle menu
  toggletNavActive(item) {
    if (!item.active) {
      this.menuItems.forEach(a => {
        if (this.menuItems.includes(item)) {
          a.active = false;
        }
        if (!a.children) { return false; }
        a.children.forEach(b => {
          if (a.children && a.children.includes(item)) {
            b.active = false;
          }
        });
      });
    }
    item.active = !item.active;
  }


  // For Horizontal Menu
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
    if (this.margin <= -3051) {
      this.margin = -3464;
      this.leftArrowNone = false;
      this.rightArrowNone = true;
    } else {
      this.margin += -this.width;
      this.leftArrowNone = false;
    }
  }


}
