> **Estado:** borrador — pendiente aprobación de Daniel.
> **Ticket:** 1472 («Panel ACCIONES del pedido: mostrar dinámicamente las acciones fijadas y las más usadas por cada usuario, en 3 columnas»; Julsmind, caso ALMARA FELICIDAD, pedido DAD-014810, 29-oct).
> **Decisión:** D-635 (la asigna el orquestador).
> **Origen:** Daniel García (`dgarciah@julsmind.com`), canal MCP, con pantallazos del panel y del modal.
> **Tipo:** **Delta sobre D-547** (`openspec/changes/acciones-del-pedido/`, aprobada el 23-oct, hecha por aws-claude-1). No es una propuesta nueva. `design.md` y `tasks.md` se escriben después de aprobar. Sin código.

## Why

El ticket pide un panel que muestre, por usuario, primero lo que fijó, luego lo que más usa (30 días) y, para el usuario nuevo, un set por defecto; en 3 columnas de tarjetas, con pin desde el panel, etiqueta «Frecuente» y estados en la tarjeta. No tiene comentarios ni adjuntos (leído completo el 3-nov; `date_add` 2026-10-29T23:17:03Z). Menciona un ticket aparte, «No pudimos guardar tus acciones» (1471).

**Casi todo ya está hecho por D-547 F2.** Verificado en el código (rama `feature/tickets-aws-claude-2`, solo lectura):

- **Lo que ve el ticket es D-547 funcionando como se diseñó.** Las 8 acciones que describe (PDF del pedido, Orden de venta, Editar cliente, Facturación, y después Notas, Cambiar estado, Editar productos, Editar dirección) son exactamente las 4 del perfil General del rol (candado, «Fijada por tu rol») más el orden fijo de los espacios personales sin pin (`acciones-pedido.ocho.ts`: `PERFILES_ACCIONES.general` y `ORDEN_FIJO_PERSONALES`). Es decir, la bandera `orderPinnedActions` ya está encendida en ese comercio y el usuario no había fijado nada.
- **El error al fijar ya tiene arreglo.** El ticket 1471 está resuelto en el código: el backend ya no responde 409 cuando un mismo correo tiene dos fichas en la empresa (`functions/services/orderActions/index.js:157`), y el front muestra el motivo real del servidor en vez del aviso genérico (`list.component.ts:11311`, `motivoAccionesNoGuardadas`). Falta confirmar en producción que ya está publicado; no es parte de este delta.
- **Ya cubierto por D-547:** fijar desde el pin del modal y guardar por usuario; acciones del rol con candado; aviso claro del límite («Puedes fijar hasta 4 de las 16 acciones», `index.js:40`); «Restablecer acciones» con confirmación (`list.component.ts:1061`); tarjetas deshabilitadas con su motivo en su mismo lugar, sin huecos («Congelado · estado», «Solo domicilios»); etiquetas «Pago pendiente» y «Sin factura»; Facturar y las acciones de factura electrónica debajo; Historial entre las 16 y «Más opciones».

## What Changes (lo que D-547 no cubre)

1. **Más usadas, al empezar la sesión.** Los espacios personales sin pin se llenan con las acciones más usadas por ese usuario en los últimos 30 días (no el orden fijo de hoy), y llevan la etiqueta «Frecuente». Lo fijado va siempre primero. El orden se calcula **al cargar la sesión y no cambia durante el día**, para respetar «Estables durante el día» de D-547.
2. **Nueve acciones: 4 del rol + 5 personales**, en tarjetas compactas (ícono, nombre, reseña corta). Se sube el límite de pines personales de 4 a 5 y el aviso lo dice con el número vigente.
3. **Set por defecto para quien no tiene uso:** el orden fijo pasa a Pagos, Cambiar estado, Notas, Historial, Editar dirección. Con el perfil General esto da: PDF del pedido, Orden de venta, Editar cliente, Facturación + las cinco anteriores. Contiene las seis del ticket (Pagos, Cambiar estado, Notas, Historial, PDF del pedido, Editar dirección) sin tocar las 4 del rol que el administrador escogió.
4. **Tres columnas** en el panel (escritorio), con 2 en tablet. En celular, la pregunta 3.
5. **Pin desde el panel:** pin al pasar el mouse o con foco de teclado en cada tarjeta personal, que fija o suelta con el mismo guardado del modal. Las del rol muestran «Fijada por tu administrador» (hoy dice «por tu rol») y no se sueltan.
6. **Estado en la tarjeta, siempre:** «Sin factura» en Facturación y el saldo pendiente en Pagos, con datos que el pedido ya trae (sin consulta nueva). Hoy la etiqueta solo sale cuando el pedido está pagado y sin factura.

## Cambios sobre D-547 (qué requisitos se modifican)

| Requisito de D-547 | Cambio |
|---|---|
| «Ocho espacios…» | Nueve: 4 rol + 5 personales |
| «Las cuatro del usuario y el pin» | Cinco; orden fijo nuevo; pin también en el panel; hasta 5 pines |
| «Estables durante el día» | Sin cambio de fondo: lo «más usado» se recalcula solo al cargar la sesión |
| «Sugerencias por uso» | Se conserva; no se sugiere lo que ya es «Frecuente» |
| «Diseño» (una columna ≥ 992 px, dos en celular) | Tres columnas; ver pregunta 3 |

## Capabilities

### Modified Capabilities
- `order-pinned-actions` (D-547): el bloque pasa de 8 a 9 acciones, suma «Frecuente», pin en el panel y estados en tarjeta. Es un delta de esa capacidad, no una nueva.

## Impact

- **Front:** `acciones-pedido.ocho.ts` (espacios y orden), `acciones-pedido.bloque.ts` y `order-pinned-actions.component.*` (3 columnas, pin, etiquetas), el modal solo en el texto del rol. Sigue la regla de `list.component.*` compartido: un cambio a la vez.
- **Backend:** `services/orderActions/catalogo.js` (`MAX_PINES` 4 a 5, `DIAS_DE_USO_GUARDADOS` 8 a 30 y ventana de 30) y el mensaje del límite. `GET /me` ya devuelve `usageDays`; solo cambia la ventana. Sin endpoints nuevos.
- **Datos:** el conteo de uso sigue siendo acción + usuario + día (sin datos del pedido ni del cliente). Guardar 30 días en vez de 8 suma unos 22 valores de fecha por acción en la preferencia del usuario. **Ninguna colección nueva.**
- **Bandera:** la misma `orderPinnedActions`; sin bandera nueva.
- **Write-set:** solo las preferencias de acciones del usuario. Ningún pedido, pago, factura, precio, producto ni inventario.

## No-goals

- Arreglar el error al fijar (ticket 1471, ya resuelto en el código).
- Cambiar qué hace cada acción, sus permisos o validaciones. Fijar, sugerir o marcar «Frecuente» nunca da acceso.
- Ocultar acciones y reacomodar la cuadrícula: se mantiene deshabilitar con motivo en el mismo lugar (D-547 ya cumple «sin huecos»).
- El modal «Opciones del pedido» y la fila «Para este pedido» (F1 de D-547); D-541, D-543 y D-544.

## Riesgos (módulo sensible: `orders`)

- **Mismos archivos que aws-claude-1.** `order-pinned-actions.*` y `list.component.*` los trabajó esa sesión. Este delta no se implementa hasta que Daniel lo apruebe y se coordine el turno; se aplica un cambio a la vez, con `git pull` y diff aprobado.
- **«Más usadas» automático choca con el principio de D-547** («Katuq solo sugiere, nunca mueve»). Se resuelve con un cálculo solo al iniciar sesión; si Daniel prefiere el principio estricto, queda solo la sugerencia (pregunta 1).
- **Un binding roto daña una acción.** Las acciones se prueban antes y después en pedido de venta, POS, despachado, facturado con SIIGO y DIAN, con descuento y desde Producción.
- **Ancho del panel.** Tres columnas con reseña solo caben si el panel mide lo suficiente; se mide a 1440 y 1366 px antes de fijar las columnas.
- **Trampas de CSS global** (AGENTS.md): ninguna clase con «p-», color y tamaño propios en cada `span` con `*ngIf`, `:focus-visible`, `letter-spacing` normal, sin gradientes.

## Preguntas para Daniel

1. **¿«Más usadas» se acomoda sola?** Recomendado: sí, pero solo al iniciar sesión y marcado «Frecuente»; lo fijado manda siempre. Alternativa (D-547 estricto): solo sugerir.
2. **¿Nueve acciones (4 del rol + 5 personales) y hasta 5 pines?** Recomendado: sí. El ticket sugiere 9 y dice «Puedes fijar hasta 6» solo como ejemplo.
3. **¿Cuántas columnas en celular?** El ticket dice 1; D-547 dijo 2. Recomendado: 3 / 2 / 1 como pide el ticket, medidas por el ancho del panel y no por el de la pantalla.
4. **¿Cambia el set por defecto?** Recomendado: sí, solo en los espacios personales (Pagos, Cambiar estado, Notas, Historial, Editar dirección); las 4 del rol no se tocan.
5. **¿Confirmamos que el 1471 ya está publicado antes de seguir?** Recomendado: sí; sin eso el usuario no puede fijar.
