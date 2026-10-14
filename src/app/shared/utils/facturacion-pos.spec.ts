import {
  camposPedido,
  CONSUMIDOR_FINAL,
  facturacionInicial,
  faltantesFacturacion,
  faltantesPerfil,
  perfilAFacturacion,
  resumenFacturacion,
} from './facturacion-pos';

/** D-419 / ticket 1171: datos de facturación de la venta POS. */
describe('facturacion-pos', () => {
  const empresa = { alias: 'Empresa', nombres: 'Distribución y Logística SAS', tipoDocumento: 'NIT', documento: '900488793-1', correo: 'comercial@dylogica.com', ciudad: 'Medellín', predeterminado: true };
  const persona = { alias: 'Personal', nombres: 'Jairo Arango', tipoDocumento: 'CC', documento: '1020433874', correo: 'j@x.co', ciudad: 'Cali' };

  describe('facturacionInicial', () => {
    it('preselecciona el perfil predeterminado', () => {
      const f = facturacionInicial({ datosFacturacionElectronica: [persona, empresa] });
      expect(f.modo).toBe('perfil');
      expect(f.perfil).toBe(empresa);
    });

    it('sin perfil predeterminado (o sin perfiles) arranca en "No requiere factura"', () => {
      expect(facturacionInicial({ datosFacturacionElectronica: [persona] }).modo).toBe('ninguna');
      expect(facturacionInicial({}).modo).toBe('ninguna');
      expect(facturacionInicial(null).modo).toBe('ninguna');
    });
  });

  describe('faltantesPerfil', () => {
    it('un perfil completo no tiene faltantes', () => {
      expect(faltantesPerfil(empresa)).toEqual([]);
      expect(faltantesPerfil(persona)).toEqual([]);
    });

    it('acepta correoElectronico (forma del pedido) además de correo', () => {
      const { correo, ...sinCorreo } = persona;
      expect(faltantesPerfil({ ...sinCorreo, correoElectronico: 'j@x.co' })).toEqual([]);
    });

    it('detecta NIT mal formado, correo inválido y ciudad faltante', () => {
      const f = faltantesPerfil({ ...empresa, documento: '-4', correo: 'sin-arroba', ciudad: '' });
      expect(f).toContain('NIT válido (ej: 901072822-4)');
      expect(f).toContain('Correo electrónico válido');
      expect(f).toContain('Ciudad');
    });

    it('detecta razón social y tipo de documento faltantes', () => {
      const f = faltantesPerfil({ documento: '123456', correo: 'a@b.co', ciudad: 'Cali' });
      expect(f).toContain('Razón social o nombre completo');
      expect(f).toContain('Tipo de documento');
    });
  });

  it('faltantesFacturacion no valida Consumidor Final ni "No requiere factura"', () => {
    expect(faltantesFacturacion({ modo: 'consumidorFinal' })).toEqual([]);
    expect(faltantesFacturacion({ modo: 'ninguna' })).toEqual([]);
    expect(faltantesFacturacion({ modo: 'perfil', perfil: {} }).length).toBeGreaterThan(0);
  });

  describe('camposPedido', () => {
    it('perfil → facturacion con forma del pedido y generarFacturaElectronica', () => {
      const c = camposPedido({ modo: 'perfil', perfil: empresa });
      expect(c.generarFacturaElectronica).toBeTrue();
      expect(c.facturacion.correoElectronico).toBe('comercial@dylogica.com');
      expect(c.facturacion.documento).toBe('900488793-1');
      expect(c.facturacion.tipoDocumento).toBe('NIT');
    });

    it('Consumidor Final → datos fijos de la venta asistida', () => {
      const c = camposPedido({ modo: 'consumidorFinal' });
      expect(c.generarFacturaElectronica).toBeTrue();
      expect(c.facturacion.documento).toBe(CONSUMIDOR_FINAL.documento);
    });

    it('No requiere factura → sin facturacion', () => {
      const c = camposPedido({ modo: 'ninguna' });
      expect(c.generarFacturaElectronica).toBeFalse();
      expect(c.facturacion).toBeUndefined();
      expect(camposPedido(null).generarFacturaElectronica).toBeFalse();
    });
  });

  it('perfilAFacturacion completa país e indicativo', () => {
    const f = perfilAFacturacion(persona);
    expect(f.pais).toBe('Colombia');
    expect(f.indicativoCel).toBe('57');
  });

  it('resumenFacturacion', () => {
    expect(resumenFacturacion({ modo: 'perfil', perfil: empresa })).toBe('Empresa · 900488793-1');
    expect(resumenFacturacion({ modo: 'consumidorFinal' })).toBe('Consumidor Final');
    expect(resumenFacturacion({ modo: 'ninguna' })).toBe('No requiere factura');
  });
});
