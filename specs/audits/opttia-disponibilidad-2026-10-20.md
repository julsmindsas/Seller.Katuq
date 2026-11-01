# Disponibilidad de Opttia en Katuq — revisión de producción

Fecha: 2026-10-20, America/Bogota. Petición: «revisa que Opttia esté habilitado para todos los comercios de Katuq». Solo lectura: sin cambios de configuración, permisos, usuarios, credenciales, cupos o despliegues.

## Conclusión

El chat básico no depende de una lista de empresas ni exige plan pago. Los 123 comercios que cumplen la condición productiva de empresa activa y no suspendida tienen el canal disponible por configuración. Los 91 con usuarios asociados no desactivados cuentan con al menos uno que cumple las validaciones de identidad y permisos. Los otros 32 no tienen usuarios no desactivados asociados por los campos canónicos consultados; no equivalen a 32 comercios bloqueados por Opttia.

Esto no significa que todos los usuarios puedan consultar: hay roles sin permisos, roles inexistentes e identidades que la validación no puede resolver inequívocamente. Tampoco certifica una conversación real en cada comercio, una sesión vigente o cupo diario restante para cada usuario.

## Evidencia productiva

- `routers/opttia.js`, `services/opttiaAccessPolicy.js`, `config/subscriptionLimits.js`, `services/aiLimitsService.js` y `middleware/requireRole.js`: hashes SHA-256 iguales entre archivos locales revisados y archivos vivos del backend.
- `/v1/opttia/access` sin sesión: HTTP 401; no se omitió autenticación. ADK: servicio systemd activo.
- Seller vivo: versión `2026.10.20.10`, commit `287daaffcf25c249f948d25831cac7b669fb0513`, sin cambios sin commit según `assets/version.json`. El bundle `main.18b0545bdb341c5d.js` contiene el menú de Opttia, `/agui/basic/v1`, el endpoint de acceso y la regla de exclusión por ruta.
- Lectura de `companies`, `users` y `roles` con proyección de campos, evaluando la misma política productiva; sin imprimir correos, identificaciones ni credenciales en el informe. La identidad se contrastó con el correo normalizado y `identificacion`, que el login firma como `sub`.
- Cuota mensual: función productiva `check_credit_quota(..., katuq_verified=True)` con el runtime/configuración del servidor. Beneficio Katuq encendido, 123/123 en `katuq_business`, ninguno agotado y ninguno con resultado `unknown`. Sin consumir créditos.
- Regresión local de acceso, ráfagas y seguridad MCP: **17/17 pruebas** aprobadas. No hubo cambios de código ni build de Angular.

## Cifras

| Comprobación | Resultado |
|---|---:|
| Documentos de empresas | 129 |
| Empresas que pasan la compuerta activa/no suspendida | 123 |
| Empresas fuera de esa compuerta | 6 |
| Empresas habilitadas con usuarios no desactivados | 91 |
| De esas empresas, con al menos un usuario elegible por configuración | 91 |
| Empresas habilitadas sin usuarios no desactivados asociados | 32 |
| Registros de usuario no desactivados asociados a empresas habilitadas | 201 |
| Con herramientas de consulta según rol | 147 |
| Sin herramientas por permisos o rol inexistente | 54 |
| Elegibles después de contrastar también identidad | 145 |
| Con incidencias de identidad o permisos | 56 |

Las 54 incidencias de rol son 49 registros sin permisos de consulta y cinco cuyo rol no se encontró. Hay además 15 registros con identidad ambigua o sin coincidencia exacta para la consulta del middleware; 13 ya están entre los 54 de rol. Por eso el total combinado es 56, no 69. Es una evaluación de configuración, no una prueba con JWT de cada usuario.

| Comercio | Usuarios no desactivados | Elegibles solo por rol | Sin herramientas por rol |
|---|---:|---:|---:|
| HARMONY LENS | 34 | 3 | 31 |
| Julsmind | 31 | 21 | 10 |
| ALMARA FELICIDAD | 21 | 13 | 8 |
| ALMACEN BOMBAS | 13 | 8 | 5 |

Las incidencias de identidad se distribuyen en HARMONY LENS (9), Julsmind (4) y ALMARA (2). Dos registros elegibles por rol dejan de serlo por identidad en Julsmind. No se concluye que todos los roles restringidos deban recibir acceso; requiere confirmar las funciones que corresponde consultar a cada uno.

Hay dos roles llamados `Vendedor` en ALMACEN BOMBAS, ya documentados en D-337; el código selecciona uno con `limit(1)`. Se conserva el hallazgo y no se modifican ni fusionan roles.

## Límites y condiciones que se conservan

- 112 comercios habilitados figuran como `freemium` y 11 como `premium`. El gratis permite 10 mensajes diarios **por usuario y comercio**; los planes pagos no tienen ese tope diario. Reinicio diario UTC (19:00 de Colombia).
- El chat integrado también valida el cupo mensual compartido de Opttia: el beneficio Katuq vigente corresponde a 10.000 créditos por comercio al mes. No confundir ausencia de tope diario en premium con uso mensual ilimitado.
- Freno de ráfagas: seis intentos de admisión por minuto y usuario/comercio, con los valores por defecto comprobados en la configuración del servidor.
- Administradores: familia de roles reconocida por `isAdminFamilyRole`; otros roles necesitan acciones `view` explícitas en sus módulos. Ser comercio activo no concede acceso a todos sus datos a cualquier usuario.
- El canal integrado usa la sesión JWT y MCP autenticado del comercio. No requiere que la persona genere o pegue una API key. La antigua lista de empresas de una llave de servicio de otros canales no determina la disponibilidad de este botón.
- Funciones opcionales conservan sus compuertas particulares: tienda de un paso, plan de despachos y agenda. Habilitar el chat no habilita automáticamente toda la potencia de Opttia ni sus escrituras.
- El botón se oculta deliberadamente en rutas públicas y en rutas con `hideFloatingAssistant`; no es una restricción por comercio.

## Seguimiento recomendado, no ejecutado

1. Confirmar los módulos de consulta de los roles afectados y asignar solo los permisos necesarios; no copiar permisos de administrador ni derivarlos automáticamente de menús legacy.
2. Resolver los roles inexistentes y las identidades ambiguas con el responsable de cada comercio, preservando usuarios y trazabilidad.
3. Verificar luego `/access` y una pregunta real con sesiones legítimas representativas. No se fabricaron sesiones ni se probaron cuentas ajenas.
4. No reactivar los seis documentos excluidos sin validar su estado comercial. Los cambios pendientes D-511 de recuperación automática de marca siguen siendo un candidato sin publicar; esta revisión no los despliega.
