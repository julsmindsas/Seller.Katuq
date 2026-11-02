/**
 * ========================================================================
 * COMPONENTE NUEVO: Timeline de Historial de Estados de Pedidos
 * ========================================================================
 * Creado: 2025-10-21
 * Propósito: Visualizar el historial de cambios de estado en timeline vertical
 * 
 * Componente NUEVO - No modifica ningún componente existente
 */

import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { OrderStatusHistory, TransitionType } from '../../../shared/models/order-history.interface';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-order-history-timeline',
  templateUrl: './order-history-timeline.component.html',
  styleUrls: ['./order-history-timeline.component.scss']
})
export class OrderHistoryTimelineComponent implements OnInit, OnChanges {
  
  @Input() history: OrderStatusHistory[] = [];
  @Input() loading: boolean = false;
  @Input() showMetadata: boolean = true;
  @Input() useRelativeTime: boolean = true;
  
  // Estados expandidos (para mostrar metadata)
  expandedItems: Set<string> = new Set();
  
  // Timeline events procesados para PrimeNG
  timelineEvents: any[] = [];

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.processHistoryForTimeline();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['history']) {
      this.processHistoryForTimeline();
    }
  }

  /**
   * Procesa el historial para formato de timeline
   */
  private processHistoryForTimeline(): void {
    if (!this.history || this.history.length === 0) {
      this.timelineEvents = [];
      return;
    }

    this.timelineEvents = this.history.map((item: any, index) => ({
      ...item,
      // Ticket 1351: creación y pagos reconstruidos con los datos del pedido (tipoEvento).
      color: item.tipoEvento ? this.colorEvento(item.tipoEvento) : this.getTransitionColor(item.transitionType),
      icon: item.tipoEvento ? this.iconoEvento(item.tipoEvento) : this.getTransitionIcon(item.transitionType),
      date: this.formatTimestamp(item.timestamp),
      relativeDate: this.getRelativeTime(item.timestamp),
      isFirst: index === 0,
      isLast: index === this.history.length - 1
    }));
  }

  /** Ticket 1351: color e ícono de los eventos que no son cambios de estado. */
  colorEvento(tipo: string): string {
    return ({ creacion: '#5F3FE0', pago: '#1E6FD9' } as Record<string, string>)[tipo] || '#8f8bab';
  }

  iconoEvento(tipo: string): string {
    return ({ creacion: 'pi pi-plus', pago: 'pi pi-wallet' } as Record<string, string>)[tipo] || 'pi pi-info-circle';
  }

  /**
   * Obtiene el color según el tipo de transición
   */
  getTransitionColor(type: TransitionType): string {
    const colors = {
      'forward': '#1E874B',      // Verde
      'backward': '#D9820A',     // Naranja/Amarillo
      'rejection': '#D64545',    // Rojo
      'cancellation': '#D64545', // Rojo
      'same': '#8f8bab',         // Gris
      'unknown': '#b9b5cf'       // Gris claro
    };
    return colors[type] || colors['unknown'];
  }

  /**
   * Obtiene el icono según el tipo de transición
   */
  getTransitionIcon(type: TransitionType): string {
    const icons = {
      'forward': 'pi pi-arrow-right',
      'backward': 'pi pi-arrow-left',
      'rejection': 'pi pi-times-circle',
      'cancellation': 'pi pi-ban',
      'same': 'pi pi-minus',
      'unknown': 'pi pi-question-circle'
    };
    return icons[type] || icons['unknown'];
  }

  /**
   * Formatea el timestamp a string legible
   */
  formatTimestamp(timestamp: any): string {
    if (!timestamp) return this.translate.instant('ventas.orderHistoryTimeline.fechaDesconocida');
    
    try {
      let date: Date;
      
      // Si es Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } 
      // Si es string ISO
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      // Si ya es Date
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Si tiene seconds (Firestore Timestamp serializado)
      else if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      }
      else {
        return this.translate.instant('ventas.orderHistoryTimeline.fechaInvalida');
      }

      // Formato: "21 Oct 2025, 3:45 PM"
      return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formateando timestamp:', error);
      return this.translate.instant('ventas.orderHistoryTimeline.errorFecha');
    }
  }

  /**
   * Obtiene tiempo relativo (ej: "Hace 2 horas")
   */
  getRelativeTime(timestamp: any): string {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else {
        return '';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      const claves: Record<string, [string, string]> = {
        minutos: ['ventas.orderHistoryTimeline.hace.minutos.one', 'ventas.orderHistoryTimeline.hace.minutos.other'],
        horas: ['ventas.orderHistoryTimeline.hace.horas.one', 'ventas.orderHistoryTimeline.hace.horas.other'],
        dias: ['ventas.orderHistoryTimeline.hace.dias.one', 'ventas.orderHistoryTimeline.hace.dias.other'],
        semanas: ['ventas.orderHistoryTimeline.hace.semanas.one', 'ventas.orderHistoryTimeline.hace.semanas.other'],
        meses: ['ventas.orderHistoryTimeline.hace.meses.one', 'ventas.orderHistoryTimeline.hace.meses.other'],
        anios: ['ventas.orderHistoryTimeline.hace.anios.one', 'ventas.orderHistoryTimeline.hace.anios.other'],
      };
      const hace = (unidad: string, n: number) =>
        this.translate.instant(claves[unidad][n === 1 ? 0 : 1], { n });
      if (diffSeconds < 60) return this.translate.instant('ventas.orderHistoryTimeline.haceSegundos');
      if (diffMinutes < 60) return hace('minutos', diffMinutes);
      if (diffHours < 24) return hace('horas', diffHours);
      if (diffDays < 7) return hace('dias', diffDays);
      if (diffDays < 30) return hace('semanas', Math.floor(diffDays / 7));
      if (diffDays < 365) return hace('meses', Math.floor(diffDays / 30));
      return hace('anios', Math.floor(diffDays / 365));
    } catch (error) {
      return '';
    }
  }

  /**
   * Toggle para expandir/contraer metadata
   */
  toggleMetadata(itemId: string): void {
    if (this.expandedItems.has(itemId)) {
      this.expandedItems.delete(itemId);
    } else {
      this.expandedItems.add(itemId);
    }
  }

  /**
   * Verifica si un item está expandido
   */
  isExpanded(itemId: string): boolean {
    return this.expandedItems.has(itemId);
  }

  /**
   * Obtiene el label del usuario
   */
  getUserLabel(userEmail: string): string {
    if (!userEmail || userEmail === 'Sistema') {
      return 'ventas.orderHistoryTimeline.sistemaAutomatico';
    }
    // Si es transportador (formato: placa o transportador:placa)
    if (userEmail.includes('transportador:')) {
      return 'ventas.orderHistoryTimeline.transportador';
    }
    return userEmail;
  }

  /** Placa del transportador para la etiqueta del usuario (vacía si no es transportador). */
  placaTransportador(userEmail: string): string {
    return userEmail && userEmail.includes('transportador:') ? userEmail.split(':')[1] : '';
  }

  /**
   * Obtiene badge class según el tipo de transición
   */
  getBadgeClass(type: TransitionType): string {
    const classes = {
      'forward': 'badge-success',
      'backward': 'badge-warning',
      'rejection': 'badge-danger',
      'cancellation': 'badge-danger',
      'same': 'badge-secondary',
      'unknown': 'badge-secondary'
    };
    return classes[type] || 'badge-secondary';
  }

  /**
   * Obtiene el label del tipo de transición
   */
  getTransitionLabel(type: TransitionType): string {
    const labels = {
      'forward': 'ventas.orderHistoryTimeline.transicion.forward',
      'backward': 'ventas.orderHistoryTimeline.transicion.backward',
      'rejection': 'ventas.orderHistoryTimeline.transicion.rejection',
      'cancellation': 'ventas.orderHistoryTimeline.transicion.cancellation',
      'same': 'ventas.orderHistoryTimeline.transicion.same',
      'unknown': 'ventas.orderHistoryTimeline.transicion.unknown'
    };
    return labels[type] || 'ventas.orderHistoryTimeline.transicion.unknown';
  }

  /**
   * Verifica si hay metadata para mostrar
   */
  hasMetadata(item: OrderStatusHistory): boolean {
    return item.metadata && Object.keys(item.metadata).length > 0;
  }

  /**
   * Obtiene las claves de metadata filtradas
   */
  getMetadataKeys(metadata: any): string[] {
    if (!metadata) return [];
    // Filtrar campos relevantes
    return Object.keys(metadata).filter(key => 
      metadata[key] !== null && 
      metadata[key] !== undefined && 
      metadata[key] !== '' &&
      !key.startsWith('_')
    );
  }

  /**
   * Formatea el valor de metadata para mostrar
   */
  formatMetadataValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'comun.si' : 'comun.no';
    return String(value);
  }

  /**
   * Formatea el nombre de la clave de metadata
   */
  formatMetadataKey(key: string): string {
    // Convertir camelCase a Title Case con espacios
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
