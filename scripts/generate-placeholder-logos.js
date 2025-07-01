// Script para generar logos placeholder SVG para todas las integraciones faltantes
// Ejecutar con: node scripts/generate-placeholder-logos.js

const fs = require('fs');
const path = require('path');

// Configuración de colores y formas por categoría
const categoryStyles = {
  ecommerce: { color: '#95bf47', icon: 'shopping-cart' },
  payment: { color: '#6c5ce7', icon: 'credit-card' },
  logistics: { color: '#fd79a8', icon: 'truck' },
  marketing: { color: '#fdcb6e', icon: 'megaphone' },
  crm: { color: '#00b894', icon: 'users' },
  accounting: { color: '#0984e3', icon: 'calculator' },
  other: { color: '#636e72', icon: 'puzzle' }
};

// Catálogo de integraciones (mismo que en validate-logos.js)
const catalog = {
  ecommerce: [
    { id: 'shopify', name: 'Shopify' },
    { id: 'woocommerce', name: 'WooCommerce' },
    { id: 'magento', name: 'Magento' },
    { id: 'prestashop', name: 'PrestaShop' }
  ],
  payment: [
    { id: 'wompi', name: 'Wompi' },
    { id: 'epayco', name: 'ePayco' },
    { id: 'paypal', name: 'PayPal' },
    { id: 'stripe', name: 'Stripe' },
    { id: 'payu', name: 'PayU' },
    { id: 'mercadopago', name: 'Mercado Pago' }
  ],
  logistics: [
    { id: 'fedex', name: 'FedEx' },
    { id: 'dhl', name: 'DHL' },
    { id: 'servientrega', name: 'Servientrega' },
    { id: 'coordinadora', name: 'Coordinadora' }
  ],
  marketing: [
    { id: 'mailchimp', name: 'Mailchimp' },
    { id: 'hubspot', name: 'HubSpot' },
    { id: 'google_analytics', name: 'Google Analytics' }
  ],
  crm: [
    { id: 'salesforce', name: 'Salesforce' },
    { id: 'zoho_crm', name: 'Zoho CRM' }
  ],
  accounting: [
    { id: 'quickbooks', name: 'QuickBooks' },
    { id: 'siigo', name: 'Siigo' }
  ],
  other: [
    { id: 'slack', name: 'Slack' },
    { id: 'zapier', name: 'Zapier' }
  ]
};

function generateSVGLogo(integration, category) {
  const style = categoryStyles[category];
  const { color } = style;
  
  // Texto más corto para logos
  const displayName = integration.name.length > 10 
    ? integration.name.substring(0, 8) + '...' 
    : integration.name;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60">
  <rect width="100" height="60" fill="${color}" rx="8"/>
  <text x="50" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="11" font-weight="bold">${displayName}</text>
  <rect x="20" y="30" width="60" height="20" fill="white" opacity="0.2" rx="4"/>
  <circle cx="30" cy="40" r="4" fill="white" opacity="0.8"/>
  <circle cx="50" cy="40" r="4" fill="white" opacity="0.8"/>
  <circle cx="70" cy="40" r="4" fill="white" opacity="0.8"/>
</svg>`;
}

const logosDir = path.resolve(__dirname, '..', 'src', 'assets', 'images', 'logos');

// Asegurar que el directorio existe
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

let generated = 0;

console.log('🎨 Generando logos placeholder SVG...\n');

Object.entries(catalog).forEach(([category, integrations]) => {
  console.log(`📂 Categoría: ${category}`);
  
  integrations.forEach(integration => {
    const svgPath = path.resolve(logosDir, `${integration.id}.svg`);
    
    if (!fs.existsSync(svgPath)) {
      const svgContent = generateSVGLogo(integration, category);
      fs.writeFileSync(svgPath, svgContent);
      console.log(`  ✨ Generado: ${integration.id}.svg`);
      generated++;
    } else {
      console.log(`  ⏭️  Existe: ${integration.id}.svg`);
    }
  });
  console.log('');
});

console.log(`✅ Generados ${generated} logos placeholder SVG.`);
console.log('💡 Reemplaza estos archivos con logos oficiales cuando sea posible.'); 