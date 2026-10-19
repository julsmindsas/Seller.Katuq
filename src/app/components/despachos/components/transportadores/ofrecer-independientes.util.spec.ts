import {
  ayudaOfrecerIndependientes,
  CODIGO_PAGO_REQUERIDO,
  interpretarErrorOfrecer,
  textoComision,
  TEXTO_PAGO_REQUERIDO,
} from './ofrecer-independientes.util';

describe('ofrecer-independientes.util', () => {
  describe('textoComision', () => {
    it('dice el porcentaje que manda el servidor', () => {
      expect(textoComision(7)).toBe('Katuq te cobra una comisión de 7 % del valor del domicilio por cada entrega, con corte mensual.');
      expect(textoComision(10)).toContain('de 10 % del valor del domicilio');
    });

    it('usa coma decimal y máximo dos decimales', () => {
      expect(textoComision(7.5)).toContain('de 7,5 % del valor');
      expect(textoComision(6.256)).toContain('de 6,26 % del valor');
    });

    it('no inventa una cifra si el servidor no la manda', () => {
      const esperado = 'Katuq te cobra una comisión del valor del domicilio por cada entrega, con corte mensual.';
      expect(textoComision(undefined)).toBe(esperado);
      expect(textoComision(null)).toBe(esperado);
      expect(textoComision('7')).toBe(esperado);
      expect(textoComision(NaN)).toBe(esperado);
      expect(textoComision(-1)).toBe(esperado);
    });
  });

  describe('ayudaOfrecerIndependientes', () => {
    it('da las cuatro frases en orden, con la comisión en la tercera', () => {
      const ayuda = ayudaOfrecerIndependientes(7);
      expect(ayuda.length).toBe(4);
      expect(ayuda[0]).toContain('mensajeros independientes de tu misma ciudad');
      expect(ayuda[1]).toContain('Pago al mensajero por entrega');
      expect(ayuda[2]).toBe(textoComision(7));
      expect(ayuda[3]).toBe('Tú le pagas directamente al mensajero.');
    });
  });

  describe('interpretarErrorOfrecer', () => {
    it('400 PAGO_REQUERIDO: marca el caso y muestra el mensaje del servidor tal cual', () => {
      const error = interpretarErrorOfrecer({
        status: 400,
        error: { success: false, error: 'Define primero cuánto le pagas al mensajero por entrega.', code: 'PAGO_REQUERIDO' },
      });
      expect(CODIGO_PAGO_REQUERIDO).toBe('PAGO_REQUERIDO');
      expect(error.pagoRequerido).toBeTrue();
      expect(error.texto).toBe('Define primero cuánto le pagas al mensajero por entrega.');
    });

    it('PAGO_REQUERIDO sin mensaje usa el texto de respaldo', () => {
      const error = interpretarErrorOfrecer({ status: 400, error: { success: false, code: 'PAGO_REQUERIDO' } });
      expect(error.pagoRequerido).toBeTrue();
      expect(error.texto).toBe(TEXTO_PAGO_REQUERIDO);
    });

    it('otro 400 o el mismo código con otro estado no cuentan como pago requerido', () => {
      expect(interpretarErrorOfrecer({ status: 400, error: { error: 'Dato inválido', code: 'OTRO' } }).pagoRequerido).toBeFalse();
      expect(interpretarErrorOfrecer({ status: 500, error: { code: 'PAGO_REQUERIDO' } }).pagoRequerido).toBeFalse();
      expect(interpretarErrorOfrecer({ status: 400, error: { error: 'Dato inválido' } }).texto).toBe('Dato inválido');
    });

    it('403 dice que solo un administrador puede cambiarlo', () => {
      const error = interpretarErrorOfrecer({ status: 403, error: { success: false, error: 'Forbidden' } });
      expect(error.pagoRequerido).toBeFalse();
      expect(error.texto).toContain('Solo un administrador de la empresa');
    });

    it('sin conexión, con cuerpo que no es JSON o sin nada, da un texto genérico', () => {
      const generico = 'No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.';
      expect(interpretarErrorOfrecer({ status: 0 }).texto).toBe(generico);
      expect(interpretarErrorOfrecer({ status: 502, error: '<html>Bad gateway</html>' }).texto).toBe(generico);
      expect(interpretarErrorOfrecer(null).texto).toBe(generico);
      expect(interpretarErrorOfrecer(undefined).pagoRequerido).toBeFalse();
    });
  });
});
