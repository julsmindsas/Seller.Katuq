/**
 * Script de diagnóstico de inventario — OH MY STORE vs ALIADO
 *
 * Consulta el inventario consolidado, bodegas, fulfillment providers,
 * y compara stock Katuq vs stock del aliado (fulfillment).
 *
 * USO:
 *   node scripts/inventario-diagnostico.js
 *
 * CONFIGURACIÓN:
 *   Editar las credenciales en la sección CONFIG abajo.
 *   Puedes obtener los valores del localStorage del navegador:
 *     - Abrir sellercenter.katuq.com (o localhost:4200) logueado como OH MY STORE
 *     - Abrir DevTools > Console
 *     - Ejecutar: JSON.parse(localStorage.getItem('user'))
 *     - Copiar token, company, nit, authorizationCode, email
 */

const https = require('https');
const http = require('http');

// ===================== CONFIG =====================
const CONFIG = {
  // Apuntar a producción o local
  // baseUrl: 'http://localhost:3300',
  baseUrl: 'https://back.katuq.com',

  // Credenciales del usuario de OH MY STORE
  token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMTQ0MDg4NzI1ICIsInJvbGUiOiJBRE1JTklTVFJBRE9SIEZVTEwgT0giLCJpYXQiOjE3NzU1OTIyMDEsImV4cCI6MTc3NTY3ODYwMX0.DYakdZxvmxfkaAQFTXrGpkFk8xZeEOSoscnraC5_Bho',
  company: 'OH MY STORE',
  user: '1144088725',
  usageCode: 'd1a42512-52b0-4ee0-94a3-4e875d4fc40b',
  email: 'director@ohmystore.shop',
};
// ==================================================

function getHeaders() {
  return {
    'Authorization': `Bearer ${CONFIG.token}`,
    'company': CONFIG.company,
    'user': CONFIG.user,
    'usage-code': CONFIG.usageCode,
    'email': CONFIG.email,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.baseUrl + path);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: getHeaders(),
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ===================== CONSULTAS =====================

async function getBodegas() {
  console.log('\n========================================');
  console.log('  1. BODEGAS DE LA EMPRESA');
  console.log('========================================');

  const res = await request('GET', '/v1/bodegas/all');

  if (res.status !== 200) {
    console.log(`  ERROR ${res.status}:`, res.data);
    return [];
  }

  const bodegas = Array.isArray(res.data) ? res.data : (res.data?.data || []);

  console.log(`  Total bodegas: ${bodegas.length}\n`);

  bodegas.forEach((b) => {
    const ff = b.fulfillmentProvider ? ` [FF: ${b.fulfillmentProvider}]` : '';
    const origen = b.origenFulfillment ? ' (importada de fulfillment)' : '';
    console.log(`  - ${b.nombre} (${b.idBodega}) | tipo: ${b.tipo}${ff}${origen}`);
    if (b.fulfillmentId) console.log(`    fulfillmentId: ${b.fulfillmentId}`);
    if (b.fulfillmentCode) console.log(`    fulfillmentCode: ${b.fulfillmentCode}`);
  });

  return bodegas;
}

async function getFulfillmentProviders() {
  console.log('\n========================================');
  console.log('  2. PROVIDERS DE FULFILLMENT');
  console.log('========================================');

  const res = await request('GET', `/v1/fulfillment/providers?companyId=${encodeURIComponent(CONFIG.company)}`);

  if (res.status !== 200) {
    console.log(`  ERROR ${res.status}:`, res.data);
    return [];
  }

  const providers = res.data?.data || res.data || [];

  if (providers.length === 0) {
    console.log('  No hay providers de fulfillment configurados.');
    return [];
  }

  providers.forEach((p) => {
    console.log(`  - ${p.provider} | status: ${p.status} | configured: ${p.configured}`);
    if (p.lastSync) console.log(`    lastSync: ${p.lastSync}`);
  });

  return providers;
}

async function getInventarioConsolidado(page = 1, limit = 50) {
  console.log('\n========================================');
  console.log(`  3. INVENTARIO CONSOLIDADO (página ${page}, limit ${limit})`);
  console.log('========================================');

  const params = `?limit=${limit}&page=${page}&soloInventariables=true&includeMetrics=true`;
  const res = await request('GET', `/v1/inventory/consolidado${params}`);

  if (res.status !== 200) {
    console.log(`  ERROR ${res.status}:`, res.data);
    return null;
  }

  const data = res.data;

  if (!data.success) {
    console.log('  Respuesta no exitosa:', data);
    return null;
  }

  console.log(`  Productos en esta página: ${data.productos?.length || 0}`);
  console.log(`  Total productos (inventariables): ${data.totalProductos || 'N/A'}`);

  if (data.totalesGlobales) {
    const tg = data.totalesGlobales;
    console.log(`\n  TOTALES GLOBALES:`);
    console.log(`    Valor total:       $${(tg.valorTotal || 0).toLocaleString()}`);
    console.log(`    Total unidades:    ${(tg.totalUnidades || 0).toLocaleString()}`);
    console.log(`    SKUs con stock:    ${tg.totalProductos || 0}`);
    console.log(`    SKUs catálogo:     ${tg.totalSKUsCatalogo || 0}`);
    console.log(`    Sin stock:         ${tg.productosSinStock || 0}`);
    console.log(`    Bajo stock:        ${tg.productosBajoStock || 0}`);
  }

  if (data.bodegas && data.bodegas.length > 0) {
    console.log(`\n  BODEGAS EN INVENTARIO:`);
    data.bodegas.forEach((b) => {
      const ff = b.fulfillmentProvider ? ` [${b.fulfillmentProvider}]` : '';
      const metricas = b.metricas
        ? ` | unidades: ${b.metricas.totalUnidades}, valor: $${(b.metricas.valorTotal || 0).toLocaleString()}`
        : '';
      console.log(`    - ${b.nombre} (${b.id})${ff}${metricas}`);
    });
  }

  return data;
}

async function listarProductosConFulfillment(inventarioData) {
  console.log('\n========================================');
  console.log('  4. PRODUCTOS CON ENLACE A FULFILLMENT');
  console.log('========================================');

  if (!inventarioData || !inventarioData.productos) {
    console.log('  No hay datos de inventario.');
    return [];
  }

  const productosConFF = inventarioData.productos.filter(p => p.fulfillmentId);
  const productosSinFF = inventarioData.productos.filter(p => !p.fulfillmentId);

  console.log(`  Con fulfillment:  ${productosConFF.length}`);
  console.log(`  Sin fulfillment:  ${productosSinFF.length}`);
  console.log(`  Total:            ${inventarioData.productos.length}`);

  if (productosConFF.length > 0) {
    console.log('\n  PRODUCTOS ENLAZADOS:');
    productosConFF.forEach((p) => {
      console.log(`\n  [${p.referencia}] ${p.nombre}`);
      console.log(`    Stock Katuq total: ${p.stockTotal}`);
      console.log(`    fulfillmentId: ${p.fulfillmentId}`);
      console.log(`    fulfillmentProvider: ${p.fulfillmentProvider}`);
      if (p.stockPorBodega) {
        Object.entries(p.stockPorBodega).forEach(([bodId, qty]) => {
          console.log(`    Bodega ${bodId}: ${qty} unidades`);
        });
      }
    });
  }

  if (productosSinFF.length > 0 && productosSinFF.length <= 20) {
    console.log('\n  PRODUCTOS SIN ENLACE A FULFILLMENT:');
    productosSinFF.forEach((p) => {
      console.log(`    [${p.referencia}] ${p.nombre} | stock: ${p.stockTotal}`);
    });
  } else if (productosSinFF.length > 20) {
    console.log(`\n  (${productosSinFF.length} productos sin fulfillment, mostrando primeros 20)`);
    productosSinFF.slice(0, 20).forEach((p) => {
      console.log(`    [${p.referencia}] ${p.nombre} | stock: ${p.stockTotal}`);
    });
  }

  return productosConFF;
}

async function compararStockConAliado(productosConFF, provider) {
  console.log('\n========================================');
  console.log('  5. COMPARACIÓN STOCK KATUQ vs ALIADO');
  console.log('========================================');

  if (!productosConFF || productosConFF.length === 0) {
    console.log('  No hay productos con fulfillment para comparar.');
    return;
  }

  if (!provider) {
    console.log('  No hay provider de fulfillment configurado.');
    return;
  }

  const resultados = [];
  let totalKatuq = 0;
  let totalAliado = 0;
  let conDiferencia = 0;
  let conError = 0;

  for (const producto of productosConFF) {
    process.stdout.write(`  Consultando ${producto.referencia}...`);

    try {
      const res = await request(
        'GET',
        `/v1/fulfillment/stock/${provider}/${producto.fulfillmentId}?companyId=${encodeURIComponent(CONFIG.company)}`
      );

      if (res.status === 200 && (res.data?.success || res.data?.data?.success)) {
        const data = res.data?.data || res.data;
        const stockAliado = data.totalStock ?? data.stock ?? 0;
        const stockKatuq = producto.stockTotal || 0;
        const diferencia = stockAliado - stockKatuq;

        totalKatuq += stockKatuq;
        totalAliado += stockAliado;
        if (diferencia !== 0) conDiferencia++;

        resultados.push({
          referencia: producto.referencia,
          nombre: producto.nombre,
          stockKatuq,
          stockAliado,
          diferencia,
          warehouses: data.warehouses || [],
        });

        const signo = diferencia > 0 ? '+' : '';
        const alerta = diferencia !== 0 ? ' <<<' : '';
        console.log(` Katuq: ${stockKatuq} | Aliado: ${stockAliado} | Dif: ${signo}${diferencia}${alerta}`);
      } else {
        conError++;
        console.log(` ERROR: ${res.data?.message || res.status}`);
        resultados.push({
          referencia: producto.referencia,
          nombre: producto.nombre,
          stockKatuq: producto.stockTotal || 0,
          stockAliado: null,
          diferencia: null,
          error: res.data?.message || `HTTP ${res.status}`,
        });
      }
    } catch (err) {
      conError++;
      console.log(` ERROR: ${err.message}`);
      resultados.push({
        referencia: producto.referencia,
        nombre: producto.nombre,
        stockKatuq: producto.stockTotal || 0,
        stockAliado: null,
        diferencia: null,
        error: err.message,
      });
    }

    // Pequeña pausa para no saturar el API
    await new Promise(r => setTimeout(r, 200));
  }

  // Resumen
  console.log('\n  ────────────────────────────────────');
  console.log('  RESUMEN DE CONCILIACIÓN');
  console.log('  ────────────────────────────────────');
  console.log(`  Total productos comparados: ${resultados.length}`);
  console.log(`  Con diferencia:             ${conDiferencia}`);
  console.log(`  Con error:                  ${conError}`);
  console.log(`  Stock total Katuq:          ${totalKatuq}`);
  console.log(`  Stock total Aliado:         ${totalAliado}`);
  console.log(`  Diferencia neta:            ${totalAliado - totalKatuq}`);

  if (conDiferencia > 0) {
    console.log('\n  PRODUCTOS CON DIFERENCIA:');
    resultados
      .filter(r => r.diferencia !== null && r.diferencia !== 0)
      .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia))
      .forEach((r) => {
        const signo = r.diferencia > 0 ? '+' : '';
        console.log(`    [${r.referencia}] ${r.nombre}`);
        console.log(`      Katuq: ${r.stockKatuq} | Aliado: ${r.stockAliado} | Dif: ${signo}${r.diferencia}`);
        if (r.warehouses && r.warehouses.length > 0) {
          r.warehouses.forEach(wh => {
            console.log(`        Bodega aliado "${wh.name}": ${wh.quantity ?? wh.available ?? 'N/A'}`);
          });
        }
      });
  }

  return resultados;
}

async function getDiagnostico() {
  console.log('\n========================================');
  console.log('  6. DIAGNÓSTICO DE INVENTARIO');
  console.log('========================================');

  const res = await request('GET', '/v1/inventory/diagnostico');

  if (res.status !== 200) {
    console.log(`  ERROR ${res.status}:`, typeof res.data === 'string' ? res.data.substring(0, 500) : res.data);
    return null;
  }

  const data = res.data?.data || res.data;

  if (data.inconsistencias) {
    console.log(`\n  Inconsistencias encontradas:`);
    Object.entries(data.inconsistencias).forEach(([tipo, items]) => {
      const count = Array.isArray(items) ? items.length : items;
      console.log(`    ${tipo}: ${count}`);
    });
  }

  if (data.resumen) {
    console.log(`\n  Resumen:`, JSON.stringify(data.resumen, null, 2));
  }

  return data;
}

// ===================== MAIN =====================

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  DIAGNÓSTICO DE INVENTARIO — OH MY STORE  ║');
  console.log('║  Conciliación Katuq vs Aliado             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n  Backend: ${CONFIG.baseUrl}`);
  console.log(`  Empresa: ${CONFIG.company}`);
  console.log(`  Fecha:   ${new Date().toISOString()}`);

  if (CONFIG.token === 'TU_TOKEN_AQUI') {
    console.log('\n  ⚠️  CONFIGURA LAS CREDENCIALES PRIMERO');
    console.log('  Abre el navegador logueado como OH MY STORE');
    console.log('  DevTools > Console > ejecuta:');
    console.log('    JSON.parse(localStorage.getItem("user"))');
    console.log('  Y copia token, company, nit, authorizationCode, email');
    console.log('  al CONFIG del script.\n');
    return;
  }

  try {
    // 1. Bodegas
    const bodegas = await getBodegas();

    // 2. Fulfillment providers
    const providers = await getFulfillmentProviders();
    const activeProvider = providers.find(p => p.configured);

    // 3. Inventario consolidado (primera página)
    const inventario = await getInventarioConsolidado(1, 100);

    // Si hay más páginas, cargar todo
    let todosLosProductos = inventario?.productos || [];
    if (inventario?.pagination?.hasMore) {
      let page = 2;
      while (true) {
        console.log(`\n  Cargando página ${page}...`);
        const pagina = await getInventarioConsolidado(page, 100);
        if (!pagina || !pagina.productos || pagina.productos.length === 0) break;
        todosLosProductos = todosLosProductos.concat(pagina.productos);
        if (!pagina.pagination?.hasMore) break;
        page++;
      }
      console.log(`\n  Total productos cargados: ${todosLosProductos.length}`);
    }

    // Usar todos los productos para el análisis
    const inventarioCompleto = { ...inventario, productos: todosLosProductos };

    // 4. Productos con fulfillment
    const productosConFF = await listarProductosConFulfillment(inventarioCompleto);

    // 5. Comparar con aliado
    if (activeProvider) {
      await compararStockConAliado(productosConFF, activeProvider.provider);
    }

    // 6. Diagnóstico general
    await getDiagnostico();

    console.log('\n========================================');
    console.log('  DIAGNÓSTICO COMPLETADO');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n  ERROR FATAL:', err.message);
    console.error(err.stack);
  }
}

main();
