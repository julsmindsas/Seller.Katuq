## Why

El 23 y 24-sep-2026 la pauta trajo 6 registros y **5 nunca entraron a Katuq**. Al terminar el registro, la persona es enviada al inicio de sesión con una contraseña aleatoria que solo llega por correo, y ese correo (notificaciones@katuq.com) falla la verificación DMARC y suele caer en spam. Cada registro pagado (unos $6.500) que no entra se pierde, y sin uso no hay métricas reales para inversionistas ni casos de éxito. Es urgente porque la pauta está activa hasta el 30-sep y se quiere subir el presupuesto.

## What Changes

- El formulario de `/registrarse` pide una **contraseña elegida por la persona**, con opción de mostrarla y las reglas mínimas a la vista.
- Al terminar un registro **aprobado**, Katuq **inicia la sesión de una vez** y lleva a la persona a su primer paso dentro del panel. Ya no pasa por la pantalla de inicio de sesión ni por el cambio de contraseña obligatorio.
- El backend guarda la contraseña elegida con el mismo formato que usa el inicio de sesión hoy, no genera contraseña temporal para estos registros y no fuerza el cambio.
- El correo de bienvenida **deja de llevar contraseña**: confirma la cuenta y trae el enlace para entrar y el de "Olvidé mi contraseña".
- Registros que el anti-abuso deja **en revisión**: no reciben sesión. La contraseña elegida queda guardada con la cuenta inactiva, así que al aprobarlos a mano entran con ella (cierra el hueco de la contraseña temporal que se perdía).
- **Compatibilidad**: un navegador con el front viejo en caché, que no manda contraseña, sigue funcionando como hoy (contraseña temporal por correo) hasta retirar ese camino.
- Los píxeles de pauta no cambian: `CompleteRegistration` sigue saliendo solo cuando el registro queda aprobado.

## Capabilities

### New Capabilities
- `self-registration-access`: el registro público deja a la persona dentro de Katuq con la contraseña que eligió, sin depender del correo; incluye el trato de los registros en revisión y la compatibilidad con clientes viejos.

### Modified Capabilities
- Ninguna (no existe spec previa del registro en `openspec/specs/`).

## Impact

- **Frontend (este repo)**: `src/app/components/diagnostic-survey/` (campo de contraseña, pantalla de éxito, redirección), `shared/services/quickstart/katuq-quickstart.service.ts` (envía la contraseña con hash y recibe la sesión) y el servicio de sesión/login (iniciar sesión con la respuesta del registro).
- **Backend (repo `katuq_admin_back_firebase`)**: `controllers/diagnostics.js` `saveSurveyResponse` (acepta y valida la contraseña, la guarda con el mismo formato del inicio de sesión y la quita antes de guardar `surveyResponses`) y la plantilla de bienvenida en `services/notifications/templates/registro.js`.
- **API**: el mismo endpoint `POST /v1/diagnostics/saveSurveyResponse`, con un campo nuevo opcional en la petición; la respuesta no cambia. La sesión se abre con el inicio de sesión de siempre (`POST /v1/authentication`). Sin endpoints nuevos, sin "v2" y sin colecciones Firestore nuevas.
- **Seguridad**: el endpoint público de registro no entrega sesiones. El front abre la sesión con el inicio de sesión de siempre, que ya bloquea las cuentas inactivas (las que quedan en revisión). La contraseña nunca se registra en logs ni en `surveyResponses` (Artículo XI).
- **Despliegue**: primero el backend (acepta la contraseña opcional y el front viejo sigue funcionando), después el front.
- **Decisión**: se registra como D-319 en `specs/CONTRACT.md`.

## No-goals

- No cambia el inicio de sesión, "Olvidé mi contraseña" ni la política de contraseñas del resto del sistema.
- No arregla la verificación del correo (SPF, DKIM, DMARC de katuq.com): eso lo hace Daniel en el DNS y va aparte.
- No rediseña la primera pantalla después de entrar (subir el primer producto): es otra propuesta.
- No toca pedidos, inventario ni consecutivos.

## Riesgos

- **Registro falso que pasa el anti-abuso**: entra con sesión. Hoy ya queda con usuario activo y credenciales por correo, así que el riesgo no crece.
- **Front en caché**: sin el camino de compatibilidad, un navegador viejo registraría sin contraseña. El backend conserva el flujo actual cuando no llega contraseña.
- **Contraseñas débiles**: se validan las mismas reglas mínimas en el front y en el backend.
