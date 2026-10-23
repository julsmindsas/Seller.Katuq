> **Estado:** PROPUESTA, pendiente de aprobación. Ticket 1339 (ALMARA FELICIDAD). Decisión: D-XXX (la pone la sesión principal). Delta de la capability archivada `support-ticket-creation`. Solo documento: sin diseño, sin tareas y sin código.

## Why

Desde Claude no se pueden adjuntar archivos a un ticket de soporte. El camino de hoy tiene tres pasos:

1. `get_support_evidence_upload_url` devuelve una URL firmada;
2. se sube el archivo con un PUT a esa URL;
3. `add_support_ticket_evidence` lo registra en el ticket.

El paso 2 falla, porque el entorno donde corre Claude tiene la red restringida y no llega a `storage.googleapis.com`. Mandar el archivo en base64 tampoco sirve: un PDF de 300 KB obliga a Claude a escribir unos 400 KB de texto. Caso real: los tickets [Menú 1/4] a [Menú 4/4] y el de filtros de cotizaciones quedaron sin evidencia y la persona la subió a mano.

Verificado en el código el 23-oct, sin leer producción. Backend en `backend-aws-security` (`f322affe`).

- **Las fuentes del servidor ya existen** (commit `bc7c67d6`, 19-sep): `urlArchivo` (el servidor descarga, protegido contra direcciones internas), `rutaStorage` (subida firmada de 15 minutos) y `contenidoBase64`.
  - Topes: 15 MB, y 50 MB para audio y video (`tools/addSupportTicketEvidence.js:30-32`).
  - Tipos permitidos: imágenes, PDF, Excel, CSV, Word, audio y video (`tools/_evidenciaFuentes.js:19`).
  - `urlArchivo` solo sirve si el archivo ya está publicado en internet. Un pantallazo del computador no lo está.
- **La subida firmada exige un ticket que ya exista:** pide su id y guarda en la carpeta de ese ticket (`tools/getSupportEvidenceUploadUrl.js:45` y `:68`). No sirve antes de crearlo.
- **La tarjeta de aprobación ya existe, pero no recibe archivos.**
  - `create_support_ticket` muestra «Abrir un ticket de soporte» (`tools/createSupportTicket.js:171`) en la pantalla genérica `ui://katuq/confirmar/cambio.html` (`services/mcp/apps/index.js`).
  - La pantalla solo muestra y aprueba. `adjuntos` acepta URLs ya subidas, y la aprobación cubre cuántas son.
- **Las tarjetas no pueden hablar con el almacenamiento:** todas declaran la política de contenido vacía (`services/mcp/uiResources.js`, `metaDePantalla`: `connectDomains: []`).
- **`add_support_ticket_evidence` no tiene tarjeta.**

## What Changes

- **«Adjuntar archivos» en la tarjeta de aprobación del ticket.** La persona elige o arrastra uno o varios archivos, con los mismos tipos y topes de hoy. El navegador de la persona los sube directo al almacenamiento de Katuq: el archivo nunca pasa por el entorno de Claude ni por el texto del chat.
- **Lista antes de aprobar:** nombre, tamaño, vista previa de las imágenes y «Quitar». Aprobar crea el ticket con exactamente esos archivos.
- **Cancelar o dejar vencer** la tarjeta no deja archivos en ningún ticket. Lo subido y no aprobado se descarta.
- **La misma tarjeta para un ticket ya creado:** `add_support_ticket_evidence` sin fuente abre la tarjeta de carga del ticket indicado, si es de la empresa de la sesión.
- **La tarjeta declara solo el origen del almacenamiento de evidencias** como destino permitido. Nada más se abre.
- **Base64 con límite claro:** se documenta el tamaño máximo, y si se pasa, el mensaje dice que use la tarjeta. El número lo propone el diseño (el ticket sugiere 50 KB); hoy solo aplica el tope general de 15 MB.
- **La guía del MCP documenta la alternativa** de que el administrador de Claude habilite el dominio del almacenamiento, sin depender de ella.
- **Los clientes sin tarjetas** (Codex, otros) y el chat integrado de Opttia (D-545) siguen con los caminos de hoy.

### Fases

| Fase | Qué entrega |
|---|---|
| **F1** | Adjuntar en la tarjeta al crear el ticket: elegir, arrastrar, lista, quitar y aprobar. Política de contenido con el origen del almacenamiento. Descarte de lo no aprobado. Límite documentado del base64. |
| **F2** | Tarjeta de carga para un ticket ya creado desde `add_support_ticket_evidence` sin fuente. |

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `support-ticket-creation`: se agregan los requisitos de adjuntar evidencia desde la tarjeta del MCP, al crear y en un ticket existente. Los requisitos actuales no cambian.

## Impact

- **Backend:**
  - `tools/createSupportTicket.js`, `tools/addSupportTicketEvidence.js`, `tools/getSupportEvidenceUploadUrl.js` y `tools/_evidenciaFuentes.js`;
  - la tarjeta en `services/mcp/apps/` (la de confirmar o una de carga; lo decide el diseño);
  - la política de contenido por pantalla en `services/mcp/uiResources.js`.
- **Infraestructura:** el almacenamiento debe aceptar subidas desde el origen de la tarjeta, sin abrirse a cualquiera.
- **Write-set:** archivos en la carpeta de subidas de tickets y la evidencia en el ticket, por el mismo camino que la app de Support. Sin colecciones nuevas y sin endpoints «v2».
- **Coordinación:** la sesión de D-545 tiene cambios sin commitear en `tools/createSupportTicket.js` (`executeIntegrated`, chat de Opttia). Esta propuesta no toca ese camino.

## No-goals

- Subir por partes en base64 (punto 4 del ticket, opcional).
- Nuevos tipos de archivo o topes distintos a los de hoy.
- Adjuntar desde el chat integrado de Opttia (alcance de D-545).
- Editar o borrar evidencias ya registradas.
- Cambiar la app de Support o los avisos de creación.

## Riesgos

- **El host puede no dejar elegir archivos** dentro de la tarjeta, o no respetar el origen declarado. Se verifica con una prueba en Claude web y escritorio **antes del diseño** (ver la pregunta 1).
- **Archivos huérfanos:** lo subido y no aprobado ocupa espacio hasta que se limpie.
- **La aprobación debe cubrir los archivos exactos:** si la lista cambia después de mostrarla, la aprobación ya no vale.
- **Seguridad:** las URLs de subida duran poco, sirven para un solo archivo y quedan ligadas a la empresa y al ticket o a la propuesta. El servidor revisa tipo y tamaño al registrar, sin confiar en la tarjeta.
- **Datos personales:** un pantallazo puede traerlos. Nunca van a los logs; solo identificadores.

## Preguntas para Daniel

1. **Si Claude no deja elegir archivos en la tarjeta, ¿cuál es el plan B?**
   - **Recomendada:** un enlace de un solo uso a una página de Katuq, ligado al ticket o a la propuesta, para subir ahí.
   - Alternativa: solo documentar que el administrador de Claude habilite el dominio del almacenamiento.
2. **¿Cuánto se guardan los archivos subidos y no aprobados?**
   - **Recomendada:** se borran al cancelar y, si nadie decide, a las 24 horas.
3. **¿La F2 (ticket ya creado) sale con la F1 o después?**
   - **Recomendada:** en la misma entrega, porque reutiliza la tarjeta y cubre el punto 2 del ticket.
4. **¿Para todos o con bandera?**
   - **Recomendada:** para todos, con un interruptor global en `config/` para apagarlo (D-505), porque solo toca los tickets de la propia empresa y no datos operativos.
