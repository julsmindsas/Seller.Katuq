import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TourService } from './tour.service';

@Injectable({
  providedIn: 'root'
})
export class TourNavigationService {

  constructor(
    private router: Router,
    private tourService: TourService
  ) {}

  startMainNavigationTour() {
    // Este tour se inicia en la página actual para mostrar el menú
    this.tourService.startTour('navigation', this.tourService.getMainNavigationTour());
  }

  startDashboardTour() {
    this.tourService.navigateAndStartTour('/dashboards', 'dashboard', this.tourService.getDashboardTour());
  }

  startVentasTour() {
    this.tourService.navigateAndStartTour('/ventas/crear-ventas', 'ventas', this.tourService.getVentasTour());
  }

  startInventarioTour() {
    this.tourService.navigateAndStartTour('/inventario/inventarios', 'inventario', this.tourService.getInventarioTour());
  }

  startPosTour() {
    this.tourService.navigateAndStartTour('/ventas/pos', 'pos', this.tourService.getPosTour());
  }

  showTourMenu() {
    const tours = [
      { id: 'navigation', name: '🧭 Navegación Principal', description: 'Aprende a usar el menú lateral y navegar por Katuq' },
      { id: 'dashboard', name: '📊 Dashboard', description: 'Panel principal con métricas y estadísticas' },
      { id: 'ventas', name: '🛒 Módulo de Ventas', description: 'Cómo acceder y usar las funciones de ventas' },
      { id: 'inventario', name: '📦 Inventarios', description: 'Gestión de productos e inventario' },
      { id: 'pos', name: '🏪 Punto de Venta', description: 'Sistema POS para ventas rápidas' }
    ];

    const tourOptions = tours.map((tour, index) => `
      <div class="tour-option mb-3 p-3 border rounded" style="cursor: pointer;" onclick="window.tourNavigationService.start${tour.id === 'navigation' ? 'MainNavigation' : tour.id === 'dashboard' ? 'Dashboard' : tour.id === 'ventas' ? 'Ventas' : tour.id === 'inventario' ? 'Inventario' : 'Pos'}Tour()">
        <h6 class="mb-1 text-primary">${tour.name}</h6>
        <small class="text-muted">${tour.description}</small>
      </div>
    `).join('');

    // Expose this service to window for the onclick handlers
    (window as any).tourNavigationService = this;

    const swalHtml = `
      <div class="tours-menu">
        <h5 class="text-center mb-4 text-primary">
          <i class="fas fa-route me-2"></i>Tours Guiados Disponibles
        </h5>
        ${tourOptions}
        <hr>
        <div class="text-center">
          <button class="btn btn-outline-danger btn-sm" onclick="window.tourNavigationService.resetAllTours()">
            <i class="fas fa-redo me-1"></i>Reiniciar todos los tours
          </button>
        </div>
      </div>
    `;

    console.log('Showing tour menu...');
    
    // Use SweetAlert2 if available, otherwise show a simple confirm
    if (typeof (window as any).Swal !== 'undefined') {
      (window as any).Swal.fire({
        html: swalHtml,
        width: 500,
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
          container: 'tour-menu-container'
        }
      });
    } else {
      // Fallback - create a simple modal using Bootstrap or native alert
      const tourChoice = confirm(`🧭 Tours Disponibles en Katuq:\n\n` +
        `1. Navegación Principal - Aprende a usar el menú\n` +
        `2. Dashboard - Panel principal con métricas\n` +
        `3. Módulo de Ventas - Funciones de ventas\n` +
        `4. Inventarios - Gestión de productos\n` +
        `5. POS - Punto de venta\n\n` +
        `Presiona OK para comenzar con el tour de Navegación`);
      
      if (tourChoice) {
        this.startMainNavigationTour();
      }
    }
  }

  resetAllTours() {
    this.tourService.resetTours();
    
    if (typeof (window as any).Swal !== 'undefined') {
      (window as any).Swal.fire({
        title: 'Tours Reiniciados',
        text: 'Todos los tours han sido reiniciados. Los verás automáticamente cuando visites cada módulo.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      alert('Tours reiniciados exitosamente');
    }
  }

  // Helper method to show tour triggers in components
  addTourTriggerToElement(elementId: string, tourType: 'dashboard' | 'ventas' | 'inventario' | 'pos') {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        const badge = document.createElement('span');
        badge.className = 'badge bg-info ms-2 tour-trigger';
        badge.innerHTML = '<i class="fas fa-route"></i>';
        badge.style.cursor = 'pointer';
        badge.title = 'Iniciar tour guiado';
        badge.onclick = () => {
          switch(tourType) {
            case 'dashboard':
              this.startDashboardTour();
              break;
            case 'ventas':
              this.startVentasTour();
              break;
            case 'inventario':
              this.startInventarioTour();
              break;
            case 'pos':
              this.startPosTour();
              break;
          }
        };
        element.appendChild(badge);
      }
    }, 1000);
  }
}