// Nombres para personas no técnicas (2026-10-07, D-350 parte C).
// Solo cambia lo que se MUESTRA; el tipo de cada paso y su configuración no se tocan.

export const NOMBRES_GRUPO: Record<string, string> = {
    osmosis: 'Cereza',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    katuq: 'Katuq',
    'flow-control': 'Lógica (si, repetir, esperar…)',
    http: 'Otros sistemas',
    kai: 'Opttia (IA)',
    siigo: 'SIIGO',
    worldoffice: 'World Office',
    fullpi: 'Fullpi',
    aliaddo: 'Aliaddo',
    enviame: 'Envíame',
    wompi: 'Wompi',
    internal: 'Katuq',
};

/** Pasos de lógica con nombre técnico en el catálogo del backend. */
const PASOS_LOGICA: Record<string, { nombre: string; que: string }> = {
    delay: { nombre: 'Esperar', que: 'Hace una pausa antes de seguir con el siguiente paso.' },
    if: { nombre: 'Si… / si no…', que: 'Sigue por un camino u otro según una condición.' },
    switch: { nombre: 'Elegir camino', que: 'Manda cada registro por el camino que le corresponde.' },
    loop: { nombre: 'Repetir por cada uno', que: 'Hace los pasos siguientes una vez por cada registro de la lista.' },
    merge: { nombre: 'Juntar caminos', que: 'Une en uno los registros que vienen de dos caminos.' },
    'split-array': { nombre: 'Separar lista', que: 'Convierte una lista en registros sueltos.' },
    'error-handler': { nombre: 'Si algo falla', que: 'Atrapa los errores y decide qué hacer con ellos.' },
    'sub-flow': { nombre: 'Usar otra automatización', que: 'Llama a otra automatización como si fuera un paso.' },
    'schedule-cron': { nombre: 'Con horario', que: 'Arranca la automatización a la hora o cada cuánto que elijas.' },
    'webhook-listener': { nombre: 'Cuando otro sistema avisa', que: 'Arranca cuando un sistema externo manda un aviso a Katuq.' },
    'http-request': { nombre: 'Llamar a otro sistema', que: 'Envía o pide datos a un sistema externo.' },
};

/** Reemplaza la jerga del catálogo del backend por palabras de negocio. Solo para mostrar. */
const JERGA: [RegExp, string][] = [
    [/Gu[ií]a Cereza \(Osmosis\)|Osmosis \(Gu[ií]a Cereza\)|Gu[ií]a Cereza/g, 'Cereza'],
    [/Cereza\/Osmosis|Osmosis\/Cereza/g, 'Cereza'],
    [/\bOsmosis\b/g, 'Cereza'],
    [/CanonicalOrder Katuq/g, 'el pedido de Katuq'],
    [/\bCanonical(Order|Product)?\b/g, 'de Katuq'],
    [/Mapper can[oó]nico/gi, 'Traducir datos'],
    [/\bUpsert\b/g, 'Crear o actualizar'],
    [/\bupsert\b/g, 'crear o actualizar'],
    [/\bfulfillment\b/gi, 'despacho'],
    [/\bauto-push\b/gi, 'enviar'],
    [/\bpush\b/gi, 'enviar'],
    [/\bpolling\b/gi, 'revisión periódica'],
    [/\btrigger\b/gi, 'inicio'],
    [/\bwebhook\b/gi, 'aviso'],
    [/\bnodo\b/gi, 'paso'],
    [/\bstock\b/gi, 'existencias'],
];

export function sinJerga(texto: string | undefined | null): string {
    let t = String(texto || '');
    for (const [re, por] of JERGA) t = t.replace(re, por);
    return t;
}

export function nombrePaso(tipo: string, nombreCatalogo?: string): string {
    return PASOS_LOGICA[tipo]?.nombre || sinJerga(nombreCatalogo) || tipo;
}

export function descripcionPaso(tipo: string, descripcionCatalogo?: string): string {
    return PASOS_LOGICA[tipo]?.que || sinJerga(descripcionCatalogo);
}

// ---------------------------------------------------------------------------
// Campos de configuración de cada paso. 96 de 136 no traen `title` en el
// catálogo del backend y se mostraban con su nombre interno ("nodeSlug").
// `avanzado`: va plegado en "Ajustes avanzados" (salvo que sea obligatorio).
// ---------------------------------------------------------------------------
interface InfoCampo { titulo: string; ayuda?: string; avanzado?: boolean; }

const CAMPOS: Record<string, InfoCampo> = {
    nodeSlug: { titulo: 'Identificador de tu nodo en Cereza', ayuda: 'Te lo da el equipo de Cereza. Debe ser exacto.' },
    bodegaCode: { titulo: 'Bodega de Katuq', ayuda: 'El código de la bodega, por ejemplo BOD-001.' },
    warehouseCode: { titulo: 'Código de bodega' },
    matchBy: { titulo: 'Reconocer el producto por', ayuda: 'Cómo se cruza el producto entre los dos sistemas.' },
    createIfMissing: { titulo: 'Crearlo si no existe' },
    publishStatus: { titulo: 'Estado al publicar' },
    publishToOnlineStore: { titulo: 'Publicarlo en la tienda en línea' },
    syncImages: { titulo: 'Copiar también las fotos' },
    syncInventory: { titulo: 'Copiar también las existencias' },
    quantity: { titulo: 'Cantidad' },
    sku: { titulo: 'SKU del producto' },
    status: { titulo: 'Estado' },
    statuses: { titulo: 'Solo estos estados' },
    reason: { titulo: 'Motivo' },
    note: { titulo: 'Nota' },
    noteVisibleToCustomer: { titulo: 'El cliente puede ver la nota' },
    notifyCustomer: { titulo: 'Avisar al cliente' },
    paymentPending: { titulo: 'El pago está pendiente' },
    pushAsCompleted: { titulo: 'Enviarlo como completado' },
    recalculateTotals: { titulo: 'Recalcular los totales' },
    carrier: { titulo: 'Transportadora', ayuda: 'Déjalo vacío para usar la de siempre.' },
    trackingCompany: { titulo: 'Transportadora de la guía' },
    trackingNumber: { titulo: 'Número de guía' },
    trackingUrl: { titulo: 'Enlace para rastrear la guía' },
    documentType: { titulo: 'Tipo de documento en SIIGO' },
    sellerId: { titulo: 'Vendedor en SIIGO' },
    idTerceroInterno: { titulo: 'Tercero interno' },
    terceroInternoId: { titulo: 'Tercero interno' },
    codes: { titulo: 'Tipos de documento', ayuda: 'Separados por coma. Vacío trae todos.' },
    fromDate: { titulo: 'Desde la fecha' },
    toDate: { titulo: 'Hasta la fecha' },
    fechaCorte: { titulo: 'Fecha de corte' },
    diasPlazoCR: { titulo: 'Días de plazo para pagos a crédito' },
    mode: { titulo: 'Modo' },
    skipZero: { titulo: 'Omitir los que tienen saldo en cero' },
    eventTypes: { titulo: 'Qué eventos escuchar' },
    events: { titulo: 'Qué eventos escuchar' },
    condition: { titulo: 'Condición' },
    cases: { titulo: 'Caminos' },
    ms: { titulo: 'Cuánto esperar', ayuda: 'En milisegundos: 1000 = 1 segundo · 60000 = 1 minuto · 3600000 = 1 hora.' },
    cronExpression: { titulo: 'Cuándo se repite', ayuda: 'Ejemplos: «0 9 * * 1» = cada lunes a las 9:00 · «*/15 * * * *» = cada 15 minutos · «0 7 * * *» = todos los días a las 7:00.' },
    timezone: { titulo: 'Zona horaria', avanzado: true },
    agentName: { titulo: 'Agente de Opttia' },
    continueOnError: { titulo: 'Seguir aunque un registro falle' },
    url: { titulo: 'Dirección del otro sistema' },
    method: { titulo: 'Tipo de llamada' },
    // --- avanzados ---
    mapping: { titulo: 'Ajuste de campos', avanzado: true, ayuda: 'Solo si un campo debe llenarse distinto. Formato técnico.' },
    headers: { titulo: 'Encabezados', avanzado: true },
    queryParams: { titulo: 'Parámetros de la dirección', avanzado: true },
    body: { titulo: 'Contenido a enviar', avanzado: true },
    params: { titulo: 'Parámetros', avanzado: true },
    inputJson: { titulo: 'Datos de entrada', avanzado: true },
    authMode: { titulo: 'Tipo de autenticación', avanzado: true },
    timeout: { titulo: 'Tiempo máximo de espera', avanzado: true },
    retries: { titulo: 'Reintentos', avanzado: true },
    batchSize: { titulo: 'Registros por tanda', avanzado: true },
    arrayPath: { titulo: 'Dónde está la lista', avanzado: true },
    fieldPath: { titulo: 'Campo', avanzado: true },
    keyField: { titulo: 'Campo clave', avanzado: true },
    expression: { titulo: 'Expresión', avanzado: true },
    collection: { titulo: 'Colección', avanzado: true },
    logToCollection: { titulo: 'Guardar registro en', avanzado: true },
    flowId: { titulo: 'Automatización a usar', avanzado: true },
    jobIdSource: { titulo: 'De dónde sale el trabajo', avanzado: true },
    orderIdSource: { titulo: 'De dónde sale el pedido', avanzado: true },
    transactionIdSource: { titulo: 'De dónde sale la transacción', avanzado: true },
    shopifyOrderId: { titulo: 'Pedido de Shopify', avanzado: true },
    wooOrderId: { titulo: 'Pedido de WooCommerce', avanzado: true },
    wooProductId: { titulo: 'Producto de WooCommerce', avanzado: true },
    variationId: { titulo: 'Variante', avanzado: true },
    inventoryItemId: { titulo: 'Ítem de inventario en Shopify', avanzado: true },
    modifiedAfter: { titulo: 'Solo cambios desde', avanzado: true },
    untilTimestamp: { titulo: 'Hasta', avanzado: true },
    universeSource: { titulo: 'De dónde salen los terceros', avanzado: true },
    skipEnrichTercero: { titulo: 'No completar datos del tercero', avanzado: true },
    persistLines: { titulo: 'Guardar cada renglón', avanzado: true },
    waitForCompletion: { titulo: 'Esperar a que termine', avanzado: true },
};

/** "orderIdSource" → "Order id source" si no está en el diccionario. */
function humanizar(nombre: string): string {
    const t = String(nombre || '').replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : nombre;
}

export function etiquetaCampo(nombre: string, schema: { title?: string }): string {
    return CAMPOS[nombre]?.titulo || sinJerga(schema?.title) || humanizar(nombre);
}

export function ayudaCampo(nombre: string, schema: { description?: string }): string | undefined {
    return CAMPOS[nombre]?.ayuda || sinJerga(schema?.description) || undefined;
}

/** Los técnicos (y todo objeto JSON) van plegados, salvo que sean obligatorios. */
export function esAvanzado(nombre: string, schema: { type?: any }, obligatorio: boolean): boolean {
    if (obligatorio) return false;
    return !!CAMPOS[nombre]?.avanzado || schema?.type === 'object';
}

const VALORES: Record<string, string> = {
    reference: 'Referencia', referencia: 'Referencia', sku: 'SKU', barcode: 'Código de barras', id: 'Identificador',
    ACTIVE: 'Publicado', DRAFT: 'Borrador', ARCHIVED: 'Archivado',
    incremental: 'Solo lo nuevo', historico: 'Todo el histórico', full: 'Todo',
    created: 'Creado', updated: 'Actualizado', deleted: 'Eliminado',
    fixed: 'Un tiempo fijo', until: 'Hasta una fecha',
};

/** Texto para mostrar una opción; el valor guardado no cambia. */
export function textoOpcion(valor: string): string {
    return VALORES[valor] || valor;
}

/** Valor de un ajuste tal como se muestra en la caja del paso (lo guardado no cambia). */
export function textoValorCampo(nombre: string, valor: any): string {
    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (nombre === 'cronExpression') return textoCron(String(valor));
    if (nombre === 'ms' && Number.isFinite(Number(valor))) return duracionCorta(Number(valor));
    return textoOpcion(String(valor));
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** "0 9 * * 1" → "Cada lunes a las 9:00". Si no es un patrón común, lo deja como está. */
export function textoCron(expr: string): string {
    const p = String(expr || '').trim().split(/\s+/);
    if (p.length !== 5) return expr;
    const [min, hora, dia, mes, sem] = p;
    const hm = (h: string, m: string) => `${Number(h)}:${String(Number(m)).padStart(2, '0')}`;
    const cada = /^\*\/(\d+)$/;
    if (cada.test(min) && hora === '*' && dia === '*' && mes === '*' && sem === '*') return `Cada ${min.match(cada)![1]} minutos`;
    if (min === '*' && hora === '*' && dia === '*' && mes === '*' && sem === '*') return 'Cada minuto';
    if (/^\d+$/.test(min) && hora === '*' && dia === '*' && mes === '*' && sem === '*') return 'Cada hora';
    if (/^\d+$/.test(min) && cada.test(hora) && dia === '*' && mes === '*' && sem === '*') return `Cada ${hora.match(cada)![1]} horas`;
    if (/^\d+$/.test(min) && /^\d+$/.test(hora) && mes === '*') {
        const a = `a las ${hm(hora, min)}`;
        if (dia === '*' && sem === '*') return `Todos los días ${a}`;
        if (dia === '*' && sem === '1-5') return `De lunes a viernes ${a}`;
        if (dia === '*' && /^\d$/.test(sem)) return `Cada ${DIAS[Number(sem)]} ${a}`;
        if (dia === '*' && /^\d(,\d)+$/.test(sem)) return `Los ${sem.split(',').map((d) => DIAS[Number(d)]).join(', ')} ${a}`;
        if (/^\d+$/.test(dia) && sem === '*') return `El día ${Number(dia)} de cada mes ${a}`;
    }
    return expr;
}

function duracionCorta(ms: number): string {
    if (ms < 1000) return `${ms} milisegundos`;
    const s = ms / 1000;
    if (s < 60) return `${+s.toFixed(1)} ${s === 1 ? 'segundo' : 'segundos'}`;
    const m = s / 60;
    if (m < 60) return `${+m.toFixed(1)} ${m === 1 ? 'minuto' : 'minutos'}`;
    const h = m / 60;
    return `${+h.toFixed(1)} ${h === 1 ? 'hora' : 'horas'}`;
}
