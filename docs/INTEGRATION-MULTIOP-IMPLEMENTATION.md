# Implementación Integración MultiOP en Katuq

## Contexto
MultiOP v2 es un sistema de producción de lentes oftálmicos. Las ópticas que usan Katuq necesitan enviar pedidos con datos de prescripción óptica al laboratorio MultiOP para que los fabrique, y recibir actualizaciones de estado cuando la producción avanza.

La integración usa el sistema de `camposPersonalizados` (módulo variable) de Katuq para capturar los datos ópticos en la venta asistida, y el strategy pattern de integraciones existente (como Shopify/WooCommerce) para la conexión con MultiOP.

## Documentación de referencia
- **Mapeo de campos**: `docs/campos-personalizados-integracion-multiop.md` — Contiene el mapeo completo de campos MultiOP ↔ Katuq, validaciones, estructura de datos en Firestore
- **Plan completo**: El plan de 5 fases está en el repo multiop-v2

## Estado actual — Qué ya está implementado

### MultiOP v2 Backend (`C:\sourcecodejuls\APIMultiop\functions`)
- `middleware/authApiKey.js` — Middleware de autenticación por API Key (header `x-api-key`)
- `controllers/integration.js` — CRUD de API Keys + config de webhook
- `routers/integration.js` — Rutas `/v1/integration/keys` y `/v1/integration/webhook`
- `utils/webhookDispatcher.js` — Dispara POST con HMAC-SHA256 al webhook URL cuando cambia estado de orden
- `controllers/requests.js` — Modificado para llamar webhookDispatcher después de cambios de estado
- `index.js` — Router registrado, CORS actualizado con `https://multiop-v2.web.app`

**PENDIENTE**: Configurar `serviceAccountKey.json` de `multiop2022` para acceso cross-project a Firestore desde `katuq-new`. Descargar desde: https://console.firebase.google.com/u/0/project/multiop2022/settings/serviceaccounts/adminsdk

### MultiOP v2 Frontend (`C:\sourcecodejuls\multiop-v2`)
- `features/maestros/integraciones/integraciones.component.ts` — UI para generar API Keys y configurar webhook URL
- `core/services/integration.service.ts` — Servicio HTTP
- `shared/models/integration.models.ts` — Interfaces ApiKey, WebhookConfig
- Ruta `/maestros/integraciones` registrada, menú admin actualizado

### Katuq Backend (`C:\sourcecodejuls\katuq_admin_back_firebase\functions`)
- `services/multiop/multiopService.js` — CREADO. Funciones: pushOrderToMultiop(), pollOrderStatus(), testConnection()
- `services/multiop/utils/orderMapper.js` — CREADO. Mapper camposPersonalizados → MultiOP flat fields
- `controllers/multiopWebhook.js` — CREADO. Recibe webhooks de MultiOP, mapea estados, actualiza pedido Katuq
- `routers/multiopWebhook.js` — CREADO. Ruta POST `/v1/webhooks/multiop`
- `services/integrationConfigService.js` — MODIFICADO. `multiop` agregado a PROVIDER_SCHEMAS
- `index.js` — MODIFICADO. Router multiopWebhook registrado en `/v1/webhooks`

**PENDIENTE**:
1. `services/webhookSecurityService.js` — Agregar case `'multiop'` en `validateSignature()`
2. Deploy del backend Katuq

### Katuq Frontend (`C:\sourcecodejuls\Seller.Katuq`)
- Logo copiado a `assets/images/integrations/multiop-logo.png`
- `integrations.service.ts` — MODIFICADO. MultiOP agregado en `getAvailableIntegrations()` y `getCategoryForProvider()`

**PENDIENTE**:
1. `integrations.component.ts` — Agregar createMultiopForm(), case en onSelectIntegrationType(), case en buildCredentials()
2. `integrations.component.html` — Agregar ng-container con formulario de configuración MultiOP

---

## PENDIENTES DETALLADOS PARA KATUQ

### 1. webhookSecurityService.js — Agregar validación MultiOP

**Archivo**: `C:\sourcecodejuls\katuq_admin_back_firebase\functions\services\webhookSecurityService.js`

Buscar el método `validateSignature()` que tiene un switch por provider. Agregar:

```javascript
case 'multiop':
  return this.validateMultiopSignature(payload, headers, config);
```

Y agregar el método:

```javascript
validateMultiopSignature(payload, headers, config) {
  const receivedSignature = headers['x-multiop-signature'];
  const webhookSecret = config.config ? config.config.webhookSecret : config.webhookSecret;

  if (!receivedSignature || !webhookSecret) {
    return { isValid: false, error: 'Missing signature or secret' };
  }

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadString, 'utf8')
    .digest('hex');

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    return { isValid, error: isValid ? null : 'Invalid signature' };
  } catch (e) {
    return { isValid: false, error: 'Signature comparison failed: ' + e.message };
  }
}
```

### 2. integrations.component.ts — Formulario MultiOP

**Archivo**: `C:\sourcecodejuls\Seller.Katuq\src\app\components\integrations\integrations.component.ts`

**IMPORTANTE**: Katuq frontend es Angular 14, NO Angular 21. Usa *ngIf/*ngFor, NO @if/@for.

#### 2a. Agregar método createMultiopForm()

Buscar los otros métodos `create*Form()` (como `createShopifyForm`, `createWompiForm`) y agregar:

```typescript
createMultiopForm(): FormGroup {
  return this.fb.group({
    name: ['MultiOP', Validators.required],
    enabled: [true],
    apiUrl: ['https://us-central1-katuq-new.cloudfunctions.net/api/', [Validators.required]],
    apiKey: ['', [Validators.required, Validators.minLength(20)]],
    companyNit: ['', Validators.required],
    companyName: ['', Validators.required],
    defaultLensType: ['Monofocal'],
    defaultMaterial: [''],
  });
}
```

#### 2b. Agregar case en onSelectIntegrationType() o resetForm()

Buscar el switch que crea formularios por tipo de integración y agregar:

```typescript
case 'multiop':
  this.integrationForm = this.createMultiopForm();
  break;
```

#### 2c. Agregar case en buildCredentials()

Buscar el método `buildCredentials()` y agregar en el switch:

```typescript
case 'multiop':
  credentials = {
    apiUrl: formData.apiUrl,
    apiKey: formData.apiKey,
    companyNit: formData.companyNit,
    companyName: formData.companyName,
    defaultLensType: formData.defaultLensType || 'Monofocal',
    defaultMaterial: formData.defaultMaterial || '',
  };
  break;
```

#### 2d. Agregar propiedad showApiKey

En las propiedades del componente agregar:

```typescript
showApiKey = false;
```

### 3. integrations.component.html — Template del formulario

**Archivo**: `C:\sourcecodejuls\Seller.Katuq\src\app\components\integrations\integrations.component.html`

Buscar el último `</ng-container>` de las integraciones existentes (después de prindel o el último provider) y agregar ANTES del cierre del formulario:

```html
<!-- MultiOP Configuration -->
<ng-container *ngIf="selectedIntegrationType === 'multiop'">
  <div class="integration-info-box mb-3">
    <i class="fa fa-info-circle me-2"></i>
    <span>Conecta Katuq con el sistema de producción de lentes MultiOP. Los pedidos con prescripción óptica se enviarán automáticamente al laboratorio.</span>
  </div>

  <div class="row">
    <div class="col-md-12 mb-3">
      <div class="form-group">
        <label for="apiUrl">URL del API <span class="field-required">*</span></label>
        <input type="text" class="form-control" id="apiUrl" formControlName="apiUrl" placeholder="https://us-central1-..." />
        <small class="text-muted">URL del backend de MultiOP</small>
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col-md-12 mb-3">
      <div class="form-group">
        <label for="apiKey">API Key <span class="field-required">*</span></label>
        <div class="input-group">
          <input [type]="showApiKey ? 'text' : 'password'" class="form-control" id="apiKey" formControlName="apiKey" placeholder="mop_live_..." />
          <button type="button" class="btn btn-outline-secondary" (click)="showApiKey = !showApiKey">
            <i [class]="showApiKey ? 'fa fa-eye-slash' : 'fa fa-eye'"></i>
          </button>
        </div>
        <small class="text-muted">Genera la API Key desde MultiOP v2 → Maestros → Integraciones</small>
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col-md-6 mb-3">
      <div class="form-group">
        <label for="companyNit">NIT Empresa en MultiOP <span class="field-required">*</span></label>
        <input type="text" class="form-control" id="companyNit" formControlName="companyNit" placeholder="900123456" />
        <small class="text-muted">NIT de la empresa registrada en MultiOP</small>
      </div>
    </div>
    <div class="col-md-6 mb-3">
      <div class="form-group">
        <label for="companyName">Nombre Empresa en MultiOP <span class="field-required">*</span></label>
        <input type="text" class="form-control" id="companyName" formControlName="companyName" placeholder="Óptica XYZ" />
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col-md-6 mb-3">
      <div class="form-group">
        <label for="defaultLensType">Tipo de Lente por defecto</label>
        <select class="form-control" id="defaultLensType" formControlName="defaultLensType">
          <option value="Monofocal">Monofocal</option>
          <option value="Bifocal">Bifocal</option>
          <option value="Progresivo">Progresivo</option>
          <option value="Ocupacional">Ocupacional</option>
        </select>
      </div>
    </div>
    <div class="col-md-6 mb-3">
      <div class="form-group">
        <label for="defaultMaterial">Material por defecto</label>
        <input type="text" class="form-control" id="defaultMaterial" formControlName="defaultMaterial" placeholder="Ej: CR39, Policarbonato" />
      </div>
    </div>
  </div>
</ng-container>
```

---

## Endpoints que Katuq DEBE consumir (Backend Katuq → MultiOP API)

Todos los endpoints usan header `x-api-key: mop_live_xxxxx` para autenticación.
Base URL: la que se configure en la integración (ej: `https://us-central1-katuq-new.cloudfunctions.net/api/`)

### 1. Crear orden en MultiOP (enviar pedido al laboratorio)
```
POST {apiUrl}/v1/requests/new
Headers:
  x-api-key: mop_live_xxxxx
  Content-Type: application/json
  user: {companyNit}
  email: katuq-integration@{company}.com

Body: (ver payload completo más abajo)

Response 200:
{
  "message": "Pedido creado correctamente !",
  "datos": {
    "Pedido": 15428,          ← Guardar este número en el pedido Katuq
    "Empresa": "Óptica XYZ"
  }
}
```

**Cuándo llamar**: Cuando un pedido de Katuq tiene `camposPersonalizados` con datos ópticos y la integración MultiOP está activa.

**Qué guardar en Katuq**: El número de `Pedido` retornado se guarda en el pedido Katuq en `integrations.multiop.pedido` y `integrations.multiop.ordenOptica` para poder rastrearlo.

### 2. Consultar estado de una orden
```
POST {apiUrl}/v1/requests/get
Headers:
  x-api-key: mop_live_xxxxx
  Content-Type: application/json
  user: {companyNit}
  email: katuq-integration@{company}.com

Body:
{ "pedido": 15428 }

Response 200: (array con la orden)
[{
  "pedido": 15428,
  "estado": "Programado",
  "nombre": "Juan Pérez",
  "fecha": "2025-04-05T10:00:00-05:00",
  "notas": [{ "fecha": "...", "nota": "...", "user": "...", "estado": "..." }],
  ... todos los campos de la orden
}]
```

**Cuándo llamar**: Para polling de estado (cada 15 min para órdenes en producción), o bajo demanda cuando el usuario quiere ver el estado actual.

### 3. Consultar historial de una orden
```
POST {apiUrl}/v1/requests/history
Headers:
  x-api-key: mop_live_xxxxx
  Content-Type: application/json
  user: {companyNit}

Body:
{ "pedido": "15428" }

Response 200: (array de cambios de estado)
[{
  "fechaHistorico": "2025-04-05T14:30:00Z",
  "estado": "Programado",
  "usuario": "operador@multiop.com",
  "nota": "Programación completa"
}]
```

### 4. Test de conexión (validar API Key)
```
GET {apiUrl}/v1/integration/keys
Headers:
  x-api-key: mop_live_xxxxx
  user: {companyNit}
  email: katuq-integration@{company}.com

Response 200: [] (array de keys, confirma que la API Key funciona)
Response 401: { "message": "No tienes autorización" } (key inválida)
```

**Cuándo llamar**: Cuando el usuario hace click en "Test Connection" al configurar la integración en el Plugin Store.

### 5. Consultar órdenes por rango de fecha
```
POST {apiUrl}/v1/requests/all
Headers:
  x-api-key: mop_live_xxxxx
  Content-Type: application/json
  user: {companyNit}
  email: katuq-integration@{company}.com

Body:
{
  "fechaIni": "2025-04-01",
  "fechaFin": "2025-04-30",
  "empresa": "{companyNit}"
}

Response 200: (array de órdenes)
```

---

## Flujo completo: Pedido Katuq → MultiOP → Status Update

```
1. Óptica crea pedido en Katuq con camposPersonalizados (prescripción OD/OI, montura)
   ↓
2. Katuq Backend detecta que la empresa tiene integración MultiOP activa
   ↓
3. orderMapper.js extrae camposPersonalizados → payload flat de MultiOP
   ↓
4. multiopService.pushOrderToMultiop() llama POST /v1/requests/new
   ↓
5. MultiOP responde con { Pedido: 15428 }
   ↓
6. Katuq guarda en el pedido: integrations.multiop.pedido = 15428
   ↓
7. MultiOP procesa la orden (13 etapas de producción)
   ↓
8. En cada cambio de estado, webhookDispatcher envía POST a Katuq
   ↓
9. multiopWebhook.js en Katuq recibe el webhook, valida HMAC
   ↓
10. Actualiza estadoProceso del pedido Katuq (EnProduccion → Producido → Despachado)
```

### Trigger automático (dónde conectar en Katuq)

En el backend de Katuq, después de crear un pedido exitosamente (en `orderService.createOrder()` o en el controller de orders), agregar:

```javascript
// Después de crear el pedido exitosamente
const multiopService = require('../services/multiop/multiopService');

// Verificar si la empresa tiene integración MultiOP activa
const multiopConfig = await getActiveMultiopConfig(order.company);
if (multiopConfig) {
  // Enviar cada item del carrito con camposPersonalizados como orden separada
  for (const cartItem of order.carrito) {
    if (cartItem.configuracion?.camposPersonalizados) {
      try {
        const result = await multiopService.pushOrderToMultiop(order, cartItem, multiopConfig.config);
        // Guardar referencia
        await db.collection('orders').doc(order._id).update({
          'integrations.multiop': {
            pedido: result.datos.Pedido,
            ordenOptica: order.nroPedido,
            estado: 'Grabado',
            lastUpdate: new Date().toISOString()
          }
        });
      } catch (err) {
        console.error('Error enviando a MultiOP:', err);
        // No bloquear la creación del pedido si MultiOP falla
      }
    }
  }
}
```

---

## Formato de datos que MultiOP envía/recibe

### MultiOP API — Crear Orden (lo que Katuq envía)

**Endpoint**: `POST {apiUrl}/v1/requests/new`
**Auth**: Header `x-api-key: mop_live_xxxxx`

```json
{
  "nit": "900123456",
  "empresa": "Óptica XYZ",
  "nombre": "Juan Pérez",
  "cedula": "1234567890",
  "ordenOptica": "KTQ-000123",
  "fechaEntrega": "2025-04-15",
  "tipoDeLenteSel": "CR39 Monofocal",
  "tipoDeLente": "Monofocal",
  "materialLente": "CR39",
  "tratamiento": "Antireflejo verde",
  "odEsfera": "-1.50",
  "odCilindro": "-0.75",
  "odEje": "180",
  "odAdicion": "0",
  "odDistanciaPupilar": "32",
  "odAlturaPupilar": "18",
  "oiEsfera": "-1.50",
  "oiCilindro": "-0.75",
  "oiEje": "175",
  "oiAdicion": "0",
  "oiDistanciaPupilar": "32",
  "oiAlturaPupilar": "18",
  "ojoD": "Si",
  "ojoI": "Si",
  "bisel": "Si",
  "antiRayas": "Si",
  "antiReflejo": "Si",
  "marca": "Ray-Ban",
  "referenciaMontura": "RB5228",
  "color": "Negro",
  "material": "Acetato",
  "completa": true,
  "ranurada": false,
  "tresPiezas": false,
  "nueva": true,
  "usada": false,
  "rayada": false,
  "pelada": false,
  "horizontal": "51",
  "vertical": "39",
  "diagonal": "51",
  "nasal": "17",
  "anguloPantoscopico": "8",
  "anguloPanoramico": "0",
  "distanciaVertice": "12",
  "notas": [{"fecha": "2025-04-05T10:00:00Z", "nota": "Orden Katuq #KTQ-000123", "user": "katuq-integration", "estado": "Grabado"}],
  "estado": "Grabado"
}
```

**IMPORTANTE**: Todos los campos son FLAT (planos), NO anidados. Los valores numéricos van como STRING.

**Respuesta**:
```json
{
  "message": "Pedido creado correctamente !",
  "datos": {
    "Pedido": 15428,
    "Empresa": "Óptica XYZ"
  }
}
```

### MultiOP API — Webhook callback (lo que MultiOP envía a Katuq)

**Endpoint**: `POST {katuqWebhookUrl}/v1/webhooks/multiop`
**Headers**: `x-multiop-signature: {hmac_hex}`, `company: {companyId}`

```json
{
  "event": "state_change",
  "pedido": 15428,
  "estado": "Programado",
  "timestamp": "2025-04-05T14:30:00Z"
}
```

### Mapeo de estados MultiOP → Katuq

| MultiOP estado | Katuq estadoProceso | Descripción |
|---------------|-------------------|-------------|
| `Grabado` | `SinProducir` | Orden registrada |
| `Impreso` | `SinProducir` | Orden impresa para el laboratorio |
| `Programado` | `EnProduccion` | Materiales asignados |
| `alistamiento` | `EnProduccion` | En cálculo |
| `generado` | `EnProduccion` | Bloqueo y generado |
| `desbaste` | `EnProduccion` | Desbaste |
| `desbloqueo` | `EnProduccion` | Pulido y desbloqueo |
| `controlProduccion` | `EnProduccion` | Control de producción |
| `antiRayas` | `EnProduccion` | Tratamiento antirayas |
| `antiReflejo` | `EnProduccion` | Tratamiento antireflejo |
| `bisel` | `EnProduccion` | Adaptación bisel |
| `controlFinal` | `EnProduccion` | Control final y facturación |
| `Firmado` | `Producido` | Aprobado y firmado |
| `Enviado` | `Despachado` | Despachado al cliente |
| `Rechazado` | `Rechazado` | Rechazado en control de calidad |
| `Cancelado` | `Cancelado` | Cancelado |

### Mapeo camposPersonalizados → MultiOP

El `orderMapper.js` ya creado extrae los campos de `carrito[].configuracion.camposPersonalizados` buscando por etiqueta:

| Etiqueta en camposPersonalizados | Campo MultiOP |
|--------------------------------|---------------|
| `OD Esfera` | `odEsfera` |
| `OD Cilindro` | `odCilindro` |
| `OD Eje` | `odEje` |
| `OD Adicion` | `odAdicion` |
| `OD Dist. Pupilar` | `odDistanciaPupilar` |
| `OD Altura Pupilar` | `odAlturaPupilar` |
| `OI Esfera` | `oiEsfera` |
| `OI Cilindro` | `oiCilindro` |
| `OI Eje` | `oiEje` |
| `OI Adicion` | `oiAdicion` |
| `OI Dist. Pupilar` | `oiDistanciaPupilar` |
| `OI Altura Pupilar` | `oiAlturaPupilar` |
| `Marca` | `marca` |
| `Referencia` | `referenciaMontura` |
| `Color` | `color` |
| `Horizontal` | `horizontal` |
| `Vertical` | `vertical` |
| `Diagonal` | `diagonal` |
| `Nasal` | `nasal` |
| `Bisel` | `bisel` (Si/No) |
| `Antireflejo` | `antiReflejo` (Si/No) |
| `Categoria` | `tipoDeLente` |
| `Material` | `materialLente` |
| `Tratamiento` | `tratamiento` |

---

## Archivos clave por codebase

### Katuq Backend
- `services/integrationConfigService.js` — PROVIDER_SCHEMAS (ya tiene multiop)
- `services/multiop/multiopService.js` — Servicio para comunicarse con MultiOP API
- `services/multiop/utils/orderMapper.js` — Mapper campos personalizados → MultiOP
- `controllers/multiopWebhook.js` — Recibe webhooks de MultiOP
- `routers/multiopWebhook.js` — Ruta /v1/webhooks/multiop
- `services/webhookSecurityService.js` — **PENDIENTE**: agregar case multiop

### Katuq Frontend
- `components/integrations/integrations.service.ts` — Ya tiene MultiOP en catálogo
- `components/integrations/integrations.component.ts` — **PENDIENTE**: form + cases
- `components/integrations/integrations.component.html` — **PENDIENTE**: template
- `assets/images/integrations/multiop-logo.png` — Logo copiado

### MultiOP Backend
- `middleware/authApiKey.js` — Auth por API Key
- `controllers/integration.js` — CRUD keys + webhook config
- `utils/webhookDispatcher.js` — Dispara webhooks en cambios de estado

### MultiOP Frontend
- `features/maestros/integraciones/integraciones.component.ts` — UI admin para keys + webhook
