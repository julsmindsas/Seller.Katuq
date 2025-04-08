import { Injectable } from '@angular/core';

export interface IntegrationLogoInfo {
  id: string;
  name: string;
  logo: string;
  icon: string;
  description: string;
  category: string;
  popular?: boolean;
  new?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationLogosService {
  private integrationLogos: { [key: string]: string } = {
    // Pasarelas de pago
    stripe: 'assets/images/logos/stripe.png',
    paypal: 'assets/images/logos/paypal.png',
    mercadopago: 'assets/images/logos/mercadopago.png',
    square: 'assets/images/logos/square.png',
    conekta: 'assets/images/logos/conekta.png',
    
    // Ecommerce
    shopify: 'assets/images/logos/shopify.png',
    woocommerce: 'assets/images/logos/woocommerce.png',
    magento: 'assets/images/logos/magento.png',
    prestashop: 'assets/images/logos/prestashop.png',
    vtex: 'assets/images/logos/vtex.png',
    
    // Marketing
    mailchimp: 'assets/images/logos/mailchimp.png',
    sendgrid: 'assets/images/logos/sendgrid.png',
    hubspot: 'assets/images/logos/hubspot.png',
    klaviyo: 'assets/images/logos/klaviyo.png',
    
    // CRM
    salesforce: 'assets/images/logos/salesforce.png',
    zoho: 'assets/images/logos/zoho.png',
    
    // Logística
    dhl: 'assets/images/logos/dhl.png',
    fedex: 'assets/images/logos/fedex.png',
    ups: 'assets/images/logos/ups.png',
    usps: 'assets/images/logos/usps.png',
  };

  private categoryIcons: { [key: string]: string } = {
    payment: 'fa-credit-card',
    ecommerce: 'fa-shopping-cart',
    marketing: 'fa-bullhorn',
    crm: 'fa-users',
    logistics: 'fa-truck',
    accounting: 'fa-calculator'
  };

  private integrationIcons: { [key: string]: string } = {
    stripe: 'fa-cc-stripe',
    paypal: 'fa-paypal',
    mercadopago: 'fa-money',
    shopify: 'fa-shopping-bag',
    woocommerce: 'fa-wordpress',
    mailchimp: 'fa-envelope',
    dhl: 'fa-truck',
    salesforce: 'fa-cloud'
    // Valores por defecto se manejan en getIntegrationIcon()
  };

  constructor() { }

  getIntegrationLogo(integrationType: string): string {
    return this.integrationLogos[integrationType.toLowerCase()] || null;
  }

  getIntegrationIcon(integrationType: string): string {
    return this.integrationIcons[integrationType.toLowerCase()] || 'fa-plug';
  }

  getCategoryIcon(category: string): string {
    return this.categoryIcons[category.toLowerCase()] || 'fa-puzzle-piece';
  }

  getAllIntegrations(): IntegrationLogoInfo[] {
    const integrations: IntegrationLogoInfo[] = [];
    
    Object.keys(this.integrationLogos).forEach(id => {
      let category = this.getCategoryFromId(id);
      
      integrations.push({
        id,
        name: this.getReadableName(id),
        logo: this.integrationLogos[id],
        icon: this.getIntegrationIcon(id),
        description: `Integra tu tienda con ${this.getReadableName(id)}`,
        category,
        popular: ['stripe', 'paypal', 'shopify', 'mailchimp', 'mercadopago'].includes(id),
        new: ['klaviyo', 'vtex'].includes(id)
      });
    });
    
    return integrations;
  }

  getIntegrationsForCategory(category: string): IntegrationLogoInfo[] {
    return this.getAllIntegrations().filter(integration => integration.category === category);
  }
  
  getTopSuggestionsForCategory(category: string, limit: number = 3): IntegrationLogoInfo[] {
    // Obtener todas las integraciones de la categoría
    const integrations = this.getIntegrationsForCategory(category);
    
    // Ordenar por popularidad primero, luego por si son nuevas
    return integrations
      .sort((a, b) => {
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        if (a.new && !b.new) return -1;
        if (!a.new && b.new) return 1;
        return 0;
      })
      .slice(0, limit)
      .map(integration => {
        // Asegurarnos de que los logos usen rutas locales para mejor confiabilidad
        return {
          ...integration,
          logo: `assets/images/logos/${integration.id}.png` // Usar rutas locales
        };
      });
  }
  
  private getCategoryFromId(id: string): string {
    const paymentProviders = ['stripe', 'paypal', 'mercadopago', 'square', 'conekta'];
    const ecommerceProviders = ['shopify', 'woocommerce', 'magento', 'prestashop', 'vtex'];
    const marketingProviders = ['mailchimp', 'sendgrid', 'hubspot', 'klaviyo'];
    const crmProviders = ['salesforce', 'zoho'];
    const logisticsProviders = ['dhl', 'fedex', 'ups', 'usps'];
    
    if (paymentProviders.includes(id)) return 'payment';
    if (ecommerceProviders.includes(id)) return 'ecommerce';
    if (marketingProviders.includes(id)) return 'marketing';
    if (crmProviders.includes(id)) return 'crm';
    if (logisticsProviders.includes(id)) return 'logistics';
    
    return 'other';
  }
  
  private getReadableName(id: string): string {
    const names: { [key: string]: string } = {
      stripe: 'Stripe',
      paypal: 'PayPal',
      mercadopago: 'Mercado Pago',
      square: 'Square',
      conekta: 'Conekta',
      shopify: 'Shopify',
      woocommerce: 'WooCommerce',
      magento: 'Magento',
      prestashop: 'PrestaShop',
      vtex: 'VTEX',
      mailchimp: 'Mailchimp',
      sendgrid: 'SendGrid',
      hubspot: 'HubSpot',
      klaviyo: 'Klaviyo',
      salesforce: 'Salesforce',
      zoho: 'Zoho CRM',
      dhl: 'DHL',
      fedex: 'FedEx',
      ups: 'UPS',
      usps: 'USPS'
    };
    
    return names[id.toLowerCase()] || id.charAt(0).toUpperCase() + id.slice(1);
  }
}
