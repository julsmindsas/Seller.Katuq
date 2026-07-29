# Propuesta: base multi-país y multi-moneda (Ola 0)

## Why

Katuq no tiene concepto de moneda. La orden no guarda en qué moneda está
(`services/orderService.js` no tiene el campo), el precio del producto tampoco
(`models/productos/Precio.ts`), y el impuesto se persiste con las cuatro tarifas de IVA
colombiano como llaves fijas de un objeto (`orderCalculationService.js:312,411,461`,
espejo en `iva-canonico.ts:21`). La moneda solo aparece al momento de cobrar, siempre con
COP como valor por defecto.

Mientras eso siga así, abrir cualquier mercado nuevo produce datos ambiguos de forma
inmediata: órdenes de dos monedas conviviendo sin manera de distinguirlas, y reportes que
las suman en silencio.

Los mercados objetivo confirmados son **Venezuela y Brasil** (demanda comercial, decidido
el 2026-07-27). Son precisamente los dos que **no caben** en el modelo actual: Brasil
exige varios tributos simultáneos por línea, y Venezuela exige un impuesto que depende del
medio de pago y precios expresados a tasa oficial del día. La base no es un prerrequisito
cómodo — es la condición para que cualquiera de los dos sea posible.

Además hay deuda ya presente: los ~360 usos del pipe `currency` llevan el código ISO
escrito a mano en el template —192 dicen `'COP'`, 87 dicen `'USD'` y ~81 no dicen nada— y
la aplicación no configura `LOCALE_ID` ni `DEFAULT_CURRENCY_CODE`, así que esos últimos
formatean pesos con separadores y decimales de Estados Unidos.

Evidencia completa en `findings.md`; el análisis específico de Venezuela y Brasil y las
cinco consecuencias de diseño que imponen, en `findings.md` §8.

## What Changes

Esta propuesta cubre **solo la base habilitante**. No abre ningún mercado y no cambia
ningún número de Colombia.

- **Perfil de país por empresa** dentro de `companies`: país ISO, moneda, decimales, zona
  horaria, locale, tipo de identidad fiscal y catálogo de dirección. `companies.pais` deja
  de ser texto decorativo y pasa a gobernar.
- **Moneda como dato de primera clase, con par y tasa.** La orden y la cotización congelan
  al crearse su moneda de presentación, su moneda de liquidación y la tasa de cambio
  usada. Un solo campo no alcanza: Venezuela obliga a expresar y cobrar a tasa oficial del
  día, y el documento tiene que ser reproducible después. Backfill de lo existente a COP,
  con `--dry-run` primero.
- **Formateo de moneda centralizado** en un servicio por entorno, alimentado por el
  perfil. Retira los literales de moneda de los templates y las 106 llamadas sueltas a
  `es-CO`.
- **Motor de impuestos de N tributos por línea.** De un objeto con llaves fijas
  `0/5/8/19` a una lista de impuestos (código, base, tarifa, monto) resuelta por una
  estrategia de país. Nace soportando varios tributos simultáneos con bases distintas
  porque Brasil lo exige desde el primer día.
- **El impuesto deja de ser función pura del carrito.** Se separan dos momentos: impuestos
  de producto (al armar el pedido) e impuestos de liquidación (al cobrar y facturar),
  porque el IGTF venezolano depende del medio de pago y debe aparecer en la factura.
- **Tipo de documento fiscal por canal** en la abstracción contable. Hoy se asume un
  documento único; Brasil necesita NF-e modelo 55 para venta asistida y NFC-e modelo 65
  para POS.
- **Zona horaria del comercio.** Dejar de pasar `America/Bogota` como default duro donde
  el dato pertenece a la empresa. El scheduler ya acepta `timezone`.

## Capabilities

### New Capabilities

- `company-locale-profile`: perfil de país, moneda, decimales, zona horaria e identidad
  fiscal por empresa; fuente única para presentación y cálculo.
- `order-currency-integrity`: toda orden y cotización nace con moneda de presentación,
  moneda de liquidación y tasa congeladas; ningún total existe sin moneda asociada.
- `tax-strategy-per-country`: cálculo de impuestos como lista por línea, con estrategia de
  país y separación entre impuestos de producto y de liquidación.

### Modified Capabilities

- El cálculo de totales pasa de "IVA colombiano" a "impuestos por estrategia de país", con
  Colombia como primera implementación y equivalencia numérica exacta como condición de
  aceptación.
- La abstracción contable (`accountingManager`, `_baseAccountingProvider`) gana el
  concepto de tipo de documento fiscal por canal. La interfaz no se rompe: Colombia queda
  con un único tipo.

## Impact

- **Módulo sensible**: `services/orderCalculationService.js` y su espejo
  `app/shared/services/ventas/iva-canonico.ts` — el núcleo estabilizado por la spec 010.
  Un cambio a la vez, con diff y aprobación explícita antes de aplicar.
- **Gate obligatorio**: los fixtures dorados `specs/010/contracts/iva-fixtures.json` deben
  pasar **sin modificar el fixture**. Si hay que tocar el fixture, el cambio está mal.
- **Datos**: campos de moneda y tasa en `orders` y `cotizaciones`; moneda en precios;
  perfil dentro de `companies`. **No se crea ninguna colección nueva.**
- **Frontend**: servicio de formateo compartido; ~360 sitios de template pierden el
  literal de moneda.
- **Fuera de alcance en esta ola**: pasarelas de pago, proveedores de facturación,
  catálogos de dirección de otros países, idioma.
- Decisión de programa: D-137.

### Trabajo no-código que corre en paralelo desde ya

Ninguna de estas cuatro cosas es código, y las cuatro pueden bloquear el lanzamiento más
que el desarrollo. No esperan a que termine la Ola 0:

1. **Homologación de Katuq ante el SENIAT** bajo la Providencia SNAT/2024/000121. Es
   requisito legal para operar en Venezuela y es un trámite con tiempos ajenos.
2. **Elegir imprenta digital en Venezuela.** Evaluar The Factory HKA por su cobertura
   regional frente a Unidigital, Smart Factura, CG La Imprenta Digital e Imprentas
   Digitales 421.
3. **Elegir socio fiscal en Brasil** entre los que ya soportan la reforma tributaria
   (Focus NFe, Tecnospeed/PlugNotas, eNotas, Nuvem Fiscal, NFE.io).
4. **Confirmar la tarifa vigente del IGTF** con asesor tributario venezolano.

## No-goals

- No abrir Venezuela ni Brasil en esta ola. Cada uno es una propuesta aparte.
- No tocar `nit` como llave de `companies` todavía — es migración de datos y va con el
  primer país que traiga otra identidad fiscal.
- No tocar Osmosis/Cereza ni los flows de Shopify de OH MY STORE. Siguen siendo
  integraciones colombianas y se quedan como están.
- No tocar inventario. El write-set cerrado de D-134 se respeta sin excepción: esta
  propuesta no escribe `products`, catálogo, precios ni listas de precios.
- No traducir la aplicación. El portugués para Brasil (~230 templates sin extraer) se
  presupuesta aparte, con su propia propuesta.
- No cambiar el modelo comercial de cobro a los comercios en esta ola.
- No construir emisión fiscal propia para Venezuela ni Brasil: ambos van por tercero
  autorizado. El andamiaje UBL/XAdES de la DIAN no se reusa aquí.

## Open Questions

1. ¿Quién asume y con qué plazo la homologación ante el SENIAT? Es el camino crítico de
   Venezuela y no depende del equipo de desarrollo.
2. ¿Tarifa vigente del IGTF en 2026? No se pudo confirmar en la investigación. Lo
   estructural sí está confirmado: depende del medio de pago y va en la factura.
3. En Venezuela, ¿Katuq almacena los precios del catálogo en bolívares, en dólares, o en
   ambos? Cambia dónde vive la conversión y quién carga con el riesgo cambiario.
