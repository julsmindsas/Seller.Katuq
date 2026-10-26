## Context

- **Pantalla:** Ventas POS (`ventas/ventas-pos`, `components/ventas/pos2/`). El panel derecho es `<aside class="pos-ticket">` de `pos.component.html`. Adentro está `<app-pos-checkout>`, que apila `app-customer-section`, `app-cart-summary` y `app-payment-selector`. La hoja de móvil usa **los mismos componentes**.
- **Punto de partida (publicado hoy, 2026.10.23.1, commit `8510a712`):**
  - `pos-checkout.component.scss` ya no tiene el piso de 660 px y deja `app-cart-summary { flex: 1 1 0; min-height: 360px }`.
  - Los íconos son de Font Awesome 4.7 y el −/+ responde en todo el botón.
  - `PosComponent` pone la clase `katuq-pos-escritorio` en el `body`. Desde 1001 px, `styles.scss` quita el pie y el `min-height` de `.page-body`, y deja `.pos-shell { height: calc(100vh - 116px) }`.
  - Opttia está en el encabezado y ya no hay botón flotante sobre el panel.
- **No se toca:**
  - `CartService`. `getPOSSubTotal()` sigue devolviendo `"$123.00"`, que leen `pos-order-creator`, `pos-checkout.service`, `pos-validation` y `warehouse-selector`.
  - `pos-order-creator`, `pos-checkout.service`, los modales de cobro y el TS y el HTML de `pos-linea-precio`.
  - El backend.
- **Lo que dice el código y manda en el diseño:**
  - Las líneas se identifican por `crearProducto.titulo`. `posAddToCart` y `updatePOSQuantity` cambian `cantidad` sobre el mismo objeto, y `posRemoveCartItem` filtra el arreglo. Mientras una línea exista, su objeto no cambia.
  - `getPOSSubTotal()` suma `precioUnitarioPos(item) × cantidad` (`shared/utils/pos-linea-precio.ts`). `getPOSCantidad()` ya suma unidades y devuelve un string («5»).
  - El editor de D-536 no tiene estado propio: todo vive en el ítem (`_precioManualOverride`, `_ivaManualOverride`, `descuentoLinea`, `_precioManualTemp`). `lineaPedidoPos` y `sinClavesDeEdicion` sacan `_precioManualTemp` del pedido.
  - `PosCheckoutService.setCustomer()` reinicia la facturación (D-419) al perfil del cliente nuevo, y `clearCustomer()` la deja en «No requiere factura». Por eso «Cambiar» no puede llamar a ninguno de los dos hasta que se escoja otro cliente.
  - El cobro exige cliente: `pos-validation` muestra «Debes buscar o crear un cliente».
  - **Hallazgo de la medición:** `.pos-shell` tiene `min-height: 560px`. En 1366×768 la ventana útil mide de 620 a 650 px, así que `100vh − 116` da de 504 a 534 px. Gana el piso de 560 y la página vuelve a tener un scroll de 26 a 56 px. De ahí salen los «~500 px» de panel que estimó la propuesta. La tarea 1.2 lo confirma en el navegador.

## Goals / Non-Goals

**Goals:**
- En 1366×768 se ven a la vez el cliente plegado, 5 líneas, el TOTAL y los 3 botones de pago, sin scroll de página ni del panel.
- Desde 1001 px, una sola zona se desplaza: la lista.
- Móvil (menos de 1001 px) idéntico a hoy.
- La misma venta produce el mismo pedido y el mismo cobro.

**Non-Goals:** los de la propuesta: la lógica del cupón, que el descuento sume D-536, `CartService` y `pos-order-creator`, móvil, el catálogo, la barra superior, el cierre de caja y los textos funcionales.

## Decisiones de Daniel (2026-10-23)

1. **Para todos los comercios con POS, sin bandera.** No hay nada en `companies.featureFlags` (D-505). El rollback es revertir el commit del front.
2. **«Cambiar» no quita al cliente.** Muestra el buscador con el foco puesto. El cliente y su facturación siguen asociados hasta que se escoja otro. Esc o clic fuera devuelven la línea plegada (D3).
3. **El cupón queda plegado** detrás de «Agregar cupón», con el mismo campo y el mismo `applyCoupon()` de hoy (D5).
4. **Solo una línea con «Editar precio» abierto.** Al abrir otra, la anterior se cierra, y cerrar no deshace nada (D4).

## Decisions

### D1. El mismo HTML en escritorio y en móvil: lo nuevo se enciende con CSS desde 1001 px

- Los elementos nuevos nacen con `display: none` y solo se muestran dentro de `@media (min-width: 1001px)`: la línea plegada del cliente, «Nuevo» en la fila del buscador, «Editar precio», la marca «Editado» de la fila compacta, el subtotal de línea, «c/u», las unidades del título y «Agregar cupón».
- En escritorio se esconden o se reacomodan algunas piezas: el encabezado «Cliente», la tarjeta del cliente, el buscador, el editor, el cupón y las filas en $0. Eso se maneja con clases de estado (`[class.x]="…"`) cuyas reglas existen solo en ese media query. En móvil las clases no hacen nada.
- Ningún elemento existente se mueve en el DOM ni cambia sus bindings. Los estados nuevos son de pantalla y viven en cada componente, sin pasar por ningún servicio:
  - en el cliente: `desplegado` y `cambiando`;
  - en el carrito: `lineaAbierta` y `cuponAbierto`.
- **Descartado:** dos plantillas con `*ngIf` según el ancho. Duplicaría los bindings de −/+, quitar y cobro, que son el riesgo principal, y montaría dos `p-autoComplete` sobre el mismo `ngModel`.

### D2. Panel y marco (`pos.component.scss`)

- `.pos-ticket { width: clamp(400px, 32%, 440px) }` en vez de 392 px. El 32 % se calcula sobre `.pos-body`, que es el área del POS. Móvil sigue con `width: 100%` dentro de `max-width: 1000px`.
  - En 1366 px el área mide unos 1080 px con el menú lateral abierto, así que el panel queda en 400 px.
  - En 1920 px queda en 440 px.
- En escritorio, `.pos-shell { min-height: 0 }` (hoy 560 px, ver el hallazgo de Context). Cada columna ya maneja su propio desbordamiento. Si la tarea 1.2 muestra que hoy no hay scroll de página en 1366×768, este punto se omite.
- `.pos-ticket` en escritorio lleva la misma barra de scroll fina de 8 px que la lista. Solo se ve en el modo «panel completo» de D6.
- `pos.component.html` y `pos.component.ts` no cambian.

### D3. Cliente plegable (`customer-section`)

**Plantilla.** Dentro de `.search-section`, en este orden:

```html
<div class="cli-linea" *ngIf="datosCliente" [class.cli-oculto]="cambiando">
  <button type="button" class="cli-resumen" (click)="desplegado = !desplegado" [attr.aria-expanded]="desplegado">
    <span class="cli-avatar">{{ inicialCliente }}</span>
    <span class="cli-datos">
      <span class="cli-nombre">{{ datosCliente?.nombres_completos }} {{ datosCliente?.apellidos_completos }}</span>
      <span class="cli-doc">{{ datosCliente?.documento }}</span>
      <span class="cli-aviso" *ngIf="facturacionIncompleta">{{ 'Facturación incompleta' | translate }}</span>
    </span>
    <i class="fa fa-angle-down cli-flecha"></i>
  </button>
  <button type="button" class="cli-cambiar" (click)="cambiarCliente()" aria-label="Cambiar cliente">{{ 'Cambiar' | translate }}</button>
</div>
<div class="autocomplete-box" [class.cli-oculto]="datosCliente && !cambiando"> <!-- igual que hoy --> </div>
<button type="button" class="cli-nuevo" [class.cli-oculto]="datosCliente && !cambiando" (click)="openModal()">{{ 'Nuevo' | translate }}</button>
<div class="cliente-card" *ngIf="datosCliente" [class.cli-abierto]="desplegado && !cambiando"> <!-- igual que hoy --> </div>
```

- El `p-autoComplete` conserva todos sus inputs y outputs. Solo se le agrega `(keydown.escape)="cancelarCambio()"`.
- La tarjeta `.cliente-card` es la de hoy, con métricas, editar, quitar, facturación con su «Cambiar» de D-419 y contacto. En escritorio solo se ve desplegada.

**TS.** Solo estado de pantalla:

- `desplegado = false` y `cambiando = false`.
- `inicialCliente`: la primera letra de `nombres_completos` (o, si falta, de `apellidos_completos`) en mayúscula; «?» si no hay ninguna.
- `@ViewChild(AutoComplete) buscador`.
- `cambiarCliente()`:
  1. `cambiando = true`, `desplegado = false`;
  2. `selectedCliente = null` y `clienteSuggestions = []`, que solo vacían la caja de búsqueda y no tocan `customer$`;
  3. `cdr.detectChanges()`;
  4. `buscador.inputEL.nativeElement.focus()`.

  No usa `setTimeout`: `detectChanges` es síncrono.
- `cancelarCambio()`: `cambiando = false`. No toca el cliente ni la facturación.
- Clic fuera: `@HostListener('document:click', ['$event'])`. Si `cambiando` está activo y `event.composedPath()` no incluye el host, se cancela. Se usa `composedPath()` y no `contains()` porque, para cuando el evento llega al documento, Angular ya puede haber escondido el botón «Cambiar» que se tocó. La lista de sugerencias de PrimeNG vive dentro del componente, así que tocar una sugerencia no cuenta como clic fuera.
- `(focusout)` en el host: si el foco sale del componente por teclado, también se cancela.
- En la suscripción a `customer$` que ya existe:
  - siempre `cambiando = false`;
  - `desplegado = false` cuando el cliente es `null` o cambia de `cd`. Editar al mismo cliente no lo pliega.

  Así, escoger otro cliente, crearlo con «Nuevo» o quitarlo cierran el modo «Cambiar» sin tocar `onClienteSelect`, `openModal`, `editarCliente` ni `limpiar`.

**SCSS (≥1001 px).**

| Pieza | Regla |
|---|---|
| Encabezado «Cliente» y «Nuevo» de hoy | `.tarjeta-cabeza { display: none }` |
| `.search-section` | `display: grid`, `grid-template-columns: minmax(0, 1fr) auto`, `gap: 8px`. La línea plegada y la tarjeta ocupan las dos columnas |
| Línea plegada | `padding: 7px 12px`. Avatar circular de 32 px, fondo `#efe9ff` y letra `#5F3FE0` de 14 px/800. Nombre de 13 px/800 en tinta, en una línea con «…». Documento de 11,5 px muted. Hover `#faf9ff`. Alto: **47 px** con el borde |
| Aviso de facturación incompleta | Par de alerta `#D9820A` sobre `#FFF1DF`, 10,5 px/800, radio 20 px |
| «Cambiar» y «Nuevo» | Secundarios: blancos, borde `#e4e2ef`, texto `#5F3FE0`, radio 11 px y 30 px de alto («Nuevo» mide 38 px, como el buscador) |
| Buscador | 38 px de alto en vez de 52 (los `!important` de hoy se igualan en el mismo bloque). Fila: **54 px** |
| Tarjeta sin `.cli-abierto` | `display: none` |
| Tarjeta desplegada | Se ocultan `.cliente-status` y `.cliente-main`, porque el nombre ya está en la línea. Quedan las acciones, la facturación y el contacto: unos **105 px** más |
| `.cli-oculto` | `display: none !important` |
| `.cli-flecha` | Rota 180° con `aria-expanded="true"` |

### D4. Filas compactas y editor plegado (`cart-summary`)

**Plantilla.** Se agregan elementos y no se mueve ninguno:

```html
<div *ngFor="let item of cartService.posCartItems; track item" class="ticket-linea" [class.fila-abierta]="lineaAbierta === item">
  <div class="order-details-wrapper">
    <div class="left-details"> <!-- miniatura, igual --> </div>
    <div class="category-details">
      <div class="order-details-right">
        <h6 class="f-14 f-w-500 mb-2" [title]="item.crearProducto?.titulo || ''"> <!-- nombre, igual --> </h6>
        <div class="fila-meta">                                                  <!-- nuevo -->
          <button type="button" class="fila-editar" (click)="alternarEditor(item, $event)"
                  [attr.aria-expanded]="lineaAbierta === item">{{ 'Editar precio' | translate }}</button>
          <span class="fila-marca" *ngIf="lineaEditada(item)">Editado</span>
        </div>
        <div class="last-order-detail">
          <span class="fila-subtotal">${{ subtotalLinea(item) | number:'1.2-2' }}</span>   <!-- nuevo -->
          <h6 class="txt-primary">${{ precioUnitario(item) | number:'1.2-2' }} <span class="fila-cu">c/u</span>
            <span *ngIf="lineaEditada(item)" class="marca-editado">Editado</span></h6>
          <a href="javascript:void(0)" (click)="cartService.posRemoveCartItem(item)" …> <!-- igual --> </a>
        </div>
      </div>
      <div class="right-details mb-2"> <!-- −/cantidad/+, igual --> </div>
    </div>
  </div>
  <app-pos-linea-precio [item]="item"></app-pos-linea-precio>                      <!-- igual -->
</div>
```

**Bindings que deben quedar idénticos** (la tarea 4.1 los compara en el diff):

- el `*ngFor`, con su `track item`, que hoy compila;
- `[src]` y `[alt]` de la miniatura y el nombre;
- `precioUnitario(item)` y `lineaEditada(item)`;
- `cartService.posRemoveCartItem(item)`;
- `cartService.updatePOSQuantity(-1, item)`, `{{item.cantidad}}` y `cartService.updatePOSQuantity(1, item)`;
- `<app-pos-linea-precio [item]="item">`.

**TS.**

```ts
lineaAbierta: any = null;   // el objeto de la línea; el carrito lo conserva mientras exista
alternarEditor(item: any, ev: Event): void {
  this.lineaAbierta = this.lineaAbierta === item ? null : item;          // decisión 4
  if (!this.lineaAbierta) return;
  this.cdr.detectChanges();
  (ev.currentTarget as HTMLElement).closest('.ticket-linea')?.scrollIntoView({ block: 'nearest' });
}
subtotalLinea(item: any): number { return precioUnitarioPos(item) * (item?.cantidad || 0); }
```

- **Por qué se identifica la línea por el objeto y no por el título:** dos líneas no deberían compartir título, porque `posAddToCart` las suma. Si con datos raros pasara, se abriría solo una. Al quitar una línea, la referencia queda apuntando a nada. Si el producto se vuelve a agregar, `posAddToCart` crea otro objeto (`{ ...item }`) y la línea nueva empieza cerrada. Así no empeora el caso de productos con el mismo nombre.
- **El subtotal de línea sale del mismo `precioUnitarioPos` que suma `getPOSSubTotal()`.** La suma de las filas da el TOTAL.
- **El editor se esconde con CSS, no con `*ngIf`.** El componente no se destruye y sus bindings son los mismos. Tocar «Editar precio» (el de esa línea o el de otra) mueve el foco antes del clic. Por eso el `blur` del precio base (`onPrecioConfirm`) corre antes de que el editor se esconda. Si no corriera, `_precioManualOverride` ya tiene el último valor válido (`onPrecioInput`) y `_precioManualTemp` no viaja en el pedido.

**SCSS (≥1001 px).**

- `.category-details`, `.order-details-right`, `.last-order-detail` y `.right-details` pasan a `display: contents`. Así sus hijos quedan como celdas de una grilla en `.order-details-wrapper`:

  ```scss
  grid-template-columns: 32px minmax(0, 1fr) auto auto 32px;
  grid-template-areas: "img nombre stepper subtotal quitar"
                       "img meta   stepper unitario quitar";
  column-gap: 6px; row-gap: 2px; align-items: center; min-height: 48px; padding: 3px 0;
  ```

- Medidas de cada pieza:

  | Pieza | Medida |
  |---|---|
  | Miniatura | 32×32 px, radio 11 px |
  | Nombre | 12,5 px con interlineado de 14 px, máximo 2 líneas, cortado con «…» |
  | Línea de «Editar precio» | 14 px de alto. «Editar precio» va en 11 px/700 acento. La zona de toque se agranda con un margen negativo, sin hacer crecer la fila |
  | Marca «Editado» (escritorio) | 9,5 px en MAYÚSCULA, acento sobre `#efe9ff`, radio 20 px |
  | −/+ | 32×32 px. El contenedor lleva fondo `#f5f4fa`, borde `#e9e7f3` y radio 11 px. La cantidad mide 22 px de ancho |
  | Subtotal | 13 px/800 en tinta, alineado a la derecha |
  | Precio unitario y «c/u» | 10,5 px/700 muted |
  | Quitar | El `<a>` mide 32×32 px. Ícono muted y hover con el par de error (`#D64545` sobre `#FDECEC`) |
  | Separador entre filas | `1px solid #f1f0f7` |

- Alto de cada fila: **48 px** si el nombre cabe en una línea. Con nombre de dos líneas: 3 + 28 + 2 + 14 + 3 + 1 de borde = **51 px**.
- En escritorio se esconde la marca vieja `.marca-editado`, porque la nueva va en la línea de «Editar precio». En móvil pasa al revés.
- `app-pos-linea-precio` va oculto. `.fila-abierta app-pos-linea-precio` se muestra con `margin: 0 0 8px 38px`, `padding: 8px 10px`, fondo `#faf9fe`, borde `#ececf4` y radio 11 px, y mide unos 86 px. La regla del padre le gana al `:host` del hijo por especificidad, así que `pos-linea-precio` no cambia.
- `.fila-abierta .fila-editar` se marca con fondo `#efe9ff`.
- La lista lleva `padding: 0 12px` y `scrollbar-gutter: stable`. La barra de 8 px no hace saltar las filas cuando aparece.

### D5. Pie fijo compacto (`cart-summary` y `payment-selector`)

**Título del resumen.** Junto al h5 «Resumen de la compra» va `<span class="tkt-unidades">{{ textoUnidades }}</span>`. Sale de `Number(cartService.getPOSCantidad()) || 0`, que solo se lee: «1 unidad» o «N unidades». Chip acento sobre `#efe9ff`, radio 20 px. Alto de la fila: **30 px**.

**Totales.**

- La fila «Cantidad» lleva la clase `fila-cantidad`, que se oculta en escritorio porque las unidades ya están en el título.
- Getters sin lógica nueva: `descuentoTicket = 0`, `cuponTicket = 0` y `subtotalTicket = totalNumerico`.
  - Los textos de Descuento y Cupón pasan del literal `$0.00` a `${{ descuentoTicket | number:'1.2-2' }}` y `${{ cuponTicket | number:'1.2-2' }}`, que muestran lo mismo.
  - El Subtotal se enlaza a `subtotalTicket`.
  - Cada fila lleva `[class.fila-cero]` cuando vale 0, o cuando el Subtotal es igual al TOTAL, y en escritorio se oculta.
  - Cuando el cambio del cupón llene esos getters, las filas aparecen solas.
- **TOTAL, plano y sin banda:** `.total-item` con `padding: 8px 12px 4px` y borde superior. Es una grilla de dos columnas:
  - a la izquierda, «Total» en 11 px MAYÚSCULA muted y debajo «Agregar cupón» en 11,5 px acento;
  - a la derecha, el monto en 24 px/800 de `--kc-font-head` con `#5F3FE0`, el número más grande del pie.

  Alto: **43 px**.

**Cupón.**

- La tarjeta lleva `[class.cupon-abierto]="cuponAbierto"`. En escritorio, `.coupon-code` se oculta salvo con esa clase. Abierto aparece donde está hoy, entre la lista y el TOTAL, y mide 44 px.
- `alternarCupon()` cambia `cuponAbierto`. Al abrir llama a `cdr.detectChanges()` y enfoca `#cuponInput`, una referencia que se agrega al input de hoy.
- El campo, el `[(ngModel)]="couponCode"` y `applyCoupon()` no cambian.

**Pagos (solo SCSS, más un atributo).**

- El `.icons` de hoy lleva `role="group" aria-label="Cobrar con"`.
- En escritorio:
  - el h5 «Cobrar con» queda visualmente oculto (clip de 1 px), pero sigue en el DOM para lectores de pantalla;
  - `.icons` pasa a `grid-template-columns: repeat(3, minmax(0, 1fr))` con `gap: 6px`;
  - cada botón mide 42 px de alto, con el ícono de 20 px a la izquierda y la etiqueta de 11,5 px en hasta 2 líneas («Métodos Electrónicos» se parte en dos);
  - radio 11 px y el mismo estado `.selected`.
- Alto: 4 + 42 + 10 = **56 px**.
- Textos, handlers y `selectedMethod` no cambian.
- «Cobrar con» es el único texto que deja de verse en escritorio. Mostrarlo cuesta 16 px y solo cabe con ventana de 630 px o más (ver Open Questions).

### D6. Un solo scroll (`pos-checkout`)

**Modo normal (≥1001 px).**

- El cliente, el título, el TOTAL y los pagos no se encogen. `app-cart-summary` pasa a `flex: 1 1 0; min-height: 0`; el piso de 360 px queda solo para móvil.
- Dentro del carrito, solo `.cart-items-container` tiene `overflow-y: auto`. Es la única zona que se desplaza y el panel no tiene scroll.

**Modo «panel completo».** Con la clase `ticket-apretado` en el host de `pos-checkout`:

- `:host(.ticket-apretado)` y su contenedor pasan a `height: auto`, y `app-cart-summary` a `flex: none`.
- En el carrito, `:host-context(.ticket-apretado)` deja la lista en `flex: none; overflow: visible`.
- Se desplaza `.pos-ticket`, que ya tiene `overflow-y: auto`, y la lista no tiene scroll propio.

**Cuándo se activa (TS, `pos-checkout`).**

- Un `ResizeObserver` en `ngAfterViewInit` vigila:
  - el panel (`host.parentElement`, que es `.pos-ticket`);
  - los hosts de `app-customer-section` y `app-payment-selector`, con `@ViewChild(..., { read: ElementRef })`;
  - el `.tarjeta-cabeza`, el `.coupon-code` y el `.total-item` del carrito.
- `fijo` es la suma de esos `offsetHeight` (el cupón cerrado mide 0). El espacio disponible es `disponible = panel.clientHeight − fijo`.
- El modo se activa cuando `disponible < 104` (2 filas de 52 px) y se desactiva cuando `disponible ≥ 128`. Esa diferencia evita que el modo parpadee si aparece la barra del panel.
- Solo actúa si `matchMedia('(min-width: 1001px)')` se cumple. Pone y quita la clase con `Renderer2`, sin pasar por la detección de cambios.
- `disconnect()` en `ngOnDestroy`. Si el navegador no tiene `ResizeObserver`, queda el modo normal.
- **No hay bucle:** ninguno de los elementos vigilados cambia de alto al cambiar de modo. La lista y el host del carrito, que sí cambian, no se vigilan.
- **Descartados:**
  - un media query de alto, porque no sabe si el cliente está desplegado o el cupón abierto;
  - `position: sticky`, porque necesita conocer el alto variable del cliente y partir el pie entre dos componentes.

**Escenario «Ventana muy baja» (1366×520).**

- Con el cliente plegado, el panel mide 341 px y la lista todavía muestra unas 3 líneas. Es la única que se desplaza.
- El modo «panel completo» se activa a esa altura si el cliente está desplegado o el cupón abierto. Con el cliente plegado, se activa con ventanas de menos de ~460 px.
- En los dos casos hay una sola barra y los pagos se alcanzan. La tarea 6.5 verifica las dos formas.

### D7. Regla de diseño Katuq y trampas de CSS global

- **Colores y formas:**
  - tokens `--kc-*` del módulo (`--kc-accent` = `#5F3FE0` y `--kc-accent-wash` = `#efe9ff`, iguales al canon D-131);
  - muted `#8f8bab` y pares semánticos del design-system;
  - radios de 11, 16 y 20 px;
  - sin gradientes ni primarios prohibidos.
- **Nombres de clase:** las clases nuevas usan los prefijos `cli-`, `fila-`, `tkt-` y `cupon-`, más `ticket-apretado`. Ninguna contiene «p-».
- **`span` con `*ngIf`** (`.cli-aviso` y `.fila-marca`): llevan color y tamaño con `!important`, como `.marca-editado`.
- **Foco:** todos los botones nuevos llevan `:focus-visible { outline: 3px solid #7C5CFF !important }`.
- **`letter-spacing`:** el `<a>` de quitar y los labels lo dejan en `normal`.

## Presupuesto de alturas en 1366×768

Ventana útil (`innerHeight`) con el navegador maximizado y zoom al 100 %: **H = 620 a 650 px**. Lo que va encima del panel:

- 116 px del encabezado y los márgenes de Katuq (`calc(100vh − 116px)`);
- 61 px de la barra del POS (11 + 38 + 11 + 1 de borde);
- 2 px de bordes del marco.

**Panel = H − 179 = 441 a 471 px.** Con D2 ya no lo tapa el piso de 560.

Cliente asociado, 5 productos y cupón cerrado:

| Pieza | Alto |
|---|---|
| Cliente plegado | 47 px |
| Título con unidades | 30 px |
| 5 líneas (48 px con nombre de 1 línea, 51 px con nombre de 2) | 240 a 255 px |
| TOTAL | 43 px |
| Pagos en una fila | 56 px |
| **Total** | **416 a 431 px** |

Queda un margen de 10 px en el peor caso (H = 620 y los 5 nombres en dos líneas) y de 55 px en el mejor. Hoy hacen falta ~738 px antes del primer producto.

Si la ventana mide 605 px (Windows 11 con barra de favoritos) y los cinco nombres ocupan dos líneas, la quinta fila queda a medias y la lista se desplaza sola. No se monta nada encima.

**Otros estados.** Restan a la lista y no tocan el pie:

| Estado | Cambio |
|---|---|
| Sin cliente: buscador y «Nuevo» | +7 px |
| «Cambiar» abierto | +7 px |
| Cliente desplegado | +105 px (la lista queda con ~3 líneas) |
| Cupón abierto | +44 px |
| Editor de una línea abierto | +86 px dentro de la lista, que se desplaza hasta mostrarlo |
| Carrito vacío | La lista muestra el estado vacío de hoy, de unos 164 px |

## Verificación

- **El mismo pedido antes y después.**
  - Las capturas se hacen en el mismo working copy: «antes» se toma antes de editar (tarea 1.3) y «después» al terminar (tarea 6.8).
  - El front local apunta a producción. Se trabaja con la empresa demo FLORECER y con el bloqueo de solicitudes de DevTools sobre `*/v1/orders/create`: nada llega al servidor, no se gasta consecutivo ni se mueve inventario.
  - El payload del `create` se copia desde Network a un JSON del scratchpad. El diff se hace quitando los campos de fecha y referencia: `referencia`, `nroPedido`, `fechaCreacion`, `fechaEntrega`, `PagosAsentados[].fechaHoraAprobacionRechazo`, `PagosAsentados[].numeroPedido` y `carrito[].configuracion.datosEntrega.fechaEntrega`.
  - El resto debe ser igual: el carrito con las claves D-536 por línea, `subtotal`, `totalPedido*`, `valorRegistrado`, el cliente, los campos de facturación, `formaDePago` y `bodegaId`.
  - También se compara el monto que muestra el modal de efectivo.
  - No se crean ni se editan clientes: el modal de «Nuevo» y el de editar se abren y se cierran sin guardar.
- **En el navegador:**
  - 1366×768, a 620 y a 650 px de alto, que es el criterio de aceptación;
  - 1440×900, 1920×1080 y 1147×607 (la medida de D-430);
  - 390×844, con capturas antes y después que deben ser iguales.

  Sin scroll horizontal, sin texto invisible y sin piezas encimadas.
- **Teclado:** el foco se ve en todos los botones nuevos; Esc cancela «Cambiar»; Tab recorre la fila en orden.
- **Build de producción** sin errores. El conteo de gradientes y primarios prohibidos en `pos2` hoy es **0 y 0**, y no debe subir.

## Risks / Trade-offs

- **[Un binding roto deja de quitar, sumar o cobrar]** Mitigación: ningún elemento existente se mueve (D1), la tarea 4.1 compara el diff de bindings y la 6.8 compara los pedidos.
- **[`display: contents`]** En escritorio, los contenedores viejos de la fila pierden su caja, y eso es lo que se busca. Son `div`, no botones ni tablas, así que la accesibilidad no se afecta. Chrome, Edge, Firefox y Safari lo soportan.
- **[«Editar precio» es un blanco pequeño]** Mide ~18 px de alto, contra los 32×32 de −, + y quitar que exige la spec. Si en una pantalla táctil molesta, la fila puede crecer a 56 px. Cinco filas de 56 px solo caben con ventana de 635 px o más.
- **[Nombres largos]** Con el panel de 400 px, el nombre tiene unos 116 px de ancho: ~18 caracteres por línea y ~36 en dos. Pasando el puntero se ve completo. Un subtotal millonario con decimales (`$1,250,000.00`) le quita espacio al nombre. La tarea 6.3 lo revisa con $9,999,999.99.
- **[Clic fuera mal detectado]** Con `contains()`, «Cambiar» se cancelaría solo, porque Angular esconde el botón antes de que el clic llegue al documento. Con `composedPath()` no pasa. Tocar una sugerencia ejecuta `onClienteSelect` antes, y la cancelación ya no hace nada.
- **[Dos «Cambiar» con la tarjeta desplegada]** Uno es del cliente y otro de la facturación de D-419. El del cliente lleva `aria-label="Cambiar cliente"`.
- **[La lista de sugerencias dentro del panel]** Sigue posicionada dentro de `.pos-ticket`, igual que hoy. Desde la línea del cliente, sus 320 px caben en los 441 px del panel.
- **[Que un estilo nuevo se filtre a móvil]** Todo lo nuevo vive en `@media (min-width: 1001px)` o nace con `display: none`. La tarea 6.7 compara capturas a 390 px.
- **[Sesiones paralelas]** Otras sesiones trabajan en el mismo working copy. Antes de empezar: `git pull` y `git status` de `pos2`. Nunca `git add -A`.
- **[El catálogo pierde 8 px]** A 1366 px el panel pasa de 392 a 400 px. La tarea 6.3 revisa que la grilla de productos no tenga scroll horizontal.

## Migration Plan

1. Implementar en el orden de `tasks.md`: D2 → D6 → D3 → D4 → D5, con el build en verde después de cada componente.
2. Build de producción, verificación completa y publicación del front con el candado (`git pull`, compilar desde la punta y desplegar enseguida), solo con autorización.
3. **Rollback:** revertir el commit del front y volver a publicar. No hay datos, backend ni banderas que deshacer.

## Open Questions

- **«Cobrar con» oculto en escritorio** (D5). Se deja leíble para lectores de pantalla. Si Daniel lo quiere a la vista, son 16 px más y solo cabe con ventana de 630 px o más.
- **Redacción del escenario «Ventana muy baja»** (spec). Con las medidas reales, a 1366×520 y con el cliente plegado, la lista sigue siendo la única que se desplaza (D6). El requisito se cumple igual: una sola barra y los pagos siempre al alcance. Se puede ajustar la redacción al archivar.
- **La «Cantidad» de móvil** sigue contando líneas y no unidades, porque móvil no se toca. Si se quiere corregir, va en un cambio aparte.
