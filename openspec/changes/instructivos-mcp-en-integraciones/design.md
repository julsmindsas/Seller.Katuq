# Diseño — instructivos MCP en Integraciones (D-508)

Estado: **diseño y adaptación a Angular 14 aprobados por Daniel el 20-oct-2026:** «Apruebo ambos diseños y la adaptación». Propuesta/spec y clientes ChatGPT, Claude y Codex ya aprobados. Tareas aprobadas e implementadas localmente; verificación documentada, sin publicación.

## Decisiones

1. **Un directorio, dos tipos de acción.** Extender `EntradaDirectorio.estado` con `guia` y añadir un identificador de guía tipado. Incorporar un grupo «¿Con qué IA trabajas?» con tres entradas. No se registran como proveedores en `IntegrationsService` ni se crean configuraciones.
2. **Estado independiente.** `estadoTarjeta` devuelve `guia` antes de consultar las conexiones; su texto es «Desde tu IA» y su botón «Ver instructivo». Se excluye de «Mis conexiones», «Conectadas», «Para conectar» y «Próximamente». La búsqueda usa nombre/descripción e incluye MCP en el texto descriptivo. Los tres contadores actuales conservan su significado.
3. **Datos editoriales aislados.** `mcp-guides.ts` contiene el catálogo tipado de las tres guías: título, requisitos, pasos, URL pública, ejemplos de lectura, enlace oficial y fecha de revisión. Sin HTML remoto, secretos, funciones por proveedor ni consultas HTTP. No afirmar planes habilitados sin fuente vigente. Si el acceso depende del administrador del espacio, indicarlo.
4. **Diálogo pequeño.** `McpGuideComponent`, standalone y OnPush, abierto con `NgbModal` desde `abrirEntrada`, antes de la rama que configura servicios. Se importa en el módulo existente. Contenido semántico con título, pasos, dirección seleccionable, botón Copiar, ejemplos y fuentes. El modal conserva Escape, confinamiento/restauración de foco y cierre accesible del mecanismo existente.
5. **Copia con alternativa.** `navigator.clipboard.writeText` se invoca sólo al pulsar Copiar. Éxito y fallo se anuncian con `aria-live`; el fallo mantiene la dirección seleccionable. Actualizar el estado de la vista OnPush al completar la promesa; sin temporizadores para sincronizar.
6. **Sesión y prueba.** Dirección recomendada: `https://api.katuq.com/mcp`. Cada guía dirige a autenticación OAuth con la cuenta propia de Katuq. Nunca pedir API keys o añadir una empresa en la URL. La comprobación sugerida es una consulta de lectura, por ejemplo «Muéstrame mis tickets de soporte», cuando el rol lo permita. No ejecutarla automáticamente.

## Presentación y compatibilidad

- Reutilizar tarjetas del directorio. Incorporar la base `config-pagina` a los elementos de marco/encabezado correspondientes del listado, conservando búsqueda, filtros, estructura funcional y tarjetas. Usar la misma base y tokens canónicos en el diálogo; sólo estilos de disposición propios, clases `mguide-*` sin la secuencia `p-`.
- Fondo lila, superficies blancas, acento `#5F3FE0`, radios 16/11/20, foco visible, tamaño y color explícitos del texto en `span`. URLs con salto de línea y modal limitado al viewport. Sin ampliar la deuda CSS ni rehacer pantallas de configuración.
- **Excepción acotada del Art. IX, incluida en esta aprobación de diseño:** Angular 14.3/TypeScript 4.8 no soportan signals ni `@if/@for`. El componente nuevo usa standalone/OnPush, propiedades de vista y directivas disponibles. Los componentes existentes conservan NgModule. Se registra en CONTRACT.md si Daniel aprueba; no se amplía a otros módulos.
- Adaptar la explicación general «¿Cómo funciona?» para distinguir las guías de las conexiones que se configuran en Katuq; no cambiar los pasos de los servicios existentes.

## Contratos, datos y dependencias

Sin API nueva, servicio HTTP nuevo, cambios de auth/interceptor, rutas nuevas, configuración, flags, almacenamiento o telemetría. Las lecturas actuales del listado siguen usando sus servicios existentes y el interceptor. El flujo de guía es tarjeta → datos locales → diálogo; no llega al backend ni a Firestore. Enlaces externos sólo a HTTPS oficial, con `noopener noreferrer`.

`integrations-directorio.ts`, `integrations-list.component.ts/html/scss` se comparten con D-509: editar en serie y verificar ambos cambios juntos. No mezclar con trabajo pendiente de facturación D-500 o con cambios ajenos.

## Verificación y publicación

- Pruebas de comportamiento del listado con servicios simulados: abrir una guía no configura, guarda, navega ni dispara llamadas; las guías no alteran los tres contadores ni Mis conexiones y sí se encuentran por nombre/MCP.
- Prueba de la copia rechazada: la dirección sigue disponible y se informa la alternativa. Verificación manual de Tab/Enter/Espacio/Escape, foco, cierre y enlaces.
- Build de producción sin errores; revisar el diff de environments por el prebuild. Medir gradientes/primarios prohibidos antes/después y revisar listado/diálogo a 1440 y 390 px.
- Fuentes oficiales y descubrimiento público están en `fuentes.md`; una guía escrita no acredita un login OAuth real en los tres clientes. Distinguir QA del diálogo de compatibilidad de cliente y registrar cualquier limitación antes del cierre del ticket.
- Tras validación, actualizar bitácora y ticket por MCP. Publicar sólo dentro de la autorización de despliegue vigente; cerrar como Resuelto sólo cuando esté entregado, con versión y resolución concreta.

## Gate constitucional

I–III/XIII/XIV: spec/diseño aprobados y excepción IX acotada aprobada; tareas aprobadas. IV–VIII/X/XI/XV: ningún contrato externo ni write-set nuevo; auth, permisos y datos intactos. VI: catálogo declarativo, sin lógica de integración en la UI. IX: standalone/OnPush y adaptación Angular 14 arriba. XII: no se introducen flags.
