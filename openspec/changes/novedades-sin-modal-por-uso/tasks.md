## 1. Datos de la versión

- [x] 1.1 Leer `update-version.js` completo. Agregar `modulos` a cada nota y la lista `recientes`: últimos 45 días, de la más nueva a la más vieja, máximo 60. Un `version.json` sin `recientes` debe seguir funcionando en el front.
- [x] 1.2 En `update-version.js`, validar cada módulo contra las rutas `path: "…"` de `nav.service.ts` y avisar por consola los desconocidos, sin frenar el build.
- [x] 1.3 Etiquetar con `modulos` las notas de `notas-version.json` de los últimos 45 días (sin borrar ni reescribir textos). Las que le sirven a todos quedan sin módulo.

## 2. Servicio de novedades

- [x] 2.1 Crear `shared/services/novedades-version.service.ts`. Debe:
  - registrar el uso por `NavigationEnd`, con claves por email y empresa, como mucho una escritura por ruta y por día, tope de 150 rutas y try/catch;
  - aplicar la regla de menú (`NavService.items`) y la de uso en los últimos 90 días;
  - exponer `novedades$`, `hayNuevas$`, `marcarVistas()` y `aplica(nota)`.
- [x] 2.2 Extender `NotaVersion` con `fecha?` y `modulos?`, y `VersionPublicada` con `recientes?`.

## 3. Pantalla

- [x] 3.1 Retirar de `aviso-actualizacion` la capa `capaNovedades`:
  - su HTML y el SCSS que solo usa ella;
  - el movimiento al `<body>`;
  - `mostrarNovedadesSiCorresponde`, `cerrarNovedades` y la clave `notasVersionVistas`.
- [x] 3.2 Hacer que «Ver notas» de la píldora filtre con `aplica(nota)` y se oculte si no queda ninguna nota.
- [x] 3.3 Crear `app-novedades-lista` con la lista, las etiquetas, la fecha y el estado vacío (D-131, sin gradientes ni clases con «p-»).
- [x] 3.4 En `notification-center`, agregar:
  - las pestañas «Avisos» y «Novedades» (Avisos tal cual está hoy);
  - el punto de 8 px en la campana y en la pestaña;
  - `marcarVistas()` al abrir Novedades.
- [x] 3.5 Agregar las claves de i18n en es, en, pt y de, y correr `i18n:check` sin errores nuevos.

## 4. Reglas y verificación

- [x] 4.1 `AGENTS.md` (D-567): agregar `modulos` a la forma de la nota y la regla de cuándo ponerlo.
- [x] 4.2 `specs/CONTRACT.md`: registrar D-581 y marcar SUPERSEDED la ventana automática de D-567.
- [x] 4.3 Hacer el build de producción sin errores.
- [x] 4.4 Contar gradientes y primarios prohibidos de los archivos tocados: no deben subir.
- [x] 4.5 Probar localmente las reglas, sin datos reales:
  - nota general;
  - nota de un módulo usado;
  - nota de un módulo no usado;
  - nota de un módulo fuera del menú;
  - navegador sin historial;
  - dos empresas en el mismo navegador.
- [ ] 4.6 Revisar la campana en el navegador a 1440 y 390 px, sin texto invisible ni scroll horizontal.
- [x] 4.7 Agregar a `notas-version.json` una nota MEJORA, en palabras sencillas, que diga que las novedades ahora están en la campana y solo muestran lo que usa cada uno.
- [ ] 4.8 Commit de los archivos propios, push, publicar el front (sin backend) y verificar en `sellercenter.katuq.com`.
