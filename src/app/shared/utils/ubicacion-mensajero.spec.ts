import { claveEmpresa, haceCuanto, marcaDeUbicacion, perteneceAEmpresa, ubicacionVigente, VIGENCIA_UBICACION_MS } from './ubicacion-mensajero';

/**
 * Ticket 1154 (ALMARA): datos reales de active_users del 2026-10-09 01:14 UTC.
 * Argenis (app nativa, en línea), Carlos Andrés (app Flutter, último punto 14:00 UTC del 8)
 * y un punto viejo de la app Ionic.
 */
const AHORA = Date.parse('2026-10-09T01:14:42.746Z');
const MIN = 60 * 1000;

describe('ubicacion-mensajero', () => {
  describe('marcaDeUbicacion', () => {
    it('prefiere lastUpdate (hora del servidor)', () => {
      expect(marcaDeUbicacion({ lastUpdate: 1791508473656, timestamp: '2020-01-01T00:00:00Z' })).toBe(1791508473656);
    });

    it('usa el timestamp del celular si no hay lastUpdate', () => {
      expect(marcaDeUbicacion({ timestamp: '2026-10-09T01:14:33.229919Z' })).toBe(Date.parse('2026-10-09T01:14:33.229Z'));
    });

    it('devuelve null si no hay nada utilizable', () => {
      expect(marcaDeUbicacion({})).toBeNull();
      expect(marcaDeUbicacion({ timestamp: 'no es fecha' })).toBeNull();
      expect(marcaDeUbicacion(null)).toBeNull();
    });
  });

  describe('ubicacionVigente', () => {
    it('muestra a quien se actualizó hace menos de 15 minutos', () => {
      expect(ubicacionVigente({ lastUpdate: 1791508473656, conectado: true }, AHORA)).toBe(true);
      expect(ubicacionVigente({ lastUpdate: AHORA - 14 * MIN }, AHORA)).toBe(true);
    });

    it('esconde el punto de Carlos Andrés, que lleva 11 horas sin enviar', () => {
      expect(ubicacionVigente({ lastUpdate: 1791468043758 }, AHORA)).toBe(false);
    });

    it('esconde lo que lleva más de 15 minutos, aunque sea de hoy', () => {
      expect(ubicacionVigente({ lastUpdate: AHORA - VIGENCIA_UBICACION_MS - 1 }, AHORA)).toBe(false);
    });

    it('esconde a quien figura desconectado aunque el último punto sea reciente', () => {
      expect(ubicacionVigente({ lastUpdate: AHORA - MIN, conectado: false }, AHORA)).toBe(false);
    });

    it('las apps que no mandan conectado siguen valiendo por la hora', () => {
      expect(ubicacionVigente({ lastUpdate: AHORA - MIN }, AHORA)).toBe(true);
    });

    it('esconde lo que no trae hora', () => {
      expect(ubicacionVigente({}, AHORA)).toBe(false);
      expect(ubicacionVigente(undefined, AHORA)).toBe(false);
    });
  });

  // Ticket 1159: claves reales de active_users (2026-10-09).
  describe('perteneceAEmpresa', () => {
    it('reconoce la clave de la empresa como el final de la clave del mensajero', () => {
      expect(perteneceAEmpresa('argenis_alexander_echenique_cardona_almara_felicidad', 'ALMARA FELICIDAD')).toBe(true);
      expect(perteneceAEmpresa('jairo_alberto_arango_g_mez_almara_felicidad', 'ALMARA FELICIDAD')).toBe(true);
    });

    it('no deja pasar a otra empresa aunque una parte del nombre esté contenida en la de la empresa', () => {
      // La "a" suelta de "garc_a" y la "s" de "andr_s" hacían pasar a estos mensajeros en cualquier mapa.
      expect(perteneceAEmpresa('stiven_andr_s_garc_a_rodr_guez_almara_felicidad', 'LA TARTALERIA')).toBe(false);
      expect(perteneceAEmpresa('jairo_alberto_arango_g_mez_la_tartaleria', 'ALMARA FELICIDAD')).toBe(false);
      expect(perteneceAEmpresa('pablo_moreno_tienda_demo_kai_import', 'ALMARA FELICIDAD')).toBe(false);
    });

    it('exige el nombre completo de la empresa, no solo su última palabra', () => {
      expect(perteneceAEmpresa('ana_perez_super_felicidad', 'ALMARA FELICIDAD')).toBe(false);
    });

    it('las vocales con tilde del nombre de la empresa pasan a guion bajo, como las apps', () => {
      expect(claveEmpresa('CAFÉ ESCOBAR')).toBe('caf_escobar');
      expect(perteneceAEmpresa('juan_perez_caf__escobar', 'CAFÉ ESCOBAR')).toBe(true);
    });

    it('sin empresa o sin clave no pertenece a nadie', () => {
      expect(perteneceAEmpresa('juan_perez_almara_felicidad', '')).toBe(false);
      expect(perteneceAEmpresa('', 'ALMARA FELICIDAD')).toBe(false);
      expect(perteneceAEmpresa('almara_felicidad', 'ALMARA FELICIDAD')).toBe(false); // sin nombre de mensajero
    });
  });

  describe('haceCuanto', () => {
    it('dice cuánto hace', () => {
      expect(haceCuanto(AHORA - 20 * 1000, AHORA)).toBe('hace unos segundos');
      expect(haceCuanto(AHORA - 7 * MIN, AHORA)).toBe('hace 7 min');
      expect(haceCuanto(AHORA - 65 * MIN, AHORA)).toBe('hace 1 h 5 min');
      expect(haceCuanto(AHORA - 120 * MIN, AHORA)).toBe('hace 2 h');
    });

    it('no da negativos si el reloj de la pantalla va atrasado', () => {
      expect(haceCuanto(AHORA + 5 * MIN, AHORA)).toBe('hace unos segundos');
    });
  });
});
