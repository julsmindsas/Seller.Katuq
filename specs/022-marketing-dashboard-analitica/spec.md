# Spec 022 — Módulo Marketing: Dashboard + Analítica (MVP)

> Estado: **MVP implementado — pendiente validación en navegador + commit** (D-090)
> Autor(es): Daniel + Claude
> Última actualización: 2026-07-12
>
> Implementación MVP: `/marketing` (lazy) con KPIs+gráfica de ventas (dashboard-core), embudo CRM
> (crm/stats) y actividad WhatsApp (conversations). "Clientes nuevos vs recurrentes" del período
> quedó FUERA del MVP: la única fuente hoy es el heurístico frágil (`nroPedido` sufijo '-1') que
> el criterio EARS prohíbe — se muestra `nuevos30d` del CRM (real) y el cálculo honesto sobre
> pedidos queda para la fase 2 (requiere agregación backend nueva).

## 1. Contexto / Por qué
El comerciante no tiene una vista de marketing: cuántos clientes nuevos gana, cuánto recompran, cómo rinde su embudo CRM ni qué tracción tiene el canal WhatsApp (ya productivo). Existe un scaffold de módulo de marketing abandonado (roto, sin cablear) y una suite de analítica en backend parcialmente real. El MVP entrega la **capa de visibilidad** (dashboard read-only); las campañas/automatizaciones vienen en fases posteriores.

## 2. Objetivo de negocio
Un comerciante abre "Marketing" en el menú y ve, para SU empresa y un rango de fechas: adquisición de clientes, recompra/retención, embudo CRM y actividad WhatsApp — con datos 100% reales (ninguna métrica inventada). Decisiones tomadas: MVP = dashboard+analítica; audiencias desde el CRM existente; se reusa la estructura del módulo scaffold.

## 3. User stories
- Como **comerciante** quiero ver clientes nuevos vs. recurrentes por período para saber si estoy creciendo o solo rotando.
- Como **comerciante** quiero ver mi embudo CRM (leads por etapa, conversión, ganados verificados) para saber dónde se caen mis oportunidades.
- Como **vendedor/administrador** quiero ver la actividad WhatsApp (conversaciones, respuestas pendientes) para medir la tracción del canal.
- Como **comerciante** quiero filtrar todo por rango de fechas y comparar contra el período anterior.

## 4. Criterios de aceptación (notación EARS)
- **THE** dashboard **SHALL** mostrar únicamente datos de la empresa del usuario logueado (multi-tenant estricto).
- **IF** una métrica no puede calcularse con datos reales (ej. gasto publicitario, efectividad por canal externo) **THEN THE** system **SHALL** omitirla u ofrecerla como "no disponible" — nunca mostrar valores estimados/ficticios como reales.
- **WHEN** el usuario selecciona un rango de fechas **THE** system **SHALL** recalcular todas las tarjetas y gráficas del dashboard para ese rango, con comparativo vs. el período anterior equivalente.
- **THE** dashboard **SHALL** incluir como mínimo: (a) clientes nuevos vs. recurrentes y tasa de recompra; (b) embudo CRM por etapa con tasa de conversión; (c) ventas atribuibles a clientes nuevos vs. recurrentes; (d) actividad WhatsApp (hilos activos, sin responder).
- **WHEN** el módulo está deshabilitado para la empresa (flag) **THE** system **SHALL** ocultar la entrada del menú y bloquear la ruta.
- **WHILE** los datos cargan **THE** system **SHALL** mostrar estados de carga por tarjeta (no bloquear la página completa) y estados vacíos accionables si no hay datos.
- **IF** el cálculo de "cliente nuevo" no puede determinarse con certeza para un pedido **THEN THE** system **SHALL** clasificarlo de forma consistente y documentada (no heurísticos frágiles tipo sufijo de consecutivo).
- **THE** system **SHALL** corregir el defecto existente F-01 (agregación de pedidos sin filtro de empresa) antes de exponer cualquier métrica basada en esa ruta.

## 5. Requisitos no funcionales
### 5.1 Performance
- Carga inicial del dashboard (datos críticos) p95 ≤ 3 s para empresas con ≤ 50k pedidos; detalle diferido en segundo plano.
### 5.2 Seguridad
- Toda consulta filtrada por empresa server-side; el rol del usuario limita lo visible (vendedor ve lo suyo donde aplique, patrón spec 006/011).
### 5.3 Observabilidad
- Latencia y errores por endpoint de métricas; log estructurado con empresa y rango consultado (sin datos personales).
### 5.4 Accesibilidad
- Navegación por teclado; textos alternativos en gráficas (tabla accesible equivalente).
### 5.5 Resiliencia
- Fallo de una fuente (ej. WhatsApp) degrada solo su tarjeta, no el dashboard completo.

## 6. Out of scope (explícito)
- ~~Envío de campañas WhatsApp~~ → **INCORPORADO como fase 2 (D-091, 2026-07-12)**: wizard audiencia CRM → plantilla HSM → confirmación con saldo → envío secuencial vía `start-conversation` (débito server-side). Quedan para fase 3: historial/persistencia de campañas, runner backend (envío que sobreviva al navegador), programación, tope >100.
- Campañas email/SMS, automatizaciones, recuperación de carritos, editor de plantillas, constructor de segmentos avanzado — fases 3+.
- Integración con plataformas publicitarias externas (Meta/Google Ads) y por tanto CAC/ROI con gasto real.
- Tracking de apertura/clic de emails (spec 010 no lo captura hoy).
- Persistir eventos de marketing nuevos (colección nueva) — regla del repo: no colecciones nuevas en el MVP.

## 7. Dependencias
- Suite analítica backend existente y CRM stats (spec 011) — ver `findings.md`.
- Canal WhatsApp productivo (specs 009.x) para la tarjeta de actividad.
- Regla de roles/vendedor de spec 006 (filtro server-side).

## 8. [NEEDS CLARIFICATION]
- [ ] ¿El flag del módulo es por empresa (config en documento de empresa) o global? Propongo por empresa, default OFF, piloto con 1-2 comercios.
- [ ] La entrada del menú "Marketing" ya agrupa "Conversaciones WhatsApp" — ¿el dashboard entra como "Marketing > Dashboard" en esa misma sección? (propuesta: sí).
- [ ] ¿La definición de "cliente nuevo" es: primera compra histórica en la empresa (requiere lookup del historial), aceptando el costo de cómputo? (propuesta: sí, con precálculo si hace falta).
- [x] F-01 (fuga cross-tenant en la métrica existente) — **RESUELTO 2026-07-12**: corregido de inmediato como fix suelto y desplegado a prod (commit backend `6c0499b`). Filtro `company` desde header autenticado + 400 si falta, patrón de los handlers hermanos.

## 9. Riesgos identificados
- **R-01**: métricas "bonitas pero falsas" — el endpoint actual mezcla datos reales con estimados; si el MVP los muestra sin depurar, el comerciante decide sobre mentiras. Mitigación: criterio EARS de "solo datos reales".
- **R-02**: costo de cómputo de "cliente nuevo" real sobre historial completo en empresas grandes (mismo patrón de lentitud que spec 019). Mitigación: presupuesto de performance + precálculo si se excede.
- **R-03**: el scaffold reusa un guard/flag (`ENABLE_MARKETING_MODULE`) no conectado a config real — definir su fuente en plan.
- **R-04**: doble servicio de analytics en el front (dos archivos) — riesgo de divergencia; el plan debe elegir el canónico.

## 10. Métricas de éxito post-launch
- Piloto: ≥1 comercio consulta el dashboard ≥3 veces/semana durante 2 semanas.
- 0 discrepancias reportadas entre métricas del dashboard y conteos reales verificables (pedidos/clientes) en el piloto.
- p95 de carga inicial ≤ 3 s sostenido en el piloto.

---
**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
