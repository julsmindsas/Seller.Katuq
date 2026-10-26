## Clientes de Shopify (fase 1b)

Complemento de `design.md` (decisión 8). Va después de la fase 1a. Depende de las preguntas 3, 4 y 19 a 21 y de la revisión legal (tarea 0.7). Toca datos personales y consentimiento, así que va con diff aprobado.

### Lo que se leyó en el código

- **`importCustomers`** exige `documento`. **`deleteImportBatch`** (`controllers/onboarding.js:2562-2595`):
  - borra solo `clients`;
  - lo hace en un único batch, que falla con más de 500 documentos;
  - no toca `email_subscribers`.
- **La tienda crea clientes sin documento** con `buscarClienteEnCRM` y `resolverClienteEnCRM` (`controllers/sites.js:2385-2440`):
  - buscan por `numero_celular_comprador` y luego por correo, con igualdad exacta y dentro de la empresa;
  - el indicativo va aparte, en `indicativo_celular_comprador`;
  - si el cliente existe, lo completan sin pisar.
- **Consentimiento** (`services/marketing/suscriptores.js` y `utils/suscripcionCorreo.js`):
  - Cada fila de `email_subscribers` es `siteId_hash`.
  - `registroDeAutorizacion` reemplaza la autorización y deja `bajaEn: null`.
  - `suprimir` (línea 63) marca las filas que existen con ese `emailHash` en **todas** las tiendas. Una fila nueva no hereda esa marca, y `puedeRecibirCampanas` mira solo su propia fila.

### Lectura, normalización y búsqueda

- Lector puro `readers/shopifyCustomers.js`. Columnas: nombre, apellido, correo, teléfono, dirección y «Accepts Email Marketing».
- **Normalización:**
  - **Correo:** en minúsculas y sin espacios.
  - **Teléfono:** solo dígitos. Si empieza por `57` y tiene 12 dígitos, se quita el prefijo y queda `indicativo_celular_comprador: "+57"`. Un número de 10 dígitos que empieza por 3 también es colombiano. Los de otros países conservan su indicativo, y el número va sin él.
- **Búsqueda:** el mismo criterio de la tienda, siempre dentro de la empresa:
  1. el celular normalizado;
  2. el número tal como viene en el export, por si así quedó guardado;
  3. el correo.
- **Límite:** un correo que el CRM guardó con mayúsculas no se encuentra, porque la búsqueda es exacta. Puede quedar duplicado, y el reporte lo advierte.
- **Si el cliente existe:** se completa sin pisar, con correo y dirección nueva. No se le pone `importBatchId`, igual que en `importCustomers` hoy.
- **Si no existe:** se crea con `documento: ""`, `importBatchId` y `origenPrimerContacto: { canal: "migracion", plataforma, siteId, migrationId }`.
- **Filas sin correo ni celular:** quedan por fuera, con aviso.

### Lotes y reversa

- **Lotes:** hasta 500 filas. El id de cada uno es `importBatchId = <migrationId>_c<lote>`, así que cada lote se puede deshacer por separado. El lote toma el candado por empresa (`design-escritura.md`).
- **Reversa:** `DELETE import-store/customers/:batchId`. Borra en tandas de 500 escrituras:
  - los `clients` de la empresa que siguen con ese `importBatchId`;
  - las filas de `email_subscribers` de ese lote que siguen con origen `importacion`, sin baja ni supresión.
- **Lo que se conserva:**
  - las filas que la persona tocó después (se suscribió en el checkout o se dio de baja);
  - los datos agregados a clientes que ya existían.
- **Respuesta:** `{ clientsDeleted, subscribersDeleted, subscribersKept }`. No se usa `deleteImportBatch`, que sigue igual.

### Consentimiento

- **Cuándo entra:** solo con «Accepts Email Marketing = yes» y la casilla de declaración del administrador. Nunca se presume.
- **Función nueva `registrarImportacion`** en `suscriptores.js`, en una transacción:
  - Si la fila `siteId_hash` ya existe (suscrita, en baja o suprimida), no se toca. Cuenta `existing`.
  - Si **alguna** fila con ese `emailHash` tiene `supresion`, no se crea nada. Cuenta `suppressed`, sin decir de qué tienda viene.
  - En los demás casos, crea la fila con:
    - origen `importacion`, con su texto y su versión;
    - evidencia: plataforma, fecha del export si viene, `importBatchId` y la declaración.
- **Origen nuevo:** `importacion` se suma a `ORIGENES` (`utils/suscripcionCorreo.js`). Solo lo usa esta función, y los demás orígenes no cambian.

### Pruebas (tarea 1.5)

- Se crea consentimiento solo con «yes».
- Una fila en baja o suprimida queda intacta.
- Un correo suprimido en otra tienda no recibe autorización.
- `+57 300 123 4567` y `3001234567` dan un solo cliente.
- La reversa borra solo lo del lote y lo que nadie tocó, también con más de 500 documentos.
- Ningún correo ni teléfono aparece en el log, en `migration_audit` ni en la respuesta.

### Revisión legal (tarea 0.7)

La pregunta 4 depende de un concepto sobre la Ley 1581: ¿el consentimiento dado a la tienda anterior vale para el mismo comercio en Katuq? Si el concepto dice que no, la fase 1b importa los clientes sin suscripción y se les pide la autorización de nuevo.

### Ampliación D-518 (21-oct): NUEVO, pendiente de aprobación

F5-30·1 deja los clientes **dentro de esta entrega**. Lo de arriba no cambia, y la fase 1b sigue bloqueada por el concepto legal (0.7): D-518 no lo resolvió.

- **Columnas verificadas el 2026-10-21** en la ayuda de Shopify (help.shopify.com/en/manual/customers/import-export-customers):
  - `First Name`, `Last Name`, `Email`, `Accepts Email Marketing`;
  - `Default Address Company`, `Default Address Address1`, `Default Address Address2`, `Default Address City`, `Default Address Province Code`, `Default Address Country Code`, `Default Address Zip`, `Default Address Phone`;
  - `Phone`, `Accepts SMS Marketing`, `Accepts WhatsApp Marketing`;
  - `Total Spent`, `Total Orders`, `Note`, `Tax Exempt`, `Tags`.

  El lector usa `Phone` y, si falta, `Default Address Phone`. `Total Spent`, `Total Orders` y `Note` no se importan: `Note` puede traer datos personales libres.
- **Permiso de SMS y de WhatsApp (pregunta 10):** no se importan. En Katuq, el permiso de WhatsApp vive por carrito (`utils/siteCarrito.js:94`, F2-21). El registro por contacto lo pide [CONV] E (#1305, cd OpjNQnXBsuR3GFRBiRzN), que está pendiente. El reporte solo cuenta cuántos clientes lo traían.
- **Llave del cliente (pregunta 11):** celular normalizado y después correo, como arriba. Es la misma pregunta que tiene abierta WP-INT 3 (#1288, cd Ttbk4gnxvl49bpbOJrXV), así que se le avisa a Mónica para que las dos queden con la misma llave.
- **Precisión del criterio:** «no se duplican con el mismo correo» vale para correos guardados en minúsculas. Uno guardado con mayúsculas puede duplicarse, como se aceptó arriba (§Lectura), y el reporte lo advierte.
- **Guarda nueva:** un comercio con la integración WooCommerce activa recibe 409 `WOO_INTEGRATION_ACTIVE` también en `customers` (`design-woocommerce.md` W1).
- **Clientes de WooCommerce:** este documento es de Shopify. WooCommerce exporta sus clientes desde el informe de Analytics, con teléfono pero **sin** consentimiento de marketing. La propuesta (pregunta 19) los trae con la misma búsqueda, lotes y reversa, y nunca con autorización de correo (`design-woocommerce.md` W5).
- **Excepción registrada (auditoría F5-30, 2026-10-21): la bandera `storeMigrationCustomerConsent`.** La autorización de correo exige tres condiciones, no dos: «yes» en el export, la declaración del administrador **y** la bandera `storeMigrationCustomerConsent` (D-505, apagada hasta el concepto legal 0.7). Con la bandera apagada los clientes entran sin suscripción aunque el archivo diga «yes» y la casilla esté marcada. El formulario muestra el aviso «entran sin suscripción» solo mientras la bandera está apagada (lee `CompanyFeaturesService`); al encenderla el aviso desaparece.
- **Aviso de mayúsculas (aceptado como aproximación, auditoría F5-30):** el servidor no detecta si el CRM guardó un correo con mayúsculas. El front cuenta los «correos con mayúsculas en el archivo» y avisa que, si esos clientes ya estaban guardados así, podrían repetirse. No prueba que haya duplicado: solo lo advierte.
