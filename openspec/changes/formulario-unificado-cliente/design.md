## Context

Hay cuatro formularios de cliente en el seller center:

| Pantalla | Componente | Qué captura hoy |
|---|---|---|
| Crear cliente (`ventas/clientes`) | `ClientesComponent` (formulario propio, ~1600 líneas) | Contacto completo; entrega, facturación y notas en pasos aparte, **después** de crear |
| Listado de clientes → Editar | abre `CrearClienteModalComponent` | Contacto + **una** dirección nueva por vez (ticket 1046) |
| Cotizaciones, CRM, Facturación electrónica | abren `CrearClienteModalComponent` | Igual que el anterior |
| Venta asistida larga y única | formulario inline en `CrearVentasComponent` (`VentaAsistidaUnicaComponent` lo hereda) | Contacto; sin entrega/facturación/notas |

El documento `clients` ya tiene `datosEntrega[]`, `datosFacturacionElectronica[]` y `notas[]`. El problema es de captura, no de modelo. Verificado al implementar: las dos pantallas guardan `datosEntrega[]` con la MISMA forma camel (`direccionEntrega`, `ciudad`, `departamento`, `coordenadas`…); las claves snake (`direccion_entrega`, `ciudad_municipio_entrega`…) eran solo los nombres de los controles del formulario de `ClientesComponent`. El mapeador `normalizarEntrega` queda como tolerancia para documentos viejos que las hayan guardado así.

Restricciones: Angular 14 + PrimeNG 14, HTTP solo por servicios `BaseService`, sin colecciones ni endpoints nuevos, design system "Todos los pedidos" (acento #5F3FE0, plano, sin gradientes), Artículo IX (SRP, módulos lazy).

## Goals / Non-Goals

**Goals:**
- Un único componente de formulario de cliente, con pestañas Contacto / Entrega / Facturación / Notas, que crea y edita el documento completo en una sola acción.
- Que ese componente funcione en modal (como hoy) y también inline (Crear cliente y venta asistida), sin duplicar lógica.
- Campo `whatsappUsername` en Contacto.
- Reemplazar los tres formularios restantes por el componente, borrando el código duplicado.

**Non-Goals:**
- Migrar clientes existentes o normalizar `datosEntrega[]` históricos por script.
- Cambiar el listado de clientes, la búsqueda o el índice.
- Unificar los dos formularios de venta asistida entre sí (ticket 1168).
- Tocar `orders`, `inventory`, `products` o consecutivos.

## Decisions

### D1. Se extiende `CrearClienteModalComponent`, no se crea un componente nuevo
Ya es el formulario compartido (D-110, D-303), ya exportado por `ClientesSharedModule`, ya probado en cuatro pantallas y con las reglas vigentes (ticket 1050 celular o fijo, 1083 NIT sin apellidos, 1100 etiquetas). Se le agregan pestañas y un modo inline. Alternativa descartada: componente nuevo "desde cero" obligaría a reimplementar y volver a probar esas reglas y dejaría dos formularios durante la transición.

### D2. Modo inline por `@Input() modo: 'modal' | 'inline'` y `@Output() guardado`
Hoy el componente cierra con `NgbActiveModal.close({cliente, action})`. Se inyecta `NgbActiveModal` con `@Optional()`; en modo inline no existe y el resultado sale por `@Output() guardado = EventEmitter<{cliente, action}>`. El modal sigue cerrándose igual (sin cambios para cotizaciones, CRM ni facturación). Alternativa descartada: envolver el modal en un `ng-template` dentro de cada pantalla, que mantiene el acoplamiento a `NgbActiveModal`.

### D3. Pestañas con `p-tabView` de PrimeNG, Contacto obligatoria y las otras tres opcionales
Contacto conserva las validaciones actuales. Entrega, Facturación y Notas no bloquean el guardado: un cliente con solo contacto sigue siendo válido (la venta asistida necesita crear rápido). Cada pestaña muestra un contador en su título cuando tiene elementos ("Entrega (2)"). Se aplica el design system: pestaña activa con acento #5F3FE0, labels UPPERCASE muted, sin gradientes. Alternativa descartada: acordeón vertical, que alarga la pantalla y en el modal obliga a hacer scroll para llegar a Guardar.

### D4. Forma canónica de `datosEntrega[]`: la camel del modal
Se adopta `{direccionEntrega, ciudad, departamento, pais, barrio, observaciones, coordenadas, latitud, longitud, especificacionesInternas, nombres, apellidos, indicativoCelular, celular, otroNumero, codigoPostal, zonaCobro, valorZonaCobro}` porque es la que escriben las pantallas más nuevas y la que entiende la geocodificación (1136). Al cargar un cliente, el componente normaliza con un mapeador tolerante (`direccion_entrega → direccionEntrega`, `ciudad_municipio_entrega → ciudad`, etc.) y al guardar escribe siempre la camel. Los elementos legacy que el usuario no toque se reescriben ya normalizados dentro del arreglo, sin script aparte. Alternativa descartada: mantener las dos formas y que cada lector adivine; es justo la deuda que hoy produce direcciones "perdidas".

### D5. Facturación y notas: misma forma que hoy
`datosFacturacionElectronica[]` conserva `{alias, nombres (razón social), tipoDocumento, documento, correo, direccion, ciudad, ...}` porque facturación electrónica y Siigo ya lo leen. `notas[]` conserva `{fecha: 'YYYY-MM-DD', nota, usuario}`; se agrega `usuario` (email del que la escribió) que hoy no se guarda. Se puede marcar un perfil de facturación como predeterminado (`predeterminado: true`) para que venta asistida lo preseleccione.

### D6. `whatsappUsername` como campo plano del cliente
String opcional, se guarda tal cual (sin `@`), validación de formato laxa (3 a 32 caracteres, letras, números, punto y guion bajo). Se muestra junto al número de WhatsApp con el botón "igual al celular" existente intacto. No se indexa para búsqueda.

### D7. Guardado en una sola llamada
`clients/create` o `clients/edit` reciben el documento completo con los tres arreglos. `editClient` del backend ya hace `update(cleanUndefinedProperties(body))`, un merge superficial: el componente envía siempre los arreglos completos (no parches), para no perder elementos. No hay cambios de backend; solo se verifica con una prueba que `whatsappUsername` y los arreglos llegan íntegros.

### D8. Reemplazo de los formularios duplicados
- `ClientesComponent`: el bloque inline que se creó para el ticket 1163 pasa a ser `<app-crear-cliente-modal modo="inline">`; se borran `formulario`, `formularioEntrega`, `formularioFacturacion`, `formularioNotas` y sus ~900 líneas de plantilla duplicada. Se conservan el buscador plegable, Etiquetas y la carga por documento.
- `CrearVentasComponent` (y por herencia la venta asistida única): el bloque `mostrarFormularioCliente` pasa a renderizar el componente inline con `persist=true`; `crearClienteRapido()` se reduce a escuchar `guardado` y hacer lo que ya hace después de crear (asignar `pedidoGral.cliente`, sessionStorage, avanzar). Las dos plantillas HTML cambian, el TS es uno solo.
- `ClientesListaComponent`: sigue abriendo el modal, que ahora trae las cuatro pestañas; no cambia código salvo pasar el cliente completo.

## Risks / Trade-offs

- [El modal crece y se vuelve más lento de abrir en cotizaciones/CRM] → Las pestañas Entrega/Facturación/Notas se renderizan con `*ngIf` al activarse; el modal abre en Contacto igual que hoy.
- [Clientes legacy con `datosEntrega[]` en forma snake se reescriben normalizados al editar] → Es el comportamiento deseado; el mapeador conserva todas las claves originales desconocidas dentro de cada elemento para no perder información. Se prueba con los tres clientes de OMS que tienen ambas formas.
- [Venta asistida depende de reglas sutiles del formulario (foco al primer campo inválido, tipos de documento "anteriores", ticket 1015/1089)] → Esas reglas ya existen en el modal (1050/1083) o se portan al componente en la tarea correspondiente; se listan como escenarios en la spec y se prueban en ambas ventas asistidas antes de borrar el formulario viejo.
- [Merge superficial en `clients/edit`: si otra pantalla envía un parche sin los arreglos, los sobreescribe con vacío] → Hoy ya es así. El componente nunca envía arreglos vacíos por omisión: si una pestaña no se abrió, envía el arreglo tal como se cargó.
- [`ClientesComponent` es grande y con cambios recientes (1163)] → El reemplazo se hace al final, después de que el componente funcione inline en venta asistida; se puede dejar la pantalla Crear cliente para un segundo PR si el primero crece.

## Migration Plan

1. Extender el componente (pestañas, modo inline, `whatsappUsername`, mapeador de entrega). Sin cambiar a quien lo usa; se despliega y se prueba en Listado → Editar, cotizaciones y CRM.
2. Reemplazar el formulario de venta asistida (ambas plantillas).
3. Reemplazar el formulario de Crear cliente.
4. Registrar D-402 en `specs/CONTRACT.md` y publicar versión.

Rollback: cada paso es un commit; revertir el paso que falle deja el anterior funcionando porque el componente mantiene el contrato del modal.

## Open Questions

- ¿El `whatsappUsername` debe sincronizarse al bot de WhatsApp (`add-bot-pedidos-whatsapp`)? Se asume que no en esta entrega.
- ¿La pantalla Crear cliente conserva el paso de "Zona de cobro" por dirección? Se asume que sí, dentro de la pestaña Entrega, reutilizando `zonaCubreCiudad`.
