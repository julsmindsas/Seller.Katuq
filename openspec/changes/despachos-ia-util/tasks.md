# Tasks — despachos-ia-util

- [x] 0.1 Medición en producción (solo lectura, desde el servidor): ver tabla del proposal.
- [x] 1.1 `frasesVerificadas.js` extraído de la IA de inventarios, sin cambiar su comportamiento (sus pruebas siguen en verde).
- [x] 1.2 `dispatchInsights.js`: normalización, tramos, sin cerrar, avisos y composición, con pruebas.
- [x] 1.3 Explicación con Opttia y prompt, con pruebas (incluida la ausencia de datos del cliente).
- [x] 1.4 Endpoints `GET/POST /v1/logistica/insights[/explicar]`.
- [x] 1.5 Herramienta MCP `get_dispatch_insights` + política + ADK, con prueba sin red.
- [x] 1.6 Contrato de solo lectura.
- [x] 2.1 Front: `app-despachos-ia` reemplaza las "Recomendaciones KAI"; build sin errores.
- [x] 3.1 *(11-oct: backend e9fbb6b, ADK b8f6c2e, front 2026.10.11.3; probado con ALMACEN BOMBAS: panel, Opttia en 7 s, de "usted")* Desplegar backend, ADK y front; probar en producción con un comercio real.
- [x] 3.2 Registrar en CONTRACT.
- [ ] Fase 2 (fuera de este cambio): cumplimiento por transportador con `order_status_history`.
