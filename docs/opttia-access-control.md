# Opttia: consultas por MCP y aislamiento de comercio

## Estado

Actualización posterior del 8 de septiembre: Seller `2026.09.08.7`, bundle `main.62ff93475de7185a.js`. Se verificaron consultas autenticadas de stock por MCP en Sellercenter y la carga de las métricas corregidas. El bloqueo por correo duplicado se resolvió usando también la identificación firmada (`sub`), sin ampliar permisos. El inventario distingue agotados, bajo stock y productos sin datos; MCP separa totales de muestra. Ventas comparte cálculo con MCP y límites del día colombiano; despacho usa cola completa con urgentes del mismo conjunto; CRM usa fechas de Colombia. Clientes/recompra muestran etiquetas acordes a su alcance real. Pasaron 18 pruebas backend y 9 de navegación; las 4 pruebas nuevas de métricas pasaron también en el servidor. Respaldo de esta última actualización: `before-operational-metrics.tar.gz` en el directorio de respaldos descrito abajo. Los apartados siguientes documentan el despliegue inicial y sus verificaciones de ese momento.

Desplegado el 8 de septiembre de 2026: backend Katuq, ADK, SupplyKai/Opttia y Seller.
Seller: `2026.09.08.2`, bundle `main.b8a0a5d05ed0fbcd.js`. Opttia: despliegue Vercel `dpl_ARK78mcLSyCDBkzJmCQQn3UGUcLk`, publicado en `www.opttia.com` y sus aliases.

## Flujo integrado en Katuq

1. Seller envía la sesión JWT del usuario a AG-UI v2.
2. ADK valida identidad y pertenencia; Katuq vuelve a consultar usuario activo, rol, empresa y plan.
3. `POST /v1/opttia/admit` reserva el cupo diario mediante la transacción existente. Gratis: 10 mensajes por día UTC, usuario y comercio.
4. Solo si la admisión fue permitida se entrega un recibo firmado de cinco minutos, ligado al JWT, usuario y comercio. ADK lo conserva únicamente en el contexto de la petición: no se envía por SSE al navegador ni se guarda en prompts, agentes compartidos o sesiones.
5. Descubrimiento y ejecución usan el SDK MCP y Streamable HTTP en `POST /v1/opttia/mcp`, no la API legacy.
6. Cada mensaje MCP revalida el JWT, la empresa y los permisos actuales. `tools/list` solo expone lecturas permitidas, con sus esquemas reales. `tools/call` requiere además el recibo de cupo; valida argumentos y rechaza otro comercio.

El recibo autoriza las lecturas del turno admitido, no otro mensaje al modelo. El último mensaje del día puede completar varias consultas sin doble cobro. No es una API key reutilizable del comercio. Caduca a los cinco minutos; entonces se debe enviar otra consulta.

`GET /access` sigue siendo una consulta sin consumo. `POST /tools/call` devuelve 410: no queda como vía alternativa al protocolo MCP.

## Alcance de seguridad

- El chat integrado queda **solo de lectura**. Cambios de pedidos, transportadores y stock están bloqueados tanto por MCP como por los callbacks y el endpoint de confirmación de Katuq. Se realizan desde Katuq hasta implementar autorización de confirmaciones en servidor.
- Agente de consulta independiente por petición, sin los conectores demo ni las credenciales del factory legacy.
- Las respuestas se basan en herramientas actuales; no se recupera memoria semántica compartida ni se reutilizan resultados de conversaciones anteriores como datos vigentes. Un seguimiento ambiguo puede necesitar repetir la referencia del producto.
- `get_product_stock` verifica pertenencia del producto antes de devolver incluso su nombre/precio o indicador de servicio. Sigue usando el helper canónico de stock y su normalización/deduplicación.
- Opttia web no debe usar una key compartida como sustituto de la identidad del usuario. Una cuenta nativa SupplyKai no se convierte en identidad Katuq por coincidencia de correo o nombre del comercio.
- SupplyKai ya no usa un comercio predeterminado; exige sesión y selección autorizada. Al cambiar de comercio cancela la consulta, limpia los resultados y descarta respuestas tardías.
- No se implementó todavía el alta de una conexión delegada desde una cuenta nativa SupplyKai. Sin identidad Katuq validada, su MCP queda bloqueado; no se generan keys automáticamente.
- No es una auditoría completa del OAuth y MCP legacy ni de otros canales externos. Los hallazgos previos de esos caminos requieren una intervención separada antes de habilitar conexiones externas nuevas.

## Verificación local

- Backend: 9 pruebas aisladas (cupo concurrente, revocación, tenant, recibo ligado a sesión/usuario, expiración, API retirada, escrituras bloqueadas y producto de otra empresa).
- ADK: 33 pruebas, incluyendo Express/JWT, SDK MCP cliente y servidor y Runner reales con modelo, Firestore y herramientas simuladas.
- SupplyKai: TypeScript sin errores.
- No se ejecutaron consultas sobre datos productivos, llamadas al modelo ni modificaciones de inventario durante las pruebas.

Ejecutar en backend:

```sh
node --test functions/tests/opttia-access.test.js functions/tests/opttia-mcp-security.test.js
```

En `kai/adk_agent`, configurar `KATUQ_TEST_BACKEND_ROOT` al checkout del backend:

```sh
PYTHONDONTWRITEBYTECODE=1 .venv-claude/bin/python -m pytest tests/test_katuq_access_integration.py tests/test_katuq_access_policy.py tests/test_katuq_jwt_auth.py tests/test_hitl_write_flow.py -q -p no:cacheprovider
```

## Despliegue y respaldo

Publicados coordinadamente backend (incluida la dependencia explícita AJV), ADK y SupplyKai. No se cambiaron keys ni configuraciones de comercio. ADK usa `KATUQ_ACCESS_API_URL` (defecto `https://back.katuq.com/v1/opttia`) para acceso y MCP; el JWT y su secreto existente deben seguir coincidiendo con Katuq.

Antes del reemplazo pasaron 9 pruebas de backend y 33 de ADK en un directorio aislado del servidor, usando Node 20 y ADK 1.23.0/MCP 1.29.0 de producción. También pasaron 9 pruebas locales del menú de Seller, el build productivo y el build de Vercel. No se actualizaron los paquetes del runtime ADK.

Respaldo de originales: `/home/ubuntu/deploy-backups/opttia-20260908.ozIUYs/backend-before.tar.gz` y `adk-before.tar.gz`. Para rollback, restaurar en la raíz del repositorio correspondiente y reiniciar solo `katuq-api`/`kai-adk`. Versión anterior de Vercel: `dpl_FG5x76Famtkto6mdwVkRGqR77oRX` (`supplykai-osniln9di-julsmindsas-projects.vercel.app`).

Verificación pública: Opttia y login 200, ADK y AG-UI health 200, MCP sin sesión 401, chat anónimo RUN_ERROR y confirmación anónima 403. Versión y bundle de Seller coinciden con el build publicado. **Queda pendiente la consulta autenticada de stock con una sesión real del usuario**; no se invocó el modelo ni se modificó inventario productivo durante este despliegue.
