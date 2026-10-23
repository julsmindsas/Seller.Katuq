## ADDED Requirements

### Requirement: «Última edición» legible (F0)
Donde hoy se muestra «Última edición» (listado de productos, ficha y las pestañas de Listas de precios), la pantalla SHALL mostrar:

- la fecha y la hora en hora de Colombia, en formato legible;
- quién hizo la edición, si quedó registrado.

IF no quedó registrado quién, THEN SHALL mostrar solo la fecha, sin textos técnicos.

#### Scenario: Caso GCJ1236
- **WHEN** el comercio mira «Precio tipo clientes» de GCJ1236, editado el 2026-10-23T15:54:11Z
- **THEN** ve «23 oct 2026, 10:54 a. m.» y debajo el correo de quien lo editó, no «2026-10-23T15:54:11.629Z»

### Requirement: Pestaña «Historial» del producto (F1)
La ficha del producto SHALL tener la pestaña «Historial», con los eventos agrupados por día («Hoy», «Ayer» o la fecha), del más reciente al más antiguo. Cada evento SHALL mostrar:

- la hora de Colombia con segundos;
- el usuario, con su nombre y rol;
- el origen;
- el tipo, con ícono y color;
- sus detalles antes → después;
- el motivo y el lote, cuando existan.

Las variaciones de precio y costo SHALL ir resaltadas, en pesos y en porcentaje.

#### Scenario: Ficha con cambios de precio
- **WHEN** el comercio abre el historial de GCJ1236C
- **THEN** ve «Precio cambiado · Modelos · $45.296 → $65.163 (+$19.867, +43,9 %)», con la persona, la hora y el origen

### Requirement: Historial desde precios y costos (F1)
En «Precio tipo clientes», «Precio unitario», «Precio por volumen» y «Costo», cada producto SHALL tener una acción «Historial» que abra solo los eventos de precios o de costo de ese producto.

#### Scenario: Ver quién cambió un precio
- **WHEN** el comercio toca «Historial» en la fila de GCJ1236 de «Precio tipo clientes»
- **THEN** ve solo los cambios de precio de ese producto, con quién, cuándo, desde dónde y el antes → después

### Requirement: Carga por partes (F1)
El historial SHALL cargar por páginas de hasta 50 eventos, con «Ver más». La primera página SHALL aparecer en menos de 1,5 s (p95) para productos de hasta 500 eventos.

#### Scenario: Producto con muchos cambios
- **WHEN** un producto tiene 140 eventos
- **THEN** se ven los 50 más recientes y los siguientes al tocar «Ver más»

### Requirement: Filtros del historial (F2)
El historial SHALL permitir filtrar por tipo (datos, precios, costo, estado, fotos), por usuario y por origen.

#### Scenario: Solo lo que hizo una sincronización
- **WHEN** el comercio filtra el historial por origen «Cereza»
- **THEN** ve solo los cambios que hizo esa sincronización

### Requirement: Reporte de cambios (F3)
El sistema SHALL ofrecer un reporte de cambios de productos, precios y costos de la empresa, filtrable por rango de fechas, usuario, producto, lista o tipo de cliente y origen. El reporte SHALL exportarse a Excel con los montos como números, y exportar SHALL quedar solo para los administradores.

#### Scenario: Cambios de la lista Modelos en un día
- **WHEN** un administrador filtra el 23-oct y la lista «Modelos»
- **THEN** ve GCJ1236 y GCJ1236C, con quién, hora, antes → después y variación, y los puede exportar

### Requirement: Aviso de cambio de precio o costo (F3)
WHEN cambia un precio o un costo y la empresa recibe avisos de ese cambio, el aviso SHALL incluir quién lo hizo, el producto, la lista o tipo de cliente, el valor antes → después y el origen.

#### Scenario: Aviso con el detalle
- **WHEN** una persona cambia el precio «Modelos» de GCJ1236C
- **THEN** el aviso dice quién, «GCJ1236C · Modelos · $45.296 → $65.163» y el origen

### Requirement: Volver al valor anterior (F4, solo si se aprueba)
WHERE la empresa tiene esta opción habilitada, desde un evento de precio o costo una persona con permiso de editar precios SHALL poder volver al valor anterior con una vista previa y una confirmación. La vuelta SHALL quedar como un evento nuevo que referencia al original y SHALL NOT borrar ni editar eventos.

#### Scenario: Revertir un precio
- **WHEN** un administrador revierte el cambio de GCJ1236 en «Modelos»
- **THEN** el precio vuelve a $42.621 y el historial muestra el cambio original y la reversión

### Requirement: Lenguaje y diseño Katuq
Las pantallas SHALL hablar en lenguaje de negocio, sin nombres técnicos de campos ni de funciones. Por ejemplo, dicen «Precio Modelos» y no `preciosPorTipoCliente`. SHALL seguir `openspec/specs/design-system/spec.md` y la regla de diseño Katuq:

- planas y sin gradientes;
- pares semánticos de color fuerte con fondo suave;
- labels en MAYÚSCULA con color muted;
- estado vacío con ícono, título y texto corto;
- sin scroll horizontal a 1440 px ni a 390 px.

#### Scenario: Producto sin eventos
- **WHEN** un producto no tiene eventos reales ni reconstruibles
- **THEN** aparece el estado vacío «Este producto aún no tiene cambios registrados»
