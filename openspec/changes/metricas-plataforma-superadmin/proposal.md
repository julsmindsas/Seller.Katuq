> **Estado:** borrador de la fase «Especificar», revisado el 5-nov-2026. Pendiente de aprobación de Daniel. Sin `design.md`, `tasks.md` ni código.
> **Decisión:** D-700 (verificada libre en `specs/CONTRACT.md` de esta rama el 5-nov-2026; el orquestador confirma contra la rama principal al registrarla).
> **Origen:** petición del dueño (Daniel, Super Administrador de Julsmind) y revisión del código de la Consola de plataforma. Cada problema de la lista indica dónde se verificó; lo no verificado se rotula así. Módulos sensibles: cobros, autenticación y rutas de plataforma, pedidos (solo lectura), Opttia.

## Why

Daniel pidió: «métricas muy verídicas de cómo van nuestros comercios» (los clientes de Katuq), «más bonitas, más fáciles de leer», que se puedan consultar con Opttia, «algo muy pro» para decidir cómo mejorar la plataforma, y un detalle del comercio con suscripción, último pago y último ingreso «más detallada en otro lado».

La Consola de plataforma (`/empresas`) ya existe, pero la revisión del código encontró que varias cifras no son confiables. Problemas, por impacto (fuente entre paréntesis; rutas del backend privado `katuq_admin_back_firebase/functions`):

1. **«Ingreso del mes» es una estimación, no dinero cobrado.** Sale de un escalón estimado (`controllers/platformOverview.js`, `estimarEscalon` y `ingresoEstimadoCOP`, tabla de planes en dólares convertida con la TRM del día); «Cobros» suma el monto del periodo (`controllers/billingOverview.js`). No existe cobrado real ni mora en pesos. El caso de empresas con ventas 0 y las inactivas dentro del estimado: **a verificar en el diseño**.
2. **«Mes actual» subestimado y dos relojes de mes.** La Consola mide por fecha de entrega (D-345 «La consola cuenta pedidos por MES CALENDARIO y sin caídos»); el cobro y la ventana de 30 días miden por creación. Un pedido creado este mes con entrega futura puede quedar fuera (a verificar con el rango actual).
3. **Fechas con formatos mezclados** (UTC, -05:00, sin zona) comparadas como texto: los bordes de mes pueden mover pedidos (a verificar en el diseño).
4. **Los totales cuentan cortesías, demo y la propia Julsmind.** Hoy solo `metricsExcluded` filtra (`controllers/platformOverview.js:194`); `cobroCortesia` y `premiumOrigen` viven en otros lugares (`controllers/subscriptions.js`). No hay un campo único de tipo de cuenta.
5. **«En riesgo» y «sin movimiento» ignoran la edad de la empresa**, y «último ingreso» mide solo el login (`services/platformMetrics/companyAge.js`).
6. **«Por cobrar» puede diferir entre tarjeta y lista** (el backend y el front aplican reglas distintas; a verificar en el diseño).
7. **Premium, plan de pago y activo tienen definiciones distintas** según la pantalla. Por ejemplo, `pagaPlan` (`services/platformMetrics/planPricing.js:92`) considera de pago todo plan que no sea «freemium» o «free», y «activa» usa otra regla en `services/companies/cicloVida.js`.
8. **Varias definiciones de «venta válida»** y dos formas de calcular el total del pedido (a verificar).
9. **«Última factura» no es «último pago»**: el último pago aprobado vive en varias fuentes que pueden discrepar (a verificar).
10. Otros: clientes y pedidos históricos que cuentan cancelados, empresas sin `nombre` que desaparecen, «resueltos» que incluye «archivado», censo de integraciones que mide conexión y no uso.

Además, **nada se guarda en el tiempo** (no hay tendencias, cohortes ni cierre de mes) y no hay historial de uso por módulo.

Los conteos puntuales vistos en comentarios del código (65 empresas, 10 premium, 348 s de carga en ALMARA) son de septiembre y **no están verificados** contra la base actual; esta propuesta no los usa como evidencia.

## What Changes

- **Una sola capa de cálculo** de métricas de plataforma, con definiciones únicas y versionadas. Pantalla, PDF/CSV y Opttia consumen lo mismo.
- **Universo «comercio real»**: Julsmind, demo, prueba y cortesía no entran en los totales; se listan aparte. Se introduce un tipo de cuenta explícito.
- **Mes oficial por fecha de creación del pedido** («por ahora», decisión 1). La referencia de mes forma parte de la versión de la regla, para poder cambiarla sin reescribir la historia.
- **Honestidad del dato**: lo desconocido es «—» (nunca 0); cada cifra lleva fecha de cálculo y versión de la regla.
- **Verdad del dinero**: contratado (estimado), cobrado (pagos aprobados por Wompi más pagos manuales auditados), por cobrar y mora; «último pago aprobado» único.
- **Tablero** legible, con gráficos, orden y diseño Katuq; **ficha 360** del comercio en pantalla aparte y enlazable.
- **Opttia de plataforma**: preguntas en lenguaje natural solo para usuarios autorizados explícitamente, solo lectura, sobre cifras ya calculadas, con auditoría y defensas contra inyección.
- **Señales de salud** transparentes. **Historia**: snapshots diarios, uso por módulo y sesiones (sobre D-634).
- **Acceso** estricto de Super Administrador de la empresa operadora (aprobado por Daniel el 5-nov-2026).

## Capabilities

### New Capabilities
- `platform-metrics-definitions`: universo «comercio real», tipo de cuenta, estados, fechas y reglas únicas.
- `platform-metrics-formulas`: fórmula, universo y ventana de cada métrica del tablero.
- `platform-billing-truth`: contratado, cobrado, por cobrar y mora; pago manual auditado; último pago aprobado.
- `platform-dashboard`: tablero de plataforma, legibilidad y gráficos.
- `company-360`: ficha detallada de un comercio.
- `platform-opttia`: acceso, alcance y respuestas de Opttia de plataforma.
- `platform-opttia-safety`: datos que ve el modelo, inyección, auditoría y tope de uso.
- `platform-health-signals`: riesgo, segmentos, adopción, calidad de datos y sugerencias.
- `platform-history`: snapshots diarios, retención, uso por módulo y sesiones.
- `platform-access`: quién puede ver, consultar y escribir.

### Modified Capabilities
- Ninguna archivada. Cambian las tarjetas actuales de la Consola (Empresas, Cobros del mes), que pasan a las definiciones nuevas.
- **D-345 (mes por entrega): parcialmente reemplazada.** Deja de ser la vista oficial; sigue vigente como vista secundaria rotulada «por entrega». No queda SUPERSEDED por completo.
- **D-277 («La franja de la consola: de 10 tarjetas a 6 + línea de filtros»): se conserva su criterio** (cuánto voy a facturar, a quién estoy por perder, a quién llamo hoy). Las 6 tarjetas se mantienen como cifras clave y cambian de definición a las de esta propuesta; el contrato debe anotarlo al registrar D-700.

## Decisiones del dueño (5-nov-2026)

1. **Mes oficial por fecha de creación del pedido**, «por ahora» (como el cobro). La vista por entrega (D-345) puede quedar como vista secundaria rotulada.
2. **Sí**: Julsmind, demo, prueba y cortesía no cuentan como comercio real; se autoriza un campo de tipo de cuenta. `tipoCuenta` es el nombre pedido por el dueño: es una **excepción al canon de campos en inglés** que se registra en el contrato.
3. **Sí**: colección derivada y borrable de snapshots diarios por empresa.
4. **Sí a ambos**: historial de sesiones/logins y registro de uso por módulo, apoyado en `openspec/changes/sesiones-y-tiempo-conectado` (D-634, ticket 1506, borrador) sin duplicarla.
5. **Opttia de plataforma: solo el dueño**, con lista explícita de autorizados en Firestore (D-505, «Toda configuración de empresa vive en Firestore»), no solo por rol.
6. **Cobrado real = pagos de Wompi** más un mecanismo **manual** para marcar el pago del mes, auditado (quién, cuándo, monto, medio, soporte). El estado del cron de cobro automático NO fue confirmado: es un dato a verificar.

## Toma de D-634 y aporte de esta propuesta

| Tema | D-634 (`sesiones-y-tiempo-conectado`) | Esta propuesta |
|---|---|---|
| Registro de sesiones, tiempo conectado, sesiones abiertas | Lo define y lo escribe | Solo lo lee, agregado por comercio; no crea otro registro |
| Retención de sesiones | 13 meses | La cita, no la redefine |
| Seguimiento por comercio con bandera | Solo registra donde está encendida | Rotula «no medido» al comercio sin seguimiento; no lo cuenta como inactivo |
| Vista del equipo Katuq por comercio | Define su vista general | La ficha 360 enlaza o incorpora esa vista; no la rehace |
| Uso por módulo (pantallas abiertas) | No lo cubre (excluye páginas visitadas) | Aporta un conteo diario por comercio y módulo, sin usuario individual |

El historial de sesiones de esta propuesta **espera a que D-634 esté aprobada e implementada**; el resto avanza sin ella.

## Fases

### F1 — Datos existentes (sin escrituras nuevas)
- Universo «comercio real» con las señales de cuenta ya existentes, y reglas y fórmulas únicas.
- Corregir los problemas 2, 3, 4, 5, 6, 7, 8 y 10 de la lista en la capa única.
- Contratado, cobrado a partir de los pagos de Wompi y facturas pagadas, por cobrar y mora; último pago aprobado en fila y ficha. Aún sin pago manual.
- Tablero con gráficos y rediseño; ficha 360 con lo existente.
- Señales de salud (`platform-health-signals`): segmentos y calidad de datos sobre agregados existentes; adopción rotulada «configurado»; riesgo parcial rotulado.
- Acceso estricto (aprobado por Daniel el 5-nov-2026; la lista de operadores se confirma antes de publicar).
- **Opttia no se abre en F1**: nace apagada y solo se enciende cuando existe la auditoría (F2). Sin auditoría, falla cerrado.

### F2 — Datos nuevos (cada escritura nueva con su aprobación)
- `tipoCuenta` y motivo de baja estructurado, con bitácora.
- Pago manual del mes (registro auditado) y su efecto en cobrado, por cobrar y mora.
- Snapshots diarios (tendencias, cohortes, cierre de mes) y, con ellos, adopción «usada», tendencia y motivo de baja agrupado.
- Uso por módulo; historial de sesiones (cuando D-634 esté lista).
- **Opttia de plataforma con su auditoría y tope diario.**
- Notas internas de la ficha: **fuera hasta que Daniel las apruebe** (ver Preguntas abiertas).
- Índices nuevos que las lecturas pesadas exijan (decisión de diseño; con el sí de Daniel, en el orden índices, código, datos, verificación).

## Impacto

- **Backend** (repo privado): servicios de métricas de plataforma, rutas de compañías, cobros y plataforma. Detalle en `design.md`.
- **Frontend**: la Consola de `/empresas` y una pantalla nueva de ficha 360; servicios que extienden `BaseService`.
- **Opttia**: cómo se construye (agente, herramientas, transporte) se decide en `design.md`, no aquí.
- **Sin nota de versión para comercios**: es solo superadmin.

### Write-set declarado

| Colección o dato | Acceso | Fase |
|---|---|---|
| `companies`, `users`, `subscriptions`, `billing_invoices`, `metricas_empresas`, `integration_configs`, tickets de soporte, `feature-requests`, `aiUsage` | Solo lectura | F1 |
| `orders`, `inventory`, `inventoryMovement`, `products`, precios y listas de precios | Solo lectura (agregados); **ninguna escritura** | F1–F2 |
| `tipoCuenta` y motivo de baja de la empresa (con su bitácora de valor anterior y nuevo) | Escritura nueva, acotada | F2 |
| Registro de pago manual (nueva colección, solo anexar) | Escritura nueva, auditada | F2 |
| Snapshots diarios de métricas por empresa (nueva colección derivada y borrable) | Escritura nueva | F2 |
| Resultado precalculado o recálculo bajo demanda | **No declarado.** Si el diseño lo necesita, es una excepción a «sin capas de cache nuevas» (`openspec/config.yaml`) y requiere aprobación explícita | — |
| Registro de uso por módulo (nueva colección, o reutilizar lo que ya guarden las notas de versión: **buscar primero**) | Escritura nueva | F2 |
| `userSessions` | Lo define y escribe D-634, no esta propuesta | F2 |
| Auditoría de Opttia de plataforma, de exportaciones y de aperturas de ficha (nueva colección, solo anexar) | Escritura nueva | F2 |
| Notas internas y próxima acción de la ficha (nueva colección) | **Sin aprobar**: fuera del alcance hasta que Daniel la apruebe | — |
| Lista de autorizados de Opttia, interruptores globales (Opttia, historia) y topes de uso en `config/{doc}` | Configuración en Firestore (D-505), escrita solo por Daniel | F2 |
| `apiUsage` | No se amplía ni se usa como fuente; las métricas usan solo datos de la sesión firmada | — |

Las colecciones nuevas requieren aprobación explícita de Daniel (`openspec/config.yaml`). Las decisiones 2 a 4 y 6 cubren tipo de cuenta, snapshots, sesiones/uso por módulo y pago manual; **la auditoría de Opttia, de exportaciones y de aperturas de ficha se confirma al aprobar el diseño**. Los identificadores de las personas autorizadas viven solo en Firestore: nunca en este repositorio público.

## No-goals

- Tocar el Firestore congelado de Katuq (D-579, «los datos de Katuq pasan de Firestore a PostgreSQL») ni borrar registros de `katuq-db`, cuentas o datos de prueba.
- SQL libre ni texto-a-SQL desde la IA; Genkit (D-257).
- Cambiar el Opttia de los comercios: su acceso, herramientas, permisos, topes y aislamiento por empresa quedan igual. La lista de autorizados solo se consulta en el camino de plataforma, y si falla o está vacía solo se cierra esa consulta (spec `platform-opttia`, «Opttia de los comercios no cambia»).
- Escribir en pedidos, inventario, productos o precios; cambiar escalones de precio o el motor de cobro.
- Activar, apagar o reparar el cron de cobro automático (solo se informa su estado).
- Cobrar o conciliar dinero automáticamente a partir del pago manual.
- Endpoints o colecciones «v2» sin aprobación; interruptores nuevos en `.env` (D-505).
- Usar como fuente de cifras de plataforma rutas que no pasen por `guardPlataforma`.
- Exponer datos personales de clientes finales de los comercios.
- Extender «Katuq en vivo» ni cerrar/limitar sesiones de usuarios (eso es D-634, fases 2 y 3), salvo lo dicho para su pregunta de plataforma en `platform-opttia`.
- Evaluar desempeño de personas ni medir «productividad».
- Métricas de unidades de inventario (quedan fuera; no se verificaron y no se mezclan con el dinero).
- Las pruebas nuevas no se suben a git (D-566).

## Riesgos (módulos sensibles)

- **Cobros** (`billingService`, `billingOverview`, `subscriptionPaymentService`): solo lectura salvo el pago manual, que escribe únicamente su colección y no altera facturas, suscripciones ni el próximo cobro. Un cambio a la vez con diff aprobado. Wompi: solo cuentan pagos verificados con el proveedor.
- **Autenticación y rutas de plataforma** (sensible): cambio de auth, con diff aprobado por Daniel y lista de operadores confirmada antes de publicar. El historial de sesiones toca `createToken` y el login (D-634); esta propuesta no los modifica.
- **Pedidos**: lecturas pesadas en `orders` (documentos de 20-30 KB) sobre Postgres sin rechazo por falta de índice. Se exige traer solo campos necesarios y paginar. Si el diseño necesita precalcular, es una excepción a «sin cache extra» y se pide aparte.
- **Opttia**: fuga entre comercios, llave de comercio con herramientas de plataforma, inyección por campos libres y salida de datos al proveedor de IA. Se mitiga con lista de autorizados verificada en cada llamada, fallo cerrado, ninguna herramienta de escritura, campos libres excluidos y auditoría.
- **Cifras históricas**: el dueño verá números distintos a los de hoy; cada cifra lleva su versión y el cambio se explica en pantalla.
- **Privacidad (Ley 1581)**: uso por usuario es dato personal. Finalidad, aviso, plazos de retención y supresión se fijan en `platform-history`. Solo nombre y rol, no correos ni teléfonos completos.
- **Manipulación de cifras**: reclasificar una cuenta o registrar un pago manual cambia totales y mora. Por eso hay bitácora con valor anterior y nuevo, idempotencia y visibilidad de reclasificadas con mora abierta.

## Preguntas abiertas

Valores propuestos entre corchetes en las specs; Daniel los confirma o cambia. **Obligatorias antes de aprobar las specs** (tocan seguridad y privacidad): 2, 3, 4 y 7.

1. **Antigüedad mínima para «en riesgo»**: se propone [30 días]. Pesos del puntaje: se proponen en `design.md`.
2. **Retención**: snapshots y uso por módulo [24 meses]; auditoría de Opttia [12 meses]; bitácoras de pago manual y de cambios [5 años, a confirmar con contabilidad]; sesiones 13 meses (D-634). La aprobación de estos plazos es el visto bueno del borrado programado.
3. **Tope de Opttia**: [30 preguntas por usuario por día], [5 por minuto], pregunta de hasta [500 caracteres], hasta [50 filas] por respuesta, dato de hasta [36 horas] de antigüedad.
4. **Rol «Super Administrador» exacto** en todas las rutas de plataforma: aprobado por Daniel el 5-nov-2026 (`specs/CONTRACT.md`, D-700); la lista de operadores se confirma antes de publicar.
5. **Estado del cron de cobro automático** (dato a verificar, no decisión). La spec solo exige mostrar su última ejecución y advertir si pasó más de [26 horas].
6. **Usuario autorizado de Opttia**: se identifica por un identificador estable del usuario, no por correo ni nombre; se registra al configurar, solo en Firestore.
7. **Notas internas de la ficha**: ¿se aprueba la colección nueva o se propone aparte?
8. **«En vivo»**: la pregunta de plataforma ya existente en «Katuq en vivo» queda bajo la misma lista de autorizados (propuesto; ¿de acuerdo?).
9. **País y moneda**: hoy los planes están en dólares y se muestran en pesos con la TRM del día; confirmar si hay comercios que facturen en otra moneda.

## Verificación contra la constitución

Revisados: Artículo VII (observabilidad: auditoría estructurada en lugar de registros sueltos), X (seguridad por defecto), XII (cada interruptor nuevo lleva dueño y fecha de retiro; se fijan en `design.md`), XIII (cada spec ≤ 3 páginas; por eso 10 capacidades), XIV (la decisión se registra en el contrato) y XV (campos canónicos en inglés; `tipoCuenta` es la excepción pedida por el dueño, a registrar).

## Cómo se aprobará

| Artefacto | Checkpoint |
|---|---|
| Esta propuesta y las 10 specs | Aprobación de Daniel (incluidas las preguntas 2, 3, 4 y 7) antes de escribir `design.md` |
| Revisión privada de seguridad | Antes de `design.md` (AGENTS.md) |
| `design.md` (colecciones, índices, endpoints, agente de Opttia, precálculo si lo hay) | Aprobación antes de `tasks.md` |
| `tasks.md` | Aprobación antes de implementar |
| Implementación | Un cambio a la vez en módulos sensibles (cobros, auth, Opttia) con diff aprobado; orden índices, código, datos, verificación; build de producción sin errores; revisión visual a 1440 y 390 px. El historial de sesiones espera a D-634 |
| Cierre | Pruebas de aislamiento (token de comercio, empresa homónima) y de inyección, **locales y no versionadas (D-566)**; su resultado va en el mensaje de commit o en el contrato |

Al cerrar, registrar D-700 (y las derivadas que asigne el orquestador) en `specs/CONTRACT.md`, citando «ID + título» de D-634 (sesiones y tiempo conectado, ticket 1506), D-345, D-277, D-505 y D-579.
