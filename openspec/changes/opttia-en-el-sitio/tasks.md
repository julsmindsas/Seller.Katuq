# Tareas: Opttia en la tienda

## 1. Configuración
- [ ] 1.1 D-686 en el contrato; `tienda.opttia` saneado en `siteBlocks.js` con compatibilidad de `asesorKai`
- [ ] 1.2 Panel «Opttia en la tienda» en el editor (capacidades, nombre, saludo, preguntas frecuentes)

## 2. Puente y tienda (back, sitio publicado)
- [ ] 2.1 `window.__kqWebMcp.ejecutar` en `siteWebMcp.js`, sin cambiar lo que ve un agente del navegador
- [ ] 2.2 `beginCheckout` con datos que llenan el checkout y abren el último paso
- [ ] 2.3 Widget v2 con carga diferida; X1 igual con Opttia apagado

## 3. Backend
- [ ] 3.1 `POST /v1/sites/public/:slug/opttia`: validación, límites, tope de 6 pasos, reanudar con resultados del navegador
- [ ] 3.2 Herramientas de servidor: catálogo (reusa las del puente), `getStorePolicies`, `searchHelpCenter`, `createTicket` (origen sitio-web, con límite)

## 4. ADK (kai, rama aparte con el sí de Daniel)
- [ ] 4.1 `channels/tienda/`: agente con las herramientas web MCP según capacidades; tono y políticas del comercio
- [ ] 4.2 Pruebas: no inventa, inyección, datos ajenos, tope de pasos

## 5. Opttia del Seller
- [ ] 5.1 Sabe encender y configurar «Opttia en la tienda» como propuesta

## 6. Verificación
- [ ] 6.1 Build, suites del sitio y X1
- [ ] 6.2 Tienda de Baudio (borrador), a 1440 y 390: comparar, lista de precios, carrito, checkout lleno, ticket, límite
- [ ] 6.3 Medir el costo por conversación antes de abrirlo a más tiendas
