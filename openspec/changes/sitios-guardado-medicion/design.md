# Diseño de la corrección

Autorización de trabajo: mensaje de Daniel del 2026-10-07; D-363. Corrección de D-294/D-298, sin capacidades nuevas ni política comercial nueva.

## Editor

Capturar una instantánea independiente del contenido y los metadatos enviados. Al recibir la respuesta, comparar con el estado actual: aplicar el saneamiento existente si no cambió; si cambió, conservar el borrador local y tomar como referencia de guardado la versión que respondió el servidor. Publicar solo cuando no haya cambios locales posteriores a la petición. Limpiar únicamente las entradas de secretos que correspondan a lo confirmado; nunca borrar una entrada nueva por una respuesta anterior. Sincronizar exclusivamente los dos indicadores de credenciales confirmadas si su intención no cambió, para que la interfaz permita quitarlas después de guardar. Evitar merge profundo del contenido, cambios en HTTP y refactors del editor.

## Medición

Corregir la elección de evento dentro de `enviar` en `siteTienda.js`. Distinguir una respuesta de pago en línea pendiente de una confirmación contra entrega/manual, usando también el método solicitado para compatibilidad con respuestas anteriores. Conservar inicio de pago y redirección cuando hay enlace. No tocar el webhook ni la conversión de la página de gracias.

## Validación

Pruebas de regresión que ejecutan los métodos reales del editor y el script real del checkout con dependencias simuladas. Cubrir guardado normal y concurrente, publicación concurrente, error, credenciales nuevas, pago con enlace, enlace fallido, contra entrega y manual. Suite de publicación existente, verificador de estilos/fuentes y compilación Angular mediante CLI directa (evitar `prebuild`, que incrementa versión).

## Gates

Se respetan los contratos existentes y la constitución: HTTP por servicio, sin modelos nuevos, sin colecciones, sin escrituras en maestros/inventario, sin nuevos logs con datos sensibles. No hay cambios en el 360. Datos de OH MY STORE de `specs/002-flows-osmosis-shopify-marco/findings.md` no se usan para mutaciones. Revisión final del diff preserva los cambios ajenos presentes al inicio. Daniel autorizó después commit y push de las correcciones y su documentación con «sube a git»; se conserva el alcance sin despliegue.
