# Guardado seguro y medición de pagos pendientes en sitios

## Why

La revisión del builder reprodujo dos regresiones de contratos existentes: una respuesta de guardado puede borrar la edición hecha mientras esperaba, y un pedido con pago en línea pendiente puede informar una compra a la pauta. Daniel autorizó comenzar las correcciones con cuidado: «dale comienza pero ojo con dañar cosas» (2026-10-07).

## What Changes

- Conservar los cambios locales hechos durante el guardado, distinguiéndolos de la versión realmente guardada.
- Si se edita durante «Publicar», mantener el borrador local y pedir que se vuelva a guardar antes de publicar.
- Conservar credenciales de medición nuevas introducidas durante la espera.
- No informar `purchase` ni marcar la conversión del navegador cuando la pasarela no abrió el pago o este sigue pendiente.
- Mantener la conversión de contra entrega y pagos manuales al crear el pedido, como establece D-294.

## Scope y no-goals

Dos correcciones acotadas de D-294/D-298. No se cambia el diseño, el contrato HTTP, la configuración de pagos, la creación de órdenes, el cálculo de precios, el inventario, los consecutivos ni los flows de integraciones. No se crean colecciones ni se modifican datos productivos. Retiro, variantes y stock se revisan aparte; no se aplica su diff en esta tanda.

## Impact y riesgos

- Frontend: editor de sitios y prueba de regresión sin servicios reales.
- Backend: script del checkout público y prueba con navegador simulado, sin Firestore ni pasarela.
- El saneamiento de la respuesta del servidor sigue aplicándose cuando no hubo edición concurrente.
- Las conversiones informadas pueden bajar porque un enlace de pago fallido deja de contar como compra; es el comportamiento aprobado en D-294.

## Trazabilidad

Decisión D-363, `specs/CONTRACT.md`. La autorización recibida se aplica a estos bug fixes de contratos existentes; cualquier cambio de política comercial o en módulos sensibles queda fuera.
