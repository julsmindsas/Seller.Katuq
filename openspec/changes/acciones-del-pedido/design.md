> **Estado:** DISEÑO, pendiente de aprobación de Daniel. Decisión **D-547** (propuesta aprobada el 2026-10-23). Tickets 1350 (F1) y 1349, parte 1 (F2), de ALMARA FELICIDAD. Módulo sensible `orders`: un cambio a la vez, con el diff a la vista y aprobación antes de aplicarlo. Sin código hasta aprobar este diseño y `tasks.md`.

## Context

- **Pantalla:** Todos los pedidos (`components/ventas/list/`). Las acciones de un pedido viven en tres lugares del mismo componente `ListOrdersComponent` (10.741 líneas de TS, 3.063 de HTML y 6.792 de SCSS):
  - el **bloque ACCIONES** del detalle (`list.component.html:568-648`), con el pie «Historial» y «Más opciones» (`:651-659`);
  - el **modal «Más opciones»** (`:2171-2540`), un `custom-modal-overlay` con `*ngIf="modalVisible"`;
  - el **menú «⋯» de cada fila** (`onRowMenuClick`, `list.component.ts:506-628`), un `p-menu` de PrimeNG.

  `menu-contextual.html`, `botones-inline.html` y `menu-alternativo-primeng.html` de la misma carpeta no los usa ninguna plantilla y no se tocan.
- **Lo que dice el código y manda en el diseño:**
  - **Cada botón del modal llama al método de hoy con su plantilla y decide si cierra el modal.** Por ejemplo, `pdfOrder(modalContent, o); closeOptionsModal()`.
    - Editar cliente, Editar dirección, Facturación y Notas no llaman `closeOptionsModal()` en la plantilla, porque lo hacen dentro del método (`editDatosClientes`, `:6390`; `editDatosEntrega`, `:6724`; `editDatosFacturacion`, `:6863`; `editNotas`, `:6909`).
    - `closeOptionsModal()` deja `selectedOrder = null` (`:739`). El orden de las llamadas importa.
  - **Condiciones de hoy:**

    | Acción | Condición en el modal | Si no aplica |
    |---|---|---|
    | Editar dirección | `canEditDeliveryAddressByDeliveryType` | Deshabilitada, «Solo domicilios» |
    | Facturación | `canEditBilling` | Deshabilitada, sin motivo |
    | Editar productos | `canAddProducts` (`!isPedidoCongelado`) | Deshabilitada, «Pedido congelado - Estado: …» |
    | Cambiar asesor | `canAssignSeller` (rol que contiene «admin») | Deshabilitada, «Solo administradores» |
    | Notas | `!isPedidoPOS` | Escondida |
    | Descuento, Editar descuento e Impuestos | `canModifyProducts \|\| isAdminUser()` | Escondidas |
    | Eliminar | `canDeleteOrder()` (lista de correos, `:777`) | Escondida |
    | Marcar revisión | `checkIfUserIsBrenda()` (`:10146`) | Escondida |

    Las demás no dependen del pedido, salvo Desde Producción (`isFromProduction`).
  - **Eliminar usa `confirm()`** (`confirmDeleteOrder`, `:2427`). La regla dura del proyecto es Swal y nunca `confirm()`.
  - **El bloque ACCIONES** tiene 8 acciones, con las de factura electrónica intercaladas cuando aplican (`:589-619`): Facturar, Liberar factura, Estado DIAN, PDF DIAN, Nota crédito y Ajuste NC/ND. Esas 5 últimas no están en el modal. En pantallas de menos de 992 px el bloque va en una columna (`list.component.scss:6011`).
  - **El estilo del modal** está en `list.component.scss:2418-2660` y `:2858-2930`, compartido con otros `custom-modal`. El presupuesto de estilos por componente avisa a los 220 KB.
  - **Roles:** se guardan en `roles` por nombre y empresa. `POST /v1/roles/edit` hace `update(req.body)` sin lista de campos (backend `controllers/roles.js:63`) y está protegido con `verifyRole(['admin','Super Administrador'])`.
  - **Usuarios:** el JWT trae `email`, `company` (`empresa || company` del usuario) y `role` (backend `services/index.js:7`).
- **Trabajo en paralelo sobre los mismos archivos:**
  - D-541 (historial, 7.5 sin hacer) cambia el nombre de la entrada de historial y su ventana (`:2966`).
  - D-543 (T-38) y D-544 (L-11) agregan Corregir precio y Cambiar tipo de precio a «Más opciones». Las muestran solo si una consulta al servidor confirma el permiso.

  Ninguno está implementado en `list.component.*` a esta fecha. Este cambio no edita sus carpetas.
- **Línea base de diseño (2026-10-23):** `components/ventas/list` tiene 3 gradientes y 0 primarios prohibidos. No deben subir.

## Goals / Non-Goals

**Goals:**
- **F1, para todos:**
  - modal de 16 tarjetas fijas en 4×4, sin scroll en 1366×768;
  - fila «Para este pedido» con catálogo cerrado;
  - buscador, eliminar aparte con número y «Cerrar» secundario;
  - un solo nombre en el bloque, el modal y el «⋯»;
  - la misma acción hace exactamente lo mismo que hoy.
- **F2, con bandera y ALMARA primero:**
  - bloque de 8 (4 del rol y 4 del usuario) con pin, sugerencias, resaltado y restablecer;
  - preferencias que siguen al usuario en cualquier equipo.

**Non-Goals:** los de la propuesta:
- cambiar lo que hace cada acción, salvo la confirmación de eliminar y la tarjeta Descuento;
- implementar D-541, D-543 o D-544;
- los permisos fijos en el código (lista de correos, Brenda, «admin» en el nombre del rol);
- la vista Tabla, el listado, POS y venta asistida.

## Decisiones de Daniel (2026-10-23)

1. **16 acciones fijas y la fila «Para este pedido»**, con catálogo cerrado. Toda acción nueva declara en su propuesta si es fija o de contexto.
2. **Las 4 del rol parten de un perfil:** Caja, Despacho, Comercial o General. Un rol sin configurar usa **General**.
3. **Katuq solo sugiere.** Nunca mueve nada por su cuenta.
4. **F1 para todos y sin bandera**, porque se revierte con el commit. **F2 con la bandera `orderPinnedActions`** en `companies.featureFlags` (D-505), primero ALMARA.

## Decisions — F1

### D1. Un catálogo de acciones

`components/ventas/list/acciones-pedido/acciones-pedido.catalogo.ts` es la única fuente de los nombres. Lo leen el modal, el bloque, el «⋯» y el buscador.

```ts
export interface AccionPedido {
  id: AccionPedidoId;            // identificador estable en inglés: orderPdf, salesOrder, …
  titulo: string;                // «PDF del pedido»
  resena: string;                // «Descarga el pedido completo»
  nombresAnteriores: string[];   // para el buscador: «Imprimir PDF», «Generar PDF del pedido»
  icono: string;                 // nombre Tabler (D10)
  columna?: 'documentos' | 'clienteEntrega' | 'productosPagos' | 'seguimiento';
  tipo: 'fija' | 'contexto' | 'pie';
}
```

| Columna | Acciones fijas (`id` · título · ícono) |
|---|---|
| Documentos | `orderPdf` PDF del pedido `file-type-pdf` · `salesOrder` Orden de venta `file-invoice` · `resendConfirmation` Reenviar confirmación `send` · `duplicate` Duplicar `copy` |
| Cliente y entrega | `editCustomer` Editar cliente `user-edit` · `editAddress` Editar dirección `map-pin` · `billingData` Facturación `receipt` · `changeSeller` Cambiar asesor `user-share` |
| Productos y pagos | `editProducts` Editar productos `shopping-cart` · `discount` Descuento `discount` · `taxes` Impuestos `percentage` · `payments` Pagos `cash` |
| Seguimiento | `changeStatus` Cambiar estado `progress-check` · `history` Historial `history` · `notes` Notas `notes` · `cleanNotes` Limpiar notas `eraser` |

- **Contexto:**
  - `electronicInvoice`, que agrupa `invoice`, `reinvoice`, `releaseInvoice`, `dianStatus`, `dianPdf`, `creditNote` y `dianAdjustment`;
  - `delivery`, `correctPrice`, `changePriceList`, `production` y `reviewMark`.
- **Pie:** `deleteOrder`.
- Las reseñas son las del mockup del 1350.
- `nombresAnteriores` recoge los títulos de hoy del modal, del bloque y del «⋯».

### D2. Un plan por acción y un solo ejecutor

- `acciones-pedido.plan.ts` (función pura) dice, para cada `id`, qué método de `ListOrdersComponent` se llama, con qué plantilla y si después se cierra el modal. Copia exactamente la plantilla de hoy:

  ```ts
  orderPdf:     { metodo: 'pdfOrder',            plantilla: 'modalContent',      cerrar: true  },
  editCustomer: { metodo: 'editDatosClientes',   plantilla: 'clientesModal',     cerrar: false }, // cierra adentro
  editAddress:  { metodo: 'editDatosEntrega',    plantilla: 'datosEnregaModal',  cerrar: false },
  reviewMark:   { metodo: 'marcarOQuitarRevision', cerrar: true },  // envuelve el ternario de hoy, sin cambiarlo
  …
  ```

- `ListOrdersComponent.ejecutarAccionPedido(id, pedido)` resuelve la plantilla y llama al método con el pedido.
  - Las plantillas salen de `@ViewChild` nuevos para las que hoy no tienen: `datosEnregaModal`, `datosFacturacionModal`, `cambioEstadoPagoModal`, `recompraModal`, `pagosModal`, `descuentoModal` y `editarDescuentoModal`.
  - Llama a `closeOptionsModal()` después, solo si el plan lo dice. Así se conserva el orden de hoy.
- Una prueba de contrato compara el plan con la tabla de llamadas sacada de la plantilla actual en la tarea 1.2 (`tests/ventas/acciones-pedido-antes.json`). Comprueba además, leyendo el fuente, que cada `metodo` existe en `ListOrdersComponent`.
- Las acciones que hoy solo están en el bloque (`releaseInvoice` y las 4 DIAN) se llaman desde el modal igual que desde el bloque, y después se cierra el modal.
  - La tarea 4.1 comprueba que ninguno de esos métodos lea `this.selectedOrder`, que el cierre deja en `null`.
  - Si alguno lo lee, ese se llama sin cerrar el modal antes.
- **Descartado:** un `switch` con 28 casos en la plantilla o en el TS. No se puede comparar automáticamente con lo de hoy.

### D3. Disponibilidad y motivo en una función pura

- `estadoAcciones(entrada)` (`acciones-pedido.estado.ts`) recibe booleanos ya calculados por `ListOrdersComponent` con sus métodos de hoy, sin reescribirlos:

  ```ts
  { produccion, puedeDireccion, puedeFacturacion, puedeProductos, puedeDescuentoEImpuestos,
    puedeAsesor, esPOS, tieneDescuento, puedeEliminar, esBrenda, estadoProceso,
    puedeFacturarSiigo, puedeRefacturar, puedeLiberar, esDian, despachadoOEntregado, revisado }
  ```

- Devuelve, por acción, `{ visible, habilitada, motivo }`:

  | Acción | Habilitada si | Motivo si no |
  |---|---|---|
  | Editar productos | `puedeProductos` | «Congelado · {estadoProceso}» |
  | Descuento, Impuestos | `puedeDescuentoEImpuestos` | «Congelado · {estadoProceso}» |
  | Editar dirección | `puedeDireccion` | «Solo domicilios» |
  | Facturación | `puedeFacturacion` | «Ya tiene factura» |
  | Notas | `!esPOS` | «No aplica a pedidos POS» |
  | Cambiar asesor | `puedeAsesor` | «Solo administradores» |
  | Las otras 10 | siempre | — |

- **Fuera de Producción** las 16 son visibles y van en su lugar: lo que hoy estaba escondido (Notas, Descuento e Impuestos) queda deshabilitado con su motivo.
- **Desde Producción** (`produccion`) solo son visibles las que hoy aplican allí: PDF del pedido, Orden de venta, Duplicar, Cambiar estado, Historial y Limpiar notas. Ninguna sale deshabilitada.
- **Contexto,** con las condiciones de hoy:
  - `electronicInvoice` lista los hijos que aplican:
    - `invoice`: `!produccion && puedeFacturarSiigo`;
    - `reinvoice`: `puedeRefacturar`;
    - `releaseInvoice`: `!produccion && puedeLiberar`;
    - DIAN: `!produccion && esDian`.
  - `delivery`: `despachadoOEntregado`.
  - `production`: `produccion`.
  - `reviewMark`: `produccion && esBrenda`.
  - `correctPrice` y `changePriceList`: solo si les llega un resultado afirmativo por la entrada `accionesPrecio` (D5).
- Pruebas `node --test` cubren los escenarios de la spec: pedido de venta, POS, congelado con y sin administrador, recoge en tienda, facturado, Desde Producción con y sin Brenda, y despachado.

### D4. Modal «Opciones del pedido» (componente propio)

- **Componente:** `OrderOptionsModalComponent` (`acciones-pedido/order-options-modal.component.*`), OnPush, declarado en `VentasModule`.
  - Entradas: `pedido`, `estados` (de D3), `accionesPrecio`, `pines` (F2) y `resaltada` (F2).
  - Salidas: `(accion)` con el `id`, `(cerrar)` y `(fijar)` (F2).
  - Se pinta en el mismo lugar de `list.component.html` donde está hoy el overlay, con el mismo `*ngIf="modalVisible"`. Queda en el mismo contexto de apilamiento de `.page-body` que el modal de hoy.
  - El HTML de `:2171-2540` se borra, y sus reglas de `list.component.scss` se borran solo si `grep` muestra que ningún otro modal las usa.
- **Estructura:**
  - **Encabezado:** «Opciones del pedido», el número, el buscador «Buscar acción» y la X.
  - **Grilla:** una sola, de 16 tarjetas con 4 etiquetas de columna:

    ```scss
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: auto repeat(4, auto);
    grid-auto-flow: column;
    ```

    La etiqueta y las 4 tarjetas de cada tema caen en su columna, en orden de lectura para Tab. Las tarjetas de una fila comparten fila de la grilla y crecen juntas (`align-items: stretch`).
  - **Fila de contexto** y **pie**.
- **Tarjeta:**
  - un `<button>` con el ícono de 28 px en tile de 40 px, radio 11, con fondo lila suave;
  - el título en 13 px/700 tinta y la reseña en 11,5 px gris `#6B6890`, sin «…» y con el salto de línea natural;
  - a la derecha, el lugar del pin de 24 px, vacío en F1;
  - borde `#ECEAF4`, radio 16 y hover `#FAF9FF`. El foco se ve con `:focus-visible`.
  - **Deshabilitada:** `disabled`, con un candado y el motivo en lugar de la reseña, en el par de alerta `#D9820A` sobre `#FFF1DF`, y `aria-disabled`.
- **Tamaño:** `width: min(1040px, 80vw)` y `max-height: calc(100vh − 32px)`.
  - Menos de 1200 px: `repeat(2, …)` y `grid-template-rows: auto repeat(4, auto) auto repeat(4, auto)`, que da dos temas por columna.
  - Menos de 520 px: el modal ocupa el ancho menos 16 px por lado, sigue en 2 columnas y permite scroll vertical. Nunca horizontal.
- **Presupuesto de alto a 1366×768** (ventana útil de 620 a 650 px):

  | Pieza | Alto |
  |---|---|
  | Relleno del modal | 40 |
  | Encabezado con el buscador en la misma fila | 56 |
  | Etiquetas de columna | 22 |
  | 4 filas de tarjetas de 2 renglones (68 px) + 3 separaciones de 8 | 296 |
  | Fila «Para este pedido» | 52 |
  | Pie | 48 |
  | **Total** | **≈ 514 px** |

  Quedan unos 100 px de margen. Con la lista de Factura electrónica abierta se suman ~44 px. Si en alguna medida no cabe, la grilla se desplaza dentro del modal y el encabezado, la fila de contexto y el pie quedan fijos.
- **Accesibilidad:**
  - `role="dialog"`, `aria-modal` y `aria-labelledby`;
  - al abrir, el foco va al buscador; al cerrar, vuelve al botón que lo abrió;
  - Esc, la X, «Cerrar» y el clic fuera cierran sin hacer nada, como `onBackdropClick` y `onKeyDown` de hoy.

### D5. Fila «Para este pedido» y la coordinación con D-543, D-544 y D-541

- Aparece solo si alguna acción de contexto es visible. Cada acción es un botón de una línea con su ícono y su título.
- **Factura electrónica:**
  - con un solo hijo aplicable, el botón lleva el nombre de ese hijo (por ejemplo «Refacturar») y lo ejecuta;
  - con varios, abre debajo una segunda fila con los hijos aplicables. No se abre otra ventana.
- **D-543/D-544:** el modal recibe `accionesPrecio: { id: 'correctPrice' | 'changePriceList'; habilitada: boolean; motivo?: string }[]`, vacío por defecto. Así no se ven hasta que exista su consulta de permisos.
  - Si D-547 F1 llega primero, D-543 T-38 y D-544 L-11 solo llenan esa entrada, sin tocar la grilla.
  - Si llegan antes ellos, la tarea 4.3 pasa sus dos botones a la fila de contexto con sus condiciones exactas y su consulta, sin cambiar sus reglas.
- **D-541:** la tarjeta Historial llama a `verHistorialPedido`, que abre lo que D-541 entregue. El título en la grilla es «Historial», como en el mockup aprobado, y «Historial del pedido» queda como nombre anterior para el buscador. D-541 conserva su nombre en el botón del detalle y en el encabezado de su ventana (Open Questions).

### D6. Buscador

- Filtra mientras se escribe, sin mayúsculas ni tildes (NFD), por título, reseña y `nombresAnteriores`, en las 16 fijas y en las de contexto visibles.
- Mientras hay texto, la grilla pasa a una lista de 4 columnas en orden de lectura, sin etiquetas.
- Enter abre la acción cuando queda exactamente una habilitada. Sin coincidencias, muestra «Ninguna acción con ese nombre».
- Al borrar el texto vuelve la grilla.

### D7. Eliminar con el número del pedido

- El pie muestra a la izquierda el enlace rojo `#D64545` «Eliminar pedido · se borra para siempre», solo si `canDeleteOrder() && !isFromProduction`, como hoy.
- `confirmDeleteOrder(order)` cambia `confirm()` por un Swal con `input: 'text'`:
  - el botón de eliminar arranca deshabilitado (`didOpen`) y se habilita solo cuando el texto, recortado, es igual a `order.nroPedido`;
  - además, `inputValidator` rechaza cualquier otro texto, así que Enter sin coincidencia no elimina;
  - lo que pasa después, `deleteOrder(order)`, no cambia.
- A la derecha va «Cerrar», secundario: blanco, borde `#E4E2EF` y texto `#5B5878`.

### D8. Un solo nombre en el bloque y en el «⋯»

- **Bloque ACCIONES (F1):** los mismos 8 botones y sus mismas condiciones. Solo cambian el título y la reseña, que salen del catálogo, y el motivo, que es el de D3 cuando está deshabilitado.
  - Las acciones de factura electrónica del bloque pasan a llamarse como en el catálogo: Facturar, Liberar factura, Estado DIAN, PDF DIAN, Nota crédito y Ajuste NC/ND.
  - En la F1, el bloque llama a los mismos métodos de hoy. No pasa por el ejecutor.
- **Menú «⋯»:** solo cambian los `label` de `onRowMenuClick`:
  - Imprimir PDF → PDF del pedido;
  - Enviar de nuevo la confirmación → Reenviar confirmación;
  - Editar Cliente → Editar cliente;
  - Editar Notas → Notas;
  - Consultar estado DIAN → Estado DIAN;
  - Descargar PDF DIAN → PDF DIAN;
  - Crear nota crédito total → Nota crédito;
  - Crear ajuste NC / ND → Ajuste NC/ND.

  Los íconos PrimeIcons, el orden y «Enviar a Cereza» no cambian.
- **Descuento:** con descuento en el pedido, la tarjeta abre un menú de dos opciones, «Aplicar otro» y «Editar o quitar», que llaman a `aplicarCodigoDescuento` y `editarDescuentoPedido`. Sin descuento, abre la ventana de aplicar de hoy.
- **Impuestos:** la reseña es «Ajusta el IVA del pedido». No hay hoy un dato de empresa que diga si maneja otros impuestos (Open Questions).

### D9. Desde Producción

Con `isFromProduction`, el modal pinta en flujo (como el buscador) las 6 fijas que aplican y, en la fila de contexto, Producción, Marcar revisión, Despacho y Refacturar cuando aplican. Es lo mismo que muestra hoy, en el mismo orden de temas.

### D10. Íconos

- Tabler, con el componente y el registro de D-546 (design D6): `IconoTablerComponent` y `shared/icons/tabler-iconos.ts`.
- Los 25 nombres de este cambio se agregan a `tabler-usados.json`: 16 fijas, contexto, pie y pin (`pin` / `pinned-filled`).
- Si D-547 F1 se implementa antes que D-546 F2, la tarea 2.1 crea esas mismas piezas tal como las describe D-546 D6. No se crea una variante propia.
- Lo decidido para D-546 dice «Tabler solo en el menú», y la respuesta recomendada incluía «después, las acciones del pedido» (Open Questions).

## Decisions — F2

### D11. Bandera y alcance

- `orderPinnedActions` en `companies.featureFlags`, con dueño Daniel y retiro el 2027-04-30: encendida para todos o eliminada (Artículo XII).
  - Se agrega a `COMPANY_FEATURE_FLAGS` (front) y a `FEATURE_FLAGS` de `services/companyFeatureFlags.js` (backend).
  - Se enciende con `scripts/set-company-feature.js`, primero en simulación.
- Apagada, el bloque es el de F1 y el modal no muestra pines. F2 aplica solo en la vista normal de Pedidos; Desde Producción sigue como en F1.

### D12. Dónde se guardan los datos (sin colecciones nuevas)

| Dato | Documento | Campo |
|---|---|---|
| 4 acciones del rol | `roles/{id}` (colección existente) | `orderActions: { profile: 'cashier' \| 'dispatch' \| 'sales' \| 'general', actions: [4 ids], updatedAt, updatedBy }` |
| Preferencias del usuario | `users/{docId}` (colección existente) | `orderActions: { company, pinned: [≤4 ids], dismissed: { [id]: 'YYYY-MM-DD' }, lastSuggestionAt: 'YYYY-MM-DD', usage: { [id]: ['YYYY-MM-DD', …≤8] }, updatedAt }` |

- **Usuario:** se ubica con el correo del JWT y se comprueba que su empresa (`empresa`, si no `company`) sea la del JWT.
  - Si hay cero o más de un documento, no se escribe (404/409).
  - Si `orderActions.company` no coincide con la empresa del JWT, se trata como vacío.
- **Escrituras:** siempre con `update` sobre la ruta `orderActions…`, nunca con `set` del documento completo. El editor de usuarios (`controllers/users.js:298`) hace `update(req.body)` con los campos del formulario y no borra este campo.
- **Tamaño acotado:** ~1-2 KB por usuario.

### D13. Contratos HTTP (backend `routers/orderActions.js`, montado en `/v1/order-actions`)

Todas llevan `auth` y `requireFeature('orderPinnedActions')`. La empresa y el usuario salen del JWT, no de los headers. Ninguna escribe fuera de los campos de D12.

| Método y ruta | Cuerpo | Respuesta | Errores |
|---|---|---|---|
| `GET /me` | — | `200 { role: { profile, actions[4], source: 'role'\|'default' }, pinned[], dismissed{}, lastSuggestionAt, usageDays: { [id]: n } }`. `usageDays` son los días distintos de los últimos 7, en hora de Colombia | 401, 403 (bandera), 404 (usuario), 409 |
| `PUT /me/pins` | `{ pinned: string[] }`: 0 a 4 ids distintos de las 16 fijas | `200 { pinned }`. Reemplaza la lista y es idempotente | 400 (id inválido o repetido, más de 4), 401, 403, 404, 409 |
| `POST /me/usage` | `{ actionId }` (una de las 16) | `204`. Suma el día de hoy (Bogotá), una vez por día, y conserva 8 días | 400, 401, 403, 404, 409 |
| `POST /me/suggestion` | `{ actionId, decision: 'shown' \| 'dismissed' }` | `204`. `shown` → `lastSuggestionAt` = hoy; `dismissed` → `dismissed[id]` = hoy + 30 | 400, 401, 403, 404, 409 |
| `PUT /roles/:roleId` | `{ profile, actions: [4 ids distintos] }` | `200 { profile, actions }` | 400, 401, 403 (no administrador, o rol de otra empresa salvo Julsmind con Super Administrador), 404 |

- `PUT /roles/:roleId` lleva además `verifyRole(['admin','Super Administrador'])`, igual que `routers/roles.js`.
- El catálogo de las 16 vive en el backend (`services/orderActions/catalogo.js`) y en el front (D1). Una prueba en cada repositorio compara su lista con la tabla de D1.
- **Descartado:** guardar las acciones del rol por `POST /v1/roles/edit`. Escribe el cuerpo completo sin validar y mezclaría este cambio con todo guardado de roles.

### D14. Bloque de 8 (`OrderPinnedActionsComponent`)

- Componente OnPush en `acciones-pedido/`, pintado con `*ngIf="bloquePersonalizado; else bloqueF1"`.
- **Las 8:**
  1. las 4 del rol (o General);
  2. los pines del usuario, en su orden;
  3. se completa hasta 4 con el orden fijo: Notas, Cambiar estado, Editar productos, Editar dirección, Pagos, Historial, y después el resto en el orden de la grilla, saltando lo que ya está.

  Es una función pura, `ochoAcciones(rol, pines)`, con prueba.
- Cada botón usa `estadoAcciones` (D3) y `ejecutarAccionPedido` (D2). Una acción fijada que no aplica o que el usuario no puede usar sale deshabilitada con su motivo y no abre nada.
- Debajo van las acciones de factura electrónica que aplican, con sus condiciones y métodos de hoy. Debajo de todo, «Restablecer acciones» como enlace secundario.
- En el pie del detalle, «Historial» se esconde si Historial está entre las 8.
- Menos de 992 px: 2 columnas en lugar de 1. El texto baja de línea y no hay scroll horizontal.

### D15. Pin, reemplazo y restablecer

- **Pines en el modal:** las 16 fijas muestran su pin.
  - Fijada (rol o usuario): `pinned-filled` en acento `#5F3FE0`.
  - No fijada: `pin` en muted `#8F8BAB`.
  - Las del rol llevan además un candado pequeño y `title`/`aria-label` «Fijada por tu rol», y no se pueden soltar.
  - El pin es un botón propio de 24×24 (`aria-label` «Fijar en acciones principales» o «Quitar de acciones principales», `aria-pressed`), separado del botón de la tarjeta.
- **Fijar con espacio libre:** `PUT /me/pins` con la lista nueva. El bloque cambia solo cuando el servidor confirma.
- **Fijar con 4 fijadas:** un Swal con las 4 como opciones (`input: 'radio'`). Cancelar no cambia nada.
- **Soltar:** se quita de la lista. Su espacio vuelve al orden fijo.
- **Restablecer:** Swal de confirmación y luego `PUT /me/pins` con `[]`. Las del rol no cambian.
- **Falla al guardar:** el bloque y los pines quedan como estaban y sale el aviso «No pudimos guardar tus acciones. Intenta de nuevo.». La acción que se estaba usando sigue disponible en el modal.

### D16. Uso y sugerencias (Katuq solo sugiere)

- **Conteo:** `ejecutarAccionPedido`, el bloque y el «⋯» llaman a `registrarUso(id)` para las 16 fijas.
  - El servicio manda `POST /me/usage` como máximo una vez por acción y por día en la sesión.
  - Si falla, no se avisa y no se reintenta (Open Questions). Ese día simplemente no suma.
  - No hay `console.log`.
- **Sugerencia:** la calcula el front con `sugerencia(usageDays, ocho, dismissed, lastSuggestionAt, hoy)`, una función pura:
  - candidata: una de las 16 que no esté entre las 8, con 3 días o más en `usageDays`, no rechazada en los últimos 30 días;
  - solo si `lastSuggestionAt` tiene 7 días o más;
  - si hay varias, gana la de más días y, a igualdad, el orden de la grilla.
- **Cuándo se muestra:** al abrir el primer pedido de la sesión en que haya candidata, como aviso dentro del detalle, encima del bloque y sin ventana: «Usas Pagos a diario, ¿lo fijamos?», con «Fijar» y «Ahora no».
  - Al mostrarse: `POST /me/suggestion { shown }`.
  - «Fijar» hace lo mismo que el pin. «Ahora no» manda `dismissed`.
  - Nada cambia sin que el usuario acepte.

### D17. Resaltar sin mover

- `resaltada(pedido)` da:
  - `payments` («Pago pendiente») si `estadoPago === 'Pendiente'`;
  - `billingData` («Sin factura») si `estadoPago === 'Pagado'` y no hay `nroFactura` ni `pdfUrlInvoice`.
- La acción se pinta con el par de alerta y la etiqueta, en su mismo lugar: en el bloque si está entre las 8, si no en su tarjeta del modal.

### D18. Las 4 del rol en Roles y permisos

- `AccionesRolPedidoComponent`, OnPush, en `components/rol/roles/`. Se ve con la bandera encendida y un rol ya guardado (`editingRoleId`).
- Tiene 4 chips de perfil (Caja, Despacho, Comercial y General) que llenan las 4 listas. Cada lista ofrece las 16 sin repetir. Se guarda con su propio botón, que llama a `PUT /roles/:roleId`.
- Perfiles (tabla de la spec): Caja, Despacho, Comercial y General. Un rol sin `orderActions` muestra General marcado y no se guarda nada hasta tocar «Guardar».
- El cambio llega a cada usuario en su siguiente inicio de sesión.

### D19. Carga una vez por sesión

- `OrderActionsService extends BaseService` (`shared/services/ventas/order-actions.service.ts`) hace las 5 llamadas.
- Guarda en memoria la respuesta de `GET /me` junto con el token con que la pidió, y la vuelve a pedir solo si el token cambia (nuevo inicio de sesión). Es estado de la sesión, igual que los maestros de `PedidosUtilService`, no una capa de caché sobre consultas.
- Se pide al entrar a Todos los pedidos con la bandera encendida. Abrir un pedido no consulta nada.

## Write-set

| Fase | Escribe | Nunca escribe |
|---|---|---|
| F1 | Nada nuevo. Las acciones escriben lo mismo que hoy (las prueba la tarea 7.4) | — |
| F2 | `users/{docId}.orderActions` y `roles/{id}.orderActions` | `orders`, pagos, facturas, `products`, precios, listas, `inventory`, `inventoryMovement`, `companies`, `config`, otros campos de `users` o `roles` |

Una prueba de contrato del backend con un espía de Firestore falla si alguna de las 5 rutas escribe fuera de esos dos campos.

## Gates constitucionales

| Artículo | Cumplimiento |
|---|---|
| I–II | Propuesta y specs aprobadas. Diseño y tareas esperan aprobación |
| III | Sin choques |
| IV, V, X | No aplica: sin integraciones ni webhooks |
| VI | No aplica |
| VII | Sin integraciones críticas. Los errores de F2 vuelven al front con su código y no hay `console.log` |
| VIII | F1 sin endpoints: la prueba de contrato es el plan contra lo de hoy (D2). F2: pruebas de contrato de las 5 rutas (esquema, códigos, empresa y write-set) **antes** de implementarlas |
| IX | **Excepción acotada**, como D-054, D-541 y D-543. Angular 14.3 no tiene signals ni `@if`: los componentes nuevos son OnPush, declarados en `VentasModule` y en el módulo de roles, con `*ngIf`/`*ngFor` y RxJS para HTTP. `ListOrdersComponent` sigue como está. No cambia la constitución |
| XI | El conteo guarda la acción, el usuario y el día. Sin datos del pedido ni del cliente, y nada en logs |
| XII | `orderPinnedActions`: dueño Daniel, retiro el 2027-04-30, con su tarea (13.4) |
| XIII–XV | Dos specs de menos de 3 páginas. La decisión queda en CONTRACT. Sin integraciones |

## Verificación

- **El mismo resultado antes y después (F1):**
  - en FLORECER y con DevTools bloqueando las rutas de escritura que dispara cada acción (la lista la arma la tarea 1.2), sobre 6 pedidos: venta, POS, despachado, con descuento, facturado y Desde Producción;
  - de cada una de las 28 acciones se guarda la ventana que abre (captura) y, si escribe, el payload bloqueado;
  - el después debe ser idéntico;
  - las acciones DIAN y SIIGO se comparan sobre un pedido real de ALMARA solo abriendo la ventana, sin confirmar nada, si FLORECER no tiene uno facturado.
- **Pruebas `node --test`:** catálogo, plan contra lo de hoy, `estadoAcciones`, buscador, `ochoAcciones`, `sugerencia` y `resaltada`.
- **Backend:** contrato de las 5 rutas, empresa, write-set y bandera apagada.
- **Navegador:**
  - 1366×768, a 620 y 650 px de alto (criterio de aceptación sin scroll);
  - 1440×900, 1147×607 y 390×844;
  - teclado, foco y lector de pantalla del modal.
- **Build de producción** sin errores. Los gradientes y primarios prohibidos de `components/ventas/list` y `components/rol` no suben (hoy 3/0 y 0/0).

## Risks / Trade-offs

- **[Un binding roto daña una acción]** Mitigación:
  - el plan es una tabla comparada contra la plantilla de hoy (D2);
  - el bloque de F1 no pasa por el ejecutor;
  - la tarea 7.4 compara los 28 resultados.
- **[`selectedOrder` en `null`]** Cerrar el modal deja `selectedOrder` en `null`. El plan conserva el orden de hoy, y la tarea 4.1 revisa los métodos que nunca se llamaron desde el modal.
- **[Alto en 1366×768]** ~514 px de ~620 disponibles. Si no cabe, se desplaza la grilla y no el modal (D4).
- **[Sesiones paralelas]** D-541, D-543 y D-544 tocan `list.component.*`.
  - Antes de cada tarea: `git pull`, `git status` de la carpeta y revisar sus `tasks.md`.
  - Diffs secuenciales y nunca `git add -A`.
- **[Usuarios sin documento único]** Si un correo tiene dos documentos en `users` de la misma empresa, F2 no guarda sus preferencias (409) y el bloque queda con los valores por defecto. La tarea 10.1 los cuenta en ALMARA antes de encender.
- **[Editor de usuarios con datos viejos]** Si una pantalla manda el documento completo de un usuario con `update`, podría pisar `orderActions`. La tarea 10.1 lo revisa con `grep` en el front.
- **[Eliminar]** El Swal no se puede saltar con Enter (D7) y conserva el permiso de hoy.
- **[Permisos fijos en el código]** La lista de correos, Brenda y «admin» quedan igual. Siguen como hallazgo para un ticket aparte.

## Migration Plan

1. **F1:** tareas 1 a 8, una pieza sensible a la vez con diff aprobado. Publicación del front con el candado y con autorización. **Rollback:** revertir el commit del front.
2. **F2:** tareas 9 a 13.
   1. Backend con la bandera apagada en todas partes (MANUAL-EC2, con autorización).
   2. Front.
   3. FLORECER encendida.
   4. ALMARA encendida con el OK de Daniel.

   **Rollback:** apagar `orderPinnedActions`. El bloque vuelve al de F1 y los campos `orderActions` quedan sin uso. Si hace falta, se borran con un script con `--dry-run` primero.

## Open Questions

1. **Íconos Tabler en el pedido** (D10). CONTRACT dice «Tabler solo en el menú». La respuesta recomendada para el menú decía «después, las acciones del pedido». Recomendado: Tabler, con el mismo registro de D-546. La alternativa es Font Awesome 4.7, en relleno y mezclado con el menú.
2. **Historial con D-541** (D5). Recomendado: «Historial» en la grilla, como el mockup aprobado, y «Historial del pedido» en el botón del detalle y en la ventana de D-541.
3. **Falla del conteo de uso** (D16). La spec pide avisar cuando falla «el conteo o una preferencia». Recomendado: avisar solo cuando falla una preferencia (pin, restablecer, sugerencia). El conteo falla en silencio, para no interrumpir al cajero en cada clic.
4. **Impuestos distintos del IVA** (D8). No existe hoy un dato de empresa que lo diga. Recomendado: «Ajusta el IVA del pedido» para todos, y la otra reseña cuando exista ese dato.

### Open Questions → resueltas (2026-10-23, confirmadas por Daniel: CONTRACT.md, commit `459ba31f`)

1. **Íconos Tabler en el pedido:** sí, con el registro de D-546 (`IconoTablerComponent` y `shared/icons/tabler-iconos.ts`). Recomendada y confirmada por Daniel (23-oct).
2. **Historial con D-541:** «Historial» en la grilla y «Historial del pedido» en el botón del detalle (y nombre anterior para el buscador). Recomendada y confirmada por Daniel (23-oct).
3. **Falla del conteo de uso:** el conteo falla en silencio y solo se avisa cuando falla una preferencia (la recomendada, por omisión).
4. **Impuestos distintos del IVA:** «Ajusta el IVA del pedido» para todos (la recomendada, por omisión).

### Notas de implementación de F1 (2026-10-23)

- El catálogo agrega el tipo `subaccion` (los 7 hijos de Factura electrónica y «Editar o quitar» de Descuento) para que el plan cubra las 28 acciones de hoy y el buscador encuentre los hijos; `electronicInvoice` es solo el contenedor y no se ejecuta.
- El modal no recibe `accionesPrecio` como entrada propia: llega dentro de `estados` (el padre lo pasa a `estadoAcciones`). `ListOrdersComponent.accionesPrecioPedido` es la lista que D-543 y D-544 llenan, reemplazándola (no mutándola) para que el memo de `estadosAccionesDe` lo vea.
- `pinned-filled` de D10 solo existe en el set relleno de Tabler, que el generador no lee: F2 usa `pinned`, o `pin` con la entrada `relleno` del componente.
