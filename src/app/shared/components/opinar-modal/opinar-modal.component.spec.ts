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
    expect(nombreDePantalla('/crm/satisfaccion', menu)).toBe('Satisfacción de clientes');
    expect(nombreDePantalla('/pedidos/lista/123', menu)).toBe('Todos los pedidos');
    expect(nombreDePantalla('/otra', menu)).toBeNull();
  });
});
