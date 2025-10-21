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

  constructor() {}

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

    this.timelineEvents = this.history.map((item, index) => ({
      ...item,
      color: this.getTransitionColor(item.transitionType),
      icon: this.getTransitionIcon(item.transitionType),
      date: this.formatTimestamp(item.timestamp),
      relativeDate: this.getRelativeTime(item.timestamp),
      isFirst: index === 0,
      isLast: index === this.history.length - 1
    }));
  }

  /**
   * Obtiene el color según el tipo de transición
   */
  getTransitionColor(type: TransitionType): string {
    const colors = {
      'forward': '#22c55e',      // Verde
      'backward': '#f59e0b',     // Naranja/Amarillo
      'rejection': '#ef4444',    // Rojo
      'cancellation': '#ef4444', // Rojo
      'same': '#6b7280',         // Gris
      'unknown': '#9ca3af'       // Gris claro
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
    if (!timestamp) return 'Fecha desconocida';
    
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
        return 'Formato de fecha inválido';
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
      return 'Error en fecha';
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

      if (diffSeconds < 60) return 'Hace unos segundos';
      if (diffMinutes < 60) return `Hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
      if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
      if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
      if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'semana' : 'semanas'}`;
      if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) === 1 ? 'mes' : 'meses'}`;
      return `Hace ${Math.floor(diffDays / 365)} ${Math.floor(diffDays / 365) === 1 ? 'año' : 'años'}`;
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
      return 'Sistema Automático';
    }
    // Si es transportador (formato: placa o transportador:placa)
    if (userEmail.includes('transportador:')) {
      return `Transportador (${userEmail.split(':')[1]})`;
    }
    return userEmail;
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
      'forward': 'Avance',
      'backward': 'Retroceso',
      'rejection': 'Rechazo',
      'cancellation': 'Cancelación',
      'same': 'Sin cambio',
      'unknown': 'Desconocido'
    };
    return labels[type] || 'Desconocido';
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
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
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
