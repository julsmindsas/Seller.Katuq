# Diseño: pruebas y verificación del modo oscuro (D-502, ticket 1180)

> Complementa [`design.md`](design.md) (fase 0) y [`design-f1.md`](design-f1.md) (tokens). Las pruebas se escriben antes del código que cubren (tareas 1.x y 3.1). Ninguna escribe en Firestore ni llama a `back.katuq.com` con escrituras.

## Fase 0

- **`tests/theme/theme-mode.test.js`.** Sigue el patrón de `tests/navigation/nav-responsive.test.js`: transpila la clase y la corre en `vm` con `document`, `localStorage`, `location` y eventos del router simulados. Casos:
  1. al arrancar en una URL del marco con `tema` verdadero, queda oscuro antes de cualquier evento del router; en `/terms-conditions`, con la misma sesión, queda claro;
  2. `isShellUrl` con las cuatro rutas del marco (`content`, `agent-builder`, `pricing` y `billing`), un `:param`, `/`, `/login` y una ruta desconocida;
  3. `NavigationEnd` en una ruta con marco: oscuro; en una ruta pública con sesión oscura: claro; `NavigationCancel` no cambia nada;
  4. otro componente guarda una copia vieja del `user` con la misma identidad: el tema no cambia; entra otro usuario en el mismo navegador: se relee la preferencia;
  5. `reset()` quita la clase y el `style` de fondo y deja el bundle claro; `setPreference` cambia solo `tema`;
  6. con el almacenamiento roto o bloqueado queda claro, sin lanzar; navegar dentro del marco no vuelve a tocar el `<link>`.
- **`tests/theme/users-edit-contract.test.js`** (Art. VIII). El botón llama `updateUser` con exactamente `{ identificacion, tema }`. Ante un 403 de rol o un 5xx, `tema` se queda en el navegador, la clase no se revierte y no se llama `SignOut()`. Hoy el caso de rechazo falla, porque el header solo guarda `tema` cuando el backend responde bien.
- **`tests/theme/user-writers.test.js`.** Si `tema` cambia después de montar `languages` y `edit-profile`, guardar el idioma o el prompt deja `tema` intacto. Hoy falla.
- **`tests/theme/conteos.test.js`.**
  - Gradientes y primarios prohibidos no suben. Línea base del 2026-10-18 (gradientes / primarios): `dark-mode.scss` 1 / 0, `styles.scss` 2 / 10, `sidebar.component.scss` 2 / 0, `shared-filters` 0 / 3, `tracking-details-modal` 5 / 0, `crear-formas-pago` 0 / 1, `general-chat` 1 / 0, y los demás 0 / 0.
  - En `dark-mode.scss` no queda ninguno de los seis patrones de la familia del azul: `#6AB5E8`, `rgba(106, 181, 232`, `rgb(106, 181, 232`, `#5AA5D8`, `#8AC5F8` y `#4A95C8`. Esta parte falla hasta F1.
- **Script `test:theme`.** Lista los archivos uno por uno, como `test:dian-*`: `node --test tests/theme/theme-mode.test.js tests/theme/users-edit-contract.test.js tests/theme/user-writers.test.js tests/theme/conteos.test.js`. En Windows, npm usa cmd.exe, que no expande `*`, y Node 20 no acepta globs en `--test`. En F1 se agregan `theme-tokens.test.js` y `comparar-claro.test.js` a la misma línea.

## Fase 1

- **`tests/theme/theme-tokens.test.js`.** Compila `_theme-tokens.scss` con `sass` y comprueba:
  - cada `--ds-*` existe en los dos juegos;
  - en oscuro, cada token de texto da ≥ 4,5:1, y `control-border` y `focus` dan ≥ 3:1 contra **cada** superficie (`canvas`, `surface`, `surface-2`, `row-hover`, `tile`, `chip-bg`, `sidebar` y `accent-soft`), no solo contra `surface`;
  - `on-accent` sobre `accent` y sobre `accent-hover` da ≥ 4,5:1, y en oscuro cada semántico (`ok`, `warn`, `err`, `info`) da ≥ 4,5:1 sobre su `-soft`;
  - el claro es igual a los `$cfg-*` de `_config-pagina.scss` y al marco, y los `-rgb` coinciden con su color.
- **`tests/theme/comparar-claro.js`** (CLI, no es prueba de `node --test`): el chequeo «claro idéntico» sin build. Compila un `.scss` en un commit base y en el árbol actual, sustituye `var(--ds-*)` por el valor claro de los tokens de cada lado, descarta lo oscuro y sale con 1 si el claro cambió (2 si no hay nada que comparar). Lo usa cada bloque de F1 y F2 sobre su consumidor o sobre `src/styles.scss`; no reemplaza las capturas ni el build del cierre. Sus funciones puras se prueban en `comparar-claro.test.js`.
- **`conteos.test.js`**, segunda parte, en verde.

## Auditoría en navegador (`tests/theme/auditoria-tema.js`)

- `playwright-core` y `axe-core` se instalan fuera del repo, así que no se suman dependencias. Sirve `dist/cuba` con la API simulada e intercepta `POST /v1/users/edit`: nunca escribe en producción.
- Mide los criterios 1, 2, 3, 5 y 6 de la propuesta a 1440 y 390 px, y compara las capturas en claro con la línea base de la tarea 0.2.
- **Destello al recargar.** Recarga una ruta del marco con la sesión en oscuro, con el chunk de la ruta demorado 2 s, y comprueba que `body.dark-only` ya está mientras el chunk no llega. La misma recarga en `/terms-conditions` no tiene la clase. Contra el build actual, el primer caso pasa y el segundo falla.
- **Sistema operativo.** Con `emulateMedia({ colorScheme: 'dark' })` y la app en claro, la barra inferior, los filtros y el chat quedan claros; al revés, quedan oscuros.
- **F1.**
  - En oscuro, `.btn-primary`, `.badge.bg-primary` y el botón primario de PrimeNG tienen fondo `#5F3FE0` y texto blanco.
  - El `font-size` y el `padding` de `.p-button`, `.p-inputtext` y las celdas de `p-table` son iguales en los dos temas.

## Cierre de cada fase

- `npm run build:prod` sin errores, revisando después el diff de los dos `environment`.
- `npm run test:theme` y los conteos en verde.
- Auditoría y revisión en el navegador, a 1440 y 390 px en los dos temas, sin scroll horizontal ni texto invisible.
- Guard de alcance por commit (`design.md`, «Contratos»).
- Entrada en la bitácora de `CONTRACT.md` con el reporte de axe y las capturas.

## Observabilidad

No hay telemetría nueva ni `console.log`, y el servicio no registra datos del usuario. Si falla el guardado, avisa el interceptor; los 5xx ya los captura Sentry.
