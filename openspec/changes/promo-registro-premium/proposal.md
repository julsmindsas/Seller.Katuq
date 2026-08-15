## Why

Katuq necesita poder pautar. Hoy no existe forma de llevar tráfico pagado a un registro con gancho: quien llega por una campaña cae en el mismo `/registrarse` genérico, nace en freemium y tiene que decidir pagar sin haber visto la plataforma completa. Un link propio por campaña —con un código que regala premium por un tiempo definido— convierte la pauta en registros y le deja al comerciante ver el producto entero antes de decidir.

Hay un hueco estructural que lo hace posible: **el plan premium no vence**. `SubscriptionGuard` solo mira `subscription.plan === 'premium'` y el backend lo lee de `companies.subscriptionPlan`, sin ninguna fecha de corte. Regalar premium hoy sería regalarlo para siempre. Este cambio crea el vencimiento, que es la pieza que faltaba tanto para promociones como para cualquier prueba futura.

## What Changes

- **Landing de campaña `/promo/:codigo`** en Angular, pública y sin sesión: valida el código contra el backend y muestra el gancho de la campaña (nombre, beneficio, cuánto dura, vigencia). Código inválido, vencido o sin cupo → mensaje claro y botón al registro normal, nunca una pantalla en blanco.
- **Registro con código**: el registro actual (`/registrarse`, encuesta de diagnóstico) acepta el código, lo muestra aplicado y lo manda al crear la empresa. La empresa nace **premium con fecha de vencimiento**, no freemium.
- **Vencimiento de premium (pieza nueva del núcleo)**: campos `premiumUntil`, `premiumOrigen` y `premiumCodigo` en la empresa. Un trabajo programado diario baja a freemium las empresas cuyo premium promocional venció y restaura los límites de freemium.
- **Avisos antes del corte**: correo al administrador de la empresa faltando unos días y el día del vencimiento, con invitación a pagar el plan. Sin cobro automático y sin pedir tarjeta en el registro.
- **Pantalla de administración de campañas en superadmin**: crear código, días de premium, cupo máximo de usos, fecha límite, activo/inactivo, y ver cuántos registros trajo cada campaña.
- **Los códigos viven en `subscriptionPlans`** (decisión del usuario: no se crea colección nueva) con un discriminador de tipo. **Riesgo asumido y mitigado**: `GET /v1/subscription-plans/active` es público y sin auth; todos los lectores de planes deben filtrar por tipo o una campaña se vería como plan en la vitrina de precios.
- **No-goals**: sin descuentos parciales ni precio promocional (solo 100% gratis por tiempo); sin cobro automático al vencer; sin medio de pago en el registro; sin tocar los cupones de pedidos de las tiendas (`controllers/cupones.js`), que son de otro dominio; sin tocar inventario, órdenes ni consecutivos.

## Capabilities

### New Capabilities
- `promociones-registro`: código de campaña, landing pública, canje en el registro, cupo y vigencia, y administración desde superadmin.
- `vencimiento-premium`: fecha de corte del plan premium, degradación programada a freemium y avisos previos al comerciante.

### Modified Capabilities
- Ninguna. No existen specs vigentes en `openspec/specs/` para suscripciones ni registro; lo verificado se tomó del código real.

## Impact

**Frontend (`Seller.Katuq`)**
- Ruta pública nueva `/promo/:codigo` + módulo de campaña (lazy).
- `diagnostic-survey.component.ts` y `katuq-quickstart.service.ts`: leer y propagar el código.
- `subscription.service.ts` / `subscription.model.ts`: exponer `premiumUntil` para poder avisar en la interfaz.
- Módulo `superadmin`: pantalla de campañas (respeta el tema canónico de "Todos los pedidos").

**Backend (`katuq_admin_back_firebase`)**
- `controllers/diagnostics.js` (creación de empresa en el registro, hoy fija `subscriptionPlan: 'freemium'` con límites freemium): pasa a resolver el plan según el código.
- `controllers/subscriptionPlans.js` y su router: filtro por tipo en los seis lectores + endpoints de campaña (validar público, crear/editar/listar con auth).
- `controllers/subscriptions.js` (`getStatus`): devolver `premiumUntil`.
- `services/cronService.js`: trabajo diario de vencimiento y avisos.
- Firestore: `subscriptionPlans` (documentos de tipo campaña) y campos nuevos en `companies`. Sin colecciones nuevas.

**Riesgos**
- La creación de empresa en el registro es camino crítico de adquisición: un error ahí bloquea todos los registros, no solo los de campaña. El código debe ser estrictamente opcional y cualquier fallo al resolverlo cae a freemium sin romper el registro.
- Cupo y vigencia se validan al canjear, no solo en la landing: si no, el link circula y el cupo se pasa.
- La degradación toca el plan de empresas reales; corre en modo simulación antes de habilitarse.
