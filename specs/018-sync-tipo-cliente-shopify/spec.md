# Spec 018 — Sincronización de Tipo de Cliente (Katuq → Shopify)

> Estado: **approved** (clarifications resueltas por Daniel 2026-07-07, ver §8)
> Autor(es): Daniel García + Claude
> Última actualización: 2026-07-07

## 1. Contexto / Por qué

CreaCTA (agencia de OH MY STORE) construye pricing dinámico por perfil de cliente en la tienda Shopify y necesita conocer el tipo de cada cliente desde el storefront. Katuq se comprometió por correo (2026-07-07, ver D-084) a exponer ese dato. Hoy **no existe ninguna sincronización de clientes hacia Shopify** en ninguna capa (verificado en código — D-084).

## 2. Objetivo de negocio

Todo customer de Shopify de OH MY STORE que exista en Katuq con email tiene sus metafields `katuq.tipo_cliente` y `katuq.customer_id` correctos y al día, de forma que la tienda pueda resolver el precio según el perfil sin intervención manual.

## 3. User stories

- Como **agencia de la tienda** quiero **leer el tipo de cliente en un metafield estable del customer** para **aplicar pricing dinámico en el storefront**.
- Como **operador de Katuq** quiero **que al crear o editar un cliente su tipo se refleje solo en Shopify** para **no mantener dos sistemas a mano**.
- Como **operador de Katuq** quiero **una carga inicial retroactiva con reporte** para **cubrir los ~900 customers que ya existen en Shopify**.

## 4. Criterios de aceptación (notación EARS)

- WHEN un cliente de Katuq de una empresa con la sincronización habilitada es creado o editado y tiene email, THE system SHALL actualizar en el customer de Shopify cuyo email coincida los metafields `katuq.tipo_cliente` (nombre del tipo) y `katuq.customer_id` (ID del cliente en Katuq).
- THE system SHALL resolver el tipo del cliente con una regla única: `categoria.nombre` si existe; en su defecto `tipoCliente`; y el valor emitido SHALL ser el nombre tal cual está en el maestro de tipos de Katuq (Katuq es la fuente de verdad de los nombres; un renombre en el maestro se propaga en la siguiente sincronización de cada cliente).
- WHEN se actualiza el metafield THE system SHALL sobrescribir el valor anterior (nunca acumular valores ni tags).
- IF el cliente no tiene email THEN THE system SHALL omitirlo y contarlo en el reporte del run, sin abortar el proceso.
- IF no existe customer en Shopify con ese email THEN THE system SHALL crearlo con la identidad mínima (email + nombre del cliente en Katuq) y estamparle los metafields en la misma operación.
- IF el cliente pierde su tipo en Katuq (categoría vacía) THEN THE system SHALL eliminar el metafield `katuq.tipo_cliente` del customer (Shopify fiel a Katuq; el storefront cae al precio público).
- WHEN un customer nuevo aparece en Shopify (registro directo en la tienda) y su email coincide con un cliente existente de Katuq, THE system SHALL estamparle los metafields al recibir el evento del proveedor (estampado al vuelo, sin esperar backfill/edición).
- WHEN se ejecuta la carga retroactiva THE system SHALL procesar todos los clientes de la empresa en modo dry-run por defecto y producir un reporte con conteos: actualizados, sin email, sin match, con error.
- IF el proveedor responde rate-limit o error transitorio THEN THE system SHALL reintentar con backoff, sin efectos duplicados (la escritura es idempotente por sobrescritura).
- WHILE la sincronización esté deshabilitada para una empresa THE system SHALL no emitir ninguna actualización de clientes de esa empresa (multi-tenant, default OFF; se habilita solo para OH MY STORE).
- THE system SHALL dejar traza consultable de cada ejecución en la trazabilidad existente de flows/integraciones, sin volcar PII (emails) a logs.

## 5. Requisitos no funcionales

### 5.1 Performance
- Backfill de ~1.000 clientes completa en ≤ 15 min respetando los rate limits del proveedor.
- Un cambio de tipo en Katuq se refleja en Shopify en ≤ 5 min.

### 5.2 Seguridad
- Reusa las credenciales ya configuradas de la integración del tenant. Sin secretos ni PII en logs.

### 5.3 Observabilidad
- Cada run reporta conteos y errores por cliente. El reporte del backfill queda persistido/consultable (sin colecciones nuevas: usa la trazabilidad existente de runs).

### 5.5 Resiliencia
- Idempotencia por sobrescritura del metafield. Reintentos ante 429/5xx. Un cliente con error no bloquea el resto del lote.

## 6. Out of scope (explícito)

- Sincronizar otros campos del cliente de forma continua (teléfono, direcciones); el nombre solo se envía una vez al CREAR el customer que no existía.
- Sección "Clientes" en la UI de Mapeo de Campos (se opera desde el motor de integraciones).
- Crear/actualizar clientes DE KATUQ desde Shopify (el estampado al vuelo del §4 solo escribe metafields en Shopify; no toca la base de Katuq).
- Otros canales (WooCommerce, etc.) — el diseño debe permitirlo a futuro, pero no se implementa.
- Tags de producto `precio_mayorista`/`precio_modelo`: NO son mecanismo de esta spec. El mecanismo real de precios diferenciados ya existe (price lists B2B / `preciosPorTipoCliente`). Si se pide formalizar los tags como entregable, será spec aparte.

## 7. Dependencias

- [[002-flows-osmosis-shopify-marco]] — motor de flows, contrato canónico de cliente (`CanonicalCustomer`, evento `customer.upserted`) y patrón de nodos por proveedor.
- Maestro de tipos de cliente del tenant (colección `tiposPrecios`).
- D-069 — protección de `preciosPorTipoCliente` (el tier "modelo" solo existe curado en Katuq).

## 8. [NEEDS CLARIFICATION] — resueltas por Daniel (2026-07-07)

- [x] #1 — Si el email no existe como customer en Shopify: **CREAR el customer** (identidad mínima + metafields).
- [x] #2 — Valores: **siempre los nombres de Katuq** — se emite el nombre tal cual del maestro (fuente de verdad); no se congela el maestro; un renombre se propaga en la siguiente sync.
- [x] #3 — Tipo vaciado: **borrar el metafield** (Shopify fiel a Katuq).
- [x] #4 — Registro directo en la tienda: **estampado al vuelo** vía evento de customer del proveedor.

## 9. Riesgos identificados

- R-01: doble representación del tipo en el doc de cliente (`tipoCliente` string vs `categoria` objeto; el pricing usa `categoria.id`) → regla única de resolución + datos legacy inconsistentes.
- R-02: el maestro de tipos es editable por el comercio y los nombres de Katuq son la fuente de verdad (decisión #2): si OMS renombra un tipo, el nuevo nombre se propaga y la lógica de CreaCTA debe leerlo dinámicamente → acuerdo operativo con CreaCTA de que los valores son los que Katuq emita.
- R-03: rate limits del proveedor durante el backfill (~900 customers) → throttling y reanudación.

## 10. Métricas de éxito post-launch

- 100% de los clientes Katuq de OMS con email y match en Shopify tienen `katuq.tipo_cliente` correcto tras el backfill (reporte del run, conteo binario).
- Durante la primera semana, todo cambio de tipo se refleja en ≤ 5 min sin intervención manual (muestreo con CreaCTA).
