# Tareas — producto configurado desde el chat

## 1. Backend

- [ ] 1.1 Lector `adicionesDelComercio(company)` (caché 5 min): dos listas por
      `esAdicion`/`esPreferencia`, ordenadas por `posicion`, tope 30, con
      nombre, precioConIva calculado y tipoEntrega. Tests.
- [ ] 1.2 Carrito de sesión: las líneas aceptan `adiciones`/`preferencias`
      (arrays de nombres cortos), `ocasion` y `observacion` — saneados en
      `reemplazarCarrito`. Tests de que campos colados no pasan.
- [ ] 1.3 Despachador: manda al agente las adiciones/preferencias disponibles
      (filtradas por entrega si ya está acordada). Tests.
- [ ] 1.4 Cierre: resuelve nombres contra el maestro (normalizado, ambiguo =
      descarte con log), adjunta objetos completos a
      `configuracion.adiciones/preferencias`, valida compatibilidad con la
      entrega (incompatible = fuera + nota), ocasión/observación al
      `datosEntrega` del ítem. Contract test: el total de la cotización suma
      las adiciones con precio del MAESTRO aunque el carrito del bot traiga
      precios plantados. Tests del shape.

## 2. ADK

- [ ] 2.1 Herramientas `agregar_adicion(producto_id, nombre)`,
      `quitar_adicion(producto_id, nombre)`,
      `elegir_preferencia(producto_id, nombre)`,
      `anotar_ocasion_u_observacion(producto_id, ocasion, observacion)` —
      anotan en la línea del carrito del estado. `sanear_carrito` conserva
      los campos nuevos. Tests puros.
- [ ] 2.2 Instrucciones: adiciones disponibles con precio en el contexto,
      sumar SOLO con esos precios, resumen con adiciones y total incluido,
      la sugerencia persuasiva puede ser una adición (mismos guardarraíles).
      Tests.
- [ ] 2.3 Endpoint: recibe `adicionesDisponibles`/`preferenciasDisponibles`,
      devuelve el carrito con los campos nuevos. Tests.

## 3. Verificación

- [ ] 3.1 Suites backend + ADK en verde; contract test del write-set intacto.
- [ ] 3.2 Prueba real: pedido con adición → total del chat vs total de la
      cotización en el editor → convertir a pedido y ver las adiciones en el
      carrito de venta asistida.
- [ ] 3.3 CONTRACT.md + memoria al día.
