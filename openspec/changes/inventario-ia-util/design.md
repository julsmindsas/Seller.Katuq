# Diseño: IA de inventarios que entregue valor

Backend en `katuq_admin_back_firebase/functions` (repo aparte); frontend en este repo. Todo lo de abajo se verificó leyendo el código el 9-oct; lo que no se pudo verificar está en "Preguntas abiertas".

## Piezas que se reutilizan (no se reescriben)

| Pieza | Dónde | Para qué |
|---|---|---|
| `cargarInformeKpi` | `services/inventory/warehouseKpiReport.js` | Única medida de demanda (ventas netas de devoluciones, sin devolución a proveedor ni ruido de bodega), saldo deduplicado, cobertura, costo, valor |
| `sugerirReposicion` | `services/purchasing/replenishmentService.js` | Qué comprar, cantidad, urgencia, días de entrega observados, ya pedido |
| `pedirJsonAOpttia` | `services/ai/opttiaJson.js` | Única vía de IA de una pasada (prompt a JSON) |
| `featureFlags` por empresa | `services/companyFeatureFlags.js` | Bandera apagada por omisión |
| Motor con sombra y reserva | `services/activacion/motor.js` | Patrón: modo por variable de entorno, reservar antes de enviar, no reintentar lo incierto |
| Enlaces firmados de baja | `services/activacion/enlaces.js` | Patrón de baja sin iniciar sesión |
| Chat de Opttia + política de herramientas | `services/opttiaAccessPolicy.js`, `opttia-chat` | Preguntas en lenguaje natural |

## Decisiones

### D1. Una función, `calcularInsights`
Nuevo `services/inventory/inventoryInsights.js`: `calcularInsights({ db, company, idBodega, dias, ahora })`. Compone el informe KPI y la reposición, sin recalcular demanda. Devuelve `ventana`, `confianza`, `advertencias`, `comprar`, `capital`, `traslados`, `avisos`.

- **Una sola lectura.** `sugerirReposicion` hoy llama por dentro a `cargarInformeKpi`. Se le agrega un parámetro opcional `informe` para recibir el ya cargado; sin él se comporta igual. Cambio aditivo y con diff aparte (módulo sensible).
- **Comprar.** Las filas urgentes de la reposición. `ventasEnRiesgo = consumoDiario × max(0, diasEntrega − coberturaDias) × precio`, rotulada como estimación. Sin precio conocido queda `null`, nunca cero.
- **Capital parado.** Filas con `inmovilizado` (hay saldo y cero demanda) o cobertura mayor o igual a `SOBRESTOCK_DIAS` (180 por defecto, constante exportada), ordenadas por `valorCosto`. Las `sinCosto` se cuentan aparte y no suman monto.
- **Traslados.** Reemplaza la regla de la Central (origen con más de 5, destino en 0). Nueva regla sobre las mismas filas del informe: destino = fila con demanda y cobertura menor que sus días de entrega; origen = otra bodega del mismo producto con `excedente = saldo − consumoDiario × coberturaObjetivo` (si no tiene demanda, todo el saldo); `cantidad = min(excedente, necesidad del destino)` hacia abajo. Sin origen con excedente no hay traslado.
- **Avisos** (catálogo cerrado `TIPOS_AVISO`):
  - `saldo_negativo`: filas con `saldoNegativo` del informe.
  - `salidas_sin_motivo`: hoy el informe solo las cuenta en total; se agrega el conteo por producto y bodega (aditivo, diff aparte).
  - `doble_conteo`: documentos de inventario descartados por la deduplicación para el mismo producto y bodega.
  - `ajuste_atipico`: ajuste manual con unidades mayores que `max(20, 5 × mediana de ajustes de la empresa en 90 días)`. Umbrales por validar (pregunta 3).
  Cada aviso lleva producto, bodega, evidencia y un enlace al diagnóstico existente. Nada se repara aquí.
- **Motivo determinista.** Cada elemento trae una frase armada con plantilla y cifras del código ("Se agota en 4 días; el proveedor tarda 9"). Es lo que se ve sin IA y lo que va en el correo si Opttia falla.

### D2. La IA explica y no calcula
Nuevo `services/ai/inventoryInsightsExplain.js` y `services/ai/prompts/inventarioInsightsPrompt.js`.

- **Entrada**, armada en el servidor, nunca tomada del cliente (hoy el cliente envía las listas y el servidor las cree): hasta 10 elementos por bloque con id, nombre, cifras y, en capital, las acciones permitidas para ese producto.
- **Salida** pedida: `{ resumen, comprar: [{id, motivo}], capital: [{id, accion, motivo}], avisos: [{id, explicacion, prioridad}] }`.
- **Validación** antes de mostrar: (a) los id deben estar en la entrada, si no se descarta el elemento; (b) `accion` debe estar entre las permitidas de ese producto; (c) **guarda de números**: si un texto contiene un número que no está entre las cifras de ese elemento, se descarta ese texto y queda el motivo determinista; (d) largo máximo (160 caracteres por motivo, 300 el resumen). El prompt pide no escribir cifras; la guarda cubre cuando igual lo haga.
- **Falla.** Tiempo máximo 45 s. Si Opttia falla, `ia: null` y la pantalla sigue con lo determinista.
- **Calidad del modelo.** El de siempre (sin `calidad: "alta"`): son frases cortas sobre datos ya ordenados.

### D3. Endpoints y herramienta (sin "v2"; las rutas viejas siguen hasta el retiro)
- `GET /v1/inventory/insights?dias=&idBodega=` con `auth`. Solo cálculo, sin IA ni cupo.
- `POST /v1/inventory/insights/explicar` con `{ dias, idBodega }` y `validateAILimit('chat')`, como la ruta actual. Recalcula en el servidor con la misma función (sin caché, regla del proyecto) y devuelve `{ ia }`.
- Herramienta MCP `get_inventory_insights` de solo lectura (`tools/getInventoryInsights.js`), registrada en `toolRegistry.js` y en `opttiaAccessPolicy.js` como `inventario/view` (el catálogo es cerrado: sin esa línea no tiene acceso). Exige una empresa concreta en `context.mcpCompany`; sin empresa o con `*` responde que hay que elegir una.
- Las rutas `GET /inventory/central-abastecimiento`, `POST /kai/inventory-analysis` y `POST /inventory/analyze-ia` no se tocan hasta la tarea de retiro: el front se despliega aparte y hay bundles en caché.

### D4. Resumen semanal
- **Cron.** `inventoryDigest`, `0 7 * * 1`, zona `America/Bogota`, registrado como los demás en `cronService.js`.
- **Dos compuertas.** Variable `INVENTARIO_DIGEST` = `apagada | sombra | envio` (interruptor global) y bandera por empresa `inventoryDigest` (se agrega a `FEATURE_FLAG_NAMES`). Sin las dos, la empresa no se procesa ni gasta IA.
- **Estado** en `companies/{id}.inventoryDigest` (sin colección nueva):
  `{ semanas: { "2026-W41": { estado, calculadoAt, enviandoAt, enviadoAt, omitido, error, resumen: { urgentes, capitalParado, avisos, idsUrgentes[≤30] } } }, bajas: [hash8 de correo] }`. Se conservan solo las últimas 8 semanas.
- **Un envío por semana.** Reserva con transacción (`enviandoAt`) antes de enviar y `enviadoAt` después; lo incierto no se reintenta (un correo repetido molesta más que uno perdido). Reinicio el lunes no duplica.
- **Comparación.** Contra `resumen` de la semana anterior: urgentes nuevos, resueltos y variación del capital parado.
- **Destinatarios.** `companies.correo` más los usuarios cuyo campo **`empresa`** (nunca `company`, que en 24 de 124 usuarios dice "Julsmind") coincide con la empresa y tienen rol administrador y correo válido; sin duplicados y sin los que dieron de baja. Los nombres de rol se verifican en la tarea 0.1.
- **Baja.** `GET /v1/inventory/digest/baja?t=` pública, token `companyId.hashCorreo.firma` con HMAC y prefijo propio; la baja es por persona. El correo lleva el encabezado `List-Unsubscribe`.
- **Envío.** `enviarEmail` de `services/email.js`, plantilla `services/notifications/templates/inventarioDigest.js` en el tema canónico (plano). Una sola pantalla de lectura: 5 elementos por bloque más "y N más" con enlace.
- **Aislamiento de fallos.** Empresas en serie; un error se registra con el id de la empresa y sigue. Tope por corrida (`INVENTARIO_DIGEST_MAX_EMPRESAS`, 200).
- **Sin accionable, sin correo.** Si los tres bloques están vacíos se marca `omitido: "sin_novedad"`.

### D5. Frontend
- La pantalla `inventario/central-abastecimiento` se rehace con cuatro componentes pequeños (`insights-comprar`, `insights-capital`, `insights-avisos`, `insights-preguntar`), solo con `@Input`, en el tema canónico (plano, acento `#5F3FE0`, sin `border-left` de acento).
- Al abrir llama a `GET insights` y muestra todo con los motivos deterministas. El botón "Explicar con Opttia" llama a `explicar` y mejora las frases; así abrir la pantalla no gasta cupo.
- Los métodos HTTP van en `InventarioService` (ya existe y es el que usa la Central); ningún `HttpClient` en componentes.
- "Preguntar": chips que envían la pregunta con `OpttiaChatService.sendMessage`. Cómo se abre el chat desde la pantalla se confirma en la tarea 4.3.
- "Pasar a la orden" lleva a "Qué comprar" con los urgentes; la preselección por producto depende de lo que esa pantalla ya acepte (pregunta 5).
- Se quita el botón IA del catálogo (`inventarios.component`) y `analyzeInventoryWithIA` en la tarea de retiro.

### D6. Orden de despliegue
Backend (rutas nuevas, no rompe nada) → front → semana de convivencia → retiro de rutas y botones viejos → sombra del resumen → envío por empresa. Desplegar a producción requiere avisar a Daniel: sale del modo automático.

### D7. Pruebas
- **Contract test del write-set** (falla si escribe fuera de lo permitido): `calcularInsights`, `explicar` y la herramienta MCP no escriben nada; el resumen solo escribe `companies/{id}.inventoryDigest`; nunca `products`, precios, listas de precios ni Shopify.
- **Misma demanda:** un producto urgente en insights tiene el mismo consumo y cobertura que en `sugerirReposicion`.
- **IA:** id desconocido descartado, acción fuera de lista descartada, número ajeno descarta el texto, Opttia caído da `ia: null`.
- **Resumen:** idempotencia semanal, sombra sin envío, bandera apagada sin IA, baja por persona, sin accionable sin correo, una empresa que falla no frena a las demás.
- **Herramienta MCP:** solo la empresa de la sesión.

## Preguntas abiertas (se cierran en la tarea 0.1, con lectura en producción)
1. Campo de precio sin IVA: el código usa `precio.precioUnitarioSinIva` (más de 40 lecturas en el backend); falta confirmar en datos reales qué tan poblado está.
2. Nombres exactos de los roles administradores para los destinatarios.
3. Umbrales `SOBRESTOCK_DIAS` y de ajuste atípico, validados con ALMARA.
4. Tiempo objetivo de `GET insights` tras medirlo en OH MY STORE (13.350 filas de inventario).
5. Si "Qué comprar" acepta preseleccionar productos por enlace.
