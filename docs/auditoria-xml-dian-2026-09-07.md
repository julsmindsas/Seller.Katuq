# Revisión técnica del XML DIAN - 7 de septiembre de 2026

## Reparación de Storage y recuperación de JULS41

- JULS41 fue aceptada por la DIAN; el guardado posterior falló porque Firebase Admin no tenía bucket predeterminado. Se configuró explícitamente el bucket usado por Katuq (`FIREBASE_STORAGE_BUCKET`, predeterminado `julsmind-katuq.appspot.com`).
- Antes de reservar numeración de facturas/notas se verifica existencia y permisos reales del bucket. Antes de transmitir se guardan y se releen el XML firmado exacto y PDF en una ruta de preparación aislada por comercio y CUFE/CUDE. Si falla la copia, no se transmite. Esto no impide una indisponibilidad posterior de Storage, pero preserva la copia previa.
- Los XML finales usan creación condicional y comparación byte a byte: un original distinto nunca se sobrescribe. La detección de conflicto ocurre antes de tocar los otros archivos del número.
- Implementados `GetXmlByDocumentKey` y recuperación autenticada de documentos de facturas aceptadas. Se verifica CUFE, número, emisor, comprador y total contra el registro. Recuperar no firma de nuevo, no emite, no cambia numeración ni envía correo.
- Recuperación real completada para JULS41: XML original (19590 bytes), PDF (25642 bytes), ApplicationResponse (11413 bytes) y AttachedDocument (43345 bytes), bajo `dian/Julsmind/JULS41/`. Se descargaron los cuatro desde Storage para verificar lectura; firma digital del XML original verificada. Referencias guardadas en `dian_documents` y disponibilidad actualizada en `dian_invoice_requests`.
- PDF regenerado a partir del XML recuperado, revisado visualmente; se corrigió el recorte del CUFE y se muestran identificación y correo del comprador. La recuperación mantiene el correo pendiente de envío. No se emitió JULS42 en esta reparación.
- Limitación: recuperación desde el compositor implementada para facturas aceptadas COP; no modifica su XML. No se declara recuperación de notas ni soporte de otros documentos en este endpoint.
- Verificación final: 101 pruebas backend y 39 frontend aprobadas, compilador Angular sin errores. Backend local reiniciado con SMTP verificado. En Edge, JULS41 aparece aceptada y con botones PDF/XML habilitados.

## Actualización: correo local y borradores

- Credencial SMTP autorizada cargada únicamente en memoria del backend local mediante un preload temporal externo al repositorio. El backend reiniciado verificó autenticación SMTP; la pantalla ya informa correo configurado. No se enviaron correos. Un arranque ordinario sin ese preload seguirá necesitando configurar `SMTP_PASS` de forma segura.
- Nueva opción **Guardar borrador** para facturas libres incompletas y lista **Borradores** para recuperar borradores y revisiones. Persistencia en Firestore, colección `dian_invoice_requests`, aislada por comercio. No reserva número fiscal, no mueve inventario ni transmite a DIAN.
- Edición con control de versión, reintentos idempotentes y promoción al mismo identificador al revisar. Una revisión o envío no puede sobrescribirse como borrador; al recuperar se reconsulta el cliente registrado.
- Pruebas de esta actualización: 90 backend y 36 frontend aprobadas; compilador Angular sin errores. Pruebas de guardado usan Firestore simulado. En Edge se verificó la consulta real de la lista y la recuperación de la revisión existente por 461580 COP con correo fiscal correcto, sin crear duplicados ni emitir.
- El pago de contado continúa siendo el valor de la revisión: confirmar que corresponde a la venta antes de emitir.

## Actualización: comprador mínimo y primera factura libre

- Se eliminó el bloqueo general por dirección en el selector y el backend. Se preservan nombre/razón social, identificación y correo del perfil fiscal registrado. Una dirección completa se conserva; una ausente o parcial no se inventa ni se serializa como grupo incompleto. El maestro no se modifica. La revisión de pedidos tampoco recupera una dirección antigua cuando falta en el perfil actual.
- `InvoicedQuantity` ahora conserva tres decimales independientemente del descuento. Defecto 1 de la auditoría original: corregido y cubierto por regresión.
- Defectos 2 y 3: no se declaró soporte completo. La revisión de pedidos bloquea descuentos globales/transporte y crédito sin vencimiento fiscal antes de reservar numeración. No afectan la factura libre de mensualidad, cantidad 1, IVA 0, sin descuento ni transporte. No se modificó el camino legacy para estas operaciones.
- La revisión incluye un preflight SMTP sin exponer credenciales. Con envío de correo activado y `SMTP_PASS` ausente, se puede guardar y consultar la revisión pero no emitir. Se verifica también en el backend, sin depender del botón. No se desactiva el correo automáticamente.
- El resumen distingue aceptación DIAN, disponibilidad de archivos y estado del correo. Un error de Storage o correo no se presenta como rechazo fiscal ni habilita duplicar la factura.
- Verificación: 68 pruebas de backend + 32 de frontend aprobadas; compilador Angular sin errores. Incluye PDF generado con pdfmake real, persistencia de cuatro archivos en Storage simulado, errores SMTP/Storage, aislamiento y no duplicación. No se enviaron correos ni documentos fiscales.
- XML de laboratorio por 461580 COP, IVA 0 y comprador identificado sin dirección: firma con certificado sintético verificada y validación `UBL-Invoice-2.1.xsd` oficial aprobada. Comprobador: `tests/integrations/dianMinimalSignedFixture.js` en backend. El XSD no sustituye reglas de negocio ni la respuesta real DIAN; no se garantiza aceptación por estas pruebas.
- Norma consultada: Resolución 227/2025, art. 1.5.1.12.3, datos exigibles al comprador. El anexo 1.9 (páginas 54-56, FAK28) contiene indicaciones para la dirección fiscal y campos condicionales; la prueba estructural no certifica todos los casos de adquirentes u operaciones. Esta implementación no amplía soporte de ventas en exterior ni reglas especiales de lugar de entrega.
- Verificación local en Edge: revisión de la mensualidad guardada sin emisión, total 461580, IVA 0, destinatario fiscal seleccionado correcto. Pago de contado es el valor actual del borrador y debe confirmarse antes de emitir. La pantalla identifica SMTP pendiente. El backend local no tiene `SMTP_PASS`; no se encontró valor configurado en `.env`, `.env.team` ni `.env.lightsail`. No se copió ninguna clave al código.

Lo siguiente conserva el diagnóstico original y sus límites como registro histórico.

## Resultado

No se puede declarar el flujo completo listo para emitir: se reprodujeron tres defectos en el código local. La estructura UBL, CUFE, firmas y empaquetado funcionan en los casos sintéticos ejecutados, pero no sustituyen las reglas de negocio ni una respuesta de aceptación de la DIAN.

Esta revisión no envió documentos, no reservó numeración, no accedió a certificados reales y no escribió en Firebase. No se modificó el código de emisión ni se desplegó. Los comprobadores usan identidades, claves y certificado autofirmado de laboratorio, con transporte HTTP simulado.

## Defectos reproducidos

1. **Cantidades fraccionarias alteradas al serializar, prioridad alta.** El formulario/backend acepta tres decimales; `lineXml` conserva tres solamente si existe un porcentaje de descuento. Sin descuento, `1.375 × $1.000` genera cantidad XML `1.38` y base `$1.375`, que no coincide con `$1.380` al recalcular desde el XML. `0.001` se convierte en `0.00`. Corregir la precisión de cantidad sin hacerla depender del descuento y comprobar el cuadre con los operandos serializados. Ubicación: [ublBuilder.js, línea 178](C:/sourcecodejuls/katuq_admin_back_firebase/functions/services/accounting/dian/ublBuilder.js:178); entrada permitida en [manualInvoice.js, línea 63](C:/sourcecodejuls/katuq_admin_back_firebase/functions/services/accounting/dian/manualInvoice.js:63). Referencia: FAV06, páginas 90-92.

2. **Descuentos generales y transporte del pedido incompletos, prioridad alta.** Los bloques de cabecera omiten `MultiplierFactorNumeric` y `BaseAmount`; el descuento general también omite `AllowanceChargeReasonCode`. No ocurre en el nuevo descuento por ítem. Antes de completar estos datos hay que respetar el tratamiento fiscal del pedido: un ajuste que cambia la base gravable no debe convertirse automáticamente en descuento de cabecera. Ubicación: [ublBuilder.js, línea 419](C:/sourcecodejuls/katuq_admin_back_firebase/functions/services/accounting/dian/ublBuilder.js:419). Referencia: FAQ01, FAQ04, FAQ06 y FAQ09, páginas 72-74.

3. **Pedido a crédito sin vencimiento en el XML, prioridad alta.** El camino `source: order` devuelve forma de pago `2` pero omite `PaymentDueDate`, incluso en la nueva revisión. La factura libre a crédito sí lo conserva. Se debe tomar la fecha real del pedido y validarla; si falta, pedirla o bloquear antes de reservar número, sin inventarla. Ubicación: [invoicePayment.js, línea 4](C:/sourcecodejuls/katuq_admin_back_firebase/functions/services/accounting/dian/invoicePayment.js:4). Referencia: FAN04, páginas 70-71.

Estos son defectos locales reproducidos, no códigos de rechazo recibidos durante esta revisión: no hubo llamadas fiscales reales.

## Comprobaciones ejecutadas

- 55 pruebas existentes aprobadas: `dianInvoicePreview`, `dianInvoiceRequests`, `dianReviewedEmission` y `dianManualDiscount`. Incluyen aislamiento por comercio, revisión de cliente vigente, confirmación, concurrencia, respuesta incierta y no repetición del envío.
- Gates offline aprobados: `verify-dian-cufe.js`, `verify-dian-ubl.js`, `verify-dian-xades.js`, `verify-dian-soap.js`, `verify-dian-pipeline.js`. El CUFE incluye comparación con el ejemplo publicado en el anexo. El gate de pipeline importa el servicio de correo y avisa que no tiene SMTP configurado en ese proceso aislado; no intentó enviar correo.
- 14 escenarios adicionales atravesaron construcción de XML, firma XAdES, ZIP, SOAP firmado y respuesta simulada. En todos se verificaron firmas, recomputación SHA-384 desde campos XML, preservación exacta de bytes al comprimir/descomprimir, endpoint de producción seleccionado y rechazo simulado no marcado como aceptado. Se probaron cantidades enteras/fraccionarias, porcentajes 0/10/12.34, IVA 0/5/19 y mezcla de tarifas, crédito libre/pedido, descuento general y transporte.
- Los 14 documentos firmados pasaron el esquema base `UBL-Invoice-2.1.xsd` distribuido en la caja oficial. De ellos, cinco escenarios exhiben los tres defectos anteriores; pasar XSD no comprueba las reglas de negocio.
- Ejemplo de descuento por ítem correcto en el laboratorio: `2 × $1.000`, descuento 10% = `$200`, base neta `$1.800`, IVA 19% = `$342`, total `$2.142`. No se resta dos veces el descuento.

## Límite de la validación oficial descargada

El esquema de extensión `DIAN_UBL_Structures.xsd` incluido en la caja rechaza `schemeID="4"` del autorizador porque su enumeración corresponde a tipos de documento. El mismo error ocurre al validar el XML de ejemplo oficial `Consumidor Final.xml`. El anexo, reglas FAB22/FAB34, y ese ejemplo indican usar el dígito de verificación en `schemeID` y el tipo documental en `schemeName`. No se alteró el XML ni el esquema para ocultar esta incompatibilidad. La validación aislada de esa extensión queda **no concluyente**, no aprobada.

No se ejecutó una certificación exhaustiva de las reglas DIAN ni su consulta de registros externos. No se comprobó en esta revisión la configuración activa de producción, vigencia/revocación/cadena del certificado real, asociación del rango/software o validez de la clave técnica real. Tampoco se valida aquí toda clase de operación fiscal: IVA cero no demuestra soporte de excluidos, régimen SIMPLE, retenciones, AIU o impuestos distintos del IVA.

## Siguiente paso recomendado

Corregir los tres defectos, convertir los casos reproducidos en pruebas de regresión y hacer que la revisión bloquee inconsistencias antes de reservar consecutivo. Después revisar una factura concreta con los datos vigentes del comercio. La aceptación solo se confirma con la respuesta de la DIAN; una emisión en producción requiere confirmación expresa del usuario y tiene efectos fiscales.

## Fuentes y reproducción

- [Portal oficial de documentación DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/).
- [Anexo técnico de factura electrónica de venta 1.9](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf), tablas consultadas completas: páginas 24-31, 70-76, 89-95 y 105-110.
- [Caja oficial FE 1.9, edición v2026](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Caja-de-herramientas-FE_V19_v2026.zip), descargada el día de la revisión.
- [Política de firma DIAN](https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf).

Los comprobadores adicionales y XML sintéticos quedaron temporalmente en `C:/Users/danie/AppData/Local/Temp/katuq-dian-xml-audit-3374604582324d17ab7ad450a3c1fd7d/`: `check-xml.cjs` y `check-schema.py`. El primero informa incidencias por caso, no es un gate de aprobación global; el segundo necesita `lxml` y los XSD descargados en `official/`. Ninguno realiza HTTP real ni usa Firebase.
