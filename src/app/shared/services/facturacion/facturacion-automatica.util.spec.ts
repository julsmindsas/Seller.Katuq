import { of, throwError } from 'rxjs';
import { evaluarProveedor, nombreProveedor, opcionesDeFactura, resolverProveedorCon } from './facturacion-automatica.util';

/** D-419 / ticket 1171: facturación automática compartida (venta asistida y POS). */
describe('facturacion-automatica.util', () => {
  const siigoActivo = { enabled: true, config: { username: 'api@x.co', enableAutoInvoicing: true, documentTypeId: 24, defaultPaymentTypeId: 5, sellerId: 9 } };

  describe('evaluarProveedor', () => {
    it('Siigo configurado con facturación automática', () => {
      const p = evaluarProveedor('siigo', siigoActivo);
      expect(p?.provider).toBe('siigo');
      expect(p?.nombre).toBe('Siigo');
      expect(p?.autoFacturacion).toBeTrue();
    });

    it('Siigo sin usuario no está configurado', () => {
      expect(evaluarProveedor('siigo', { enabled: true, config: {} })).toBeNull();
    });

    it('DIAN necesita NIT del emisor y ambiente', () => {
      expect(evaluarProveedor('dian', { enabled: true, config: { issuer: { nit: '900' }, environment: 'test' } })?.provider).toBe('dian');
      expect(evaluarProveedor('dian', { enabled: true, config: { issuer: {} } })).toBeNull();
    });

    it('un proveedor inactivo no cuenta', () => {
      expect(evaluarProveedor('siigo', { enabled: false, config: { username: 'x' } })).toBeNull();
    });
  });

  it('opcionesDeFactura toma solo los campos de la configuración', () => {
    expect(opcionesDeFactura(siigoActivo.config)).toEqual({ documentTypeId: 24, paymentTypeId: 5, sellerId: 9 });
    expect(opcionesDeFactura(null)).toEqual({});
  });

  it('nombreProveedor', () => {
    expect(nombreProveedor('world_office')).toBe('World Office');
    expect(nombreProveedor(null)).toBe('Sistema Contable');
  });

  describe('resolverProveedor', () => {
    it('devuelve el primero configurado en orden DIAN, Siigo, World Office', (done) => {
      const integraciones: any = {
        getIntegration: (p: string) => (p === 'dian' ? throwError(() => new Error('404')) : of(p === 'siigo' ? siigoActivo : {})),
      };
      resolverProveedorCon(integraciones.getIntegration).subscribe((p) => {
        expect(p?.provider).toBe('siigo');
        done();
      });
    });

    it('null si ninguno está configurado', (done) => {
      const integraciones: any = { getIntegration: () => of({ enabled: false }) };
      resolverProveedorCon(integraciones.getIntegration).subscribe((p) => {
        expect(p).toBeNull();
        done();
      });
    });
  });

});
