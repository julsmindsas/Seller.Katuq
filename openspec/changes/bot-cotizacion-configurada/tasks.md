# Tareas — cotización configurada desde el chat

## 1. Backend

- [ ] 1.1 Lector del maestro `formaEntrega` por comercio (solo lectura, caché
      5 min como `formasDePago`; clasifica domicilio/recoge por nombre).
      Tests.
- [ ] 1.2 Sesión del bot: llaves `entrega` (forma, fecha, esRecoge), `pago`,
      `dedicatoria`, `facturacion` — persisten entre turnos y se limpian con
      `devolverAlBot`/cierre. Tests de merge y de que el carrito no se toca.
- [ ] 1.3 Despachador: manda al agente las formas de entrega reales + lo ya
      configurado; al volver el turno VALIDA (forma contra maestro, fecha
      parseada y futura, pago contra `pagos`) y persiste solo lo válido; lo
      inválido se loggea y el agente repregunta. Tests de cada validación.
- [ ] 1.4 Gates de cierre: sin forma + fecha válidas no hay cierre (motivo
      claro al traspasar); domicilio sigue exigiendo dirección. Tests.
- [ ] 1.5 Cierre: ítems con `configuracion` canónica de venta asistida
      (datosEntrega con formaEntrega + fechaEntrega {year,month,day} +
      observaciones; adiciones/preferencias/tarjetas SIEMPRE arrays;
      dedicatoria en tarjetas), `metodoPagoPreferido` y `facturarA` en el doc,
      y la nota del pedido los repite. Contract test del write-set actualizado
      (sigue solo cotizaciones + contador). Tests del shape exacto.

## 2. ADK

- [ ] 2.1 Herramientas locales `configurar_entrega(forma, fecha)`,
      `elegir_metodo_pago(nombre)`, `poner_dedicatoria(mensaje)`,
      `facturar_a_nombre_de(nombre, nit)` — anotan en EstadoTurno, cerradas
      sobre el turno, sin escritura. Tests puros.
- [ ] 2.2 Instrucciones: preguntar entrega + fecha juntas cuando se pueda,
      ofrecer opcionales UNA vez sin insistir, incluir entrega y fecha en el
      resumen del cierre, normalizar fechas dictadas a YYYY-MM-DD. Tests de
      instrucciones.
- [ ] 2.3 Endpoint: recibe formasEntrega + config ya capturada, devuelve
      entrega/pago/dedicatoria/facturacion del turno. Tests.

## 3. Verificación

- [ ] 3.1 Suites backend + ADK en verde; contract test del write-set intacto.
- [ ] 3.2 Prueba real en el piloto: pedido con domicilio + fecha + dedicatoria
      → abrir la cotización en el editor y convertirla a pedido: el carrito
      debe cargar configurado y sin errores.
- [ ] 3.3 CONTRACT.md + memoria al día.
