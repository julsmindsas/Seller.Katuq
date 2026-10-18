# Diseño: modo oscuro del Seller (D-502, ticket 1180)

> Detalla las fases 0 y 1 de la propuesta. Este archivo trae lo común y la fase 0. Los tokens, la fase 1 y las fases siguientes están en [`design-f1.md`](design-f1.md); las pruebas, en [`design-pruebas.md`](design-pruebas.md), y los requisitos, en [`specs/design-system/spec.md`](specs/design-system/spec.md). Verificado sobre `feature/venta-asistida-mejorada` el 2026-10-18.

## Contexto verificado

- **Tres puntos aplican el tema y ninguno es dueño:** `app.component.ts:264-277` (al arrancar), `header.component.ts:67-87` (al montar) y `:108-136` (el botón). Nadie lo deshace: ni `SignOut()` (`auth.service.ts:294-321`) ni los otros caminos a `/login` (`servicios.service.ts:284` y guards como `admin.guard.ts`). El fondo en línea gana a las hojas de estilo, y `index.html:44` carga el tema de PrimeNG sin compilar.
- **El marco con menú** (`ContentComponent`) está en cuatro rutas: `''` con `children: content` (`app-routing.module.ts:228-232`), `agent-builder`, `pricing` y `billing`. Sus hijos son perezosos, y en Angular 14 los `loadChildren` se resuelven antes de `RoutesRecognized`. Por eso, al recargar, decidir en ese evento mostraría el claro mientras baja el chunk.
- **Escritores de `localStorage['user']` con copia vieja:** `languages.component.ts` (lee en :41 al iniciar y escribe en :72) y `edit-profile.component.ts` (lee en :73 y escribe en :162; en :121-125 sí relee). `change-password.component.ts` lee al enviar (:42) y no se toca: es una pantalla sin menú, sin botón de tema.
- **Rechazo del guardado.** Ante un 403 de rol en `POST /v1/users/edit`, el interceptor no cierra la sesión (solo lo hace con 401 o token inválido) y muestra un aviso «Suscripción». Hoy el header ya cambió la clase, pero no guarda `tema`, así que al recargar vuelve el tema anterior. Quién puede guardar su tema se revisa en el backend privado.
- **Lo que sigue al sistema operativo:** `bottom-navigation.component.scss:24,154,217` (afecta de verdad), un bloque vacío en `shared-filters.component.scss:1080`, `tracking-details-modal.component.scss:1723`, `crear-formas-pago.component.scss:439`, `general-chat.component.scss:96,549` y `chat.component.ts:87-90`. Se excluyen `pdf-template.component.scss:621`, que fuerza el blanco a propósito, y `adaptive-navigation.component.scss` (14 líneas con `prefers-color-scheme`), declarado en `SharedModule` pero sin uso en ninguna plantilla.

## Fase 0: el tema tiene un solo dueño

1. **`ThemeModeService`** (nuevo, `src/app/shared/services/theme-mode.service.ts`, `providedIn: 'root'`). Es lo único que toca el DOM del tema, y los nombres de bundle viven solo aquí.
   - **Regla.** Oscuro si y solo si la pantalla está dentro del marco con menú y la preferencia de la sesión es oscura. Todo lo demás, claro.
   - **Marco.** Las cuatro rutas con `ContentComponent` ganan `data: { shell: true }`, un dato sin efecto en la navegación. Así el servicio no importa la clase del componente.
   - **Arranque provisional.** En el constructor, antes de cualquier evento del router, la función pura `isShellUrl(location.pathname, router.config)` compara los segmentos de la URL con las rutas marcadas y con los `path` de sus hijos. Esos `path` están en línea; solo su contenido es perezoso, así que no hace falta bajar ningún chunk. Un `:param` acepta cualquier valor y los `path` vacíos se ignoran. Quien recarga en oscuro lo ve desde el arranque, como hoy, y una ruta pública arranca en claro.
   - **Confirmación en `NavigationEnd`.** Revisa el árbol activado: queda oscuro si algún nodo tiene `data.shell`. No se usa `RoutesRecognized` porque ahí la pantalla que sale cambiaría de colores mientras los guards esperan HTTP (por ejemplo, `SubscriptionGuard` consulta el plan; el login se pondría oscuro mientras tanto), y una navegación cancelada dejaría el tema equivocado. `NavigationCancel` y `NavigationError` no cambian nada.
   - **Preferencia en memoria.** Se carga del `user` al arrancar y cuando cambia la sesión, que se reconoce por `email` y `company`, nunca por el token. En cada `NavigationEnd` solo se relee el `user` para saber si la sesión terminó (claro y memoria vacía) o cambió de identidad (se relee `tema`). Así, una copia vieja del `user` no cambia el tema durante la sesión.
   - **Operaciones:**
     - `apply(dark)`: clase `dark-only` en `<body>`, `layout_version`, `switchTheme(bundle)` y `body.style.removeProperty('background-color')`. Es idempotente: si nada cambia, no toca el `<link>`;
     - `setPreference(dark)`: actualiza la memoria, relee el `user`, cambia solo `tema`, lo escribe y aplica;
     - `reset()`: claro y memoria vacía;
     - `isDark$`: `BehaviorSubject`.
   - **Lectura segura.** `localStorage` va dentro de `try/catch`. Si falla, queda claro, sin lanzar y sin `console.log`.
2. **Quién lo usa.**
   - `AppComponent` lo inyecta en el constructor y pierde el bloque `:264-277`.
   - `HeaderComponent` toma `dark` de `isDark$`. `layoutToggle()` llama `setPreference(!dark)` y después `updateUser({ identificacion, tema })`, como hoy, sin reescribir el `user` completo. Si el backend rechaza, no se revierte nada (valor por defecto 9).
   - `SignOut()` gana una línea, `reset()`, antes de navegar. Los otros caminos a `/login` los cubre la regla.
   - `languages.component.ts:72` y `edit-profile.component.ts:162` releen el `user` justo antes de escribir y cambian solo su campo (`lang` y `kaiPersonalitityUserPrompt`). Así la preferencia sobrevive a una recarga.
3. **PrimeNG al arrancar.** `index.html:44` apunta al CSS claro ya compilado (`lara-light-blue.css`).
4. **Botón y no sistema.** `@media (prefers-color-scheme: dark)` pasa a `:host-context(body.dark-only)`, el patrón de `bodegas.component.scss:169`. `chat.component.ts` lee `isDark$`. Se borran el bloque vacío de los filtros y el código comentado de `header.component.ts:40-49`.

## Contratos, datos y write-set

- **Endpoints.** Ninguno nuevo. `POST /v1/users/edit` sigue recibiendo `{ identificacion, tema }`.
- **Firestore.** Sin colecciones, campos ni eventos nuevos. `users.tema` llega al login en `localStorage['user'].tema` (`controllers/authentication.js:220`). Sin migración ni `--dry-run`. El conteo de usuarios en oscuro es de solo lectura y devuelve solo el total.
- **Write-set de F0:**
  - `theme-mode.service.ts` (nuevo) y `app-routing.module.ts` (solo `data: { shell: true }` en cuatro rutas);
  - `app.component.ts`, `header.component.ts`, `auth.service.ts` (una línea), `languages.component.ts`, `edit-profile.component.ts` e `index.html`;
  - `bottom-navigation.component.scss` y `shared-filters.component.scss`;
  - `tests/theme/`: `theme-mode`, `users-edit-contract`, `user-writers` y `conteos` (`.test.js`), y `auditoria-tema.js`; además, la línea `test:theme` de `package.json`;
  - en tareas aparte: `tracking-details-modal.component.scss`, `crear-formas-pago.component.scss`, `general-chat.component.scss` y `chat.component.ts`.
- **Write-set de F1:** en `design-f1.md`. **Nunca:** backend, Firestore, servicios de dominio, columnas, filtros, eventos, modales, validaciones ni textos.
- **Módulos sensibles.** No se toca lógica de pedidos, pagos, inventario, consecutivos, productos ni precios, y D-134 no aplica porque no hay escrituras. Despachos (`tracking-details-modal`) y POS (`crear-formas-pago`) van solo en `.scss`, uno después del otro y con diff aprobado. `auth.service.ts` también lleva diff aprobado.
- **Guard de alcance por commit.** Cada tarea sale en su propio commit, con la convención del contrato y la aprobación de Daniel. El guard corre `git diff --name-only <base>..HEAD` (`<base>`: el commit en que empezó la tarea) y falla si aparece un archivo fuera del write-set; en las tareas sensibles, cualquiera que no sea `.scss`. No mira el árbol de trabajo, porque lo comparten otras sesiones.
- **Sin bandera por comercio ni modo sombra.** El tema es preferencia de cada usuario; según D-385, una bandera solo cubre lo nuevo; y el CSS se compila para todos. **Reversa:** revertir el commit de la fase y publicar con el candado. Cada usuario puede volver a claro con el botón.

## Pruebas primero

Están en [`design-pruebas.md`](design-pruebas.md): `theme-mode.test.js` (arranque provisional, `isShellUrl`, `NavigationEnd`, memoria por identidad, `reset` y almacenamiento roto), la prueba de contrato de `users/edit` con su caso de rechazo, `user-writers.test.js`, los conteos con su línea base y la auditoría, que mide el destello recargando con el chunk demorado.

## Gates constitucionales

| Art. | Cumplimiento |
|---|---|
| I, II | D-502 aprobada. El delta EARS cubre F0 y F1, no nombra tecnología y se aprueba en 0.1, antes de cualquier código |
| IV, V, VI, X, XV | No aplican: sin integraciones, webhooks, proveedores ni `integrations.*` |
| VII, XI | Sin telemetría nueva ni logs con datos del usuario |
| VIII | Sin endpoint nuevo; la prueba del payload y las respuestas de `users/edit` va primero |
| IX | `providedIn: 'root'`, HTTP solo por `MaestroService`; Angular 14 sin signals: `BehaviorSubject` |
| XII | Sin bandera; el escudo C, si se pide, nace con dueño, fecha y retiro |
| XIII, XIV | Diseño en tres archivos de menos de 3 páginas; fases como cambios propios; bitácora por fase |

## Valores por defecto (se confirman en la tarea 0.1)

1. Opción A por fases, sin escudo C. F2a sale en el release que sigue a F1.
2. Tinte `#a48bff` para texto e íconos en oscuro y semánticos claros. El relleno queda en `#5F3FE0` con texto blanco (6,41:1). `--primary-color` pasa al tinte en oscuro, y sus rellenos en componentes quedan como deuda medida (2,72:1) hasta la fase de cada pantalla.
3. La paleta del sidebar y el header es el canon, con el muted en `#9d99b5`, el borde de control en `#7a7498` y los grises de `dark-mode.scss` pasados a tokens.
4. No seguir al sistema operativo; se revisa después de F3.
5. F3 en este orden: Todos los pedidos, venta, despachos, POS, inventario e inicio. Antes, conteo de solo lectura de usuarios con `tema: true`.
6. El contraste en claro va aparte: no pasan el muted (3,26), los semánticos sobre su fondo suave (4,09 / 3,83 / 2,64 / 4,25), el muted-2 (2,87) ni los bordes de control (1,22).
7. Las pantallas sin menú siempre en claro, aunque haya sesión (públicas, Regístrese, cambio de contraseña, agentes de voz y video). **Se aparta de la propuesta:** `publica` sale de F2.
8. PrimeNG oscuro sobre `lara-dark-purple`, con overrides explícitos; su botón queda en `#5F3FE0` en oscuro y en `#8b5cf6` en claro hasta la propuesta de `_katuq-tokens.scss`.
9. El botón guarda `tema` en el navegador de inmediato, aunque el backend lo rechace, sin cerrar sesión ni revertir. En el siguiente inicio de sesión manda el backend.
10. El criterio 2 en claro es «ninguna violación nueva frente a la línea base»; el cero se exige en oscuro.
11. Sin bandera por comercio ni modo sombra; la reversa es revertir.
12. La preferencia vive en memoria durante la sesión, y los escritores del `user` (idioma y prompt de KAI) cambian solo su campo.
13. El criterio 5 cuenta la familia completa del azul (169 apariciones), no solo las 156 de la propuesta.

## Riesgos

- **Destello al recargar.** Lo evita la decisión provisional del arranque, no el router, y la auditoría lo mide con el chunk demorado.
- **Regresión en claro.** F0 y F1 no cambian el claro. Sin el `white` en línea queda el blanco de Bootstrap; en F1, los tokens claros no tienen consumidores y el bloque de tamaños de PrimeNG solo se muda a un parcial, importado en la misma posición. Las capturas de antes y después deben ser iguales.
- **Escritores nuevos del `user`.** Uno con copia vieja no cambia el tema en la sesión, pero sí al recargar. Lo vigilan `user-writers.test.js` y una búsqueda de `setItem('user'` en cada fase.
- **Especificidad.** Las reglas `p, span, div` de `dark-mode.scss` siguen ganando en el texto heredado, así que F2 cambia superficies y no texto. Los `!important` globales se tratan en `design-f1.md`.
- **Terceros.** ApexCharts, Quill, ng-select, driver.js, FullCalendar y SweetAlert2 se revisan para confirmar que no empeoran; lo que falle pasa a F3.
