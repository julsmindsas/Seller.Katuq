# Tareas — D-364

- [x] Trazar checkout → creación deduplicada → reserva y registrar reproducción offline con código real.
- [x] Presentar diff antes de aplicar y obtener aprobación explícita de Daniel para las tiendas de Katuq.
- [x] Registrar propuesta, diseño, spec, write-set y límites antes de aplicar.
- [x] Incorporar regresiones portables que reproduzcan el defecto sin red ni Firestore real.
- [x] Aplicar exclusivamente la condición aprobada al bloque de reserva del checkout.
- [x] Verificar reserva normal, reenvío confirmado, fallo y recuperación, marcas true/false/ausente y prohibición de escrituras a maestros.
- [x] Ejecutar `node --check`, suite de publicación y revisión final del diff; documentar resultados y alcance sin publicar.

## Evidencia local

- Antes del fix, siete regresiones del archivo portable: tres pasan y cuatro fallan por segundo descuento. Después, las siete pasan.
- Suite final reforzada: `node --test tests/sitios/pedidoReservaDuplicada.test.js` → 8/8. El octavo caso demuestra que intentar escribir un maestro invalida el contrato aunque la dependencia atrape el error. Las violaciones de escrituras/imports quedan registradas antes de lanzar y se comprueban al cerrar cada envío.
- `node --test tests/sitios/pedidoReservaDuplicada.test.js tests/sitios/checkoutMedicion.test.js` antes del refuerzo exclusivamente de test → 22/22 (7 + 15); la medición de D-363 permanece verde.
- `node scripts/test-sitios-publicacion.js` → exit 0, 304 correctas y las mismas cuatro pendientes previas del generador. Log `/tmp/katuq-builder-reserva-publicacion.log`.
- `node --check controllers/sites.js` y `node --check tests/sitios/pedidoReservaDuplicada.test.js` limpios. `git diff --check` de los archivos propios pasa.
- Revisión independiente: el único cambio funcional del controller es la condición aprobada; no cambia el interior de la reserva. Sin nuevos imports, queries, modelos ni escrituras. Se preserva el trabajo paralelo.
- No se reinició backend conectado a Firestore ni se validó por HTTP real: se ejecutaron los métodos reales con base en memoria y módulos externos bloqueados. Sin datos productivos ni despliegue. No hace falta recompilar frontend para este cambio exclusivamente de backend.
- Pendientes fuera de esta autorización: simultaneidad, caída entre descuento y marca, enlaces/contadores/notificaciones repetidos; retiro, cantidades y selector de variantes.
- Daniel autorizó posteriormente commit y push con «sube a git». Verificación previa de las dos tandas: editor 14/14 y backend 23/23 (15 medición + 8 reserva); se conservan las cuatro pendientes previas de publicación. Las ramas actuales se suben sin desplegar.
