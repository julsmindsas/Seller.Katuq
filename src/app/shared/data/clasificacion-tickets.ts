/**
 * Clasificación de tickets, espejo del menú de Katuq (Seller).
 *
 * COPIA de katuq_support/src/app/shared/data/clasificacion-tickets.ts: los dos repos
 * no comparten código. Si cambia una, se cambia la otra igual, o un ticket creado
 * desde Seller y uno creado desde Soporte quedan clasificados distinto.
 *
 * Ticket 1013: la categoría y la subcategoría deben "ir igual al menú" para que
 * el agente sepa de qué módulo habla el reporte sin leer la descripción.
 *
 * El mapeo es: categoría = sección del menú (los `headTitle1` de
 * `Seller.Katuq/src/app/shared/services/nav.service.ts`) y subcategoría = módulo
 * de primer nivel dentro de esa sección. Finanzas es la excepción: su único
 * módulo se llama igual que la sección, así que sus subcategorías son los hijos
 * (Facturación electrónica, Tesorería, Cartera, Contabilidad), que es como los
 * nombra el comercio.
 *
 * Queda fuera "Configuración Plataforma" (Campañas de registro y Prospectos son
 * de superadministrador, no de un comercio que reporta). "Otro" cierra la lista
 * para lo que no es de un módulo: acceso, lentitud, el Soporte mismo.
 *
 * Si el menú de Seller cambia, este archivo se actualiza a mano: los dos repos
 * no comparten código. Los valores guardados son texto libre en Firestore, así
 * que los tickets viejos ('funcionalidad katuq', 'general') se siguen leyendo
 * tal cual en el detalle; esta lista solo gobierna lo que se crea de ahora en
 * adelante.
 */

export interface OpcionClasificacion {
  valor: string;
  label: string;
}

export interface CategoriaTicket extends OpcionClasificacion {
  subcategorias: OpcionClasificacion[];
}

export const CATEGORIAS_TICKET: CategoriaTicket[] = [
  {
    valor: 'gestión comercial',
    label: 'Gestión Comercial',
    subcategorias: [
      { valor: 'clientes', label: 'Clientes' },
      { valor: 'ventas', label: 'Ventas' },
      { valor: 'cotizaciones', label: 'Cotizaciones' },
      { valor: 'mi página web', label: 'Mi página web' },
      { valor: 'dropshipping', label: 'Dropshipping' },
      { valor: 'crm', label: 'CRM' }
    ]
  },
  {
    valor: 'finanzas',
    label: 'Finanzas',
    subcategorias: [
      { valor: 'facturación electrónica', label: 'Facturación electrónica' },
      { valor: 'tesorería', label: 'Tesorería' },
      { valor: 'cartera (cxc)', label: 'Cartera (CxC)' },
      { valor: 'contabilidad', label: 'Contabilidad' }
    ]
  },
  {
    valor: 'operaciones',
    label: 'Operaciones',
    subcategorias: [
      { valor: 'pedidos', label: 'Pedidos' },
      { valor: 'producción', label: 'Producción' },
      { valor: 'agendamiento', label: 'Agendamiento' },
      { valor: 'logística', label: 'Logística' }
    ]
  },
  {
    valor: 'inventarios y productos',
    label: 'Inventarios y Productos',
    subcategorias: [
      { valor: 'productos', label: 'Productos' },
      { valor: 'inventarios', label: 'Inventarios' },
      { valor: 'compras', label: 'Compras' },
      { valor: 'lista de precios', label: 'Lista de precios' },
      { valor: 'picking y packing', label: 'Picking y packing' }
    ]
  },
  {
    valor: 'marketing',
    label: 'Marketing',
    subcategorias: [
      { valor: 'dashboard de marketing', label: 'Dashboard de Marketing' },
      { valor: 'campañas whatsapp', label: 'Campañas WhatsApp' },
      { valor: 'mensajes', label: 'Mensajes' }
    ]
  },
  {
    valor: 'inteligencia de negocios',
    label: 'Inteligencia de Negocios',
    subcategorias: [
      { valor: 'indicadores', label: 'Indicadores' },
      { valor: 'agent builder', label: 'Agent Builder' }
    ]
  },
  {
    valor: 'configuración',
    label: 'Configuración',
    subcategorias: [
      { valor: 'seguridad', label: 'Seguridad' },
      { valor: 'empresa', label: 'Empresa' },
      { valor: 'módulos variables', label: 'Módulos Variables' },
      { valor: 'configuración de inventarios y productos', label: 'Inventarios y productos' },
      { valor: 'configuración de producto', label: 'Producto' },
      { valor: 'configuración de logística', label: 'Logística' },
      { valor: 'pagos', label: 'Pagos' },
      { valor: 'integraciones', label: 'Integraciones' },
      { valor: 'notificaciones', label: 'Notificaciones' }
    ]
  },
  {
    valor: 'otro',
    label: 'Otro',
    subcategorias: [
      { valor: 'acceso y usuarios', label: 'Acceso y usuarios' },
      { valor: 'lentitud o caídas', label: 'Lentitud o caídas' },
      { valor: 'mesa de ayuda', label: 'Mesa de ayuda (Soporte)' },
      { valor: 'general', label: 'General' }
    ]
  }
];

/** Categoría con la que abre el formulario. */
export const CATEGORIA_POR_DEFECTO = CATEGORIAS_TICKET[0];

/** Subcategorías de una categoría; lista vacía si el valor no existe. */
export function subcategoriasDe(valorCategoria: string): OpcionClasificacion[] {
  return CATEGORIAS_TICKET.find(c => c.valor === valorCategoria)?.subcategorias ?? [];
}
