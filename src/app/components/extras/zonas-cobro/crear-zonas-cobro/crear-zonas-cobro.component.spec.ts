import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { CrearZonasCobroComponent } from './crear-zonas-cobro.component';

/**
 * Unit spec (spec 011, T-07) de la lógica del modal de zonas de cobro:
 * dedupe de la selección, quitar, puedeGuardar y el payload al backend.
 *
 * NOTA: el harness de karma del proyecto está documentado como inoperante
 * (CONTRACT.md 2026-07-24: `quill` no declarado, `@types/jasmine` sin instalar,
 * specs huérfanos). Este spec se deja escrito para cuando el harness se repare;
 * la verificación efectiva del flujo es el contract test backend (12/12) + el
 * e2e en navegador (T-08). Se construye el componente SIN `ngOnInit` para no
 * depender de servicios/localStorage.
 */
describe('CrearZonasCobroComponent (spec 011)', () => {
  let comp: CrearZonasCobroComponent;

  const maestroStub: any = {};
  const activeModalStub: any = { close: () => {}, dismiss: () => {} };
  const daneStub: any = {
    getTotalMunicipios: () => 1122,
    getDepartamentos: () => of([]),
    getMunicipiosPrincipales: () => of([]),
    getMunicipiosByDepartamento: () => of([]),
    getTodosLosMunicipios: () => of([]),
    addMunicipioFrecuente: () => {},
  };

  beforeEach(() => {
    comp = new CrearZonasCobroComponent(new FormBuilder(), maestroStub, activeModalStub, daneStub);
  });

  it('agregarCiudadEmpresa no duplica la misma ciudad', () => {
    comp.agregarCiudadEmpresa('Medellín');
    comp.agregarCiudadEmpresa('Medellín');
    expect(comp.municipiosSeleccionados.length).toBe(1);
  });

  it('agregarCiudadEmpresa ignora vacío o "Seleccione"', () => {
    comp.agregarCiudadEmpresa('');
    comp.agregarCiudadEmpresa('Seleccione');
    expect(comp.municipiosSeleccionados.length).toBe(0);
  });

  it('quitarMunicipio remueve de la selección', () => {
    comp.agregarCiudadEmpresa('Bello');
    expect(comp.municipiosSeleccionados.length).toBe(1);
    comp.quitarMunicipio(comp.municipiosSeleccionados[0]);
    expect(comp.municipiosSeleccionados.length).toBe(0);
  });

  it('totalSeleccionados incluye el municipio base en edición', () => {
    (comp as any).editando = true;
    (comp as any).municipioBase = { nombre: 'Cali', codigo: '76001', departamento: 'Valle' };
    expect(comp.totalSeleccionados()).toBe(1);
    comp.agregarCiudadEmpresa('Palmira');
    expect(comp.totalSeleccionados()).toBe(2);
  });

  it('puedeGuardar exige nombre + al menos un municipio', () => {
    expect(comp.puedeGuardar()).toBeFalse();
    comp.zonasCorbroForm.patchValue({ nombreZonaCobro: 'Zona 1', valorZonaCobro: 8000, impuestoZonaCobro: 19 });
    expect(comp.puedeGuardar()).toBeFalse(); // aún sin municipios
    comp.agregarCiudadEmpresa('Medellín');
    expect(comp.puedeGuardar()).toBeTrue();
  });

  it('municipiosPayload mapea nombre→ciudad y conserva código/departamento', () => {
    comp.agregarCiudadEmpresa('Envigado');
    const payload = (comp as any).municipiosPayload(comp.municipiosSeleccionados);
    expect(payload[0].ciudad).toBe('Envigado');
    expect(payload[0].codigoDane).toBe('');
    expect('departamento' in payload[0]).toBeTrue();
  });
});
