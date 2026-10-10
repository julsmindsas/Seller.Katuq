## Contexto

"Regístrese" (`components/diagnostic-survey`) define su diseño dentro de un SCSS de 3.276 líneas (bloque `.reg-layout`, tokens `$reg-*`). Las demás pantallas públicas tienen cada una su CSS de plantilla. No hay una pieza compartida.

## Decisiones

1. **Módulo compartido `PublicaModule`** en `src/app/shared/components/publica/`:
   - `app-publica-marco`: barra superior (logo SVG de Katuq, el mismo de Regístrese; enlace opcional a la derecha por `[enlaceTexto]`/`[enlaceRuta]` o slot `[publica-topbar]`), columna principal (`ng-content`) y panel lateral opcional (`[publica-aside]`, lila `#f3f1fb`, solo en ≥ 960 px). Variante `ancho="angosto"` (480 px, centrada) para formularios cortos y `ancho="lectura"` (760 px) para textos legales.
   - `_publica.scss`: los tokens `$pub-*` copiados de `$reg-*` y el mixin `publica-piezas` (`.pub-eyebrow`, `.pub-h1`, `.pub-lead`, `.pub-label`, `.pub-input`, `.pub-btn`, `.pub-btn--sec`, `.pub-link`, `.pub-aviso--ok|error|info`, `.pub-fine`). Cada página lo incluye con `@include publica-piezas;` porque el contenido proyectado lo estiliza la página, no el marco.
   - Fuentes Geometr415 con `@font-face` en el parcial (igual que Regístrese).
2. **Regístrese no se toca** (no se migra a la pieza nueva en este cambio): evita riesgo en el embudo de registro. Los tokens se copian con comentario de origen.
3. **Login**: solo la columna derecha pasa a las piezas `.pub-*`; se conservan `formGroup`, `formControlName`, `(ngSubmit)`, `showPassword()` y los enlaces. La imagen izquierda se queda.
4. **Términos**: ruta del PDF corregida a `Terminos y Condiciones Generales de uso KATUQ.docx.pdf`; se muestra en `<object>` dentro de `ancho="lectura"` con botón "Descargar". Sin renombrar el archivo (puede estar enlazado desde afuera).
5. **Privacidad**: mismo HTML de contenido; se cambia el encabezado con gradiente por el marco y estilos planos.
6. **Plantilla retirada**: en `authentication-routing.module.ts` las rutas de demostración pasan a `redirectTo`; los componentes quedan declarados (borrarlos es otro cambio, sin valor para el usuario).
7. **Sin gradientes, sin `border-left` de acento** (D-131); avisos en par fuerte/fondo suave.

## Verificación

- `ng build --configuration production` sin errores.
- Capturas con Playwright a 1440 y 390 px de cada pantalla, servidas desde el `dist` local contra `back.katuq.com`: logo visible, sin texto en inglés, sin desplazamiento horizontal.
- En producción, tras publicar: entrar con la sesión de Daniel (login ya abierto → redirección) y abrir cada pantalla pública.
