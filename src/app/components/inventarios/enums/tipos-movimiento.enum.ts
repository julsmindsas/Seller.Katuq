export enum TipoMovimientoInventario {
    INGRESO_INVENTARIO_FISICO = 'Ingreso por inventario fisico',
    INGRESO_COMPRA = 'Ingreso por compra',
    INGRESO_PRODUCCION = 'Ingreso por Produccion',
    INGRESO_AJUSTE = 'Ingreso por Ajuste de inventario',
    INGRESO_MOVIMIENTO = 'Ingreso por movimientos entre bodegas',
    // El backend traduce cualquier tipo que diga DEVOLUCION al motivo canónico
    // `returned`, así que la devolución de cliente no necesita nada más para
    // quedar bien clasificada en el libro.
    INGRESO_DEVOLUCION_CLIENTE = 'Ingreso por devolucion de cliente',
    SALIDA_INVENTARIO_FISICO = 'Salida por inventario fisico',
    SALIDA_VENTA_POS = 'Salida por venta POS',
    SALIDA_VENTA_ASISTIDA = 'Salida por venta Asistida',
    SALIDA_OBSEQUIO = 'Salida por obsequio',
    SALIDA_AJUSTE = 'Salida por ajuste de inventario',
    SALIDA_ROBO = 'Salida por robo'
}