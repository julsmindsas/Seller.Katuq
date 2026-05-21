# Assets — WooCommerce onboarding screenshots

Esta carpeta contiene los screenshots usados por el bloque de onboarding WooCommerce en `/integrations` (Spec 003.1, AC-003.1-04).

## Archivos esperados (a entregar por diseño)

| Archivo | Dimensiones | Contenido |
|---|---|---|
| `step-1.png` | 600×400 (recomendado) | Captura del panel de WooCommerce admin marcando **Ajustes → Avanzado → REST API** con flecha. |
| `step-2.png` | 600×400 | Captura del formulario "Añadir clave" con permiso **Lectura/Escritura** seleccionado, flecha al botón "Generar clave API". |
| `step-3.png` | 600×400 | Captura de la pantalla final que muestra **Consumer Key** y **Consumer Secret** generados, con flechas a ambos campos. |

## Estado actual (2026-05-20)

⚠️ **Placeholders pendientes.** El HTML del componente (`integrations.component.html` bloque `*ngIf="selectedIntegrationType === 'woocommerce'"`) ya referencia estos paths. Si los archivos no existen, las imágenes se ocultan automáticamente vía `(error)="$any($event.target).style.display='none'"`. El resto del onboarding sigue siendo funcional sin las imágenes.

## Cómo proveerlas

Cuando diseño genere los assets reales:
1. Optimizar PNG con `pngquant` o equivalente (< 100 KB cada uno).
2. Reemplazar `step-1.png`, `step-2.png`, `step-3.png` en esta carpeta.
3. Verificar `alt` text de cada `<img>` en el HTML coincide con el contenido real de la captura.
4. Commit + deploy. No hay cambios de código necesarios.

## Constitución

Estos placeholders no violan el Artículo I (spec-first) porque la spec 003.1 explícitamente declara out-of-scope crear los screenshots reales (sección 6 del spec.md) — son entregable de diseño post-MVP.
