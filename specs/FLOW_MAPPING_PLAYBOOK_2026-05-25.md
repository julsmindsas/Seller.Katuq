# Playbook operativo — Mappings de flow (Shopify / WooCommerce → Pedido Katuq)

> **Audiencia**: cualquier persona del equipo Katuq que necesite entender
> o ajustar cómo se transforman pedidos externos (Shopify, WooCommerce)
> en pedidos Katuq sin depender de un dev específico.
>
> **Última edición**: 2026-05-25, tras consolidar fixes Shopify + WC.
>
> ⚠️ **Actualización 2026-07-01 (D-068):** el flow `flow-cafe-escobar-woo-orders`
> que este playbook referencia fue **ARCHIVADO** (era un duplicado del trigger de
> `woo-orders-to-katuq-a786f1a8`, riesgo de doble disparo). NO lo reactives ni le
> dispares triggers. Su graph quedó preservado en
> `specs/003-woocommerce-360-marco/zombie-flow-cafe-escobar-graph.json`.
> El flow VIVO de Café Escobar es `woo-orders-to-katuq-a786f1a8`
> (con mapper dedicado `woocommerce-order-map`, ver D-065).

---

## TL;DR — Si tenés 30 segundos

- Los mappings **NO viven en archivos de código**. Viven en **Firestore** en
  el doc `flows/<flowId>` dentro de `graph.nodes[id=mapper].params.mapping`.
- Para **ver/editar** un mapping necesitás correr un script `node -e` con
  el SDK de Firebase Admin. Los snippets listos están abajo en sección 4.
- Para **debuggear un pedido raro**, hay tabla de síntomas → diagnóstico
  en sección 5.
- **Antes de tocar un mapping HACÉ BACKUP** (snippet en sección 4.2).
- **Roadmap para no depender de Firestore**: ver `WOOCOMMERCE_STATUS_2026-05-25.md`
  (plan Fase 1.1 — mapper canónico en código `services/woocommerce/mappers/order.js`).

---

## 1. Arquitectura: dónde vive el mapping

Cuando un comerciante configura un flow (ej. "Shopify → Cereza" o
"WooCommerce → Katuq"), se crea un **documento en la colección `flows`**
de Firestore con esta estructura:

```
flows/<flowId>
  ├─ name: "WooCommerce → Katuq (Pedidos)"
  ├─ company: "CAFE ESCOBAR"
  ├─ status: "active"
  ├─ triggers: [{type:"webhook", config:{provider:"woocommerce", topic:"order.created"}}]
  └─ graph:
      ├─ nodes: [
      │     {id:"trigger",          type:"woocommerce-order-created", params:{}},
      │     {id:"mapper",           type:"katuq-canonical-mapper",     params:{mapping:{...}}},  ← AQUÍ
      │     {id:"product-resolver", type:"katuq-product-resolver-by-ref", ...},
      │     {id:"persist",          type:"katuq-order-upsert",         params:{matchBy:"externalId"}},
      │     {id:"split-cart",       type:"split-array",                params:{fieldPath:"carrito"}},
      │     {id:"adj-mapper",       type:"katuq-canonical-mapper",     params:{mapping:{...}}},  ← Y AQUÍ
      │     {id:"inventory-adjust", type:"katuq-inventory-adjust",     params:{}},
      │  ]
      └─ edges: [...] (conexiones entre nodos)
```

El campo `params.mapping` del nodo `mapper` es **un objeto JSON con
expresiones template** entre `{{ ... }}`. Cuando llega un webhook, cada
expresión se evalúa contra el payload entrante (`$json`) y produce el
Pedido canónico Katuq.

### Endpoint que dispara el flow

Shopify y WooCommerce mandan webhooks a:
```
POST https://back.katuq.com/v1/flows/triggers/webhook/<flowId>/trigger
```

Ese endpoint vive en `functions/controllers/flowsController.js:420`
(`exports.webhookTrigger`). Persiste el payload raw en colección
`webhook_logs` y arranca el flow vía `flowEngine.startRun`.

---

## 2. Flows activos hoy (snapshot 2026-05-25)

| flowId | name | company | trigger | provider |
|---|---|---|---|---|
| `shopify-orders-to-cereza-7e6ab5a3` | Shopify → Cereza (Pedidos) | OH MY STORE | webhook `orders/create` + `orders/updated` | Shopify |
| `cereza-products-to-shopify-a5156643` | Cereza → Shopify (Productos) | OH MY STORE | polling cada 5min | Osmosis |
| `cereza-orders-status-pull-rdoavk0b` | Cereza → Katuq (Pull estados) | OH MY STORE | cron `*/30 * * * *` | Osmosis |
| `flow-cafe-escobar-woo-orders` | WooCommerce → Katuq (Pedidos) | CAFE ESCOBAR | webhook `order.created` | WooCommerce |
| `woo-orders-to-katuq-a786f1a8` | Recibir pedidos de WooCommerce | NIT 900888999 | webhook `order.created` | WooCommerce |

Para listar los actuales en cualquier momento:

```bash
cd functions
node -e "
const a=require('firebase-admin');
a.initializeApp({credential:a.credential.cert(require('./serviceAccountKey.json')), projectId:'julsmind-katuq'});
a.firestore().collection('flows').get().then(snap => {
  snap.docs.forEach(d => {
    const f = d.data();
    console.log(d.id.padEnd(40), '|', String(f.name||'').substring(0,30).padEnd(30), '|', f.company || f.companyId, '|', f.status);
  });
  process.exit(0);
});"
```

---

## 3. Estructura canónica del Pedido Katuq esperado

Lo que cualquier mapping DEBE producir (paridad con lo que ya valida frontend + Cereza + facturación):

```js
{
  // Identificación
  nroPedidoReferencia: "#1154",            // número visible del provider (con # adelante)
  sourceOrder: "shopify" | "woocommerce",  // proveedor de origen
  typeOrder: "E-commerce",                  // tipo (E-commerce | POS | WEB)
  channel: { name: "Shopify", tipo: "E-commerce" },

  // Estados (enums del frontend — ver Seller.Katuq/src/app/shared/models/order-history.interface.ts)
  estadoProceso: "ParaDespachar" | "Despachado" | "Cancelado" | "Rechazado" | "SinProducir" | ...,
  estadoPago:    "Pendiente" | "Aprobado" | "Cancelado" | "Rechazado" | "PreAprobado" | ...,

  // Cliente (cédula obligatoria si vas a generar factura electrónica)
  cliente: {
    nombres_completos: "...", apellidos_completos: "...",
    correo_electronico_comprador: "...",
    indicativo_celular_comprador: "57",
    numero_celular_comprador: "+573147110490",   // CON el "+"
    numero_celular_whatsapp:   "+573147110490",
    documento: "1214716414",                     // cédula (puede ir vacío si el provider no la captura)
    tipo_documento_comprador: "CC",              // "CC" si hay documento, "" si no
    company: "<companyId>",
    estado: "activo",
    user_add: "shopify-webhook" | "woocommerce-webhook",
  },

  // Direcciones (envio Y facturacion — mismas claves)
  envio: {
    alias: "Principal", nombres: "...", apellidos: "...",
    direccionEntrega: "...",
    ciudad: "MEDELLÍN",       // nombre completo de la ciudad
    departamento: "Antioquia", // NOMBRE COMPLETO, no código DANE
    pais: "Colombia",          // NOMBRE COMPLETO, no código ISO
    indicativoCel: "57",
    celular: "+573147110490",
    codigoPostal: "...",
    observaciones: "...",
  },
  facturacion: { /* mismas claves que envio + documento + tipoDocumento */ },

  // Carrito
  carrito: [{
    producto: {
      cd: "<docId Katuq>",                    // lo resuelve el nodo product-resolver-by-ref
      identificacion: { referencia: "<SKU>", marca: "...", codigoBarras: "..." },
      crearProducto: { titulo: "...", descripcion: "..." },
      precio: { precioUnitarioConIva, precioUnitarioSinIva, precioUnitarioIva },
    },
    cantidad: 1,
    configuracion: { datosEntrega: { ... } },
    precioAplicado: { precioUnitarioConIva, precioUnitarioSinIva, precioUnitarioIva },
    subtotalLinea: number,
  }],

  // Totales
  totalDescuento, totalEnvio, totalImpuesto, subtotal,
  totalPedidoSinDescuento, totalPedididoConDescuento,
  faltaPorPagar, anticipo,
  formaDePago: "PAGO CONTRA-ENTREGA (SÓLO MEDELLÍN)",
  formaEntrega: "Domicilio" | "Retiro en tienda",

  // Pago (historial)
  pago: { financialStatus, totalPagado, faltaPorPagar, paymentProvider },
  PagosAsentados: [{ /* 1 ítem cuando paid; vacío cuando pending */ }],

  // Integraciones (REGLA DURA Art XV v2: SOLO en INGLÉS)
  integrations: {
    shopify: { orderId, orderName, financialStatus, ... },
    // O woocommerce: { orderId, status, ... }
    // Cuando se pushea a Cereza/Osmosis:
    osmosis: { orderId, status, isPushed, pushedAt },
  },
  // ❌ NUNCA tener integraciones (español) duplicado

  // Notas (las usa el operador en la UI)
  notasPedido: {
    notasCliente: [], notasDespachos: [], notasEntregas: [],
    notasProduccion: [], notasFacturacionPagos: [],
  },

  // Banderas opcionales que activan UI
  requiereAtencionLogistica: true | undefined,
  motivoAtencion: "falta_cedula" | "push_cereza_failed" | "missing_nroPedido",
  ultimoErrorPush: "...",

  company: "<companyId>",
  date_add: ISO timestamp,
  user_add: "shopify-webhook" | "woocommerce-webhook",
}
```

---

## 4. Snippets `node -e` listos para usar

> **Ubicación**: ejecutar siempre desde
> `katuq_admin_back_firebase/functions/` con `node -e "..."`. Requiere
> `serviceAccountKey.json` en esa carpeta.

### 4.1 Ver el mapping de un flow

```bash
node -e "
const a=require('firebase-admin');
a.initializeApp({credential:a.credential.cert(require('./serviceAccountKey.json')), projectId:'julsmind-katuq'});
a.firestore().collection('flows').doc('flow-cafe-escobar-woo-orders').get().then(d => {
  const m = d.data().graph.nodes.find(n => n.id === 'mapper').params.mapping;
  console.log(JSON.stringify(m, null, 2));
  process.exit(0);
});"
```

### 4.2 Backup ANTES de editar (OBLIGATORIO)

```bash
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p /tmp/katuq-flow-backups
node -e "
const fs=require('fs');
const a=require('firebase-admin');
a.initializeApp({credential:a.credential.cert(require('./serviceAccountKey.json')), projectId:'julsmind-katuq'});
a.firestore().collection('flows').doc('flow-cafe-escobar-woo-orders').get().then(d => {
  fs.writeFileSync('/tmp/katuq-flow-backups/flow-cafe-escobar-${TS}.json', JSON.stringify(d.data(), null, 2));
  console.log('✅ Backup en /tmp/katuq-flow-backups/flow-cafe-escobar-${TS}.json');
  process.exit(0);
});"
```

### 4.3 Restaurar desde backup (revertir un cambio)

```bash
node -e "
const fs=require('fs');
const a=require('firebase-admin');
a.initializeApp({credential:a.credential.cert(require('./serviceAccountKey.json')), projectId:'julsmind-katuq'});
const backup = JSON.parse(fs.readFileSync('/tmp/katuq-flow-backups/flow-cafe-escobar-NNNN.json'));
a.firestore().collection('flows').doc('flow-cafe-escobar-woo-orders').update({
  'graph.nodes': backup.graph.nodes,
  _restoredAt: new Date().toISOString(),
}).then(() => { console.log('✅ Restaurado'); process.exit(0); });"
```

### 4.4 Cambiar un campo específico (ejemplo: pais hardcoded a "Colombia")

```bash
node -e "
const a=require('firebase-admin');
a.initializeApp({credential:a.credential.cert(require('./serviceAccountKey.json')), projectId:'julsmind-katuq'});
(async()=>{
  const ref = a.firestore().collection('flows').doc('flow-cafe-escobar-woo-orders');
  const f = (await ref.get()).data();
  const nodes = f.graph.nodes.map(n => {
    if (n.id !== 'mapper') return n;
    const m = JSON.parse(JSON.stringify(n.params.mapping));
    m.envio.pais = 'Colombia';        // <-- el cambio que querés
    return { ...n, params: { ...n.params, mapping: m } };
  });
  await ref.update({ 'graph.nodes': nodes, _editedAt: new Date().toISOString() });
  console.log('✅ envio.pais ahora es \"Colombia\"');
  process.exit(0);
})();"
```

### 4.5 Reprocesar un pedido (re-disparar el webhook desde Katuq)

Útil cuando: el webhook llegó pero quedó mal mapeado y querés re-aplicar
el mapping actualizado al mismo pedido.

```bash
# Desde EC2 (porque necesita descifrar credenciales del provider):
ssh -i .../lightsail-default-us-east-1.pem ubuntu@back.katuq.com
cd /home/ubuntu/katuq_admin_back_firebase/functions
node -e "
const a=require('firebase-admin');
const axios=require('axios');
a.initializeApp({credential:a.credential.cert(require('./serviceAccountKey.json')), projectId:'julsmind-katuq'});
(async()=>{
  // 1. Pull pedido desde WC (o Shopify)
  const svc = require('./services/woocommerceService');  // o shopifyService
  const client = await svc.getWooCommerceApiClient('CAFE ESCOBAR');
  const r = await client.get('/orders/1970');
  // 2. POST al endpoint del flow
  const flowId = 'flow-cafe-escobar-woo-orders';
  const r2 = await axios.post('https://back.katuq.com/v1/flows/triggers/webhook/'+flowId+'/trigger', r.data);
  console.log('Resultado:', r2.data);
  process.exit(0);
})();"
```

---

## 5. Troubleshooting: síntomas comunes → diagnóstico

### 5.1 "El pedido llegó pero está mal mapeado"

Pasos:
1. **Buscar el doc en `orders`** por `integrations.<provider>.orderId == "<id>"`.
2. **Comparar contra la estructura canónica** (sección 3).
3. **Identificar qué campos están mal/vacíos**.
4. **Ver el payload raw recibido** en `webhook_logs` filtrando por
   `payloadId == <id numérico>`. Eso muestra qué mandó el provider.
5. **Editar el mapping** del flow con snippet 4.4.
6. **Reprocesar el pedido** con snippet 4.5.

### 5.2 "El pedido se duplicó N veces"

Causa típica: el provider mandó múltiples webhooks (orders/create + orders/updated + ...)
y el `katuq-order-upsert` no encontró match por `externalId`, así que cada
uno creó un doc nuevo.

Verificar: en el doc duplicado, `integrations.<provider>.orderId` debe
existir con valor numérico válido. Si está `null` o `"undefined"`,
revisar el mapping del campo `orderId` en `integrations`.

### 5.3 "El flow_run terminó en `partial`"

Significa que algún nodo NO recibió items en su puerto `main` (ej. todos
sus items se rebotaron a `error`).

Pasos:
1. Verificar mapping del `adj-mapper`: debe tener `reason: "sale"`
   (enum cerrado, no string libre). Si dice `motivo: "Venta..."`, ese es
   el bug — corregir con snippet 4.4.
2. Verificar que los SKUs del pedido existan en colección `products` con
   `identificacion.referencia` matcheando. Si no existen, el inventario
   no se ajusta y rebota.

### 5.4 "El pedido pagado NO se pusheó a Cereza"

Pasos:
1. Verificar `osmosis_push_log` filtrando por `shopifyOrderId == "<id>"`.
2. Si hay entry con `kind: error`, leer `errorMessage` + `responseBody`.
3. Si NO hay entry, el gate del nodo `osmosis-order-create` blockeó antes
   de llamar a Cereza. Causas comunes:
   - `cliente.documento` vacío → mapping no extrae cédula del payload.
   - `nroPedido` no propagado al canonical en UPDATE.
   - `estadoPago` no es "Aprobado"/"PreAprobado".
   - El doc ya tiene `integrations.osmosis.id` (skip por idempotencia).

### 5.5 "Aparece un pedido raro tipo ORE-XXXX que no reconozco"

Probablemente es un pedido **fantasma** de un webhook checkout (cliente
navegando el carrito antes de confirmar). Verificar:
- `nroPedidoReferencia` tiene formato `#34544...` (token de 14+ dígitos)?
- `integrations.<provider>.orderId` está null?

Si sí, ese es un checkout fantasma. Borrar (con backup) y el guard
anti-checkout en el nodo trigger debería evitar nuevos.

---

## 6. Decisiones de mapping ya tomadas por comerciante

### CAFE ESCOBAR (`flow-cafe-escobar-woo-orders`)

- `cliente.documento` → SIEMPRE vacío. CAFE ESCOBAR NO captura cédula en
  WC. Decisión: dejar vacío hasta que instalen plugin colombiano.
- `pais` / `departamento` → códigos ISO (CO/ANT) traducidos a nombre
  completo con tabla embebida.
- `numero_celular_*` → normalizado con `+57` prefix.
- `formaEntrega` → desde `shipping_lines[0].method_id`
  (local_pickup → "Retiro en tienda", resto → "Domicilio").
- `nroPedidoReferencia` → `#1970` (con `#` adelante).
- `adj-mapper.reason: "sale"` (enum).

### Mi Campo Verde / Tienda Demo KAI Import (sin flow instanciado)

Cuando se instancien, copiar el mapping de CAFE ESCOBAR + reactivar el
mapeo de cédula desde `billing.company` (Mi Campo Verde SÍ usa ese campo
como cédula, igual que Shopify Colombia).

### OH MY STORE Shopify (`shopify-orders-to-cereza-7e6ab5a3`)

- `cliente.documento` → desde `billing_address.company`.
- `tipo_documento_comprador` → `"CC"` automático si hay company.
- `adj-mapper.reason: "sale"` (enum).
- Phone normalization activa.
- Mapping warehouse Cereza: extrae sufijo numérico de `BOD-CEREZA-N` → `"N"`.

---

## 7. Próximos pasos para no depender de Firestore manual

Ver `WOOCOMMERCE_STATUS_2026-05-25.md` sección "Plan de acción
priorizado" — la Fase 1.1 (crear `services/woocommerce/mappers/order.js`
en código) elimina la dependencia del mapping declarativo para los casos
comunes. Los flows quedarían "dummy" (solo `trigger → mapper-canonical →
persist`) y los cambios al mapping serían commits + deploys con audit
trail completo.

Tiempo estimado: **~2 días Claude** para mapper WC + smoke tests
acceptance.

---

**Backups conocidos** (referencias):
- `/tmp/katuq-flow-backups/flow-cafe-escobar-pre-mapping-fix-20260525-172314.json`
- `/tmp/katuq-flow-backups/flow-cafe-escobar-pre-cedula-fix-20260525-171122.json`
- `/tmp/katuq-flow-backups/flow-pre-cedula-20260524-224215.json` (Shopify)
- `/tmp/katuq-flow-backups/flow-pre-orderid-fix-20260524-203748.json` (Shopify)
