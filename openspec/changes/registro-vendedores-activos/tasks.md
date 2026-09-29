## 0. Decisiones
- [ ] 0.1 Daniel aprueba la propuesta (y si la personalización, la parte 4, entra ahora o después).
- [ ] 0.2 Registrar D-327 en `specs/CONTRACT.md`.

## 1. Backend
- [ ] 1.1 Prueba de contrato:
  - `pedidosSemana` y `origenCampana` guardados;
  - `vendedorActivo` y `eventId` en la respuesta de aprobar y de confirmar;
  - nada en `verify` sin confirmar;
  - métrica por campaña que excluye prueba y sin verificar.
- [ ] 1.2 `saveSurveyResponse` y `/v1/registro/confirmar`.
- [ ] 1.3 `GET /v1/registro/metricas-campana` y `PUT` del costo (`config/pautaCostos`).
- [ ] 1.4 El adaptador de la API de conversiones, apagado.

## 2. Front
- [ ] 2.1 `perfil` en `capturarOrigen`, la lista `PERFILES_REGISTRO` y los botones opcionales en el primer paso, solo con `perfil=vendedor`. Sin la marca, prueba de que el registro no cambia.
- [ ] 2.2 `CompleteRegistration` + `VendedorActivo` con `event_id` (Meta y TikTok); `pedidos_semana`, `calificacion` y `lead_score` solo con respuesta, también en `Lead`.
- [ ] 2.3 La tabla por campaña en el panel del Super Admin.
- [ ] 2.4 `npm run build` sin errores.

## 3. Despliegue (con OK de Daniel, antes del 1-oct)
- [ ] 3.1 Backend y front, midiendo cada rama contra producción.
- [ ] 3.2 Verificar en Events Manager (herramienta de prueba de eventos) que llegan los dos eventos con sus parámetros. Marketing crea la conversión personalizada.

## 4. Fase 2 (opcional)
- [ ] 4.1 La configuración inicial según los pedidos por semana.
