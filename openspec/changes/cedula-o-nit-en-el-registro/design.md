## Context

- **Front** (`diagnostic-survey.component.ts`): la pregunta es "¿Cuál es tu NIT o documento de identidad?", el placeholder "NIT o cédula" y el patrón `^[0-9]{8,11}$`. El error dice "Debe contener entre 8 y 11 dígitos".
- **Backend** (`registrationSecurity.js`): `validateRegistrationInput` acepta `^[0-9]{6,15}$`. `looksFakeNit` suma 35 puntos de riesgo, pero solo reconoce números de menos de 6 dígitos, todos los dígitos iguales o una subcadena exacta de `0123456789` / `9876543210`. Por eso no reconoce 123456778 ni 1234567890. `nitChecksumValid` resta 20 puntos si el dígito de verificación de un NIT de 9 o 10 dígitos es válido.
- La marca de riesgo existente (`riskScore`, `riskReasons`) ya se guarda en la empresa, pero sirve para el control contra registros falsos, no para las métricas.

## Goals / Non-Goals

**Goals:** quitar el rechazo de cédulas cortas, ayudar a quien no tiene NIT y separar los registros con documento dudoso sin perderlos.

**Non-Goals:** validar contra la DIAN o el RUES, aceptar pasaportes, cambiar el puntaje de riesgo.

## Decisions

### D1. Una sola regla de "parece inventado", repetida en front y backend
Un documento parece inventado si:
- todos sus dígitos son iguales, o
- contiene una serie ascendente o descendente de 7 o más dígitos seguidos (`1234567`, `9876543`, y también `5678901` si se da la vuelta del 9 al 0). Con 6 caería una cédula normal como 43123456, que termina en `123456`.

La regla es corta y se escribe dos veces, una en TypeScript y otra en JS. Una prueba de contrato del backend fija los casos (123456778, 1234567890, 987654321, 111111111 → sí; 43123456, 52817346 → no), y el front usa la misma tabla de casos en un comentario.

- **Alternativa descartada: arreglar `looksFakeNit`.** Subiría el riesgo de registros que hoy entran (35 puntos más) y mandaría más gente a revisión, lo contrario de la meta. La función de riesgo no se toca.

### D2. El dígito de verificación válido gana
Si `nitChecksumValid` da `true`, no hay marca. Así un NIT real con una serie adentro no se marca.

### D3. Dos campos en la empresa, sin colección nueva
`documentoPorConfirmar: true` y `motivoDocumento: "serie" | "repetido"`. Se guardan solo cuando aplica; su ausencia significa "sin dudas". Los reportes filtran con `documentoPorConfirmar != true`.

### D4. Aviso no bloqueante en el front
Es un mensaje debajo del campo, con el par semántico de alerta del tema (`#D9820A` sobre `#FFF1DF`), sin ícono de error y sin deshabilitar el botón de continuar. Texto: "¿Seguro que es tu número? Parece una serie. Si no tienes NIT, pon tu cédula." No es un validador del formulario: se calcula aparte para no marcar el campo como inválido.

### D5. El píxel de pauta no cambia
`CompleteRegistration` sigue saliendo para todo registro aprobado. La marca vive en Katuq, no en Meta ni en TikTok. Ver la pregunta abierta.

## Risks / Trade-offs

- **[Riesgo]** Falsos positivos en cédulas reales con series (por ejemplo 1012345678). → La marca solo separa métricas. Se revisa la tasa de marcados a la semana.
- **[Riesgo]** El reporte de pauta vive en otra sesión. → La marca no sirve si nadie la lee. Hay una tarea explícita para avisarle a esa sesión cuál es el campo.
- **[Trade-off]** La regla está duplicada en front y backend. → Es corta, y la prueba de contrato fija los mismos casos.

## Migration Plan

1. Backend primero: la función, los campos y el aviso. Es compatible con el front de hoy.
2. Front: la etiqueta, el patrón de 6 a 11 dígitos y el aviso.
3. No hay backfill: los registros viejos no se marcan. Si Daniel lo pide, se hace un script aparte con `--dry-run`.
4. Rollback: revertir el front devuelve la etiqueta y el patrón. Los campos de más en la empresa no le hacen daño a nada.

## Open Questions

1. **¿Los registros por confirmar deben contarse en Meta y TikTok como registro completo?** Recomendación: sí, porque la persona es real aunque no puso bien su número. Quitarlos le enseñaría a la pauta a evitar justo a los emprendedores sin NIT.
2. **¿Se le escribe a la persona para confirmar el documento?** Recomendación: no por ahora. Se hace en el seguimiento por WhatsApp de la primera hora, el punto 6 de la lista.
