# Spec 007 — Administración de usuarios: contraseña y eliminación

**Estado:** approved by request — 2026-05-28  
**Scope:** pantalla `/usuarios` y API `/v1/users`.

## Contexto

El administrador necesita crear, actualizar y eliminar usuarios desde el módulo de usuarios. El flujo existente tenía dos inconsistencias:

- Al crear usuario, la contraseña se enviaba en texto plano desde el frontend, pero el login compara contra la contraseña hasheada.
- La tabla intentaba eliminar usando `usuario.id`, pero el backend lista el doc id como `cd`; además la ruta backend de eliminación no estaba expuesta.

## User Stories

1. Como administrador, quiero crear un usuario con una contraseña como `Katuq2026!` para que pueda iniciar sesión inmediatamente.
2. Como administrador, quiero actualizar datos de un usuario sin cambiar su contraseña para no bloquearle el acceso.
3. Como administrador, quiero escribir una nueva contraseña al editar para restablecer el acceso del usuario.
4. Como administrador, quiero eliminar un usuario desde el listado cuando ya no debe acceder al sistema.

## Criterios de aceptación

- WHEN el administrador crea un usuario con una contraseña de 8 o más caracteres, THE system SHALL guardar una contraseña compatible con el login actual.
- WHEN el administrador edita un usuario y deja la contraseña vacía, THE system SHALL mantener la contraseña existente.
- WHEN el administrador edita un usuario y escribe una contraseña nueva, THE system SHALL actualizarla en el mismo formato usado por login.
- WHEN el administrador confirma eliminar un usuario del listado, THE system SHALL eliminar el documento `users/{cd}` correspondiente.
- IF el usuario a editar o eliminar no pertenece a la empresa activa, THEN THE system SHALL rechazar la operación.
- IF faltan campos obligatorios o la contraseña nueva es menor a 8 caracteres, THEN THE system SHALL mostrar un error claro.

## Out of Scope

- Migrar contraseñas históricas.
- Cambiar el flujo de autenticación completo.
- Introducir Firebase Auth/Cognito u otro proveedor.
- Soft delete con recuperación.
