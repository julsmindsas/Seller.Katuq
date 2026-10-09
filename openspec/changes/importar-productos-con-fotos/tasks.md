## 0. Decisiones

- [x] 0.1 La función figura en el catálogo de banderas de la feria (`productImportPhotos`) y rige la regla de Daniel: nace apagada para ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR y ALMACEN BOMBAS, se enciende por comercio y se prueba primero en FLORECER.
- [ ] 0.2 Daniel aprueba esta propuesta (o la ajusta) **antes del commit**: el código ya existe en las copias de trabajo.
- [ ] 0.3 Responder las preguntas abiertas de `design.md` (en especial 1, 2, 3 y 5).
- [x] 0.4 Registrar la decisión en `specs/CONTRACT.md` con su número D-385 (lo asigna quien haga el commit, mirando el CONTRACT del remoto) y reemplazar los `D-385` de estos documentos.

## 1. Dependencia: contrato de banderas (propuesta `banderas-por-comercio`)

- [ ] 1.1 Versionar el contrato **antes o junto con** este cambio (tarea 1.5 de `banderas-por-comercio`): `functions/services/companyFeatureFlags.js` y `functions/scripts/set-company-feature.js` (backend) y `src/app/shared/services/company-features.service.ts` (front). Hoy existen en las copias de trabajo, sin commit. Sin el servicio del front el modal no compila; sin el módulo del backend la función queda apagada (carga defensiva).
- [x] 1.2 `productImportPhotos` ya está en los dos catálogos: `FEATURE_FLAG_NAMES` (backend) y `COMPANY_FEATURE_FLAGS` (front).
- [ ] 1.3 **No desplegar ni encender esta función antes de que `banderas-por-comercio` cierre la llave con punto** (su tarea 3.2): mientras esté abierta, un administrador de comercio podría escribir `featureFlags.productImportPhotos` por la ficha de empresa y «nace apagada, la enciende Daniel» no se cumple.

## 2. Backend: validación de enlaces (`functions/utils/productImageUrls.js`)

- [x] 2.1 Partir la celda en enlaces, validar y normalizar uno (https, sitio público, sin credenciales, máximo 2.048, no archivo, páginas de redes, Drive y Dropbox) y armar la galería (máximo 8, portada primero, sin repetidas, conserva lo que había). Prueba: `functions/tests/onboarding/productImageUrls.test.js`, 50 verificaciones en verde (2026-10-08).
- [x] 2.2 Sin red ni DNS: la prueba reemplaza `http`, `https`, `net`, `dns` y `fetch` por funciones que revientan (misma prueba).
- [x] 2.3 Celdas hostiles (tiradas de hasta 50.000 caracteres) en menos de 100 ms (misma prueba y la sección de celdas hostiles de `importProductsPhotos.test.js`).
- [x] 2.4 El aviso no devuelve contraseñas y los mensajes dicen qué pasó y qué hacer (misma prueba).

## 3. Backend: `importProducts` detrás de la bandera (`functions/controllers/onboarding.js`)

- [x] 3.1 Prueba «dorado» (contract test del importador de siempre): un lote sin fotos responde y escribe lo mismo que el controlador de `HEAD`, en los tres modos y con la bandera ausente, vacía, en `false` y encendida (`functions/tests/onboarding/importProductsPhotos.test.js`, sección «dorado»).
- [x] 3.2 Lote sin celdas ni columnas de foto: no lee la bandera y responde sin `photoImport`. Con celdas y la bandera apagada: ignora las fotos y responde `photoImport: { enabled: false, ignoredRows }`. Con la bandera encendida: valida, guarda y responde el informe (misma prueba, secciones de control, bandera apagada y bandera encendida).
- [x] 3.3 Productos existentes: la hoja manda solo en lo que dice; las filas sin foto conservan las suyas; los modos «solo crear» y «solo actualizar» no avisan de las filas omitidas; la misma referencia en otra empresa no se toca; importar dos veces no duplica (misma prueba).
- [x] 3.4 Aislamiento y falla cerrada: la bandera sale de la empresa de la sesión; si no se puede leer o la empresa no existe queda apagada (misma prueba, sección de aislamiento).
- [x] 3.5 Carga defensiva: si falta el util el servidor carga y el importador sigue como siempre; una falla inesperada al armar fotos no tumba el producto y deja la fila avisada (misma prueba, secciones de util ausente y de falla inesperada).
- [x] 3.6 Entradas hostiles: `photoUrls` como texto, lista, nulo, objetos, celda gigante o imágenes armadas a mano no rompen el importador ni se cuelan sin validar (misma prueba).
- [x] 3.7 La tienda pública muestra las fotos importadas y la política de contenido de las tiendas sigue permitiendo imágenes `https:` de cualquier sitio; la prueba falla si eso cambia (misma prueba, sección de tienda pública).
- [x] 3.8 Write-set: en los escenarios de la prueba solo se escribe `products`, las fotos no cambian precio, categoría ni identificación, y el servidor no hace ninguna petición de red (misma prueba).
- [x] 3.9 `node --check` limpio en `controllers/onboarding.js`, `utils/productImageUrls.js` y las dos pruebas (2026-10-08).
- [ ] 3.10 Reinicio local del backend sin errores (`node index.js` en `functions/`; no hay hot-reload).

## 4. Front: importador (`src/app/shared/components/import-modal/`)

- [x] 4.1 `import-modal.component.ts`: claves `photoUrls.main` y `photoUrls.additional`; configuración de productos con dos columnas más solo con la bandera (`loadConfig`, `getProductConfigConFotos`); filas de foto en el mapeo (`ofrecerCamposDeFotos`); envío del texto de la celda recortado a 20.000 caracteres; suma del informe por lote (`acumularFotos`). Con la bandera apagada: el mismo objeto de configuración de siempre.
- [x] 4.2 `import-modal.component.html`: nota en el paso de mapeo y bloque de resultado (resumen y lista de enlaces con problema), solo con la función activa o con informe del servidor.
- [ ] 4.3 **Prueba del front:** hoy no existe ninguna. Extraer la lógica pura (`pareceColumnaDeFotos`, `esColumnaDeFotosAdicionales`, `acumularFotos`, armado de las dos filas) a un módulo `.ts` sin Angular y probarla con `node --test`, estilo `tests/productos/`: bandera apagada igual a hoy, sugerencias de columnas, informe acumulado entre lotes y fila del Excel. Depende de la pregunta 6 de `design.md`.
- [ ] 4.4 `npm run build` sin errores (no se compiló al preparar esta propuesta: el front no se compila desde aquí).
- [ ] 4.5 Revisión visual con el servidor corriendo, en FLORECER: las dos filas de foto sin columna (si se leen como error), el resumen, la lista de enlaces con problema y la vista de celular. Desviaciones del tema en `design.md`, decisión 11.

## 5. Revisión y validación

- [ ] 5.1 Revisión independiente del diff del backend (validación del enlace, aislamiento entre empresas, celdas hostiles y que no haya escrituras fuera de `products`), por una persona o una sesión distinta de la que lo escribió.
- [ ] 5.2 Revisión independiente del diff del front (con la bandera apagada el modal queda como hoy; nada de HTTP nuevo).
- [x] 5.3 `openspec validate importar-productos-con-fotos --strict` pasa (2026-10-08). Volver a correrlo si cambia algún documento.
- [ ] 5.4 **Mostrar a Daniel el diff** del backend (`importProducts`, el módulo sensible de este cambio) y el del front antes de commitear, un repo a la vez.

## 6. Verificación en FLORECER (la bandera la enciende Daniel; ningún agente escribe en producción)

- [ ] 6.1 Prerrequisitos: contrato de banderas y este cambio desplegados. Daniel corre `node scripts/set-company-feature.js "FLORECER" productImportPhotos on` (simulación) y luego con `--execute`. Cerrar sesión y volver a entrar para que el front vea la bandera.
- [ ] 6.2 Descargar la plantilla de productos: trae las dos columnas de foto con el ejemplo vacío y la hoja de instrucciones las explica.
- [ ] 6.3 Importar un archivo con tres productos con foto buena (enlace directo, foto compartida de Drive y foto de Dropbox) y tres con enlaces malos (página de Instagram, `http://` y un nombre de archivo): el resumen cuenta las fotos y los enlaces convertidos, y la lista dice la fila correcta del Excel, la referencia, la columna y qué hacer.
- [ ] 6.4 Ver las fotos en el listado, en el formulario del producto y en la tienda pública de FLORECER. **Comprobar en vivo que el enlace directo de Drive se ve como imagen**; si no se ve, ajustar `normalizarDrive` y sus pruebas.
- [ ] 6.5 Importar el mismo archivo otra vez: sin fotos duplicadas. Importar una fila con la celda de foto vacía: el producto conserva sus fotos.
- [ ] 6.6 Importar un archivo que actualiza productos con fotos **sin** asignar ninguna columna de fotos: comprobar que la nota lo advierte y qué pasa (comportamiento de hoy; pregunta 2).
- [ ] 6.7 Con una empresa sin la bandera (solo mirar): el importador de productos no muestra columnas de foto, filas de foto ni nota.
- [ ] 6.8 Apagar la bandera en FLORECER (`off --execute`), iniciar sesión de nuevo y repetir 6.2: todo vuelve a ser como hoy.
- [ ] 6.9 Si algún comercio con Shopify o WooCommerce conectado va a encender la función: probar antes con un producto y ver qué hace la plataforma con el enlace de la foto (riesgos de `proposal.md`).

## 7. Cierre

- [ ] 7.1 Commit con el número de decisión asignado: backend (`functions/controllers/onboarding.js` solo con los cambios de `importProducts` y los dos auxiliares, `functions/utils/productImageUrls.js` y sus dos pruebas) y front (`import-modal.component.ts` y `.html`). Archivo por archivo, nunca `git add -A`, y con el sello de la sesión.
- [ ] 7.2 Registrar en `specs/CONTRACT.md` y en la memoria.
- [ ] 7.3 Decidir, comercio por comercio, el encendido fuera de FLORECER (pregunta 1).
- [ ] 7.4 Retirar la bandera (dueño: Daniel; fecha propuesta 2027-01-31, Artículo XII) y, con ella, el camino viejo de fotos armadas en el navegador (pregunta 7).
- [ ] 7.5 Pendientes anotados aparte: `deleteImg` por posición (pregunta 3), `/v1/media/delete-file` sin comprobar la empresa (pregunta 9) y la fase 2 (copiar las fotos al almacenamiento de Katuq).

## Avance (2026-10-08)

- El código existe en las copias de trabajo del backend y del front, **sin commit**. Esta propuesta lo documenta; no lo modifica.
- Backend: `productImageUrls.test.js` (50) e `importProductsPhotos.test.js` (24) en verde y `node --check` limpio en los cuatro archivos. El diff de `onboarding.js` (+148 / −2) contiene solo este cambio.
- Front: sin compilar y sin prueba automática; la lectura del diff confirma que con la bandera apagada el modal usa la configuración de siempre.
- `openspec validate importar-productos-con-fotos --strict` pasa (tres specs: `product-import-photo-links`, `product-import-photo-report` y `product-import-photo-link-safety`).
- No se leyó ni se escribió producción. No hay relleno ni migración de datos, así que no aplica el `--dry-run`.
- Pendientes: aprobación, revisión independiente, compilar el front, reinicio local, FLORECER, número de decisión y commit.
