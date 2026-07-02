# Prompt para sesiones de Claude — Automatización con Playwright

Copiá y pegá esto al inicio de una nueva sesión donde necesites automatizar el browser.

---

```
Necesito automatizar Chrome con Playwright en este proyecto (Seller.Katuq). NO uses Chrome MCP — es lento. Usá Playwright headless con Node.

## Setup (si no está instalado)
Playwright + Chromium probablemente ya está descargado en `/tmp/katuq-shots/`
(en Windows MSYS-Git eso mapea a `C:\Users\danie\AppData\Local\Temp\katuq-shots\`).
Verificá con:
    ls /tmp/katuq-shots/node_modules/playwright

Si no existe, instalá:
    mkdir -p /tmp/katuq-shots && cd /tmp/katuq-shots && \
    npm init -y && npm install playwright@1.49.1 --no-save && \
    npx playwright install chromium

## Patrón base
Script Node estándar (guardar en `/tmp/katuq-shots/script.js`, correr con
`cd /tmp/katuq-shots && node script.js`):

```javascript
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://sellercenter.katuq.com/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input[type="text"]', 'EMAIL');
  await page.fill('input[type="password"]', 'PWD');
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL(/welcome|dashboards|pos/, { timeout: 15000 });
  // ... lo que necesites
  await page.screenshot({ path: 'C:/ruta/destino/captura.png', fullPage: false });
  await browser.close();
})();
```

## Datos del proyecto Katuq
- Frontend prod: https://sellercenter.katuq.com
- Backend prod: https://back.katuq.com (auth con JWT, headers: `Authorization: Bearer <jwt>` + `company: <empresa>`)
- Login: POST /v1/authentication con `email` + `password` (SHA256+Base64)
- Empresas con data real: `HARMONY LENS`, `OH MY STORE`, etc.

## Usuarios de prueba
NO tocar admins reales (`luisfernanaristi@hotmail.com`, `wdsg11@hotmail.com`).
Crear test users desechables en Firestore con campo `_test_session` para limpiar
después:

```bash
cd C:/sourcecodejuls/katuq_admin_back_firebase/functions && node -e "
const admin = require('firebase-admin');
const sa = require('./serviceAccountKey.json');
const crypto = require('crypto');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
const PWD = crypto.createHash('sha256').update('Test1234!').digest('base64');
admin.firestore().collection('users').add({
  email: 'tu-test@katuq.test', password: PWD, roles: 'Administrador',
  empresa: 'HARMONY LENS', identificacion: '99999999', activo: true,
  _test_session: 'YYYY-MM-DD-tu-tag'
}).then(r => { console.log('OK', r.id); process.exit(0); });
"
```

Para vendedor con mapeo WO (filtrado server-side):
```javascript
roles: 'VENTAS',
vendedorIdWO: 1013,
vendedorNombreWO: 'LEYDI LORENA GERENA FLOREZ',
```

Cleanup al final del script:
```javascript
const snap = await admin.firestore().collection('users')
  .where('_test_session', '==', 'YYYY-MM-DD-tu-tag').get();
await Promise.all(snap.docs.map(d => d.ref.delete()));
```

## Limitaciones conocidas
- **Drag-and-drop de Angular CDK NO funciona** con Playwright sintético — los
  eventos pointer no se interpretan. Para reportes que necesiten configurar
  dimensiones/medidas, llamá directo a `POST /v1/reports/query` con un JWT y
  mostrá el resultado. NO intentes drag-and-drop.
- ngModel/Reactive Forms — Playwright dispatcha `input` event automáticamente
  con `page.fill()`. Si necesitás change/blur, usá `.dispatchEvent('change')`.
- Si una página tiene Swal modal abierto, cerralo con
  `await page.click('.swal2-confirm')` antes de seguir.
- Headers: el interceptor del frontend Katuq agrega `Authorization`/`company`
  automáticamente cuando la URL contiene `back.katuq.com`. Si llamás fetch
  desde la página (page.evaluate), tenés que poner los headers vos.

## Workaround para queries de reportes
Si necesitás capturar un reporte ejecutado pero el drag no funciona,
hacé la query con fetch:

```javascript
const result = await page.evaluate(async () => {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  const r = await fetch('https://back.katuq.com/v1/reports/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + u.token,
      'company': 'HARMONY LENS'
    },
    body: JSON.stringify({
      source: 'accounting_documents',
      rows: [{ id: 'vendedor_nombre' }],
      cols: [],
      values: [{ id: 'count', agg: 'count' }],
      filters: [
        { field: 'fecha', op: 'gte', value: '2026-02-01T00:00:00.000Z' },
        { field: 'fecha', op: 'lte', value: '2026-02-28T23:59:59.999Z' }
      ],
      limit: 100
    })
  });
  return await r.json();
});
```

## Para qué lo necesito en esta sesión
[ACÁ DESCRIBÍ TU OBJETIVO ESPECÍFICO]
```

---

## Referencia rápida — selectores útiles del Katuq frontend

| Pantalla | Selector clave |
|----------|----------------|
| Login email | `input[type="email"], input[type="text"]` (el primero visible) |
| Login password | `input[type="password"]` |
| Botón Ingresar | `button:has-text("Ingresar")` |
| Form crear usuario | `#nombre`, `#apellido`, `#email`, `#password`, `#identificacion` |
| Select de rol | `#roles` (usar `.selectOption({ label: 'X' })`) |
| Plantillas roles modal | `.template-card:has-text("Vendedor")` |
| Builder fuente | `select` (primer select de la página) |
| Modal bienvenida | abrir con `button:has-text("Cambiar pantalla de bienvenida")` |
| Swal confirm | `.swal2-confirm` |
| Swal cancel | `.swal2-cancel` |

## Script de ejemplo completo

Ver: `/c/Users/danie/AppData/Local/Temp/katuq-shots/take-screenshots.js`
(220 líneas, hace login admin + recorre flujos + captura 26 screenshots + login vendedor + captura banner verde).
