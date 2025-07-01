// Script para validar que todos los logos declarados en el catálogo de integraciones existan en el sistema de archivos.
// Ejecutar con: node scripts/validate-logos.js

const fs = require('fs');
const path = require('path');

// Catálogo de integraciones (extraído directamente para evitar imports de Angular)
const catalog = {
  ecommerce: [
    { id: 'shopify', name: 'Shopify', logo: 'src/assets/images/logos/shopify.svg' },
    { id: 'woocommerce', name: 'WooCommerce', logo: 'src/assets/images/logos/woocommerce.svg' },
    { id: 'magento', name: 'Magento', logo: 'src/assets/images/logos/magento.svg' },
    { id: 'prestashop', name: 'PrestaShop', logo: 'src/assets/images/logos/prestashop.svg' }
  ],
  payment: [
    { id: 'wompi', name: 'Wompi', logo: 'src/assets/images/logos/wompi.svg' },
    { id: 'epayco', name: 'ePayco', logo: 'src/assets/images/logos/epayco.svg' },
    { id: 'paypal', name: 'PayPal', logo: 'src/assets/images/logos/paypal.svg' },
    { id: 'stripe', name: 'Stripe', logo: 'src/assets/images/logos/stripe.svg' },
    { id: 'payu', name: 'PayU', logo: 'src/assets/images/logos/payu.svg' },
    { id: 'mercadopago', name: 'Mercado Pago', logo: 'src/assets/images/logos/mercadopago.svg' }
  ],
  logistics: [
    { id: 'fedex', name: 'FedEx', logo: 'src/assets/images/logos/fedex.svg' },
    { id: 'dhl', name: 'DHL', logo: 'src/assets/images/logos/dhl.svg' },
    { id: 'servientrega', name: 'Servientrega', logo: 'src/assets/images/logos/servientrega.svg' },
    { id: 'coordinadora', name: 'Coordinadora', logo: 'src/assets/images/logos/coordinadora.svg' }
  ],
  marketing: [
    { id: 'mailchimp', name: 'Mailchimp', logo: 'src/assets/images/logos/mailchimp.svg' },
    { id: 'hubspot', name: 'HubSpot', logo: 'src/assets/images/logos/hubspot.svg' },
    { id: 'google_analytics', name: 'Google Analytics', logo: 'src/assets/images/logos/google_analytics.svg' }
  ],
  crm: [
    { id: 'salesforce', name: 'Salesforce', logo: 'src/assets/images/logos/salesforce.svg' },
    { id: 'zoho_crm', name: 'Zoho CRM', logo: 'src/assets/images/logos/zoho_crm.svg' }
  ],
  accounting: [
    { id: 'quickbooks', name: 'QuickBooks', logo: 'src/assets/images/logos/quickbooks.svg' },
    { id: 'siigo', name: 'Siigo', logo: 'src/assets/images/logos/siigo.svg' }
  ],
  other: [
    { id: 'slack', name: 'Slack', logo: 'src/assets/images/logos/slack.svg' },
    { id: 'zapier', name: 'Zapier', logo: 'src/assets/images/logos/zapier.svg' }
  ]
};

let missing = 0;
const srcPath = path.resolve(__dirname, '..');

console.log('🔍 Validando logos de integraciones...\n');

Object.entries(catalog).forEach(([category, integrations]) => {
  console.log(`📂 Categoría: ${category}`);
  
  integrations.forEach(int => {
    const logoPath = path.resolve(srcPath, int.logo);
    if (!fs.existsSync(logoPath)) {
      console.error(`  ❌ [FALTA] ${int.id} – ${int.logo}`);
      missing++;
    } else {
      console.log(`  ✅ ${int.id}`);
    }
  });
  console.log('');
});

if (missing > 0) {
  console.error(`❌ Se encontraron ${missing} logos faltantes.`);
  console.log('\n💡 Sugerencia: Descarga los logos oficiales desde:');
  console.log('   - Shopify: https://shopify.dev/brand');
  console.log('   - PayPal: https://www.paypal.com/us/webapps/mpp/logo-center');
  console.log('   - Stripe: https://stripe.com/img/v3/home/twitter-large.png');
  console.log('   - Wompi: https://docs.wompi.co');
  console.log('   - etc.');
  process.exit(1);
}

console.log('✅ Todos los logos existen en el sistema de archivos.'); 