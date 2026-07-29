# Hallazgos — Katuq multi-país y multi-moneda

> Investigación previa a cualquier propuesta. Fecha: 2026-07-27.
> Método: rastreo de código real en `Seller.Katuq` + `katuq_admin_back_firebase`, con
> `file:line` en cada afirmación. Los requisitos regulatorios se verificaron contra
> fuentes públicas de 2026, no contra documentación interna.
> Ningún dato de este documento se asumió: lo que no se pudo verificar está marcado.

---

## 0. Conclusión corta

Katuq no es "una app en pesos". Es una app **sin concepto de moneda**: la orden no
guarda en qué moneda está, el precio tampoco, y el impuesto está modelado con las
cuatro tarifas de IVA colombianas como llaves fijas de un objeto que se persiste.

Eso significa que el trabajo no es traducir ni cambiar un símbolo. Es introducir
tres conceptos que hoy no existen —**moneda, perfil de país e impuesto genérico**—
y después enchufar cada mercado.

La buena noticia: las capas de integración (pagos, contabilidad, logística) ya están
hechas con Strategy y `_base*Provider`, así que el país nuevo entra por ahí sin
refactor. La mala: el motor de cálculo y el modelo de datos sí hay que tocarlos, y
son justo lo que acaba de estabilizarse.

**El orden lo manda la demanda comercial: Venezuela y Brasil.** La recomendación técnica
inicial era empezar por Ecuador y Perú (§4), pero el responsable de producto confirmó el
2026-07-27 que la demanda concreta está en Venezuela y Brasil. Eso **no elimina la base,
la endurece**: son justamente los dos mercados que no caben en el modelo de impuestos
actual, así que la Ola 0 hay que diseñarla contra sus requisitos y no contra los de
Ecuador. Las cinco consecuencias de diseño están en §8.

**Alcance confirmado:** multi-país significa *un comercio opera en su país*, no un
comercio vendiendo a varios países. Perfil de país por empresa.

---

## 1. Qué está clavado a Colombia hoy

### 1.1 La moneda no existe como dato — el hallazgo central

- **La orden no persiste moneda.** `services/orderService.js` no tiene ningún campo
  `moneda`/`currency`. Los totales son números pelados.
- **El producto tampoco.** `app/shared/models/productos/Precio.ts` expone
  `precioUnitarioConIva`, `precioUnitarioSinIva`, `precioUnitarioIva` — ningún código
  de moneda. El único campo de moneda del catálogo es
  `DropshippingConfig.monedaProveedor` (`models/productos/DropshippingConfig.ts:15`),
  fijado a `'COP'` en `crear-productos.component.ts:509,2855,2871`.
- **Donde sí aparece `currency` es solo en el momento de cobrar**, y siempre con COP
  como default duro: `paymentGateway/providers/wompiProvider.js:38,106`,
  `epaycoProvider.js:35,74`, `controllers/orders.js:6360,7564,7591,7654`.

Consecuencia: hoy la moneda es una convención implícita del país. En el momento en que
dos empresas del mismo Firestore usen monedas distintas, **no hay forma de saber en qué
moneda está una orden vieja**. Esto obliga a congelar la moneda en la orden antes de
abrir cualquier mercado, y a un backfill de los datos existentes.

### 1.2 El formateo de moneda está disperso y ya está mal

- **279 usos del pipe `currency` con el código ISO escrito a mano en el template**:
  192 dicen `'COP'` y **87 dicen `'USD'`**.
- **~81 usos más sin código de moneda**, por ejemplo
  `cart.component.html:68`, `ordenes-despacho.component.html:139`,
  `tabla-pedidos.component.html:476-479`.
- La app **no configura `LOCALE_ID` ni `DEFAULT_CURRENCY_CODE`** en ningún lado
  (verificado: 0 coincidencias en todo `src`). Angular entonces cae a `en-US` + `USD`,
  así que esos ~81 sitios están formateando pesos con agrupación y decimales
  estadounidenses. Nadie lo notó porque el símbolo `$` coincide visualmente.
- Aparte del pipe hay **106 ocurrencias de `es-CO` repartidas en 55 archivos**
  (`Intl.NumberFormat`, `toLocaleString`, `toLocaleDateString`, y hasta atributos
  `locale="es-CO"` en `p-inputNumber`), cada una con su propia decisión de decimales.
  Ejemplos: `payment.service.ts:140`, `ventas.service.ts:798`,
  `central-abastecimiento.component.ts:108`, `report-public.component.ts:66`,
  `lista-precios-costos.component.ts:131`.

Varios de esos usan `maximumFractionDigits: 0`, que es correcto para el peso y
**incorrecto para PEN, BRL, USD y VES**, todas de dos decimales. Es decir: el redondeo
a cero decimales está horneado en la capa de presentación, no derivado de la moneda.

### 1.3 El impuesto está modelado como "IVA de Colombia", no como impuesto

Este es el acoplamiento más profundo, porque **se persiste**.

- `app/shared/services/ventas/iva-canonico.ts:21` y
  `services/orderCalculationService.js:312` declaran
  `TARIFAS_DESGLOSE = ["0", "5", "8", "19"]` — las cuatro tarifas de IVA colombiano.
- El desglose se construye como un objeto con esas cuatro llaves fijas
  (`iva-canonico.ts:31`, `orderCalculationService.js:411,461-465`) y se **guarda en la
  orden** (`orderCalculationService.js:258`: `order.desgloseIVA = t.desgloseIVA`).
- El modelo asume **un solo impuesto por línea, expresado como porcentaje sobre la base
  sin impuesto**. No existe: impuestos compuestos, impuestos por jurisdicción,
  retenciones, ni impuestos calculados sobre otro impuesto.

Ese modelo sirve para Colombia, Ecuador, Perú y —con esfuerzo— Venezuela.
**No sirve para Brasil**, donde una línea lleva varios tributos simultáneos con bases
distintas (ver §2.3).

Riesgo asociado: este núcleo es exactamente lo que estabilizó la spec 010, con fixtures
dorados compartidos entre frontend y backend (`specs/010/contracts/iva-fixtures.json`).
Tocarlo sin esos fixtures como red es la forma más rápida de reabrir descuadres de IVA.

### 1.4 La identidad fiscal es el NIT, y además es llave de negocio

- `controllers/companies.js` busca, deduplica y **elimina empresas por `nit`**
  (líneas 60, 191, 223, 269, 287, 340, 1501, 1631). No es un campo más: es la llave.
- En clientes, la importación mapea `'cedula/nit' → documento` y usa `NIT` como tipo de
  documento de facturación (`import-modal.component.ts:179,384,392`).

Cada país tiene su propia identidad (RUC en Ecuador y Perú, CNPJ/CPF en Brasil, RIF en
Venezuela), con formato y dígito verificador distintos. Desacoplar `nit` como llave de
`companies` es migración de datos, no un rename.

### 1.5 La dirección es DIVIPOLA (DANE), y arrastra media plataforma

- `app/shared/data/colombia-dane-codes.ts` — 1.274 líneas en el frontend;
  `functions/data/colombia-dane-codes.js` en el backend.
- De ahí cuelgan: dirección estructurada del cliente, cobertura de bodega
  (`bodegaCoberturaService.js`, `selector-ciudades-cobertura`), cotización de envío
  (`enviameProvider.js`, `prindelProvider.js`), el push a Cereza
  (`integrations/osmosis/cerezaMunicipalityResolver.js`) y el mapeo contable
  (`siigoDataMapper.js:553-554`, con `country_code: 'CO'` fijo).
- Complemento: `colombia-address.service.ts` (299 líneas) trae barrios, código postal y
  **estrato socioeconómico** — un concepto que solo existe en Colombia.

Dato a favor: **el país ya se captura**. `Mock/pais-estado-ciudad.ts` (38 KB) e
`Mock/indicativosPais.ts` (50 KB) alimentan los formularios de cliente, empresa y
usuario, y `models/empresa/empresa.ts` tiene `pais` y `paisSede`. Simplemente **no
gobierna nada**: es texto que se guarda y no se lee para decidir.

### 1.6 Detalles menores pero reales

- **Teléfono**: `+57` se prepone por defecto en importación
  (`import-modal.component.ts:342,1102,1143`) y en la campaña de WhatsApp
  (`campana-whatsapp.component.ts:487`).
- **Zona horaria**: `America/Bogota` aparece **21 veces solo en `cronService.js`**, más
  `notificationHooks.js`, `templateHelpers.js`, `schedule-cron.trigger.js`.
  `treasuryService.js:54` usa directamente un offset fijo UTC-5. `siigoDataMapper.js:8`
  también.
  Atenuante: `cronJobsConfigService` y los bindings de flow **ya aceptan `timezone` como
  parámetro** (`cronService.js:2014,2252`); Bogotá está como *default*, no como única
  opción. El arreglo es pasar la zona de la empresa, no reescribir el scheduler.

### 1.7 Las integraciones son el ecosistema colombiano — pero la arquitectura ayuda

| Capa | Hoy | ¿Sirve fuera de Colombia? |
|---|---|---|
| Pagos | Wompi, ePayco (`paymentGateway/providers/`) | No. Ambas son solo Colombia. |
| Contable/fiscal | SIIGO, World Office, DIAN directa (`accounting/providers/`) | SIIGO y World Office no. La DIAN directa, parcialmente: ver abajo. |
| Logística | Enviame, Prindel, Partner Logística, Osmosis (`shippingProviders/`) | Enviame sí opera en CL/CO/MX/PE, pero el código fuerza `'CO'` en 8 sitios (`enviameProvider.js:86,97,119,135,1263,1277,1632,1649`). |
| E-commerce | Shopify, WooCommerce | Sí, son agnósticos de país. |

**El activo reutilizable más valioso es la facturación DIAN directa** (spec 016, fases
0-3 terminadas): `accounting/dian/` tiene `ublBuilder.js` (UBL 2.1), `xadesSigner.js`
(XAdES), `numbering.js`, `cufe.js`, `dianSoapClient.js`. Perú usa **UBL 2.1 firmado con
XAdES** y Ecuador usa **XML firmado con XAdES-BES**. O sea: el andamiaje de construcción
y firma de XML se reusa; lo específico de cada país es el esquema, el CUFE/clave de
acceso equivalente y el transporte.

### 1.8 El cobro que Katuq le hace a sus propios comercios también es en pesos

- `config/subscriptionLimits.js:22-28`: los tramos se deciden por `maxSalesCOP` y
  llevan `priceUSD` **y** `priceCOP`.
- `services/billingService.js:215-217`: convierte USD→COP con la TRM del día y cobra por
  Wompi en COP (`:333-334,367-368`).
- Notificaciones: WhatsApp a $80 COP por mensaje, recarga mínima $50.000 COP.

Media buena noticia: **el precio de lista ya está anclado en dólares**, así que el
modelo comercial no hay que reinventarlo. Lo que está en pesos es el *umbral* que decide
el tramo y el cobro final.

### 1.9 El idioma está a medio camino, y eso es peor que no estarlo

`@ngx-translate/core` está instalado y **cableado de verdad**: `app.module.ts:109`,
`shared/modules/translate.module.ts`, `app.component.ts:87-88` registra
`['en','de','es','fr','pt','cn','ae']` y hay un selector en el header
(`languages.component.ts`). Existen `src/assets/i18n/{es,en,fr,pt}.json`.

Pero: **solo 90 de 324 templates usan el pipe `translate`**, y los diccionarios tienen
~700 llaves que son en su mayoría las del tema base comprado (`es.json` traduce "Productos"
a "Productos"). El resto de la aplicación —ventas, inventario, despachos, cotizaciones,
tesorería, flows— tiene el español escrito directo en el HTML.

Traducción: hay infraestructura de idioma, no hay contenido. Portugués real para Brasil
es un proyecto propio, no encender un flag.

---

## 2. Qué exige cada país

Verificado contra fuentes públicas de 2026. Lo que no se pudo confirmar queda dicho.

### 2.1 Ecuador — el más barato de entrar

| | |
|---|---|
| Moneda | **USD**. No hay cambio de moneda. |
| Decimales | 2 |
| Identidad | RUC (debe estar activo y con la actividad económica que corresponda) |
| Impuesto | IVA **15%** desde 2024; tarifas especiales 0% y 5% |
| Facturación | SRI. XML firmado con certificado `.p12` bajo **XAdES-BES**, enviado a web service del SRI. Requiere firma electrónica vigente (~USD 10–30/año), software autorizado y punto de emisión registrado. |
| Pagos | Payphone, Kushki, Datafast |

Por qué es el mejor primer país: **no introduce una moneda nueva** (elimina de la
ecuación el redondeo, el formateo y la conversión), el impuesto encaja sin cambios en el
modelo de tarifa única, y la firma XAdES ya está construida para la DIAN.

### 2.2 Perú — el mejor segundo

| | |
|---|---|
| Moneda | **PEN**, 2 decimales |
| Identidad | RUC |
| Impuesto | IGV **18%** |
| Facturación | SUNAT. XML **UBL 2.1** firmado digitalmente, con certificado de sello o persona jurídica de entidad autorizada. Validación por SUNAT o por un **OSE** autorizado, que devuelve el **CDR**. La emisión se hace desde sistema propio, típicamente a través de un **PSE**; OSE y PSE no se sustituyen, se complementan. Plazo de envío: 3 días calendario. Conservación: 5 años (XML, acuses y representación gráfica). |
| Pagos | Culqi, Niubiz, Izipay, Mercado Pago, Kushki |

Por qué segundo: es la **primera moneda distinta**, así que valida de verdad la capa de
moneda y el redondeo a dos decimales. Y el formato es UBL 2.1 — el mismo estándar que ya
se construyó para la DIAN.

### 2.3 Brasil — el más caro, con diferencia, y con la ventana abierta ahora mismo

| | |
|---|---|
| Moneda | **BRL**, 2 decimales |
| Identidad | CNPJ (empresa) / CPF (persona) |
| Impuesto | ICMS (estatal), IPI, PIS, COFINS — **más** la reforma tributaria en curso |
| Facturación | NF-e / NFC-e / NFS-e contra la **SEFAZ de cada estado** |
| Pagos | Pix, Mercado Pago, Pagar.me |
| Idioma | pt-BR obligatorio |

**Estado regulatorio a la fecha de esta investigación:** la reforma tributaria entró en
período de adaptación en 2026. Desde el **1 de julio de 2026** los campos nuevos de
IBS/CBS/IS son obligatorios en homologación, y desde el **3 de agosto de 2026** en
producción — las notas sin los grupos UB y W03 correctamente diligenciados son
**rechazadas automáticamente por la SEFAZ**. Las alícuotas de la fase de prueba son
IBS 0,1% y CBS 0,9%, con apuración meramente informativa. Simples Nacional y MEI entran
desde el 4 de enero de 2027. Aparecen campos nuevos como `cClassTrib` (clasificación
tributaria), `cindOp` (local de la operación, para el IBS municipal) y `pDevTrib`
(devolución tributaria / cashback fiscal).

Lo que esto significa para Katuq: **el motor de impuestos actual no se puede adaptar a
Brasil, hay que reemplazarlo por uno que acepte N tributos por línea con bases
independientes**. Y el cumplimiento fiscal es un producto en sí mismo, con un
calendario regulatorio que se mueve. Entrar a Brasil sin socio fiscal local es
comprometer el roadmap entero.

### 2.4 Venezuela — el más raro; el problema no es técnico

| | |
|---|---|
| Moneda | **VES** con dólar de facto. Referencia BCV al 27/07/2026: ~742,23 VES/USD |
| Identidad | RIF |
| Impuesto | IVA 16%, más IGTF sobre pagos en divisas *(tarifa vigente no confirmada en esta investigación — verificar antes de cotizar el alcance)* |
| Facturación | Providencia **SNAT/2024/000102** (Gaceta 43.032 del 19/12/2024), de aplicación obligatoria desde el **19/03/2025**. Exige contratar una **imprenta digital autorizada por el SENIAT**, que es quien asigna el número de control: **sin esa asignación la factura no tiene validez fiscal**. El sistema debe estar homologado, identificar a la imprenta y su RIF, permitir **acceso permanente del SENIAT** a las facturas emitidas y conservarlas **10 años**, con sistema de contingencia. |
| Precios | La normativa de precios obliga a expresar y cobrar **a la tasa oficial BCV del día**; usar referencias paralelas expone a multas, cierre e incluso proceso penal. |

Lo que esto significa: Venezuela no pide "otra moneda", pide **doble expresión de precio
con tasa diaria oficial** y un ciclo de homologación con un tercero autorizado. Es
factible, pero el costo dominante es regulatorio y operativo, no de código. Y el riesgo
cambiario recae sobre el comercio, no sobre Katuq — hay que decidir explícitamente si
Katuq almacena precios en VES, en USD, o en ambos.

---

## 3. Qué necesitamos construir

Nueve piezas. Las tres primeras son la base sin la cual ninguna de las otras tiene
sentido, y se pueden hacer **sin abrir un solo mercado nuevo**.

1. **Perfil de país por empresa.** `companies.pais` ya existe como texto libre; hay que
   convertirlo en un perfil que gobierne: código ISO del país, moneda ISO 4217, número de
   decimales, zona horaria, locale, tipo de identidad fiscal y catálogo de dirección.
   Sin colección nueva — es un objeto dentro de `companies`.

2. **Moneda como dato de primera clase.** La orden y la cotización **congelan** su moneda
   al crearse; el precio la lleva explícita. Un único servicio de formateo en el frontend
   y otro en el backend, alimentados por el perfil. Eso retira los ~360 literales de
   moneda de los templates y las 106 llamadas sueltas a `es-CO`. Requiere backfill de los
   datos existentes a COP.

3. **Motor de impuestos genérico.** Sacar la tarifa de la llave: pasar de
   `desgloseIVA: {"0","5","8","19"}` a una lista de impuestos por línea
   (código, base, tarifa, monto), con una estrategia por país. **Colombia se convierte en
   la primera estrategia y debe producir exactamente los mismos números** — los fixtures
   dorados de la spec 010 son el gate de aceptación, no un extra.

4. **Identidad fiscal y dirección por país.** `nit` deja de ser la llave de `companies`;
   validadores por país; DIVIPOLA se vuelve un catálogo enchufable (UBIGEO en Perú,
   IBGE en Brasil, cantón/parroquia en Ecuador). El estrato socioeconómico queda como
   dato opcional solo de Colombia.

5. **Facturación por país detrás de la interfaz que ya existe.** `accountingManager` y
   `_baseAccountingProvider` ya son Strategy. Ecuador y Perú entran como proveedores
   nuevos reusando `ublBuilder`, `xadesSigner` y `numbering`. Brasil y Venezuela **no**:
   esos van por marca blanca de un tercero homologado.

6. **Pagos multipaís.** El patrón `_baseProvider` ya está. La decisión relevante no es
   técnica sino comercial: montar una pasarela por país (Payphone/Datafast en Ecuador,
   Culqi/Niubiz en Perú, Pix/Pagar.me en Brasil) o entrar con un agregador regional
   —dLocal o Kushki— que cubre varios de una. La segunda opción reduce el número de
   integraciones a mantener.

7. **Zona horaria por empresa.** El scheduler ya acepta `timezone`; falta dejar de pasar
   Bogotá como default duro donde el dato pertenece al comercio, y quitar el offset UTC-5
   fijo de tesorería y del mapeo contable.

8. **Idioma.** Español regional como base. Portugués real solo si entra Brasil, y
   presupuestado aparte: son ~230 templates sin extraer.

9. **El cobro de Katuq a sus comercios.** Los tramos ya están en USD; falta medir el
   umbral en USD con la tasa del período y cobrar en moneda local a través del agregador.
   Igual para el saldo de notificaciones, hoy fijado en pesos.

---

## 4. Orden recomendado (superado por la decisión comercial — ver §8)

> Esta sección queda como registro del análisis técnico. El orden real es el de §8:
> Base → Venezuela y Brasil. Se conserva porque la justificación de por qué Ecuador y
> Perú son *técnicamente* más baratos sigue siendo válida y explica el costo que se
> asume al entrar primero por los dos difíciles.

**Ola 0 — Base, sin abrir mercado.** Perfil de país + moneda de primera clase + motor de
impuestos genérico con Colombia como primera estrategia. Se valida contra sí misma:
Colombia debe dar números idénticos a los de hoy. Es la única ola que toca código
sensible, y por eso va sola y primero.

**Ola 1 — Ecuador.** Mismo dólar, tarifa única, XAdES ya construido. Es el piloto barato
que demuestra que la abstracción de la Ola 0 sirve, sin arriesgar el redondeo.

**Ola 2 — Perú.** Primera moneda distinta y primer redondeo a dos decimales, sobre UBL
2.1 que ya sabemos construir. Aquí es donde la capa de moneda se prueba de verdad.

**Ola 3 — Venezuela**, si hay demanda comercial que lo justifique. Doble expresión de
precio con tasa BCV diaria y facturación vía imprenta digital homologada.

**Ola 4 — Brasil**, y solo con socio fiscal local.

**Por qué no arrancar por Brasil ni Venezuela, aunque encabezaran el pedido:** son
justamente los dos que **no caben en el modelo de impuestos actual** ni se resuelven con
la infraestructura de facturación que ya tenemos. Brasil exige un motor de N tributos por
línea contra 27 SEFAZ estatales, en medio de una reforma con fechas que corren este mismo
año. Venezuela exige homologación con un tercero autorizado y doble expresión de precios
a tasa oficial diaria. Cualquiera de los dos como primer país convierte la iniciativa en
un proyecto de cumplimiento fiscal en vez de una plataforma multi-país.

---

## 5. Riesgos

- **El motor de cálculo es el corazón recién estabilizado.** `orderCalculationService.js`
  y su espejo `iva-canonico.ts` son el resultado de la spec 010. Un cambio a la vez, con
  los fixtures dorados como gate obligatorio antes de cada avance.
- **`nit` como llave de `companies`** está en al menos 8 sitios de un solo controlador.
  Desacoplarlo es migración de datos con `--dry-run` primero.
- **Backfill de moneda en órdenes históricas.** Sin él, los reportes mezclan monedas
  silenciosamente. Es el riesgo más fácil de subestimar.
- **Las integraciones vivas son colombianas.** Osmosis/Cereza y los flows de Shopify de
  OH MY STORE no se tocan en ninguna ola. El aislamiento de inventario (write-set
  cerrado) se mantiene igual.
- **Brasil tiene reloj regulatorio.** Producción con campos IBS/CBS obligatorios desde el
  3 de agosto de 2026. Entrar tarde no es "más fácil": es entrar a un blanco móvil.

---

## 6. Preguntas — dos resueltas, una pendiente

1. **¿Multi-país es "un comercio en su país" o "un comercio vendiendo a varios países"?**
   → **RESUELTA (2026-07-27): un comercio, un país.** Perfil de país por empresa. No hay
   precios por mercado ni impuesto por país de destino.
2. **¿Dónde está la demanda concreta?** → **RESUELTA (2026-07-27): Venezuela y Brasil.**
   Ver §8.
3. **¿Facturación fiscal propia o marca blanca?** → Para Venezuela y Brasil la respuesta
   la impone la regulación: **marca blanca obligatoria** (imprenta digital autorizada en
   Venezuela, socio de API fiscal en Brasil). Queda abierta solo si más adelante entran
   Ecuador o Perú, donde sí se podría reusar el andamiaje de la DIAN.
4. **Nueva, abierta: ¿quién asume la homologación de Katuq ante el SENIAT?** Es requisito
   legal para operar en Venezuela y es un trámite, no código. Ver §8.1.
5. **Nueva, abierta: ¿tarifa vigente del IGTF en 2026?** No se pudo confirmar en esta
   investigación (hubo modificación en julio de 2024 y existe un decreto de exoneración y
   no sujeción). Debe confirmarlo un asesor tributario venezolano antes de cotizar el
   alcance. Lo que sí está confirmado y es estructural: **el IGTF depende del medio de
   pago y debe reflejarse en la factura.**

---

## 8. Profundización: Venezuela y Brasil como mercados objetivo

Confirmada la demanda en estos dos, se profundizó específicamente sobre ellos. Aparecen
cosas mejores y cosas peores de lo que sugería el análisis de survey de §2.

### 8.1 Venezuela — mejor de lo esperado en lo técnico, peor en lo legal

**Mejor:** las imprentas digitales autorizadas **ya exponen APIs REST con JSON pensadas
justamente para integrarse con software administrativo y ERPs**. No hay que construir
XML fiscal, ni firma, ni cliente SOAP: se llama una API y ella asigna el número de
control, que es lo que le da validez fiscal al documento. Proveedores identificados:
Corporación Unidigital (API REST documentada públicamente para crear, anular, consultar y
distribuir documentos fiscales), The Factory HKA Venezuela, Smart Factura, CG La Imprenta
Digital (autorizada bajo SENIAT/INTI/012 desde el 17/01/2024) e Imprentas Digitales 421.

Dato con valor estratégico: **The Factory HKA opera en varios países de la región**, no
solo Venezuela. Si más adelante entran Ecuador, Perú o Colombia, un mismo socio podría
cubrir varios mercados con un solo contrato e integración. Vale evaluarlo antes de elegir.

**Peor:** el software administrativo de Katuq **debe estar homologado ante el SENIAT**.
Eso lo regula la **Providencia SNAT/2024/000121** —distinta de la 000102 que rige la
factura digital—, que fija las condiciones y requisitos para los proveedores de sistemas
de facturación. Es una evaluación y autorización formal del proveedor, o sea de Katuq como
empresa. **Es un trámite legal con tiempos que no controlamos y sin él no se puede
operar**, por más que el código esté listo. Debe arrancar en paralelo al desarrollo, no
después.

**El hallazgo que rompe el modelo de cálculo:** el IGTF **depende del medio de pago** —
aplica sobre lo que se pague en divisas o cripto, no sobre lo que se pague en bolívares— y
**debe reflejarse en la factura**. Hoy Katuq calcula los totales como función pura del
carrito (`orderCalculationService.js`): el medio de pago no entra en el cálculo del
impuesto en ningún momento. Venezuela obliga a que sí entre. La tarifa vigente en 2026 no
quedó confirmada (hubo modificación en julio de 2024 y hay un decreto de exoneración y no
sujeción); hay que confirmarla con asesor local.

### 8.2 Brasil — el socio existe y está maduro, pero son dos documentos, no uno

**Mejor de lo esperado:** el mercado de APIs fiscales está muy desarrollado y varios
proveedores **ya anuncian soporte de la reforma tributaria 2026**. Identificados: Focus
NFe, Tecnospeed/PlugNotas, eNotas, Nuvem Fiscal, NFE.io, Spedy y Brasil NFe. Se integran
por REST, manejan multi-CNPJ y certificado A1, y absorben ellos la conexión con las SEFAZ
estatales. Es decir: **no hay que hablarle a 27 SEFAZ, se le habla a un socio.** Eso baja
el costo de Brasil muchísimo respecto de lo estimado en §2.3 — lo que no baja es la
complejidad del cálculo de impuestos, que sigue siendo nuestra.

Escala del cambio en curso: en enero de 2026, de 5.465 municipios formalmente adheridos al
estándar NFS-e Nacional, 1.898 ya emitían con él. Es un blanco en movimiento.

**Lo que no habíamos visto: Brasil necesita dos tipos de documento, y Katuq tiene los dos
canales.**

| Canal de Katuq | Documento brasileño | Nota |
|---|---|---|
| Venta asistida / e-commerce | **NF-e modelo 55** | Venta de mercancía, con CFOP y naturaleza de la operación |
| POS (venta presencial) | **NFC-e modelo 65** | Venta directa a consumidor final; reemplaza el cupón fiscal |

Hoy la abstracción contable de Katuq asume **un solo tipo de documento** (la factura
colombiana). Brasil obliga a introducir el concepto de *tipo de documento fiscal según
canal*, que no existe en el modelo actual.

Detalle regulatorio que se despejó a favor: el CONFAZ publicó el **Ajuste SINIEF 12/2026**
que **revocó íntegramente el Ajuste SINIEF 11/2025**, el cual prohibía emitir NFC-e cuando
el destinatario se identificara con CNPJ. Esa restricción ya no aplica, lo que simplifica
el POS. La obligatoriedad concreta sigue variando por estado y hay que verificarla para el
estado donde opere el comercio.

Y sigue firme lo de §2.3: campos IBS/CBS obligatorios en producción **desde el 3 de agosto
de 2026**, con rechazo automático de la SEFAZ si faltan los grupos UB y W03.

### 8.3 Las cinco consecuencias de diseño sobre la Ola 0

Entrar por Venezuela y Brasil en vez de por Ecuador cambia cinco cosas de la base. Esta es
la razón real por la que valió la pena preguntar antes de proponer:

1. **El motor de impuestos nace con N tributos por línea, no con uno.** Con Ecuador
   bastaba generalizar la tarifa; con Brasil una línea lleva ICMS, IPI, PIS, COFINS y
   ahora IBS, CBS e IS simultáneamente, con bases distintas. La lista de impuestos por
   línea deja de ser una mejora elegante y pasa a ser requisito de entrada.
2. **El impuesto deja de ser función pura del carrito.** El IGTF venezolano depende del
   medio de pago. Hay que separar el cálculo en dos momentos: impuestos de producto (al
   armar el pedido) e impuestos de liquidación (al cobrar y facturar). Hoy hay un solo
   momento.
3. **La orden necesita moneda de presentación, moneda de liquidación y la tasa
   congelada.** Venezuela obliga a expresar y cobrar a tasa BCV del día, con dólar de
   facto circulando. Un solo campo de moneda no alcanza: hay que guardar el par y la tasa
   usada, en la orden, para que el documento sea reproducible después.
4. **La facturación necesita tipo de documento por canal.** NF-e 55 para venta asistida,
   NFC-e 65 para POS. El modelo actual asume un documento único.
5. **La emisión propia no se reusa: ambos van por socio.** El andamiaje UBL/XAdES de la
   DIAN —que era el gran argumento a favor de Ecuador y Perú— **no aporta nada aquí**.
   A cambio, integrar contra una API REST de socio es bastante más barato que la spec 016.
   El patrón `_baseAccountingProvider` ya existente absorbe ambos sin refactor.

### 8.4 Orden de trabajo revisado

**Ola 0 — Base, sin abrir mercado.** Igual que antes en intención, distinta en forma:
perfil de país por empresa, moneda con par y tasa congelada, motor de impuestos de N
tributos por línea en dos momentos (producto y liquidación), y tipo de documento fiscal
por canal. Colombia se migra a esa base y **debe dar números idénticos** — fixtures
dorados de la spec 010 como gate, sin modificarlos.

**En paralelo desde el día uno, no después:** (a) arrancar la homologación de Katuq ante
el SENIAT bajo la Providencia 000121; (b) elegir imprenta digital en Venezuela evaluando
si conviene The Factory HKA por su cobertura regional; (c) elegir socio fiscal en Brasil
entre los que ya soportan la reforma; (d) confirmar la tarifa vigente del IGTF con asesor
local. Ninguna de las cuatro es código y las cuatro pueden bloquear el lanzamiento.

**Ola 1 — Venezuela.** Menos código que Brasil (API REST de imprenta, un tipo de
documento, IVA de tarifa única), pero con el trámite de homologación como camino crítico.

**Ola 2 — Brasil.** Más código (dos documentos fiscales, motor de impuestos completo,
pt-BR real sobre ~230 templates sin extraer) pero sin trámite propio: el socio absorbe la
relación con las SEFAZ.

Ecuador y Perú quedan como olas posteriores oportunistas: una vez exista la base, entran
mucho más baratos que estos dos, y ahí sí se reusa el andamiaje de la DIAN.

---

## 9. Fuentes externas consultadas

- Perú / SUNAT: [EDICOM — factura electrónica en Perú](https://edicomgroup.com/blog/the-electronic-invoice-in-peru), [SUNAT — Proveedor de Servicios Electrónicos (PSE)](https://cpe.sunat.gob.pe/aliados/pse), [Guía CPE SUNAT 2026](https://etiqcontrol.com/comprobantes-de-pago-electronicos-guia-sunat/)
- Brasil / reforma tributaria: [CGIBS — nuevo marco desde el 03/08](https://www.cgibs.gov.br/novo-marco-da-reforma-tributaria-inicia-em-03-de-agosto-com-preenchimento-obrigatorio-dos-campos-relativos-ao-ibs-e-a-cbs), [Comsefaz — período de adaptación 2026](https://comsefaz.org.br/novo/reforma-tributaria-comeca-em-2026-com-periodo-de-adaptacao-destaque-informativo-dos-novos-tributos-e-dispensa-de-penalidades/), [Contmatic — campos IBS/CBS/IS en la NF-e](https://simplifique.contmatic.com.br/blogs/nf-e-novos-campos-reforma-tributaria-2026)
- Ecuador / SRI: [Requisitos de facturación electrónica](https://factuplan.com.ec/blog/requisitos-para-facturacion-electronica-ecuador), [Guía SRI 2026 + certificado digital](https://todotramitec.com/articulo/facturacion-electronica-sri-2026-certificado-comprobantes-requisitos/)
- Venezuela / SENIAT: [Providencia SNAT/2024/000102 — guía](https://ivacalculator.com/venezuela/factura-digital-seniat/), [Texto de la providencia sobre medios digitales](https://tugacetaoficial.com/leyes/texto-providencia-seniat-utilizacion-de-medios-digitales-para-emision-de-facturas-y-otros-documentos-17-12-2025/), [BCV — tipo de cambio oficial](https://www.bcv.org.ve/seccionportal/tipo-de-cambio-oficial-del-bcv)
- Pasarelas LATAM: [Comparativa pasarelas LATAM 2026](https://cristiantala.com/pasarelas-de-pago-en-latam-2026-la-guia-que-necesitas-antes-de-cobrar-tu-primer-dolar/), [Pasarelas Ecuador — PayPhone/Kushki/Datafast](https://www.nmtechstudio.com/blog/pasarelas-pago-ecuador-2026-comparativa), [Pasarelas Perú 2026](https://blog.riqra.com/posts/pasarelas-pago-online-peru)

Profundización §8:

- Venezuela / imprentas digitales y homologación: [Unidigital — documentación de API REST de facturación digital](https://docs.unidigital.global/), [The Factory HKA Venezuela — imprenta digital](https://imprenta.thefactoryhka.com.ve/), [CG La Imprenta Digital (SENIAT/INTI/012)](https://cgimprenta.digital/), [Imprentas Digitales 421](https://imprentadigital421.com.ve/), [Smart Factura](https://smartfactura.net/), [Consultores WHB — qué es la imprenta digital](https://www.consultoreswhb.com/imprenta-digital/)
- Venezuela / IGTF: [PwC — modificación de la alícuota de IGTF (julio 2024)](https://www.pwc.com/ve/es/publicaciones/assets/PublicacionesNew/Boletines/Modificaci%C3%B3n%20de%20la%20Al%C3%ADcuota%20de%20IGTF%202%20al%200%20(Julio%202024).pdf), [PwC — decreto de exoneración y no sujeción](https://www.pwc.com/ve/es/publicaciones/assets/PublicacionesNew/Boletines/decreto%20de%20exoneraci%C3%B3n%20y%20no%20sujeci%C3%B3n.pdf), [Prodavinci — IGTF y pagos en dólares](https://prodavinci.com/igtf-y-pagos-en-dolares/)
- Brasil / socios de API fiscal: [Comparativo de APIs NFS-e para desarrolladores 2026](https://www.notaas.com.br/blog/post/melhor-api-nfse-desenvolvedores-brasil-plugnotas-tecnospeed-enotas-nuvem-fiscal-focus-nfe-comparativo-2025-2026), [Integración de la API NFS-e Nacional](https://www.notaas.com.br/blog/post/api-nfs-e-nacional-integrar-documentacao-oficial-2026), [Brasil NFe — API REST fiscal](https://www.brasilnfe.com.br/)
- Brasil / tipo de documento: [Diferencia entre NF-e 55 y NFC-e 65](https://www.digisan.com.br/blog/diferenca-entre-nota-fiscal-55-e-65), [Ajuste SINIEF 12/2026 revoca la prohibición de NFC-e contra CNPJ](https://www.contabeis.com.br/noticias/76237/empresas-devem-fazer-ajustes-fiscais-com-proibicao-da-nfc-e-para-cnpj-revogada/), [SEFAZ MG — preguntas frecuentes NFC-e](https://portalsped.fazenda.mg.gov.br/spedmg/nfce/Perguntas-Frequentes/respostas_i/index.html)
