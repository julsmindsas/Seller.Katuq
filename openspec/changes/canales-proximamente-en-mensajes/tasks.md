# Tareas — canales Próximamente (D-509, ticket 1313)

**Estado:** propuesta/spec y diseño, incluida la adaptación a Angular 14, aprobados por Daniel el 20-oct-2026. **Tareas aprobadas por Daniel el 20-oct-2026: «Apruebo las tareas; implementa y valida ambos». Ejecutadas y verificadas localmente; sin publicación.**

Se ejecuta después de D-508/5 para evitar ediciones simultáneas de los archivos compartidos. Cada tarea de código cierra con su prueba y compilación TypeScript sin errores. No se abren rutas, integraciones o permisos nuevos.

## Catálogo y directorio

- [x] **1. Catálogo informativo.** Entrada: diseño, fuentes comerciales y directorio actualizado por D-508. Crear `shared/data/future-message-channels.ts` con TikTok, Correo y Llamadas, iconos y descripciones. Revisar el estado del árbol antes de editar. **Éxito:** catálogo puro compila; no tiene rutas, acciones, credenciales, fechas de disponibilidad, precios ni almacenamiento. **Dep.:** aprobación de estas tareas y D-508/5.
- [x] **2. Tarjetas Próximamente.** Añadir los tres canales al grupo `atender` mediante el catálogo, con `estado: pronto` y `fuente: ninguna`. Conservar TikTok Shop, canales actuales y guard de `abrirEntrada`. Extender las regresiones de D-508 para comprobar que abrir/tocar un futuro canal no configura ni navega, que Próximamente aumenta exactamente en tres y que las guías siguen fuera de los contadores. **Éxito:** pruebas pasan y compilación limpia. **Dep.:** 1.

## Menú y permisos

- [x] **3. Regresión de autorización antes del cambio.** Añadir pruebas en `tests/navigation/` que ejecuten la construcción real del menú con rol sin rutas, sólo WhatsApp, sólo Instagram/Facebook, administrador y comodín; documentar la ausencia inicial de informativos. Cubrir filtrado repetido, ausencia de rutas de info y conservación exacta de las rutas operativas. **Éxito:** casos nuevos detectan lo ausente y las pruebas previas siguen pasando. **Dep.:** 1.
- [x] **4. Informativos tras filtrar permisos.** En NavService, añadir las tres entradas `type: info` al resultado del grupo Mensajes sólo si quedó al menos un hijo operativo autorizado, usando copias y sin modificar ALLMENUITEMS ni las rutas autorizables. Comprobar consumidores de búsqueda/favoritos y claves del sidebar; limitar ajustes a los que realmente necesiten evitar destinos ficticios. **Éxito:** matriz de 3 verde, ninguna ruta operativa añadida y ningún duplicado al re-filtrar. **Dep.:** 3.
- [x] **5. Renderizado del sidebar.** Añadir representación estática para `type: info`, nombre/icono/Próximamente y semántica deshabilitada, sin routerLink, href, handler ni tabulador de acción. Estilo canónico acotado, con color/tamaño explícitos y sin gradientes nuevos. **Éxito:** compila, los enlaces actuales mantienen su comportamiento y clic/teclado sobre info no navega. **Dep.:** 2 y 4.

## Validación y entrega

- [x] **6. QA a 1440/390 px.** Comprobar listado y menú abierto en escritorio/móvil, tres estados legibles y ausencia de scroll horizontal, navegación accidental o pérdida de canales autorizados. Verificar búsqueda global y favoritos; repetir controles después de cambiar/reaplicar permisos simulados. No cambiar roles reales de un comercio. **Éxito:** evidencia por escenario; QA de UI no se presenta como validación de los canales omnicanal. **Dep.:** 5.
- [x] **7. Build conjunto y control editorial.** Participar en D-508/7 con regresiones de ambos cambios, build prod, revisión de environments y conteos CSS. Contrastar nombres/estado con la página comercial ya leída. Dejar preparada la revisión editorial de Jairo como pendiente externa, sin contactarlo sin autorización ni bloquear la validación técnica. **Éxito:** build y QA registrados; se distingue lo comprobado de la revisión editorial pendiente. **Dep.:** 6.
- [x] **8. Bitácora y seguimiento MCP.** Actualizar CONTRACT, tareas y nota interna del ticket con pruebas y límites; preparar resolución. **Éxito:** no se cierra este ticket por compilar ni se cierra el padre omnicanal. Resuelto requiere entrega comprobada y resolver o hacer explícita la validación editorial; publicación/commit dependen de autorización vigente y candado. **Dep.:** 7.


## Resultado de ejecución (20-oct-2026)

- Las tareas de implementación y validación local están completas. Detalle común en `../instructivos-mcp-en-integraciones/verificacion.md`.
- La revisión de navegador usa datos simulados y plantillas/estilos/métodos reales aislados, sin sesión ni datos reales del comercio. No acredita el shell autenticado completo, un login OAuth en cada IA ni disponibilidad de los canales futuros.
- No se ha publicado ni cerrado el ticket. La revisión editorial de Jairo para 1313 sigue pendiente; no se le enviaron mensajes.


## Entrega productiva (20-oct-2026)

Daniel autorizó publicar y verificar. Publicado en **2026.10.20.6** (código 1e918941, build 8dc1a7cc28b35b3f); deploy y candado sin errores. Comprobación autenticada real y límites en `../instructivos-mcp-en-integraciones/verificacion.md`. 1315 Resuelto; 1313 conserva pendiente la revisión editorial de Jairo. Hallazgo móvil del encabezado compartido registrado por separado; directorio y diálogos caben en 390 px.
