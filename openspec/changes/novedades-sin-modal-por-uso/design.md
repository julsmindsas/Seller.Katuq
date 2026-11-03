## Context

- `update-version.js` arma `src/assets/version.json` en cada build: `version`, `publicada` y `notas` (las de `notas-version.json` con fecha posterior a la última publicación). Cada nota es `{ fecha, tipo, texto }`.
- `AvisoActualizacionComponent` (dentro del header) hace dos cosas:
  - la píldora «Versión nueva», que no bloquea;
  - desde el ticket 1377, la capa `capaNovedades`: un diálogo con fondo, movido al `<body>`, que se abre solo una vez por versión (`localStorage.notasVersionVistas`).
- `NotificationCenterComponent` (campana del header) es el centro de avisos operativos: contador, filtros, preferencias y sonido.
- `NavService.items` emite el menú ya filtrado por permisos del rol y banderas de la empresa (`pickingAlistamiento`, `serviceAgenda`, `npsModulo`, dropshipping…). A los administradores de la empresa les deja ver todas las rutas, así que el menú por sí solo no dice qué usa el comercio.

## Goals / Non-Goals

**Goals:**
- Quitar la interrupción y dejar las novedades donde el usuario las busca.
- Filtrar por módulo con lo que el front ya sabe, sin backend ni datos nuevos en el servidor.

**Non-Goals:**
- Señales del servidor (integraciones conectadas, facturas emitidas, uso por empresa).
- Cambiar la píldora de versión nueva o la recarga.

## Decisions

1. **`NovedadesService` en `shared/services/` (SRP).**
   - Responsable de:
     - leer `version.json` mediante `VersionCheckService.leerPublicada()`;
     - registrar el uso;
     - decidir qué notas aplican;
     - llevar lo visto.
   - Expone:
     - `novedades$`: las notas que aplican, de la más nueva a la más vieja;
     - `hayNuevas$`: boolean;
     - `marcarVistas()`;
     - `aplica(nota)`, que también usa la píldora.
   - La campana y la píldora solo consumen el servicio.
2. **Registro de uso por rutas del router.**
   - Se escucha `NavigationEnd`.
   - La ruta se normaliza a los dos primeros segmentos sin parámetros. Por ejemplo, `/ventas/ventas-pos?x=1` → `ventas/ventas-pos` y `/facturacion-electronica` → `facturacion-electronica`.
   - Se guarda `{ ruta: últimaVisitaISO }` en `localStorage` con la clave `novedadesUso:<email>:<empresa>`.
     - Se escribe como mucho una vez por ruta y por día.
     - Tope de 150 rutas: se descartan las más viejas.
     - Todo acceso va en try/catch.
   - No se envía a ningún lado: no es telemetría, es preferencia local.
3. **Regla de aplicación.**
   - Nota sin `modulos` → aplica a todos.
   - Con `modulos`, aplica si para algún módulo `m` se cumplen las dos condiciones:
     - el menú filtrado (`NavService.items`, incluidos los hijos) tiene una ruta igual a `m` o que empieza por `m/`;
     - en el uso hay una ruta igual a `m` o que empieza por `m/`, visitada hace 90 días o menos.
   - Coincidir por prefijo deja etiquetar una nota con `ventas` para todo el módulo de ventas, o con `ventas/ventas-pos` solo para el POS.
4. **Visto = fecha.**
   - `localStorage` guarda `novedadesVistasHasta:<email>:<empresa>` con la fecha ISO de la nota más nueva vista.
   - `hayNuevas$` es verdadero si alguna nota que aplica tiene una fecha posterior.
   - Abrir la pestaña lo actualiza.
   - Es más robusto que la versión: una nota que deja de aplicar o empieza a aplicar no rompe nada.
5. **`version.json` gana `recientes`.**
   - `update-version.js` agrega `recientes`: las notas de `notas-version.json` con fecha de los últimos 45 días, de la más nueva a la más vieja, con un máximo de 60, cada una con `fecha`, `tipo`, `texto` y `modulos`.
   - `notas` (las de esta versión) también lleva `modulos`.
   - El campo es opcional: un `version.json` viejo, sin `recientes`, cae a `notas`.
   - El script valida cada módulo contra las rutas `path: "…"` de `nav.service.ts` y avisa por consola si alguno no existe. Solo avisa: no frena un build.
6. **Pestaña en la campana.**
   - Arriba del panel van dos pestañas: «Avisos» (lo de hoy, sin cambios) y «Novedades».
   - La lista de novedades es un componente propio, `app-novedades-lista`, para no engordar los 744 líneas del centro de notificaciones.
   - El punto de la campana:
     - es un círculo de 8 px con el acento `#5F3FE0`;
     - va en la esquina opuesta al contador, así que convive con él;
     - lleva `aria-label`.
   - Diseño (D-131):
     - superficie blanca y etiquetas con el par color fuerte / fondo suave que ya usa la píldora (`act-tag--nuevo/mejora/corrige`);
     - radios de 11 px;
     - sin gradientes;
     - estado vacío con ícono, título y texto corto;
     - ningún nombre de clase con «p-»;
     - los `span` con texto llevan color propio.
7. **Se retira la capa `capaNovedades`** (HTML, el SCSS que solo usa ella, `ngAfterViewInit`/`ngOnDestroy` que la mueven al body, `mostrarNovedadesSiCorresponde`, `cerrarNovedades`). La clave vieja `notasVersionVistas` se deja de leer y de escribir.
8. **Decisión D-581** en el contrato. Reemplaza la ventana automática de D-567; la parte de D-567 que pide escribir notas en palabras sencillas sigue vigente. `AGENTS.md` agrega `"modulos": ["ruta-del-menú"]` a la forma de la nota, con la regla: módulo si la nota es de una pantalla, sin módulo solo si le sirve a todos.

## Risks / Trade-offs

- **Uso por navegador, no por empresa:** si el comercio cambia de equipo, pierde el historial. Aceptado: el peor caso es ver menos novedades, nunca más.
- **Notas generales en exceso:** si quien escribe la nota no pone módulo, vuelve el ruido. Lo mitiga la guía de `AGENTS.md` y el etiquetado de las notas recientes en este cambio.
- **Ruta renombrada:** una nota con una ruta vieja deja de verse. El aviso del build lo detecta en las notas nuevas.
- **`version.json` más pesado:** 60 notas son unos 15 KB y se pide al iniciar y en el sondeo de versión que ya existe (cada 15 minutos); comprimido son unos pocos KB.
