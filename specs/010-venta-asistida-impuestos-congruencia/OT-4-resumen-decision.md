# OT-4 — ¿Dónde guardamos el IVA que de verdad se cobró en cada línea?

> Resumen para decidir (spec 010). Lenguaje simple, para revisar con el equipo.
> Contexto técnico completo: ver D-060 en `specs/CONTRACT.md`.

## El problema en una frase
Necesitamos un lugar **confiable** en el pedido donde quede grabado el IVA que **realmente se cobró** por cada producto, para que la pantalla, lo guardado y la factura **siempre digan lo mismo** y nadie lo recalcule mal después.

## Por qué importa (lo que ya pasó)
Dentro de cada pedido se guarda una "foto" del producto (precio e IVA del momento de la venta). El problema: **esa foto se puede pisar después**. En el pedido `DAD-010722` el producto pasó de 19% a 0% **después** de vendido (lo cambió un sync de productos). Resultado: el pedido ya no refleja lo que se cobró. Por eso no podemos confiar en la "foto del producto" como fuente de verdad.

## Las 3 opciones

### Opción A — Campos propios en cada línea *(recomendada)*
Agregar a cada línea del pedido **3 campos nuevos** que digan exactamente lo cobrado:
- precio sin IVA realmente aplicado, % de IVA aplicado, y el valor del IVA.
- Más un **desglose total** a nivel pedido (cuánto IVA al 0/5/8/19%).
- **Todos** (pantalla, factura, reportes) leen **esos campos**, no recalculan del producto.
- El sync de productos **no toca** esos campos.

**Pros:** separa "lo que era el producto" de "lo que se cobró". El sync ya no puede dañar pedidos viejos. Es lo más limpio y a prueba de futuro.
**Contras:** hay que agregar los campos y hacer que todo lea de ahí (algo de trabajo, pero acotado).

### Opción B — Pisar el IVA de la "foto del producto" con el real
En vez de campos nuevos, sobrescribir el IVA dentro de la foto del producto con el efectivo.

**Pros:** más rápido, menos campos.
**Contras:** la foto **sigue siendo pisable** — un sync la puede volver a cambiar (es justo lo que pasó en DAD). **No resuelve la causa raíz.**

### Opción C — Opción A + "congelar" la foto
Hacer A **y además** lograr que ningún sync vuelva a tocar pedidos ya vendidos.

**Pros:** lo más robusto de todo; el histórico queda intocable de verdad.
**Contras:** el más trabajo — hay que meter mano en los flujos de sincronización (Osmosis/Shopify/WooCommerce), que son sensibles.

## Comparación rápida

| | A (campos propios) | B (pisar la foto) | C (A + congelar) |
|---|---|---|---|
| Resuelve la causa raíz | ✅ Sí | ❌ No | ✅ Sí (total) |
| Riesgo de que un sync lo dañe | Bajo | **Alto** | Nulo |
| Trabajo | Medio | Bajo | Alto |
| Toca flujos de integración | No | No | **Sí** |

## Recomendación
**Opción A.** Es el mejor equilibrio: resuelve el problema de raíz (los datos cobrados quedan en campos propios que el sync no toca), sin meterse todavía en los flujos de integración (que es lo caro/riesgoso de C). Si más adelante se quiere blindaje total del histórico, se suma el "congelar" de C como segundo paso.

## Preguntas para cerrar con el compañero
1. ¿Vamos con A (campos propios) como base?
2. ¿Hace falta el "congelar la foto" (C) ahora, o lo dejamos para después?
3. ¿Por qué exactamente el sync pisó el IVA en DAD? (para asegurarnos de que A no deje otra rendija)
4. Nombres de los 3 campos por línea (propuesta: `precioSinIvaResuelto`, `tarifaEfectiva`, `ivaLinea`) + `desgloseIVA` a nivel pedido.

---
Apenas se confirme la opción, el resto (conectar el motor al guardar, guardar el desglose, apagar las calculadoras viejas, y que la factura use la tarifa cobrada) se implementa sobre esa base.
