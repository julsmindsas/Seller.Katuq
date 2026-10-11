## 1. Base del componente compartido

- [x] 1.1 Leer `crear-cliente-modal.component.{ts,html,scss}` y `clientes.component.ts` (formularios de entrega, facturación y notas) para inventariar campos y validaciones vigentes (1050, 1083, 1100, 1046)
- [x] 1.2 Agregar `@Input() modo: 'modal' | 'inline' = 'modal'`, `@Output() guardado` y `@Optional() NgbActiveModal`; todo cierre pasa por un único `emitirResultado({cliente, action})` que cierra el modal o emite según el modo
- [x] 1.3 Envolver el contenido en `p-tabView` con pestañas Contacto / Entrega / Facturación / Notas; Contacto conserva el formulario actual; las otras tres se renderizan al activarse (`*ngIf`)
- [x] 1.4 Estilos de pestañas según design system (acento #5F3FE0, labels UPPERCASE muted, sin gradientes) y contador en el título de cada pestaña
- [ ] 1.5 Build sin errores y prueba manual: Listado → Editar, cotizaciones y CRM abren el modal igual que antes

## 2. Contacto: username de WhatsApp

- [x] 2.1 Agregar control `whatsappUsername` (opcional, patrón 3-32 caracteres letras/números/punto/guion bajo, se guarda sin `@`) junto al número de WhatsApp, sin romper "igual al celular"
- [x] 2.2 Mostrarlo al editar (carga desde `clienteData`) e incluirlo en el payload de crear y editar
- [ ] 2.3 Verificar en backend (`controllers/clients.js`) que `createClient`/`editClient` no filtran el campo; prueba con un cliente de la empresa de pruebas

## 3. Pestaña Entrega: varias direcciones

- [x] 3.1 Crear `shared/utils/client-delivery.ts` con `normalizarEntrega(e)` que convierte la forma snake legacy a la canónica camel conservando claves desconocidas, y `esEntregaCompleta(e)`
- [x] 3.2 Lista de direcciones (`datosEntrega[]` normalizado) con agregar, editar y eliminar; "agregar" reutiliza `DireccionEstructuradaComponent` y el cálculo de zona de cobro (`zonaCubreCiudad`) que hoy usa Crear cliente
- [x] 3.3 Reemplazar el campo único `entregaNueva` del ticket 1046 por la lista; al guardar se envía el arreglo completo normalizado (crear y editar)
- [ ] 3.4 Prueba con clientes legacy en forma snake y con clientes nuevos; verificar que venta asistida y despachos siguen leyendo la dirección
- [ ] 3.5 Build sin errores

## 4. Pestaña Facturación: varios perfiles

- [x] 4.1 Lista de perfiles (`datosFacturacionElectronica[]`) con agregar, editar, eliminar y marcar predeterminado; formulario con alias, razón social, tipo y número de documento, correo, dirección y ciudad (misma forma que hoy)
- [x] 4.2 Botón "usar los datos del cliente" que copia desde Contacto
- [x] 4.3 Venta asistida y cotizaciones preseleccionan el perfil `predeterminado` si existe (solo lectura del flag; sin cambiar su lógica de facturación)
- [ ] 4.4 Build sin errores y prueba de facturación electrónica con un perfil predeterminado

## 5. Pestaña Notas

- [x] 5.1 Lista de notas (`notas[]`) de la más reciente a la más antigua, con agregar y eliminar; cada nota nueva lleva `fecha` (YYYY-MM-DD) y `usuario` (email del usuario autenticado)
- [ ] 5.2 Incluir el arreglo completo en el payload; build sin errores

## 6. Guardado íntegro

- [x] 6.1 Garantizar que crear y editar envían siempre los tres arreglos completos tal como se cargaron más los cambios (nunca vacíos por omisión), por el merge superficial de `clients/edit`
- [x] 6.2 Un solo mensaje de resultado (creado / actualizado / ya existía) en los dos modos
- [ ] 6.3 Prueba: editar contacto + agregar dirección + nota en un solo Guardar desde el listado

## 7. Reemplazo en venta asistida (larga y única)

- [x] 7.1 Leer `crear-ventas.component.{ts,html}` (bloque `mostrarFormularioCliente`, `crearClienteRapido`, `revisarFormularioCliente`, `avisarFormularioClienteIncompleto`) y `venta-asistida-unica.component.html`
- [x] 7.2 Portar al componente compartido lo que falte de las reglas 1015/1089 (foco al primer campo inválido, tipos de documento "anteriores") si no están ya
- [x] 7.3 Reemplazar el formulario inline de ambas plantillas por `<app-crear-cliente-modal modo="inline" [persist]="true" [prefill]="…" (guardado)="onClienteGuardado($event)">`; `crearClienteRapido()` queda reducido al post-guardado (asignar `pedidoGral.cliente`, sessionStorage, ocultar formulario)
- [x] 7.4 Importar `ClientesSharedModule` en el módulo de ventas si no está; borrar los controles del formulario de cliente que queden sin uso en `CrearVentasComponent`
- [ ] 7.5 Build sin errores y prueba completa de crear pedido con cliente nuevo y con cliente existente en las dos ventas asistidas

## 8. Reemplazo en Crear cliente

- [x] 8.1 Reemplazar el bloque inline del ticket 1163 por el componente en modo inline; conservar buscador plegable, Etiquetas y carga por documento (al seleccionar un resultado se pasa `clienteData` e `isEdit=true`)
- [x] 8.2 Eliminar `formulario`, `formularioEntrega`, `formularioFacturacion`, `formularioNotas`, los modales de entrega/facturación/notas y la plantilla duplicada en `clientes.component.*`
  - Hecho 2026-10-11: borrados formularios viejos, modales entrega/facturación/notas, `formBody`, modo `isEdit`/`clienteEdit` (+ lectura de IndexedDB), guardados por separado y helpers DANE/zona/país; la ficha 360 queda de solo lectura (se edita en el formulario unificado) y bloquear/desbloquear envía un parche `{cd, documento, estado}`. ts 1798→465, html 1065→426, scss 1555→1200; quitados `@ViewChild('clientes')` sin uso en despachos y POS. tsc limpio (salvo `apiUrl` preexistente).
- [x] 8.2b Migrar los `<app-clientes [isEdit]="true">` que quedaban: la lista de pedidos (modal "Modificar datos del cliente") usa `<app-crear-cliente-modal modo="inline">`, relee el cliente por documento al abrir y, al guardar, el modal entrega el cliente al pedido; el modal de producción no se abría desde ningún lado y se retiró
- [x] 8.2c Al buscar un documento que no existe, el número se precarga en el formulario unificado (`documentoPrellenado` reacciona en `ngOnChanges`)
- [x] 8.2d Traducciones EN/PT de las pestañas y textos del formulario y del modal "Opciones del pedido" (126 claves)
- [ ] 8.3 Build sin errores y prueba: crear cliente completo en una sola acción desde Crear cliente
  - Build 2026-10-11 sin errores nuevos (solo `apiUrl` preexistente; se arregló `$color-text-light` que había borrado el commit del ticket 1195). Falta la prueba en navegador.

## 9. Cierre

- [x] 9.1 Registrar D-406 en `specs/CONTRACT.md` (formulario único de cliente, `whatsappUsername`, forma canónica de `datosEntrega[]`) y bitácora
- [x] 9.2 Actualizar notas internas de los tickets 1164, 1165, 1166 y 1167 con el resumen y los archivos tocados
- [ ] 9.3 Build final y lista de pruebas manuales para el usuario antes de publicar versión
