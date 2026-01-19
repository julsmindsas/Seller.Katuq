import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
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
  
  constructor(public activeModal: NgbActiveModal) { }

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
    if (!estado) return 'pi pi-info-circle';

    const estadoNormalizado = estado.toLowerCase();
    const estados: { [key: string]: string } = {
      // Estados genéricos
      'en tránsito': 'pi pi-truck',
      'entregado': 'pi pi-check-circle',
      'en ruta': 'pi pi-map-marker',
      'retenido': 'pi pi-exclamation-triangle',
      'devuelto': 'pi pi-undo',
      // Estados de Prindel
      'created': 'pi pi-box',
      'picked_up': 'pi pi-send',
      'in_transit': 'pi pi-truck',
      'delivered': 'pi pi-check-circle',
      'returned': 'pi pi-undo',
      'failed': 'pi pi-times-circle',
      // Estados normalizados de Katuq
      'pending': 'pi pi-clock',
      'processing': 'pi pi-spin pi-spinner',
      'shipped': 'pi pi-truck',
      'cancelled': 'pi pi-ban'
    };

    return estados[estadoNormalizado] || 'pi pi-info-circle';
  }

  // Método para obtener la clase CSS del estado
  getEstadoClass(estado: string): string {
    if (!estado) return 'estado-default';

    const estadoNormalizado = estado.toLowerCase();
    const estados: { [key: string]: string } = {
      // Estados genéricos
      'en tránsito': 'estado-transito',
      'entregado': 'estado-entregado',
      'en ruta': 'estado-ruta',
      'retenido': 'estado-retenido',
      'devuelto': 'estado-devuelto',
      // Estados de Prindel
      'created': 'estado-creado',
      'picked_up': 'estado-recogido',
      'in_transit': 'estado-transito',
      'delivered': 'estado-entregado',
      'returned': 'estado-devuelto',
      'failed': 'estado-error',
      // Estados normalizados de Katuq
      'pending': 'estado-pendiente',
      'processing': 'estado-procesando',
      'shipped': 'estado-transito',
      'cancelled': 'estado-cancelado'
    };

    return estados[estadoNormalizado] || 'estado-default';
  }

  // Método para refrescar el tracking
  refreshTracking(): void {
    this.onRefresh.emit();
  }

  // Método para cerrar el modal
  close(): void {
    this.activeModal.close();
  }
}
