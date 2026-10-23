import { asuntoDe, nombreDePantalla } from './opinar-modal.component';

/** D-483: "Opinar" arma el asunto con el texto y guarda la pantalla con su nombre del menú. */
describe('opinar-modal', () => {
  it('el asunto son las primeras palabras, sin cortar una a la mitad', () => {
    expect(asuntoDe('  La   factura no sale  ')).toBe('La factura no sale');
    const largo = 'Cuando intento facturar un pedido con varios productos la pantalla se queda cargando y no pasa nada';
    const asunto = asuntoDe(largo);
    expect(asunto.length).toBeLessThanOrEqual(70);
    expect(asunto.endsWith('…')).toBe(true);
    expect(largo.startsWith(asunto.slice(0, -1))).toBe(true);
  });

  it('el nombre de la pantalla es el del menú más específico', () => {
    const menu: any[] = [
      { title: 'CRM', children: [{ path: 'crm/list', title: 'Pipeline' }, { path: 'crm/satisfaccion', title: 'Satisfacción de clientes' }] },
      { title: 'Pedidos', path: 'pedidos', children: [{ path: 'pedidos/lista', title: 'Todos los pedidos' }] },
    ];
    // D-546: dentro de un grupo, la pantalla se nombra con su grupo.
    expect(nombreDePantalla('/crm/satisfaccion', menu)).toBe('CRM · Satisfacción de clientes');
    expect(nombreDePantalla('/pedidos/lista/123', menu)).toBe('Pedidos'); // un grupo de un solo hijo se dibuja como enlace directo con el nombre del grupo
    expect(nombreDePantalla('/otra', menu)).toBeNull();
  });

  it('un grupo de un solo hijo se nombra como se ve (enlace directo) y uno inline no antepone su nombre', () => {
    const menu: any[] = [
      { title: 'Producción', children: [{ path: 'produccion/dashboard', title: 'Órdenes de producción' }] },
      { title: 'Finanzas', display: 'inline', children: [{ path: 'cartera', title: 'Cartera' }, { path: 'tesoreria', title: 'Tesorería' }] },
      { title: 'Bodegas', children: [{ path: 'inventario/recepcion-mercancia', title: 'Ajustes' }, { path: 'inventario/traslados', title: 'Traslados' }] },
    ];
    expect(nombreDePantalla('/produccion/dashboard', menu)).toBe('Producción');
    expect(nombreDePantalla('/cartera', menu)).toBe('Cartera');
    expect(nombreDePantalla('/inventario/recepcion-mercancia', menu)).toBe('Bodegas · Ajustes');
  });
});
