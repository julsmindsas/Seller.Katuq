## 1. Contrato primero (backend)

- [ ] 1.1 Leer `services/registrationSecurity.js` y el contrato `tests/onboarding/registroConContrasena.contract.test.js` (D-319) antes de tocar nada
- [ ] 1.2 Escribir `tests/onboarding/documentoPorConfirmar.contract.test.js`:
  - la tabla de casos de D1 (sí: 123456778, 1234567890, 987654321, 111111111; no: 43123456, 52817346)
  - un NIT con dígito de verificación válido nunca se marca
  - un registro con 123456778 crea la cuenta con `documentoPorConfirmar: true` y `motivoDocumento: "serie"`
  - `assessRegistrationRisk` da el mismo puntaje y la misma decisión antes y después del cambio, para los mismos casos
- [ ] 1.3 Correr la prueba y confirmar que falla por las razones esperadas

## 2. Backend

- [ ] 2.1 `registrationSecurity.js`: `documentoPareceInventado(doc)` → `{ inventado, motivo }` según D1 y D2, exportada; `looksFakeNit` y el puntaje no se tocan
- [ ] 2.2 `diagnostics.js`: al armar la empresa, agregar `documentoPorConfirmar` y `motivoDocumento` solo cuando aplica
- [ ] 2.3 `templates/registro.js`: chip "Documento por confirmar" en el aviso interno; actualizar `registroCorreos.test.js`
- [ ] 2.4 Correr todas las pruebas de `tests/onboarding/`: en verde
- [ ] 2.5 Commit con solo los archivos del cambio y el sello D-XXX

## 3. Front

- [ ] 3.1 `diagnostic-survey.component.ts`: pregunta "¿Cuál es tu cédula o NIT?", placeholder "Cédula o NIT", patrón `^[0-9]{6,11}$` y mensaje "Debe tener entre 6 y 11 números"
- [ ] 3.2 Getter del aviso con la misma regla de D1 y D2, sin validador de formulario (no bloquea)
- [ ] 3.3 `diagnostic-survey.component.html` y `.scss`: ayuda "Si no tienes NIT, pon tu cédula" y el aviso con el par de alerta del tema, sin gradientes
- [ ] 3.4 Textos de la bienvenida del registro que hablan del NIT, si los hay
- [ ] 3.5 `npm run build` sin errores y prueba en navegador: 7 dígitos avanza; 123456778 muestra el aviso y deja continuar; 43123456 sin aviso

## 4. Registro y seguimiento

- [ ] 4.1 D-XXX en `specs/CONTRACT.md`
- [ ] 4.2 Avisarle a la sesión del reporte de pauta el campo `documentoPorConfirmar` para separar los registros

## 5. Despliegue (con OK de Daniel en cada paso)

- [ ] 5.1 Backend a producción, midiendo antes lo que sube con la rama
- [ ] 5.2 Front a producción desde un worktree limpio, sin "Correos de tu tienda"
- [ ] 5.3 Registro real de prueba con un correo de Julsmind y el documento 123456778: la cuenta entra y queda marcada; el aviso interno muestra la marca. Luego borrar la empresa
- [ ] 5.4 A la semana: cuántos registros quedaron marcados y cuántos empezaron contra cuántos terminaron en Meta (antes: 7 y 4)
