# Spec NNN — <Nombre de la feature>

> Estado: **draft** | in-review | approved | superseded
> Autor(es): <nombre(s)>
> Última actualización: YYYY-MM-DD

## 1. Contexto / Por qué
> Una o dos líneas: qué problema de negocio resolvemos y por qué ahora.

## 2. Objetivo de negocio
> Resultado observable cuando esta spec esté implementada. Mide algo concreto.

## 3. User stories
- Como **<rol>** quiero **<acción>** para **<valor>**.
- Como ...

## 4. Criterios de aceptación (notación EARS)

> Usa los patrones EARS. Cada criterio debe ser testeable de forma binaria.

- WHEN <trigger> THE system SHALL <respuesta>.
- WHILE <estado> THE system SHALL <comportamiento>.
- IF <condición indeseada> THEN THE system SHALL <respuesta>.
- WHERE <feature opcional presente> THE system SHALL <respuesta>.
- THE system SHALL <comportamiento siempre verdadero>.

## 5. Requisitos no funcionales

### 5.1 Performance
- Latencia p95 ≤ Xms en el endpoint Y bajo carga Z.

### 5.2 Seguridad
- Autenticación, firma, rate-limit, inputs sanitizados, secretos fuera del log.

### 5.3 Observabilidad
- Logs estructurados con `correlationId`. Métricas de latencia/éxito/error. Alertas si N% de errores en M minutos.

### 5.4 Accesibilidad (si aplica UI)
- Niveles WCAG, navegación por teclado, ARIA roles donde corresponda.

### 5.5 Resiliencia
- Idempotencia, reintentos, dead-letter queue, comportamiento ante caída del proveedor.

## 6. Out of scope (explícito)
- Lo que NO va en esta spec. Reduce malentendidos.

## 7. Dependencias
- Otras specs (`[[NNN-slug]]`), proveedores externos, equipos.

## 8. [NEEDS CLARIFICATION]
> Preguntas abiertas que deben resolverse antes de pasar a plan. Si quedan abiertas, no se planea.

- [ ] Pregunta 1
- [ ] Pregunta 2

## 9. Riesgos identificados
- R-01: ...
- R-02: ...

## 10. Métricas de éxito post-launch
- Métrica 1, umbral, ventana.
- Métrica 2, umbral, ventana.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
