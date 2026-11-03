# Facturación electrónica: tablero de estado DIAN y alertas visibles

**Estado:** borrador — pendiente aprobación de Daniel
**Ticket:** 1491 (hallazgo M8) · **Decisión:** D-622 (por registrar en `specs/CONTRACT.md`)
**Origen:** diagnóstico QA del 30-oct (ALMARA / JULSMIND SAS)

## Por qué

«Configuración DIAN» abre «Preparemos tu facturación electrónica» en el paso 1 aunque el comercio ya factura en producción. No hay un resumen de estado, y en el mismo encabezado hay un ícono vacío y pasos con texto cortado («Rango de …», «Confirmar an…»). El comercio siente miedo a desconfigurar y no ve lo que le importa: resolución, rango, consecutivos que quedan, vigencia de la resolución y vencimiento del certificado. Pide (1) un tablero de estado con el asistente detrás de «Editar» y (2) alertas a 30, 15 y 5 días y con menos del 10 % de consecutivos.

El ticket llegó sin comentarios (0), sin tickets relacionados, registrado el 2026-10-30T19:07Z.

## Causa probable de que el asistente reaparezca

Leído en el código el 2026-11-03, sin consultar datos (D-579). **No es un dato mal guardado: es el comportamiento diseñado.** No existe ninguna condición que decida mostrar el paso 1; el paso 1 es el único punto de entrada:

- `facturacion-electronica.component.ts:667`: `goToConfiguration()` siempre navega a `/integrations/configure?provider=dian`.
- `integrations.component.ts:236-237`: con `provider=dian` llama a `openDianFromDirectRoute()`.
- `integrations.component.ts:269-296`: lee la configuración guardada (`getIntegration('dian', true)`), la carga con `editIntegration(...)` (línea 292) y **a continuación fija `this.dianStep = 1`** (línea 295, y otra vez en el error 404, línea 304, y en 314). No consulta `integration.enabled` ni `config.environment === 'produccion'`.
- `integrations.component.html:1880-1919`: con tipo `dian` siempre pinta la cabecera del asistente (`dk-wizard`) y, con `dianStep === 1`, el paso «Comercio». Solo al guardar en la misma sesión pasa a 5 (línea 1934).

Los otros dos síntomas tienen causa visible:
- **Ícono vacío:** el catálogo declara `logo: "assets/images/logos/dian.svg"` (`integrations.service.ts:1810`) y ese archivo **no existe** en `src/assets` (probable causa; confirmar en el navegador).
- **Pasos cortados:** `.dk-rail__copy strong` y `small` llevan `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` dentro de cinco pasos en fila (`integrations.component.scss:64`).

## Qué datos ya existen para el tablero

Sin backend nuevo: la página de Facturación y el asistente ya leen la misma configuración (`config.environment`, `enabled`, `config.numbering` con `resolutionNumber`, `prefix`, `from`, `to`, `current`, `validFrom`, `validTo`). Consecutivos: usados = `current − from`; restantes = `to − current + 1` (la misma cuenta de `numbering.js` y de `alertasPreventivas.js`).

| Dato | Fuente | Estado |
|------|--------|--------|
| Ambiente, estado | `config.environment`, `enabled` | Disponible |
| Resolución, prefijo, rango, próximo consecutivo, vigencia | `config.numbering` | Disponible |
| Vencimiento del certificado | `config.certificateExpiresAt` (se guarda desde D-500) | Disponible en lo guardado desde D-500; si falta, `GET /v1/accounting/invoicing/summary` lo calcula al vuelo, pero está tras la bandera `invoicingHub` y los roles de facturación |
| Rechazos sin resolver, correo | `invoicing/summary` (`reasons`) | Opcional, solo con `invoicingHub` |

## ¿`alertasPreventivas.js` ya hace algo de esto?

**Sí, casi todo, pero solo por correo y campana.** D-448 (ticket 1271, publicado) corre cada día a las 7 AM (`cronService.js initDianAlertasJob`) y, para empresas con DIAN en producción, avisa **una sola vez por umbral** al Administrador y al Contador, por correo y en la campana (`ActualizacionTicket{empresa}`):

- rango: 80, 90 y 95 % usado, y agotado (quedan ≤ 20 %, ≤ 10 %, ≤ 5 % y 0): **el pedido de «menos del 10 %» ya existe como el umbral del 90 %**;
- resolución: 30, 15 y 5 días, y vencida;
- certificado: 30, 15 y 5 días, y vencido.

Lo que **no** existe y pide el ticket: ver el estado y las alertas **en pantalla**, en cualquier momento, para cualquier usuario que entre a Facturación. Un aviso único por correo se pierde; el tablero lo deja a la vista mientras siga vigente. Por eso esta propuesta **no cambia el cron ni sus umbrales**.

## Qué cambia

1. **Tablero de estado primero.** Si el comercio ya está habilitado (`enabled` y ambiente producción), «Configuración DIAN» abre un tablero con ambiente, resolución, prefijo y rango, consecutivos usados y restantes (con barra), próximo consecutivo, vigencia de la resolución y vencimiento del certificado, y el asistente queda detrás de «Editar». Sin configuración, en pruebas o con error de carga, todo sigue como hoy.
2. **Alertas en pantalla** con los mismos umbrales de D-448 (30/15/5 días; rango con aviso al 80 %, alerta al 90 % y crítico al 95 %), en el tablero y como una línea en la franja de Facturación que lleva al tablero.
3. **Dos arreglos de presentación** en el asistente: ícono que sí cargue y pasos que no se corten.

**Recomendación técnica (a aprobar):** solo front. Las alertas se calculan en el navegador con los umbrales de D-448 en una constante comentada que remite a `alertasPreventivas.js`. Alternativa: el servidor devuelve las alertas reutilizando `evaluar()` (una sola fuente de verdad) como campo aditivo de `invoicing/summary`; evita duplicar umbrales pero lo deja tras `invoicingHub`. Decide Daniel.

## No-goals

- No cambia el cron, los correos, `dian_alertas`, las marcas de aviso ni sus destinatarios.
- No cambia la numeración, la resolución ni el certificado: el tablero solo lee; editar sigue siendo el asistente actual.
- No muestra claves ni el certificado (solo la fecha de vencimiento).
- No agrega varias resoluciones ni rango de notas crédito y débito (FE-01b y hoja de ruta).
- No cubre Siigo ni World Office (Artículo VI).
- No crea colecciones ni endpoints.

## Riesgos (módulos sensibles)

- **Consecutivos:** el tablero lee `current`, `from` y `to`; no los escribe ni los recalcula. Si un valor falta o es inválido, muestra «Sin dato» y no una cifra inventada.
- **Dos fuentes de umbrales** (front y cron) pueden divergir; la spec los fija iguales y la tarea de cierre los compara.
- **Falsa tranquilidad:** certificado sin fecha guardada (cargado antes de D-500) no alerta; el tablero lo dice («Sin dato») en vez de mostrarlo en verde.
- **Usuarios no administradores:** hoy el cron avisa solo a Administrador y Contador; el tablero lo vería cualquiera con acceso a Facturación. No muestra secretos, pero Daniel confirma si debe limitarse por rol.
- **Reglas de diseño:** ver más abajo; los CSS globales (`[class*="p-"]`, `span.ng-star-inserted`) pisan clases nuevas.

## Diseño y reglas

Pantalla interna de configuración: base `shared/styles/_config-pagina.scss` (D-400: `cfg-pagina`, `cfg-cabeza`, `cfg-card`, `cfg-aviso`) y tokens de `openspec/specs/design-system/spec.md`; plano, acento `#5F3FE0`, semánticos fuerte/fondo suave, sin gradientes ni primarios paralelos, ningún nombre de clase con «p-». 1440 y 390 px sin scroll horizontal. Solo presentación: el asistente conserva campos, validaciones, pasos y textos. Textos en `es.json`; nota de versión al publicar (D-567). Pruebas nuevas quedan fuera de git (D-566).

## Preguntas para Daniel

1. ¿Alertas calculadas en el navegador (recomendado) o expuestas por el servidor con `evaluar()`?
2. ¿Se muestra el aviso del 80 % (D-448) o solo desde el 90 %, que es lo que pide el ticket?
3. ¿El tablero lo ven todos los roles con acceso a Facturación o solo Administrador y Contador?

## Capacidad

Delta sobre `facturacion-electronica` (`specs/facturacion-electronica/spec.md`).
