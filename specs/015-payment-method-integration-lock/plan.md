# Plan 015 — Amarrar la forma de pago con integración

> Estado: draft | in-review | **approved** | superseded
> Vinculado a `spec.md` (**approved**, D-067). Aprobado en checkpoint 2026-08-09 (D-068).
> Última actualización: 2026-08-09
> Rama: `feature/pagos-metodos-unificados` (ambos repos).

## 1. Resumen técnico
Se añade una noción de **"amarre"** al método de pago, calculada con **lógica pura y compartida** (misma regla
en front y back para no divergir):

- **`esPasarelaPorNombre(nombre)`** — reutiliza las **mismas palabras clave** que el enrutamiento de cobro ya
  usa en `orders.js` (`wompi`, `epayco`, `pasarela`, `tarjeta online`). Fuente única de verdad para "este
  método ES una pasarela".
- **`evaluarAmarre(metodo, { hayPasarelaActiva })`** → `{ amarrado, motivo, bloqueaCanalOff, bloqueaQuitarFlag }`:
  - `motivo = 'pasarela'` si `esPasarelaPorNombre(nombre)` **y** `hayPasarelaActiva` (la empresa tiene config
    propia activa). → `bloqueaCanalOff=true`, `bloqueaQuitarFlag=true`.
  - `motivo = 'flag'` si `integracion === 'Si'` y **no** hay pasarela activa. → `bloqueaCanalOff=true`,
    `bloqueaQuitarFlag=false` (Sí→No permitido = vía deliberada de liberar).
  - si ninguno → `amarrado=false`.

**Frontend:** la pantalla lee **una vez por carga** el estado de pasarela de la empresa, calcula el amarre por
fila, y **deshabilita** los switches de canal encendidos + muestra indicador "🔒 amarrado (motivo)"; en el modal
**deshabilita** el selector `Integración` cuando `bloqueaQuitarFlag`. **Backend:** `edit`/`editPos` ganan un
**guardarraíl 409** que rechaza el apagado *casual* de canal y el `Integración Sí→No` con pasarela activa,
recomputando el amarre **server-side** (autoritativo). El apagado **deliberado** (Inhabilitar) pasa un marcador
explícito y **no** se bloquea (D-067).

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 015 approved (D-067). |
| II — Spec captura intent | sí | la spec no nombra tecnología. |
| IV — Idempotencia | sí | reintentar un edit bloqueado no cambia estado; el guardarraíl es determinista. |
| VI — UI no acoplada a proveedor | sí (con matiz) | la UI no ramifica por proveedor; usa `esPasarelaPorNombre` genérico (misma lista del backend). El acople a "nombre contiene keyword" es **preexistente** en `orders.js`, no se introduce aquí (ver RT-02). |
| VII — Observabilidad | sí | los rechazos por amarre se registran en auditoría estructurada, sin secretos. |
| VIII — Test-first contratos | sí | `evaluarAmarre`/`esPasarelaPorNombre` puras con tests (front ts-node + back `test:pagos-amarre`). |
| IX — Estilo Angular | sí (salvedad Angular 14) | `*ngIf/*ngFor`, `[disabled]`; desviación Art. IX ya registrada. |
| XI — Datos sensibles fuera del log | sí | no se loguean credenciales de pasarela ni datos de otras empresas. |
| XV v2 — Integraciones en inglés | sí | solo se **lee** el estado del provider (`integrations.<provider>`); no se escribe config. |

> **Dispara el gate de backend** (cambia `edit`/`editPos` + nuevo helper). Se acompaña de propuesta **OpenSpec**
> en `katuq_admin_back_firebase/openspec/changes/payment-method-integration-lock/` (igual que Tarea 1).
> **No** hay colección nueva ni módulo "v2". El endpoint de lectura del estado de pasarela **reutiliza** uno
> existente (ver §5, OQ-2) para no crear endpoints nuevos sin aprobación.

## 3. Arquitectura

### 3.1 Lógica pura compartida
- **Front** `metodo-pago.util.ts`:
  - `PASARELA_KEYWORDS = ['wompi','epayco','pasarela','tarjeta online']` (misma lista que `orders.js`).
  - `esPasarelaPorNombre(nombre: string): boolean`.
  - `evaluarAmarre(m: {nombre; integracion}, ctx: {hayPasarelaActiva: boolean}): AmarreInfo`.
  - `AmarreInfo = { amarrado; motivo: 'flag'|'pasarela'|null; bloqueaCanalOff; bloqueaQuitarFlag }`.
- **Back** `services/pagosAmarre.js` (nuevo, lógica pura, sin IO): mismas funciones en JS. El controlador le
  inyecta `hayPasarelaActiva` resuelto desde `PaymentGatewayService`.

### 3.2 Estado de pasarela de la empresa
- **Back:** `PaymentGatewayService.getProviderInfo(company)` → `{ provider, source, isConfigured }`.
  `hayPasarelaActiva = isConfigured === true` (config propia activa; el **fallback de plataforma NO cuenta**,
  R-01).
- **Front:** obtiene el mismo booleano vía endpoint existente (OQ-2) al cargar la pantalla; lo pasa a
  `evaluarAmarre` para todas las filas (1 lectura, no N).

### 3.3 Pantalla única (admin) — front
- Al cargar: `getMetodosUnificados()` (ya existe) + `getEstadoPasarela()` (nuevo, 1 llamada) → calcular
  `amarre` por fila.
- **Switches de canal:** cuando `amarre.bloqueaCanalOff` **y** el canal está **encendido** → `[disabled]` +
  tooltip con el motivo. Encender un canal apagado **nunca** se bloquea.
- **Columna Integración:** badge "🔒 Amarrado — pasarela activa" / "🔒 Amarrado — integración (Sí)".
- **Modal editar:** `select Integración` con `[disabled]` cuando `amarre.bloqueaQuitarFlag` (pasarela activa);
  nota explicando cómo liberar (desactivar la pasarela en Integraciones). Con solo flag manual, editable.
- **Guardas defensivas de UX**: si por carrera el usuario dispara un toggle bloqueado, el 409 del backend cae a
  un Swal claro ("Método amarrado a una integración activa…").

### 3.4 Guardarraíl backend
- **`edit` / `editPos`** (colecciones `pagos` / `formaPagosPos`): antes del `.update`:
  1. Leer el doc actual (`cd`) → estado previo (`activoPrev`, `integracionPrev`, `nombre`).
  2. Resolver `hayPasarelaActiva` para `company`.
  3. `amarre = evaluarAmarre({nombre, integracion: integracionPrev}, {hayPasarelaActiva})`.
  4. **Bloqueo canal-off:** si el body **apaga** (`activo` pasa de activo→`false`/`'false'`) y
     `amarre.bloqueaCanalOff` y **no** viene el marcador deliberado → `409 { error:'metodo_amarrado',
     motivo }`.
  5. **Bloqueo quitar-flag:** si el body cambia `integracion` a `'No'` y `amarre.bloqueaQuitarFlag`
     → `409 { error:'integracion_amarrada' }`.
  6. En cualquier otro caso (encender, posición, nombre, descripciones, o inhabilitar deliberado) → `.update`
     normal.
- **Marcador deliberado (OQ-1):** el flujo **Inhabilitar/Rehabilitar** del front envía `permitirInhabilitar:true`
  en el payload; el toggle por canal **no** lo envía. El guardarraíl solo salta el bloqueo canal-off cuando ese
  marcador está presente. (Es un *escape deliberado*, coherente con D-067; un cliente que lo mande asume la baja
  a propósito.) El marcador **no** habilita quitar el flag con pasarela activa (ese bloqueo no tiene escape aquí).
- **Auditoría:** cada 409 por amarre se registra vía `handleLogger` (`PAYMENT_METHOD_LOCK_BLOCK`, con `company`,
  `cd`, `motivo`; sin secretos).

### 3.5 Servicio front (`MetodosPagoService`)
- `getEstadoPasarela(): Observable<{ hayPasarelaActiva: boolean; provider?: string }>` (OQ-2).
- `inhabilitarMetodo`/`rehabilitarMetodo`/`inhabilitar`: incluir `permitirInhabilitar:true` en el payload del
  edit (para no auto-bloquearse en el escape deliberado).
- `setDisponibilidad(false)` desde el **toggle**: **sin** el marcador (queda sujeto al guardarraíl).
- `guardarConfigGlobal`: si el usuario dejó `integracion:'No'` sobre un método con pasarela activa, el backend
  responde 409 `integracion_amarrada` → Swal.

### 3.6 Diagrama (texto)
```
Carga pantalla ─┬─ getMetodosUnificados() ─────────────► filas
                └─ getEstadoPasarela() ──► hayPasarelaActiva
   por fila: evaluarAmarre(fila, {hayPasarelaActiva})
     → switch canal encendido + bloqueaCanalOff  ⇒ [disabled] + 🔒
     → modal Integración + bloqueaQuitarFlag      ⇒ [disabled] + nota

Toggle canal OFF ─► edit (sin marcador) ─► guardarraíl recomputa amarre ─► 409 metodo_amarrado
Inhabilitar      ─► edit (permitirInhabilitar:true) ─► pasa ─► activo=false
Integración Sí→No (pasarela activa) ─► edit ─► 409 integracion_amarrada
```

## 4. Modelo de datos
**Sin cambios de esquema.** Se usan campos existentes del doc (`nombre`, `integracion`, `activo`). El amarre es
**derivado en tiempo de lectura**, no se persiste. `permitirInhabilitar` es un flag **de request** (no se
guarda en Firestore; se elimina del body antes del `.update`).

## 5. Contratos

### 5.1 Endpoints tocados
| Endpoint | Cambio |
|---|---|
| `POST /v1/pagos/edit` | + guardarraíl amarre (409 `metodo_amarrado` / `integracion_amarrada`). |
| `POST /v1/pagos/pos/edit` | idem para POS. |
| lectura estado pasarela | **OQ-2** (reutilizar `GET /v1/integration/config` o similar existente). |

### 5.2 Errores (contrato)
| Situación | HTTP | Cuerpo | UI |
|---|---|---|---|
| Apagar canal de método amarrado (sin marcador) | 409 | `{error:'metodo_amarrado', motivo}` | Swal: "Método amarrado a una integración activa. Para bajarlo usa Inhabilitar." |
| `Integración` Sí→No con pasarela activa | 409 | `{error:'integracion_amarrada'}` | Swal: "No puedes quitar la integración: hay una pasarela activa vinculada." |
| Inhabilitar deliberado | 200 | `{msg:'updated'}` | baja normal. |

## 6. Estrategia de testing
- **Unit (puras):**
  - Front (ts-node autónomo, karma inoperante): `esPasarelaPorNombre` (match/no-match, mayúsculas, acentos) +
    `evaluarAmarre` (los 3 estados: pasarela / flag / libre; combinaciones de `bloquea*`).
  - Back `npm run test:pagos-amarre` (script node): mismas funciones puras de `services/pagosAmarre.js`
    (paridad con el front) + casos del guardarraíl (apagar bloqueado vs con marcador; Sí→No bloqueado; encender
    permitido).
- **E2E navegador (usuario):**
  1. Método con pasarela activa (p. ej. nombre con "Wompi", empresa con config activa): switch de canal
     **deshabilitado**, badge 🔒 "pasarela activa", `Integración` no editable; intento por API → 409.
  2. Método con `Integración=Sí` sin pasarela: switch deshabilitado, badge 🔒 "integración (Sí)"; poder pasar
     `Integración` a No en el modal → queda **liberado** → ahora el switch se puede apagar.
  3. **Inhabilitar** un método amarrado (con confirmación) → baja (escape deliberado, D-067).
  4. Encender un canal apagado de un método amarrado → permitido.
  5. Cambios reflejados en checkout/POS sin recargar (caché invalidada).

## 7. Fases de implementación
1. **Fase A — Puras (front+back):** `esPasarelaPorNombre` + `evaluarAmarre` en `metodo-pago.util.ts` y
   `services/pagosAmarre.js`; tests en ambos lados.
2. **Fase B — Estado pasarela:** `MetodosPagoService.getEstadoPasarela()` (OQ-2) + resolución `hayPasarelaActiva`
   en el controlador backend.
3. **Fase C — Guardarraíl backend:** `edit`/`editPos` con los dos 409 + marcador `permitirInhabilitar` + auditoría.
   `node --check` y reinicio :3300.
4. **Fase D — UI pantalla:** switches `[disabled]` + badges + modal `Integración [disabled]` + notas; manejo del
   409 en Swal; `inhabilitar/rehabilitar` envían el marcador.
5. **Fase E — E2E navegador** (los 5 casos) + verificación read-only si aplica.
6. **Fase F — OpenSpec backend** (`openspec/changes/payment-method-integration-lock/`) + bitácora CONTRACT.md.

## 8. Plan de rollout
- Sin feature flag. Reversible por rama (revertir front + back). Requiere **deploy de backend** (guardarraíl) a
  cargo del equipo (EC2/PM2, rama `backend-aws-security`); el front por separado.
- **Orden de deploy seguro:** primero backend (el guardarraíl es tolerante: si el front viejo aún no deshabilita,
  el backend igual bloquea el apagado casual). El front nuevo mejora la UX (evita el intento).
- Rollback: revertir; sin cambios de datos que deshacer (amarre derivado, marcador no persistido).

## 9. Riesgos técnicos
- **RT-01 (fallback de plataforma cuenta como activa):** usar **solo** `isConfigured` (config propia). Cubierto
  en las puras + test.
- **RT-02 (amarre por nombre):** depende de las keywords; si el negocio renombra la pasarela sin keyword, deja de
  amarrar por pasarela (seguiría amarrando por flag si `Integración=Sí`). Documentado; formalizar `provider` es
  follow-up (fuera de alcance, spec §6).
- **RT-03 (paridad front/back de las puras):** dos implementaciones (TS/JS) pueden divergir. Mitigación: **mismos
  casos de test** en ambos lados (misma tabla de entradas/salidas).
- **RT-04 (marcador spoofeable):** `permitirInhabilitar` lo puede mandar cualquiera → es el **escape deliberado**
  aceptado (D-067); el guardarraíl sigue frenando el camino por defecto (toggle). No se usa para el bloqueo de
  quitar-flag (ese no tiene escape por API).
- **RT-05 (latencia de estado pasarela):** 1 lectura por carga; si falla, degradar seguro (spec NFR 5.5): asumir
  `hayPasarelaActiva=false` **pero** respetar el amarre por flag (no desproteger métodos con `Integración=Sí`).
- **RT-06 (caché stale checkout/POS):** invalidar caché al mutar (patrón `trasMutacion`, ya en la pantalla).

## 10. Open questions (técnicas) — RESUELTAS 2026-08-09 (D-068)
- [x] **OQ-1 — Distinguir apagado casual vs deliberado:** **marcador `permitirInhabilitar:true`** en el flujo
  Inhabilitar/Rehabilitar; el toggle por canal no lo envía → 409. (Sin endpoint dedicado; menos superficie.)
- [x] **OQ-2 — Lectura del estado de pasarela desde el front:** **reutilizar endpoint existente**
  (`GET /v1/integration/config` / `/configurations`, con auth) y derivar `hayPasarelaActiva` buscando un provider
  de pago con `status:'active'`. **No** se crea endpoint nuevo (regla dura backend).
- [x] **OQ-3 — Fuente de keywords:** **duplicar la lista** en las puras front/back con comentario que apunta a
  `orders.js` como origen (repos separados, sin import compartido). Lista estable.
