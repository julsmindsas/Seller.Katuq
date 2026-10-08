## 0. Aprobación (bloqueante)

- [x] 0.1 Daniel aprueba la propuesta y la spec. Registrar en CONTRACT.md como D-XXX.

## 1. Búsqueda por id de Cereza

- [x] 1.1 En `_upsertProduct`, buscar por `integrations.osmosis.id` (número y texto) antes que por referencia. Ignorar las fichas con `duplicadoDe`.
- [x] 1.2 Con más de una coincidencia: elegir de forma determinista (misma referencia, enlazada a Shopify, más vieja) y avisar con las fichas repetidas. Se cambió tras la revisión adversarial: cortar dejaba el producto sin sincronizar.
- [x] 1.3 Si coincide por id y la referencia es distinta, conservar la referencia de la ficha y dejar el aviso en el resultado del evento del webhook (`osmosis_webhook_log`) y en el log del servidor.
- [x] 1.4 `_upsertProductDetalle` devuelve `{ productId, action, avisoReferencia }` y el webhook registra la acción real. `_upsertProduct` sigue devolviendo el id por compatibilidad.

## 2. Pruebas y despliegue

- [x] 2.1 Prueba de contrato sin red con cuatro casos: cambio de referencia (caso 27311), producto nuevo, id repetido y ficha `duplicadoDe`.
- [x] 2.2 Validar sintaxis y correr las pruebas de Osmosis existentes.
- [ ] 2.3 Desplegar el backend y revisar `osmosis_sync_log` durante 24 h.
