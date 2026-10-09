## Why

Katuq va a Effix (16 al 18 de octubre de 2026, hora de Bogotá) y Daniel quiere llevar tres cosas a la gente que pase por el stand:

1. **Más pedidos gratis:** quien canjee un cupón de la feria pasa de 15 a **30 pedidos al mes** mientras siga en el plan gratis.
2. **Un descuento para quien pague en la feria:** 30% en cualquier plan durante 6 meses (100 cupos) o, pagando el año, el 20% más 1 mes de regalo.
3. **Saber si sirvió:** cuántos usaron el cupón y cuántos terminaron pagando.

Lo que existe hoy (verificado en el código, no en documentos viejos):

- Las campañas viven en `subscriptionPlans` con `tipoRegistro: "campana"` y **solo saben regalar Premium** por `diasPremium`. Tienen cupo, `usosConsumidos` y `vigenteHasta`, pero **no tienen `vigenteDesde`**: no se puede abrir una ventana que empiece el 16.
- El tope de pedidos del plan gratis (15) sale de una tabla fija (`config/subscriptionLimits.js`) y `getLimitsForPlan` ignora cualquier valor guardado en la empresa. Ese tope lo hacen cumplir cuatro sitios de `limitsService` (uso, aviso previo, creación del pedido y pedido de la tienda).
- Las métricas de una campaña cuentan registradas y cuántas siguen en Premium. **No miden quién pagó.**
- **No existe** descuento por cupón, ni por N meses, ni meses de regalo. El cobro (cotización por TRM, anual con 20% fijo, escalones por ventas, prorrateo, validación de monto contra Wompi) no tiene dónde colgarlos sin tocar plata de verdad.

## What Changes

Tres peticiones, resueltas en paquetes independientes (a, c y el diseño de b), con un orden de aplicación entre ellos; (a2) y (a3) son pequeños complementos de (a):

| Paquete | Qué hace | Estado |
|---|---|---|
| **(a) Cupón de pedidos** | Un cupón con beneficio explícito `cupoPedidos`: ventana de canje con inicio y fin (`vigenteDesde` nuevo), el registro lo guarda en la empresa (`empresa.cupon`) y el tope de pedidos del plan gratis sube a 30 para esa empresa. Textos de la landing y del registro honestos (dicen "30 pedidos", no "Premium"). | **Parche verificado** |
| **(a2) Asignar a una cuenta existente** (opcional) | Script en seco para dar o quitar el cupón a una empresa que ya existe: probar en FLORECER o atender a una cuenta gratis de antes. | **Parche verificado** |
| **(a3) Proteger el cupón en la ficha** | La ficha "editar empresa" (`PUT /v1/companies/:id`) no puede escribir `cupon`: sin esto un administrador de comercio se daría solo los pedidos que quisiera. Una línea de lista negra, aplica sobre cualquier estado del archivo. **Hacerlo antes de crear el cupón real.** | **Parche verificado** |
| **(c) Medición** | El resultado de una campaña dice cuántas empresas la **usaron** y cuántas **pagaron** un plan (el Premium regalado no cuenta como pago). | **Parche verificado** |
| **(b) Descuento en el plan** | 30% por 6 meses en cualquier plan, o anual con mes de regalo. | **Diseño detallado, sin parche** (ver `design-descuento-plan.md`) |

### Por qué (b) va sin parche

Toca el cobro recurrente. En un prototipo descartable (no entregado) comprobé que el descuento puede quedar congelado en la factura del ciclo, que no rompe el prorrateo por escalón y que sin cupón lo escrito en Firestore y enviado a Wompi es idéntico byte a byte. **Pero no puedo demostrar lo mismo para el cobro inicial de punta a punta, ni para las pantallas que proyectan el monto**, y hay decisiones del negocio abiertas que cambian el código (cuándo se gasta el cupo, si el 20% se acumula, cómo se entrega el mes de regalo, si las cuentas existentes pueden canjear). Además, la prueba que hoy demuestra que un reintento de cobro no cambia el monto (`subscriptionBillingRetrySafety.test.js`) **está en rojo desde antes de este cambio**: se rompió al agregarse `ventasPorDia` al cálculo de ventas y su tramo final nunca corre. Detalle y lista de lo que falta en `design-descuento-plan.md`.

### Cupones que Daniel debe crear (NO se crean con este cambio)

Se crean con un script en seco (`scripts/crear-cupones-feria.js`: sin `--apply` no abre Firestore). El panel de campañas de hoy solo crea cupones de Premium y lee las fechas en UTC; por eso estos se crean por script y el panel sirve para **verlos, apagarlos y encenderlos**.

| Campo | Cupón de pedidos (real) | Cupón de prueba |
|---|---|---|
| `codigo` | `EFFIXPEDIDOS` (propuesto; Daniel decide) | `EFFIXPRUEBA` |
| `tipoRegistro` / `beneficio` | `campana` / `cupoPedidos` | igual |
| `pedidosPorMes` | `30` | `30` |
| `vigenteDesde` | 2026-10-16 00:00 America/Bogota (`2026-10-16T05:00:00Z`) | el momento de crearlo |
| `vigenteHasta` | 2026-10-18 23:59:59.999 America/Bogota (`2026-10-19T04:59:59.999Z`) | +48 horas |
| `cupoMaximo` | `0` (sin tope; Daniel decide) | `3` |
| `diasPremium` | `0` (no regala Premium) | `0` |
| `activo` | `true` | `true` |
| Enlace | `https://sellercenter.katuq.com/promo/EFFIXPEDIDOS` | `.../promo/EFFIXPRUEBA` |

Un cupón de (b) tendría `beneficio: "descuentoPlan"`; **hoy el sistema se niega a ofrecerlo o canjearlo** (a propósito: un beneficio que no sabe cumplir es peor que no tenerlo).

## Capabilities

### New Capabilities
- `feria-cupo-pedidos`: cupón con beneficio explícito, ventana de canje, tope de pedidos del plan gratis sube a 30, textos honestos.
- `feria-medicion-cupones`: el registro guarda el cupón; resultado con "usaron" y "pagaron".
- `feria-descuento-plan`: diseño del descuento (sin código todavía).

### Modified Capabilities
- Ninguna archivada. Se apoya en `promo-registro-premium` (campañas en `subscriptionPlans`, canje transaccional, vitrina sin campañas) y en `limites-plan-gratis-tiendas` (los pedidos de la tienda cuentan en el mismo tope; esa propuesta lee el tope con `getEffectiveOrderUsage`, así que hereda el cupón sin cambios).

## Apagado por defecto (regla de Daniel)

- **El cupón es el interruptor y vive en cada empresa.** Sin documento de campaña con `beneficio` no existe nada que canjear; sin `empresa.cupon` el tope, el registro, los planes y los cobros son exactamente los de hoy. No usa `featureFlags`: un cupón canjeado es, por construcción, "encendido por comercio".
- **Clientes actuales** (ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR, ALMACEN BOMBAS): ninguno tiene `cupon`, así que nada cambia. El único camino de canje es el registro (cuentas nuevas) y, a pedido, el script (a2).
- **Pruebas:** primero `EFFIXPRUEBA` con una cuenta nueva (prueba la landing, el registro y los correos de verdad) y FLORECER con el script (a2) para el tope. Pasos en `tasks.md`.
- **Apagar:** "Apagar" en el panel corta los canjes nuevos al instante. Quitar el beneficio a una empresa concreta: `asignar-cupon-a-empresa.js --quitar`.

## Impact

- **Backend (`katuq_admin_back_firebase/functions`):**
  - `limitsService.js`: 4 líneas (una por sitio que hace cumplir el tope). **Es el camino de pedidos: módulo sensible.**
  - `promocionesService.js`, `controllers/diagnostics.js`, `controllers/registroVerificacion.js`, `controllers/promociones.js`, plantilla `registro.js`: soporte de `beneficio`, `vigenteDesde`, canje del cupón y su guardado.
  - Nuevos: `utils/cuponCampana.js` (puro), `scripts/crear-cupones-feria.js`, (a2) `scripts/asignar-cupon-a-empresa.js`, pruebas.
  - (a3) `services/companies/sanitizeCompanyUpdate.js`: una línea, la ficha no escribe `cupon`.
- **Front (`Seller.Katuq`):** landing `/promo/:codigo`, registro (franja y pantalla de éxito) y chip del panel, todo leyendo textos que manda el servidor. `PromocionesService` solo suma campos opcionales.
- **Datos:** sin colecciones nuevas. Campos nuevos opcionales: en la campaña (`beneficio`, `pedidosPorMes`, `vigenteDesde`, `beneficioHasta`) y en la empresa (`cupon`).
- **Write-set:** no toca productos, precios, inventario ni Shopify. Los pedidos solo cambian en el **número** que se compara con el contador del mes; el contador y su transacción son los de siempre.

## No-goals

- Descuentos o cobros (eso es (b) y va aparte).
- Cambiar los límites de venta asistida, POS o tienda más allá del número del tope.
- Un panel de creación/edición de estos cupones (hoy por script; el panel los ve y los apaga).
- Un endpoint para que una cuenta ya existente canjee sola desde su sesión (hoy: script a2, a pedido).
- Tocar el ADK de Opttia, la facturación, el cron de vencimiento o la vitrina de planes.

## Riesgos

- **Camino de pedidos (`createOrderWithinLimit`):** el cambio es solo el número del tope. Sin cupón el objeto de límites es **el mismo objeto** (prueba de identidad) y el patrón de escrituras es el mismo. Aun así es un módulo sensible: **diff y aprobación explícita de Daniel antes de aplicar**, y prueba de pedido de punta a punta (tasks 3.x).
- **El registro es el embudo de adquisición:** todo el canje sigue dentro del `try/catch` que ya lo aísla; cualquier falla cae a gratis como hoy. Hay prueba de registro con y sin cupón, con código rechazado y por verificar.
- **Orden de despliegue:** si el cupón existe antes de desplegar el front, la landing vieja diría "Premium gratis". **Crear el cupón al final.**
- **Reversa con el cupón vivo:** el código viejo no conoce `beneficio` y trataría un cupón de pedidos como una campaña de Premium de 0 días. **Primero "Apagar" en el panel, después revertir el código.**
- **Fechas:** un `YYYY-MM-DD` suelto se lee en UTC y cerraría la ventana el 17 a las 7 p. m. Las del script llevan `-05:00` escrito y hay prueba del último segundo del 18. El panel rechaza editar estos cupones (exige días de Premium) y no los reescribe.
- **El beneficio no vence:** hoy los 30 pedidos valen "mientras siga gratis", sin fecha de fin (como pidió Daniel). Hay un campo opcional `beneficioHasta` si quiere ponerle una.
- **Hallazgo previo, NO corregido aquí (grave):** `POST /v1/companies/edit` (ruta `auth` + `ONLY_ADMIN`, sin comprobar de qué empresa es el administrador) hace `update(req.body)` sobre la empresa que tenga el NIT del cuerpo, así que un administrador de cualquier comercio puede reescribir cualquier campo —`subscriptionPlan`, `monthlyOrderLimit`, `cupon`— de **cualquier** empresa; `POST /v1/companies/create` crea empresas nuevas con el cuerpo entero (también con `cupon`). (a3) cierra solo el camino de la ficha, que es el que usa el front. Cerrar `/edit` es un cambio aparte y toca `controllers/companies.js`, que otra sesión está editando ahora (banderas por comercio): no lo toqué.
- **Pruebas rojas de antes:** `subscriptionBillingRetrySafety.test.js` y `scripts/test-promociones-registro.js` fallan sin este cambio (ver `design.md`). Este cambio no las toca ni las empeora.
- **Cosmético interno:** la consola de plataforma sigue diciendo "15 pedidos" para una cuenta gratis con cupón.

## Verificación contra la constitución

- Art. I y XIII: spec primero; tres specs de menos de 3 páginas.
- Art. IV: nada de esto reintenta ni duplica cobros; el cupo del cupón se descuenta en la misma transacción que ya usaba el canje.
- Art. VII y XI: sin `console.log` nuevo ni datos personales en logs; el canje deja su auditoría en `registration_security_audit` (existente).
- Art. XII: **no se introduce ninguna bandera.** El cupón es el interruptor y se apaga desde el panel; no hay nada que retirar.
- Art. IX: los cambios del front son plantillas del NgModule existente (`*ngIf`, Angular 14); no se crean componentes nuevos.

## Decisión

Se registrará como **D-???** en `specs/CONTRACT.md` (el número lo asigna quien haga el commit, mirando el CONTRACT del remoto). Contenido a registrar: cupones de campaña con beneficio explícito (`cupoPedidos` hoy), ventana de canje con `vigenteDesde`, `empresa.cupon` como fuente del tope, medición de "pagaron" por `premiumOrigen: 'pago'`, y (b) en diseño con sus decisiones abiertas.
