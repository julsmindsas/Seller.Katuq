# Tareas — configuración según el producto

## 1. Backend

- [x] 1.1 Lector del perfil: por cada producto del carrito, leer
      `procesoComercial` y devolver `{productoId, nombre, pideFecha,
      aceptaAdiciones, llevaTarjeta, aceptaComentarios, variables[]}`.
      Defaults seguros: sin `procesoComercial` o desactivado = no requiere
      nada. `variablesForm` se parsea defensivamente. Tests.
- [x] 1.2 El turno lleva el perfil al agente (solo productos del carrito).
- [x] 1.3 Gate de cierre calculado: fecha exigida solo si algún producto lleva
      calendario; variables declaradas obligatorias. Tests de las dos ramas.
- [x] 1.4 El cierre guarda las variables elegidas como preferencias del ítem
      (mecanismo nativo, sin campo nuevo). Contract test.

## 2. ADK

- [x] 2.1 Herramienta `elegir_variable(producto_id, variable, valor)`. Tests.
- [x] 2.2 Instrucciones: preguntar SOLO lo que el perfil permite; variables
      obligatorias antes de cerrar; ofrecer variables/adiciones/confirmación
      con `ofrecer_opciones`. Tests.

## 3. Verificación

- [x] 3.1 Suites backend + ADK en verde.
- [x] 3.2 Ensayo contra prod con dos productos reales de ALMARA: uno simple
      (debe cerrar sin preguntar nada extra) y uno con adiciones/tarjeta.
- [x] 3.3 CONTRACT.md al día.
