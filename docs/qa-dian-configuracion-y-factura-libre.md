# DIAN: configuración y nueva factura

## Estado local · 7 de septiembre de 2026

Implementado en código local. No publicado, sin facturas reales emitidas, sin correos enviados y sin cambios en datos de comercios.

- Configuración: guardado parcial conserva credenciales cifradas; lectura fresca del servidor; errores visibles; controles de comercio, ambiente y consecutivo.
- Facturación electrónica → Nueva factura: factura libre o búsqueda paginada de pedidos, con los patrones visuales de Todos los pedidos.
- Cliente obligatorio: debe existir en el maestro de clientes del comercio. El navegador envía su identificador y selección fiscal, nunca sustituye su nombre, documento o dirección con texto libre.
- Actualizar ficha completa abre Clientes con el documento buscado. Después se pulsa Ya actualicé: volver a consultar. Abrir la ficha no guarda cambios.
- Revisar factura guarda una revisión en el servidor, sin consumir numeración, enviar correo, mover inventario ni crear pedidos/productos/clientes.
- Emitir factura real requiere confirmación expresa, integración activa en producción y que los datos revisados sigan vigentes.
- Se reconsulta el cliente y el pedido dentro de una transacción antes de reclamar el envío. Si cambiaron los datos fiscales, importes o configuración se exige otra revisión.
- El flujo operativo anterior de emisión desde pedidos permanece disponible en su pestaña.

## Alcance de la factura libre

Cliente registrado con NIT o cédula y datos fiscales completos, perfil fiscal y dirección guardados seleccionables, correo, conceptos sin crear productos, cantidades, valores sin IVA, tarifas 0/5/19 %, contado o crédito y vencimiento. No incluye retenciones, descuentos manuales ni movimientos de inventario.

La revisión valida la ficha guardada en Katuq; no certifica que esos datos correspondan al RUT vigente. El comercio debe mantenerlos correctos.

El pedido vinculado conserva sus importes. Los datos fiscales para la emisión se obtienen de la ficha actual del cliente; el pedido original no se sobrescribe con ellos. Se vincula el número/CUFE al pedido al confirmar aceptación.

PDF, correo y asiento del nuevo flujo usan los datos e importes del modelo del XML. El adaptador de presentación se ejecuta después de la aceptación y no modifica el pedido.

## Recuperación e idempotencia

Las revisiones se guardan en dian_invoice_requests, aisladas por comercio y un identificador de operación. El mismo identificador no vuelve a invocar al proveedor ante doble clic o reintento.

El navegador guarda únicamente identificador y fase por comercio. F5 recupera el resumen ya revisado consultando el servidor, sin reenviar. Los datos que aún no se han revisado no se recuperan después de F5.

Los estados processing/uncertain bloquean otro intento para esa operación. En pedidos, el bloqueo no expira por tiempo. Consultar estado puede recuperar aceptación o rechazo desde la auditoría dian_documents. Nunca convierte un timeout en rechazo ni en permiso para emitir otra vez.

Si no hay evidencia suficiente en la auditoría, la operación sigue incierta: es necesaria una conciliación del documento, no generar otro envío a ciegas. La consulta no hace una nueva transmisión ni consulta automáticamente a la DIAN.

La protección deduplica operaciones y pedidos vinculados; no identifica dos ventas libres distintas con contenido idéntico.

## API y aislamiento

Rutas bajo /v1/accounting, con autenticación y comercio del JWT:

- GET /dian/invoice-customers/:customerId
- POST /dian/invoice-requests/:requestId — guardar revisión.
- PUT /dian/invoice-requests/:requestId/submit — confirmación explícita.
- GET /dian/invoice-requests/:requestId — consultar, sin retransmitir.
- POST /dian/invoice-preview — vista previa de sólo lectura disponible.

La configuración, certificado y claves siguen en el mecanismo existente de secretos del backend. No se añaden al almacenamiento del navegador ni al resultado de estas rutas.

## Verificación realizada sin servicios externos

119 pruebas locales aprobadas: 53 de frontend y 66 de backend. Incluyen persistencia de configuración, aislamiento, cliente inexistente/ajeno/inactivo, perfil fiscal actualizado, importes, doble clic, dos revisiones del mismo pedido, timeout, recuperación de respuesta, cambio de rango y XML.

Frontend:

    npm run test:dian-config
    npm run test:dian-invoice
    node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p tsconfig.app.json --noEmit

Backend, desde katuq_admin_back_firebase/functions:

    npm run test:dian-config
    npm run test:dian-invoice
    node scripts/verify-dian-ubl.js
    node scripts/verify-dian-pipeline.js

Las pruebas del servicio usan Firestore en memoria. Las del proveedor ejecutan su código con firma, SOAP, correo, Storage y contabilidad simulados; no llaman a servicios reales. Pasaron además los 21 controles UBL y 4 controles del pipeline existente.

Angular y SCSS compilan. El build completo de producción intentado anteriormente quedó bloqueado al descargar Google Fonts por la restricción de red; no equivale a un build de producción final verificado. No se ha hecho QA visual en navegador del nuevo compositor. El gate offline avisó que no hay SMTP configurado localmente; no se comprobó la configuración SMTP del despliegue.

## Antes de publicar y probar

1. Publicar backend y frontend de esta entrega juntos: el nuevo formulario depende de las nuevas rutas. No se ha realizado push ni despliegue.
2. Ejecutar el build de producción en el entorno de publicación y verificar las reglas de Firestore: la nueva colección dian_invoice_requests debe ser accesible sólo mediante backend autenticado, no por escrituras directas del cliente.
3. Revisar visualmente escritorio y móvil: Nueva factura debe estar disponible aunque el comercio no tenga pedidos.
4. Buscar un cliente del comercio y seleccionar su perfil fiscal/dirección. Si está incompleto, no debe permitir revisar. Actualizar ficha completa debe abrir el cliente correcto.
5. Cambiar correo o dirección en Clientes, guardar y volver a consultar. El resumen debe mostrar los datos actualizados.
6. Revisar dos unidades de $1.000 con IVA 19 %: subtotal $2.000, IVA $380, total $2.380.
7. Verificar crédito sin vencimiento, búsqueda y paginación de pedidos, cancelados/facturados bloqueados y cambio de comercio.
8. Después de Revisar factura, recargar: debe recuperar el resumen sin emitir. Editar un concepto exige nueva revisión.
9. Confirmar que no se pueda emitir en habilitación, con integración inactiva ni sin marcar la confirmación.
10. Hacer cualquier validación fiscal real sólo con autorización expresa para una venta real, producción configurada y numeración vigente. No usar una factura real como ensayo desechable.
11. Ante resultado incierto, consultar y conciliar antes de crear otra factura. Revisar PDF, XML, destinatario y estado contable después de una aceptación autorizada.
