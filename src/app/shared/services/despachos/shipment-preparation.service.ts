import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { BodegaService } from '../bodegas/bodega.service';
import { Pedido, Carrito } from '../../../components/ventas/modelo/pedido';

export interface ShipmentOrigin {
  address: string;
  city: string;
  department: string;
  country: string;
  postalCode?: string;
  warehouse?: any;
}

export interface ShipmentDestination {
  address: string;
  city: string;
  department: string;
  country: string;
  postalCode?: string;
  neighborhood?: string;
  observations?: string;
  recipient: {
    name: string;
    phone: string;
    alternatePhone?: string;
    email: string;
  };
}

export interface ShipmentPackage {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  value: number;
  description: string;
  items: any[];
  nPackages?: number;      // Número de bultos (default 1; el usuario lo edita en cotización)
}

export interface PreparedShipment {
  origin: ShipmentOrigin;
  destination: ShipmentDestination;
  package: ShipmentPackage;
  paymentMethod: string;
  isCashOnDelivery: boolean;
  orderReference: string;
  totalValue: number;
}

export interface BodegaAnalysis {
  selectedBodegaId: string | undefined;
  hasMultipleBodegas: boolean;
  bodegasInfo: {
    bodegaId: string;
    pedidosCount: number;
    pedidosIds: string[];
  }[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ShipmentPreparationService {

  // Origen por defecto cuando no hay bodega disponible
  private defaultOrigin: ShipmentOrigin = {
    address: 'Carrera 7 #32-16',
    city: 'Bogotá',
    department: 'Cundinamarca',
    country: 'CO',
    postalCode: '110311'
  };

  constructor(
    private bodegaService: BodegaService
  ) { }

  /**
   * Prepara toda la información del envío desde una orden con múltiples pedidos
   * @param order - Orden completa con múltiples pedidos
   * @param pedido - Pedido específico a usar (si se proporciona, usa este en lugar del primero)
   */
  prepareShipment(order: any, pedido?: Pedido): Observable<PreparedShipment> {
    const pedidos = order.pedidos || [];

    if (!pedidos || pedidos.length === 0) {
      throw new Error('La orden no tiene pedidos válidos');
    }

    // CORRECCIÓN: Si se proporciona un pedido específico, usar ese.
    // De lo contrario, usar el primer pedido como base
    const mainPedido = pedido || pedidos[0];

    console.log(`📦 prepareShipment - Usando pedido específico:`, {
      pedidoProporcionado: !!pedido,
      nroPedido: mainPedido.nroPedido,
      cliente: mainPedido.cliente?.nombres_completos,
      bodegaId: mainPedido.bodegaId
    });

    // Determinar bodega: si hay un pedido específico, usar su bodega
    // De lo contrario, buscar una bodega común
    const bodegaId = pedido ? pedido.bodegaId : this.determineBodegaForOrder(pedidos);

    return this.getOriginFromWarehouse(bodegaId).pipe(
      map(origin => ({
        origin: origin,
        destination: this.getDestinationFromOrder(mainPedido),
        package: pedido ? this.getPackageDetailsForSinglePedido(pedido) : this.calculateConsolidatedPackageDetails(pedidos),
        paymentMethod: this.determinePaymentMethod([mainPedido]),
        isCashOnDelivery: this.determineIfCashOnDelivery([mainPedido]),
        orderReference: order.nroShippingOrder || order.nroOrden || mainPedido.nroPedido || '',
        totalValue: pedido ? this.calculatePedidoValue(pedido) : this.calculateTotalOrderValue(pedidos)
      }))
    );
  }

  /**
   * Obtiene la dirección de origen desde la bodega
   */
  private getOriginFromWarehouse(bodegaId?: string): Observable<ShipmentOrigin> {
    if (!bodegaId) {
      return of(this.getDefaultOrigin());
    }

    // Nota: El método getBodegaByName parece esperar un nombre, no un ID
    // Podríamos necesitar un método diferente o modificar este approach
    return this.bodegaService.getBodegaByCode(bodegaId).pipe(
      map(bodega => ({
        address: bodega.direccion || this.defaultOrigin.address,
        city: bodega.ciudad || this.defaultOrigin.city,
        department: bodega.departamento || this.defaultOrigin.department,
        country: bodega.pais || this.defaultOrigin.country,
        postalCode: bodega.codigoPostal || this.defaultOrigin.postalCode,
        warehouse: bodega
      })),
      catchError(() => {
        console.warn(`No se pudo cargar la bodega ${bodegaId}, usando origen por defecto`);
        return of(this.getDefaultOrigin());
      })
    );
  }

  /**
   * Obtiene la dirección de destino desde el pedido
   */
  getDestinationFromOrder(pedido: Pedido): ShipmentDestination {
    if (!pedido.envio) {
      throw new Error('El pedido no tiene información de envío');
    }

    return {
      address: pedido.envio.direccionEntrega || '',
      city: pedido.envio.ciudad || '',
      department: pedido.envio.departamento || '',
      country: pedido.envio.pais || 'CO',
      postalCode: pedido.envio.codigoPV || '',
      neighborhood: pedido.envio.barrio || '',
      observations: pedido.envio.observaciones || '',
      recipient: this.formatRecipientInfo(pedido)
    };
  }

  /**
   * Calcula los detalles del paquete consolidado de múltiples pedidos
   */
  calculateConsolidatedPackageDetails(pedidos: Pedido[]): ShipmentPackage {
    // Consolidar todos los carritos de todos los pedidos
    const allItems: any[] = [];
    pedidos.forEach(pedido => {
      if (pedido.carrito && pedido.carrito.length > 0) {
        allItems.push(...pedido.carrito);
      }
    });

    const weight = this.calculateTotalWeight(allItems);
    const dimensions = this.calculateBoxDimensions(allItems);
    const value = this.calculateTotalOrderValue(pedidos);
    const description = this.generateConsolidatedPackageDescription(pedidos, allItems);

    return {
      weight,
      dimensions,
      value,
      description,
      items: allItems
    };
  }

  /**
   * Calcula los detalles del paquete de un solo pedido (método legacy)
   */
  calculatePackageDetails(pedido: Pedido): ShipmentPackage {
    const weight = this.calculateTotalWeight(pedido.carrito || []);
    const dimensions = this.calculateBoxDimensions(pedido.carrito || []);
    const value = pedido.totalPedididoConDescuento || 0;
    const description = this.generatePackageDescription(pedido.carrito || []);

    return {
      weight,
      dimensions,
      value,
      description,
      items: pedido.carrito || []
    };
  }

  /**
   * Obtiene los detalles del paquete para un pedido específico
   * (Alias para calculatePackageDetails con mejor nombre)
   */
  private getPackageDetailsForSinglePedido(pedido: Pedido): ShipmentPackage {
    return this.calculatePackageDetails(pedido);
  }

  /**
   * Calcula el valor de un pedido específico
   */
  private calculatePedidoValue(pedido: Pedido): number {
    return pedido.totalPedididoConDescuento || 0;
  }

  /**
   * Calcula el peso total del carrito basado en los productos
   */
  calculateTotalWeight(carrito: Carrito[]): number {
    let totalWeight = 0;

    carrito.forEach(item => {
      if (item.producto?.dimensiones?.pesoUnitarioProductoKg) {
        const weight = parseFloat(item.producto.dimensiones.pesoUnitarioProductoKg) || 0;
        const quantity = item.cantidad || 1;
        totalWeight += weight * quantity;
      } else {
        // Peso por defecto cuando no hay información
        const defaultWeight = 0.5; // 500g por producto
        const quantity = item.cantidad || 1;
        totalWeight += defaultWeight * quantity;
      }
    });

    // Peso mínimo de 0.1 kg
    return Math.max(totalWeight, 0.1);
  }

  /**
   * Calcula las dimensiones óptimas de la caja
   */
  calculateBoxDimensions(carrito: Carrito[]): { length: number; width: number; height: number } {
    if (!carrito || carrito.length === 0) {
      // Dimensiones por defecto
      return { length: 30, width: 20, height: 15 };
    }

    let totalVolume = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    carrito.forEach(item => {
      const quantity = item.cantidad || 1;

      if (item.producto?.dimensiones) {
        const length = parseFloat(item.producto.dimensiones.largoProductoCm) || 20;
        const width = parseFloat(item.producto.dimensiones.anchoProductoCm) || 15;
        const height = parseFloat(item.producto.dimensiones.altoProductoCm) || 10;

        // Acumular dimensiones considerando la cantidad
        maxLength = Math.max(maxLength, length);
        maxWidth = Math.max(maxWidth, width);
        totalHeight += height * quantity;

        totalVolume += length * width * height * quantity;
      } else {
        // Dimensiones por defecto por producto
        maxLength = Math.max(maxLength, 20);
        maxWidth = Math.max(maxWidth, 15);
        totalHeight += 10 * quantity;

        totalVolume += 20 * 15 * 10 * quantity;
      }
    });

    // Si tenemos volumen total, calculamos dimensiones óptimas de caja
    if (totalVolume > 0) {
      const cubeRoot = Math.cbrt(totalVolume);
      return {
        length: Math.max(maxLength, Math.ceil(cubeRoot * 1.2)),
        width: Math.max(maxWidth, Math.ceil(cubeRoot)),
        height: Math.max(totalHeight, Math.ceil(cubeRoot * 0.8))
      };
    }

    // Fallback a dimensiones por defecto
    return { length: 30, width: 20, height: 15 };
  }

  /**
   * Genera descripción del paquete basada en los productos
   */
  generatePackageDescription(carrito: Carrito[]): string {
    if (!carrito || carrito.length === 0) {
      return 'Productos varios';
    }

    const productNames = carrito.map(item => {
      const productName = item.producto?.crearProducto?.titulo || item.producto?.identificacion?.referencia || 'Producto';
      const quantity = item.cantidad || 1;
      return quantity > 1 ? `${productName} (x${quantity})` : productName;
    });

    const description = productNames.join(', ');

    // Truncar si es muy largo
    return description.length > 100
      ? description.substring(0, 97) + '...'
      : description;
  }

  /**
   * Genera descripción consolidada para múltiples pedidos
   */
  generateConsolidatedPackageDescription(pedidos: Pedido[], allItems: Carrito[]): string {
    if (!allItems || allItems.length === 0) {
      return `${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''} - Productos varios`;
    }

    // Agrupar productos iguales sumando cantidades
    const productMap = new Map<string, number>();

    allItems.forEach(item => {
      const productName = item.producto?.crearProducto?.titulo || item.producto?.identificacion?.referencia || 'Producto';
      const quantity = item.cantidad || 1;

      if (productMap.has(productName)) {
        productMap.set(productName, productMap.get(productName)! + quantity);
      } else {
        productMap.set(productName, quantity);
      }
    });

    const productDescriptions = Array.from(productMap.entries()).map(([name, qty]) =>
      qty > 1 ? `${name} (x${qty})` : name
    );

    let description = productDescriptions.join(', ');

    // Prefijo indicando número de pedidos
    const prefix = `${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''}: `;

    // Truncar si es muy largo, considerando el prefijo
    const maxLength = 100 - prefix.length;
    if (description.length > maxLength) {
      description = description.substring(0, maxLength - 3) + '...';
    }

    return prefix + description;
  }

  /**
   * Formatea la información del destinatario
   */
  private formatRecipientInfo(pedido: Pedido): { name: string; phone: string; alternatePhone?: string; email: string } {
    let name = '';
    let phone = '';
    let alternatePhone = '';
    let email = '';

    // Priorizar información de envío
    if (pedido.envio) {
      if (pedido.envio.nombres && pedido.envio.apellidos) {
        name = `${pedido.envio.nombres} ${pedido.envio.apellidos}`.trim();
      } else if (pedido.envio.nombres) {
        name = pedido.envio.nombres;
      }

      if (pedido.envio.indicativoCel && pedido.envio.celular) {
        phone = `${pedido.envio.indicativoCel}${pedido.envio.celular}`;
      } else if (pedido.envio.celular) {
        phone = pedido.envio.celular;
      }

      if (pedido.envio.indicativoOtroNumero && pedido.envio.otroNumero) {
        alternatePhone = `${pedido.envio.indicativoOtroNumero}${pedido.envio.otroNumero}`;
      } else if (pedido.envio.otroNumero) {
        alternatePhone = pedido.envio.otroNumero;
      }
    }

    // Fallback a información del cliente
    if (!name && pedido.cliente?.nombres_completos) {
      name = pedido.cliente.nombres_completos;
    }

    if (!phone && pedido.cliente?.numero_celular_comprador) {
      phone = pedido.cliente.numero_celular_comprador;
    }

    if (pedido.cliente?.correo_electronico_comprador) {
      email = pedido.cliente.correo_electronico_comprador;
    }

    return {
      name: name || 'Destinatario',
      phone: phone || '',
      alternatePhone: alternatePhone || undefined,
      email: email || ''
    };
  }

  /**
   * Determina si es pago contraentrega
   */
  private isCashOnDelivery(pedido: Pedido): boolean {
    const paymentMethod = pedido.formaDePago?.toLowerCase() || '';
    return paymentMethod === 'contraentrega' || paymentMethod === 'contra entrega';
  }

  /**
   * Obtiene el origen por defecto
   */
  private getDefaultOrigin(): ShipmentOrigin {
    return { ...this.defaultOrigin };
  }

  /**
   * Actualiza el origen por defecto (útil para configuración)
   */
  setDefaultOrigin(origin: ShipmentOrigin): void {
    this.defaultOrigin = { ...origin };
  }

  /**
   * Método de utilidad para validar que un pedido tiene la información mínima requerida
   */
  validatePedidoForShipment(pedido: Pedido): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pedido.envio) {
      errors.push('El pedido no tiene información de envío');
      return { valid: false, errors };
    }

    if (!pedido.envio.direccionEntrega) {
      errors.push('Falta dirección de entrega');
    }

    if (!pedido.envio.ciudad) {
      errors.push('Falta ciudad de entrega');
    }

    if (!pedido.cliente && !pedido.envio.nombres) {
      errors.push('Falta información del destinatario');
    }

    if (!pedido.carrito || pedido.carrito.length === 0) {
      errors.push('El pedido no tiene productos');
    }

    return { valid: errors.length === 0, errors };
  }

  // =============================================
  // MÉTODOS AUXILIARES PARA MÚLTIPLES PEDIDOS
  // =============================================

  /**
   * Analiza las bodegas involucradas en la orden y determina la estrategia a seguir
   */
  private analyzeBodegasForOrder(pedidos: Pedido[]): BodegaAnalysis {
    if (!pedidos || pedidos.length === 0) {
      return {
        selectedBodegaId: undefined,
        hasMultipleBodegas: false,
        bodegasInfo: [],
        warnings: ['No hay pedidos para analizar']
      };
    }

    // Agrupar pedidos por bodega
    const bodegaGroups = new Map<string, Pedido[]>();
    pedidos.forEach(pedido => {
      const bodegaId = pedido.bodegaId || 'sin_bodega';
      if (!bodegaGroups.has(bodegaId)) {
        bodegaGroups.set(bodegaId, []);
      }
      bodegaGroups.get(bodegaId)!.push(pedido);
    });

    const bodegasInfo = Array.from(bodegaGroups.entries()).map(([bodegaId, pedidos]) => ({
      bodegaId,
      pedidosCount: pedidos.length,
      pedidosIds: pedidos.map(p => p.nroPedido || p._id || 'Sin ID').filter(Boolean)
    }));

    const warnings: string[] = [];
    const hasMultipleBodegas = bodegasInfo.length > 1;

    if (hasMultipleBodegas) {
      warnings.push(`La orden contiene pedidos de ${bodegasInfo.length} bodegas diferentes`);
      bodegasInfo.forEach((info, index) => {
        const bodegaName = info.bodegaId === 'sin_bodega' ? 'Sin bodega asignada' : `Bodega: ${info.bodegaId}`;
        warnings.push(`${bodegaName} (${info.pedidosCount} pedido${info.pedidosCount > 1 ? 's' : ''})`);
      });
    }

    // Para compatibilidad hacia atrás, seleccionar la bodega del primer pedido o la más común
    let selectedBodegaId: string | undefined;
    if (bodegasInfo.length === 1) {
      selectedBodegaId = bodegasInfo[0].bodegaId === 'sin_bodega' ? undefined : bodegasInfo[0].bodegaId;
    } else {
      // Encontrar la bodega con más pedidos
      const mostCommonBodega = bodegasInfo.reduce((prev, current) =>
        prev.pedidosCount >= current.pedidosCount ? prev : current
      );
      selectedBodegaId = mostCommonBodega.bodegaId === 'sin_bodega' ? undefined : mostCommonBodega.bodegaId;
      warnings.push(`Usando bodega con más pedidos: ${selectedBodegaId || 'Sin bodega'}`);
    }

    return {
      selectedBodegaId,
      hasMultipleBodegas,
      bodegasInfo,
      warnings
    };
  }

  /**
   * Determina la bodega más apropiada para la orden (método legacy)
   * @deprecated Use analyzeBodegasForOrder() para análisis más detallado
   */
  private determineBodegaForOrder(pedidos: Pedido[]): string | undefined {
    return this.analyzeBodegasForOrder(pedidos).selectedBodegaId;
  }

  /**
   * Determina el método de pago predominante
   */
  private determinePaymentMethod(pedidos: Pedido[]): string {
    if (!pedidos || pedidos.length === 0) return '';

    // Si todos tienen el mismo método de pago, usarlo
    const firstPaymentMethod = pedidos[0].formaDePago || '';
    const allSamePayment = pedidos.every(p => (p.formaDePago || '') === firstPaymentMethod);

    if (allSamePayment) {
      return firstPaymentMethod;
    }

    // Si hay métodos mixtos, usar el más común o el del primer pedido
    const paymentCounts = new Map<string, number>();
    pedidos.forEach(p => {
      const method = p.formaDePago || 'no_definido';
      paymentCounts.set(method, (paymentCounts.get(method) || 0) + 1);
    });

    // Encontrar el método más común
    let mostCommonMethod = firstPaymentMethod;
    let maxCount = 0;

    paymentCounts.forEach((count, method) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonMethod = method;
      }
    });

    return mostCommonMethod;
  }

  /**
   * Determina si hay pago contraentrega en algún pedido
   */
  private determineIfCashOnDelivery(pedidos: Pedido[]): boolean {
    if (!pedidos || pedidos.length === 0) return false;

    // Si algún pedido es contraentrega, toda la orden se marca como contraentrega
    return pedidos.some(pedido => this.isCashOnDelivery(pedido));
  }

  /**
   * Calcula el valor total de toda la orden
   */
  private calculateTotalOrderValue(pedidos: Pedido[]): number {
    if (!pedidos || pedidos.length === 0) return 0;

    return pedidos.reduce((total, pedido) => {
      return total + (pedido.totalPedididoConDescuento || 0);
    }, 0);
  }

  /**
   * Método de utilidad para validar que una orden tiene la información mínima requerida
   */
  validateOrderForShipment(order: any, allowMultipleBodegas: boolean = false): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    bodegaAnalysis?: BodegaAnalysis;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!order) {
      errors.push('La orden es nula o indefinida');
      return { valid: false, errors, warnings };
    }

    if (!order.pedidos || !Array.isArray(order.pedidos) || order.pedidos.length === 0) {
      errors.push('La orden no tiene pedidos válidos');
      return { valid: false, errors, warnings };
    }

    // Análisis de bodegas ANTES de validar pedidos individuales
    const bodegaAnalysis = this.analyzeBodegasForOrder(order.pedidos);

    // CRÍTICO: Bloquear órdenes con múltiples bodegas por defecto
    if (!allowMultipleBodegas && bodegaAnalysis.hasMultipleBodegas) {
      errors.push('❌ CONSOLIDACIÓN BLOQUEADA: Esta orden contiene pedidos de múltiples bodegas');
      errors.push(`📦 Se detectaron ${bodegaAnalysis.bodegasInfo.length} bodegas diferentes:`);

      bodegaAnalysis.bodegasInfo.forEach(info => {
        const bodegaName = info.bodegaId === 'sin_bodega' ? '🚫 Sin bodega asignada' : `📍 Bodega: ${info.bodegaId}`;
        const pedidosText = info.pedidosIds.length > 0
          ? `(Pedidos: ${info.pedidosIds.join(', ')})`
          : `(${info.pedidosCount} pedido${info.pedidosCount > 1 ? 's' : ''})`;
        errors.push(`   ${bodegaName} ${pedidosText}`);
      });

      errors.push('💡 SOLUCIÓN: Cree envíos separados para cada bodega o configure allowMultipleBodegas=true');

      return {
        valid: false,
        errors,
        warnings,
        bodegaAnalysis
      };
    }

    // Si se permiten múltiples bodegas, agregar warnings del análisis
    if (bodegaAnalysis.hasMultipleBodegas) {
      warnings.push(...bodegaAnalysis.warnings);
    }

    // Validar cada pedido individualmente
    const pedidosInvalidos: string[] = [];
    const pedidosConAdvertencias: string[] = [];

    order.pedidos.forEach((pedido: Pedido, index: number) => {
      const validation = this.validatePedidoForShipment(pedido);

      if (!validation.valid) {
        pedidosInvalidos.push(`Pedido ${index + 1}: ${validation.errors.join(', ')}`);
      }

      // Advertencias sobre inconsistencias de direcciones y pagos (las bodegas ya se manejaron arriba)
      if (index > 0) {
        const firstPedido = order.pedidos[0];

        // Verificar si las direcciones son diferentes
        if (pedido.envio?.direccionEntrega !== firstPedido.envio?.direccionEntrega) {
          pedidosConAdvertencias.push(`Pedido ${index + 1} tiene dirección diferente al primer pedido`);
        }

        // Verificar si los métodos de pago son diferentes
        if (pedido.formaDePago !== firstPedido.formaDePago) {
          pedidosConAdvertencias.push(`Pedido ${index + 1} tiene método de pago diferente`);
        }
      }
    });

    errors.push(...pedidosInvalidos);
    warnings.push(...pedidosConAdvertencias);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      bodegaAnalysis
    };
  }
}