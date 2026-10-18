import { RUTAS_PUBLICAS_BASE, esRutaPublica, rutaSinQuery } from './rutas-publicas';

/** D-483: la tarjeta NPS y la encuesta pública no aparecen donde no hay sesión ni menú. */
describe('rutas-publicas', () => {
  it('compara por segmento completo: /c es pública pero /crm no', () => {
    expect(esRutaPublica('/c/abc123')).toBe(true);
    expect(esRutaPublica('/crm/satisfaccion')).toBe(false);
    expect(esRutaPublica('/cartera')).toBe(false);
    expect(esRutaPublica('/r')).toBe(true);
    expect(esRutaPublica('/rol')).toBe(false);
  });

  it('ignora query, fragmento y parámetros de matriz', () => {
    expect(rutaSinQuery('/pedidos/lista?cliente=123#x')).toBe('/pedidos/lista');
    expect(rutaSinQuery('/inventario;bodega=BOD-001')).toBe('/inventario');
    expect(esRutaPublica('/login?returnUrl=%2Fpedidos')).toBe(true);
    expect(esRutaPublica('/encuesta/tok123')).toBe(true);
  });

  it('la lista de novedades sigue siendo la misma', () => {
    expect([...RUTAS_PUBLICAS_BASE]).toEqual([
      '/login', '/authentication', '/registrarse', '/nuevo-registro',
      '/change-password', '/terms-conditions', '/privacy-policy',
      '/video-agent', '/live-audio',
    ]);
  });
});
