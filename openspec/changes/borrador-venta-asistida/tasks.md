## 0. Aprobación

- [x] 0.1 Propuesta aprobada por Daniel (2026-10-16)
- [ ] 0.2 OK de Daniel a design.md y tasks.md
- [ ] 0.3 Registrar D-XXX en `specs/CONTRACT.md` (verificar el siguiente libre en origin)

## 1. Backend (`katuq_admin_back_firebase/functions`)

- [ ] 1.1 `services/ventas/borradoresVenta.js` (puro): lista blanca del cuerpo, `resumen`, reglas de acceso (dueño o familia Administrador, misma empresa), `venceEnDias` y la regla de vencido a los 30 días
- [ ] 1.2 `controllers/salesDrafts.js` + `routers/salesDrafts.js` en `/v1/sales-drafts` con `auth` + `requireJwtTenant`: POST, GET lista, GET :id, PUT :id y DELETE :id; 413 si pasa de 900 KB
- [ ] 1.3 Borrado de vencidos al listar y al leer
- [ ] 1.4 Índice `salesDrafts (company, updatedAt desc)` en `firestore.indexes.json` y desplegado
- [ ] 1.5 Tests: vendedor solo ve los suyos, Administrador ve todos, otra empresa 404, campos inventados descartados, vencido se borra, tamaño máximo

## 2. Frontend (`Seller.Katuq`)

- [ ] 2.1 `SalesDraftsService` (extiende `BaseService`)
- [ ] 2.2 Guardar: botón "Guardar borrador" en crear-ventas (y por herencia en venta-asistida) con la regla de visibilidad, Swal para el nombre, armado del `estado` (D2), crear o actualizar y `newPedido()`
- [ ] 2.3 Componente `borradores-venta` (D-400): botón con contador, modal con la tabla, Retomar y Eliminar
- [ ] 2.4 Retomar: refresco de productos y avisos (D3), escribir `cliente` + contexto + `borradorVentaCtx`, y navegar
- [ ] 2.5 Generalizar `aplicarContextoConversionSiAplica()` para el contexto de borrador (aplica también envío, facturación y notas) y el caso sin cliente en `ngOnInit`
- [ ] 2.6 Borrar el borrador después de un `createOrder` exitoso (D5)
- [ ] 2.7 Build de producción sin errores; sin gradientes ni primarios prohibidos nuevos

## 3. Verificación

- [ ] 3.1 En FLORECER: guardar con cliente y 3 productos, verificar que la pantalla queda limpia, retomar y crear el pedido; el borrador desaparece y las existencias solo cambian por el pedido
- [ ] 3.2 Cambiar el precio de un producto entre guardar y retomar → aviso con el precio nuevo
- [ ] 3.3 Usuario vendedor vs administrador: la visibilidad funciona
- [ ] 3.4 Revisión a 1440 y 390 px
