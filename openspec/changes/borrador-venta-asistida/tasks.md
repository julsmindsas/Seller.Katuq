## 0. Aprobación

- [x] 0.1 Propuesta aprobada por Daniel (2026-10-16)
- [x] 0.2 OK de Daniel a design.md y tasks.md
- [x] 0.3 Registrado como D-466 en `specs/CONTRACT.md`

## 1. Backend (`katuq_admin_back_firebase/functions`)

- [x] 1.1 `services/ventas/borradoresVenta.js` (puro): lista blanca del cuerpo, `resumen`, reglas de acceso (dueño o familia Administrador, misma empresa), `venceEnDias` y la regla de vencido a los 30 días
- [x] 1.2 `controllers/salesDrafts.js` + `routers/salesDrafts.js` en `/v1/sales-drafts` con `auth` + `requireJwtTenant`: POST, GET lista, GET :id, PUT :id y DELETE :id; 413 si pasa de 900 KB
- [x] 1.3 Borrado de vencidos al listar y al leer
- [x] 1.4 ~~Índice compuesto~~ Desvío: no hace falta; la lista filtra por `company` y ordena en memoria (D-466)
- [x] 1.5 Tests: vendedor solo ve los suyos, Administrador ve todos, otra empresa 404, campos inventados descartados, vencido se borra, tamaño máximo

## 2. Frontend (`Seller.Katuq`)

- [x] 2.1 `SalesDraftsService` (extiende `BaseService`)
- [x] 2.2 Guardar: botón "Guardar borrador" en crear-ventas (y por herencia en venta-asistida) con la regla de visibilidad, Swal para el nombre, armado del `estado` (D2), crear o actualizar y `newPedido()`
- [x] 2.3 Componente `borradores-venta` (D-400): botón con contador, modal con la tabla, Retomar y Eliminar
- [x] 2.4 Retomar: refresco de productos y avisos (D3), escribir `cliente` + contexto + `borradorVentaCtx`, y navegar
- [x] 2.5 Generalizar `aplicarContextoConversionSiAplica()` para el contexto de borrador (aplica también envío, facturación y notas) y el caso sin cliente en `ngOnInit`
- [x] 2.6 Borrar el borrador después de un `createOrder` exitoso (D5)
- [x] 2.7 Build de producción sin errores; sin gradientes ni primarios prohibidos nuevos

## 3. Verificación

- [ ] 3.1 En FLORECER: guardar con cliente y 3 productos, verificar que la pantalla queda limpia, retomar y crear el pedido; el borrador desaparece y las existencias solo cambian por el pedido
- [ ] 3.2 Cambiar el precio de un producto entre guardar y retomar → aviso con el precio nuevo
- [ ] 3.3 Usuario vendedor vs administrador: la visibilidad funciona
- [ ] 3.4 Revisión a 1440 y 390 px

## Desvíos

- El estado se guarda como texto JSON (`estadoJson`) y no como objeto: Firestore rechaza `undefined` y arreglos anidados que pueden venir en los productos.
- Sin índice compuesto (1.4): filtro por `company` y orden en memoria.
- Retomar y guardar recargan la pantalla (igual que "Descartar"): la venta asistida arranca limpia en el constructor.
