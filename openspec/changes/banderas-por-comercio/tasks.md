## 0. Decisiones

- [x] 0.1 Regla de Daniel para la feria: toda función nueva nace apagada para los comercios actuales (ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR y ALMACEN BOMBAS) y se enciende comercio por comercio, primero en FLORECER.
- [ ] 0.2 Aprobar esta propuesta y responder las preguntas abiertas del diseño.
- [x] 0.3 Registrar la decisión como D-385 en `specs/CONTRACT.md` (el número lo toma quien haga el commit, mirando el remoto).

## 1. Lectura en el servidor

- [x] 1.1 `functions/services/companyFeatureFlags.js`: catálogo cerrado (8 nombres), `isFeatureEnabled`, `requireFeature` (403 `FEATURE_DISABLED`) y `findCompanyDocs`. Prueba: `functions/tests/companies/companyFeatureFlags.test.js` (33 pruebas, Firestore simulado, sin red; corridas el 2026-10-08).
- [x] 1.2 `node --check` limpio en `companyFeatureFlags.js`, `set-company-feature.js`, `controllers/companies.js`, `sanitizeCompanyUpdate.js` y `routers/katuqintelligence.js` (2026-10-08).
- [ ] 1.3 Reinicio local sin errores (`node index.js` en `functions/`; no hay hot-reload). Lo corre quien tenga la orden de levantar el servidor.
- [ ] 1.4 Un script `test:banderas` en `functions/package.json` que corra las tres pruebas de `tests/companies/`. Hoy no están enganchadas a ningún script (`package.json` no se tocó al redactar).
- [ ] 1.5 **Versionar la Fundación lo antes posible** (hallazgo 7), antes o junto con cualquier consumidor: en el servidor `services/companyFeatureFlags.js`, `scripts/set-company-feature.js` y sus tres pruebas; en el front `company-features.service.ts`. Hoy no tienen historial en git y otra propuesta reporta que el módulo ya se borró una vez por error. Sin el servicio del front, `crear-producto-lite`, `crear-productos` e `import-modal` no compilan.

## 2. Prender y apagar

- [x] 2.1 `functions/scripts/set-company-feature.js`: simula por defecto, `--execute`, escribe solo `featureFlags.<bandera>` con `merge`, relee y verifica, y se niega ante la duda. Prueba: `functions/tests/companies/setCompanyFeature.test.js` (18 pruebas).
- [x] 2.2 Contract test del write-set (parte de 2.1): el documento de la empresa no cambia salvo esa clave, y el script no usa `update` ni `delete`.
- [ ] 2.3 Procedimiento escrito para el equipo, en el runbook del servidor y en la memoria del proyecto: simular, `--execute`, comprobar y anotar en la bitácora de `CONTRACT.md`. Prender una bandera es una escritura en producción: solo con la orden de Daniel.

## 3. La ficha de empresa no escribe banderas

- [x] 3.1 `functions/services/companies/sanitizeCompanyUpdate.js` (`featureFlags` en `CAMPOS_DE_OTRO_DUENO`) y `functions/controllers/companies.js` (`createCompany` y `editCompany` descartan `featureFlags`). Prueba: `functions/tests/companies/featureFlagsProtegidos.test.js` (14 pruebas).
- [ ] 3.2 **Cerrar la llave con punto** (hallazgo 1). Primero la prueba, que hoy debe fallar, con un Firestore simulado que expanda las rutas con punto como lo hace Firestore: `PUT /:id` y `POST /edit` con `featureFlags.<bandera>` y con `bloqueo.<campo>` no cambian el documento, y `POST /create` no siembra la llave. Después el hunk de `design.md`, decisión 11. Los dos archivos tienen parches de otras sesiones: leerlos y mirar el `git diff` de cada uno antes de editar, y aprobar el diff antes de aplicar.
- [ ] 3.3 Repetir las pruebas previas de empresas con 3.2 aplicado: `sanitizeCompanyUpdate` (13), `companyAccess` (16), `resolveActivo` (14) y `cicloVida` (29), que pasaron el 2026-10-08 sin 3.2. `soloLectura.test.js` falla hoy por rutas de otras funciones (`POST /:provider/invoices/preview` y `POST /carrier/offers` sin clasificar en `middleware/soloLectura.js`), no por las banderas: no se arregla aquí.

## 4. Lectura en la pantalla

- [x] 4.1 `src/app/shared/services/company-features.service.ts` y el campo opcional `featureFlags` en `src/app/shared/models/User/CompanyInformation.ts`.
- [x] 4.2 Comprobado al redactar con una prueba desechable fuera del repo, que transpila la clase y la corre con un `localStorage` simulado (11 comprobaciones: empresa distinta de la sesión, sin sesión, solo `true`, `featureFlags` mal formado, JSON ilegible, almacenamiento bloqueado, empresa "mínima" sin `nomComercial`, cambio en caliente e `isEnabled$`). **No cuenta como prueba del repo.**
- [ ] 4.3 Llevar esas comprobaciones al repo, en `tests/` del front, con el método de `tests/navigation/nav-responsive.test.js` (transpilar la clase y correrla en `vm`) y `node --test`. Hoy la única prueba del front que menciona el servicio, `tests/productos/ficha-desde-foto-formularios.contract.test.js`, solo verifica por texto que `productFromPhoto` está en el catálogo.
- [ ] 4.4 `npm run build` sin errores. Lo corre quien tenga la orden; no se avanza con el build roto.
- [ ] 4.5 Decidir el título del aviso del 403 (hoy el interceptor lo muestra como "Suscripción") y, si se cambia, ajustar `http.interceptor.ts` para `FEATURE_DISABLED`.

## 5. Contrato y proceso

- [ ] 5.1 Alinear el catálogo (hallazgo 2): sumar `pickingAlistamiento` y `singleProductTemplate` como nombres nuevos (no reusar `singleStepStore`, que es otra función), en el servidor, en el front y en la prueba que fija el catálogo (hoy exige exactamente 8 nombres y dice "las 8 banderas del contrato"). Las dos altas editan la misma lista: coordinar el orden con `alistamiento-picking-rutas` y `plantilla-tienda-un-producto`.
- [ ] 5.2 Resolvedor por defecto de `requireFeature` (hallazgo 3): decidir y, si se cierra, prueba primero: sin sesión y sin llave de servicio, 403 aunque el encabezado nombre una empresa con la bandera prendida. Mientras tanto, toda ruta pública con bandera pasa `getCompany` y lo prueba con un encabezado ajeno.
- [ ] 5.3 Revisión independiente, por otra sesión o persona que no escribió el código: las tres pruebas, el cierre de la llave con punto y el resolvedor.
- [ ] 5.4 Dueño y fecha de retiro de cada bandera del catálogo (Art. XII), anotados en la propuesta de cada función y en `CONTRACT.md`. Propuesta: dueño Daniel, revisión el 2027-01-31.
- [ ] 5.5 Decidir el rastro de los cambios de bandera y si el script frena a los cuatro clientes actuales (pregunta abierta 4). Hasta entonces, una línea en la bitácora de `CONTRACT.md` por cada cambio en una empresa real.
- [ ] 5.6 Cuando esta propuesta se apruebe y se despliegue, avisar a las propuestas que dependen de ella (`alistamiento-picking-rutas`, `whatsapp-confirmacion-y-carrito`, `comprar-ahora-contra-entrega` y `enviame-contra-entrega-y-rastreo`) para que dejen de describirla como pendiente.

## 6. Verificación en FLORECER (escribe en Firestore de producción: solo con la orden explícita de Daniel)

El front local sirve para probar: su `urlApi` apunta a producción. Se usa una bandera **sin consumidor en ese momento** (`product3d` hoy) para no activar ninguna función por accidente.

- [ ] 6.1 Lectura previa, sin `--execute`: `node scripts/set-company-feature.js "<empresa>" product3d on` para FLORECER y para las cuatro empresas actuales. Debe decir "apagada (ausente)" en las cinco y no escribir. Si alguna responde que hay dos empresas con ese nombre comercial, esa empresa nunca prendería una función: anotar cuál.
- [ ] 6.2 Confirmar en la consola de Firebase que las reglas de seguridad no dejan al navegador escribir `companies` (no hay archivo de reglas en ninguno de los dos repos).
- [ ] 6.3 `--execute` solo en FLORECER. Comprobar lo releído que imprime el script.
- [ ] 6.4 Iniciar sesión con el usuario de prueba de FLORECER (ver la memoria del proyecto) y comprobar que la empresa guardada en el navegador trae `featureFlags.product3d` en `true` y que `isEnabled('product3d')` responde `true`. Comprobar también que con la sesión de otra empresa de prueba (no de un cliente) no aparece.
- [ ] 6.5 Compuerta del servidor, si la ruta ya está desplegada: con `productFromPhoto` apagada en FLORECER, `POST /v1/katuqintelligence/ficha-desde-foto` responde 403 con el texto estándar y sin cerrar la sesión.
- [ ] 6.6 Apagar (`off --execute`), comprobar que el servidor lo aplica en la siguiente petición y dejar FLORECER como estaba.

## 7. Cierre

- [ ] 7.1 Commit de los archivos de este cambio (la Fundación primero: 1.5), sin `git add -A`: otras sesiones editan los mismos repos. Backend: `functions/services/companyFeatureFlags.js`, `functions/scripts/set-company-feature.js`, `functions/controllers/companies.js`, `functions/services/companies/sanitizeCompanyUpdate.js` y las tres pruebas. Front: `company-features.service.ts`, `CompanyInformation.ts` y esta carpeta. Al redactar, el `git diff` de los tres archivos editados solo traía hunks de este cambio; revisarlo de nuevo antes del commit (`cupones-de-feria` también quiere tocar `sanitizeCompanyUpdate.js`).
- [ ] 7.2 Desplegar servidor y front como indican `MANUAL-EC2`, `memory/prod-pm2-two-daemons.md` y la nota de despliegue del front. Requiere salir del modo automático.
- [ ] 7.3 Registrar la decisión y la bitácora en `specs/CONTRACT.md` y en la memoria del proyecto.
- [ ] 7.4 Retirar las banderas según la fecha de 5.4 (Art. XII). El módulo y el script se quedan mientras alguna función los use.

## Avance (2026-10-08)

- El código está escrito y sin commit: en el servidor (rama `backend-aws-security`) los archivos nuevos están sin seguimiento y los dos controladores editados, modificados; en el front (rama `feature/venta-asistida-mejorada`), igual.
- Pruebas corridas hoy, todas con Firestore simulado y sin red: `companyFeatureFlags` 33, `setCompanyFeature` 18 y `featureFlagsProtegidos` 14, en verde. Las previas de empresas siguen en verde (`sanitizeCompanyUpdate` 13, `companyAccess` 16, `resolveActivo` 14, `cicloVida` 29); `soloLectura` falla por rutas de otras funciones.
- Al leer el código contra las reglas del proyecto salieron siete hallazgos (ver `proposal.md`). El grave es la llave con punto: las pruebas pasan porque el Firestore simulado no la interpreta, pero el SDK real sí. El más urgente de operar es el 7: la Fundación está sin versionar.
- **Desviación a decidir:** el catálogo del árbol trae 8 nombres; otras piezas esperan `pickingAlistamiento` y `singleProductTemplate` (tarea 5.1).
