// Script para validar que todos los logos declarados en el catálogo de integraciones existan en el sistema de archivos.
// Ejecutar con: npx ts-node scripts/validate-logos.ts

import { IntegrationsService } from '../src/app/components/integrations/integrations.service';
import * as fs from 'fs';
import * as path from 'path';

const service = new IntegrationsService(null as any);
const catalog = service.getAvailableIntegrations();

let missing = 0;

Object.entries(catalog).forEach(([category, integrations]) => {
  integrations.forEach(int => {
    const logoPath = path.resolve(__dirname, '..', int.logo);
    if (!fs.existsSync(logoPath)) {
      console.error(`[MISSING] ${int.id} (${category}) – ${int.logo}`);
      missing++;
    }
  });
});

if (missing > 0) {
  console.error(`\n❌ Se encontraron ${missing} logos faltantes.`);
  process.exit(1);
}

console.log('✅ Todos los logos existen'); 