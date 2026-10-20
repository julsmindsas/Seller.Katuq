# Verificación — tickets 1315 y 1313, 20-oct-2026

## Resultado

Ambos cambios están **publicados en 2026.10.20.6 y comprobados en producción**. El ticket 1315 está Resuelto; 1313 permanece Haciendo por la revisión editorial de Jairo. Responsable Daniel García. La evidencia local de abajo conserva su contexto histórico. Las aprobaciones de specs, diseños/adaptación Angular 14 y tareas constan en CONTRACT.md.

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

- Publicación autorizada y comprobación productiva completadas; resultado y límites a continuación.
- La revisión editorial de Jairo de 1313 sigue pendiente, sin haberle enviado mensajes. La página comercial ya se contrastó en navegador (`../canales-proximamente-en-mensajes/fuentes.md`).
- Esta prueba no acredita el shell autenticado completo, login OAuth end-to-end en cada IA ni disponibilidad real de TikTok/correo/llamadas. El ticket padre omnicanal sigue fuera del alcance.


## Publicación y comprobación productiva (20-oct-2026)

- Daniel autorizó explícitamente publicar y verificar ambos cambios. `git pull --ff-only` incorporó 362ae79e; commit del cambio **1e9189412ce7caefd4314a556806dfdab9145538**, publicado también en origin. Se conservaron archivos ajenos y se compiló en worktree limpio, sin incluir su documentación pendiente en el commit.
- `npm run build:prod`: **exit 0**, versión **2026.10.20.6**, hash **8dc1a7cc28b35b3f**, finalizó 18:35:39 UTC. `cambiosSinCommit=0`. Se revisaron ambos environments: sólo versión; destino API sin cambios.
- `firebase deploy --only hosting --project julsmind-katuq`: **exit 0**. `verify-dist-prod.js` comprobó https://back.katuq.com y `guard-publicacion.js` confirmó ascendencia y punta remota sin forzar.
- El dominio **https://sellercenter.katuq.com/integrations** devuelve HTTP 200. Su version.json coincide exactamente con el build; el SHA-256 de `main.f1a5fa67bc2510be.js` coincide con el archivo compilado.
- **Sesión real autenticada, 1440 px:** abren las guías de ChatGPT, Claude y Codex; dirección pública correcta y comandos de Codex visibles. Copiar en ChatGPT confirmó «Dirección copiada.» usando Clipboard API real. Escape devolvió el foco a «Ver instructivo». Búsqueda MCP dejó exactamente las tres guías. Mis conexiones conservó Shopify, Prindel, Fullpi, SIIGO y Cereza, sin guías.
- **Contadores reales antes/después:** Conectadas **5→5**, Para conectar **11→11**, Próximamente **12→15**. Sólo los canales informativos suman tres.
- **Canales:** TikTok, Correo y Llamadas se muestran en atención y Mensajes; tarjetas ARTICLE sin botones/enlaces/activación y menú DIV aria-disabled=true, sin href ni tabindex. WhatsApp/Instagram/Facebook permanecen; TikTok Shop sigue independiente. La matriz de roles y pérdida del último permiso se verifica en las 24 pruebas, sin modificar roles reales en producción.
- **390 px:** directorio 358/358 y diálogos Claude/Codex 372/372 de ancho/scrollWidth, dentro del viewport. Se detectó **desbordamiento de 42 px en el encabezado compartido** (`.right-header`, extremo derecho 432 en viewport 390). El encabezado y sus estilos globales no forman parte del diff; no se corrige ni se presenta como QA móvil global sin incidencias.
- Se restauró el viewport temporal. No se crearon conexiones OAuth, facturas, pedidos ni cambios de canales durante estas pruebas; el login completo desde cada IA sigue fuera de esta comprobación de instructivos.
- MCP confirmó notas internas de publicación en ambos y **1315 Resuelto** con versión y resolución. **1313 Haciendo**, exclusivamente pendiente de la revisión editorial indicada por el ticket; sin mensaje a Jairo ni cierre del padre omnicanal.
- Capturas productivas en la misma carpeta de evidencia: `produccion-directorio-1440.png`, `produccion-guia-chatgpt-1440.png`, `produccion-directorio-390.png`, `produccion-guia-claude-390.png`, `produccion-guia-codex-390.png`, `produccion-canal-correo-390.png`. La captura de Claude contiene una notificación operativa espontánea ajena al QA; no acredita ninguna emisión de factura por estas pruebas. Logs de build/deploy y comprobación HTTP en `/tmp/katuq-1315-1313-publicacion/`.
