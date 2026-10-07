## 0. Aprobación (bloqueante)

- [ ] 0.1 Daniel aprueba la propuesta y la spec. Registrar en CONTRACT.md como D-XXX.

## 1. Búsqueda por id de Cereza

- [ ] 1.1 En `_upsertProduct`, buscar por `integrations.osmosis.id` (número y texto) antes que por referencia. Ignorar las fichas con `duplicadoDe`.
- [ ] 1.2 Con más de una coincidencia: no escribir y registrar el error con las fichas.
- [ ] 1.3 Si coincide por id y la referencia es distinta, conservar la referencia de la ficha y dejar el aviso en `osmosis_sync_log`.
- [ ] 1.4 `_upsertProduct` devuelve `{ productId, action }`; el webhook registra la acción real.

## 2. Pruebas y despliegue

- [ ] 2.1 Prueba de contrato sin red con cuatro casos: cambio de referencia (caso 27311), producto nuevo, id repetido y ficha `duplicadoDe`.
- [ ] 2.2 Validar sintaxis y correr las pruebas de Osmosis existentes.
- [ ] 2.3 Desplegar el backend y revisar `osmosis_sync_log` durante 24 h.
