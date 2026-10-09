import { DireccionEstructuradaComponent } from './direccion-estructurada.component';
import { MUNICIPIOS_COLOMBIA } from '../../../../shared/data/colombia-dane-codes';

/**
 * Ticket 1157 (ALMARA): al tomar un pedido para Bogotá y elegir Cundinamarca, Bogotá no aparecía como
 * municipio. En el catálogo DANE Bogotá es su propio departamento ("Bogotá D.C."). Ahora se ofrece
 * dentro de Cundinamarca y, al elegirla, el departamento pasa a "Bogotá D.C.".
 *
 * Se prueba sin TestBed: solo se necesitan el catálogo ya cargado y el formulario.
 */
function crearComponente(departamento: string, catalogo?: any[]): any {
  const componente: any = Object.create(DireccionEstructuradaComponent.prototype);
  componente.datosColombiaCompletos = catalogo ?? [
    { departamento: 'Antioquia', ciudades: ['Medellín', 'Envigado'] },
    { departamento: 'Bogotá D.C.', ciudades: ['Bogotá D.C.'] },
    { departamento: 'Cundinamarca', ciudades: ['Agua de Dios', 'Bojacá', 'Soacha'] },
  ];
  componente.departamentoSeleccionado = departamento;
  componente.municipioSeleccionado = '';
  componente.sugerenciasCiudad = [];
  componente.municipios = [];
  componente.ciudadFormulario = "";
  componente.direccionForm = { get: () => ({ value: componente.ciudadFormulario, setValue: (v: string) => (componente.ciudadFormulario = v) }) };
  return componente;
}

describe('DireccionEstructuradaComponent — Bogotá dentro de Cundinamarca (ticket 1157)', () => {
  it('Cundinamarca ofrece Bogotá D.C. de primera y conserva sus municipios', () => {
    const lista = crearComponente('Cundinamarca').getMunicipiosDepartamento();

    expect(lista).toEqual(['Bogotá D.C.', 'Agua de Dios', 'Bojacá', 'Soacha']);
  });

  it('los demás departamentos no cambian', () => {
    expect(crearComponente('Antioquia').getMunicipiosDepartamento()).toEqual(['Medellín', 'Envigado']);
  });

  it('el departamento Bogotá D.C. sigue teniendo solo a Bogotá D.C.', () => {
    expect(crearComponente('Bogotá D.C.').getMunicipiosDepartamento()).toEqual(['Bogotá D.C.']);
  });

  it('sin departamento no hay municipios', () => {
    expect(crearComponente('').getMunicipiosDepartamento()).toEqual([]);
  });

  it('si el catálogo aún no trae Bogotá, Cundinamarca queda con su lista de siempre', () => {
    const componente = crearComponente('Cundinamarca', [{ departamento: 'Cundinamarca', ciudades: ['Agua de Dios', 'Soacha'] }]);

    expect(componente.getMunicipiosDepartamento()).toEqual(['Agua de Dios', 'Soacha']);
  });

  it('la plantilla pide la lista en cada ciclo: devuelve el mismo arreglo mientras nada cambie', () => {
    const componente = crearComponente('Cundinamarca');

    expect(componente.getMunicipiosDepartamento()).toBe(componente.getMunicipiosDepartamento());
  });

  it('elegir Bogotá estando en Cundinamarca pasa el departamento a Bogotá D.C. y conserva el municipio', () => {
    const componente = crearComponente('Cundinamarca');

    componente.onMunicipioChange('Bogotá D.C.');

    expect(componente.ciudadFormulario).toBe('Bogotá D.C.'); // la ciudad del formulario no se pierde
    expect(componente.departamentoSeleccionado).toBe('Bogotá D.C.');
    expect(componente.municipioSeleccionado).toBe('Bogotá D.C.');
    expect(componente.ciudadSeleccionada).toBe('Bogotá D.C.');
    expect(componente.getMunicipiosDepartamento()).toEqual(['Bogotá D.C.']);
  });

  it('con el catálogo DANE real: Bogotá D.C. es su propio departamento y no está entre los municipios de Cundinamarca', () => {
    // Los nombres exactos importan: el cambio busca "Cundinamarca" y "Bogotá D.C." tal como los trae el DANE.
    const porDepartamento = new Map<string, string[]>();
    MUNICIPIOS_COLOMBIA.forEach((m) => porDepartamento.set(m.departamento, [...(porDepartamento.get(m.departamento) || []), m.nombre]));
    const catalogo = Array.from(porDepartamento.entries())
      .map(([departamento, ciudades]) => ({ departamento, ciudades: ciudades.sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => a.departamento.localeCompare(b.departamento));

    expect(porDepartamento.get('Bogotá D.C.')).toEqual(['Bogotá D.C.']);
    expect(porDepartamento.get('Cundinamarca')).not.toContain('Bogotá D.C.');

    const lista = crearComponente('Cundinamarca', catalogo).getMunicipiosDepartamento();
    expect(lista[0]).toBe('Bogotá D.C.');
    expect(lista.length).toBe((porDepartamento.get('Cundinamarca') as string[]).length + 1);
  });

  it('si se reasigna el catálogo, la lista de Cundinamarca se arma de nuevo', () => {
    const componente = crearComponente('Cundinamarca');
    expect(componente.getMunicipiosDepartamento()).toContain('Soacha');

    componente.datosColombiaCompletos = [
      { departamento: 'Bogotá D.C.', ciudades: ['Bogotá D.C.'] },
      { departamento: 'Cundinamarca', ciudades: ['Zipaquirá'] },
    ];

    expect(componente.getMunicipiosDepartamento()).toEqual(['Bogotá D.C.', 'Zipaquirá']);
  });

  it('con Cundinamarca elegida, la búsqueda directa también ofrece a Bogotá', () => {
    const componente = crearComponente('');
    componente.onDepartamentoChange('Cundinamarca');

    componente.validarCiudadEnTiempoReal({ target: { value: 'Bogot' } });

    expect(componente.municipios[0]).toBe('Bogotá D.C.');
    expect(componente.sugerenciasCiudad).toEqual(['Bogotá D.C.']);
  });

  it('elegir otro municipio de Cundinamarca no cambia el departamento', () => {
    const componente = crearComponente('Cundinamarca');

    componente.onMunicipioChange('Soacha');

    expect(componente.departamentoSeleccionado).toBe('Cundinamarca');
    expect(componente.municipioSeleccionado).toBe('Soacha');
  });
});
