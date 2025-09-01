# Plan de Mejoras UX/UI para el Módulo de Despachos

Este documento registra las mejoras de experiencia de usuario (UX) e interfaz de usuario (UI) aplicadas al módulo de Despachos, siguiendo un enfoque profesional y centrado en el usuario.

---

## Fase 1: Rediseño del Dashboard Principal (Completada)

**Objetivo:** Descongestionar la interfaz, priorizar la información crítica y crear un flujo de trabajo más intuitivo y moderno.

### Cambios Realizados:

1.  **Consolidación de Métricas:**
    *   Se eliminaron los múltiples bloques de KPIs, alertas y predicciones que saturaban la vista principal.
    *   Se introdujo un **Panel de Control** superior que muestra las 4 métricas más importantes para una consulta rápida: Total de Pedidos, Valor por Cobrar, Pedidos en Ruta y Pedidos para Despacho.
    *   Las métricas detalladas y análisis avanzados fueron reubicados a una vista secundaria accesible mediante el botón "Ver Análisis", aplicando el principio de **divulgación progresiva**.

2.  **Navegación por Pestañas (Tabs):**
    *   Se implementó un sistema de pestañas para organizar las secciones principales del módulo, mejorando drásticamente el enfoque del usuario.
    *   **Pestaña 1: "Pedidos"**: Contiene los filtros y la tabla principal de pedidos a despachar.
    *   **Pestaña 2: "Mapa de Entregas"**: Dedica un espacio exclusivo para el componente de mapa, eliminando la lógica de mostrar/ocultar.
    *   **Pestaña 3: "Órdenes Generadas"**: Prepara un espacio para la gestión de órdenes ya creadas.

3.  **Jerarquía de Acciones:**
    *   Se simplificó la botonera principal. "Generar Orden" se mantiene como la acción primaria.
    *   El resto de acciones (Recomendaciones KAI, Geocodificación, Administración) se agruparon en un menú desplegable "Acciones" para una interfaz más limpia.

### Archivos Modificados:

*   `src/app/components/despachos/despachos/despachos.component.html`: Reestructuración completa del layout.
*   `src/app/components/despachos/despachos/despachos.component.scss`: Adición de estilos para el nuevo panel de métricas y el sistema de pestañas.
*   `src/app/components/despachos/despachos/despachos.component.ts`: Eliminación de lógica y variables redundantes (`mostrarMapa`, `toggleMapa`) y consolidación de menús de acciones.

---

## Fase 2: Mejora de Experiencia Móvil en Tablas (En Progreso)

**Objetivo:** Eliminar el scroll horizontal en las tablas de datos en vistas móviles, transformándolas en listas de tarjetas más legibles y usables.

### Cambios Realizados:

1.  **Tabla de Pedidos (`tabla-pedidos.component`):
    *   **CSS Responsivo:** Se añadieron media queries en `tabla-pedidos.component.scss` para que en pantallas de menos de 768px, cada fila de la tabla se comporte como una tarjeta individual.
    *   **Etiquetas de Datos:** Se modificó `tabla-pedidos.component.html` para incluir atributos `[attr.data-label]` en cada celda (`<td>`). Estos atributos son utilizados por el CSS para mostrar los encabezados de columna en la vista de tarjeta, mejorando la claridad.

### Archivos Modificados:

*   `src/app/components/despachos/components/tabla-pedidos/tabla-pedidos.component.scss`: Añadidos nuevos estilos responsivos.
*   `src/app/components/despachos/components/tabla-pedidos/tabla-pedidos.component.html`: Añadidos atributos `data-label` para soportar los nuevos estilos.

### Refinamientos (Feedback de Usuario)

Tras una revisión inicial, se detectaron áreas de mejora en la primera implementación de la Fase 2. Se realizaron los siguientes ajustes para alcanzar un nivel de calidad superior:

1.  **Menú de Opciones Contextual:**
    *   **Problema:** El menú de acciones por fila no funcionaba correctamente al hacer clic porque estaba siendo recortado por el contenedor de la tabla.
    *   **Solución:** Se añadió la propiedad `[appendTo]="'body'"` al componente `<p-menu>` de PrimeNG. Esto asegura que el menú se renderice en el nivel más alto de la página, evitando que la tabla lo oculte.

2.  **Rediseño de Tarjetas Móviles:**
    *   **Problema:** El diseño inicial de las tarjetas en vista móvil era simple y se percibía desordenado.
    *   **Solución:** Se implementó un diseño de tarjeta más estructurado con una clara jerarquía visual: un encabezado para el Nro. de Pedido, una sección para estados y prioridades, y un cuerpo para los demás datos. Se mejoró el espaciado y la alineación para una apariencia más limpia y profesional.

3.  **Cabecera de Tabla Responsiva:**
    *   **Problema:** La cabecera de la tabla (título y botones de acción) se comprimía en pantallas estrechas.
    *   **Solución:** Se utilizaron clases de Flexbox responsivas (`flex-column flex-md-row`) para que la cabecera se apile verticalmente en móviles, eliminando el aspecto "apeñuscado".

4.  **Ajuste de Márgenes:**
    *   **Problema:** La tabla presentaba un margen exterior no deseado en la vista de pestaña.
    *   **Solución:** Se eliminó el `padding` del `div` contenedor en `despachos.component.html` para permitir que la tabla y las tarjetas responsivas ocupen todo el ancho disponible.

#### Archivos Modificados en esta iteración:

*   `src/app/components/despachos/components/tabla-pedidos/tabla-pedidos.component.ts`: Añadida lógica para el nuevo menú contextual.
*   `src/app/components/despachos/components/tabla-pedidos/tabla-pedidos.component.html`: Reemplazado el menú `<ul>`, rediseñada la cabecera y añadidas clases para los estilos de tarjeta.
*   `src/app/components/despachos/components/tabla-pedidos/tabla-pedidos.component.scss`: Reemplazados los estilos responsivos por la nueva versión refinada.
*   `src/app/components/despachos/despachos/despachos.component.html`: Eliminado el padding del contenedor de la tabla.

2.  **Tabla de Órdenes de Despacho (`ordenes-despacho.component`):**
    *   **CSS Responsivo:** Se aplicó la misma técnica de transformación a tarjetas que en la tabla de pedidos, asegurando una experiencia móvil consistente.
    *   **HTML Semántico:** Se añadieron las clases y atributos `data-label` necesarios para que los nuevos estilos funcionen correctamente.

### Archivos Modificados en esta iteración:

*   `src/app/components/despachos/components/ordenes-despacho/ordenes-despacho.component.html`: Añadidas clases y atributos `data-label`.
*   `src/app/components/despachos/components/ordenes-despacho/ordenes-despacho.component.scss`: Añadidos estilos para la vista de tarjeta responsiva.
