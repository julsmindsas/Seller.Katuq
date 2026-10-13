# Diseño: cumplimiento por transportador

## Parte A (solo lectura)

- `services/logistics/carrierCompliance.js`:
  - `calcularCumplimiento({ db, company, ahoraMs })` lee y calcula.
  - Funciones puras: `normalizarEntrega`, `fecharEntregas` y `medirCumplimiento`.
- **Pedidos:** entregados (`estadoProceso == "Entregado"`) con `fechaEntrega` en los últimos 60 días.
  - Van dos consultas, porque `fechaEntrega` está guardada como texto y como Timestamp. Usan el índice existente `company + estadoProceso + fechaEntrega`.
  - Llevan `select` y un tope de 3.000.
- **Historial:** se consulta `order_status_history` con `orderId in [30]`, solo para los pedidos sin fecha real ni aviso de Osmosis.
  - Tope de 50 consultas, 5 en paralelo, sin índice nuevo.
  - Si el historial trae `company` y es otra empresa, no cuenta.
- **Qué se excluye:** POS y anulados. Tampoco cuenta un cierre en lote desde la pantalla (`source: editBatch`): no es la fecha de entrega.
- **Cálculos:**
  - A tiempo = día de entrega (hora de Colombia) ≤ día pactado.
  - Días de despacho a entrega = mediana.
- **Calificación:** se califica con ≥ 20 entregas con fecha y ≥ 70 % de cobertura. "Sin transportador" nunca se califica. Si un transportador no califica, no se le calcula porcentaje.
- **Panel:** `calcularDispatchInsights` lo trae en paralelo con los pedidos activos. Si falla, `cumplimiento: null` y el resto del panel sale igual.
- **IA:** Opttia recibe solo cifras.
  - Al que no califica no se le pasa porcentaje, y el prompt le prohíbe decir si cumple.
  - Un número inventado se descarta.
- **Herramienta MCP:** `get_dispatch_insights` suma la sección `cumplimiento`.
- **Pantalla:** sección "Cumplimiento por transportador" en el panel IA de Despachos.
  - Pastilla "% a tiempo" o "No se puede medir".
  - Texto de cómo conseguir fechas.

## Parte B (escritura en `order_status_history`, una integración por cambio)

En cada sincronización o webhook que hoy cambia `estadoProceso` sin historial, llamar a `recordOrderStatusChange` después del `update`.
- La llamada nunca lanza error y no toca el pedido.
- Orden: webhook de Osmosis, consulta de Osmosis, Fullpi, Prindel y Enviame.
- `source` con el nombre de la integración (`osmosisWebhook`, `osmosisPull`, `fullpiPull`, `prindelTracking`, `enviameWebhook`).

## Pruebas

- `tests/logistica/carrierCompliance.test.js`:
  - fuentes de fecha;
  - calificación;
  - punta a punta con Firestore falso: empresa, `select`, lotes de 30, sin escrituras;
  - IA;
  - MCP.
- `dispatchInsightsSoloLectura.contract.test.js` incluye el archivo nuevo.
