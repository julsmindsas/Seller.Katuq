# Tasks — inventario-ia-util

Reglas: módulo sensible (inventario), un cambio a la vez con diff y aprobación explícita antes de aplicar. Marcadas **[sensible]** las que tocan archivos compartidos con otros informes. Cada tarea de código cierra con build o pruebas sin errores. Nada se despliega sin avisar a Daniel.

## 0. Medición previa (solo lectura, sin escribir)
- [ ] 0.1 *(bloqueada: el permiso de lectura a producción se negó; script listo en el scratchpad de la sesión, lo corre Daniel)* Medir en producción con el MCP o un script de solo lectura, en ALMARA, Café Escobar y OH MY STORE: tiempo de `cargarInformeKpi`, filas de inventario, campo de precio sin IVA, roles administradores en `users` (por `empresa`), distribución de ajustes manuales. Entregable: `findings.md` corto que cierra las preguntas abiertas 1 a 5 del diseño.
- [ ] 0.2 Contrastar la Central actual contra el informe de indicadores en ALMARA: cuántos "críticos" de la Central no son urgentes en "Qué comprar" y por qué. Es la evidencia del hallazgo central.

## 1. El cálculo (puro primero, pruebas antes)
- [x] 1.1 Contract tests en rojo: write-set sin escrituras, y demanda igual a la de `sugerirReposicion`.
- [x] 1.2 *(aprobado y aplicado 9-oct)* **[sensible]** `sugerirReposicion` acepta `informe` ya cargado (aditivo; sin él, igual que hoy). Diff aparte.
- [x] 1.3 *(aprobado y aplicado 9-oct; también expone documentos repetidos y ajustes manuales)* **[sensible]** El informe KPI cuenta salidas sin motivo por producto y bodega (campo nuevo, aditivo; los consumidores actuales no cambian). Diff aparte.
- [x] 1.4 `inventoryInsights.js`: comprar y ventas en riesgo, capital parado y traslados, con pruebas puras.
- [x] 1.5 Los cuatro detectores de avisos, con pruebas.
- [x] 1.6 Motivos deterministas por plantilla.

## 2. La IA
- [x] 2.1 Prompt, esquema de salida y validación (id, acción, guarda de números, largos), con pruebas, incluido Opttia caído.
- [x] 2.2 `explicarInsights` sobre `pedirJsonAOpttia`, con entrada armada en el servidor.

## 3. Endpoints y herramienta
- [x] 3.1 `GET /v1/inventory/insights` (controlador propio `controllers/inventoryInsights.js`, con `requireJwtTenant`).
- [x] 3.2 `POST /v1/inventory/insights/explicar` con `validateAILimit('chat')`.
- [x] 3.3 *(también agregada a la lista de Opttia en `kai/adk_agent/tools/mcp_katuq_toolset.py`; sin eso el chat no la ve)* Herramienta MCP `get_inventory_insights`, entrada en `opttiaAccessPolicy.js` y `toolRegistry.js`, con prueba de aislamiento por empresa.
- [x] 3.4 Pregunta sugerida de inventario en la lista del chat.

## 4. Frontend
- [x] 4.1 Métodos y modelos en `InventarioService`.
- [x] 4.2 Los cuatro componentes y la Central rehecha, en el tema canónico (sin gradientes, sin primarios prohibidos).
- [x] 4.3 *(la pregunta queda escrita en el chat y la persona la envía: respeta consentimiento y cupo)* Botón "Explicar con Opttia" y chips hacia el chat.
- [x] 4.4 *("Qué comprar" ya preselecciona los urgentes al abrir: basta el enlace)* "Pasar a la orden" hacia "Qué comprar".
- [ ] 4.5 *(build OK; falta la prueba en navegador, que necesita el backend desplegado o corriendo contra producción)* Build sin errores y prueba en el navegador con sesión real (FLORECER y ALMARA), probando también Opttia caído.

## 5. Resumen semanal
- [x] 5.1 Bandera `inventoryDigest` en `FEATURE_FLAG_NAMES`, con su prueba.
- [x] 5.2 Estado, semana clave y comparación con la anterior (puro), con pruebas.
- [x] 5.3 Destinatarios y baja por persona (enlace firmado y ruta pública), con pruebas.
- [x] 5.4 Plantilla del correo en el tema canónico.
- [x] 5.5 Motor y cron (`INVENTARIO_DIGEST`): idempotencia, sombra, falla aislada, tope por corrida.

## 6. Cierre
- [ ] 6.1 Suites, builds y contratos en verde (backend y front).
- [ ] 6.2 Contrastar con ALMARA, Café Escobar y OH MY STORE (sin demanda) antes de publicar; revisar que la lista creíble y las cifras coincidan con "Qué comprar".
- [ ] 6.3 Desplegar backend y después front (avisar a Daniel; sale del modo automático).
- [ ] 6.4 Una semana después: retirar `POST /kai/inventory-analysis`, `POST /inventory/analyze-ia`, `POST /inventory/analizar-abastecimiento-ia` (tercera ruta vieja, encontrada al implementar), `GET /inventory/central-abastecimiento`, `parseIAResponse`, `analizarAbastecimientoIA`, `analyzeInventoryWithIA` y el botón IA del catálogo.
- [ ] 6.5 Encender `INVENTARIO_DIGEST=sombra` y la bandera en FLORECER, luego ALMARA y Café Escobar; revisar el resumen guardado durante dos semanas.
- [ ] 6.6 Con el OK de Daniel, `envio` por empresa.
- [ ] 6.7 Registrar el cierre en `specs/CONTRACT.md` y actualizar el tablero único de inventario.
