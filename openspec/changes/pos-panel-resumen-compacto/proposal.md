> **Estado:** PROPUESTA, pendiente de aprobación de Daniel. Ticket 1340 (ALMARA FELICIDAD). Decisión: D-XXX (por asignar). Redactada el 2026-10-23. Solo documentos: sin diseño, sin tareas y sin código.

## Why

En Ventas POS (`ventas/ventas-pos`, módulo `pos2`), el panel derecho tiene el cliente, el resumen de la compra y el cobro. Esas piezas fijas ocupan casi toda la altura y dejan poco espacio, o ninguno, para los productos. ALMARA FELICIDAD cobra en pantallas de 1366×768 y el cajero no ve al mismo tiempo lo que está vendiendo, el total y los botones de cobro.

Esto mide hoy cada pieza en escritorio. Son las medidas del bundle de producción, anotadas en `pos-checkout.component.scss` durante el ticket 1340:

| Pieza | Alto aprox. |
|---|---|
| Cliente asociado con la fila de Facturación (D-419), los datos de contacto y el buscador | ~320 px |
| Encabezado «Resumen de la compra» | 35 px |
| Campo de cupón, siempre abierto aunque no hace nada (`applyCoupon` solo escribe en consola) | 50 px |
| Totales: Cantidad, Descuento $0,00, Cupón $0,00, Subtotal y Total (el Subtotal es igual al Total) | 182 px |
| «Cobrar con»: 3 métodos en tarjeta | 151 px |
| **Total antes del primer producto** | **~740 px** |

Con el navegador maximizado en 1366×768, al panel le quedan unos 500 px después de la barra del navegador, el encabezado de Katuq y la barra del POS. Las piezas fijas no caben ni solas. Además:

- Cada línea mide ~110 px porque el editor de precio de D-536 (`pos-linea-precio`: base, IVA, Desc. % y desglose) siempre está abierto.
- La «Cantidad» del resumen cuenta líneas y no unidades: 3 rosas y 2 tarjetas aparecen como «2 (Items)».

## What Changes

Es solo presentación, en escritorio (1001 px de ancho o más). La lógica del carrito, del cobro, del cliente y del editor de precio no cambia.

1. **Ancho del panel:** `clamp(400px, 32%, 440px)` del área del POS. Hoy son 392 px fijos.
2. **Cliente en una línea:** avatar con la inicial, nombre, documento y «Cambiar». Al tocar la línea se despliegan:
   - la facturación, con su «Cambiar» de D-419;
   - el teléfono y el correo;
   - las acciones de hoy: métricas, editar y quitar.

   El buscador se oculta mientras hay un cliente y «Cambiar» lo vuelve a mostrar. Sin cliente, el buscador y «Nuevo» van en una sola fila. Si la facturación está incompleta, la línea plegada lo avisa.
3. **Filas de producto de ~48 px:** miniatura, nombre en máximo 2 líneas, −/cantidad/+, precio unitario, subtotal de la línea y quitar. El editor de D-536 queda plegado detrás de un botón «Editar precio». La marca «Editado» sigue a la vista.
4. **Pie fijo y compacto:**
   - el título del resumen dice cuántas **unidades** lleva el ticket;
   - Descuento y Cupón aparecen solo cuando son distintos de 0, así que hoy no se ven;
   - el TOTAL va en grande;
   - los tres botones de pago van en una sola fila.

   El campo de cupón queda detrás de «Agregar cupón» y sigue sin lógica, igual que hoy.
5. **Un solo scroll:** solo la lista de productos se desplaza y el cliente y el pie quedan fijos. Si la ventana es tan baja que la lista no alcanza a mostrar 2 líneas, se desplaza el panel completo y la lista pierde su scroll propio. Así el cobro siempre se alcanza, como pide D-430.

Presupuesto de alto en 1366×768:

| Pieza | Alto |
|---|---|
| Cliente plegado | ~52 px |
| Título con unidades | ~36 px |
| 5 líneas | ~250 px |
| Pie | ~110 px |
| **Total** | **~450 px** |

Caben en los ~500 px disponibles.

**Base visual:** se usan los tokens de `openspec/specs/design-system/spec.md` (D-131) y la regla de diseño Katuq (D-399/D-400). Eso significa:

- acento `#5F3FE0`, superficies lila y labels en MAYÚSCULA con color muted;
- radios de 16, 11 y 20 px;
- sin gradientes ni primarios paralelos.

No hay desviaciones del design-system.

## Capabilities

### New Capabilities
- `pos-compact-ticket-panel`: panel derecho del POS en escritorio con cliente plegable, filas compactas, pie fijo y un solo scroll, sin cambiar lo que se cobra ni el pedido que se crea.

### Modified Capabilities
- Ninguna archivada. D-536 (edición por línea), D-419 (facturación del POS) y D-430 (el cobro siempre se alcanza) conservan su comportamiento. Solo cambia dónde y cuándo se muestran.

## Impact

- **Front** (`src/app/components/ventas/pos2/`):
  - `pos.component.scss`: ancho del panel.
  - `widgets/pos-checkout/*`: reparto vertical y un solo scroll.
  - `widgets/customer-section/*`: estado plegado o desplegado, solo de pantalla.
  - `widgets/cart-summary/*`: fila compacta, la línea con el editor abierto y el conteo de unidades. Este último **lee** el `getPOSCantidad()` que ya existe.
  - `widgets/payment-selector/*`: botones en una fila.
  - `widgets/pos-linea-precio/*`: solo estilos del contenedor, sin tocar su lógica.
- **No se toca:**
  - `CartService`: ni el formato de `getPOSSubTotal()` (`"$123.00"`, que `pos-order-creator` parsea) ni la identificación de líneas por título;
  - `pos-order-creator`;
  - los flujos de cobro (efectivo, tarjeta, billetera y `payment-modal`);
  - la búsqueda, creación, edición y facturación del cliente;
  - el backend.
- Sin colecciones, endpoints ni banderas nuevas.

## No-goals

- La lógica real del cupón, y que «Descuento» sume los descuentos por línea de D-536. Van en un cambio aparte.
- Cambios en `CartService`, `pos-order-creator` o en la forma de identificar las líneas (por título).
- Móvil y tablet (menos de 1001 px): la hoja del ticket y la barra inferior quedan como hoy.
- Las correcciones puras del ticket 1340 se hacen aparte y esta propuesta parte de ellas:
  - íconos de Font Awesome 4.7;
  - el total tapado y la lista que quedaba en 0 px;
  - el doble scroll;
  - Opttia al encabezado;
  - «GóMez».
- El catálogo de la izquierda, la barra superior, el cierre de caja y la calculadora.
- Textos funcionales, eventos, modales y validaciones.

## Riesgos (módulo sensible: el POS crea pedidos)

- **Un binding roto en la plantilla** puede dañar el quitar, el −/+, el «Editar precio» o el cobro. Mitigación: se hace la misma venta antes y después del cambio y el pedido enviado debe ser idéntico. La venta lleva:
  - 5 productos, uno de ellos con precio editado (D-536);
  - una vez con cliente y otra sin cliente;
  - un cobro con cada uno de los 3 métodos.
- **Productos con el mismo nombre:** como el carrito identifica las líneas por título, se suman y se quitan juntos. Ese comportamiento ya existe y no se corrige aquí. El estado «línea con el editor abierto» no debe empeorarlo.
- **Móvil:** los componentes se comparten con la hoja de móvil. Los estilos nuevos van limitados a 1001 px o más, y se verifica en 390 px que todo quede igual.
- **Trampas de CSS global** (AGENTS.md):
  - ninguna clase nueva contiene «p-»;
  - todo `span` con `*ngIf` lleva su propio color y tamaño;
  - el foco se devuelve con `:focus-visible`;
  - se neutraliza el `letter-spacing` heredado.
- **Sesiones paralelas:** las correcciones del 1340 están sin commitear en estos mismos archivos (`pos.component.*`, `cart-summary`, `customer-section` y `pos-checkout`). Esta propuesta se implementa cuando esas correcciones estén publicadas, para no pisarlas.
- **Uso táctil:** en filas de 48 px, los botones −, + y quitar miden al menos 32×32 px.

## Preguntas para Daniel

1. ¿Sale para todos los comercios con POS o primero solo para ALMARA, con una bandera por empresa (D-505)?
2. ¿Qué hace «Cambiar» en el cliente?
   - **Propuesto:** muestra el buscador sin quitar el cliente actual hasta que se escoja otro. Si el cajero cancela, el cliente queda.
   - **Alternativa:** quita el cliente de una vez.
3. ¿Qué pasa con el campo de cupón mientras no funcione?
   - **Propuesto:** queda plegado detrás de «Agregar cupón».
   - **Alternativa:** se oculta del todo.
4. ¿Solo una línea puede tener «Editar precio» abierto a la vez? Es lo propuesto: al abrir otra, se cierra la anterior.
