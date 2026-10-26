---
name: harness-visual-sin-login
description: Cómo medir y ver una pantalla Angular sin iniciar sesión, con Chrome headless, CSS global de dist y el SCSS del componente compilado con sass
metadata:
  type: reference
---

Para revisar a 1440 y 390 px sin login (el front local apunta a producción):

1. CSS global: `dist/cuba/styles.*.css` y `dist/cuba/lara-light-blue.css` (la app carga lara siempre, así que la trampa `[class*="p-"]` aplica).
2. SCSS del componente: `npx sass --no-source-map <componente>.scss salida.css`; si usa `:host`, cambiarlo por una clase envolvente con `sed`.
3. HTML a mano con el marcado renderizado (incluir `ng-star-inserted` en raíces de `*ngIf`/`*ngFor` para que salga la trampa del `span` azul).
4. `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=1440,1500 --virtual-time-budget=3000 --screenshot=... file://...` y `--dump-dom` con un `<pre id="medidas">` que escriba un script (alturas, `scrollWidth`).
5. Chrome headless no baja de 500 px de ancho: para 390 px, meter la página en un `<iframe style="width:390px">` y correr con `--allow-file-access-from-files`.

El build de verificación se puede mandar a otra carpeta con `--output-path=<scratchpad>` para no pisar `dist/cuba`, que otras sesiones usan para publicar.

Usado en los tickets 1334 (menú) y 1338 (cotizaciones), 2026-10-23. Ver [[menu-lateral-presupuesto-ancho]].
