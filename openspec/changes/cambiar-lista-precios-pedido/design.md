# Diseño técnico — cambiar lista del pedido (D-544 / 1356)

**ALMARA FELICIDAD · 23-oct-2026.** Propuesta/spec aprobadas por Daniel: «Apruebo ambas specs y esas reglas». **Diseño APROBADO:** «Apruebo ambos diseños y la adaptación». [Tareas APROBADAS](tasks.md): «Apruebo las tareas de ambos; implementa y valida». Implementación en curso con aprobación de cada diff sensible antes de aplicarlo. No autoriza permisos reales o publicación.

## Base compartida y alcance

Extiende el núcleo D-543, sin otra arquitectura de precio, historial o permisos. Referencias normativas de este diseño: [diseño común](../corregir-precio-pedido/design.md), [contratos](../corregir-precio-pedido/contracts.md) y [matriz de lectores](../corregir-precio-pedido/readers.md). D-543 y sus gates de lectores/fiscalidad/historial preceden a la habilitación de D-544.

Se usan las mismas rutas `/v1/orders/price-change/options`, `/preview` y `/confirm`, con `kind: priceList` en la intención; la pantalla no manda un pedido recalculado ni guarda la ficha por una segunda llamada. Ninguna escritura en listas maestras o productos.

## Intención, lista y excepciones

```json
{
  "kind": "priceList",
  "orderId": "docId",
  "priceListId": "tipo-cliente-del-comercio",
  "lineDecisions": [
    {"lineKey": "...", "action": "preserveManual"},
    {"lineKey": "...", "action": "applyList"},
    {"lineKey": "...", "action": "keepCurrent"},
    {"lineKey": "...", "action": "manual", "unitPriceWithoutTax": 20000}
  ],
  "updateCustomerType": false,
  "reason": "Se registró Público y correspondía Mayorista"
}
```

`lineKey` identifica la línea del pedido fresco. Si aún no existe acuerdo, cada decisión lleva `line: {index,productId,fingerprint}` emitido en options; preview deriva y firma la clave provisional determinista definida por D-543, que solo se persiste al confirmar. Un DTO de línea lleva **una** referencia: lineKey persistido o referencia provisional, no ambas contradictorias. Rechazar decisiones duplicadas, ajenas, desconocidas o ambiguas; la identidad no se resuelve solo por producto. Valores por defecto explícitos: manual previo → conservar; fila activa de lista → aplicar; fila faltante → exigir conservar/ingresar/cancelar. `manual` requiere que el producto real del tenant permita edición y valor base finito ≥0; aplicar lista o conservar un precio no requiere que sea producto editable. No usar precio Público, cero, promoción o lista alternativa por silencio.

Resolver lista/tipo desde los maestros existentes y las filas `preciosPorTipoCliente` del producto del comercio, verificando identidad y pertenencia. No suponer docId a partir del nombre Público/Mayorista ni del texto mostrado. Una lista borrada/inactiva o filas sin precio completo se bloquean o requieren la decisión explícita aprobada; no reinterpretar un cero válido como ausencia.

**Fecha de valoración aprobada con el diseño:** precios y campañas de la nueva lista vigentes al preparar la vista previa, con `pricedAt` del servidor. Esta es una nueva decisión comercial, sin alterar `fechaCreacion` del pedido ni la regla D-219 para otros pedidos. La confirmación vuelve a validar vigencia y huellas; una campaña que vence/cambia obliga otra vista previa. Precios conservados y manuales no se refrescan desde catálogo. El acuerdo guardado fija fuente y condiciones para que ninguna lectura futura revalore con otra fecha.

Al primer cambio se congelan todas las líneas con el mecanismo D-543. Solo las elegidas toman nuevo precio/lista; una excepción conservada sigue pactada aun cuando el snapshot del pedido use la categoría nueva. IVA manual previo tiene su precedencia actual; donde no existe, la fila de lista aporta su tarifa efectiva mostrada en preview. Extras, cantidades, descuentos pactados y domicilio se conservan sin doble descuento o suma; el cálculo actual produce todo el desglose, no el navegador.

## Ficha del cliente y atomicidad

- `updateCustomerType=false` por defecto: cambiar la lista aplicada y el snapshot de cliente **del pedido** no cambia la ficha `clients` ni otros pedidos. Todo lector prioriza el acuerdo del pedido, no la categoría de la ficha actual.
- Si se elige la opción: además de `ventas.change_price_list` se exige `clientes.edit` explícito y vínculo inequívoco con el cliente real de ALMARA. No inferirlo por email o por primer resultado de nombre/documento ambiguo.
- Token/huellas incluyen cliente y su versión. En la **misma transacción** se leen cliente, pedido y condiciones y se parchean `clients.categoria {id,nombre,descripcion}` y `tipoCliente`, más metadatos de modificación según el modelo actual. Ambos son alias usados por `controllers/clients.js:227–264`; no dejar uno desactualizado.
- Solo esos campos y metadatos; no direcciones, contactos o datos personales. El índice de búsqueda actual no usa categoría/tipo, por lo que no necesita otra escritura. No llamar `clients/edit` después del pedido.
- Conflicto, cliente ajeno/ambiguo/inexistente o permiso revocado → ningún cambio de pedido/ficha. La UI permite preparar de nuevo solo pedido, pero no reduce la intención sin confirmación. El historial registra opción y cambio aplicados dentro del único evento de la operación.

## Pantalla, permisos y recuperación

Editor de lista y decisiones por línea dentro del diálogo compartido, tabla responsive en móvil con fila compacta y detalle antes/después; precios manuales visibles como conservados. Opción de ficha desmarcada y oculta/deshabilitada si falta permiso; servidor confirma disponibilidad y la revalida. Motivo obligatorio, acciones Revisar cambios / Confirmar cambio; una edición posterior invalida preview. Mensajes concretos para fila faltante, lista inactiva, conflicto o saldo a favor.

Permiso `ventas.change_price_list` en el **mismo mapa granular** actual; se excluye de concesión automática por plantilla/Administrador. Roles legacy no lo heredan. La ficha exige la acción existente `clientes.edit`, sin bypass por nombre de rol. Los gates de gestión de roles/usuarios y Firebase de D-543 también son obligatorios.

Recibo, cápsula pendiente y proyección D-541 son los mismos de D-543, tipo `price_list_changed`. Un evento por operación, con decisiones por línea y lista anterior/nueva; nunca uno por render o por línea de tabla. Timeout conserva operación; 409 exige nueva revisión. El cambio de ficha opcional no tiene su propio reintento independiente. UI muestra precio aplicado y recuperación pendiente si la escritura del evento falla, sin intentar otra corrección ni guardar la ficha otra vez.

La adaptación acotada del Artículo IX es la misma: Angular 14, standalone/OnPush, Reactive Forms/RxJS HTTP y directivas soportadas, sin signals/@if. Aprobada expresamente para 1355/1356 junto con ambos diseños; no se hereda la excepción de los antiguos tickets 1315/1313. Tema canónico/base `config-pagina`, teclado/foco, sin scroll horizontal a 1440/390.

## Habilitación, límites y reversión

`companies.featureFlags.orderPriceListChanges` apagada por defecto; requiere núcleo `orderPriceCorrections` disponible, historial habilitado/seguro y permisos explícitos. Pilotar solo ALMARA después de los gates comunes. Responsable Daniel; revisión/retiro **23-nov-2026** mediante cambio posterior aprobado, sin ampliar automáticamente a otros comercios. Configuración en Firestore, ninguna bandera `.env`.

Write-set: precio/acuerdo/lista aplicada, importes y metadatos del pedido objetivo; registro/proyección aprobados; solo con opción y permiso, los campos de tipo/lista de un cliente. Sin productos, listas maestras, inventario, movimientos, pagos, estados operativos, documentos fiscales o proveedores. Apagar nuevas acciones conserva lectores de acuerdos, resultado de ficha ya confirmado y recuperación pendiente; ninguna reversión automática de precios o tipo del cliente.

## Gates de validación y siguiente checkpoint

Contratos antes de implementación: Público→Mayorista con IVA/descuentos/extras; manual conservado y sustituido; lista incompleta con cero válido y sin permiso manual; cambio opcional atómico de ambos alias de ficha; permiso revocado/lista o campaña cambiadas durante preview; reintento/timeout y doble clic; precio de catálogo/categoría posteriores; datos ajenos/rol ambiguo; saldo a favor sin abono automático. Matriz común completa, incluido ingreso por producto en reportes y build/pantalla del mensajero realmente instalado. No modificar los casos canónicos ni tratar un build web como prueba móvil.

Gates I–XV según el diseño común; ninguna colección nueva o historial paralelo. El diseño, sus dependencias y la adaptación Angular 14 están aprobados; las tareas están aprobadas para implementar, con diffs sensibles de uno en uno y aprobación antes de aplicarlos.
