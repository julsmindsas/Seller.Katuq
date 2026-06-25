# Spec 007 — Venta asistida, Paso 1 (Cliente) ligero y sin callejones

> Estado: **approved** (Q-01..Q-05 resueltas — ver §8; aprobada 2026-06-05, D-038)
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-06-05

## 1. Contexto / Por qué
El Paso 1 (Cliente) de la venta asistida tiene un buscador ambiguo: si el vendedor escribe y no elige una sugerencia, queda atrapado (no avanza, no puede crear, y a veces no puede volver a buscar el mismo término). Esto frena la operación diaria de venta. Además la búsqueda recorre hoy toda la base de clientes del comercio en cada consulta, lo que hace lenta la experiencia en equipos modestos.

## 2. Objetivo de negocio
El vendedor identifica o da de alta un cliente en el Paso 1 sin trabarse nunca, y la búsqueda responde de forma fluida tanto en móvil de gama baja como en computador de oficina modesto. Resultado medible: cero estados sin salida en el Paso 1 y respuesta de búsqueda p95 ≤ 300 ms con catálogos de hasta 10.000 clientes.

## 3. User stories
- Como **vendedor** quiero **buscar un cliente por documento, nombre, correo o celular** para **asociarlo a la venta rápido**.
- Como **vendedor** quiero que, **si el cliente no existe, se me ofrezca crearlo con lo que ya escribí**, para **no repetir datos ni quedarme bloqueado**.
- Como **vendedor** quiero **volver a buscar tantas veces como necesite** (incluido el mismo término), para **corregir sin recargar la página**.
- Como **vendedor** quiero **cambiar el cliente asociado** sin ambigüedad sobre cuál está activo, para **no enviar la venta al cliente equivocado**.
- Como **vendedor en un equipo modesto** quiero que **el Paso 1 cargue y responda ágil**, para **atender sin esperas**.

## 4. Criterios de aceptación (notación EARS)

**Búsqueda**
- WHEN el vendedor escribe al menos 2 caracteres en el buscador THE system SHALL mostrar las coincidencias de cliente en ≤ 300 ms (p95).
- WHILE el vendedor no haya escrito el mínimo de caracteres THE system SHALL no ejecutar búsqueda y SHALL indicar el mínimo requerido.
- WHEN el vendedor vuelve a escribir un término ya buscado antes THE system SHALL ejecutar la búsqueda de nuevo y mostrar resultados.
- THE system SHALL usar el mismo umbral mínimo de caracteres en todos los puntos del flujo (sin discrepancias entre lo que muestra y lo que consulta).
- THE system SHALL buscar sobre documento, nombre, apellido, correo y celular, y SHALL ordenar los resultados por relevancia: coincidencia exacta de documento primero, luego coincidencias por inicio de documento, luego nombre/apellido, luego correo y teléfonos.
- THE system SHALL hacer coincidir por el **inicio** de cada campo, **sin distinguir mayúsculas/minúsculas ni tildes** (apellido cuenta como campo propio, de modo que buscar un apellido lo encuentre). La coincidencia por subcadena en mitad de una palabra queda fuera de alcance (ver §6 y D-Q02).

**Selección**
- WHEN el vendedor selecciona un cliente de las coincidencias THE system SHALL asociarlo a la venta y mostrar de forma inequívoca cuál es el cliente activo.
- WHEN se asocia un cliente nuevo en reemplazo de uno anterior THE system SHALL descartar los datos de envío y facturación del cliente previo para no contaminar la venta.

**Sin coincidencias / creación**
- IF la búsqueda no arroja coincidencias THEN THE system SHALL ofrecer crear un cliente precargando el dato escrito (documento, nombre, correo o celular según corresponda).
- WHEN el vendedor crea un cliente que ya existía (documento repetido) THE system SHALL detectarlo y asociarlo en lugar de duplicarlo.
- WHEN se crea un cliente nuevo correctamente THE system SHALL asociarlo a la venta y dejar el Paso 1 listo para continuar.
- THE system SHALL exigir como mínimo, para crear un cliente: tipo y número de documento, nombres, y celular (indicativo + número).
- THE system SHALL tratar apellidos y WhatsApp como opcionales; el número de WhatsApp por defecto copia el celular.
- WHERE la venta vaya a generar factura electrónica THE system SHALL exigir además el correo electrónico, validado en el paso de facturación, sin bloquear la creación del cliente en el Paso 1.

**Estado y navegación**
- THE system SHALL mantener una única fuente de verdad sobre el cliente asociado (un solo estado observable), sin estados contradictorios entre el buscador, el resumen y el formulario.
- WHILE no haya un cliente asociado THE system SHALL impedir avanzar al Paso 2 e indicar la acción pendiente.
- WHEN hay un cliente asociado THE system SHALL permitir avanzar al Paso 2.
- WHEN el vendedor limpia el buscador THE system SHALL permitir iniciar una búsqueda nueva sin recargar y sin perder el cliente ya asociado salvo que lo reemplace explícitamente.
- THE system SHALL permitir editar los datos del cliente asociado y volver al estado de consulta sin perder la asociación.

**Categoría / lista de precios**
- THE system SHALL permitir asignar la categoría (lista de precios) del cliente dentro del Paso 1 y mostrar de forma clara cuál quedó aplicada.
- THE system SHALL dejar el cálculo de precios según esa lista para el Paso 2 (fuera de alcance de esta spec).

## 5. Requisitos no funcionales

### 5.1 Performance
- Búsqueda de clientes: latencia p95 ≤ 300 ms con catálogos de hasta 10.000 clientes por comercio (peor caso real medido: 7.212 clientes en un comercio); el costo de la búsqueda no debe crecer linealmente con el tamaño total del catálogo (sin recorrer toda la base por consulta).
- La búsqueda **no modifica los datos de los clientes existentes**: se apoya en un índice de búsqueda mantenido en un almacén separado (mecanismo concreto en el plan). Un proceso inicial construye ese índice una sola vez sin tocar los datos de clientes; de ahí en más el índice se mantiene al crear/editar/eliminar clientes. La colección de clientes original queda intacta y, si el índice fallara, es descartable y reconstruible sin riesgo a los datos.
- Equipo de referencia para medir el piso de performance (reproducible y verificable):
  - Móvil gama baja: Android de gama baja real **o, equivalente**, navegador con CPU 4× más lenta + red "Slow 4G".
  - Desktop modesto: equipo de oficina ~8 GB RAM con navegador de escritorio reciente, sin throttling.
- Paso 1 interactivo (listo para escribir) en ≤ 1,5 s sobre el equipo de referencia de gama baja.
- Peso visual/recursos del Paso 1 reducido respecto del actual para no degradar equipos modestos.

### 5.2 Seguridad
- La búsqueda y la creación/edición de clientes operan solo dentro del comercio del usuario autenticado (aislamiento multi-tenant).
- Datos personales completos del cliente no se exponen en logs en claro.

### 5.3 Observabilidad
- Errores de búsqueda y de creación/edición de cliente quedan registrados de forma estructurada (sin volcar datos personales), suficientes para diagnosticar fallas sin reproducir manualmente.

### 5.4 Accesibilidad (UI)
- El buscador y la lista de coincidencias son operables por teclado (navegar, seleccionar, limpiar) y legibles tanto en pantalla móvil como de escritorio.

### 5.5 Resiliencia
- IF la búsqueda falla por error de red o backend THEN THE system SHALL informarlo y permitir reintentar sin dejar el campo inutilizable.
- La creación de cliente es idempotente frente a doble envío (no genera clientes duplicados).

## 6. Out of scope (explícito)
- Pasos 2 a 6 del wizard (Productos, Carrito, Envío y Datos, Pago, Confirmación).
- El módulo POS (`pos-crear-ventas`) y la variante `pos2`.
- Listado/gestión de clientes fuera de la venta (`ventas/clientes`).
- Facturación electrónica y datos de entrega como features propias (solo se respeta que un cambio de cliente no contamine datos previos).
- Modificación o migración de la colección de clientes existente (el índice de búsqueda vive aparte; los datos de clientes no se tocan).
- Búsqueda por subcadena en mitad de una palabra (solo coincidencia por inicio de campo/palabra).
- Cálculo de precios según la lista del cliente (ocurre en el Paso 2).

## 7. Dependencias
- Servicio de búsqueda y de alta/edición de clientes del comercio.
- Se mantiene el formato de wizard de pasos existente (decisión de alcance D-037): esta spec re-arquitecta el contenido del Paso 1, no reemplaza el paradigma de navegación.

## 8. Clarificaciones resueltas (2026-06-05)

> Bloque `[NEEDS CLARIFICATION]` cerrado con el responsable de producto. Detalle también en CONTRACT.md.

- **D-Q01 — Campos y relevancia:** buscar por documento, nombre, apellido, correo, celular y WhatsApp. Orden de relevancia: documento exacto → inicio de documento → nombre/apellido → correo → teléfonos. (Mantiene la capacidad actual.)
- **D-Q02 — Búsqueda performante sin tocar los datos de clientes (Opción B):** la búsqueda se apoya en un **índice mantenido en un almacén separado**; la colección de clientes existente **no se modifica** (riesgo a los datos = nulo, sin migración). Permite coincidencia por inicio de campo/palabra **sin distinguir mayúsculas/tildes** (incluido apellido como campo propio). Un proceso inicial construye el índice una vez y luego se mantiene en cada alta/edición/baja de cliente. Concesión aceptada: no hay coincidencia por subcadena en mitad de palabra. Decisión motivada por: (a) la cautela del usuario de no dañar a los clientes existentes; (b) que la búsqueda por prefijo puro (sin índice) no resuelve nombres con mayúsculas inconsistentes. (Dato real que respalda el volumen: peor caso 7.212 clientes/comercio, 10.267 totales en 21 comercios.) Alternativas descartadas: prefijo puro sin índice (frágil con mayúsculas en nombres), campo normalizado dentro de cada cliente (toca los datos del cliente).
- **D-Q03 — Campos obligatorios mínimos:** obligatorios siempre = tipo+número de documento, nombres, celular. Apellidos y WhatsApp opcionales (WhatsApp copia el celular por defecto). Correo obligatorio solo si la venta genera factura electrónica, validado en el paso de facturación.
- **D-Q04 — Equipo de referencia:** perfil reproducible + clase de dispositivo. Móvil gama baja ≈ CPU 4× lenta + Slow 4G; desktop modesto ≈ 8 GB RAM, navegador reciente sin throttling.
- **D-Q05 — Categoría/lista de precios:** el **selector** entra en el Paso 1; el **cálculo de precios** según la lista queda fuera (Paso 2).

## 9. Riesgos identificados
- R-01: El índice de búsqueda puede quedar desincronizado de los clientes si algún flujo de alta/edición no lo actualiza. Mitigación: centralizar la escritura del índice en los puntos de alta/edición/baja + un proceso de reconciliación periódico de bajo costo que detecte y corrija desfases. El índice nunca es fuente de verdad: ante duda, se reconstruye desde los clientes.
- R-04: La búsqueda por inicio de campo no encuentra coincidencias por subcadena (mitad de palabra). Mitigación: indexar apellido como campo propio (cubre el caso más común) + orden de relevancia claro.
- R-02: Extraer el Paso 1 de un componente monolítico de gran tamaño puede romper integraciones con los pasos siguientes (carrito, envío, facturación, IA de ventas). Mitigación: preservar el contrato de datos que el Paso 1 entrega al resto del wizard.
- R-03: Eliminar rutas de código legacy del Paso 1 podría afectar otros consumidores no evidentes. Mitigación: auditar usos antes de borrar.

## 10. Métricas de éxito post-launch
- Estados sin salida en el Paso 1 reportados por usuarios: 0 en la primera ventana de 30 días.
- Latencia p95 de búsqueda de clientes ≤ 300 ms medida en producción durante 7 días.
- Clientes duplicados creados desde el Paso 1: 0 atribuibles a doble envío en 30 días.

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [x] Bloque `[NEEDS CLARIFICATION]` resuelto.
