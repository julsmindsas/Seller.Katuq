# Runbook — Cómo debuggear un flow contra Firestore en vivo

> Este runbook documenta los snippets EXACTOS que se usaron en sesión 2026-05-13 para descubrir los hallazgos de `findings.md`. Sirve para que cualquier sesión futura pueda reproducir y verificar.

## Pre-requisitos

- Estar en directorio `katuq_admin_back_firebase/functions/`.
- `serviceAccountKey.json` presente (gitignored).
- Node.js 20+.

```bash
cd /Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/katuq_admin_back_firebase/functions
```

## 1. Listar flows definidos para una empresa

```js
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')), projectId: 'julsmind-katuq' });
const db = admin.firestore();
(async () => {
  const flows = await db.collection('flows').where('companyId','==','OH MY STORE').get();
  flows.forEach(d => {
    const x = d.data();
    console.log(d.id, '| status:', x.status, '| nodos:', (x.graph?.nodes||[]).map(n => n.id+':'+n.type).join(' → '));
  });
  process.exit(0);
})();
"
```

## 2. Ejecutar un flow en modo test contra Firestore real

⚠️ **Crea un `flow_run` real**. Usar con cuidado en producción.

```js
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')), projectId: 'julsmind-katuq' });

// Payload Shopify simulado (orden pagada)
const triggerData = [{
  id: 9999999999,
  name: '#TEST-' + Date.now(),
  order_number: 9999,
  financial_status: 'paid',
  cancelled_at: null,
  currency: 'COP',
  taxes_included: true,
  created_at: new Date().toISOString(),
  payment_gateway_names: ['bacs'],
  email: 'test@katuq.com',
  customer: { first_name: 'TEST', last_name: 'WEBHOOK', email: 'test@katuq.com', phone: '+573000000000' },
  line_items: [{ id: 1, sku: 'GCC998', quantity: 1, price: '64900', name: 'Producto test' }],
  shipping_address: { name: 'TEST', address1: 'Calle 1 #1-1', city: 'Medellin', province: 'Antioquia', country: 'Colombia', phone: '+573000000000' },
  billing_address:  { name: 'TEST', address1: 'Calle 1 #1-1', city: 'Medellin', province: 'Antioquia', country: 'Colombia', phone: '+573000000000' },
  total_price: '64900', subtotal_price: '64900', total_tax: '0', total_discounts: '0',
}];

(async () => {
  const { flowEngine } = require('./services/flows');
  const ctx = await flowEngine.startRun(
    'shopify-orders-to-cereza-7e6ab5a3',  // flowId
    triggerData,
    { triggeredBy: 'debug-script', mode: 'test', companyId: 'OH MY STORE' }
  );
  console.log('runId:', ctx.runId);
  // esperar a que termine (ajustar según complejidad del flow)
  await new Promise(r => setTimeout(r, 10000));
  const db = admin.firestore();
  const r = (await db.collection('flow_runs').doc(ctx.runId).get()).data();
  console.log('status:', r.status, '| ms:', r.totalDurationMs);
  Object.entries(r.nodeStates || {}).forEach(([nid, s]) => {
    console.log('  ' + nid + ':', s.status, s.error?.message ? '| err:' + s.error.message.substring(0,150) : '');
  });
  process.exit(0);
})();
"
```

## 3. Inspeccionar el detalle de un nodo failed

```js
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')), projectId: 'julsmind-katuq' });
(async () => {
  const r = await admin.firestore().collection('flow_runs').doc('<runId>').get();
  console.log(JSON.stringify(r.data().nodeStates, null, 2));
  process.exit(0);
})();
"
```

## 4. Detectar divergencia es vs en (productos OH MY STORE)

```js
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')), projectId: 'julsmind-katuq' });

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  const ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  for (const k of ak) { if (!bk.includes(k)) return false; if (!deepEqual(a[k], b[k])) return false; }
  return true;
}

(async () => {
  const prods = await admin.firestore().collection('products').where('company','==','OH MY STORE').select('integraciones','integrations').get();
  let solo_es=0, solo_en=0, ambos_iguales=0, ambos_diferentes=0, ninguno=0;
  prods.forEach(d => {
    const e = d.data().integraciones || {}, i = d.data().integrations || {};
    const has_e = Object.keys(e).length > 0, has_i = Object.keys(i).length > 0;
    if (!has_e && !has_i) ninguno++;
    else if (has_e && !has_i) solo_es++;
    else if (!has_e && has_i) solo_en++;
    else if (deepEqual(e, i)) ambos_iguales++;
    else ambos_diferentes++;
  });
  console.log({ total: prods.size, solo_es, solo_en, ambos_iguales, ambos_diferentes, ninguno });
  process.exit(0);
})();
"
```

## 5. Disparar el webhook de Osmosis localmente (simula Cereza)

```bash
ENDPOINT="http://localhost:3300/v1/osmosis/webhook/OH%20MY%20STORE"
TOKEN="64638988f8c404138212e8e7b0f1b5764fe5f248e82c4e9a6c3e56eeefdab460"
BODY='{"event":"order.status_updated","data":{"id":"OSM-1","external_id":"ORE-000207","status":"shipped","notes":"Test desde runbook"}}'

curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data "$BODY"
```

## 6. Lecturas comunes de auditoría OH MY STORE

```js
// Productos por fuente (Cereza vs Aliaddo vs propios)
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')), projectId: 'julsmind-katuq' });
(async () => {
  const p = await admin.firestore().collection('products').where('company','==','OH MY STORE')
    .select('integrations','integraciones','fulfillment','metadata','costoFuente').get();
  let ff=0, cereza=0, propios=0;
  p.forEach(d => {
    const x = d.data();
    const isFF = !!(x.integrations?.fulfillment?.id || x.metadata?.idOriginal || x.costoFuente === 'aliaddo-api' || x.fulfillment?.costoFuente);
    const isCereza = !!(x.integraciones?.osmosis || x.integrations?.osmosis);
    if (isFF) ff++;
    else if (isCereza) cereza++;
    else propios++;
  });
  console.log({ ff, cereza, propios, total: p.size });
  process.exit(0);
})();
"
```

```js
// Bodegas con su clasificación (fulfillment / osmosis / manual)
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')), projectId: 'julsmind-katuq' });
(async () => {
  const w = await admin.firestore().collection('warehouses').where('company','==','OH MY STORE').get();
  w.forEach(d => {
    const x = d.data();
    const tipo = x.fulfillmentId ? 'aliaddo' : (x.osmosisStorageCode ? 'osmosis' : 'manual');
    console.log(x.idBodega, '|', x.nombre, '|', tipo);
  });
  process.exit(0);
})();
"
```

## Errores comunes y qué significan

| Error en run | Significado | Acción |
|---|---|---|
| `code: BACKEND_RESTART, message: 'Run marcado como zombie'` | Cloud Functions se recicló mid-run | Esperar 002.3, mientras tanto reintentar manualmente |
| `nodeStates[X].status: failed`, `error: undefined` | Nodo falló pero no se capturó el error | Esperar 002.2 que arregla la instrumentación |
| `status: partial` con todos los nodos en `success` | Algún nodo emitió `error: [...]` además de `main: [...]` | Revisar `nodeStates[X].outputs.error` |

## Limpieza después de pruebas

```js
// Borrar el orden de prueba que el flow creó (si aplicó)
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')), projectId: 'julsmind-katuq' });
(async () => {
  const ords = await admin.firestore().collection('orders')
    .where('company','==','OH MY STORE')
    .where('user_add','==','shopify-webhook')
    .where('nroPedidoReferencia','>=','#TEST-')
    .where('nroPedidoReferencia','<','#TESU-')
    .get();
  console.log('ordenes test encontradas:', ords.size);
  // ords.forEach(async d => await d.ref.delete()); // descomentar para borrar
  process.exit(0);
})();
"
```
