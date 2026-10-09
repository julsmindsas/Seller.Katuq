## Context

- **Dónde está la empresa.** Colección `companies`. La llave de tenant es `nomComercial`: el login firma `user.company = users.empresa` en el JWT, `auth` lo deja en `req.userInfo`, y `requireJwtTenant` fija el encabezado `company` a ese valor (y rechaza si el cuerpo o el encabezado nombran otra empresa). La llave de servicio (`x-api-key`) pasa `auth` sin `userInfo` y con `req.authType = 'service'`.
- **Cómo llega la empresa a la pantalla.** Al iniciar sesión, `auth.service.ts` llama `POST /v1/companies/byName`, que devuelve el documento completo (con su id en `cd`), y `SecurityService.setCompanyInformationLogged` lo guarda tal cual en `localStorage['currentCompany']`. `getCompanyInformationLogged()` solo copia tres campos, así que no sirve para leer banderas.
- **Interruptores que ya existen** (este cambio no los reemplaza):

| Mecanismo | Alcance | Ejemplo verificado en el código |
|---|---|---|
| Variable de entorno del servidor | Toda la plataforma | `OFERTAS_MENSAJEROS_CRON_ENABLED` y `CARRITO_ABANDONADO_CRON_ENABLED` (`services/cronService.js`) |
| Lista de empresas en una variable de entorno | Las empresas listadas; cambiarla exige reiniciar | `ORDER_NOTIF_UNIFIED_COMPANIES` (`services/notifications/notificationFlags.js`) |
| `FeatureFlagsService` (front) y `FEATURE_FLAGS` de `compatibility/notificationHooks.js` (back) | Toda la plataforma (constantes del código) | `ENABLE_MARKETING_MODULE`. Ojo: `notificationHooks.js` exporta otro `FEATURE_FLAGS`, sin relación con el de este cambio |
| Ajuste propio del comercio | Un comercio, para su operación | `companyConfig.mensajerosTomanPedidos` (`controllers/carrierOffers.js`) |
| **Bandera por comercio** (este cambio) | Un comercio, para una función nueva que el equipo decide encender | `buyNowCod` |

## Goals / Non-Goals

**Goals**
- Una sola respuesta, igual en el servidor y en la pantalla, a "¿esta empresa tiene esta función?".
- Que "apagada" sea el estado de todo lo que no se prendió a propósito, incluso ante errores.
- Que ningún camino HTTP pueda prender una bandera: solo una operación del equipo técnico, con simulación.
- Que las funciones nuevas no tengan que reimplementar nada de esto.

**Non-Goals**
- Los de `proposal.md`: pantalla de administración, banderas por usuario o porcentaje, caché, historial en Firestore, reemplazar los otros interruptores, corregir `edit`, `byName` y `all` en general.

## Decisions

1. **Un campo en la ficha de la empresa.** `companies/{id}.featureFlags = { <bandera>: true | false }`. Sin colección nueva, como pide el proyecto.
   - Alternativas descartadas: una colección `feature_flags` (colección nueva sin aprobación y un viaje más por pregunta); una variable de entorno con la lista de empresas (cambiarla exige reiniciar el servidor de producción, que corre en dos daemons de PM2, y no se ve desde la pantalla); `companyConfig.*` (mezcla ajustes que hace el comercio con funciones que decide el equipo).

2. **Solo el booleano `true` prende.** `"true"`, `1`, `"on"`, `{}`, `[]`, `null` y `false` apagan. Una bandera que se prende por accidente es peor que una que no prende. Un `featureFlags` mal formado (texto, número, arreglo) apaga todo.

3. **Se cierra ante la duda y no lanza.** Empresa inexistente, nombre vacío, dos empresas con el mismo nombre comercial, bandera fuera del catálogo o fallo de Firestore dan `false`; el fallo deja un `console.error` en el log del servidor. `requireFeature` responde 403, nunca 500.
   - Consecuencia: **una bandera solo puede cubrir lo nuevo.** Si se pusiera detrás de una bandera algo que hoy funciona para todos, un fallo de lectura lo apagaría.

4. **Catálogo cerrado, duplicado a mano.** `FEATURE_FLAG_NAMES` (servidor, congelado) y `COMPANY_FEATURE_FLAGS` (front). Una bandera que no está en el catálogo nunca prende, aunque la ficha la traiga en `true` (así `constructor` o `__proto__` no son banderas). `requireFeature` con un nombre que el catálogo no tiene no tumba el arranque: la ruta queda siempre cerrada y el log lo dice.
   - **Cómo se suma una bandera:** (a) el nombre en los dos catálogos; (b) la prueba que fija el catálogo; (c) su dueño y su fecha de retiro, en la propuesta de la función; (d) la propuesta de la función cita la bandera y declara qué hace con ella apagada; (e) nace apagada para todos.
   - Alternativa descartada: un archivo compartido entre repos. No hay paquete común y los repos se despliegan por separado.

5. **Una sola regla para encontrar la empresa**, compartida por quien lee y por quien escribe (`findCompanyDocs`): `nomComercial` exacto; si ninguno coincide, el id del documento (nunca con `/`, que apuntaría a una subcolección de otra empresa; mismo candado que `companyAccess`). Dos documentos con el mismo nombre dan una empresa ambigua: apagada, y el script se niega. Lo que escribe el script es, por construcción, lo que lee el servidor.

6. **La empresa sale de la sesión firmada.** `requireFeature` usa `req.userInfo.company`; si hay sesión pero sin empresa, **no** cae al encabezado. Sin sesión (llave de servicio de un agente interno) usa el encabezado `company`. Para rutas públicas existe la opción `getCompany(req)`, que debe resolver la empresa en el servidor, por la dirección de la tienda.
   - **Riesgo conocido (hallazgo 3):** el resolvedor por defecto no distingue "llave de servicio" de "ruta pública".
   - **Cierre propuesto, pendiente de decisión (tarea 5.2):** sin sesión y sin `req.authType === 'service'`, no leer el encabezado; la ruta pública que necesite la bandera pasa `getCompany`. Hasta decidirlo, toda ruta pública con bandera pasa su propio `getCompany` y lo prueba con un encabezado ajeno.

7. **Sin caché: una pregunta, una lectura.** La consulta es `companies where nomComercial == X`, trae solo el campo `featureFlags` (`select`) y `limit(2)` (alcanza para detectar un nombre repetido); si no hay coincidencia, una lectura más por id. Quien la use en una ruta caliente pregunta **una vez por petición**, no por renglón, y al final de la cadena de condiciones.
   - Es el costo de cumplir "sin cachés nuevas" y de que apagar surta efecto de inmediato.
   - Salida si pesa: llevar `featureFlags` en la lectura de la empresa que el servidor ya guarda 5 minutos; apagar tardaría hasta 5 minutos más. No se hace aquí.

8. **Solo se trae `featureFlags`.** La ficha puede llevar credenciales de integraciones: el lector las deja en Firestore y la prueba lo vigila. El script sí trae el documento completo (para encontrarlo) pero **imprime** solo nombre comercial, id del documento y `featureFlags`.

9. **El rechazo es un 403 que se lee.** Contrato (lo fija `companyFeatureFlags.test.js`):

| Campo | Valor |
|---|---|
| Estado | 403 |
| `success` | `false` |
| `code` | `FEATURE_DISABLED` |
| `feature` | el nombre de la bandera (se omite si no está en el catálogo) |
| `message` | "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos." |

   - Sin clave `error` ni la palabra "token": el interceptor del front cierra la sesión solo cuando ve un 401, un `NO_ROLE_IN_JWT` o un `error` que menciona "token"; aquí muestra el `message` en un aviso.
   - **Limitación:** el interceptor lo muestra con el título genérico "Suscripción" (tarea 4.5).
   - La pantalla debe esconder el control; este 403 es la red de seguridad, no el camino normal.

10. **Escribir es un script con freno.** `node scripts/set-company-feature.js "<empresa>" <bandera> on|off [--execute]`, desde `functions/`:
    - simula por defecto (un `--dry-run` explícito siempre gana sobre `--execute`);
    - con `--execute` escribe `{ featureFlags: { <bandera>: valor } }` con `merge` (conserva las otras banderas y el resto del documento), relee y falla si lo releído no coincide;
    - si ya estaba como se pide, no escribe; `off` sobre un valor basura (`"true"`) lo corrige a `false`;
    - se niega ante empresa inexistente, nombre repetido o `featureFlags` que no es un mapa;
    - abre las credenciales solo cuando hay algo que ejecutar (validar argumentos y `--help` no abren Firebase).
    - Alternativas descartadas: editar a mano en la consola de Firebase (sin simulación ni verificación); una pantalla en la consola de plataforma (ruta nueva, permiso y registro: otra propuesta).

11. **La ficha no escribe banderas.** El front reenvía la empresa completa al guardar (`empresas.component.ts` hace `{ ...empresa, activo }`) y el servidor la devuelve con `featureFlags`. Sin filtro habría dos daños: un administrador se prendería funciones solo, y una ficha abierta hace rato revertiría con valores viejos una bandera recién cambiada. Por eso `featureFlags` va en `CAMPOS_DE_OTRO_DUENO` del limpiador de `PUT /v1/companies/:id`, y `createCompany` y `editCompany` (que no pasan por el limpiador) hacen `delete req.body.featureFlags`. La empresa nueva nace apagada.
    - **Brecha (hallazgo 1).** Firestore interpreta una llave con punto como una ruta. El filtro compara la llave **entera**; hay que comparar el **primer tramo**. `createCompany` usa `add`, que no interpreta puntos, pero guardaría una llave suelta, así que se filtra igual. Hunk propuesto (los dos archivos tienen parches de otras sesiones; lo aplica quien los tenga asignados, con diff aprobado):

    ```diff
    // services/companies/sanitizeCompanyUpdate.js
    +/** Quita del cuerpo toda llave que apunte a las banderas: el bloque entero o un tramo ("featureFlags.x"). */
    +function quitarBanderas(cuerpo) {
    +  for (const clave of Object.keys(cuerpo || {})) {
    +    if (String(clave).split(".")[0] === "featureFlags") delete cuerpo[clave];
    +  }
    +  return cuerpo;
    +}
     ...
    -    if (NO_ESCRIBIBLES.includes(clave)) continue;
    +    if (NO_ESCRIBIBLES.includes(String(clave).split(".")[0])) continue;
     ...
     module.exports = {
       sanitizarActualizacion,
    +  quitarBanderas,

    // controllers/companies.js (createCompany y editCompany)
    -    delete req.body.featureFlags;
    +    quitarBanderas(req.body);
    // y en el require que ya existe a mitad del archivo:
    -const { sanitizarActualizacion } = require("../services/companies/sanitizeCompanyUpdate");
    +const { sanitizarActualizacion, quitarBanderas } = require("../services/companies/sanitizeCompanyUpdate");
    ```

    - El cambio en el limpiador cubre también `bloqueo.*` y los demás campos ajenos que sean mapas.
    - Alcance revisado el 2026-10-08, por lectura de `controllers/` y `routers/`: solo `editCompany` y `updateCompanyById` pasan llaves del cuerpo tal cual a `update()` sobre `companies`; los demás escritores (`subscriptions`, `onboarding`, brand kit, ajustes) arman sus campos en el servidor. `services/` y `scripts/` no se revisaron a fondo.
    - **La prueba va primero** (Art. VIII) y no puede usar el Firestore simulado actual, que mezcla las llaves tal cual. Hay que enseñarle a expandir rutas con punto como lo hace Firestore y comprobar que `featureFlags` y `bloqueo` no cambian.

12. **La pantalla decide qué mostrar; el servidor decide qué se permite.** `CompanyFeaturesService` lee `currentCompany` y `user` de `localStorage` en cada llamada:
    - Solo cree en las banderas si la empresa guardada es la de la sesión: compara `currentCompany.nomComercial` con `user.company`, sin distinguir mayúsculas ni espacios. Si no coinciden, o no hay sesión (restos de un inicio de sesión anterior, o la empresa que todavía está cargando), todo apagado.
    - Cualquier fallo (almacenamiento bloqueado, JSON ilegible, `featureFlags` que no es un mapa, empresa "mínima" sin `nomComercial`) apaga todo, sin lanzar.
    - `isEnabled$` se vuelve a evaluar cuando `SecurityService.companyInformation$` avisa que cambió la empresa (por ejemplo, llega después del inicio de sesión) y no repite valores iguales.
    - Memoiza el último par de textos de `localStorage` ya interpretado, para no repetir el `JSON.parse` en cada ciclo de detección de cambios (un `*ngIf` dentro de un `*ngFor` lo llamaría cientos de veces). En cada llamada vuelve a leer el almacenamiento y reinterpreta si cambió, así que no sirve valores viejos. No es una caché de datos del servidor; queda como pregunta abierta por la regla "sin cachés nuevas".
    - **Cuándo se entera:** al iniciar sesión (la empresa se vuelve a pedir). Prender: el control aparece en el siguiente inicio de sesión. Apagar: el servidor rechaza de inmediato; la pantalla puede mostrar el control hasta el siguiente inicio de sesión.
    - **Diferencia de rigor con el servidor:** el front compara la empresa sin distinguir mayúsculas; el servidor, exacta. Solo puede hacer que la pantalla muestre un control que el servidor rechaza (403 con aviso claro), nunca lo contrario.
    - Comprobado al redactar con una prueba desechable (11 comprobaciones, fuera del repo). Tarea 4.3: llevarla al repo con el método de `tests/navigation/nav-responsive.test.js`.

13. **UI: sin pantallas nuevas.**
    - Una función apagada **no existe** para ese comercio: sin hueco, sin candado y sin "próximamente". Es distinto del plan gratis (`limites-plan-gratis-tiendas`), que sí muestra candado y "Mejorar plan" para vender el plan de pago.
    - Si una pantalla debe decir que algo no está disponible (por ejemplo, llegó un 403 `FEATURE_DISABLED` desde una pestaña vieja), usa el aviso del interceptor o, si es un bloque dentro de la pantalla, el par semántico Info de `openspec/specs/design-system/spec.md` (`#1E6FD9` sobre `#E7F1FF`), plano y sin gradientes, con el texto estándar. Nunca nombra "bandera", "feature flag" ni `FEATURE_DISABLED`.
    - Los controles nuevos que cuelguen de una bandera siguen el tema canónico (acento `#5F3FE0`, tinta `#211F3A`, radios 16/11/20, etiquetas en mayúscula pequeña). Eso lo verifica la propuesta de cada función.

14. **Observabilidad y trazabilidad.** Los fallos de lectura salen por `console.error` (log del servidor), no por una colección de auditoría: es un error, no telemetría. El script imprime en la terminal; no queda rastro persistente de quién prendió qué. Mientras no se decida otra cosa (pregunta abierta 4), cada cambio en una empresa **real** se anota en la bitácora de `CONTRACT.md`.

15. **Convivencia con otras piezas.**
    - Los consumidores que ya existen cargan el módulo con red de seguridad (`try/catch` alrededor del `require`, en `routers/katuqintelligence.js` y en `controllers/onboarding.js`): si por un despliegue a medias falta el archivo, la función queda cerrada y el servidor arranca. Es el patrón a seguir por los demás consumidores.
    - `enviameCodGuide` frente a `codEnabled`: ver pregunta 3.
    - `singleStepStore` (tienda en un solo paso con IA) y `singleProductTemplate` (plantilla de un solo producto) son dos funciones distintas y cada una lleva su bandera: reusar una para la otra encendería las dos a la vez (pregunta 2).

## Risks / Trade-offs

- **[Llave con punto]** → Se cierra en la tarea 3.2 antes de desplegar cualquier función con bandera. Hoy no hay banderas en producción, así que no hay nada que prender todavía.
- **[Compuerta falsificable en ruta pública]** → Decisión 6. Mientras tanto, toda ruta pública con bandera pasa `getCompany` y lo prueba con un encabezado ajeno.
- **[Una lectura por pregunta en rutas calientes]** → Preguntar una vez por petición y al final de la cadena de condiciones; contar cuántas tiendas cumplen las demás condiciones antes de encender más comercios; la salida está en la decisión 7.
- **[Nombre comercial repetido]** → Esa empresa nunca prende la función. El script simula y se niega si hay dos. Falta contar en producción cuántos nombres se repiten (tarea 6.1).
- **[Prender en un cliente real por error]** → El script exige nombre exacto y `--execute`; no tiene confirmación extra ni lista de clientes protegidos. Mitigación de proceso: bitácora de `CONTRACT.md` (decisión 14).
- **[Sesión abierta con el control a la vista tras apagar]** → El servidor rechaza con aviso claro; el control desaparece al volver a iniciar sesión.
- **[Catálogo desalineado entre repos]** → Se mantiene a mano; hallazgo 2 y la lista de la decisión 4. No hay una prueba de sincronía entre repos y no es trivial hacerla.
- **[Pérdida o despliegue a medias de la Fundación]** → Hoy está sin versionar y otra propuesta reporta que ya se borró una vez por error. Se versiona primero (tarea 1.5). Sin el módulo, los consumidores del servidor que lo cargan con red de seguridad dejan su función cerrada; uno que lo pida suelto al cargar tumba el arranque de todo el API; y el front no compila si falta `company-features.service.ts`, porque tres componentes lo importan. Por eso la Fundación va antes o junto con cualquier consumidor.
- **[Módulos sensibles]** → Este cambio no toca pedidos, inventario ni consecutivos. `companies` es el registro maestro del tenant (plan, credenciales, bloqueo): el único escritor nuevo es el script, con `merge` sobre una clave, y los controladores solo dejan de escribir un campo.
- **[Reglas de seguridad de Firestore para el navegador]** → No hay archivo de reglas en ninguno de los dos repos y el front no escribe `companies` con el SDK del navegador. Falta confirmar en la consola de Firebase que el navegador no puede escribirla (tarea 6.2).
- **[Texto "te la activamos"]** → Promete al comercio que se la activan si escribe a soporte. Confirmar que Daniel quiere esa promesa para funciones de la feria.

## Migration Plan

0. **Versionar la Fundación** (módulo, script, servicio del front y sus pruebas) antes que cualquier consumidor, o en el mismo commit que el primero (tarea 1.5).
1. **Servidor:** el módulo, el script, la ficha protegida y el **cierre de la llave con punto** (3.2). Sin banderas prendidas, sin cambios visibles.
2. **Front:** el servicio y el campo del modelo. Sin cambios visibles.
3. **Verificación en FLORECER** con una bandera sin consumidor (`product3d` hoy; no activa ninguna función): simulación, `--execute`, sesión nueva, apagar. Las cuatro fichas de clientes, solo con simulación (no escribe).
4. **Cada función** prende su bandera en su propia propuesta, en FLORECER primero.
5. **Despliegue:** como indican `MANUAL-EC2` y `memory/prod-pm2-two-daemons.md` (`ssh lightsail` NO es prod). Requiere salir del modo automático: lo hace Daniel o se hace con su orden explícita.
6. **Reversa:** `node scripts/set-company-feature.js "<empresa>" <bandera> off --execute` apaga la función sin desplegar; el servidor lo aplica en la siguiente petición. Retirar el módulo entero no hace falta: sin consumidores no hace nada.

## Open Questions

1. **Dueño y fecha de retiro (Art. XII).** Propuesta: dueño Daniel; revisión el 2027-01-31, la misma fecha que se fijó para la bandera del plan gratis. Cada bandera se retira cuando su función quede prendida para todos, o se descarta. ¿Se acepta?
2. **Catálogo.** Recomendación: sumar `pickingAlistamiento` y `singleProductTemplate` como nombres nuevos, y no reusar `singleStepStore` (es otra función). La prueba que fija el catálogo exige hoy exactamente 8 nombres, y las dos altas editan la misma lista: hay que coordinar el orden con las propuestas que las piden.
3. **Envíame.** `enviame-contra-entrega-y-rastreo` propone un interruptor propio (`codEnabled`) en lugar de `enviameCodGuide`. ¿Se queda con el suyo o exige también la bandera por comercio?
4. **Rastro y freno.** ¿Basta la línea en la bitácora de `CONTRACT.md` por cada cambio en una empresa real, o se quiere un registro persistente (colección nueva, que requiere aprobación) y una confirmación extra para los cuatro clientes actuales?
5. **Resolvedor por defecto** (decisión 6). ¿Se cierra sin sesión y sin llave de servicio, o se deja como está con la regla de proceso?
6. **Aviso del 403.** ¿Se cambia el título "Suscripción" del interceptor para `FEATURE_DISABLED`?
7. **Memoización del front** (decisión 12). ¿Se acepta frente a "sin cachés nuevas"?
