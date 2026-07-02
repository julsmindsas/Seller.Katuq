# Guía de screenshots — Manual de Usuarios y Reportes

Lista de las 26 capturas que el README.md espera. Cada una con:
- **Nombre de archivo**: guardalo en `screenshots/` con ese nombre exacto.
- **Pantalla a capturar**: URL + qué tiene que verse.
- **Tip de captura**: detalle visual a destacar.

> Resolución sugerida: **1440×900** (laptop). Si capturás 1920×1080 también queda bien.
> Formato: **PNG**.

---

## Screenshots 01–02 — Listado de usuarios

### `01-sidebar-usuarios.png`
**URL:** cualquier pantalla logueado como admin.
**Captura:** sidebar abierto, con el cursor sobre **Configuración → Seguridad → Usuarios**. Resaltá el path completo del menú.

### `02-listado-usuarios.png`
**URL:** `/usuarios`
**Captura:** lista completa con varias filas. Botón "Crear Usuario" visible arriba a la derecha.

---

## Screenshots 03–06 — Crear/editar usuario

### `03-form-crear-usuario-completo.png`
**URL:** `/usuarios/crearUsuario`
**Captura:** vista entera del formulario mostrando las **4 secciones** (Datos personales, Acceso al sistema, Contacto, Configuración avanzada). Datos de prueba llenos.

### `04-acceso-sistema-switch-activo.png`
**URL:** `/usuarios/crearUsuario`
**Captura:** zoom a la sección "Acceso al sistema". El switch **"Activo"** prendido (verde/azul). Email, Contraseña y Rol con datos.

### `05-seccion-contacto.png`
**URL:** `/usuarios/crearUsuario`
**Captura:** zoom a la sección "Contacto" mostrando los 2 grupos: teléfono fijo (3 campos en línea) y celular (2 campos en línea).

### `06-error-faltan-datos.png`
**URL:** `/usuarios/crearUsuario`
**Captura:** modal Swal mostrando el mensaje "Faltan datos para guardar" con los campos específicos listados (ej: "Por favor completá: Email, Rol"). Sacar dejando algunos campos vacíos a propósito.

---

## Screenshot 07 — Vendedor World Office

### `07-vendedor-wo-autocomplete.png`
**URL:** `/usuarios/crearUsuario` (con empresa Harmony Lens o cualquier tenant con integración WO activa)
**Captura:** sección "Vendedor en World Office" expandida, con el campo "Nombre del vendedor" mostrando el datalist abierto con sugerencias (ej: empezar a escribir "LE" muestra "LEYDI LORENA..."). ID WO vacío esperando autocompletar.

---

## Screenshots 08–12 — Roles y plantillas

### `08-listado-roles.png`
**URL:** `/rol`
**Captura:** lista de roles existentes con sus columnas (nombre, descripción, acciones).

### `09-banner-plantillas.png`
**URL:** `/rol/crear-rol` (al crear un rol nuevo)
**Captura:** la pantalla de creación con el **banner morado** "¿Querés empezar más rápido?" arriba.

### `10-modal-6-plantillas.png`
**URL:** `/rol/crear-rol` con el modal abierto
**Captura:** modal "Elegí una plantilla" mostrando las 6 cards con sus iconos y colores: Administrador (rojo), Director Comercial (morado), Vendedor (azul), Cajero (verde), Bodeguero (naranja), Contador (gris).

### `11-form-rol-plantilla-aplicada.png`
**URL:** `/rol/crear-rol` después de aplicar la plantilla "Vendedor"
**Captura:** form con el nombre "Vendedor" cargado, y el pickList del medio mostrando los menús del lado derecho ("asignados al rol").

### `12-editar-rol-existente.png`
**URL:** `/rol/crear-rol?id=...` (editando un rol)
**Captura:** form en modo edición, con datos cargados. Nombre del rol, menús asignados visibles en el pickList target.

---

## Screenshots 13–15 — Pantalla de bienvenida personalizada

### `13-form-bienvenida-boton.png`
**URL:** `/usuarios/crearUsuario` con rol no-admin seleccionado
**Captura:** zoom a la sección "Configuración avanzada → Pantalla de bienvenida" mostrando el texto "Al iniciar sesión, este usuario verá: **Pantalla de bienvenida (Default)**" y el botón "Cambiar pantalla de bienvenida".

### `14-modal-bienvenida-3-opciones.png`
**URL:** modal abierto desde el botón anterior
**Captura:** modal con los **3 radios** (Default / Una página específica / Un reporte guardado) y uno expandido mostrando su dropdown (ej: opción "Un reporte guardado" con el dropdown de reportes desplegado).

### `15-reporte-ejecutado-vista.png`
**URL:** `/dashboards/view/<algún-id-de-reporte-real>`
**Captura:** vista previa de un reporte ejecutado mostrando la tabla con datos reales.

---

## Screenshots 16–24 — Constructor de Reportes

### `16-builder-vacio.png`
**URL:** `/dashboards/builder`
**Captura:** pantalla recién abierta. Panel izquierdo con fuente "Pedidos" seleccionada y dimensiones listadas. Zonas centrales (FILAS/COLUMNAS/VALORES) vacías. Botón "Ejecutar" arriba a la derecha.

### `17-dropdown-fuentes.png`
**URL:** `/dashboards/builder`
**Captura:** el dropdown "Fuente de datos" **desplegado** mostrando las opciones disponibles (Pedidos, Productos, Inventario, Clientes, Documentos contables, Cartera).

### `18-builder-con-zones-llenas.png`
**URL:** `/dashboards/builder`
**Captura:** Vendedor en FILAS, Total en VALORES, antes de hacer click en Ejecutar.

### `19-fechas-toolbar.png`
**URL:** `/dashboards/builder`
**Captura:** zoom a los 2 inputs de fecha "Desde" y "Hasta" en la toolbar, con valores ejemplo (01/05/2026 → 31/05/2026).

### `20-builder-ejecutado-tabla.png`
**URL:** `/dashboards/builder`
**Captura:** reporte ejecutado mostrando la tabla con datos reales (puede ser de cualquier tenant).

### `21-builder-grafico-barras.png`
**URL:** `/dashboards/builder`
**Captura:** mismo reporte pero con visualización **Bar** seleccionada (gráfico de barras).

### `22-modal-guardar-reporte.png`
**URL:** `/dashboards/builder`
**Captura:** modal/Swal pidiendo nombre del reporte, con un campo llenado (ej: "Ventas marzo por vendedor").

### `23-botones-export.png`
**URL:** `/dashboards/builder` con reporte ejecutado
**Captura:** zoom a los botones de export arriba a la derecha (Excel / PNG / PDF).

### `24-banner-vendedor-verde.png`
**URL:** `/dashboards/builder` logueado como vendedor (rol Asesor Comercial / VENTAS)
**Captura:** la pantalla con el **banner verde** "Estás viendo solo tus ventas. Los pedidos y facturas de otros vendedores no aparecen en este reporte." visible arriba de las zonas.

---

## Screenshots 25–26 — Dashboards y vista de reporte

### `25-galeria-reportes.png`
**URL:** `/dashboards`
**Captura:** galería de reportes guardados como cards (cada card con nombre + descripción + miniatura).

### `26-vista-reporte-readonly.png`
**URL:** `/dashboards/view/<id>`
**Captura:** vista del reporte sin panel izquierdo (no constructor), solo con la tabla/gráfico y la toolbar con fechas + export. Es el modo "ver" no editable.

---

## Cómo tomar las capturas

1. Hacé login en `sellercenter.katuq.com` con tu cuenta de Administrador.
2. Para screenshots 24 (banner vendedor) y similar, logueate con un usuario rol Vendedor / Asesor Comercial. Ej: `lorenaflorez2890@gmail.com / Katuq2026!` en Harmony.
3. Captura con la **herramienta de captura de Windows** (Win+Shift+S) o macOS (Cmd+Shift+4).
4. Guardalos como PNG en `docs/manuales/usuarios-y-reportes/screenshots/` con el nombre exacto de esta guía.
5. Una vez todos colocados, los placeholders del README.md se reemplazan con:

```markdown
![Sidebar usuarios](screenshots/01-sidebar-usuarios.png)
```

> Si querés que automatice ese reemplazo masivo cuando termines de pegar las imágenes, decimelo.
