## ADDED Requirements

### Requirement: Estructura aprobada del menú (F3)
THE menú SHALL seguir este orden y estos nombres (mapa de ALMARA del ticket 1336). Entre paréntesis va el nombre de hoy. Cada entrada SHALL abrir la misma pantalla que abre hoy.

| Sección | Grupo o enlace directo | Ítems |
|---|---|---|
| **Gestión comercial** | Clientes | Nuevo cliente (Crear cliente) · Listado (Listado de clientes) |
| | Ventas | Venta asistida · Venta masiva (Ventas masivas) · POS (Ventas POS) |
| | Cotizaciones | Listado (Listado de cotizaciones) · Nueva (Nueva cotización) |
| | Sitio web (Mi página web) | Mis sitios · **Landings** (nuevo) · Catálogo web (Catálogos) · Catálogo por link (Catálogos por link, sale de Cotizaciones) |
| | CRM | Pipeline · Seguimiento · Prospectos (Clientes corporativos, sale de Clientes) |
| **Operaciones** | Pedidos | Todos (Todos los pedidos) · POS (Pedidos POS) |
| | Producción → enlace directo | (Órdenes de producción) |
| | Logística | Envíos (Envíos y entregas) · Centro operativo (Centro de operaciones) |
| | En vivo → enlace directo | (ver la segunda tabla) |
| **Inventario** (Inventarios y productos) | Productos | Listado (Productos) · Adiciones · Combos |
| | Bodegas (Inventarios) | Existencias (Inventario por bodega) · Detalle (Detalle por bodega) · Ajustes (Ajustes de inventario) · Traslados (Traslados entre bodegas) · Abastecimiento (Central de Abastecimiento) · Movimientos (Historial de movimientos) · Indicadores (Indicadores de bodega) · Mapa (Mapa de la bodega) · Conteos (Conteos de inventario) |
| | Compras | Qué comprar · Órdenes (Órdenes de compra) · Proveedores |
| | Precios → enlace directo | (Lista de precios › Lista de precios) |
| **Finanzas** (sin el grupo intermedio «Finanzas») | Enlaces directos | Facturación (Facturación electrónica) · Tesorería · Cartera (Cartera (CxC)) · Contabilidad |
| **Marketing** | Campañas | (Dashboard de Marketing; ver la segunda tabla) |
| **Comunicaciones** (antes grupo «Mensajes») | Enlaces directos | WhatsApp · Instagram · Facebook · TikTok · Correo · Llamadas |
| **Analítica** (Inteligencia de negocios) | Indicadores | Panel gerencial (Dashboard gerencial) · Reportes (Constructor de reportes) |
| | Agentes IA (Agent Builder) | Mis agentes (Mis Agentes IA) · Nuevo agente (Crear Agente) |
| **Configuración** | Grupos | Seguridad · Módulos variables · Inventario (Inventarios y productos) · Productos (Producto) · Logística · Pagos · Integraciones · Notificaciones |

Las insignias SHALL quedar así, con las fechas de vencimiento que tienen hoy:

- NUEVO en Catálogo web, Catálogo por link, Facturación, Cartera y Contabilidad;
- PRONTO en TikTok, Correo y Llamadas.

#### Scenario: Pantalla renombrada
- **WHEN** el usuario toca Inventario › Bodegas › Existencias
- **THEN** abre la misma pantalla que hoy abre «Inventario por bodega», con los mismos datos y permisos

### Requirement: Módulos que el mapa no menciona (F3)
Las entradas que ALMARA no ve SHALL quedar así. Los nombres siguen las reglas de módulos nuevos.

| Hoy | Queda en | Nombres |
|---|---|---|
| Dropshipping: Dashboard, Proveedores, Productos, Órdenes | Gestión comercial, después de CRM | Panel · Proveedores · Productos · Órdenes |
| NPS: Resultados, Encuestas, Seguimiento | Gestión comercial, después de Dropshipping | Sin cambio |
| Agenda: Citas, Horario y personas | Operaciones, después de Producción | Citas · Horarios |
| En vivo › Katuq en vivo (solo administradores de Julsmind) | Operaciones › En vivo | Para Julsmind, En vivo sigue siendo un grupo con En vivo y Katuq en vivo. Para los demás es un enlace directo |
| Picking y packing: Órdenes de picking, Órdenes de packing | Inventario, después de Compras | Alistamiento: Picking · Packing |
| Marketing: Campañas (historial de envíos) y Pauta (solo Julsmind) | Marketing › Campañas | Panel (hoy Dashboard de Marketing) · Historial. Pauta sigue igual. Quien solo ve el panel ve «Campañas» como enlace directo, como pide ALMARA |
| Agent Builder: KAI Chat, Chat Básico, Monitor A2A | Analítica › Agentes IA | Chat KAI · Chat básico · Monitor A2A |

Configuración Plataforma y Empresa no cambian. Los subítems de Configuración (nota 6 del ticket) SHALL tomar estos nombres, que se validan con ALMARA antes de publicar F3: Módulos variables: Producción · Dropshipping · Campos. Inventario: Categorías · Bodegas · Canales · Bodegas por canal. Productos: Ocasiones · Géneros · Tipos de cliente · Descuentos. Pagos: Métodos · Métodos POS. Integraciones: Conexiones · Automatizaciones. Notificaciones pasa a enlace directo. Logística no cambia.

#### Scenario: Administrador de Julsmind
- **WHEN** un administrador de Julsmind abre Operaciones
- **THEN** ve el grupo En vivo con «En vivo» y «Katuq en vivo», mientras que un usuario de ALMARA ve «En vivo» como enlace directo

### Requirement: Grupos de un solo hijo y grupos vacíos (F3)
IF un grupo tiene un solo hijo, ya sea por definición o después de filtrar por el rol del usuario, THEN THE menú SHALL mostrar un enlace directo con el nombre y el ícono del grupo, que abre ese hijo. IF un grupo queda sin hijos visibles, THEN THE menú SHALL NOT mostrarlo. IF una sección queda sin entradas visibles, THEN THE menú SHALL NOT mostrarla.

#### Scenario: Rol con una sola pantalla de Pedidos
- **WHEN** un rol solo tiene «Todos los pedidos»
- **THEN** ve «Pedidos» como enlace directo, que abre Todos los pedidos, sin chevron ni submenú

### Requirement: Rutas y permisos intactos (F3)
THE reestructura SHALL NOT cambiar ninguna ruta existente, los permisos de ningún rol ni el contenido, los filtros o el título de ninguna pantalla. Quien hoy ve una pantalla SHALL seguir viéndola, y nadie SHALL ganar acceso a una pantalla que hoy no ve. Además:

- **Landings** SHALL verse solo para quien ve «Mis sitios», y SHALL abrir la lista de Mis sitios con solo los sitios de tipo landing;
- **Catálogo por link** SHALL seguir viéndose para quien ve Cotizaciones (D-416);
- **Prospectos** SHALL abrir la pantalla de hoy de Clientes corporativos, con los mismos datos y filtros.

#### Scenario: Landings
- **WHEN** un usuario con acceso a Mis sitios toca Sitio web › Landings
- **THEN** ve la lista de sus sitios filtrada a las landings, con las mismas acciones de Mis sitios

### Requirement: Favoritos conservados (F3)
WHEN un navegador carga por primera vez el menú de F3, THE sistema SHALL convertir los favoritos guardados al menú nuevo sin perder ninguno y sin pasar del límite de 5:

- **favorito de pantalla:** queda con el nombre nuevo y su estrella marcada;
- **favorito de grupo que cambia de nombre:** pasa al grupo nuevo (Inventarios → Bodegas, Inventarios y productos de Configuración → Inventario, Producto → Productos de Configuración);
- **favorito de grupo que pasa a enlace directo** (Producción, Lista de precios, En vivo): queda como ese enlace;
- **favorito de grupo que desaparece** (Finanzas, Mensajes): queda como favorito de su sección (Finanzas, Comunicaciones) y muestra sus pantallas debajo, como en D-517;
- **nombre que hoy se repite** (Logística): el favorito queda en el grupo que abre hoy.

La conversión SHALL hacerse una sola vez por navegador y SHALL respetar el rol: un favorito de una pantalla que el rol ya no ve se descarta, como hoy.

#### Scenario: Favoritos de antes
- **WHEN** un usuario tenía como favoritos «Inventario por bodega» y el grupo «Lista de precios», y entra después de F3
- **THEN** ve en Favoritos «Existencias» (con «Bodegas» debajo) y «Precios», ambos con la estrella marcada

### Requirement: Buscar por el nombre anterior (F3)
WHILE no hayan pasado 90 días desde la publicación de F3, THE buscador del menú SHALL encontrar cada entrada también por su nombre anterior. Cada resultado SHALL mostrar su grupo («Bodegas · Existencias»).

#### Scenario: Usuario que busca el nombre viejo
- **WHEN** el usuario escribe «inventario por bodega» en el buscador del menú
- **THEN** aparece «Bodegas · Existencias» y al tocarlo abre esa pantalla

### Requirement: Editor de roles legible (F3)
THE editor de Roles y permisos SHALL mostrar cada entrada con su grupo, para que los nombres cortos repetidos no se confundan, y su buscador SHALL encontrar también por el nombre anterior. Los permisos guardados SHALL NOT cambiar, y los que no están en el menú (como Creación rápida) SHALL aparecer una sola vez.

#### Scenario: Asignar un listado
- **WHEN** el administrador busca «listado» en el editor de roles
- **THEN** ve «Clientes · Listado», «Cotizaciones · Listado» y «Productos · Listado» como entradas distintas

### Requirement: Reglas para módulos nuevos
Toda entrada nueva del menú SHALL cumplir estas reglas: máximo 3 niveles; ningún grupo con un solo hijo; el hijo no repite el nombre del padre; nombre de 1 o 2 palabras y unos 14 caracteres, en español y con mayúscula solo al inicio; crear empieza con «Nuevo» o «Nueva»; ícono propio y único (`sidebar-layout`); insignia NUEVO con fecha de vencimiento. Una excepción, como Marketing con un solo ítem (nota 4 del ticket), SHALL registrarse como decisión.

#### Scenario: Módulo nuevo
- **WHEN** una propuesta agrega una entrada al menú
- **THEN** declara la sección, el grupo, el nombre corto, el ícono y la fecha de vencimiento de su insignia, o registra la excepción
