import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Router } from '@angular/router';
import { NavService } from '../../services/nav.service';

interface MenuSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  items: any[];
  badge?: number;
}

@Component({
  selector: 'app-adaptive-navigation',
  templateUrl: './adaptive-navigation.component.html',
  styleUrls: ['./adaptive-navigation.component.scss'],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class AdaptiveNavigationComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  
  // Navigation state
  isMobile = false;
  isTablet = false;
  showSidebar = true;
  
  // Age-adaptive settings
  userAge: 'young' | 'middle' | 'senior' = 'middle'; // Default to middle-aged
  isHighContrast = false;
  reducedMotion = false;

  // Menu Cards Data
  menuSections: MenuSection[] = [];

  // Panel states
  panelState: 'closed' | 'mini' | 'expanded' = 'closed';
  expandedSection: MenuSection | null = null;

  // Touch gesture properties
  private touchStartY = 0;
  private touchCurrentY = 0;
  private isDragging = false;
  private pullThreshold = 50;
  
  constructor(
    public navService: NavService,
    private router: Router
  ) {
    this.detectDeviceType();
    this.detectUserPreferences();
  }

  ngOnInit(): void {
    // Listen to window resize for responsive behavior
    this.updateNavigationVisibility();
    
    // Listen to sidebar toggle from NavService
    this.navService.screenWidth.pipe(
      takeUntil(this.destroy$)
    ).subscribe(width => {
      this.detectDeviceType(width);
      this.updateNavigationVisibility();
    });

    // Watch for sidebar state changes to show mini tab
    this.watchSidebarState();

    // Initialize menu sections from NavService
    this.initializeMenuSections();

    // Ensure mini tab is shown on mobile/tablet devices
    setTimeout(() => {
      if ((this.isMobile || this.isTablet) && this.panelState === 'closed') {
        this.showMiniTab();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.detectDeviceType(event.target.innerWidth);
    this.updateNavigationVisibility();
  }

  private detectDeviceType(width?: number): void {
    const screenWidth = width || window.innerWidth;
    
    this.isMobile = screenWidth < 768;
    this.isTablet = screenWidth >= 768 && screenWidth < 1024;
    
    // Show sidebar on desktop, mini tab on mobile/tablet
    this.showSidebar = screenWidth >= 992;
    
    // Auto-show mini tab on mobile/tablet
    if (screenWidth < 992 && this.panelState === 'closed') {
      setTimeout(() => this.showMiniTab(), 100);
    }
  }

  private detectUserPreferences(): void {
    // Detect user age preference from localStorage or user settings
    const savedAge = localStorage.getItem('userAgeGroup');
    if (savedAge && ['young', 'middle', 'senior'].includes(savedAge)) {
      this.userAge = savedAge as 'young' | 'middle' | 'senior';
    }
    
    // Detect accessibility preferences
    this.isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Apply age-specific CSS custom properties
    this.applyAgeSpecificStyles();
  }

  private applyAgeSpecificStyles(): void {
    const root = document.documentElement;
    
    switch (this.userAge) {
      case 'young':
        root.style.setProperty('--nav-text-size', '11px');
        root.style.setProperty('--nav-icon-size', '20px');
        root.style.setProperty('--nav-padding', '8px');
        root.style.setProperty('--nav-animation-speed', '0.25s');
        break;
        
      case 'middle':
        root.style.setProperty('--nav-text-size', '12px');
        root.style.setProperty('--nav-icon-size', '22px');
        root.style.setProperty('--nav-padding', '10px');
        root.style.setProperty('--nav-animation-speed', '0.3s');
        break;
        
      case 'senior':
        root.style.setProperty('--nav-text-size', '14px');
        root.style.setProperty('--nav-icon-size', '24px');
        root.style.setProperty('--nav-padding', '12px');
        root.style.setProperty('--nav-animation-speed', this.reducedMotion ? '0s' : '0.4s');
        break;
    }

    // Apply high contrast if needed
    if (this.isHighContrast) {
      root.style.setProperty('--nav-contrast-ratio', '4.5');
      root.style.setProperty('--nav-border-width', '2px');
    }
  }

  private updateNavigationVisibility(): void {
    // Update body class for navigation type
    const body = document.body;
    body.classList.toggle('has-sidebar-nav', this.showSidebar);
    body.classList.toggle('mobile-navigation', this.isMobile);
    body.classList.toggle('tablet-navigation', this.isTablet);
    body.classList.toggle('has-mini-tab', this.isMobile || this.isTablet);
    
    // Apply age-specific body classes
    body.classList.remove('nav-young', 'nav-middle', 'nav-senior');
    body.classList.add(`nav-${this.userAge}`);
  }

  // Public method to change age group (for settings or user selection)
  setUserAgeGroup(age: 'young' | 'middle' | 'senior'): void {
    this.userAge = age;
    localStorage.setItem('userAgeGroup', age);
    this.applyAgeSpecificStyles();
    this.updateNavigationVisibility();
  }


  // Initialize menu sections from NavService data
  private initializeMenuSections(): void {
    this.menuSections = [
      {
        id: 'comercial',
        title: 'Gestión Comercial',
        subtitle: 'Ventas y clientes',
        icon: 'fa fa-chart-line',
        color: '#459BD1',
        items: []
      },
      {
        id: 'operaciones',
        title: 'Operaciones',
        subtitle: 'Pedidos y producción',
        icon: 'fa fa-cogs',
        color: '#28a745',
        items: []
      },
      {
        id: 'inventarios',
        title: 'Inventarios',
        subtitle: 'Productos y bodegas',
        icon: 'fa fa-boxes',
        color: '#fd7e14',
        items: []
      },
      {
        id: 'reportes',
        title: 'Reportes',
        subtitle: 'Analytics y KPIs',
        icon: 'fa fa-chart-pie',
        color: '#6f42c1',
        items: []
      },
      {
        id: 'configuracion',
        title: 'Configuración',
        subtitle: 'Empresa y usuarios',
        icon: 'fa fa-cog',
        color: '#6c757d',
        items: []
      }
    ];
  }

  // Watch for sidebar state changes
  private watchSidebarState(): void {
    // Listen to screen width changes and show mini tab on mobile/tablet
    this.navService.screenWidth.pipe(
      takeUntil(this.destroy$)
    ).subscribe((width) => {
      // Auto-show mini tab when switching to mobile/tablet
      if (width < 992 && this.panelState === 'closed') {
        setTimeout(() => this.showMiniTab(), 50);
      } else if (width >= 992 && (this.panelState === 'mini' || this.panelState === 'expanded')) {
        // Close mini tab when switching to desktop
        this.closeMenuCards();
      }
    });
  }

  // Show mini tab (first state)
  private showMiniTab(): void {
    this.panelState = 'mini';
    this.expandedSection = null;
  }

  // Return to mini tab after navigation (keeps tab visible)
  public returnToMiniTab(): void {
    if (this.isMobile || this.isTablet) {
      this.panelState = 'mini';
      this.expandedSection = null;
    } else {
      // On desktop, close completely
      this.closeMenuCards();
    }
  }

  // Expand to full panel with cards
  expandPanel(): void {
    // Force change detection for Safari compatibility
    setTimeout(() => {
      this.panelState = 'expanded';
      this.expandedSection = null;
    }, 0);
  }

  // Close menu cards panel completely
  closeMenuCards(): void {
    this.panelState = 'closed';
    this.expandedSection = null;
    if (this.isMobile || this.isTablet) {
      this.navService.collapseSidebar = true;
    }
  }

  // Open a specific menu section to show sub-options
  openSection(section: MenuSection): void {
    // Force change detection for Safari compatibility
    setTimeout(() => {
      if (this.expandedSection?.id === section.id) {
        // If clicking the same section, collapse it
        this.expandedSection = null;
      } else {
        // Expand the selected section to show sub-options
        this.expandedSection = section;
        this.loadSectionItems(section);
      }
    }, 0);
  }

  // Load real menu items for a section from NavService
  private loadSectionItems(section: MenuSection): void {
    const allMenuItems = this.navService.getMenuItems();
    
    // Map section IDs to menu categories
    const sectionMapping: { [key: string]: string[] } = {
      'comercial': ['Clientes', 'Ventas', 'Dropshipping', 'Flow CRM'],
      'operaciones': ['Pedidos', 'Producción', 'Logística', 'Picking y packing'],
      'inventarios': ['Productos', 'Inventarios', 'Picking y packing'],
      'reportes': ['Indicadores'],
      'configuracion': ['Seguridad', 'Empresa', 'Módulos Variables', 'Inventarios y productos', 'Producto', 'Logística', 'Pagos', 'Integraciones', 'Notificaciones']
    };
    
    const sectionCategories = sectionMapping[section.id] || [];
    const sectionItems: any[] = [];
    
    // Find matching menu items
    allMenuItems.forEach(item => {
      if (item.title && sectionCategories.includes(item.title) && item.children) {
        sectionItems.push(...item.children);
      }
    });
    
    // Update the section with real items
    section.items = sectionItems;
  }

  // Navigate to a specific sub-item
  navigateToItem(item: any): void {
    if (item.path) {
      // Use Angular router for proper SPA navigation
      this.router.navigate([item.path]);
      // Keep mini tab visible on mobile/tablet, close on desktop
      this.returnToMiniTab();
    }
  }

  // Collapse expanded section
  collapseSection(): void {
    this.expandedSection = null;
  }

  // Touch gesture handlers with Safari compatibility
  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
    this.touchCurrentY = this.touchStartY;
    this.isDragging = true;
    
    // Prevent default only if we might need to handle the gesture
    if (this.panelState === 'expanded') {
      event.stopPropagation();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || !event.touches.length) return;
    
    this.touchCurrentY = event.touches[0].clientY;
    const deltaY = this.touchCurrentY - this.touchStartY;
    
    // Only handle downward swipes on expanded panels
    if (deltaY > 0 && this.panelState === 'expanded') {
      event.preventDefault();
      event.stopPropagation();
      // You could add real-time panel movement here
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging) return;
    
    const deltaY = this.touchCurrentY - this.touchStartY;
    
    // If dragged down enough and panel is expanded, return to mini tab
    if (deltaY > this.pullThreshold && this.panelState === 'expanded') {
      event.preventDefault();
      event.stopPropagation();
      this.returnToMiniTab();
    }
    
    this.isDragging = false;
    this.touchStartY = 0;
    this.touchCurrentY = 0;
  }

  // Track by function for ngFor performance
  trackBySection(index: number, section: MenuSection): string {
    return section.id;
  }
}