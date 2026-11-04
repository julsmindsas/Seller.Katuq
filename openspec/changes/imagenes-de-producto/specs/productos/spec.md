## ADDED Requirements

### Requirement: El estándar de foto se muestra, sin anunciar la conversión
Donde una persona sube fotos de producto (carga individual, «Importar fotos» y la guía descargable), el sistema SHALL mostrar el formato sugerido (WebP), el tamaño recomendado (cuadrada de 1200 × 1200 px, mínimo 800 × 800), el peso máximo (15 MB) y la recomendación de foto centrada, con buena luz y fondo limpio. El sistema SHALL NOT decir que convierte otros formatos.

#### Scenario: Carga individual
- **WHEN** la persona abre la carga de imágenes de un producto
- **THEN** ve el estándar y ningún texto sobre conversión

### Requirement: Rechazo claro y avisos suaves
WHEN una foto pesa más de 15 MB o no se puede leer como imagen, the system SHALL rechazarla con un mensaje que diga el motivo y qué hacer, y SHALL seguir con las demás fotos. WHEN una foto tiene el lado menor por debajo de 800 px, or su proporción se aleja de 1:1 más de 4:3, the system SHALL avisar sin bloquear la carga y, en el segundo caso, mostrar cómo quedará.

#### Scenario: Foto de 18 MB
- **WHEN** la persona sube una foto de 18 MB
- **THEN** ve «Esta foto pesa 18 MB y el máximo es 15 MB…» y no se guarda

#### Scenario: Foto pequeña
- **WHEN** la foto mide 600 × 600 px
- **THEN** se sube y aparece «Esta foto es pequeña y puede verse borrosa»

#### Scenario: Lote con una foto mala
- **WHEN** de 10 fotos una está dañada
- **THEN** se suben nueve y el reporte nombra la rechazada

### Requirement: Toda foto nueva de producto queda optimizada
WHEN llega una foto de producto por cualquier camino (formulario, importar por referencia, subida del conector o MCP, importadores), the system SHALL aceptar JPG/JPEG, PNG, WebP, HEIC/HEIF, GIF estático, BMP y TIFF que pueda leer, convertirla a WebP de calidad aproximada de 80 conservando la transparencia, corregir la orientación, quitar los metadatos de ubicación y cámara, no agrandarla y generar miniatura (≈ 300 px), media (≈ 800 px) y grande (≈ 1600 px). El sistema SHOULD dejar la grande por debajo de 300 KB. El sistema SHALL decidir el formato por el contenido y no por la extensión ni el tipo declarado.

#### Scenario: JPG de celular de 6 MB
- **WHEN** se sube un JPG de 4000 × 3000 px con ubicación
- **THEN** se guarda en WebP sin ubicación, la mayor no pasa de 1600 px y la orientación es correcta

#### Scenario: PNG con transparencia
- **WHEN** se sube un PNG con fondo transparente
- **THEN** la WebP conserva la transparencia

#### Scenario: Foto pequeña
- **WHEN** se sube una foto de 500 × 500 px
- **THEN** no se agranda y solo se generan los tamaños que no la superen

#### Scenario: Extensión falsa
- **WHEN** un archivo `.jpg` es un PDF
- **THEN** se rechaza como ilegible

### Requirement: Cada pantalla usa el tamaño que le toca
WHEN una pantalla muestra una foto de producto, the system SHALL usar la miniatura en listados, la media en tarjetas y catálogo, y la grande en el detalle y el zoom. WHEN la foto no tiene derivadas, the system SHALL mostrar la URL guardada.

#### Scenario: Producto antiguo
- **WHEN** un producto tiene solo la foto original
- **THEN** la pantalla la muestra igual que hoy

### Requirement: JPG donde WebP no sirve
WHEN una foto de producto se usa en un correo, un PDF o impresión, o un canal externo que no acepta WebP, the system SHALL entregar un JPG generado a partir de la foto, con las transparencias sobre blanco. Para Shopify y WooCommerce SHALL enviar el formato que cada canal acepte.

#### Scenario: Correo
- **WHEN** un correo incluye la foto de un producto
- **THEN** la imagen es JPG

### Requirement: Migración opcional, por lotes y reversible
WHEN se ejecuta la migración de fotos existentes, the system SHALL correr por defecto en modo simulación y por empresa, y SHALL informar fotos, formatos, bytes actuales, ahorro estimado, ilegibles y enlaces externos sin escribir nada. Al aplicar, SHALL crear los archivos nuevos, cambiar solo la referencia en `crearProducto.imagenesPrincipales` conservando el orden y la principal, dejar constancia de las URL de antes y después y SHALL NOT modificar `date_edit`, precios, variantes, inventario ni nada en Shopify o WooCommerce.

#### Scenario: Simulación
- **WHEN** se ejecuta sin la orden de aplicar
- **THEN** no se escribe ningún archivo ni producto y se muestra el reporte

#### Scenario: Producto con flow a Shopify
- **WHEN** se migra un producto de OH MY STORE
- **THEN** cambian sus URL de foto, `date_edit` queda igual y no se llama a Shopify

#### Scenario: Precios intactos
- **WHEN** termina un lote
- **THEN** el precio, las variantes y el inventario de cada producto son idénticos a los de antes

#### Scenario: Revertir
- **WHEN** se pide revertir un lote
- **THEN** cada producto vuelve a sus URL anteriores

### Requirement: Los originales se conservan hasta verificar
The system SHALL NOT borrar un original durante la migración. WHEN se pide la limpieza de una empresa, the system SHALL borrar solo los originales con una versión optimizada verificada, sin otras referencias a esa URL y con el plazo de espera cumplido, tras la aprobación expresa para esa empresa, y SHALL entregar el reporte de espacio antes y después.

#### Scenario: Original aún referenciado
- **WHEN** una línea de pedido guarda la URL del original
- **THEN** ese original no se borra y queda en el reporte

#### Scenario: Plazo sin cumplir
- **WHEN** el lote tiene menos días que el plazo
- **THEN** la limpieza se niega y dice cuándo podrá hacerse

### Requirement: Un fallo de conversión no bloquea al usuario
IF la conversión de una foto falla, THEN the system SHALL reintentar sin detener la carga de las demás, SHALL dejar la foto original disponible mientras se resuelve y SHALL registrar el error de forma estructurada sin datos personales.

#### Scenario: Conversión caída
- **WHEN** el procesamiento falla al guardar un producto
- **THEN** el producto se guarda con la foto original y el error queda registrado
