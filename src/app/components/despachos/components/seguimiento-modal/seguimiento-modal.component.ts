import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Pedido } from '../../../ventas/modelo/pedido';

@Component({
  selector: 'app-seguimiento-modal',
  templateUrl: './seguimiento-modal.component.html',
  styleUrls: ['./seguimiento-modal.component.scss']
})
export class SeguimientoModalComponent implements OnInit {
  @Input() pedido: Pedido;
  @Input() trackingInfo: any;
  @Output() onRefresh = new EventEmitter<void>();
  
  loading: boolean = false;
  error: string = '';
  
  constructor() { }

  ngOnInit(): void {
  }

  // Método para formatear la fecha
  formatDate(date: string | Date): string {
    if (!date) return 'No disponible';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Método para obtener el estado del envío con icono
  getEstadoIcon(estado: string): string {
    const estados = {
      'En tránsito': 'pi pi-truck',
      'Entregado': 'pi pi-check-circle',
      'En ruta': 'pi pi-map-marker',
      'Retenido': 'pi pi-exclamation-triangle',
      'Devuelto': 'pi pi-undo',
      'default': 'pi pi-info-circle'
    };
    return estados[estado] || estados['default'];
  }

  // Método para obtener la clase CSS del estado
  getEstadoClass(estado: string): string {
    const estados = {
      'En tránsito': 'estado-transito',
      'Entregado': 'estado-entregado',
      'En ruta': 'estado-ruta',
      'Retenido': 'estado-retenido',
      'Devuelto': 'estado-devuelto',
      'default': 'estado-default'
    };
    return estados[estado] || estados['default'];
  }

  // Método para refrescar el tracking
  refreshTracking(): void {
    this.onRefresh.emit();
  }
}
