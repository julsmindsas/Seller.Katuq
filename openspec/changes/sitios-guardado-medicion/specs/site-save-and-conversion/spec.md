# Guardado y conversión fieles a lo ocurrido

## Guardado del borrador

- WHEN un guardado termina sin edición durante la espera, THE system SHALL reflejar el contenido saneado por el servidor y marcarlo como guardado.
- WHILE hay un guardado en curso, IF el usuario modifica el borrador, THEN THE system SHALL conservar esa edición y mostrar que aún quedan cambios sin guardar al recibir la respuesta.
- IF el usuario edita durante un guardado solicitado para publicar, THEN THE system SHALL conservar su borrador y no publicar automáticamente hasta que vuelva a guardar y publicar.
- IF el usuario introduce nuevas credenciales de medición mientras espera, THEN THE system SHALL conservar las nuevas entradas; las enviadas y confirmadas no deben reenviarse innecesariamente.
- IF falla el guardado, THEN THE system SHALL conservar el borrador y no publicar.

## Conversión de la tienda

- WHEN el pedido devuelve un enlace de pasarela, THE system SHALL informar inicio de pago y reservar la compra para la confirmación del pago aprobado (D-294).
- IF el pago en línea sigue pendiente o el enlace falla, THEN THE system SHALL no informar compra ni marcarla como ya contada en el navegador.
- WHEN se confirma un pedido contra entrega o manual, THE system SHALL mantener el evento de compra y su identificador conforme a D-294.
- THE system SHALL conservar la confirmación y recuperación existentes del pedido aunque no se informe compra.

## Restricciones

Sin cambios de precios, órdenes, pagos, inventario, aislamiento de empresas ni despliegues. Las verificaciones de esta tanda no escriben en Firestore ni contactan pasarelas.
