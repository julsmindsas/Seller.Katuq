> **Estado:** TAREAS, pendientes de aprobación de Daniel. Decisión **D-547** (propuesta aprobada el 2026-10-23). Tickets 1350 (F1) y 1349, parte 1 (F2), de ALMARA FELICIDAD. Dos fases, cada una se aprueba, se publica y se verifica por separado: **F1** (secciones 1 a 8, para todos) y **F2** (secciones 9 a 13, con la bandera `orderPinnedActions`, ALMARA primero). Sin código hasta aprobar `design.md` y este archivo.
>
> **Módulo sensible `orders`.** Un cambio a la vez, con el diff a la vista y aprobación explícita antes de aplicarlo (`openspec/config.yaml`). Una aprobación de este `tasks.md` no sustituye esa del diff.
>
> **Reglas de todas las tareas:**
> - leer los archivos antes de editarlos; nada de fixes a ciegas;
> - el build en verde al cerrar cada tarea de código (`ng build --configuration=production --output-path <scratchpad>/…` mientras no se publique, para no mover la versión; `npm run build:prod` solo al publicar);
> - backend: `node --check` de los archivos tocados y sus pruebas en verde;
> - nunca `git add -A`: otras sesiones trabajan en el mismo working copy;
> - el front local apunta a producción: se prueba con la empresa demo FLORECER y con las rutas de escritura bloqueadas en DevTools. Antes de usar una acción que escribe, confirmar en Network que sale bloqueada;
> - **toda tarea de código visible cierra revisando en el navegador a 1440×900 y a 390×844**, sin scroll horizontal, sin texto invisible y sin piezas encimadas. Las capturas van al scratchpad, nunca al repo;
> - las tareas que editan `list.component.*` son **secuenciales**: nunca se marcan `[P]`;
> - **antes de cada tarea que toque `list.component.*`:** `git pull`, `git status` de `src/app/components/ventas/list/` y relectura de los `tasks.md` de D-541, D-543 y D-544 (solo lectura; no se editan sus carpetas). Si otra sesión tiene cambios sin commitear en esos archivos, se coordina y no se pisan.
>
> `[P]` = se puede hacer en paralelo con la otra `[P]` de su bloque (archivos distintos y sin tocar `list.component.*`).

## Coordinación con las otras sesiones (D-541, D-543 y D-544)

| Decisión | Qué toca en `list.component.*` | Estado al 2026-10-23 | Cómo se coordina |
|---|---|---|---|
| D-541 historial | nombre de las dos entradas de historial y su ventana (`:2966`), tarea 7.5 | sin hacer | la tarjeta Historial llama a `verHistorialPedido`; D-541 sigue dueño de lo que esa función abre |
| D-543 corregir precio | acción en «Más opciones», tarea T-38 | sin hacer (T-37 y T-38 sin marcar) | F1 deja la entrada `accionesPrecio`; si D-543 llega antes, la tarea 4.3 mueve su botón a la fila de contexto sin cambiar sus reglas |
| D-544 cambiar tipo de precio | acción en «Más opciones», tarea L-11, que depende de T-38 | sin hacer | igual que D-543 |

Regla de llegada: quien llega **segundo** se adapta al primero; ninguno cambia las reglas, los permisos ni la consulta al servidor del otro. Esta lista se relee en 1.1, 4.3 y 8.1.

## 0. Decisiones y checkpoints

- [x] 0.1 Propuesta y specs aprobadas por Daniel (2026-10-23), con las cuatro preguntas respondidas:
  - 16 acciones fijas y la fila «Para este pedido» con catálogo cerrado;
  - las 4 del rol parten de un perfil (Caja, Despacho, Comercial o General), y un rol sin configurar usa General;
  - Katuq solo sugiere;
  - F1 para todos y sin bandera; F2 con bandera por empresa en `companies.featureFlags`, ALMARA primero.
- [ ] 0.2 Aprobación de `design.md` y de este `tasks.md`. Sin ella no se toca código.
- [x] 0.3 **D-547** registrada en `specs/CONTRACT.md` (propuesta aprobada, 2026-10-23).
- [ ] 0.4 Respuestas de Daniel a las 4 Open Questions de `design.md`, con las recomendadas por omisión:
  1. íconos Tabler en el pedido, con el registro de D-546;
  2. «Historial» en la grilla y «Historial del pedido» en el botón del detalle y en la ventana de D-541;
  3. el conteo de uso falla en silencio y solo se avisa cuando falla una preferencia;
  4. «Ajusta el IVA del pedido» para todos.

  **Hecho cuando:** las 4 respuestas están anotadas en `design.md` («Open Questions → resueltas»). La 1 bloquea 2.1; la 2 y la 4 bloquean 2.2; la 3 bloquea 11.1.

---

## F1 — Modal «Opciones del pedido» y un solo nombre por acción (ticket 1350, para todos)

### 1. Verificación previa (solo lectura, antes de editar)

- [ ] 1.1 `git pull`, `git status` de `src/app/components/ventas/list/`, `src/app/shared/` y `src/styles.scss`, y relectura de la tabla de coordinación (estado real de D-541 7.5, D-543 T-38 y D-544 L-11, y de D-546 F2 para el registro de íconos). **Hecho cuando:** la carpeta `list/` está limpia, o lo que tiene está identificado con su sesión avisada, y el estado de las cuatro decisiones queda anotado en el scratchpad con el commit que se lee.
- [ ] 1.2 Sacar de `list.component.html` (`:568-659` el bloque, `:2171-2540` el modal) y de `onRowMenuClick` (`list.component.ts:506-628`) la tabla de las **28 acciones**: título de hoy en cada lugar, método llamado, plantilla pasada, si cierra el modal y su condición. Para cada una, anotar las rutas del servidor que escribe (leyendo el método, no suponiendo). Guardar en `tests/ventas/acciones-pedido-antes.json` (solo la tabla de llamadas, sin datos de pedidos) y la lista de rutas a bloquear en el scratchpad. **Hecho cuando:**
  - el JSON tiene las 28 entradas (23 del modal, 5 de factura que hoy solo están en el bloque);
  - cada entrada trae `metodo`, `plantilla`, `cerrar` y los tres títulos de hoy;
  - la lista de rutas de escritura cubre cada acción que guarda algo;
  - dos personas leyendo el JSON contra la plantilla no encuentran una diferencia.
- [ ] 1.3 Medir el modal de hoy y el bloque con DevTools y FLORECER: 1366×768 (alto de ventana de 620 y de 650), 1440×900 y 390×844, en un pedido de venta, uno POS y uno despachado. Contar `(linear|radial)-gradient(` y primarios prohibidos en `components/ventas/list` y `components/rol`. **Hecho cuando:** la tabla de medidas y las capturas del «antes» están en el scratchpad, y los conteos confirman la base (3 gradientes y 0 primarios en `list`; 0 y 0 en `rol`).
- [ ] 1.4 Capturar el «antes» de las 28 acciones sobre 6 pedidos de FLORECER: venta, POS, despachado, con descuento, facturado (o, si FLORECER no tiene uno, un pedido real de ALMARA **solo abriendo la ventana, sin confirmar nada**) y abierto desde Producción. De cada acción: captura de la ventana que abre y, si escribe, el payload bloqueado en DevTools. *Depende de:* 1.2. **Hecho cuando:** hay una captura por acción y por pedido en que aplica, y un JSON por payload bloqueado, todo en el scratchpad y nada en el repo.

### 2. Piezas puras (sin tocar `list.component.*`)

- [ ] 2.1 `[P]` Íconos Tabler (D10). Si D-546 F2 ya publicó `IconoTablerComponent` y `shared/icons/tabler-iconos.ts`, solo agregar los 25 nombres a `tabler-usados.json` y regenerar. Si no, crear esas piezas **tal como las describe D-546 D6** (`devDependency` `@tabler/icons` con versión exacta de al menos dos semanas, script `scripts/generar-iconos-tabler.js`, componente standalone OnPush sin `innerHTML`), sin variante propia. *Depende de:* 0.4 (respuesta 1) y 1.1. **Hecho cuando:**
  - correr el script dos veces no deja diff;
  - un nombre inexistente lo hace fallar (probado);
  - los 25 nombres (16 fijas, contexto, pie y pin / `pinned-filled`) existen en `tabler-iconos.ts`;
  - el build pasa y a 1440 y 390 px nada visible cambió.
- [ ] 2.2 `[P]` Catálogo (D1): `acciones-pedido/acciones-pedido.catalogo.ts` con las 16 fijas, las de contexto y el pie, con `id`, `titulo`, `resena`, `nombresAnteriores` (recogidos en 1.2), `icono`, `columna` y `tipo`. Prueba `tests/ventas/acciones-pedido-catalogo.test.js`. *Depende de:* 0.4 (respuestas 2 y 4) y 1.2. **Hecho cuando:**
  - la prueba pasa: hay exactamente 16 fijas, 4 por columna, ids únicos, ningún ícono repetido y títulos y reseñas idénticos a la tabla de la spec;
  - cada título de hoy de las 28 acciones aparece como título o como `nombresAnteriores` de alguna;
  - el build pasa.
- [ ] 2.3 Plan (D2): `acciones-pedido.plan.ts`, la tabla `id → { metodo, plantilla, cerrar }` copiada de 1.2. Prueba de contrato `tests/ventas/acciones-pedido-plan.contract.test.js`. *Depende de:* 1.2 y 2.2. **Hecho cuando:**
  - la prueba compara el plan con `acciones-pedido-antes.json` y falla si una entrada difiere en método, plantilla o cierre;
  - la prueba lee `list.component.ts` y falla si algún `metodo` no existe en `ListOrdersComponent`;
  - se probó que falla al cambiar un `metodo` a propósito.
- [ ] 2.4 `[P]` Estado (D3): `acciones-pedido.estado.ts` con `estadoAcciones(entrada)` y las pruebas `tests/ventas/acciones-pedido-estado.test.js`. *Depende de:* 2.2. **Hecho cuando:** pasan los escenarios de la spec:
  - pedido de venta normal (las 16 visibles y habilitadas);
  - POS (Notas deshabilitada con «No aplica a pedidos POS»);
  - congelado con y sin administrador (Editar productos, Descuento e Impuestos con «Congelado · {estado}»);
  - recoge en tienda («Solo domicilios»);
  - facturado («Ya tiene factura»);
  - Cambiar asesor sin ser administrador («Solo administradores»);
  - despachado (aparece `delivery`);
  - Desde Producción, con y sin Brenda (solo las 6 fijas que aplican, ninguna deshabilitada);
  - `correctPrice` y `changePriceList` ausentes si `accionesPrecio` está vacío.
- [ ] 2.5 `[P]` Buscador (D6): función pura `filtrarAcciones(texto, acciones)` en `acciones-pedido/` y `tests/ventas/acciones-pedido-buscador.test.js`. *Depende de:* 2.2. **Hecho cuando:** pasan:
  - «imprimir» encuentra PDF del pedido;
  - sin mayúsculas ni tildes («direccion» encuentra Editar dirección);
  - busca por reseña;
  - Enter sobre una sola coincidencia habilitada devuelve esa acción; con dos o con una deshabilitada, ninguna;
  - sin coincidencias devuelve vacío.

### 3. El modal como componente (todavía sin conectarlo)

- [ ] 3.1 `OrderOptionsModalComponent` en `acciones-pedido/` (D4, D5, D9), OnPush, declarado en `VentasModule`:
  - entradas `pedido`, `estados`, `accionesPrecio`, `pines` y `resaltada` (las dos últimas sin uso en F1); salidas `(accion)` y `(cerrar)`;
  - encabezado con el buscador, grilla de 16 tarjetas en 4 columnas, fila «Para este pedido» con Factura electrónica plegable, pie con Eliminar y «Cerrar»;
  - vista Desde Producción (D9);
  - tarjeta deshabilitada con candado y motivo; `role="dialog"`, `aria-modal`, foco al buscador al abrir y de vuelta al botón que lo abrió al cerrar;
  - SCSS plano con los tokens de D-131, sin gradientes, sin clases con «p-», `:focus-visible` con el contorno de la regla de diseño y `letter-spacing: normal`.

  *Depende de:* 2.1, 2.4 y 2.5. **Hecho cuando:**
  - compila;
  - con una entrada de ejemplo (cuatro pedidos de prueba en un arnés local, sin conectar a `list`), a 1366×768 con 620 y 650 px de alto el modal se ve completo **sin scroll** y mide ≤ 520 px;
  - a 1440×900 mide 1040 px de ancho;
  - a 1147×607 y a 390×844 hay 2 columnas, sin scroll horizontal;
  - las tarjetas de una fila miden lo mismo y ningún texto lleva «…»;
  - Tab recorre buscador, tarjetas habilitadas y pie en orden de lectura con el foco visible.
- [ ] 3.2 `[P]` Pruebas del componente (`node --test` con `ts-node`, o las del bloque Angular si el arnés lo exige): una tarjeta deshabilitada no emite `(accion)`; Esc, la X, «Cerrar» y el clic fuera emiten `(cerrar)` sin `(accion)`; Enter con una sola coincidencia emite su `id`; sin pedidos de contexto no existe la fila. *Depende de:* 3.1. **Hecho cuando:** las pruebas pasan.

### 4. Conectar el modal en `list.component.*` (sensible: una pieza a la vez, con diff y aprobación)

- [ ] 4.1 Verificación previa, solo lectura: de los 28 métodos del plan, comprobar cuáles leen `this.selectedOrder` (que `closeOptionsModal()` deja en `null`), con atención a `releaseInvoice` y las 4 acciones DIAN que hoy solo se llamaban desde el bloque. *Depende de:* 2.3. **Hecho cuando:** la lista está en el scratchpad con archivo y línea, y el plan marca `cerrar: false` en toda acción que lo lea o la llama antes de cerrar. Si el plan cambia, 2.3 se vuelve a correr en verde.
- [ ] 4.2 `ejecutarAccionPedido(id, pedido)` y los `@ViewChild` nuevos (`datosEnregaModal`, `datosFacturacionModal`, `cambioEstadoPagoModal`, `recompraModal`, `pagosModal`, `descuentoModal`, `editarDescuentoModal`), más el cálculo de las entradas de `estadoAcciones` con los métodos de hoy y sin reescribirlos. Aún sin cambiar la plantilla. **Mostrar el diff y esperar aprobación.** *Depende de:* 4.1. **Hecho cuando:**
  - el diff solo agrega (no modifica métodos existentes);
  - compila;
  - la prueba de 2.3 sigue en verde;
  - `git diff --stat` solo muestra `list.component.ts`.
- [ ] 4.3 Coordinación D-543/D-544: releer la tabla de coordinación. Si D-543 T-38 o D-544 L-11 ya agregaron sus botones a «Más opciones», pasarlos a la fila de contexto con sus condiciones y su consulta exactas, alimentando `accionesPrecio`; si no, dejar `accionesPrecio` vacío. **Mostrar el diff y esperar aprobación.** *Depende de:* 4.2. **Hecho cuando:**
  - `grep` de `correctPrice` y `changePriceList` en `list.component.*` muestra una sola ruta de entrada (la fila de contexto);
  - sus reglas, permisos y consulta no cambiaron (el diff de sus archivos de servicio y diálogo está vacío);
  - si ninguno había llegado, el modal no muestra ninguna de las dos y la fila no aparece por ellas;
  - el resultado y el commit leído quedan anotados.
- [ ] 4.4 Reemplazar el overlay: en `list.component.html`, sustituir `:2171-2540` por `<app-order-options-modal>` con el mismo `*ngIf="modalVisible"`; `ejecutarAccionPedido` atiende `(accion)`; `closeOptionsModal()` y `onBackdropClick` quedan como hoy. Borrar del SCSS las reglas del modal viejo **solo** si `grep` muestra que ningún otro `custom-modal` las usa. **Mostrar el diff y esperar aprobación.** *Depende de:* 3.1, 4.2 y 4.3. **Hecho cuando:**
  - compila y el tamaño del SCSS del componente no sube (hoy el aviso es a los 220 KB);
  - abrir «Más opciones» muestra el modal nuevo a 1440 y 390 px;
  - cada una de las 16 fijas abre la misma ventana que en las capturas de 1.4 (revisión rápida; la comparación completa va en 7.4);
  - Desde Producción muestra solo las 6 fijas y su fila de contexto.

### 5. Eliminar y Descuento (un cambio cada uno, con diff y aprobación)

- [ ] 5.1 `confirmDeleteOrder` (D7): cambiar `confirm()` por un Swal con `input: 'text'`, botón de eliminar deshabilitado hasta que el texto recortado sea igual a `order.nroPedido`, y `inputValidator` que rechaza cualquier otro texto. `deleteOrder(order)` no cambia. **Mostrar el diff y esperar aprobación.** *Depende de:* 4.4. **Hecho cuando:**
  - el diff solo toca `confirmDeleteOrder`;
  - con `*/v1/orders/delete*` bloqueado en DevTools: un número distinto deja el botón deshabilitado y Enter no dispara la llamada; el número exacto sí la dispara; Esc y «Cancelar» no hacen nada;
  - el enlace solo aparece con `canDeleteOrder() && !isFromProduction`;
  - a 1440 y 390 px el Swal se ve completo.
- [ ] 5.2 Tarjeta Descuento (D8): sin descuento abre la ventana de aplicar de hoy; con descuento, un menú de dos opciones («Aplicar otro» y «Editar o quitar») que llaman a `aplicarCodigoDescuento` y `editarDescuentoPedido`. **Mostrar el diff y esperar aprobación.** *Depende de:* 4.4. **Hecho cuando:** en un pedido con descuento y otro sin descuento de FLORECER, las dos opciones abren las mismas ventanas que las capturas de 1.4 y los payloads bloqueados son iguales; a 390 px el menú cabe sin scroll horizontal.

### 6. Un solo nombre en el bloque y en el «⋯»

- [ ] 6.1 Bloque ACCIONES (D8): los mismos 8 botones y condiciones; título y reseña salen del catálogo, y el motivo del deshabilitado es el de D3. Las acciones de factura electrónica del bloque pasan a Facturar, Liberar factura, Estado DIAN, PDF DIAN, Nota crédito y Ajuste NC/ND. Siguen llamando a los mismos métodos de hoy, sin pasar por el ejecutor. **Mostrar el diff y esperar aprobación.** *Depende de:* 4.4. **Hecho cuando:**
  - el diff muestra que los `(click)` no cambiaron;
  - a 1440 px las 8 acciones usan los títulos del catálogo y a 390 px no hay scroll horizontal;
  - «PDF del pedido» se llama igual en el bloque y en el modal del mismo pedido.
- [ ] 6.2 Menú «⋯» (D8): cambiar solo los 8 `label` de `onRowMenuClick` (Imprimir PDF → PDF del pedido, Enviar de nuevo la confirmación → Reenviar confirmación, Editar Cliente → Editar cliente, Editar Notas → Notas, Consultar estado DIAN → Estado DIAN, Descargar PDF DIAN → PDF DIAN, Crear nota crédito total → Nota crédito, Crear ajuste NC / ND → Ajuste NC/ND). Íconos, orden y «Enviar a Cereza» no cambian. **Mostrar el diff y esperar aprobación.** *Depende de:* 4.4 (otro archivo de la misma clase: no se hace al mismo tiempo que 6.1). **Hecho cuando:** el diff solo cambia los `label`; en la lista, a 1440 y a 390 px, el menú muestra los nombres nuevos y cada entrada llama a lo mismo.

### 7. Verificación de F1

- [ ] 7.1 Build de producción sin errores (`ng build --configuration=production --output-path <scratchpad>/build-d547`). **Hecho cuando:** termina en verde y el diff solo tiene archivos de este cambio.
- [ ] 7.2 Conteos de 1.3 en `components/ventas/list` y `shared/icons`. **Hecho cuando:** los gradientes no suben de 3, los primarios dan 0 y las clases nuevas con «p-» dan 0.
- [ ] 7.3 Navegador, sin guardar nada:
  - 1366×768 a 620 y a 650 px de alto, **el criterio de aceptación**: pedido despachado y sin factura, y pedido facturado con DIAN, con la fila de contexto abierta;
  - 1440×900, 1147×607 y 390×844;
  - los 6 pedidos de 1.4.

  **Hecho cuando:** el modal se ve completo y sin scroll en 1366×768 (con la lista de Factura electrónica abierta, si no cabe, solo se desplaza la grilla y el encabezado, la fila de contexto y el pie quedan fijos); sin scroll horizontal ni texto invisible a ningún ancho; las medidas quedan anotadas junto a las de 1.3 y las capturas del «después» están guardadas.
- [ ] 7.4 **Comparación de las 28 acciones** sobre los 6 pedidos de 1.4, con las mismas rutas bloqueadas. *Depende de:* 4.4, 5.1, 5.2, 6.1 y 6.2. **Hecho cuando:**
  - de cada acción hay captura de la ventana y, si escribe, el payload bloqueado;
  - ventanas y payloads son idénticos a los de 1.4, con fechas y referencias normalizadas;
  - las únicas diferencias admitidas son la confirmación de eliminar y la tarjeta Descuento;
  - Desde Producción muestra solo las acciones que hoy aplican allí.
- [ ] 7.5 Teclado y lector de pantalla del modal. **Hecho cuando:** Tab llega al buscador, a cada tarjeta habilitada y al pie con el foco visible; Esc, la X y «Cerrar» cierran sin hacer nada; una tarjeta deshabilitada no se activa con Enter ni con espacio; el lector anuncia el diálogo, el título de cada tarjeta y el motivo de las deshabilitadas.
- [ ] 7.6 Pruebas `node --test` de 2.2 a 2.5, 3.2 y la de contrato de 2.3 en un solo comando, agregado como script `test:acciones-pedido` en `package.json`. **Hecho cuando:** corre completo en verde.

### 8. Cierre de F1

- [ ] 8.1 Releer la tabla de coordinación. Mostrar el diff completo y esperar aprobación; luego commit con sello, solo con los archivos de F1 (incluidos `package.json`, `package-lock.json` y el script si 2.1 los creó). **Hecho cuando:** el commit existe y `git status` no muestra archivos ajenos incluidos.
- [ ] 8.2 Publicar el front con el candado (`git pull`, compilar desde la punta y desplegar enseguida), con autorización explícita de Daniel. **Hecho cuando:** en producción, a 1440 y 390 px, un pedido de FLORECER abre el modal como en 7.3 y la versión publicada coincide con `assets/version.json`.
- [ ] 8.3 Ticket 1350: verificar en producción a 1366×768, subir la evidencia del antes y el después y pasarlo a Resuelto con un comentario en lenguaje de negocio, según el flujo de tickets. Lo hace la sesión principal. **Hecho cuando:** el ticket está Resuelto con evidencia adjunta.
- [ ] 8.4 Bitácora de D-547 en `specs/CONTRACT.md`: commit, mediciones de 7.3, resultado de 7.4 y qué quedó para F2. Lo hace la sesión principal, revisando antes el contrato en `origin`. **Hecho cuando:** la entrada existe.

---

## F2 — Acciones principales por rol y por usuario (ticket 1349, parte 1; bandera `orderPinnedActions`, ALMARA primero)

*Depende de:* F1 publicada y verificada. F2 no cambia nada con la bandera apagada.

### 9. Piezas puras del front

- [ ] 9.1 `[P]` `orderPinnedActions` en `COMPANY_FEATURE_FLAGS` (`shared/services/company-features.service.ts`), con su comentario: dueño Daniel, retiro 2027-04-30, Artículo XII. **Hecho cuando:** compila y el servicio devuelve `false` para una empresa sin la bandera.
- [ ] 9.2 `[P]` `ochoAcciones(rol, pines)` (D14) con `tests/ventas/acciones-pedido-ocho.test.js`. **Hecho cuando:** pasan:
  - las 4 del rol primero y los pines después;
  - se completa hasta 4 con el orden fijo (Notas, Cambiar estado, Editar productos, Editar dirección, Pagos, Historial y el resto de la grilla), sin repetir las del rol;
  - un pin que ya está en el rol no se duplica;
  - sin rol ni pines devuelve General más el orden fijo.
- [ ] 9.3 `[P]` `sugerencia(usageDays, ocho, dismissed, lastSuggestionAt, hoy)` (D16) con prueba. **Hecho cuando:** pasan:
  - candidata con 3 días o más y fuera de las 8;
  - nada si `lastSuggestionAt` tiene menos de 7 días;
  - una rechazada hace menos de 30 días no vuelve;
  - con varias gana la de más días y, a igualdad, el orden de la grilla;
  - el escenario del lunes de la spec.
- [ ] 9.4 `[P]` `resaltada(pedido)` (D17) con prueba. **Hecho cuando:** `estadoPago` Pendiente da Pagos con «Pago pendiente»; Pagado sin `nroFactura` ni `pdfUrlInvoice` da Facturación con «Sin factura»; Pagado y facturado da nada.

### 10. Backend (repositorio `katuq_admin_back_firebase`; leer sus instrucciones antes de editar)

- [ ] 10.1 Verificación previa, solo lectura:
  - contar en ALMARA los usuarios cuyo correo tenga más de un documento en `users` de su empresa (solo cantidades, sin imprimir datos personales);
  - `grep` en el front de las pantallas que mandan el documento completo de un usuario a `update` (editor de usuarios, perfil) y revisar `tests/theme/users-edit-contract.test.js` y `user-writers.test.js` como precedente de D-502 (el campo `tema`).

  **Hecho cuando:** el conteo y la lista de escritores están en el scratchpad; si algún escritor puede pisar `orderActions`, se anota la corrección necesaria y se hace en 11.1, no se asume.
- [ ] 10.2 **Pruebas de contrato primero** (Artículo VIII), `functions/tests/orderActions/*.contract.test.js`, para las 5 rutas de D13: esquema de entrada y salida, códigos (400, 401, 403 por bandera apagada, 403 por rol, 404, 409), empresa y usuario salidos del JWT y nunca de los headers, y bandera apagada. Deben **fallar** antes de implementar. *Depende de:* 10.1. **Hecho cuando:** existen y fallan por ausencia de las rutas, y cada caso de la tabla de D13 tiene una prueba.
- [ ] 10.3 `[P]` Bandera en `FEATURE_FLAGS` de `services/companyFeatureFlags.js`, con el mismo comentario de 9.1. **Hecho cuando:** `node --check` pasa y una prueba confirma que una empresa sin la bandera da 403 con `requireFeature('orderPinnedActions')`.
- [ ] 10.4 `[P]` `services/orderActions/catalogo.js` (las 16 ids) y una prueba en cada repositorio que compare su lista con la tabla de D1. *Depende de:* 2.2. **Hecho cuando:** las dos pruebas pasan y fallan si se cambia un id en un solo lado.
- [ ] 10.5 `services/orderActions/` (D12 y D13): lectura y escritura de `users/{docId}.orderActions` y `roles/{id}.orderActions` **siempre con `update` sobre la ruta `orderActions…`**; ubicar el usuario por correo del JWT con empresa igual a la del JWT (`empresa`, si no `company`); cero o más de un documento da 404 o 409; `orderActions.company` distinto de la empresa del JWT se trata como vacío; días en hora de Colombia; 8 días de conteo; `dismissed` = hoy + 30. *Depende de:* 10.2, 10.3 y 10.4. **Hecho cuando:** las pruebas de lógica pasan y el servicio no importa `index.js` ni inicia proveedores.
- [ ] 10.6 `routers/orderActions.js` montado en `/v1/order-actions`, con `auth` y `requireFeature('orderPinnedActions')`; `PUT /roles/:roleId` con `verifyRole(['admin','Super Administrador'])` y rechazo de un rol de otra empresa salvo Julsmind con Super Administrador. **Mostrar el diff y esperar aprobación.** *Depende de:* 10.5. **Hecho cuando:** las pruebas de 10.2 pasan en verde y `node --check` de los archivos tocados pasa.
- [ ] 10.7 **Contract test del write-set** con un espía de Firestore: falla si alguna de las 5 rutas escribe fuera de `users/{docId}.orderActions` y `roles/{id}.orderActions` (ni `orders`, pagos, facturas, `products`, precios, listas, `inventory`, `inventoryMovement`, `companies`, `config` ni otros campos de `users` o `roles`). *Depende de:* 10.6. **Hecho cuando:** pasa, y se probó que falla al agregarle a propósito una escritura ajena.
- [ ] 10.8 Regresión: `POST /v1/roles/edit` y el editor de usuarios (`controllers/users.js:298`) conservan `orderActions` al guardar, y los tests existentes de roles siguen en verde. Script `npm run` o `node --test` que corre 10.2, 10.4, 10.7 y esta. **Hecho cuando:** todo en verde en un solo comando. Mostrar el diff completo del backend y esperar aprobación; luego commit con sello y push a `backend-aws-security`.

### 11. Front de F2 (todo detrás de la bandera)

- [ ] 11.1 `OrderActionsService extends BaseService` (`shared/services/ventas/order-actions.service.ts`, D19): las 5 llamadas; guarda `GET /me` con el token con que lo pidió y lo vuelve a pedir solo si el token cambia; se pide al entrar a Todos los pedidos con la bandera encendida y abrir un pedido no consulta nada; `registrarUso(id)` como máximo una vez por acción y por día en la sesión, que falla en silencio y sin `console.log` (según la respuesta 3 de 0.4). Si 10.1 halló un escritor que pisa `orderActions`, se corrige aquí. *Depende de:* 10.6, 9.1 y 0.4 (respuesta 3). **Hecho cuando:** compila; con la bandera apagada **no se hace ninguna petición** (Network vacío al abrir Pedidos); con la bandera encendida hay una sola petición `GET /me` por sesión y ninguna por pedido.
- [ ] 11.2 `OrderPinnedActionsComponent` (D14) y su conexión en `list.component.html` con `*ngIf="bloquePersonalizado; else bloqueF1"`: 8 acciones, cada una con `estadoAcciones` y `ejecutarAccionPedido`; debajo, las acciones de factura electrónica que aplican con sus métodos de hoy y «Restablecer acciones»; «Historial» del pie se esconde si está entre las 8; menos de 992 px, 2 columnas. **Mostrar el diff y esperar aprobación.** *Depende de:* 9.2, 11.1 y las reglas de coordinación de este archivo. **Hecho cuando:**
  - bandera apagada: el bloque es idéntico al de F1 (comparación de capturas a 1440 y 390 px);
  - bandera encendida y rol sin configurar: PDF del pedido, Orden de venta, Editar cliente y Facturación primero, y después 4 personales en el orden fijo;
  - una acción que el usuario no puede usar sale deshabilitada con su motivo y no abre nada;
  - a 390 px las 8 se ven en 2 columnas, sin scroll horizontal.
- [ ] 11.3 Pines en el modal (D15): botón propio de 24×24 con `aria-label` («Fijar en acciones principales» o «Quitar de acciones principales») y `aria-pressed`; pin azul `#5F3FE0` si está entre las 8 y gris `#8F8BAB` si no; las del rol con candado y «Fijada por tu rol», sin poder soltarse; fijar con espacio libre llama a `PUT /me/pins` y el bloque cambia solo cuando el servidor confirma; con 4 fijadas, un Swal `input: 'radio'` para escoger cuál reemplazar; soltar; falla con el aviso «No pudimos guardar tus acciones. Intenta de nuevo.» y todo queda como estaba. Pines de Eliminar y de las de contexto: no existen. **Mostrar el diff y esperar aprobación.** *Depende de:* 3.1, 10.6 y 11.2. **Hecho cuando:** en FLORECER, cada escenario de la spec (fijar Pagos, espacios llenos, soltar, falla de red con la petición bloqueada en DevTools) se comporta como dice, el pin se alcanza con Tab y se activa con Enter, y a 390 px el pin se ve y se toca.
- [ ] 11.4 Sugerencia y conteo (D16): `registrarUso` desde `ejecutarAccionPedido`, el bloque y el «⋯»; el aviso dentro del detalle («Usas Pagos a diario, ¿lo fijamos?» con «Fijar» y «Ahora no») al abrir el primer pedido de la sesión que tenga candidata, sin ventana; `shown` al mostrarse y `dismissed` al rechazar. **Mostrar el diff y esperar aprobación.** *Depende de:* 9.3 y 11.3. **Hecho cuando:** con un usuario de prueba de FLORECER (uso inyectado a mano, con autorización) aparece una sola vez, «Fijar» actúa como el pin, «Ahora no» no la repite en 30 días, y nada cambia en las 8 sin aceptar; en Network no hay datos del pedido ni del cliente en ninguna llamada de uso.
- [ ] 11.5 Resaltado sin mover (D17) en el bloque y en el modal. *Depende de:* 9.4 y 11.2. **Hecho cuando:** un pedido pendiente de pago resalta Pagos con «Pago pendiente» y uno pagado sin factura resalta Facturación con «Sin factura», en el mismo lugar de siempre, con el par de alerta y sin mover ninguna acción; si la acción no está entre las 8, se resalta solo su tarjeta del modal.
- [ ] 11.6 «Restablecer acciones»: Swal de confirmación y `PUT /me/pins` con `[]`; las del rol no cambian. **Hecho cuando:** tras confirmar, los pines personales quedan grises y los 4 espacios vuelven al orden fijo; cancelar no cambia nada.
- [ ] 11.7 `AccionesRolPedidoComponent` en `components/rol/roles/` (D18): visible con la bandera encendida y un rol ya guardado; 4 chips de perfil (Caja, Despacho, Comercial, General) que llenan las 4 listas; cada lista ofrece las 16 sin repetir; botón propio que llama a `PUT /roles/:roleId`. Un rol sin `orderActions` muestra General marcado y no guarda nada hasta tocar «Guardar». **Mostrar el diff y esperar aprobación.** *Depende de:* 10.6 y 9.1. **Hecho cuando:** en FLORECER, con `PUT /roles/:roleId` bloqueado, el payload trae `profile` y 4 ids distintos y nada más; un rol sin configurar no genera ninguna petición; con la bandera apagada el componente no existe; a 1440 y 390 px se ve completo, sin scroll horizontal.

### 12. Verificación de F2

- [ ] 12.1 Build de producción sin errores y conteos de 1.3 en `components/ventas/list` y `components/rol`. **Hecho cuando:** build en verde, gradientes sin subir (3 y 0 en `list`; 0 y 0 en `rol`), primarios 0 y clases con «p-» 0.
- [ ] 12.2 Pruebas `node --test` de 9.2 a 9.4 y las del backend de 10.8, en un comando cada repositorio. **Hecho cuando:** todo en verde.
- [ ] 12.3 Navegador a 1440×900, 1366×768, 1147×607 y 390×844, con bandera apagada y encendida, sobre el pedido pendiente de pago y el pagado sin factura, con teclado. **Hecho cuando:** con la bandera apagada todo es igual a F1; con la encendida el bloque y los pines se ven completos, sin scroll horizontal, sin texto invisible y con el foco visible; capturas guardadas.
- [ ] 12.4 Repetir 7.4 con la bandera encendida: las 28 acciones desde el bloque de 8 y desde el modal. **Hecho cuando:** ventanas y payloads son idénticos a los de 1.4 (fijar o sugerir no cambia ningún permiso ni resultado).
- [ ] 12.5 Rendimiento: abrir un pedido con la bandera encendida no agrega peticiones; el tiempo al abrir no sube respecto de 1.3. **Hecho cuando:** Network muestra cero peticiones nuevas al abrir un pedido y la medida está anotada.

### 13. Despliegue, encendido y cierre (cada paso con autorización; fuera del modo auto)

- [ ] 13.1 Backend en producción con la bandera apagada en todas partes: commit y push antes, luego `git pull` y `pm2 restart katuq-api`, según MANUAL-EC2. **Hecho cuando:** arranque limpio en `pm2 logs`; `GET /v1/order-actions/me` de FLORECER responde 403 (bandera apagada); cero documentos modificados.
- [ ] 13.2 Front en producción con el candado de publicación: `git pull`, build desde la punta y despliegue enseguida. **Hecho cuando:** sin cambios visibles con la bandera apagada, a 1440 y 390 px.
- [ ] 13.3 FLORECER encendida: `scripts/set-company-feature.js` en simulación y luego con `--execute` (permiso, porque escribe en la empresa demo). Escenarios de la spec: Caja, rol sin configurar, fijar y soltar, espacios llenos, restablecer, sugerencia, resaltado, caja compartida con dos usuarios, falla de red. **Hecho cuando:** cada escenario se comporta como dice la spec y los únicos campos escritos son los dos de D12 (revisado en Firestore).
- [ ] 13.4 **Retiro de la bandera (Artículo XII):** registrar en `specs/CONTRACT.md` que `orderPinnedActions` tiene dueño Daniel y se retira a más tardar el **2027-04-30** (encendida para todos o eliminada, y retirada la rama `bloqueF1` del bloque), y dejar el seguimiento como tarea abierta. Se hace **antes** de encender ALMARA. **Hecho cuando:** la entrada existe con la fecha y el dueño, y la tarea de retiro figura en el contrato.
- [ ] 13.5 ALMARA FELICIDAD encendida, con el OK de Daniel, después de 13.3 y 13.4 y de un conteo de 10.1 sin usuarios duplicados (o con los duplicados avisados). Observación de 5 días hábiles. **Hecho cuando:** los 5 días pasaron sin errores en `pm2 logs` ni quejas, y Daniel confirma.
- [ ] 13.6 Ticket 1349 (parte 1), según el flujo de tickets: comentario en lenguaje de negocio con lo publicado y la evidencia; la parte 2 y 3 quedó reemplazada por la versión del modal del 1350. Bitácora de D-547 en `specs/CONTRACT.md`. Lo hace la sesión principal. **Hecho cuando:** el ticket tiene el comentario y la evidencia, y la bitácora está escrita.
- [ ] 13.7 `/opsx:archive` con F2 verificada en producción. Las dos capacidades (`order-options-modal`, `order-pinned-actions`) pasan a `openspec/specs/`. **Hecho cuando:** `npx openspec validate --strict` pasa sobre las specs archivadas.
