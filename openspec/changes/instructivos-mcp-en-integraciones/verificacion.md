# Verificación local — tickets 1315 y 1313, 20-oct-2026

## Resultado

Ambos cambios están implementados y validados localmente. Siguen sin commit ni publicación; los tickets permanecen **Haciendo**, responsable Daniel García. Las aprobaciones de specs, diseños/adaptación Angular 14 y tareas constan en CONTRACT.md.

## Comprobaciones

- `node --test tests/navigation/*.test.js tests/integrations/mcp-guides.test.js`: **24/24**. Incluye matriz real de permisos, re-filtrado sin duplicados, pérdida del último permiso, submenú flotante sin navegación, contadores, búsqueda/Mis conexiones, diálogo correcto por guía, copia fallida/ausente/exitosa y cierre mientras copia.
- `npx tsc --noEmit -p tsconfig.app.json`: sin errores.
- Build producción: sin errores; versión candidata local `2026.10.20.5`, hash final `e5cf298ca35991f0`. Se ejecutó `npm run build:prod` y se repitió el CLI de producción tras el ajuste de copia. Se revisaron environments/version.json; sin cambio del destino API. No es una versión publicada.
- Suite ampliada de Integraciones/navegación: **121 casos, 112 correctos y 9 fallos** en `dian-invoice-composer.test.js`. Se extrajeron de HEAD ese test y sus fuentes a una carpeta temporal y se reprodujeron los mismos nueve: **57 casos, 48/9**. Esos archivos no tienen cambios de esta tarea. No se reparó facturación ni clientes fuera del alcance.
- Build con advertencias existentes de dependencias CommonJS, presupuesto inicial y selectores CSS globales; no se presentan como errores de compilación.

## Navegador

Harness local temporal con los métodos, plantillas y estilos reales del directorio, el diálogo Angular y el fragmento de menú; datos simulados y sin servicios de producción. No se cambió auth ni se creó una ruta QA en el producto.

Comprobado a **1440 y 390 px**: contenido legible, ancho del documento igual al viewport, sin scroll horizontal; apertura de las tres guías, búsqueda MCP, guías fuera de Mis conexiones y contadores, menú con todos/sólo WhatsApp/sin acceso, Enter/Espacio/Escape y restauración de foco. Copia permitida/rechazada simulada en navegador y unitarias; el rechazo muestra alternativa manual y rehabilita el botón. El portapapeles nativo del navegador en segundo plano no se acredita con esas simulaciones.

El QA detectó una actualización asíncrona incompleta de la copia en la vista OnPush; se corrigió y verificó. El viewport se restauró al terminar y la pestaña de QA se cerró.

## Diseño y regresión visual

| Archivo | Gradientes antes/después | Primarios prohibidos antes/después |
|---|---|---|
| Listado SCSS | 0 / 0 | 12 / 12 |
| Parcial directorio | 0 / 0 | 0 / 0 |
| Sidebar | 2 / 2 | 0 / 0 |
| Diálogo nuevo | 0 / 0 | 0 / 0 |

Base config-pagina en marco/encabezado y diálogo; sin nueva deuda de paleta, gradientes o clases que contengan `p-`. `git diff --check` limpio.

## Evidencia y pendientes

Capturas en `/Users/danielga/.codex/visualizations/2026/10/20/01a159d6-2720-7ec1-94a4-776df71ea3de/katuq-tickets/`: `directorio-1440.png`, `directorio-390.png`, `guia-chatgpt-1440.png`, `guia-chatgpt-390.png`, `guia-copia-denegada-390.png` y `guia-claude-390.png`.

- Pendientes publicación autorizada y comprobación de la versión publicada antes de marcar Resuelto.
- La revisión editorial de Jairo de 1313 sigue pendiente, sin haberle enviado mensajes. La página comercial ya se contrastó en navegador (`../canales-proximamente-en-mensajes/fuentes.md`).
- Esta prueba no acredita el shell autenticado completo, login OAuth end-to-end en cada IA ni disponibilidad real de TikTok/correo/llamadas. El ticket padre omnicanal sigue fuera del alcance.
