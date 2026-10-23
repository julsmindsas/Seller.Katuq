> **Estado:** PROPUESTA, pendiente de aprobación de Daniel. Tickets 1350 (fase 1) y 1349 (fase 2) de ALMARA FELICIDAD. Decisión: D-XXX (por asignar). `design.md` y `tasks.md` se escriben después de aprobar esta propuesta. Sin código.

## Why

ALMARA FELICIDAD pide ordenar las acciones del detalle del pedido:

- **1350:** el modal «Más opciones» como una grilla de 4×4, sin scroll, con nombres cortos y agrupado por tema. Trae el mockup aprobado.
- **1349:** acciones principales según el rol y el usuario, y los mismos nombres cortos en todas partes. Un comentario de ALMARA del 23-oct reemplaza sus partes 2 y 3 por la versión aprobada del modal, que es la misma del 1350. La parte 1 (acciones por rol y por usuario) sigue igual.

Esto se verificó en el código el 23 de octubre (`components/ventas/list/`):

- **Tres lugares y tres nombres para la misma acción.** Están el bloque ACCIONES del detalle (`list.component.html:568-643`), el modal «Más opciones» (`:2175-2530`) y el menú «⋯» de cada fila del listado (`onRowMenuClick`, `list.component.ts:506`). Por ejemplo:
  - «Imprimir PDF» y «Generar PDF del pedido»;
  - «Agregar Productos» y «Añadir o retirar productos»;
  - «Estado de Pago» y «Actualizar estados del pedido».
- **El modal tiene más de 16 acciones.** En un pedido de venta hay 17 fijas y hasta 4 más que dependen del pedido:
  - Facturar o Refacturar, según el estado de la factura;
  - Editar o quitar descuento, si el pedido tiene descuento;
  - Ver despacho y entrega, si está Despachado o Entregado;
  - desde Producción: Producción y Marcar revisión. Esta última solo aparece para un usuario fijo en el código.
- **Llegan dos acciones más.** Otra sesión trabaja Corregir precio (D-543, ticket 1355) y Cambiar tipo de precio (D-544, ticket 1356). Su diseño las pone en «Más opciones» como dos entradas, solo cuando el servidor confirma el permiso y el piloto de ALMARA.
- **El bloque ACCIONES** muestra 8 acciones iguales para todos. Debajo, cuando aplican, salen las de factura electrónica: Facturar, Liberar factura, Estado DIAN, PDF DIAN, Nota crédito y Ajuste NC/ND. Ninguna de esas está en el modal.
- **Bloqueos que ya existen.** Algunas acciones se muestran con candado y su motivo: Editar productos («Congelado · estado»), Editar dirección («Solo domicilios») y Cambiar asesor. Facturación se bloquea cuando el pedido ya tiene factura.
- **Detalles del modal:**
  - Historial no tiene ícono, y la pantalla que abre la rehace D-541;
  - «Eliminar pedido permanentemente» está mezclado con las demás;
  - «Cancelar» es un botón principal aunque no cancela nada.

## What Changes

### Fase 1 — Modal «Opciones del pedido» y un solo nombre por acción (1350)

1. **Grilla de 4×4** con las 16 acciones del mockup, en cuatro columnas por tema: Documentos, Cliente y entrega, Productos y pagos, y Seguimiento.
   - El modal mide 1040 px (80 % de la pantalla en monitores pequeños) y cabe sin scroll en 1366×768.
   - En pantallas angostas pasa a 2 columnas.
2. **Cada tarjeta** lleva el ícono de 28 px, el título, la reseña y, a la derecha, el lugar del pin. Los textos nunca se cortan con «…», y las tarjetas de una fila crecen juntas. En F1 el lugar del pin queda vacío.
3. **Encabezado y pie:**
   - arriba van «Opciones del pedido», el número del pedido, el buscador «Buscar acción» y la X;
   - abajo, «Eliminar pedido · se borra para siempre» es un enlace rojo que pide escribir el número del pedido para confirmar;
   - «Cerrar» es un botón secundario.
4. **Posición fija.** Las 16 acciones están siempre en el mismo lugar. Si una no aplica al pedido, se ve deshabilitada con su motivo, igual que los candados de hoy, y no deja un hueco.
5. **Fila «Para este pedido».** Es una quinta fila compacta que aparece solo cuando aplica alguna acción de contexto. Tiene un catálogo cerrado:
   - **Factura electrónica:** reúne Facturar, Refacturar, Liberar factura, Estado DIAN, PDF DIAN, Nota crédito y Ajuste NC/ND, y muestra solo las que aplican;
   - **Despacho:** ver despacho y entrega;
   - **Corregir precio** y **Cambiar tipo de precio:** tal como las definen D-543 y D-544;
   - desde Producción: **Producción** y **Marcar revisión**.

   «Editar o quitar descuento» se une a la tarjeta Descuento. Como máximo coinciden 4 acciones de contexto (cuadro en la spec), así que caben en una fila.
6. **Un solo nombre.** El bloque ACCIONES, el modal y el menú «⋯» de la fila usan los títulos del mockup. El buscador encuentra también por el nombre anterior.
7. **Desde Producción** el modal muestra solo las acciones que hoy aplican ahí.

### Fase 2 — Acciones principales por rol y por usuario (1349, parte 1)

1. El bloque ACCIONES tiene 8 espacios: 4 del rol y 4 del usuario. El resto queda en el modal.
2. **El pin del modal** sirve para fijar o soltar las acciones personales: azul si está fijada y gris si no. Las del rol se ven fijadas, con el aviso «Fijada por tu rol».
3. **Las 4 del rol** se escogen en Roles y permisos, partiendo de un perfil: Caja, Despacho, Comercial o General (pregunta 2).
4. **El uso.** Katuq cuenta qué acciones usa cada usuario y le sugiere fijarlas (pregunta 3). Nada cambia a mitad de la jornada.
5. **Resaltar sin mover:**
   - si el pago está pendiente, se resalta Pagos;
   - si el pedido está pagado y sin factura, se resalta Facturación.
6. El botón «Restablecer acciones» vuelve a las del perfil.
7. Las acciones de factura electrónica siguen saliendo debajo de las 8 cuando aplican, como hoy.
8. Las acciones fijadas siguen al usuario en cualquier equipo. Esto importa en las cajas que comparten computador.

**Base visual:** tokens de `openspec/specs/design-system/spec.md` (D-131) y regla de diseño Katuq (D-399, D-400). La familia de íconos es la misma que se decida en `menu-lateral-ordenado` (su pregunta 2).

## Capabilities

### New Capabilities
- `order-options-modal`: el modal «Opciones del pedido» en grilla, la fila de contexto y un solo nombre por acción en los tres lugares (F1).
- `order-pinned-actions`: el bloque ACCIONES con 4 acciones del rol y 4 del usuario, el pin, las sugerencias, el resaltado y el restablecer (F2).

### Modified Capabilities
- Ninguna archivada.
- D-543 y D-544 conservan sus dos entradas, sus reglas y su consulta de permisos. Solo se define que van en la fila de contexto.
- D-541: la tarjeta Historial abre lo que entregue esa decisión.

## Impact

- **F1, solo front:**
  - `list.component.html`: el modal y los nombres del bloque ACCIONES;
  - `list.component.ts`: los nombres del menú «⋯» y la confirmación de eliminar;
  - SCSS del modal. Si conviene sacar el modal a un componente propio (SRP), lo decide el diseño.
- **F2, front y backend:**
  - la configuración de cada rol se guarda con el rol, y las acciones fijadas y el conteo de uso, con el usuario. No se esperan colecciones nuevas: el diseño lo confirma y, si hiciera falta una, se pide aprobación;
  - bandera por empresa en `featureFlags` (D-505).
- **Write-set:**
  - F1 no escribe datos;
  - F2 escribe solo las preferencias de acciones del rol y del usuario y el conteo de uso;
  - ninguna fase escribe pedidos, pagos, facturas, precios, productos ni inventario.

## No-goals

- Cambiar lo que hace cada acción, sus ventanas, validaciones o permisos. Hay dos excepciones de presentación:
  - la confirmación de eliminar pide escribir el número del pedido;
  - la tarjeta Descuento abre la ventana de editar cuando el pedido ya tiene descuento.
- Implementar Corregir precio, Cambiar tipo de precio (D-543 y D-544) o el historial (D-541), o editar sus carpetas.
- Los permisos que hoy están fijos en el código. Quedan como hallazgos para un ticket aparte:
  - eliminar pedidos depende de una lista de correos;
  - Marcar revisión, de un usuario;
  - Cambiar asesor, de que el nombre del rol contenga «admin».
- El resto del detalle, la vista Tabla, el listado, POS y venta asistida.

## Riesgos (módulo sensible: `orders`)

- **Un binding roto daña una acción.** Las 28 acciones (23 del modal y 5 de factura que hoy solo están en el bloque) se prueban antes y después sobre los mismos pedidos y deben dar el mismo resultado:
  - pedido de venta;
  - pedido POS;
  - despachado;
  - facturado con SIIGO y con DIAN;
  - con descuento;
  - abierto desde Producción.
- **Sesiones paralelas en los mismos archivos.** D-541, D-543 y D-544 tocan `list.component.*`. Se trabaja un cambio a la vez, con `git pull` y diff aprobado. F1 deja lista la fila de contexto para las dos entradas de precio, y quien llegue de segundo se adapta sin cambiar las reglas del otro.
- **Alto en 1366×768.** Con el navegador maximizado quedan unos 620 px. El modal de 4 filas mide unos 500 px y la fila de contexto compacta suma unos 60. Se mide en Windows y en Mac al 100 % de zoom.
- **Eliminar.** La confirmación no se puede saltar con Enter y conserva el permiso de hoy.
- **F2: fijar nunca da acceso.** Una acción fijada que el usuario no puede usar en ese pedido se ve deshabilitada con su motivo. Las 4 del rol solo las cambia un administrador de ese comercio.
- **F2: el conteo de uso** guarda solo qué acción y cuántas veces, sin datos del pedido ni del cliente y sin `console.log`.
- **Trampas de CSS global** (AGENTS.md):
  - ninguna clase nueva contiene «p-»;
  - todo `span` con `*ngIf` lleva su propio color y tamaño;
  - el foco se devuelve con `:focus-visible`;
  - se neutraliza el `letter-spacing` heredado.

## Preguntas para Daniel

1. **¿Apruebas cómo caben las acciones que dependen del pedido?** Recomendado:
   - las 16 fijas siempre en su lugar, deshabilitadas con su motivo cuando no aplican;
   - una fila «Para este pedido» con catálogo cerrado, donde Factura electrónica agrupa las 7 de factura y Editar descuento se une a Descuento;
   - toda acción nueva declara en su propuesta si es fija o de contexto.

   La alternativa, una grilla que crece y hace scroll, no cumple el 1350.
2. **¿Cómo se escogen las 4 del rol?** Los roles son de cada comercio (ALMARA tiene seis), así que no se pueden asignar por nombre. Recomendado: el administrador escoge en Roles y permisos un perfil de partida (Caja, Despacho, Comercial o General) y puede cambiar las 4. Los roles sin escoger usan General, que son las 4 primeras de hoy: PDF del pedido, Orden de venta, Editar cliente y Facturación. Así nadie ve un cambio que su administrador no decidió.
3. **¿Katuq cambia solo los espacios personales o solo sugiere?** Recomendado: solo sugiere, una vez por semana como máximo y al empezar el día («Usas Pagos a diario, ¿lo fijamos?»). El usuario acepta y Katuq nunca mueve nada por su cuenta.
4. **¿Para quién sale?** Recomendado: F1 para todos los comercios, sin bandera, porque es solo presentación y se revierte con el commit. F2 con bandera por empresa (`featureFlags`, D-505), primero para ALMARA.
