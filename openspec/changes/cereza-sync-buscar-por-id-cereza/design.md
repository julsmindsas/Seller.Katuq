## Context

Ver `proposal.md` y D-368. Hoy `_upsertProduct` toma la referencia del payload (L269) y busca solo por `company` + `identificacion.referencia` (L277-284). Si no encuentra la ficha, la crea en L412-422. La actualización (L309-317) nunca cambia la referencia.

## Decisions

1. **Consulta por id con los dos tipos.** `where('company','==',X).where('integrations.osmosis.id','in',[Number(id), String(id)])`, con `limit(2)`. Se probó en solo lectura y no necesita índice compuesto.
   - *Alternativa descartada:* normalizar primero los 456 ids guardados como texto. Es un backfill con riesgo, y además el flow mixto los escribe como texto.
2. **Solo el campo en inglés** `integrations.osmosis.id` (Artículo XV v2). `integraciones.osmosis` no participa.
3. **Dos fichas con el mismo id = error, no elección.** No se adivina cuál es la buena. Se registra el error y no se escribe nada.
4. **La referencia no se reescribe**, porque es el SKU en Shopify y en los pedidos a Cereza. El aviso va a `osmosis_sync_log/{empresa}/products/{referencia}` con las dos referencias.
5. **`_upsertProduct` devuelve `{ productId, action: 'created'|'updated' }`.** El webhook registra esa acción en vez de derivarla del tipo de evento.

## Risks / Trade-offs

- **[Hoy existe una ficha duplicada del 27311, ya desactivada].** Con la regla 3, cada evento del 27311 fallaría. Mitigación: la consulta de duplicados ignora las fichas marcadas con `duplicadoDe`. La de D-368 ya tiene esa marca.
- **[Rendimiento].** Una consulta más por evento solo cuando no hay coincidencia por id. El camino normal pasa de 1 a 1 consulta, porque primero va la de id y casi siempre acierta.

## Migration Plan

1. Prueba de contrato: cambio de referencia, producto nuevo, id repetido y ficha marcada `duplicadoDe`.
2. Desplegar el backend.
3. Revisar `osmosis_sync_log` 24 h buscando avisos de referencia distinta.
4. Rollback: revertir el commit. No hay migración de datos.
