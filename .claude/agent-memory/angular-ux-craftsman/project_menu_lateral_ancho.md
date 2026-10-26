---
name: menu-lateral-presupuesto-ancho
description: Cuánto ancho le queda al nombre de una opción del menú lateral (260 px) y por qué las insignias NUEVO/PRÓXIMAMENTE bajan a una segunda línea
metadata:
  type: project
---

Con el menú de 260 px, el nombre de una opción de segundo nivel tiene ~100 px y el de primer nivel ~85–104 px (medido el 2026-10-23). Al lado de una insignia NUEVO le quedaban 34 px y junto a PRÓXIMAMENTE 0 px; por eso salía letra por letra (ticket 1334, menú 1/4).

**Why:** el 1329 puso `overflow-wrap: break-word` + `min-width: 0` en `.menu-text`/`.submenu-text`/`.section-title`; con tan poco ancho el navegador partía las palabras. El 1334 lo cambió por la mezcla `ktq-nombre-menu` (dos líneas, "…", sin partir palabras) y mandó la insignia a una segunda línea con `:has()` + un `::after` de ancho completo en `sidebar.component.scss`.

**How to apply:** los tickets 2/4–4/4 del menú (nombres, ancho, íconos) van después; si se ensancha el menú, revisar si la insignia puede volver a la misma línea del nombre. El componente usa `ViewEncapsulation.None` y `styles.scss` le fuerza `font-size`/`padding` con `!important` (`.sidebar-wrapper .menu-link`, `.favorite-btn`). Ver [[harness-visual-sin-login]].
