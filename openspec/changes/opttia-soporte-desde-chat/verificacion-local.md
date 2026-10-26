# Implementación local parcial — D-545, 2026-10-23

> Registro histórico **anterior** a la aprobación concreta del diff. Ese gate ya se aprobó y el diff fue aplicado. Estado y pruebas actuales: `verificacion.md`. Los comandos/resultados «servicio intacto» y candidato en memoria de este archivo corresponden solo a aquel momento.

Daniel aprobó las tareas mediante «sí». Este informe acredita solo el primer bloque local; el recorrido completo del chat no está implementado ni publicado. Continúa el gate humano 2.3 antes de cambiar el servicio compartido. Cero tickets, correos, Slack, escrituras remotas o llamadas a modelos reales.

## Línea base y alcance de esta sesión

- Seller: `36973894`, `feature/venta-asistida-mejorada`.
- Backend: `f322affe`, `backend-aws-security`.
- ADK: `1a1a434`, `feat/claude-agent-sdk`.
- Había modificaciones ajenas de flags, historial/precios de pedidos y Opttia nativo, además del candidato previo de marca. Se preservaron. Esta sesión no cambió archivos de producto Angular o Python, package.json, los catálogos de flags ni datos/roles.
- Instrucciones del repositorio y de `functions/services`, `routers` y `tools` revalidadas. El flujo objetivo conserva interceptor → auth/tenant → router MCP → registro central → herramienta → servicio habitual → Firestore/contador/avisos.

## Aplicado localmente en backend

- `functions/services/opttiaMcpGrant.js`: `readVerified` expone solamente metadata de admisión ya verificada; `verify` conserva retorno booleano. Reloj inyectable para pruebas, sin alterar el secreto ni el TTL de producción.
- `functions/services/opttiaSupportProposal.js`: normalización cerrada, límites de texto/evidencias, hash de contenido íntegro, HMAC con propósito separado y nonce del servidor, binding de sesión/persona/empresa, expiración limitada a la admisión original y clave opaca estable de ticket para la misma propuesta. Sin persistencia, red, caché o logs.
- Contratos/harness: `functions/tests/opttiaSupportProposal.test.js`, `functions/tests/fixtures/opttiaSupportMemory.js`, `functions/tests/support/opttiaIntent.contract.test.js`. La VM solo acepta dependencias enumeradas; Firestore/RTDB/correo/Slack son dobles en memoria y un require inesperado falla, sin cargar Firebase/SMTP productivos.

El helper aún **no está conectado** al router, ADK o UI: no demuestra aislamiento de credenciales respecto del modelo ni confirmación humana de extremo a extremo. Esos gates siguen pendientes.

## Resultados reproducibles

Desde el backend:

```sh
node --test functions/tests/opttiaSupportProposal.test.js functions/tests/opttia-access.test.js functions/tests/opttia-mcp-security.test.js functions/tests/opttia-burst-limit.test.js
```

**28/28**: 11 contratos nuevos del helper y 17 regresiones existentes de acceso, admisión, tenants, cuotas/ráfagas, stock y bloqueo de escrituras. El archivo nuevo falló antes de implementar porque faltaba el helper.

```sh
node --test functions/tests/support/opttiaIntent.contract.test.js
```

**4/12 verdes, 8 rojos esperados** contra el servicio real sin modificar. Confirman que todavía faltan la exclusión concurrente, recuperación del mismo ticket y saneamiento de campos reservados; no son regresiones introducidas al alta compartida. No se declara verde la suite global del cambio.

```sh
OPTTIA_SUPPORT_CANDIDATE_PATCH='/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/Seller.Katuq/openspec/changes/opttia-soporte-desde-chat/crearTicket.idempotency.proposed.patch' node --test functions/tests/support/opttiaIntent.contract.test.js
```

**12/12** contra el diff candidato aplicado **solo al texto en memoria** dentro de la VM; no al archivo del servicio. Prueban dos confirmaciones simultáneas, reintento, respuesta perdida tras guardar, resultado no comprobable, identidad/huella alteradas, datos públicos sin autoridad, fallo de lectura y numeración habitual (incluidas 30 intenciones distintas). Son dobles, no un ensayo de Firestore real o entrega de avisos.

`node --check` aprobó los cinco archivos JS propios. `git diff --check` acotado sin incidencias. `git apply --check` aceptó el diff candidato; `git diff --exit-code -- functions/services/soporte/crearTicket.js` confirmó que el servicio sigue intacto. El harness fija SHA-256 de la base y rechaza probar el candidato si esta cambia.

No hay build Angular ni compilación/pruebas ADK en esta fase: no se modificaron esos productos. Sus tareas siguen pendientes, junto con pruebas de capacidad/flag, schemas/MCP completo, privacidad ante el modelo, transporte, tarjeta y QA visual. No se ejecutaron suites MCP que consultan Firestore ni suites antiguas que inicializan correo al importar el servicio.

## Diff para aprobación 2.3 — NO APLICADO

Archivo: `crearTicket.idempotency.proposed.patch` en este cambio. Base del servicio: SHA-256 `3023612e602855c6bde89dcba9c1e8b27bf28636cd056849e80c3e287f11ca1c`.

1. Añade opción interna `deps.idempotency`, validada contra empresa/autor/huella. El cuerpo público no puede elegirla ni guardar capacidades de confirmación.
2. Lee la clave opaca exacta y, si coincide, devuelve el ticket anterior sin reservar ni avisar otra vez.
3. Ausente: llama a la **misma** `reservarNroTicket` y crea condicionalmente. La función/fórmula/ruta del contador no cambian; el perdedor puede dejar un hueco, nunca sobrescribir un ticket.
4. Ante error de creación, relee esa misma clave; si no puede acreditar resultado, devuelve error incierto. No utiliza una alta alternativa.
5. Solo la rama que creó con resultado comprobado dispara los avisos habituales. Tras una respuesta perdida puede recuperarse el ticket sin demostrar entrega de avisos: continúan best-effort, sin outbox nuevo.
6. Sin intención conserva el recorrido habitual de alta; se eliminan únicamente los nuevos campos reservados. `deps.fs` se usa también para la referencia del ticket, coherente con su inyección para el contador.

Write-set del candidato: `support` y `contadores/tickets` existentes más la rama habitual de avisos; el doble falla ante otra colección/ruta. No cambia pedidos, productos, stock, precios, pagos o facturas. Aprobar este diff permite continuar la implementación local ya autorizada, no publicar, activar una bandera o abrir tickets reales.
