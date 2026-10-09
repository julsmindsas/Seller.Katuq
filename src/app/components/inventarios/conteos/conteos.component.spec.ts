import { ConteosComponent } from './conteos.component';

/**
 * Ticket 1162 (ALMACEN BOMBAS): "Toda la bodega" como criterio de conteo general, y un buscador para
 * encontrar un producto entre cientos de filas. Sin TestBed: solo se necesitan unos pocos campos.
 */
function crearConteos(): any {
  const componente: any = Object.create(ConteosComponent.prototype);
  componente.criterio = 'valor';
  componente.tamano = 25;
  componente.filtro = '';
  componente.criterios = [
    { valor: 'valor', label: 'Lo más valioso' },
    { valor: 'todo', label: 'Toda la bodega' },
  ];
  componente.sesion = {
    id: 'S1',
    lineas: [
      { productoId: 'a1', referencia: 'REF-100', nombre: 'BOMBA SUMERGIBLE 1HP', ubicacion: 'A-01-02', esperado: 3, contado: null },
      { productoId: 'b2', referencia: 'REF-200', nombre: 'TANQUE 500L', ubicacion: 'B-10-01', esperado: 1, contado: null },
      { productoId: 'c3', referencia: 'REF-300', nombre: null, ubicacion: null, esperado: 0, contado: null },
    ],
  };
  return componente;
}

describe('ConteosComponent — conteo general (ticket 1162)', () => {
  it('con un criterio parcial pide cuántos productos y el botón lo dice', () => {
    const componente = crearConteos();

    expect(componente.esConteoGeneral).toBe(false);
    expect(componente.textoBotonArmar).toBe('Armar conteo de 25 productos');
  });

  it('con "Toda la bodega" no hay cantidad que escoger y el botón habla de toda la bodega', () => {
    const componente = crearConteos();
    componente.criterio = 'todo';

    expect(componente.esConteoGeneral).toBe(true);
    expect(componente.textoBotonArmar).toBe('Armar conteo de toda la bodega');
  });

  it('sin texto en el buscador se ven todas las líneas', () => {
    const componente = crearConteos();

    expect(componente.lineasVisibles.length).toBe(3);
  });

  it('el buscador encuentra por nombre, referencia o ubicación, sin importar mayúsculas', () => {
    const componente = crearConteos();

    componente.filtro = 'sumergible';
    expect(componente.lineasVisibles.map((l: any) => l.productoId)).toEqual(['a1']);

    componente.filtro = 'ref-200';
    expect(componente.lineasVisibles.map((l: any) => l.productoId)).toEqual(['b2']);

    componente.filtro = 'b-10';
    expect(componente.lineasVisibles.map((l: any) => l.productoId)).toEqual(['b2']);
  });

  it('filtrar no cambia las líneas del conteo: lo contado en una fila oculta se conserva', () => {
    const componente = crearConteos();
    componente.sesion.lineas[0].contado = 7;

    componente.filtro = 'tanque';
    expect(componente.lineasVisibles.length).toBe(1);
    expect(componente.sesion.lineas.length).toBe(3);
    expect(componente.sesion.lineas[0].contado).toBe(7);
  });

  it('una línea sin nombre ni ubicación no rompe el buscador', () => {
    const componente = crearConteos();
    componente.filtro = 'ref-300';

    expect(componente.lineasVisibles.map((l: any) => l.productoId)).toEqual(['c3']);
  });

  it('el criterio "todo" figura entre las opciones con su etiqueta', () => {
    const componente = crearConteos();

    expect(componente.etiquetaCriterio('todo')).toBe('Toda la bodega');
  });
});
