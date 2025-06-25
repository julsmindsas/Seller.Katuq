import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { driver, DriveStep, Config } from 'driver.js';

export interface Tour {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: DriveStep[];
  requiredRoute?: string;
  icon?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// Alias para compatibilidad con código existente
export interface TourDefinition extends Tour {}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private driverInstance: any;
  private seenToursKey = 'katuq_completed_tours';

  constructor(
    private router: Router,
    private location: Location
  ) {
    this.initializeDriver();
  }

  private initializeDriver(): void {
    const config: Config = {
      popoverClass: 'driverjs-theme',
      allowClose: true,
      animate: true,
      smoothScroll: true,
      showProgress: true,
      onDestroyed: () => {
        console.log('Tour finalizado');
      },
      onDeselected: () => {
        console.log('Tour deseleccionado');
      },
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Completado! ✓',
      progressText: 'Paso {{current}} de {{total}}',
      
      // Configuración en español
      popoverOffset: 10,
      stagePadding: 4,
      stageRadius: 8
    };

    this.driverInstance = driver(config);
  }

  /**
   * Tours disponibles en el sistema
   */
  public getAvailableTours(): Tour[] {
    return [
      // === TOURS DE BIENVENIDA ===
      {
        id: 'bienvenida',
        name: 'Bienvenida a Katuq',
        description: 'Conoce las funcionalidades principales de tu plataforma de gestión empresarial',
        category: 'welcome',
        icon: 'fa-home',
        difficulty: 'beginner',
        steps: [
          {
            element: '.sidebar-container',
            popover: {
              title: '🏠 Menú Principal',
              description: 'Aquí encontrarás todos los módulos de Katuq. Puedes navegar entre Ventas, Inventarios, Producción y más.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: '.header-wrapper',
            popover: {
              title: '⚙️ Barra Superior',
              description: 'Desde aquí puedes cambiar idioma, ver notificaciones, acceder a tu perfil y cambiar el tema.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '[href="/welcome"]',
            popover: {
              title: '📊 Dashboard',
              description: 'Tu centro de control con métricas importantes y accesos rápidos.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: '[href*="/ventas"]',
            popover: {
              title: '💰 Módulo de Ventas',
              description: 'Gestiona pedidos, clientes y todo lo relacionado con ventas.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: '[href*="/inventario"]',
            popover: {
              title: '📦 Inventarios',
              description: 'Controla tu stock, productos y movimientos de inventario.',
              side: 'right',
              align: 'start'
            }
          }
        ]
      },

      // === TOURS DE VENTAS ===
      {
        id: 'ventas',
        name: 'Tour de Ventas',
        description: 'Aprende a gestionar pedidos y clientes',
        category: 'sales',
        icon: 'fa-shopping-cart',
        difficulty: 'beginner',
        requiredRoute: '/ventas',
        steps: [
          {
            element: '.ventas-dashboard',
            popover: {
              title: '💰 Panel de Ventas',
              description: 'Aquí tienes una vista general de tus ventas, métricas y pedidos recientes.',
              side: 'top',
              align: 'center'
            }
          },
          {
            element: '[href*="/ventas/crear-ventas"]',
            popover: {
              title: '➕ Crear Venta',
              description: 'Crea nuevos pedidos de forma rápida y sencilla.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '[href*="/ventas/pedidos"]',
            popover: {
              title: '📋 Gestión de Pedidos',
              description: 'Visualiza, edita y gestiona todos tus pedidos.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '[href*="/ventas/clientes"]',
            popover: {
              title: '👥 Clientes',
              description: 'Administra tu base de datos de clientes.',
              side: 'bottom',
              align: 'center'
            }
          }
        ]
      },

      // === TOURS DE INVENTARIOS ===
      {
        id: 'inventarios',
        name: 'Tour de Inventarios',
        description: 'Gestiona productos y stock',
        category: 'inventory',
        icon: 'fa-boxes',
        difficulty: 'beginner',
        requiredRoute: '/inventario',
        steps: [
          {
            element: '.inventario-dashboard',
            popover: {
              title: '📦 Panel de Inventarios',
              description: 'Control total de tu inventario con alertas de stock y movimientos.',
              side: 'top',
              align: 'center'
            }
          },
          {
            element: '[href*="/inventario/catalogo"]',
            popover: {
              title: '📚 Catálogo de Productos',
              description: 'Visualiza y gestiona todos tus productos.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '[href*="/inventario/bodegas"]',
            popover: {
              title: '🏪 Bodegas',
              description: 'Administra tus diferentes ubicaciones de almacenamiento.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '[href*="/inventario/movimientos"]',
            popover: {
              title: '📊 Movimientos',
              description: 'Historial detallado de entradas y salidas de inventario.',
              side: 'bottom',
              align: 'center'
            }
          }
        ]
      },

      // === TOURS DE POS ===
      {
        id: 'pos',
        name: 'Tour POS',
        description: 'Punto de venta para tiendas físicas',
        category: 'pos',
        icon: 'fa-cash-register',
        difficulty: 'beginner',
        requiredRoute: '/pos',
        steps: [
          {
            element: '.pos-catalogo',
            popover: {
              title: '🛒 Catálogo POS',
              description: 'Busca y selecciona productos para agregar al carrito de venta.',
              side: 'left',
              align: 'start'
            }
          },
          {
            element: '.pos-carrito',
            popover: {
              title: '🛍️ Carrito de Compras',
              description: 'Revisa los productos seleccionados y ajusta cantidades.',
              side: 'left',
              align: 'start'
            }
          },
          {
            element: '.pos-checkout',
            popover: {
              title: '💳 Checkout',
              description: 'Procesa el pago y finaliza la venta.',
              side: 'top',
              align: 'center'
            }
          }
        ]
      }
    ];
  }

  /**
   * Inicia un tour específico
   */
  public startTour(tourId: string): void {
    const tour = this.getAvailableTours().find(t => t.id === tourId);
    if (!tour) {
      console.error(`Tour con ID ${tourId} no encontrado`);
      return;
    }

    // Si el tour requiere una ruta específica, navegar primero
    if (tour.requiredRoute && !this.location.path().includes(tour.requiredRoute)) {
      this.router.navigate([tour.requiredRoute]).then(() => {
        // Esperar un momento para que la página cargue
        setTimeout(() => {
          this.executeTour(tour);
        }, 500);
      });
    } else {
      this.executeTour(tour);
    }
  }

  /**
   * Ejecuta un tour
   */
  private executeTour(tour: Tour): void {
    // Filtrar steps que existen en el DOM
    const availableSteps = tour.steps.filter(step => {
      if (typeof step.element === 'string') {
        return document.querySelector(step.element) !== null;
      }
      return true;
    });

    if (availableSteps.length === 0) {
      console.warn(`No se encontraron elementos para el tour ${tour.name}`);
      return;
    }

    // Configurar el tour con los steps disponibles
    this.driverInstance.setSteps(availableSteps);
    
    // Marcar tour como completado cuando termine
    this.driverInstance.setConfig({
      ...this.driverInstance.getConfig(),
      onDestroyed: () => {
        this.markTourAsCompleted(tour.id);
        console.log(`Tour ${tour.name} completado`);
      }
    });

    this.driverInstance.drive();
  }

  /**
   * Detiene el tour actual
   */
  public stopCurrentTour(): void {
    if (this.driverInstance) {
      this.driverInstance.destroy();
    }
  }

  /**
   * Verifica si hay un tour activo
   */
  public isActive(): boolean {
    return this.driverInstance && this.driverInstance.isActive();
  }

  /**
   * Obtiene tours disponibles para la ruta actual
   */
  public getToursForCurrentRoute(): Tour[] {
    const currentPath = this.location.path();
    const allTours = this.getAvailableTours();
    
    return allTours.filter(tour => {
      if (!tour.requiredRoute) return true;
      return currentPath.includes(tour.requiredRoute) || currentPath === tour.requiredRoute;
    });
  }

  /**
   * Obtiene todos los tours disponibles
   */
  public getAllTours(): Tour[] {
    return this.getAvailableTours();
  }

  /**
   * Obtiene tours por categoría
   */
  public getToursByCategory(category: string): Tour[] {
    return this.getAvailableTours().filter(tour => tour.category === category);
  }

  /**
   * Marca un tour como completado
   */
  public markTourAsCompleted(tourId: string): void {
    const completedTours = this.getCompletedTours();
    if (!completedTours.includes(tourId)) {
      completedTours.push(tourId);
      localStorage.setItem(this.seenToursKey, JSON.stringify(completedTours));
    }
  }

  /**
   * Obtiene tours completados
   */
  public getCompletedTours(): string[] {
    const stored = localStorage.getItem(this.seenToursKey);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Verifica si un tour fue completado
   */
  public isTourCompleted(tourId: string): boolean {
    return this.getCompletedTours().includes(tourId);
  }

  /**
   * Reinicia todos los tours (para desarrollo)
   */
  public resetSeenTours(): void {
    localStorage.removeItem(this.seenToursKey);
  }

  /**
   * Auto-inicia tour de bienvenida para nuevos usuarios
   */
  public autoStartWelcomeTour(): void {
    const hasSeenWelcome = this.isTourCompleted('bienvenida');
    if (!hasSeenWelcome) {
      // Esperar a que la página cargue completamente
      setTimeout(() => {
        this.startTour('bienvenida');
      }, 2000);
    }
  }

  /**
   * Alias para stopCurrentTour (para compatibilidad)
   */
  public stopTour(): void {
    this.stopCurrentTour();
  }

  /**
   * Marca un tour como visto/completado (alias)
   */
  public markTourAsSeen(tourId: string): void {
    this.markTourAsCompleted(tourId);
  }

  /**
   * Verifica si el usuario ya vio un tour específico (alias)
   */
  public hasSeenTour(tourId: string): boolean {
    return this.isTourCompleted(tourId);
  }
} 