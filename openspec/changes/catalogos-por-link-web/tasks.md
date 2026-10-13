## 1. Base

- [x] 1.1 Leer `cotizaciones.module.ts`, `cotizaciones-routing.module.ts`, `selector-productos` y `shared/styles/_config-pagina.scss` antes de editar
- [x] 1.2 Crear `components/cotizaciones/catalogos-link/` con `catalogos-link.module.ts` y su routing (`""` → lista, `":id"` → detalle), cargado con `loadChildren` desde `cotizaciones-routing` en la ruta `catalogos`
- [x] 1.3 Modelos `catalogo-link.modelos.ts` (`CatalogoLink`, `ProductoVitrina`) según la tabla del contrato del design
- [x] 1.4 `CatalogosLinkService extends BaseService`: `listar`, `obtener`, `crear`, `editar`, `generarLink`
- [x] 1.5 Función pura `estadoCatalogo()` (Activo, Apagado o Vencido) y `armarLink(token)`, con spec unitaria (Karma no arranca en este equipo por falta de `node_modules/quill`; las mismas aserciones pasaron compiladas con tsc y ejecutadas en Node)

## 2. Lista

- [x] 2.1 Componente de lista con `config-pagina`: encabezado, botón "Nuevo catálogo" y tabla con nombre, productos, estado, vistas, pedidos recibidos y fecha
- [x] 2.2 Estado vacío con ícono, título, texto y botón para crear; estado de error con reintento
- [x] 2.3 Crear catálogo en la ruta `catalogos/nuevo` (desvío: el mismo detalle en modo creación en vez de un modal, para no duplicar el formulario): nombre, descripción, vencimiento y `app-selector-productos`; validaciones de 1 a 200 productos; al guardar, navegar al detalle

## 3. Detalle

- [x] 3.1 Encabezado con nombre, estado y botón "Volver"; bloque de link (generar, copiar, WhatsApp) con aviso si está apagado o vencido
- [x] 3.2 Interruptor de prender/apagar; apagar con confirmación Swal; prender un catálogo vencido avisa que hay que cambiar la fecha
- [x] 3.3 Editar datos (nombre, descripción, vencimiento), enviando solo lo que cambió y con Guardar deshabilitado si no hay cambios
- [x] 3.4 Lista de productos con foto (`shared/utils/imagen-producto`), precio y la marca Agotado; aviso de "N sin existencias: el comprador no los ve"; editar productos con el selector
- [x] 3.5 Aviso "Lo que pide el comprador llega como cotización" con acceso a `/cotizaciones`

## 4. Menú

- [x] 4.1 Agregar "Catálogos por link" bajo Cotizaciones en `nav.service.ts`, con `permisoPrevio: "cotizaciones"` e insignia NUEVO hasta el 2026-12-31
- [x] 4.2 Verificar que "Mi página web › Catálogos" sigue igual

## 5. Verificación y cierre

- [x] 5.1 `npm run build:prod` sin errores; revertir el cambio de versión de los environments si no se va a desplegar
- [x] 5.2 Conteo de `gradient(` y primarios prohibidos en el módulo nuevo = 0
- [ ] 5.3 En el navegador, en la empresa demo FLORECER, a 1440 y 390 px: crear catálogo, generar link, abrir `/cat/<token>` en incógnito, apagarlo y comprobar que el link da "no disponible", volver a prenderlo
- [ ] 5.4 Comprobar que ningún producto cambió: comparar `date_edit` de los productos usados antes y después
- [x] 5.5 Registrar D-416 en `specs/CONTRACT.md` (era D-413, número ya tomado por Automatizaciones)
