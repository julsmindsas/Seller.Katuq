import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TourService, Tour } from '../../services/tour/tour.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-tour-button',
  templateUrl: './tour-button.component.html',
  styleUrls: ['./tour-button.component.scss']
})
export class TourButtonComponent implements OnInit, OnDestroy {
  public showMenu = false;
  public showTourMenu = false;
  public currentRoute = '';
  public availableTours: Tour[] = [];
  public toursByCategory: { [key: string]: Tour[] } = {};
  public isActive = false;
  public newToursCount = 0;
  private routerSubscription: Subscription = new Subscription();

  // Categorías de tours con sus traducciones y iconos
  public categories = {
    welcome: { name: 'Bienvenida', icon: 'fa-star', color: '#ffd700' },
    configuration: { name: 'Configuración', icon: 'fa-cog', color: '#6c757d' },
    inventory: { name: 'Inventarios', icon: 'fa-boxes', color: '#20c997' },
    sales: { name: 'Ventas', icon: 'fa-shopping-cart', color: '#fd7e14' },
    pos: { name: 'Punto de Venta', icon: 'fa-cash-register', color: '#198754' },
    production: { name: 'Producción', icon: 'fa-industry', color: '#6f42c1' },
    logistics: { name: 'Logística', icon: 'fa-shipping-fast', color: '#0dcaf0' },
    analytics: { name: 'Reportes', icon: 'fa-chart-line', color: '#dc3545' }
  };

  constructor(
    public tourService: TourService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateCurrentRoute();
    this.loadAvailableTours();
    this.subscribeToRouteChanges();
    this.checkActiveState();
    
    // Verificar tours nuevos cada vez que se carga el componente
    this.updateNewToursCount();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private subscribeToRouteChanges(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateCurrentRoute();
        this.loadAvailableTours();
        this.checkActiveState();
        this.updateNewToursCount();
      });
  }

  private updateCurrentRoute(): void {
    this.currentRoute = this.router.url;
  }

  private loadAvailableTours(): void {
    // Obtener tours relevantes para la ruta actual
    this.availableTours = this.tourService.getToursForCurrentRoute();
    
    // Organizar tours por categoría
    this.toursByCategory = {};
    this.availableTours.forEach(tour => {
      if (!this.toursByCategory[tour.category]) {
        this.toursByCategory[tour.category] = [];
      }
      this.toursByCategory[tour.category].push(tour);
    });

    // Ordenar tours dentro de cada categoría por dificultad
    Object.keys(this.toursByCategory).forEach(category => {
      this.toursByCategory[category].sort((a, b) => {
        const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
        return (difficultyOrder[a.difficulty || 'beginner'] || 1) - (difficultyOrder[b.difficulty || 'beginner'] || 1);
      });
    });
  }

  private checkActiveState(): void {
    this.isActive = this.tourService.isActive();
  }

  private updateNewToursCount(): void {
    this.newToursCount = this.availableTours.filter(tour => 
      !this.tourService.isTourCompleted(tour.id)
    ).length;
  }

  /**
   * Alterna la visibilidad del menú
   */
  public toggleMenu(): void {
    if (this.isActive) {
      this.tourService.stopCurrentTour();
      this.isActive = false;
    } else {
      this.showMenu = !this.showMenu;
    }
  }

  /**
   * Alterna la visibilidad del menú de tour
   */
  public toggleTourMenu(): void {
    if (this.tourService.isActive()) {
      this.tourService.stopCurrentTour();
    } else {
      this.showTourMenu = !this.showTourMenu;
    }
  }

  /**
   * Inicia un tour específico
   */
  public startTour(tourId: string): void {
    this.showMenu = false;
    this.tourService.startTour(tourId);
    this.isActive = true;
    
    // Actualizar contador después de un tour
    setTimeout(() => {
      this.updateNewToursCount();
      this.checkActiveState();
    }, 1000);
  }

  /**
   * Obtiene los tours relevantes para mostrar
   */
  public getRelevantTours(): Tour[] {
    return this.availableTours;
  }

  /**
   * Verifica si hay tours nuevos disponibles (para el badge)
   */
  public hasNewTours(): boolean {
    return this.getRelevantTours().some(tour => this.shouldShowNewBadge(tour.id));
  }

  /**
   * Obtiene el número de tours nuevos
   */
  public getNewToursCount(): number {
    return this.getRelevantTours().filter(tour => this.shouldShowNewBadge(tour.id)).length;
  }

  /**
   * Verifica si un tour específico es nuevo
   */
  public isTourNew(tourId: string): boolean {
    return this.shouldShowNewBadge(tourId);
  }

  /**
   * Verifica si un tour específico está completado
   */
  public isTourCompleted(tourId: string): boolean {
    return !this.shouldShowNewBadge(tourId);
  }

  /**
   * Verifica si debe mostrar el badge de "nuevo"
   */
  public shouldShowNewBadge(tourId: string): boolean {
    return !this.tourService.isTourCompleted(tourId);
  }

  /**
   * Obtiene el icono apropiado para un tour
   */
  public getTourIcon(tourId: string): string {
    const tour = this.availableTours.find(t => t.id === tourId);
    return tour?.icon || 'fa-question-circle';
  }

  /**
   * Obtiene el color de dificultad para un tour
   */
  public getDifficultyColor(difficulty?: string): string {
    const colors = {
      'beginner': '#28a745',
      'intermediate': '#ffc107', 
      'advanced': '#dc3545'
    };
    return colors[difficulty || 'beginner'] || colors.beginner;
  }

  /**
   * Obtiene el texto de dificultad
   */
  public getDifficultyText(difficulty?: string): string {
    const texts = {
      'beginner': 'Principiante',
      'intermediate': 'Intermedio',
      'advanced': 'Avanzado'
    };
    return texts[difficulty || 'beginner'] || texts.beginner;
  }

  /**
   * Verifica si una categoría tiene tours disponibles
   */
  public hasCategoryTours(category: string): boolean {
    return this.toursByCategory[category] && this.toursByCategory[category].length > 0;
  }

  /**
   * Obtiene tours de una categoría específica
   */
  public getCategoryTours(category: string): Tour[] {
    return this.toursByCategory[category] || [];
  }

  /**
   * Obtiene todas las categorías que tienen tours
   */
  public getAvailableCategories(): string[] {
    return Object.keys(this.toursByCategory).filter(category => 
      this.hasCategoryTours(category)
    );
  }

  /**
   * Obtiene información de una categoría
   */
  public getCategoryInfo(categoryKey: string) {
    return this.categories[categoryKey] || { 
      name: categoryKey, 
      icon: 'fa-question', 
      color: '#6c757d' 
    };
  }

  /**
   * Obtiene un mensaje dinámico según el contexto
   */
  public getContextMessage(): string {
    if (this.isActive) {
      return 'Tour en progreso... Haz clic para detener';
    }
    
    if (this.availableTours.length === 0) {
      return 'No hay tours disponibles para esta página';
    }
    
    const newCount = this.getNewToursCount();
    if (newCount > 0) {
      return `${newCount} tour${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''} disponible${newCount > 1 ? 's' : ''}`;
    }
    
    return `${this.availableTours.length} tour${this.availableTours.length > 1 ? 's' : ''} disponible${this.availableTours.length > 1 ? 's' : ''}`;
  }

  /**
   * Inicia el tour de bienvenida
   */
  public startWelcomeTour(): void {
    this.startTour('welcome-katuq');
  }

  /**
   * Inicia tours por categoría
   */
  public startCategoryTour(category: string): void {
    const categoryTours = this.getCategoryTours(category);
    if (categoryTours.length > 0) {
      // Iniciar con el primer tour de la categoría (ordenado por dificultad)
      this.startTour(categoryTours[0].id);
    }
  }

  /**
   * Verifica si hay algún tour de bienvenida disponible
   */
  public hasWelcomeTour(): boolean {
    return this.availableTours.some(tour => tour.category === 'welcome');
  }

  /**
   * Cierra el menú al hacer clic fuera
   */
  public closeMenu(): void {
    this.showMenu = false;
    this.showTourMenu = false;
  }

  /**
   * Click fuera del menú
   */
  public onClickOutside(): void {
    this.closeMenu();
  }

  /**
   * Reinicia todos los tours (función de desarrollo)
   */
  public resetAllTours(): void {
    if (confirm('¿Estás seguro de que quieres reiniciar todos los tours? Esta acción no se puede deshacer.')) {
      this.tourService.resetSeenTours();
      location.reload(); // Recargar para reflejar los cambios
    }
  }
} 