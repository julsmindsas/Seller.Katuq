import { of, throwError } from 'rxjs';
import { evaluarProveedor, nombreProveedor, opcionesDeFactura, resolverConServidor, resolverProveedorCon } from './facturacion-automatica.util';

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

  /** D-500 (FE-01), tarea 1.7: con la bandera, el servidor decide y nunca se prueba otro proveedor. */
  describe('resolverConServidor', () => {
    it('arma el mismo ProveedorContable de hoy con la configuración del proveedor resuelto', (done) => {
      const pedidas: string[] = [];
      const getIntegration = (p: string) => { pedidas.push(p); return of(siigoActivo); };
      resolverConServidor(of({ provider: 'siigo', source: 'choice', reason: null } as any), getIntegration).subscribe((r) => {
        expect(r.proveedor).toEqual(evaluarProveedor('siigo', siigoActivo));
        expect(r.motivo).toBeNull();
        expect(pedidas).toEqual(['siigo']);
        done();
      });
    });

    it('sin proveedor del servidor: null con su motivo y sin pedir ninguna integración', (done) => {
      const pedidas: string[] = [];
      const motivo = 'El proveedor elegido para facturar está desactivado o sin configurar. Revísalo en Integraciones.';
      resolverConServidor(of({ provider: null, source: 'choice', reason: { code: 'CHOSEN_PROVIDER_INACTIVE', message: motivo } } as any),
        (p: string) => { pedidas.push(p); return of(siigoActivo); }).subscribe((r) => {
        expect(r.proveedor).toBeNull();
        expect(r.motivo).toBe(motivo);
        expect(pedidas).toEqual([]);
        done();
      });
    });

    it('si la configuración del resuelto no se puede leer, null: no cae a otro proveedor', (done) => {
      resolverConServidor(of({ provider: 'dian', source: 'choice', reason: null } as any), () => throwError(() => new Error('404'))).subscribe((r) => {
        expect(r.proveedor).toBeNull();
        expect(r.motivo).toBeTruthy();
        done();
      });
    });

    it('si el servidor falla, null con motivo', (done) => {
      resolverConServidor(throwError(() => new Error('500')), () => of(siigoActivo)).subscribe((r) => {
        expect(r.proveedor).toBeNull();
        expect(r.motivo).toBeTruthy();
        done();
      });
    });
  });

});
