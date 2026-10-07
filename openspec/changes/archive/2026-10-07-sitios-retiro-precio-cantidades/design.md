# Diseño — D-369

## Retiro

Mover resolución de `retiroId` al inicio del checkout, contra puntos normalizados del sitio publicado. Elegir `punto.bodegaId || tienda.bodegaId`; comprobar siempre `warehouses` por `company` e `idBodega` business code para retiro. Rechazar código inválido, ajeno o sin bodega antes de crear pedido. El domicilio conserva su validación y bodega general. El punto con bodega propia puede servir retiro aunque no tenga bodega general.

El script público exige dirección/ciudad solo para domicilio. En `siteOrden`, marcar retiro en cada línea y armar `orden.envio`/dirección del pedido con el local; construir el perfil y facturación con los datos auténticos del comprador. Si no dio domicilio, el perfil no agrega una dirección vacía o del local. `resolverClienteEnCRM` tolera que no haya dirección nueva. Confirmación de retiro muestra el local; si el punto no tiene ciudad se deja vacía sin usar la ciudad del comprador. No modificar cálculo de cupón, IVA, adiciones o preferencias.

## Precio

D-214 establece talla/color como identidad de despacho, sin otro mecanismo de precio. Ficha JSON y selector conservan precio de `precioParaCliente`. `aplicarSesion` actualiza también la ficha y mantiene los extras; el configurador lee la base vigente del botón para que una sesión posterior al render no restaure la base pública. Conservar promoción pública cuando no hay cambio de precio. Cada consulta de precios se asocia a generación y token; ignorar éxitos/fallos de sesiones anteriores o tras logout antes de tocar DOM, mapa global y evento.

Revisar carrito recuperado: precio público vigente desde GET `/productos?ids=...` y filas de lista propia desde POST `/precios` con sesión existente. No ampliar auth ni endpoints. Cuando el formato guarda `precioBase`, conservar `precio - precioBase` como extras y actualizar ambos precios; no inferir precios de opciones antiguas si faltan los datos necesarios. El snapshot del endpoint de correo no devuelve `precioBase`: conserva su importe hasta confirmar, sin ampliar guardado/lectura de snapshots. Una respuesta válida sin fila propia usa precio público; una lectura privada fallida conserva importe conocido. Capturar snapshot/comparar identidad para no pisar cambios del carrito hechos mientras responde una lectura de precios.

## Cantidades

Mantener líneas por variante/configuración, pero sumar cantidades por docId para validar disponibilidad. Reusar `getRealStockMap` y sus reglas de normalización/deduplicación. Si hay entrada real, comprobar el saldo de la bodega efectiva; usar la disponibilidad legacy solo de respaldo. Sin cambiar la política actual ante error de lectura ni hacer writes de inventario desde validación.

## Verificación

Regresiones antes del cambio con handler, render y calculador reales; módulos de red y Firestore simulados con registro de violaciones. Retiro primero, cantidades después: diff, aplicación y pruebas por cada cambio sensible. Precio puede avanzar en paralelo en archivos distintos. Probar IVA/cupón/adiciones con ambos motores, texto de variante íntegro, maestros intactos, DOM de selector/ficha, sesión y carrito recuperado. Suite de publicación y regresiones D-363/D-364 al cerrar. Sintaxis de archivos y script generado; frontend no cambia salvo documentación.
