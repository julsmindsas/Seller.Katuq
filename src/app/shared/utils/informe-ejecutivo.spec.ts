import { mensajeErrorInforme, periodoMesAnterior, validarPeriodo } from './informe-ejecutivo';

describe('informe ejecutivo', () => {
  describe('periodoMesAnterior', () => {
    it('da el mes anterior completo', () => {
      expect(periodoMesAnterior(new Date(2026, 9, 9))).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' });
    });

    it('en enero retrocede al diciembre del año anterior', () => {
      expect(periodoMesAnterior(new Date(2026, 0, 15))).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
    });

    it('respeta febrero de año bisiesto', () => {
      expect(periodoMesAnterior(new Date(2028, 2, 3))).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
    });
  });

  describe('validarPeriodo', () => {
    it('acepta un rango en orden, incluso de un solo día', () => {
      expect(validarPeriodo('2026-09-01', '2026-09-30')).toBeNull();
      expect(validarPeriodo('2026-09-10', '2026-09-10')).toBeNull();
    });

    it('rechaza fechas vacías o al revés', () => {
      expect(validarPeriodo('', '2026-09-30')).toBeTruthy();
      expect(validarPeriodo('2026-09-30', '2026-09-01')).toBeTruthy();
    });
  });

  describe('mensajeErrorInforme', () => {
    it('usa el mensaje del servidor cuando lo trae', () => {
      expect(mensajeErrorInforme(422, 'El informe no cuadra.')).toBe('El informe no cuadra.');
    });

    it('cae a un texto propio si el servidor no dijo nada', () => {
      expect(mensajeErrorInforme(500)).toContain('No se pudo armar el informe');
      expect(mensajeErrorInforme(404)).toContain('empresa');
    });
  });
});
