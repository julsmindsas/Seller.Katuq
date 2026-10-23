# Contratos aprobados — D-545

Complemento del diseño aprobado por Daniel el 2026-10-23 («sí aprobado, prepara las tareas para implementarlo»). Tareas aprobadas posteriormente mediante «sí»; implementación local iniciada. Estos contratos no acreditan por sí solos rutas implementadas. Los nombres `katuq:*` mantienen el protocolo existente.

## A. Capacidad y descubrimiento

`GET /v1/opttia/access` conserva sus campos de cuota. `tools` puede incluir `create_support_ticket` únicamente con bandera y acceso de soporte vigentes; añadir `supportTicketCreation: boolean` para que la UI distinga esa excepción. No concede acceso comercial ni consulta de tickets.

`POST /v1/opttia/mcp`, `tools/list`: la definición integrada de `create_support_ticket` conserva asunto/descripcion/adjuntos pero no anuncia `comprobante`; no anuncia parámetros de identidad, permisos o confirmación. No mutar la definición global de otros canales MCP. Declaración del adaptador limitada a los campos de negocio; permisos/metadata no son argumentos del modelo.

El servidor rechaza claves de argumentos no permitidas. Para este carril asunto ≤200, descripción ≤4000 y adjuntos ≤10, cada URL HTTP(S) ≤2048. Se aplican saneado y huella antes de mostrar; no se trunca después de aprobar.

## B. Preparar por MCP

Mensaje admitido como hoy: `POST /agui/basic/v1`, con JWT y empresa coherentes. Se permite opcionalmente `supportDraft` con **solo** datos parciales de negocio para una aclaración y referencias de evidencia declaradas por la persona; ningún token o rol. Una pregunta normal sin ese campo mantiene su comportamiento actual.

El agente invoca `create_support_ticket` sin aprobación. El adaptador llama al MCP con la admisión original. El registro central recibe contexto canónico (`mcpCompany`, `mcpUserEmail`, identificador interno validado de persona y canal integrado) y la herramienta prepara sin escribir.

Resultado wire de propuesta al adaptador:

```json
{
  "isError": false,
  "content": [{"type":"text","text":"{\"success\":false,\"status\":\"aprobacion_requerida\",\"asunto\":\"…\",\"descripcion\":\"…\"}"}],
  "_meta": {
    "katuqSupportProposal": {
      "version": 1,
      "proposalId": "opaco",
      "expiresAt": "ISO-8601",
      "confirmationToken": "sobre-firmado-privado",
      "display": {"company":"…","reporter":"…","asunto":"…","descripcion":"…","adjuntos":[]}
    }
  }
}
```

El adaptador extrae `_meta` (alias del SDK Python verificado por pruebas) antes de entregar el resultado al modelo. Contenido público sin comprobante, firma, admisión, token o metadata privada. `display` lo arma Katuq con la identidad validada. En SSE, `katuq:SUPPORT_PROPOSAL` entrega esa tarjeta al navegador; el evento no se añade a `messages` ni al historial del modelo.

Para `datos_faltantes`, devolver campos parciales/missing y pregunta de aclaración; `katuq:SUPPORT_DRAFT` entrega el borrador al navegador **sin** confirmationToken. No existe una propuesta aprobable hasta que los datos sean suficientes. Para `ya_existia`, emitir un resultado estructurado con número/id/estado verificados, sin crear otra propuesta de alta.

## C. Sobre firmado

Formato versionado HMAC-SHA256, propósito `opttia-support-confirm-v1`, separado de login y del comprobante genérico. Claims internos:

- `purpose`, `version`, `nonce` de servidor, `issuedAt`, `expiresAt`.
- Binding SHA-256 de autorización/sesión actual + empresa + identificador interno de persona + correo validado.
- Hash del objeto canónico `{asunto, descripcion, adjuntos}`; incluye valores/orden íntegros de las URLs.
- Admisión original firmada y comprobante MCP genérico protegidos por el sobre. Nunca el JWT de login.

Expiración: mínimo entre la admisión verificada y cinco minutos desde emisión. La verificación requiere tipos/longitudes válidos, comparación segura de firma, mismo propósito, sesión y contenido. El nonce no lo proporciona el modelo ni el navegador. Extraer metadatos verificados de `opttiaMcpGrant` con un helper que conserve `verify` para los demás consumidores; no confiar en decodificar sin verificar.

Es una capacidad de UI, no prueba de biometría ni defensa frente a un navegador o sesión ya comprometidos. La garantía exigida aquí es que el modelo y los datos externos no reciben esa capacidad y que el servidor no acepta aprobación de otro contexto.

## D. Confirmar en el mismo MCP

Solo el servicio Angular de confirmación envía después del clic:

```json
{
  "jsonrpc": "2.0",
  "id": "id-unico-de-esta-llamada",
  "method": "tools/call",
  "params": {
    "name": "create_support_ticket",
    "arguments": {"asunto":"…","descripcion":"…","adjuntos":[]},
    "_meta": {"katuqSupportConfirmation":{"token":"sobre-firmado-privado"}}
  }
}
```

Inicialización/notificación del protocolo se resuelven en el servicio, no en el componente o con un iframe. El interceptor actual envía Bearer, igual que el ADK; debe verificarse en contratos que el binding de la admisión coincida. La metadata va en el cuerpo JSON, no en URL ni en un header con toda la descripción.

Cabeceras: `Content-Type: application/json`, `Accept: application/json, text/event-stream` y versión negociada del protocolo en las peticiones que la exijan. El SDK instalado devuelve 406 si solo se acepta JSON; habilitar su respuesta JSON no elimina ese requisito. Contexto HTTP opt-in y acotado al endpoint para preservar Accept de MCP en el interceptor; no omitir el interceptor. `postSinLoader` mantiene sus dos argumentos existentes y admite contexto/headers opcionales para este transporte. Handshake, errores y preflight forman parte de los contratos del cliente.

Secuencia de servidor: auth/tenant e identidad vigentes → capacidad/flag/estado de empresa → nombre exacto → schema → sobre y admisión original → `executeTool`. Solo entonces se inyectan el comprobante genérico y la intención idempotente desde contexto interno. Una propuesta recibida con `arguments.comprobante`, otra herramienta o metadata inválida no ejecuta la creación.

No se llama a `/admit` ni al modelo ni se incrementan créditos para este clic. La comprobación de rol/bandera sí se repite; el cupo restante no se usa para negar una intención cuyo mensaje ya fue contabilizado y cuya admisión sigue vigente. Rate-limit de confirmación independiente, sin contabilizar mensajes nuevos.

## E. Resultados y estado del cliente

| Estado de dominio | Tratamiento |
|---|---|
| `datos_faltantes` | Aclarar, sin autorización ni escritura |
| `aprobacion_requerida` | Mostrar tarjeta y controles, nunca «ticket abierto» |
| `abierto` | `success:true`, ticket id/nro/estado verificados; número y Ver mis tickets |
| `ya_existia` | `success:true`, resultado existente; no afirmar nueva creación |
| `resultado_incierto` | Sin éxito; conservar la misma intención para comprobación/reintento seguro |
| Vencida / acceso revocado / bandera apagada / sesión cambiada | Rechazar sin escritura; descartar autorización obsoleta y explicar el siguiente paso |

HTTP 401 es sesión inválida; 403 es permiso/flag/contenido no autorizado, sin enviar credenciales en el mensaje; 429 conserva rate-limit sin gastar otro mensaje; JSON-RPC y `isError:true` deben tratarse como fallo aunque HTTP sea 200. No devolver el sobre en errores ni registrar el cuerpo privado. La tarjeta nunca acepta una URL de navegación arbitraria del modelo: construye `/misTickets` con el número visible retornado.

La máquina de estados es por propuesta y sesión: `draft → review → submitting → created|existing|uncertain`, o desde review `cancelled|expired|revoked`. `uncertain → submitting` reenvía la misma intención, no una alta nueva. No existe transición de texto del modelo a `submitting`. Recarga/limpieza descarta la capacidad local; puede consultarse el número desde Mis tickets o solicitar otra propuesta, aplicando la deduplicación habitual.

## F. Persistencia, concurrencia y write-set

`crearTicketSoporte(cuerpo, actorEmail, deps)` admite idempotencia **solo** mediante opción interna confiable; cuerpos públicos no pueden elegir idempotencia, docId, aprobación ni campos de equipo. Un ticket de esta intención usa `support/opttia_<HMAC(tenant,persona,intencion)>` como clave opaca estable.

Lectura exacta si existe → devolverlo después de validar huella/tenant. Ausente → reservar en el contador habitual → `create()` condicional. ALREADY_EXISTS → devolver el mismo documento. Error ambiguo → releer esa clave; sin comprobación posible, incierto. El docId opaco no sustituye la autorización: cada recuperación revalida identidad, empresa y permiso.

El ticket guarda solo procedencia mínima de aprobación/intención. No se guardan propuestas pendientes en `support`, tokens en documentos o una colección nueva de sesiones/idempotencia. No se escribe antes del clic. Los huecos del contador por un perdedor concurrente se aceptan y no se corrigen borrando números. La ruta normal sin intención conserva comportamiento.

Write-set autorizado: `support` (alta condicional y metadatos mínimos en el mismo documento), `contadores/tickets` existente y destinos habituales de avisos/bitácora de notificaciones. No escribir `orders`, `products`, `inventory`, `inventoryMovement`, precios, pagos o facturas. La rama ganadora dispara los avisos habituales; la existente no crea notificaciones de nuevo. No se promete entrega exactamente una vez de SMTP o Slack.

## G. Gates de verificación

Schemas MCP request/result con `_meta` ya comprobados en memoria con el SDK Node instalado; falta validar adaptación Python y HTTP completo. Pruebas futuras deben verificar captura de prompts/trazas con centinelas privados, sobre alterado/otro usuario/tenant, adjuntos sustituidos con igual cantidad, caducidad, revocación, solo-soporte, cuota final ya reservada, concurrencia real de dobles persistentes y resultado perdido.

Usar fakes/emulador explícito sin credenciales productivas. Los avisos se interceptan antes de cargar el servicio. Un ensayo operacional que realmente cree el ticket y envíe avisos requiere autorización separada. No se certifica ningún resultado de esas pruebas a partir de este documento.
