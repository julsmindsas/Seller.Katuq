import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { KatuqQuickStartService } from '../../../shared/services/quickstart/katuq-quickstart.service';
import { CommerceContext, AISuggestion, OnboardingStepId } from '../models/onboarding-state.model';

/**
 * Servicio para integración con IA (KAI) en el onboarding
 * Proporciona sugerencias automáticas basadas en el sector del comercio
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingAIService {

  constructor(private katuqQuickStartService: KatuqQuickStartService) {}

  // ==================== OBTENCIÓN DE CONTEXTO ====================

  /**
   * Obtiene el contexto del comercio desde el diagnóstico guardado
   */
  getCommerceContext(): CommerceContext | null {
    try {
      // El diagnóstico se guarda durante el proceso de registro
      const diagnosticData = localStorage.getItem('diagnostic_data');
      if (!diagnosticData) return null;

      const diagnostic = JSON.parse(diagnosticData);

      return {
        sector: diagnostic.sector || diagnostic.respuestas?.q1 || 'General',
        digitalizationLevel: diagnostic.respuestas?.q3 || 'Básico',
        catalogSize: diagnostic.respuestas?.q6 || 'Medio',
        salesChannel: diagnostic.respuestas?.q8 || 'Mixto',
        inventoryManagement: diagnostic.respuestas?.q12 || 'Mantengo inventario',
        mainGoal: diagnostic.respuestas?.q26 || 'Crecer',
        mainObstacle: diagnostic.respuestas?.q27 || 'Tecnología'
      };
    } catch (error) {
      console.warn('Error obteniendo contexto del comercio:', error);
      return null;
    }
  }

  // ==================== SUGERENCIAS POR PASO ====================

  /**
   * Obtiene sugerencias de IA para información de empresa
   */
  async getCompanyInfoSuggestions(companyName: string): Promise<AISuggestion | null> {
    try {
      const context = this.getCommerceContext();
      if (!context) return null;

      // Generar sugerencias basadas en el sector
      const suggestedData = {
        nombre: companyName,
        nomComercial: companyName,
        descripcion: this.generateCompanyDescription(context.sector),
        emailContactoGeneral: '', // Usuario debe llenar
        cel: '', // Usuario debe llenar
        pais: 'Colombia',
        ciudad: '', // Usuario debe llenar
        direccion: '' // Usuario debe llenar
      };

      return {
        stepId: OnboardingStepId.COMPANY_INFO,
        suggestedData,
        confidence: 0.7,
        reasoning: `Información sugerida para un negocio del sector: ${context.sector}`
      };
    } catch (error) {
      console.error('Error generando sugerencias de empresa:', error);
      return null;
    }
  }

  /**
   * Obtiene sugerencias de roles basadas en el tamaño y sector
   */
  async getRolesSuggestions(): Promise<AISuggestion | null> {
    try {
      const context = this.getCommerceContext();
      const company = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');

      // Por ahora usamos menús por defecto, en el futuro se puede integrar con KAI
      const menus = this.getDefaultMenus();

      const suggestedData = {
        rol: 'Administrador',
        empresa: company.nomComercial || company.nombre,
        menus: menus,
        descripcion: 'Rol con acceso completo al sistema'
      };

      return {
        stepId: OnboardingStepId.ROLES_SETUP,
        suggestedData,
        confidence: 0.9,
        reasoning: 'Rol de administrador con módulos adaptados a tu sector'
      };
    } catch (error) {
      console.error('Error generando sugerencias de roles:', error);
      return null;
    }
  }

  /**
   * Obtiene sugerencias de formas de entrega según el sector
   */
  async getDeliveryMethodsSuggestions(): Promise<AISuggestion | null> {
    try {
      const context = this.getCommerceContext();
      if (!context) return null;

      const deliveryMethods = this.getDeliveryMethodsBySector(context.sector, context.salesChannel);

      return {
        stepId: OnboardingStepId.DELIVERY_METHODS,
        suggestedData: deliveryMethods,
        confidence: 0.85,
        reasoning: `Formas de entrega comunes en el sector ${context.sector}`
      };
    } catch (error) {
      console.error('Error generando sugerencias de entregas:', error);
      return null;
    }
  }

  /**
   * Obtiene sugerencias de tipos de entrega
   */
  async getDeliveryTypesSuggestions(): Promise<AISuggestion | null> {
    try {
      const context = this.getCommerceContext();

      const deliveryTypes = [
        {
          nombre: 'Normal',
          descripcion: 'Entrega estándar',
          activo: true,
          tiempoEstimado: '3-5 días'
        },
        {
          nombre: 'Express',
          descripcion: 'Entrega rápida',
          activo: context?.mainGoal.includes('rapid') || context?.salesChannel.includes('E-commerce'),
          tiempoEstimado: '1-2 días'
        },
        {
          nombre: 'Programada',
          descripcion: 'Entrega en fecha específica',
          activo: context?.sector.includes('Regalo') || context?.sector.includes('Pastelería'),
          tiempoEstimado: 'Según programación'
        }
      ];

      return {
        stepId: OnboardingStepId.DELIVERY_TYPES,
        suggestedData: deliveryTypes,
        confidence: 0.8,
        reasoning: 'Tipos de entrega adaptados a tu modelo de negocio'
      };
    } catch (error) {
      console.error('Error generando sugerencias de tipos de entrega:', error);
      return null;
    }
  }

  /**
   * Obtiene sugerencias de tiempos de entrega
   */
  async getDeliveryTimesSuggestions(): Promise<AISuggestion | null> {
    try {
      const deliveryTimes = [
        {
          nombre: '1-3 días hábiles',
          diasMin: 1,
          diasMax: 3,
          activo: true
        },
        {
          nombre: '3-5 días hábiles',
          diasMin: 3,
          diasMax: 5,
          activo: true
        },
        {
          nombre: '5-7 días hábiles',
          diasMin: 5,
          diasMax: 7,
          activo: true
        },
        {
          nombre: 'Mismo día',
          diasMin: 0,
          diasMax: 0,
          activo: false
        }
      ];

      return {
        stepId: OnboardingStepId.DELIVERY_TIMES,
        suggestedData: deliveryTimes,
        confidence: 0.75,
        reasoning: 'Rangos de tiempo estándar para entregas'
      };
    } catch (error) {
      console.error('Error generando sugerencias de tiempos:', error);
      return null;
    }
  }

  /**
   * Obtiene sugerencias de formas de pago según el sector
   */
  async getPaymentMethodsSuggestions(): Promise<AISuggestion | null> {
    try {
      const context = this.getCommerceContext();
      if (!context) return null;

      const paymentMethods = this.getPaymentMethodsBySector(context.sector, context.salesChannel);

      return {
        stepId: OnboardingStepId.PAYMENT_METHODS,
        suggestedData: paymentMethods,
        confidence: 0.9,
        reasoning: `Métodos de pago populares en ${context.sector}`
      };
    } catch (error) {
      console.error('Error generando sugerencias de pagos:', error);
      return null;
    }
  }

  /**
   * Obtiene sugerencias de categorías según el sector
   */
  async getCategoriesSuggestions(): Promise<AISuggestion | null> {
    try {
      const context = this.getCommerceContext();
      if (!context) return null;

      const categories = this.getCategoriesBySector(context.sector);

      return {
        stepId: OnboardingStepId.CATEGORIES,
        suggestedData: categories,
        confidence: 0.85,
        reasoning: `Categorías típicas del sector ${context.sector}`
      };
    } catch (error) {
      console.error('Error generando sugerencias de categorías:', error);
      return null;
    }
  }

  /**
   * Obtiene sugerencias de adiciones/extras
   */
  async getAddonsSuggestions(): Promise<AISuggestion | null> {
    try {
      const context = this.getCommerceContext();
      if (!context) return null;

      const addons = this.getAddonsBySector(context.sector);

      return {
        stepId: OnboardingStepId.ADDONS,
        suggestedData: addons,
        confidence: 0.7,
        reasoning: 'Productos complementarios comunes en tu sector'
      };
    } catch (error) {
      console.error('Error generando sugerencias de adiciones:', error);
      return null;
    }
  }

  /**
   * Obtiene sugerencias para primer producto
   */
  async getFirstProductSuggestion(): Promise<AISuggestion | null> {
    try {
      const context = this.getCommerceContext();
      const company = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');

      const demoProduct = {
        crearProducto: {
          titulo: this.getProductNameBySector(context?.sector || 'General'),
          descripcion: 'Producto de demostración para empezar a vender',
          palabrasClave: ['demo', 'ejemplo', context?.sector?.toLowerCase() || 'general']
        },
        precio: {
          precioUnitarioConIVA: 50000,
          valorIVA: 9500,
          precioUnitarioSinIVA: 40500
        },
        disponibilidad: {
          activo: true,
          disponibleParaVenta: true
        },
        empresa: company.nomComercial || company.nombre
      };

      return {
        stepId: OnboardingStepId.FIRST_PRODUCT,
        suggestedData: demoProduct,
        confidence: 0.6,
        reasoning: 'Producto de ejemplo para que puedas empezar rápidamente'
      };
    } catch (error) {
      console.error('Error generando sugerencia de producto:', error);
      return null;
    }
  }

  // ==================== FUNCIONES HELPER POR SECTOR ====================

  /**
   * Genera descripción de empresa según el sector
   */
  private generateCompanyDescription(sector: string): string {
    const descriptions: { [key: string]: string } = {
      'Retail - Comercial': 'Comercio dedicado a la venta de productos al por menor',
      'Restaurante': 'Negocio de alimentos y bebidas',
      'Pastelería': 'Repostería y productos dulces artesanales',
      'Regalos': 'Tienda especializada en artículos de regalo',
      'Manufactura': 'Empresa dedicada a la producción y fabricación',
      'Servicios profesionales': 'Prestación de servicios especializados',
      'Tecnología y Software': 'Desarrollo y venta de soluciones tecnológicas',
      'Moda y Accesorios': 'Tienda de ropa, calzado y accesorios'
    };

    return descriptions[sector] || 'Comercio dedicado a la venta de productos y servicios';
  }

  /**
   * Obtiene formas de entrega según sector
   */
  private getDeliveryMethodsBySector(sector: string, salesChannel: string): any[] {
    const baseDeliveries = [
      {
        nombre: 'Entrega a domicilio',
        descripcion: 'Envío a la dirección del cliente',
        activo: true
      }
    ];

    // Agregar recogida en tienda si tiene POS
    if (salesChannel.includes('físico') || salesChannel.includes('POS')) {
      baseDeliveries.push({
        nombre: 'Recogida en tienda',
        descripcion: 'Cliente recoge en punto físico',
        activo: true
      });
    }

    // Agregar envío nacional si es e-commerce
    if (salesChannel.includes('E-commerce') || salesChannel.includes('online')) {
      baseDeliveries.push({
        nombre: 'Envío nacional',
        descripcion: 'Cobertura a nivel nacional',
        activo: true
      });
    }

    // Envío express para sectores específicos
    if (sector.includes('Restaurante') || sector.includes('Pastelería')) {
      baseDeliveries.push({
        nombre: 'Envío express',
        descripcion: 'Entrega en menos de 2 horas',
        activo: false
      });
    }

    return baseDeliveries;
  }

  /**
   * Obtiene formas de pago según sector
   */
  private getPaymentMethodsBySector(sector: string, salesChannel: string): any[] {
    const baseMethods = [
      {
        nombre: 'Efectivo',
        descripcion: 'Pago en efectivo',
        activo: true,
        requiereIntegracion: false
      },
      {
        nombre: 'Transferencia bancaria',
        descripcion: 'Transferencia a cuenta bancaria',
        activo: true,
        requiereIntegracion: false
      }
    ];

    // Tarjetas para todos los sectores
    baseMethods.push({
      nombre: 'Tarjeta de crédito',
      descripcion: 'Pago con tarjeta de crédito',
      activo: salesChannel.includes('E-commerce'),
      requiereIntegracion: true
    });

    baseMethods.push({
      nombre: 'Tarjeta débito',
      descripcion: 'Pago con tarjeta débito',
      activo: salesChannel.includes('E-commerce') || salesChannel.includes('POS'),
      requiereIntegracion: true
    });

    // PSE para e-commerce
    if (salesChannel.includes('E-commerce') || salesChannel.includes('online')) {
      baseMethods.push({
        nombre: 'PSE',
        descripcion: 'Pago seguro en línea',
        activo: true,
        requiereIntegracion: true
      });
    }

    // Contra entrega para delivery
    if (sector.includes('Restaurante') || sector.includes('Regalos')) {
      baseMethods.push({
        nombre: 'Pago contra entrega',
        descripcion: 'Pago al recibir el producto',
        activo: true,
        requiereIntegracion: false
      });
    }

    return baseMethods;
  }

  /**
   * Obtiene categorías sugeridas según sector
   */
  private getCategoriesBySector(sector: string): any[] {
    const categoriesBySector: { [key: string]: string[] } = {
      'Retail - Comercial': ['Electrónica', 'Hogar', 'Deportes', 'Juguetes'],
      'Restaurante': ['Entradas', 'Platos fuertes', 'Bebidas', 'Postres'],
      'Pastelería': ['Tortas', 'Cupcakes', 'Galletas', 'Panes'],
      'Regalos': ['Cumpleaños', 'Aniversarios', 'Graduaciones', 'Amor y amistad'],
      'Moda y Accesorios': ['Ropa hombre', 'Ropa mujer', 'Calzado', 'Accesorios'],
      'Tecnología y Software': ['Software', 'Hardware', 'Servicios', 'Licencias'],
      'Manufactura': ['Materia prima', 'Productos terminados', 'Herramientas', 'Insumos']
    };

    const categoryNames = categoriesBySector[sector] || ['Categoría 1', 'Categoría 2', 'Categoría 3'];

    return categoryNames.map((name, index) => ({
      label: name,
      data: name.toLowerCase().replace(/\s+/g, '-'),
      children: [],
      nombre: name,
      imagen: '',
      posicion: index,
      activo: true
    }));
  }

  /**
   * Obtiene adiciones/extras según sector
   */
  private getAddonsBySector(sector: string): any[] {
    const addonsBySector: { [key: string]: any[] } = {
      'Regalos': [
        { nombre: 'Tarjeta de felicitación', precio: 3000, activo: true },
        { nombre: 'Empaque de regalo', precio: 5000, activo: true },
        { nombre: 'Globo personalizado', precio: 8000, activo: true }
      ],
      'Pastelería': [
        { nombre: 'Velas numéricas', precio: 2000, activo: true },
        { nombre: 'Mensaje personalizado', precio: 5000, activo: true }
      ],
      'Restaurante': [
        { nombre: 'Cubiertos desechables', precio: 1000, activo: true },
        { nombre: 'Servilletas', precio: 500, activo: true }
      ]
    };

    return addonsBySector[sector] || [];
  }

  /**
   * Obtiene nombre de producto demo según sector
   */
  private getProductNameBySector(sector: string): string {
    const productNames: { [key: string]: string } = {
      'Retail - Comercial': 'Producto demo',
      'Restaurante': 'Plato especial',
      'Pastelería': 'Torta clásica',
      'Regalos': 'Detalle especial',
      'Moda y Accesorios': 'Artículo de temporada',
      'Tecnología y Software': 'Licencia básica',
      'Manufactura': 'Producto estándar'
    };

    return productNames[sector] || 'Producto de demostración';
  }

  /**
   * Obtiene menús por defecto si falla la IA
   */
  private getDefaultMenus(): any[] {
    return [
      {
        path: 'dashboards',
        title: 'Dashboard',
        type: 'link'
      },
      {
        path: 'ventas/pedidos',
        title: 'Pedidos',
        type: 'link'
      },
      {
        path: 'ventas/crear-ventas',
        title: 'Crear Venta',
        type: 'link'
      },
      {
        path: 'productos',
        title: 'Productos',
        type: 'link'
      },
      {
        path: 'inventario/inventario-catalogo',
        title: 'Inventario',
        type: 'link'
      }
    ];
  }

  // ==================== UTILIDADES ====================

  /**
   * Aplica todas las sugerencias de IA a la vez
   */
  async applyAllSuggestions(): Promise<{[key: string]: any}> {
    try {
      const suggestions: {[key: string]: any} = {};

      // Obtener todas las sugerencias en paralelo
      const [
        deliveryMethods,
        deliveryTypes,
        deliveryTimes,
        paymentMethods,
        categories,
        addons,
        firstProduct
      ] = await Promise.all([
        this.getDeliveryMethodsSuggestions(),
        this.getDeliveryTypesSuggestions(),
        this.getDeliveryTimesSuggestions(),
        this.getPaymentMethodsSuggestions(),
        this.getCategoriesSuggestions(),
        this.getAddonsSuggestions(),
        this.getFirstProductSuggestion()
      ]);

      if (deliveryMethods) suggestions[OnboardingStepId.DELIVERY_METHODS] = deliveryMethods;
      if (deliveryTypes) suggestions[OnboardingStepId.DELIVERY_TYPES] = deliveryTypes;
      if (deliveryTimes) suggestions[OnboardingStepId.DELIVERY_TIMES] = deliveryTimes;
      if (paymentMethods) suggestions[OnboardingStepId.PAYMENT_METHODS] = paymentMethods;
      if (categories) suggestions[OnboardingStepId.CATEGORIES] = categories;
      if (addons) suggestions[OnboardingStepId.ADDONS] = addons;
      if (firstProduct) suggestions[OnboardingStepId.FIRST_PRODUCT] = firstProduct;

      return suggestions;
    } catch (error) {
      console.error('Error aplicando sugerencias:', error);
      return {};
    }
  }
}
