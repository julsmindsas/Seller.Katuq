import { Injectable } from '@angular/core';
import { driver, Driver } from 'driver.js';
import { Router } from '@angular/router';

export interface TourStep {
  element: string;
  title: string;
  description: string;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface TourConfig {
  steps: TourStep[];
  onStart?: () => void;
  onComplete?: () => void;
  onDestroy?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private driverInstance: Driver | null = null;
  private currentTour: string | null = null;

  constructor(private router: Router) {}

  private getDriverConfig() {
    return {
      showProgress: true,
      progressText: '🎯 Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente ➡️',
      prevBtnText: '⬅️ Anterior', 
      doneBtnText: '✅ ¡Listo!',
      closeBtnText: '✕',
      stagePadding: 8,
      stageRadius: 12,
      allowClose: true,
      overlayClickNext: false,
      smoothScroll: true,
      animate: true,
      popoverClass: 'driverjs-theme katuq-tour'
    };
  }

  private addClickFeedback(): void {
    const popover = document.querySelector('.driver-popover');
    if (popover) {
      popover.classList.add('tour-click-feedback');
      setTimeout(() => {
        popover.classList.remove('tour-click-feedback');
      }, 200);
    }
  }

  private showCompletionMessage(): void {
    // Show completion message using a simple div or SweetAlert if available
    if (typeof (window as any).Swal !== 'undefined') {
      (window as any).Swal.fire({
        title: '🎉 ¡Tour Completado!',
        text: '¡Excelente! Has completado el tour. Ya conoces las principales funcionalidades.',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  }

  startTour(tourName: string, config: TourConfig) {
    if (this.currentTour) {
      this.destroyTour();
    }

    if (this.hasCompletedTour(tourName)) {
      console.log(`✓ Tour ${tourName} ya completado, no se mostrará de nuevo.`);
      return;
    }

    this.currentTour = tourName;
    
    try {
      // Verificar que los elementos existan antes de iniciar el tour
      const validSteps = config.steps.filter(step => {
        // Handle multiple selectors separated by comma
        const selectors = step.element.split(',').map(s => s.trim());
        let element = null;
        let foundSelector = '';
        
        for (const selector of selectors) {
          element = document.querySelector(selector);
          if (element) {
            foundSelector = selector;
            break;
          }
        }
        
        if (!element) {
          console.warn(`Ningún elemento encontrado para tour con selectores: ${step.element}`);
          return false;
        }
        
        console.log(`✓ Elemento encontrado: ${foundSelector}`);
        // Update step element to use the found selector
        step.element = foundSelector;
        return true;
      });

      if (validSteps.length === 0) {
        console.warn('No se encontraron elementos válidos para el tour');
        this.showBasicTourInfo(tourName, config);
        return;
      }

      // Configuración simplificada para evitar problemas con los botones
      this.driverInstance = driver({
        showProgress: true,
        progressText: 'Paso {{current}} de {{total}}',
        nextBtnText: 'Siguiente ➡️',
        prevBtnText: '⬅️ Anterior',
        doneBtnText: '✅ Finalizar',
        allowClose: true,
        animate: true,
        smoothScroll: true,
        stagePadding: 8,
        stageRadius: 12,
        popoverClass: 'driverjs-theme katuq-tour',
        steps: validSteps.map(step => ({
          element: step.element,
          popover: {
            title: step.title,
            description: step.description,
            side: 'left',
            align: 'start'
          }
        })),
        onDestroyed: () => {
          console.log(`Tour ${tourName} finalizado`);
          this.markTourAsCompleted(tourName);
          this.currentTour = null;
          this.showCompletionMessage();
        }
      });

      console.log(`Iniciando tour ${tourName} con ${validSteps.length} pasos válidos`);
      this.driverInstance.drive();
      
    } catch (error) {
      console.error('Error iniciando tour:', error);
      this.showBasicTourInfo(tourName, config);
      this.currentTour = null;
    }
  }

  private showBasicTourInfo(tourName: string, config: TourConfig) {
    let message = `🧭 Tour de ${tourName}\n\n`;
    config.steps.forEach((step, index) => {
      message += `${index + 1}. ${step.title}\n${step.description}\n\n`;
    });
    
    alert(message);
    this.markTourAsCompleted(tourName);
  }

  destroyTour() {
    if (this.driverInstance) {
      this.driverInstance.destroy();
      this.driverInstance = null;
      this.currentTour = null;
    }
  }

  highlightElement(element: string, title: string, description: string) {
    const highlightDriver = driver(this.getDriverConfig());
    highlightDriver.highlight({
      element,
      popover: {
        title,
        description
      }
    });
  }

  private hasCompletedTour(tourName: string): boolean {
    const completedTours = JSON.parse(localStorage.getItem('katuq_completed_tours') || '[]');
    return completedTours.includes(tourName);
  }

  private markTourAsCompleted(tourName: string) {
    const completedTours = JSON.parse(localStorage.getItem('katuq_completed_tours') || '[]');
    if (!completedTours.includes(tourName)) {
      completedTours.push(tourName);
      localStorage.setItem('katuq_completed_tours', JSON.stringify(completedTours));
    }
  }

  resetTours() {
    localStorage.removeItem('katuq_completed_tours');
  }

  getDashboardTour(): TourConfig {
    return {
      steps: [
        {
          element: '[data-tour="welcome"]',
          title: '¡Bienvenido a Katuq Seller!',
          description: 'Este es tu panel principal donde puedes ver el resumen de tu negocio.'
        },
        {
          element: '[data-tour="stats-cards"]',
          title: 'Métricas Principales',
          description: 'Aquí puedes ver las estadísticas más importantes: ventas, pedidos, productos y clientes.'
        },
        {
          element: '[data-tour="chart-ventas"]',
          title: 'Gráfico de Ventas',
          description: 'Este gráfico muestra la evolución de tus ventas en el tiempo.'
        },
        {
          element: '[data-tour="top-productos"]',
          title: 'Productos Más Vendidos',
          description: 'Aquí puedes ver cuáles son tus productos estrella.'
        },
        {
          element: '[data-tour="pedidos-recientes"]',
          title: 'Pedidos Recientes',
          description: 'Lista de los pedidos más recientes con acceso rápido a su gestión.'
        }
      ],
      onComplete: () => {
        console.log('Dashboard tour completed');
      }
    };
  }

  getMainNavigationTour(): TourConfig {
    return {
      steps: [
        {
          element: 'body',
          title: '🧭 Bienvenido a Katuq Seller',
          description: '¡Te damos la bienvenida! Te vamos a mostrar cómo navegar por el sistema para que puedas acceder a todas las funcionalidades.'
        },
        {
          element: '.sidebar-container, aside, .sidebar',
          title: '📍 Menú Lateral de Navegación',
          description: 'Este es tu menú principal. Aquí encontrarás todos los módulos: Dashboard, Ventas, Inventarios, Producción, Despachos y POS. Cada sección se despliega al hacer clic.'
        },
        {
          element: '.main-header, .page-header, header',
          title: '🔍 Barra Superior',
          description: 'En la parte superior tienes el nombre de la empresa, notificaciones, configuraciones y tu perfil de usuario.'
        },
        {
          element: 'main, .content-wrapper, .main-content',
          title: '📋 Área de Trabajo Principal',
          description: 'Aquí aparece el contenido de cada módulo que selecciones del menú lateral. Es tu espacio de trabajo principal.'
        },
        {
          element: '.sidebar-container, aside, .sidebar',
          title: '✨ ¡Explora y Navega!',
          description: 'Para navegar: haz clic en cualquier sección del menú (ej: Ventas) y luego selecciona la opción específica (ej: Crear Ventas, Pedidos, Clientes). ¡Inicia tu exploración!'
        }
      ],
      onComplete: () => {
        console.log('Main navigation tour completed');
      }
    };
  }

  getVentasTour(): TourConfig {
    return {
      steps: [
        {
          element: '.sidebar-container',
          title: '🛒 Accediendo al Módulo de Ventas',
          description: 'Para navegar a Ventas, busca la sección "Ventas" en el menú lateral.'
        },
        {
          element: '[data-tour="crear-venta"]',
          title: 'Crear Nueva Venta',
          description: 'Desde el menú: Ventas → Crear Ventas. Aquí puedes crear pedidos paso a paso.'
        },
        {
          element: '[data-tour="pedidos-list"]',
          title: 'Gestionar Pedidos',
          description: 'Desde el menú: Ventas → Pedidos. Aquí ves todos los pedidos y su estado.'
        },
        {
          element: '[data-tour="clientes"]',
          title: 'Base de Datos de Clientes',
          description: 'Desde el menú: Ventas → Clientes. Administra toda tu información de clientes.'
        },
        {
          element: '[data-tour="pos"]',
          title: 'Punto de Venta (POS)',
          description: 'Desde el menú: Ventas → POS. Sistema de ventas rápidas para mostrador.'
        }
      ],
      onComplete: () => {
        console.log('Ventas tour completed');
      }
    };
  }

  getInventarioTour(): TourConfig {
    return {
      steps: [
        {
          element: '.sidebar-container',
          title: '📦 Navegando a Inventarios',
          description: 'Para acceder a Inventarios, busca la sección "Inventarios" en el menú lateral.'
        },
        {
          element: '[data-tour="productos-grid"]',
          title: 'Catálogo de Productos',
          description: 'Desde el menú: Inventarios → Productos. Aquí ves todos tus productos con stock y precios.'
        },
        {
          element: '[data-tour="nuevo-producto"]',
          title: 'Crear Productos',
          description: 'Desde el menú: Inventarios → Crear Producto. Agrega nuevos productos al catálogo.'
        },
        {
          element: '[data-tour="search-productos"]',
          title: 'Búsqueda de Productos',
          description: 'Desde el menú: Inventarios → Buscar Productos. Encuentra productos específicos rápidamente.'
        },
        {
          element: '.sidebar-container',
          title: '🔄 Otros Módulos de Inventario',
          description: 'También tienes: Categorías, Movimientos, Alertas de Stock. ¡Explora el menú Inventarios!'
        }
      ],
      onComplete: () => {
        console.log('Inventario tour completed');
      }
    };
  }

  getPosTour(): TourConfig {
    return {
      steps: [
        {
          element: '.sidebar-container',
          title: '🏪 Accediendo al POS',
          description: 'Para llegar al Punto de Venta, navega: Menú → Ventas → POS'
        },
        {
          element: '[data-tour="pos-categories"]',
          title: 'Categorías de Productos',
          description: 'Navega por las categorías para encontrar productos rápidamente en el POS.'
        },
        {
          element: '[data-tour="pos-products"]',
          title: 'Selección de Productos',
          description: 'Haz clic en los productos para agregarlos al carrito de compra.'
        },
        {
          element: '[data-tour="pos-cart"]',
          title: 'Carrito y Checkout',
          description: 'Aquí ves los productos seleccionados, clientes y formas de pago.'
        },
        {
          element: '.sidebar-container',
          title: '↩️ Volver al Menú',
          description: '¡Recuerda! Siempre puedes volver al menú principal para acceder a otros módulos.'
        }
      ],
      onComplete: () => {
        console.log('POS tour completed');
      }
    };
  }

  navigateAndStartTour(route: string, tourName: string, tourConfig: TourConfig) {
    this.router.navigate([route]).then(() => {
      setTimeout(() => {
        this.startTour(tourName, tourConfig);
      }, 500);
    });
  }
}