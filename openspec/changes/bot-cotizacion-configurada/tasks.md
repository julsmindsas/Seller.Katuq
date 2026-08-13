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
- [ ] 2.4 Instrucciones de VENTA: sugerir un complemento pertinente (solo de
      resultados reales de búsqueda, con precio real), alternativa honesta
      cuando no hay existencias, ofrecer opcionales al cierre; prohibiciones
      explícitas — sin inventar descuentos ni urgencias, una sugerencia por
      momento, el "no" se respeta a la primera. Tests de instrucciones.

## 3. Imágenes

- [ ] 3.1 Backend: descarga de media del proveedor (GET media por id con las
      credenciales del comercio, tope de tamaño ~5 MB, solo jpeg/png/webp),
      SIN persistir — bytes en memoria al turno y se descartan. Tests del
      gate de tamaño/formato.
- [ ] 3.2 Despachador: tipo imagen deja de ser aviso cortés y va al agente
      con la foto + el caption como texto; audio/sticker/documento conservan
      el aviso. La ráfaga no agrupa imágenes (una foto = un turno). Tests.
- [ ] 3.3 ADK: endpoint y pipeline aceptan imagen (base64 + mime) y arman el
      turno multimodal; instrucciones para describir-buscar-ofrecer y para
      pedir texto cuando la imagen no se entienda. Tests.
- [ ] 3.4 Fallo limpio: imagen pesada/formato raro → respuesta amable pidiendo
      texto; error de descarga → aviso cortés de siempre. Nunca truena.

## 4. Verificación

- [ ] 4.1 Suites backend + ADK en verde; contract test del write-set intacto.
- [ ] 4.2 Prueba real en el piloto: pedido con domicilio + fecha + dedicatoria
      (y mandando una FOTO de un producto) → abrir la cotización en el editor y convertirla a pedido: el carrito
      debe cargar configurado y sin errores.
- [ ] 4.3 CONTRACT.md + memoria al día.
