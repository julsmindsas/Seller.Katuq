## Why

Daniel, 22-oct: «arregla esos permisos para que los empleados puedan usar Opttia, pero solo consultar lo que les corresponde según su rol».

La auditoría de 20-oct identificó roles sin permisos granulares y otros inexistentes. La lectura productiva de 22-oct confirma permisos vacíos en roles comerciales, contables, logísticos y de inventario de los cuatro comercios afectados. Los menús legacy no son una autorización granular y algunos nombres no describen una función reconocible.

Hay un prerrequisito de seguridad ya documentado en D-474: conceder lectura de ventas también ofrece métricas que todavía no aplican «cada vendedor ve solo sus métricas». Esa opción está activa en ALMARA y ALMACEN BOMBAS. Se revalidó el código vivo por hash; no basta con añadir permisos para cumplir la petición.

## What Changes

- Habilitar consultas de empleados mediante permisos explícitos y mínimos del rol vigente en su comercio; nunca por una regla general «todo empleado puede todo».
- Respetar el alcance por persona que Katuq ya establece para cada dominio, incluida la configuración de métricas propias. Corregir este prerrequisito antes de conceder acceso comercial afectado.
- Separar consultas comerciales, de inventario, logística y contabilidad; no conceder una familia de herramientas completa si incorpora información ajena a la función.
- Corregir únicamente roles inequívocos mediante una lista concreta revisada antes de aplicarla. Conservar los menús, nombres y permisos existentes que no forman parte del cambio; añadir solo consulta.
- Mantener bloqueados los roles inexistentes, ambiguos y las identidades duplicadas hasta resolver su función o identidad legítimamente. Mostrar el motivo, sin sustituirlos por administrador ni por un rol de otro comercio.
- Verificar primero en simulación y probar tanto consultas permitidas como prohibidas, cambio de rol y aislamiento entre comercios antes de publicar o aplicar datos.

## Alcance por función propuesto

| Función | Consultas elegibles, solo si corresponden a sus atribuciones verificadas |
|---|---|
| Comercial | Productos, existencias, clientes y pedidos; cifras de ventas con el alcance personal vigente |
| Dirección comercial | Consultas del área comercial y sus métricas de equipo; no administración general |
| Bodega / inventarios | Catálogo, existencias, bodegas y movimientos; despachos únicamente si el rol los tiene autorizados |
| Logística | Despachos y datos necesarios para entregar; no cartera ni métricas comerciales globales |
| Contabilidad / tesorería | Cartera y consultas contables del rol; no ajustes, aprobaciones de pago ni datos ajenos a esa función |
| Producción, soporte o roles de nombre propio | Sin permisos prestados de otra área: identificar primero consultas compatibles; si no existen, explicar la limitación |

La tabla establece límites, no autoriza una asignación automática por nombre o menú. Los roles concretos y cualquier excepción necesitan validación antes de escribir datos. El permiso de marca/documentos tampoco se concede indiscriminadamente: esos archivos pueden contener información interna de otra área.

## No-goals

- No incorporar `analyze_sales`, memoria ni nuevas capacidades de la propuesta D-474. Reutilizar solo su requisito de alcance por persona, sin declarar aprobada la propuesta completa.
- No nuevos endpoints, colecciones, API keys, agentes o formatos documentales; no ampliar cuotas, planes, modelos o herramientas de escritura.
- No modificar usuarios, fusionar identidades, crear roles inexistentes ni asignar personas a roles por semejanza de nombres.
- No reactivar comercios ni modificar ventas, inventario, productos, precios, pagos o despachos.
- No publicar el candidato de recuperación documental D-511 como parte de este cambio.

## Riesgos y constitución

Seguridad y multitenancy: permisos y alcance se deciden con identidad validada en servidor, nunca con el prompt o argumentos editables. Inventario/pedidos/productos/precios son de solo lectura; el write-set de la reparación se limita a permisos de roles identificados y auditoría existente, con simulación, control de cambios concurrentes y reversión.

Cumple especificación previa, contratos primero, separación de dominios y observabilidad sin credenciales ni datos personales en claro. No hay cambio de diseño visual propuesto ni escritura sobre módulos sensibles.

## Estado / checkpoint

Propuesta y especificación preparadas. Pendiente de aprobación antes de diseño y tareas según `SPEC-DRIVEN.md`. La petición autoriza corregir el problema, pero no sustituye la definición de atribuciones ambiguas. No se han cambiado permisos ni código productivo.
