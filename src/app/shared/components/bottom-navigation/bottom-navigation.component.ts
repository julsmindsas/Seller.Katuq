import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { NavService } from '../../services/nav.service';
import { HapticFeedbackService } from '../../services/haptic-feedback.service';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  color?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.scss']
})
export class BottomNavigationComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  currentRoute = '';
  
  navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: 'fa fa-home',
      route: '/dashboard',
      color: '#459BD1'
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: 'fa fa-shopping-cart',
      route: '/ventas',
      color: '#28a745'
    },
    {
      id: 'inventario',
      label: 'Productos',
      icon: 'fa fa-boxes',
      route: '/inventario',
      color: '#fd7e14'
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: 'fa fa-chart-line',
      route: '/reportes',
      color: '#6f42c1'
    },
    {
      id: 'mas',
      label: 'Más',
      icon: 'fa fa-ellipsis-h',
      route: '/mas',
      color: '#6c757d'
    }
  ];

  constructor(
    private router: Router,
    private navService: NavService,
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

    this.loadNotificationBadges();
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
                     (item.route === '/dashboard' && this.currentRoute === '/');
    });
  }

  private loadNotificationBadges(): void {
    // Load pending orders for ventas badge
    this.navService.getPendingOrdersCount().pipe(
      takeUntil(this.destroy$)
    ).subscribe(count => {
      const ventasItem = this.navigationItems.find(item => item.id === 'ventas');
      if (ventasItem) {
        ventasItem.badge = count > 0 ? count : undefined;
        this.cdr.detectChanges();
      }
    });

    // Load low stock alerts for inventario badge
    this.navService.getLowStockCount().pipe(
      takeUntil(this.destroy$)
    ).subscribe(count => {
      const inventarioItem = this.navigationItems.find(item => item.id === 'inventario');
      if (inventarioItem) {
        inventarioItem.badge = count > 0 ? count : undefined;
        this.cdr.detectChanges();
      }
    });
  }

  private showMoreOptionsModal(): void {
    this.hapticService.buttonTap();
    
    // Only show mini tab on mobile/tablet, regular sidebar on desktop
    if (window.innerWidth < 992) {
      // Directly call the adaptive navigation method to show mini tab
      if (typeof (window as any).showKatuqMiniTab === 'function') {
        (window as any).showKatuqMiniTab();
      }
    } else {
      this.navService.toggleSidebar(); // Desktop behavior unchanged
    }
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
    if (item.badge) {
      label += `, ${item.badge} notificaciones`;
    }
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