import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { NavService } from '../../services/nav.service';
import { LayoutService } from '../../services/layout.service';
import { HapticFeedbackService } from '../../services/haptic-feedback.service';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  color?: string;
  isActive?: boolean;
  alwaysVisible?: boolean; // se muestra sin importar permisos (Inicio, acceso al menú)
}

@Component({
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.scss']
})
export class BottomNavigationComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  currentRoute = '';
  
  // Lista que se renderiza: derivada de allNavigationItems filtrando por permisos del usuario
  navigationItems: NavigationItem[] = [];

  // Candidatos fijos. Solo se muestran si el usuario tiene la ruta autorizada en su menú,
  // salvo los marcados alwaysVisible (Inicio = home post-login, Menú = abre el drawer ya filtrado).
  private readonly allNavigationItems: NavigationItem[] = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: 'fa fa-home',
      route: '/welcome',
      color: '#a78bfa',
      alwaysVisible: true
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: 'fa fa-shopping-cart',
      route: '/ventas/crear-ventas',
      color: '#28a745'
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      icon: 'fa fa-list-alt',
      route: '/ventas/pedidos',
      color: '#459BD1'
    },
    {
      id: 'productos',
      label: 'Productos',
      icon: 'fa fa-cube',
      route: '/productos',
      color: '#fd7e14'
    },
    {
      id: 'mas',
      label: 'Menú',
      icon: 'fa fa-bars',
      route: '/mas',
      color: '#6c757d',
      alwaysVisible: true
    }
  ];

  constructor(
    private router: Router,
    private navService: NavService,
    private layout: LayoutService,
    private cdr: ChangeDetectorRef,
    private hapticService: HapticFeedbackService
  ) {
    this.updateActiveState();
  }

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
      this.updateActiveState();
      this.cdr.detectChanges();
    });

    // SEGURIDAD DE ROLES: reconstruir los tabs cada vez que el menú autorizado del
    // NavService cambie (al login se filtra por authorizedMenuItems + flags de rol).
    // Es un BehaviorSubject, así que emite el valor actual de inmediato.
    this.navService.items.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.buildAuthorizedItems());
  }

  /**
   * Filtra los tabs candidatos dejando solo los que el usuario tiene autorizados.
   * Usa el menú YA filtrado por NavService (mismos permisos/roles que el sidebar),
   * de modo que el bottom-nav nunca expone accesos que el usuario no puede ver.
   */
  private buildAuthorizedItems(): void {
    const authorized = new Set<string>();
    const collect = (items: any[]): void => {
      (items || []).forEach((it) => {
        if (it && it.path) { authorized.add(this.normalizePath(it.path)); }
        if (it && it.children) { collect(it.children); }
      });
    };
    collect(this.navService.getMenuItems());

    this.navigationItems = this.allNavigationItems.filter(
      (item) => item.alwaysVisible || authorized.has(this.normalizePath(item.route))
    );

    this.updateActiveState();
    this.cdr.detectChanges();
  }

  /** Normaliza rutas para comparar ('/ventas/crear-ventas' ≡ 'ventas/crear-ventas'). */
  private normalizePath(path: string): string {
    return (path || '').replace(/^\/+/, '').toLowerCase();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateTo(item: NavigationItem): void {
    if (item.id === 'mas') {
      this.showMoreOptionsModal();
      return;
    }

    // Haptic feedback for navigation
    this.hapticService.navigationTap();
    this.router.navigate([item.route]);
    
    // Analytics tracking for navigation usage
    this.trackNavigation(item.id);
  }

  private updateActiveState(): void {
    this.navigationItems.forEach(item => {
      if (item.route === '/mas') {
        item.isActive = false;
        return;
      }
      
      item.isActive = this.currentRoute.startsWith(item.route) ||
                     (item.route === '/welcome' && this.currentRoute === '/');
    });
  }

  private showMoreOptionsModal(): void {
    this.hapticService.buttonTap();
    // Abrir el menú completo (sidebar) como drawer deslizable.
    // El sidebar reacciona a layout.sidebarState$; navService sincroniza header/overlay.
    this.layout.updateSidebarState({ isCollapsed: false });
    this.navService.collapseSidebar = false;
  }


  private trackNavigation(itemId: string): void {
    // Analytics tracking
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'bottom_nav_click', {
        'nav_item': itemId,
        'device_type': this.getDeviceType()
      });
    }
  }

  private getDeviceType(): string {
    const width = window.innerWidth;
    if (width < 576) return 'mobile';
    if (width < 768) return 'tablet';
    return 'desktop';
  }

  // Accessibility method for screen readers
  getAriaLabel(item: NavigationItem): string {
    let label = `Navegar a ${item.label}`;
    if (item.isActive) {
      label += ', página actual';
    }
    return label;
  }

  // Method for keyboard navigation
  onKeyDown(event: KeyboardEvent, item: NavigationItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navigateTo(item);
    }
  }

  trackByItemId(index: number, item: NavigationItem): string {
    return item.id;
  }
}