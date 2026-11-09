# Tareas: Opttia en el sitio web

## 1. Base
- [ ] 1.1 D-686 en el contrato y bandera `opttiaEnSitio` en `companyFeatureFlags.js` (avisar a aws-claude-2 antes)
- [ ] 1.2 Esquema `tema.opttia` saneado en `controllers/sites.js` (lista blanca, textos con largo máximo)

## 2. ADK (kai, rama aparte con el sí de Daniel)
- [ ] 2.1 `channels/web/`: juego de herramientas web sobre el agente de WhatsApp, sin `cerrar_pedido`
- [ ] 2.2 `POST /v1/web-bot/turno` con `X-Bot-Token`; pruebas de inyección y de catálogo cerrado

## 3. Backend
- [ ] 3.1 Endpoint público del turno + límites + tope diario; 404 si no aplica
- [ ] 3.2 Filtro de acciones contra el catálogo del sitio y precio del servidor
- [ ] 3.3 Módulo `opttiaBurbuja` + script diferido; X1 sin cambios con la bandera apagada

## 4. Front
- [ ] 4.1 Panel «Opttia en la tienda» en el editor v2
- [ ] 4.2 Herramienta de Opttia del Seller: encender/configurar como propuesta
- [ ] 4.3 Nota de versión (`retirada: true` mientras sea solo de Baudio)

## 5. Verificación
- [ ] 5.1 Build de producción, suites del sitio, X1
- [ ] 5.2 Navegador 1440 y 390 en la tienda de Baudio (borrador): preguntar, agregar al carrito, pasar a WhatsApp, límite
- [ ] 5.3 Pruebas adversarias: pedir datos ajenos, inyección, producto fuera del sitio
