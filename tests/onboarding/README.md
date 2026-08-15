# Pruebas focales de onboarding V2

Estas pruebas no dependen de Karma ni de un navegador. Validan los contratos
puros que protegen el estado multiempresa, limpian todos los borradores al
cerrar sesión y validan el parseo del umbral de stock.

Ejecutar desde la raiz de `Seller.Katuq`:

```bash
node tests/onboarding/onboarding-v2-utils.test.js
node tests/onboarding/onboarding-service-contract.test.js
node tests/onboarding/change-password-routing.contract.test.js
```

El segundo runner carga el servicio Angular con un cliente HTTP falso y verifica
que completion propague errores, no marque éxito local ante un 500, que progreso
no envíe identidad controlable y que readiness inválida bloquee el cierre.
El último contrato protege la decisión de ruta posterior al primer cambio de
contraseña para administradores sin necesitar un navegador.
