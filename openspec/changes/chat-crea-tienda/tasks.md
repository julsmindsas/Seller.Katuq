## 0. Decisiones

- [x] 0.1 Daniel aprobó "chat en tienda" el 2026-10-09 (camino mínimo: el chat propone, el comercio confirma con un clic; sin escritura para el modelo).
- [x] 0.2 Registrar la decisión en `specs/CONTRACT.md` dentro de D-385.

## 1. Back

- [x] 1.1 Guarda de Shopify/WooCommerce en la tienda en un paso (hecha, D-385).
- [x] 1.2 Mover la revisión de integraciones a `services/sites/tiendaEcommerceGuard.js` (la usan el controlador y la herramienta).
- [x] 1.3 `tools/getSingleStepStoreLink.js` + registro en `toolRegistry.js`; prueba sin red y sin Firestore.
- [x] 1.4 Compuerta por bandera y rol en `opttiaAccessPolicy.js` y `routers/opttia.js` (lista, llamada por nombre y dentro de la herramienta); prueba.

## 2. Front

- [x] 2.1 `sitios-lista` lee `tiendaEnUnPaso`, `nombre` y `descripcion` y abre la pantalla precargada, solo con la bandera.
- [x] 2.2 Chip "Crear mi tienda" en el chat cuando la herramienta está disponible.

## 3. Verificación

- [ ] 3.1 Probar en FLORECER con el modelo real (el modelo puede no llamar la herramienta: ajustar su descripción; el ADK solo si hace falta una línea de prompt).
- [ ] 3.2 Despliegue (back y front) saliendo del modo automático.
