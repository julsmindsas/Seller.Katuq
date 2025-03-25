import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Integration {
  id?: string;
  type: string;
  name: string;
  enabled: boolean;
  category: IntegrationCategory; // Añadido campo de categoría
  credentials: any;
  createdAt?: string;
  updatedAt?: string;
}

export enum IntegrationCategory {
  ECOMMERCE = 'ecommerce',
  PAYMENT = 'payment',
  LOGISTICS = 'logistics',
  MARKETING = 'marketing',
  CRM = 'crm',
  ACCOUNTING = 'accounting',
  OTHER = 'other'
}

// Categorías para mostrar en la interfaz de usuario
export const CATEGORY_LABELS = {
  [IntegrationCategory.ECOMMERCE]: 'Plataformas de E-commerce',
  [IntegrationCategory.PAYMENT]: 'Pasarelas de Pago',
  [IntegrationCategory.LOGISTICS]: 'Logística y Envíos',
  [IntegrationCategory.MARKETING]: 'Marketing y Publicidad',
  [IntegrationCategory.CRM]: 'CRM y Clientes',
  [IntegrationCategory.ACCOUNTING]: 'Contabilidad y Facturación',
  [IntegrationCategory.OTHER]: 'Otras Integraciones'
};

@Injectable({
  providedIn: 'root'
})
export class IntegrationsService {
  private apiUrl = `${environment.urlApi}/integrations`;

  constructor(private http: HttpClient) { }

  getIntegrations(): Observable<Integration[]> {
    return this.http.get<Integration[]>(this.apiUrl);
  }

  getIntegration(id: string): Observable<Integration> {
    return this.http.get<Integration>(`${this.apiUrl}/${id}`);
  }

  createIntegration(integration: Integration): Observable<Integration> {
    return this.http.post<Integration>(this.apiUrl, integration);
  }

  updateIntegration(id: string, integration: Integration): Observable<Integration> {
    return this.http.put<Integration>(`${this.apiUrl}/${id}`, integration);
  }

  deleteIntegration(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  testIntegration(integration: Integration): Observable<{success: boolean, message: string}> {
    return this.http.post<{success: boolean, message: string}>(`${this.apiUrl}/test`, integration);
  }

  // Método para obtener las integraciones disponibles por categoría
  getAvailableIntegrations(): { [category: string]: Array<{id: string, name: string, description: string, logo: string}> } {
    return {
      [IntegrationCategory.ECOMMERCE]: [
        { 
          id: 'shopify', 
          name: 'Shopify',
          description: 'Plataforma de comercio electrónico para tiendas online y sistemas de punto de venta',
          logo: 'assets/images/logos/shopify.png' 
        },
        { 
          id: 'woocommerce', 
          name: 'WooCommerce',
          description: 'Plataforma de eCommerce para WordPress',
          logo: 'assets/images/logos/woocommerce.png' 
        },
        { 
          id: 'magento', 
          name: 'Magento',
          description: 'Plataforma de comercio electrónico de Adobe',
          logo: 'assets/images/logos/magento.png' 
        },
        { 
          id: 'prestashop', 
          name: 'PrestaShop',
          description: 'Sistema de gestión de contenido de código abierto para eCommerce',
          logo: 'assets/images/logos/prestashop.png' 
        }
      ],
      [IntegrationCategory.PAYMENT]: [
        { 
          id: 'wompi', 
          name: 'Wompi',
          description: 'Pasarela de pagos digital para Colombia y Latinoamérica',
          logo: 'assets/images/logos/wompi.png' 
        },
        { 
          id: 'epayco', 
          name: 'ePayco',
          description: 'Pasarela de pagos colombiana con múltiples medios de pago',
          logo: 'assets/images/logos/epayco.png' 
        },
        { 
          id: 'paypal', 
          name: 'PayPal',
          description: 'Sistema global de pagos en línea',
          logo: 'assets/images/logos/paypal.png' 
        },
        { 
          id: 'stripe', 
          name: 'Stripe',
          description: 'Plataforma de procesamiento de pagos para negocios en Internet',
          logo: 'assets/images/logos/stripe.png' 
        },
        { 
          id: 'payu', 
          name: 'PayU',
          description: 'Proveedor global de servicios de pago para comercio electrónico',
          logo: 'assets/images/logos/payu.png' 
        },
        { 
          id: 'mercadopago', 
          name: 'Mercado Pago',
          description: 'Plataforma de pagos de Mercado Libre para Latinoamérica',
          logo: 'assets/images/logos/mercadopago.png' 
        }
      ],
      [IntegrationCategory.LOGISTICS]: [
        { 
          id: 'fedex', 
          name: 'FedEx',
          description: 'Servicios de envío y seguimiento internacional',
          logo: 'assets/images/logos/fedex.png' 
        },
        { 
          id: 'dhl', 
          name: 'DHL',
          description: 'Logística global y envíos internacionales',
          logo: 'assets/images/logos/dhl.png' 
        },
        { 
          id: 'servientrega', 
          name: 'Servientrega',
          description: 'Empresa de logística y entregas en Colombia',
          logo: 'assets/images/logos/servientrega.png' 
        },
        { 
          id: 'coordinadora', 
          name: 'Coordinadora',
          description: 'Servicio de entrega puerta a puerta de Colombia',
          logo: 'assets/images/logos/coordinadora.png' 
        }
      ],
      [IntegrationCategory.MARKETING]: [
        { 
          id: 'mailchimp', 
          name: 'Mailchimp',
          description: 'Plataforma de automatización de marketing y email marketing',
          logo: 'assets/images/logos/mailchimp.png' 
        },
        { 
          id: 'hubspot', 
          name: 'HubSpot',
          description: 'Plataforma de inbound marketing, ventas y servicio al cliente',
          logo: 'assets/images/logos/hubspot.png' 
        },
        { 
          id: 'google_analytics', 
          name: 'Google Analytics',
          description: 'Servicio de análisis web para el seguimiento del tráfico',
          logo: 'assets/images/logos/google-analytics.png' 
        }
      ],
      [IntegrationCategory.CRM]: [
        { 
          id: 'salesforce', 
          name: 'Salesforce',
          description: 'Plataforma CRM para gestión de clientes y ventas',
          logo: 'assets/images/logos/salesforce.png' 
        },
        { 
          id: 'zoho_crm', 
          name: 'Zoho CRM',
          description: 'Software de gestión de relación con el cliente',
          logo: 'assets/images/logos/zoho-crm.png' 
        }
      ],
      [IntegrationCategory.ACCOUNTING]: [
        { 
          id: 'quickbooks', 
          name: 'QuickBooks',
          description: 'Software de contabilidad para pequeñas y medianas empresas',
          logo: 'assets/images/logos/quickbooks.png' 
        },
        { 
          id: 'siigo', 
          name: 'Siigo',
          description: 'Software contable y administrativo colombiano',
          logo: 'assets/images/logos/siigo.png' 
        }
      ],
      [IntegrationCategory.OTHER]: [
        { 
          id: 'slack', 
          name: 'Slack',
          description: 'Plataforma de comunicación empresarial',
          logo: 'assets/images/logos/slack.png' 
        },
        { 
          id: 'zapier', 
          name: 'Zapier',
          description: 'Plataforma de automatización que conecta apps y servicios',
          logo: 'assets/images/logos/zapier.png' 
        }
      ]
    };
  }
}
