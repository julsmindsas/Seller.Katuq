# Diff para revisar — D-569

Revisión del 28-oct-2026. Daniel aprobó este diff concreto; se aplicó localmente tras verificar hashes/base y pasaron 83 pruebas. El 29-oct autorizó Git/despliegue y quedó publicado según `publicacion.md`. Los apartados siguientes conservan el contenido de la revisión presentada.

## Qué se solicita aprobar

Archivo: [permissions-review.patch](permissions-review.patch). Tres archivos, 19 inserciones y 6 eliminaciones:

| Archivo del backend | Cambio |
|---|---|
| `functions/routers/opttia.js` | Calcular elegibilidad antes de añadir voz; rechazar el rol sin acceso previo; autorizar solo la nueva lectura por nombre exacto, con admisión vigente y sin argumentos; inyectar el marcador interno solo para esa tool después de validar. |
| `functions/tools/toolRegistry.js` | Registrar la tool de tono y ocultarla del catálogo genérico, incluso con `admin`. La propia tool exige contexto interno para rechazar llamadas directas desde otro canal. |
| `functions/tests/opttia-access.test.js` | Actualizar una prueba **ya versionada**: el usuario solo soporte conserva ese acceso y recibe además tono; las revocaciones siguen denegándolo. No se incluyen pruebas nuevas. |

No cambia `TOOL_PERMISSIONS`, `canUseTool`, Marca→Ver, auth middleware, interceptor, token de admisión, quotas, créditos o scopes generales. No modifica cuentas, roles, perfiles, documentos, acciones comerciales o configuración de soporte. No activa aún la personalización en ADK: eso sigue después de integrar y comprobar este backend.

## Preparación que ya está en la copia local

`brandVoice.js`, `getCompanyBrandVoice.js` y la nueva lectura `brandKnowledge.getVoice` están implementados como preparación sin registro/anuncio. La herramienta exige empresa concreta y marcador interno antes de leer. La proyección acepta solo las etiquetas completas del catálogo aprobado, devuelve enums y no lee documentos. Estos tres archivos son dependencia del parche; no publicar el registro sin ellos.

Las pruebas nuevas locales están ignoradas por Git según D-566. El parche solo actualiza una prueba que ya estaba versionada, sin credenciales reales.

## Base y vigencia de la revisión

- Backend local y publicado al comprobar: `d4c85ed62029c6441a229a15ac35231ca7d8961a`. Lectura SSH únicamente, sin reinicios o modificaciones. Los cuatro archivos revisados de permisos/marca coinciden entre local y producción antes de esta entrega.
- ADK publicado observado: `4a61ae4a441d1053b139532761d5bd57d6a87c38`. El árbol ADK local tiene otros cambios; no se copió o publicó. Su endpoint no se modificó en esta fase.
- SHA-256 del parche: `3e28f991d0529bf284ecf5cfa87caa6a51f28dd04d879c04d16f7721a169a2c9`.
- `git apply --check` correcto desde la raíz del backend. Antes de aplicar tras la aprobación, volver a comprobar base y hashes; si hay un cambio material concurrente, rehacer y presentar el diff actualizado.

| Archivo | SHA-256 de base |
|---|---|
| `functions/routers/opttia.js` | `fe26d94de2838f296f664c983de81204eaeb700180012f6072e9cfa596bf12e1` |
| `functions/tools/toolRegistry.js` | `99c6c066c1473994a5f215b394cf60a2eb32763a9582ef608275d887d8d10d31` |
| `functions/tests/opttia-access.test.js` | `ffe2eaeb60a4a02e11667a508eb8ec0c9c38baa59465ec7de20a0516ccdce672` |

## Validación del candidato aislado

**83/83 pruebas Node en verde**: 52 de referencia y 31 nuevas (22 de proyección/lectura y 9 de acceso/registro/transporte). Incluye Express y SDK MCP reales por HTTP local con JWT sintético, persistencia simulada y registro real con las herramientas de negocio sustituidas por dobles. No se usó Firestore real, una cuenta real o un modelo para esa prueba.

Se verificó: roles de ventas/inventario/Marca, gratuito/premium, rol vacío, solo edición, usuario/empresa inactivos, sesión vencida, solo soporte y su revocación; admisión ausente, ajena o caducada; retirada de Marca con/sin otro acceso; tool cerrada y sin documentos; marcador falsificado desde argumentos/cabecera/_meta; ausencia del marcador en otra tool; catálogo genérico con `read`/`admin`; llamadas directas sin contexto; cero consumo doble y cupo gratuito sin ampliación. La proyección incluye centinelas de campos internos, texto adicional, URL, normalización y comercio ambiguo.

`node --check` sin errores en los tres archivos de preparación y los dos archivos de ejecución propuestos. En el repositorio activo, sin el parche de permisos, pasan **74/74** pruebas de preparación y referencia. Los contratos de la nueva autorización fallan donde se espera hasta aplicar el parche; no se presentan como una capacidad activa.

Pendientes después del gate: integración ADK, manejo tipado de fallos, presupuesto completo del runner, respuestas del modelo real, regresión final y publicación autorizada. Los contratos Python preparados fallan por el helper aún no implementado; no se cuentan como pruebas del modelo o del producto en verde. No se hicieron nuevas conversaciones con ALMARA, cambios de roles ni tickets/avisos reales.

## Punto de detención

La aprobación recibida cubre **aplicar este diff de autorización**, no Git/despliegue o modificaciones a comercios. T-05 se completó tras ese «sí»; no se sustituyó su gate por la aprobación genérica del diseño/tareas. La integración posterior y sus pruebas se documentan por separado.
