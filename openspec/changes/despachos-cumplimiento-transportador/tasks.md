# Tareas

## Parte A
- [x] A1 `carrierCompliance.js` con fuentes de fecha, cobertura y calificación
- [x] A2 Integrarlo a `calcularDispatchInsights` (en paralelo; null si falla)
- [x] A3 Opttia: bloque `cumplimiento` con la guarda de números; controlador cuenta la sección
- [x] A4 MCP `get_dispatch_insights`: sección `cumplimiento`
- [x] A5 Pantalla: sección en `app-despachos-ia`
- [x] A6 Pruebas y contrato de solo lectura
- [x] A7 Medir la cobertura real en producción (solo lectura) y ajustar umbrales si hace falta
  - 13-oct, 60 días: ALMARA 1.759 entregas, 100 % con fecha, 12 mensajeros calificados, todos 100 % a tiempo (entrega el mismo día: 790 de 793 fechas reales caen el día pactado; no es un artefacto). ALMACEN BOMBAS 14 entregas, ninguno llega a 20. OH MY STORE y CAFE ESCOBAR: 2 entregas cada una, porque casi nada se cierra como Entregado. Umbrales sin cambio.
- [x] A8 Commit, despliegue (back + front) con OK de Daniel y prueba en Chrome
  - Back `93507ea` desplegado 13-oct; front en 2026.10.13.2 en adelante. Visto en Chrome (FLORECER): la sección sale con «0 de 0 entregas tienen fecha» y la pregunta «¿Qué transportador me cumple mejor?».

## Parte B (cada una: diff → OK → despliegue → verificar filas nuevas)
- [x] B1 Webhook de Osmosis/Cereza (aplicado en local con OK de Daniel 13-oct; prueba `tests/logistica/osmosisWebhookHistorial.test.js`)
- [ ] B2 Consulta (pull) de Osmosis
- [ ] B3 Fullpi
- [ ] B4 Prindel
- [ ] B5 Enviame
