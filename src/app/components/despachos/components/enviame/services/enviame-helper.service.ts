import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  EnviameRate,
  EnviameTrackingEvent,
  EnviameShipmentStatus,
  EnviameDashboardMetrics,
  EnviameQuoteRequest
} from '../models/enviame.interfaces';
import { Pedido } from '../../../../ventas/modelo/pedido';

@Injectable({
  providedIn: 'root'
})
export class EnviameHelperService {

  constructor() { }

  /**
   * Verificar si un pedido es de Enviame
   */
  isEnviameShipment(pedido: Pedido): boolean {
    return pedido.providerShipment === 'enviame' && !!pedido.shippingOrder;
  }

  /**
   * Obtener el nombre legible del estado de Enviame
   */
  getStatusDisplayName(status: string): string {
    const statusNames = {
      'created': 'Creado',
      'in_transit': 'En tránsito',
      'out_for_delivery': 'En reparto',
      'delivered': 'Entregado',
      'exception': 'Incidencia',
      'cancelled': 'Cancelado',
      'returned': 'Devuelto',
      'preparing': 'Preparando',
      'picked_up': 'Recolectado'
    };

    return statusNames[status.toLowerCase()] || status;
  }

  /**
   * Obtener el ícono del estado
   */
  getStatusIcon(status: string): string {
    const statusIcons = {
      'created': 'pi pi-clock',
      'in_transit': 'pi pi-truck',
      'out_for_delivery': 'pi pi-map-marker',
      'delivered': 'pi pi-check-circle',
      'exception': 'pi pi-exclamation-triangle',
      'cancelled': 'pi pi-times-circle',
      'returned': 'pi pi-undo',
      'preparing': 'pi pi-cog',
      'picked_up': 'pi pi-shopping-bag'
    };

    return statusIcons[status.toLowerCase()] || 'pi pi-info-circle';
  }

  /**
   * Obtener la clase CSS del estado
   */
  getStatusClass(status: string): string {
    const statusClasses = {
      'created': 'status-created',
      'in_transit': 'status-transit',
      'out_for_delivery': 'status-delivery',
      'delivered': 'status-delivered',
      'exception': 'status-exception',
      'cancelled': 'status-cancelled',
      'returned': 'status-returned',
      'preparing': 'status-preparing',
      'picked_up': 'status-picked'
    };

    return statusClasses[status.toLowerCase()] || 'status-default';
  }

  /**
   * Verificar si un envío puede ser cancelado
   */
  canCancelShipment(status: string): boolean {
    const cancellableStatuses = ['created', 'preparing', 'picked_up'];
    return cancellableStatuses.includes(status.toLowerCase());
  }

  /**
   * Formatear precio con moneda
   */
  formatPrice(price: number, currency: string = 'COP'): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency
    }).format(price);
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calcular días de diferencia
   */
  getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Ordenar tarifas por precio
   */
  sortRatesByPrice(rates: EnviameRate[]): EnviameRate[] {
    return rates.sort((a, b) => a.price - b.price);
  }

  /**
   * Filtrar tarifas por tipo de servicio
   */
  filterRatesByServiceType(rates: EnviameRate[], serviceType: 'express' | 'standard' | 'economy'): EnviameRate[] {
    return rates.filter(rate => rate.serviceTypes && rate.serviceTypes.includes(serviceType));
  }

  /**
   * Obtener la tarifa más económica
   */
  getCheapestRate(rates: EnviameRate[]): EnviameRate | null {
    if (rates.length === 0) return null;
    return rates.reduce((prev, current) => prev.price < current.price ? prev : current);
  }

  /**
   * Obtener la tarifa más rápida
   */
  getFastestRate(rates: EnviameRate[]): EnviameRate | null {
    if (rates.length === 0) return null;

    // Primero intentar con estimatedDays como string (ej: "1-2 días")
    return rates.reduce((prev, current) => {
      const prevDays = this.extractMinDays(prev.estimatedDays || prev.estimatedTime || '999');
      const currentDays = this.extractMinDays(current.estimatedDays || current.estimatedTime || '999');
      return prevDays < currentDays ? prev : current;
    });
  }

  /**
   * Extraer el número mínimo de días de un string como "1-2 días" o "3 días"
   */
  private extractMinDays(timeStr: string): number {
    const match = timeStr.match(/\d+/);
    return match ? parseInt(match[0]) : 999;
  }

  /**
   * Validar datos de dirección
   */
  validateAddress(address: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address.address || address.address.trim() === '') {
      errors.push('La dirección es obligatoria');
    }

    if (!address.city || address.city.trim() === '') {
      errors.push('La ciudad es obligatoria');
    }

    if (!address.country || address.country.trim() === '') {
      errors.push('El país es obligatorio');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validar datos del paquete
   */
  validatePackage(pkg: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pkg.weight || pkg.weight <= 0) {
      errors.push('El peso debe ser mayor a 0');
    }

    if (pkg.weight > 50) {
      errors.push('El peso no puede ser mayor a 50 kg');
    }

    if (!pkg.dimensions) {
      errors.push('Las dimensiones son obligatorias');
    } else {
      if (!pkg.dimensions.length || pkg.dimensions.length <= 0) {
        errors.push('El largo debe ser mayor a 0');
      }
      if (!pkg.dimensions.width || pkg.dimensions.width <= 0) {
        errors.push('El ancho debe ser mayor a 0');
      }
      if (!pkg.dimensions.height || pkg.dimensions.height <= 0) {
        errors.push('El alto debe ser mayor a 0');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Convertir pedido a datos de dirección de destino
   */
  getPedidoDestinationAddress(pedido: Pedido): any {
    if (!pedido.envio) return null;

    return {
      address: pedido.envio.direccionEntrega || '',
      city: pedido.envio.ciudad || '',
      country: pedido.envio.pais || 'CO',
      postalCode: '',
      recipient: {
        name: pedido.envio.nombres || pedido.cliente?.nombres_completos || '',
        phone: pedido.envio.celular || pedido.cliente?.numero_celular_comprador || '',
        email: pedido.cliente?.correo_electronico_comprador || ''
      }
    };
  }

  // Métodos de cálculo de peso y dimensiones movidos a ShipmentPreparationService
  // para ser reutilizados por otros proveedores logísticos

  /**
   * Generar request de cotización desde un pedido
   */
  createQuoteRequestFromPedido(pedido: Pedido, companyId: string, originAddress: any): EnviameQuoteRequest | null {
    const destination = this.getPedidoDestinationAddress(pedido);
    if (!destination) return null;

    // Nota: Los cálculos de peso y dimensiones ahora se hacen en ShipmentPreparationService
    const weight = 1; // Placeholder - usar ShipmentPreparationService
    const dimensions = { length: 30, width: 20, height: 15 }; // Placeholder - usar ShipmentPreparationService

    return {
      companyId: companyId,
      provider: 'enviame',
      origin: originAddress,
      destination: destination,
      package: {
        weight: weight,
        dimensions: dimensions,
        value: pedido.totalPedididoConDescuento || 0,
        description: 'Productos varios',
        quantity: pedido.carrito?.length || 1
      },
      options: {
        insuranceValue: pedido.totalPedididoConDescuento || 0,
        cashOnDelivery: pedido.formaDePago === 'contraentrega',
        signature: true
      }
    };
  }

  /**
   * Calcular métricas del dashboard
   */
  calculateDashboardMetrics(shipments: any[]): EnviameDashboardMetrics {
    const metrics: EnviameDashboardMetrics = {
      totalShipments: shipments.length,
      inTransit: 0,
      delivered: 0,
      pending: 0,
      cancelled: 0,
      totalCost: 0,
      averageDeliveryDays: 0,
      deliveryRate: 0
    };

    let deliveryDaysSum = 0;
    let deliveredCount = 0;

    shipments.forEach(shipment => {
      metrics.totalCost += shipment.cost || 0;

      switch (shipment.status?.toLowerCase()) {
        case 'in_transit':
        case 'out_for_delivery':
          metrics.inTransit++;
          break;
        case 'delivered':
          metrics.delivered++;
          deliveredCount++;
          if (shipment.deliveryDays) {
            deliveryDaysSum += shipment.deliveryDays;
          }
          break;
        case 'created':
        case 'preparing':
        case 'picked_up':
          metrics.pending++;
          break;
        case 'cancelled':
        case 'returned':
          metrics.cancelled++;
          break;
      }
    });

    if (deliveredCount > 0) {
      metrics.averageDeliveryDays = Math.round(deliveryDaysSum / deliveredCount);
    }

    if (metrics.totalShipments > 0) {
      metrics.deliveryRate = Math.round((metrics.delivered / metrics.totalShipments) * 100);
    }

    return metrics;
  }

  /**
   * Obtener colores del timeline según el estado
   */
  getTimelineColors(status: string): { background: string; border: string; text: string } {
    const colors = {
      'created': { background: '#e3f2fd', border: '#2196f3', text: '#1976d2' },
      'in_transit': { background: '#fff3e0', border: '#ff9800', text: '#f57c00' },
      'out_for_delivery': { background: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2' },
      'delivered': { background: '#e8f5e8', border: '#4caf50', text: '#388e3c' },
      'exception': { background: '#ffebee', border: '#f44336', text: '#d32f2f' },
      'cancelled': { background: '#fafafa', border: '#9e9e9e', text: '#616161' },
      'returned': { background: '#fff8e1', border: '#ffc107', text: '#f57f17' }
    };

    return colors[status.toLowerCase()] || colors['created'];
  }
}