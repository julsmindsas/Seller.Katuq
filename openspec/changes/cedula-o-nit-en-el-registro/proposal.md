## Why

Por Meta, 7 personas empezaron el registro y solo 4 lo terminaron. El paso del documento es candidato fuerte a esa pérdida:

- El campo pregunta por "NIT o documento de identidad", pero **el formulario rechaza las cédulas de 6 y 7 dígitos**: exige entre 8 y 11. Muchas personas mayores tienen cédulas así, y el backend sí las acepta (6 a 15).
- Quien no tiene NIT duda qué poner y termina inventando. "La inglesa" registró 123456778, y el detector de números inventados no lo reconoce: tampoco reconoce 1234567890.

Hoy un número inventado entra como si fuera un registro real y se cuenta en el reporte de pauta, que es con el que se decide si sube el presupuesto.

## What Changes

- El campo se llama **"Cédula o NIT"**, con una ayuda corta: "Si no tienes NIT, pon tu cédula."
- Acepta **de 6 a 11 dígitos** en el formulario, igual que el backend.
- Si el número **parece inventado** (serie como 123456…, 987654… o todos los dígitos iguales), el formulario muestra un **aviso amable que no bloquea**: la persona puede corregirlo o seguir.
- El backend marca la empresa como **documento por confirmar** cuando el número parece inventado. Un NIT con dígito de verificación válido nunca se marca.
- El aviso interno de registro nuevo muestra esa marca, y el reporte de pauta puede separar esos registros de los confirmados.
- **No cambia** el control contra registros falsos: un número inventado no sube el riesgo más que hoy, así que no manda más registros a revisión.

## Capabilities

### New Capabilities
- `registration-identity-document`: cómo el registro pide, valida y marca el documento de identidad (cédula o NIT) sin frenar a quien no tiene NIT.

### Modified Capabilities
- Ninguna (no hay spec previa del registro en `openspec/specs/`; `self-registration-access` vive en el cambio `entrar-directo-al-registrarse`, todavía sin archivar).

## Impact

- **Front (este repo)**: `components/diagnostic-survey/` (etiqueta, patrón de 6 a 11 dígitos, aviso no bloqueante).
- **Backend (`katuq_admin_back_firebase`)**: `services/registrationSecurity.js` (función nueva que dice si el documento parece inventado, sin tocar el puntaje de riesgo), `controllers/diagnostics.js` (dos campos en la empresa) y `services/notifications/templates/registro.js` (la marca en el aviso interno).
- **Datos**: dos campos nuevos en el documento de `companies`: `documentoPorConfirmar` (booleano) y `motivoDocumento`. Sin colecciones nuevas, sin endpoints nuevos.
- **Depende de** `entrar-directo-al-registrarse` (misma pantalla y mismo controlador): se implementa encima de ese cambio.
- **Decisión**: se registra como D-XXX en `specs/CONTRACT.md` al aprobarse.

## No-goals

- No valida el NIT contra la DIAN ni el RUES.
- No acepta pasaportes ni documentos con letras: eso requiere cambiar la validación del backend y queda fuera.
- No cambia el puntaje de riesgo ni los umbrales de revisión y rechazo.
- No toca pedidos, inventario, consecutivos ni facturación: el documento del comercio no se usa aquí para facturar.

## Riesgos

- **Un NIT real con una serie adentro** (ej. 890123456) quedaría marcado. Se mitiga: el dígito de verificación válido excluye la marca, y la marca solo separa métricas, nunca bloquea.
- **Métricas**: si el reporte de pauta no lee la marca, no cambia nada. Queda como tarea explícita en el reporte.
