---
name: font-awesome-47
description: La app solo carga Font Awesome 4.7; los nombres de FA 5/6 salen en blanco. Cómo comprobar cada clase fa-* antes de cerrar
metadata:
  type: reference
---

Seller.Katuq carga solo Font Awesome 4.7 (CDN en `src/index.html` y `node_modules/font-awesome` en `angular.json`). Los nombres de FA 5/6 no fallan en el build: el ícono simplemente no aparece.

Equivalencias que ya se usaron (ticket 1347, dashboard): `fa-chart-bar`→`fa-bar-chart`, `fa-chart-line`→`fa-line-chart`, `fa-chart-pie`→`fa-pie-chart`, `fa-gauge-high`→`fa-tachometer`, `fa-triangle-exclamation`→`fa-exclamation-triangle`, `fa-floppy-disk`→`fa-floppy-o`, `fa-file-excel`→`fa-file-excel-o`, `fa-xmark`→`fa-times`, `fa-pen`→`fa-pencil`, `fa-clock`→`fa-clock-o`, `fa-wand-magic-sparkles`→`fa-magic`, `fa-table-cells`→`fa-th`, `fa-coins`→`fa-money`, `fa-external-link-alt`→`fa-external-link`, `fa-grip-lines-vertical`→`fa-columns`. Sin equivalente directo: `fa-ruler`, `fa-user-tie`, `fa-user-shield` (se usó `fa-bar-chart` / `fa-user`).

**Cómo comprobar:** sacar las clases con `grep -ohE "fa-[a-z0-9-]+"` de los archivos tocados y buscar cada una como `\.<clase>[:{ ,.]` en `node_modules/font-awesome/css/font-awesome.css`. Revisar también el HTML armado en strings de Swal dentro del `.ts`.
