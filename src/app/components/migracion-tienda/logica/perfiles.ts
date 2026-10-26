/**
 * Perfiles por proveedor (D-518 A1, Artículo VI): TABLAS de alias de encabezados. El código de
 * `importacion.ts` y `lotes.ts` recorre estas tablas; no pregunta por el proveedor. Un proveedor
 * nuevo es una entrada más aquí.
 *
 * Es una copia equivalente de la tabla del servidor (`readers/comun.js`, `readers/woocommerce.js`):
 * el servidor interpreta, el front solo agrupa y filtra a las columnas conocidas. Los encabezados
 * de WooCommerce en español son de memoria, sin export real (tarea 0.4).
 */

/** Alias de un concepto: primero el nombre actual, después los anteriores. */
export type Alias = readonly string[];

export interface PerfilInventario {
  /** Columna que une la fila con su producto. */
  clave: Alias;
  /** Cantidad por estado. Si el archivo no la trae, es el export «Available» (una columna por ubicación). */
  disponible: Alias;
  conocidas: Alias[];
}

/** Cómo se unen las variaciones a su producto (tipo «variation» con columna padre). */
export interface PerfilVariaciones {
  tipo: Alias;
  /** Valores (sin tildes, en minúsculas) de la columna tipo que marcan una variación. */
  valoresVariacion: readonly string[];
  padre: Alias;
  id: Alias;
  sku: Alias;
}

export interface PerfilProveedor {
  id: 'shopify' | 'woocommerce';
  nombre: string;
  /** Cada grupo de alias debe estar presente (al menos uno) para reconocer el archivo. */
  minimas: readonly Alias[];
  /** Encabezados que solo existen en el formato actual / anterior (detección). */
  marcasActual: Alias;
  marcasAnterior: Alias;
  /** Columna que agrupa las filas de un mismo producto. */
  clave: Alias;
  variaciones: PerfilVariaciones | null;
  /** Columnas que se envían; el resto (clientes, costos, notas, etc.) no sale del navegador. */
  conocidas: readonly Alias[];
  inventario: PerfilInventario | null;
  /** Encabezados que solo existen en español: el archivo viene de un sitio en español. */
  soloEspanol: Alias;
  /** Bases de direcciones por idioma para las redirecciones; null si el proveedor no las necesita. */
  basesRedireccion: { es: { productBase: string; categoryBase: string }; en: { productBase: string; categoryBase: string } } | null;
}

const a = (...nombres: string[]): Alias => Object.freeze(nombres);

const opcionesShopify = (): Alias[] =>
  [1, 2, 3].reduce<Alias[]>((acc, i) => acc.concat([a(`Option${i} name`, `Option ${i} name`), a(`Option${i} value`, `Option ${i} value`)]), []);

const SHOPIFY_CONOCIDAS: readonly Alias[] = [
  a('URL handle', 'Handle'),
  a('Title'),
  a('Description', 'Body (HTML)'),
  a('Vendor'),
  a('Product category'),
  a('Type'),
  a('Tags'),
  a('Published on online store', 'Published'),
  a('Status'),
  a('SKU', 'Variant SKU'),
  a('Variant Barcodes', 'Barcodes', 'Variant Barcode', 'Barcode'),
  a('Price', 'Variant Price'),
  a('Compare-at price', 'Variant Compare At Price'),
  a('Charge tax', 'Variant Taxable'),
  a('Weight value (grams)', 'Variant Grams'),
  a('Inventory quantity', 'Variant Inventory Qty'),
  a('Inventory tracker', 'Variant Inventory Tracker'),
  a('Continue selling when out of stock', 'Variant Inventory Policy'),
  a('Product image URL', 'Image Src'),
  a('Image position'),
  a('Image alt text'),
  a('Variant image URL', 'Variant Image'),
  a('Gift card'),
  a('SEO title'),
  a('SEO description'),
  ...opcionesShopify(),
];

const SHOPIFY_INVENTARIO: PerfilInventario = {
  clave: a('Handle', 'URL handle'),
  disponible: a('Available (not editable)', 'Available'),
  conocidas: [
    a('Handle', 'URL handle'),
    a('Title'),
    a('SKU', 'Variant SKU'),
    a('Location'),
    a('Available (not editable)', 'Available'),
    ...opcionesShopify(),
  ],
};

const MAX_ATRIBUTOS_WOO = 8;
const atributosWoo = (): Alias[] =>
  Array.from({ length: MAX_ATRIBUTOS_WOO }, (_, i) => i + 1).reduce<Alias[]>(
    (acc, n) => acc.concat([
      a(`Attribute ${n} name`, `Nombre del atributo ${n}`),
      a(`Attribute ${n} value(s)`, `Attribute ${n} value`, `Valor(es) del atributo ${n}`, `Valor del atributo ${n}`),
    ]),
    [],
  );

const WOO_ID = a('ID', 'Id');
const WOO_SKU = a('SKU', 'Referencia');

const WOO_CONOCIDAS: readonly Alias[] = [
  WOO_ID,
  a('Type', 'Tipo'),
  WOO_SKU,
  a('Name', 'Nombre'),
  a('Published', 'Publicado'),
  a('Visibility in catalog', 'Visibilidad en el catálogo', 'Visibilidad en el catalogo'),
  a('Short description', 'Descripción corta', 'Descripcion corta'),
  a('Description', 'Descripción', 'Descripcion'),
  a('Date sale price starts', 'Fecha en la que empieza el precio rebajado', 'Fecha de inicio del precio rebajado'),
  a('Date sale price ends', 'Fecha en la que termina el precio rebajado', 'Fecha de fin del precio rebajado'),
  a('Tax status', 'Estado del impuesto'),
  a('Tax class', 'Clase de impuesto'),
  a('In stock?', '¿Existencias?', '¿En existencias?', '¿En stock?'),
  a('Stock', 'Inventario', 'Existencias'),
  a('Backorders allowed?', '¿Permitir reservas?', '¿Permitir pedidos pendientes?'),
  a('Weight (kg)', 'Peso (kg)'),
  a('Sale price', 'Precio rebajado', 'Precio de oferta'),
  a('Regular price', 'Precio normal', 'Precio regular'),
  a('Categories', 'Categorías', 'Categorias'),
  a('Tags', 'Etiquetas'),
  a('Images', 'Imágenes', 'Imagenes'),
  a('Parent', 'Superior', 'Padre'),
  ...atributosWoo(),
];

export const PERFILES: readonly PerfilProveedor[] = Object.freeze([
  {
    id: 'shopify',
    nombre: 'Shopify',
    minimas: [a('URL handle', 'Handle'), a('Title'), a('Price', 'Variant Price')],
    marcasActual: a(
      'URL handle', 'Description', 'Published on online store', 'SKU', 'Variant Barcodes', 'Barcodes', 'Price',
      'Compare-at price', 'Charge tax', 'Weight value (grams)', 'Inventory quantity', 'Inventory tracker',
      'Continue selling when out of stock', 'Product image URL', 'Variant image URL',
    ),
    marcasAnterior: a(
      'Handle', 'Body (HTML)', 'Published', 'Variant SKU', 'Variant Barcode', 'Barcode', 'Variant Price',
      'Variant Compare At Price', 'Variant Taxable', 'Variant Grams', 'Variant Inventory Qty', 'Variant Inventory Tracker',
      'Variant Inventory Policy', 'Image Src', 'Variant Image',
    ),
    clave: a('URL handle', 'Handle'),
    variaciones: null,
    conocidas: SHOPIFY_CONOCIDAS,
    inventario: SHOPIFY_INVENTARIO,
    soloEspanol: a(),
    basesRedireccion: null,
  },
  {
    id: 'woocommerce',
    nombre: 'WooCommerce',
    minimas: [WOO_ID, a('Type', 'Tipo'), a('Name', 'Nombre'), a('Regular price', 'Precio normal', 'Precio regular')],
    marcasActual: a(),
    marcasAnterior: a(),
    clave: WOO_ID,
    variaciones: {
      tipo: a('Type', 'Tipo'),
      valoresVariacion: ['variation', 'variacion'],
      padre: a('Parent', 'Superior', 'Padre'),
      id: WOO_ID,
      sku: WOO_SKU,
    },
    conocidas: WOO_CONOCIDAS,
    inventario: null,
    soloEspanol: a('Nombre', 'Tipo', 'Precio normal', 'Publicado', 'Categorías', 'Categorias', 'Imágenes', 'Imagenes', 'Descripción corta', 'Descripcion corta'),
    basesRedireccion: {
      es: { productBase: '/producto/', categoryBase: '/categoria-producto/' },
      en: { productBase: '/product/', categoryBase: '/product-category/' },
    },
  },
]);

export function perfilPorId(id: string): PerfilProveedor | null {
  return PERFILES.find((p) => p.id === id) || null;
}
