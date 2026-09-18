## Why

Daniel lo dijo así: "la veo muy compleja, controles escondidos, no se relaciona una cosa con la otra". Medido en el código el 2026-09-18: el editor tiene **34 tipos de bloque y 220 controles**, 168 de ellos en la pestaña Secciones; la portada sola tiene 10 y el encabezado otros 10. El panel Estilo presenta el mismo concepto con tres subtítulos seguidos ("Pruébate otro vestido", "Elige un look", "Estilo de la página"). Lienzo libre y objetos colocables —que usa una minoría— están al mismo nivel que "cambiar el título". No hay nada que le diga al comerciante qué le falta para terminar.

El motor es sólido (bloques cerrados, precios del servidor, vista previa real). El problema es la capa de encima: pide que el usuario piense como quien la programó.

## What Changes

1. **Modo simple por defecto.** Cada bloque muestra sus controles esenciales y un botón "Más opciones" despliega el resto. Nada se quita.
2. **Un solo vocabulario de estilo.** Desaparecen "vestido" y "look": Tema, Colores, Forma y Letra.
3. **La vista previa es la puerta.** Con una sección elegida, el panel es su formulario; la lista completa se pliega detrás de "Reordenar secciones".
4. **Herramientas avanzadas** (lienzo libre, objetos colocables) detrás de una palanca en Ajustes, apagada de fábrica y recordada por navegador.
5. **"Qué te falta"**: lista fija que revisa el sitio (logo, WhatsApp, políticas, descripción para Google, bodega, productos) y dice qué falta para publicar con tranquilidad.

## Capabilities

### New Capabilities
- `editor-sitios-modo-simple`: el editor reduce la superficie visible sin quitar funciones y guía al comerciante hacia lo que falta.

## Impact

Solo `Seller.Katuq/src/app/components/sitios/editor/`. **No toca el render publicado ni el backend**; las 265 pruebas de contrato siguen protegiendo lo de abajo.

## No-goals

- No se elimina ningún control ni tipo de bloque.
- No se cambia el modelo de datos del sitio.
- No se rediseña el asistente inicial.

## Riesgos

- Un comerciante que ya usaba lienzo libre lo encuentra apagado. Se ataja: si el sitio YA tiene lienzo o elementos, la palanca arranca encendida.
- Marcar "esencial" por posición puede esconder un campo importante en algún bloque. Se revisa a mano en los bloques de más uso (portada, encabezado, productos, catálogo, pie).
