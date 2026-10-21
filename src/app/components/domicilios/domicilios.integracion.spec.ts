import {
  ejemploCurl, EVENTOS_AVISO, EJEMPLO_VERIFICAR_FIRMA, esHostNoPublico, extraerSecreto, interpretarPruebaAviso, MAX_NOMBRE_LLAVE,
  normalizarConfiguracion, normalizarLlaves, puedeAdministrarIntegracion, validarNombreLlave, validarUrlAvisos
} from './domicilios.integracion';

describe('domicilios.integracion', () => {
  describe('validarUrlAvisos', () => {
    it('acepta una dirección https pública', () => {
      expect(validarUrlAvisos('https://miservicio.com/avisos')).toEqual({ valida: true, error: null, url: 'https://miservicio.com/avisos' });
      expect(validarUrlAvisos('  https://a.co:8443/x?y=1  ').url).toBe('https://a.co:8443/x?y=1');
    });

    it('vacío es válido: así se quita la dirección', () => {
      expect(validarUrlAvisos('')).toEqual({ valida: true, error: null, url: '' });
      expect(validarUrlAvisos(undefined).valida).toBeTrue();
      expect(validarUrlAvisos('   ').url).toBe('');
    });

    it('rechaza http y cualquier otro protocolo', () => {
      expect(validarUrlAvisos('http://miservicio.com').error).toContain('https://');
      expect(validarUrlAvisos('ftp://miservicio.com').error).toContain('https://');
      expect(validarUrlAvisos('javascript:alert(1)').valida).toBeFalse();
    });

    it('rechaza lo que no es una dirección', () => {
      expect(validarUrlAvisos('miservicio.com/avisos').valida).toBeFalse();
      expect(validarUrlAvisos('https://').valida).toBeFalse();
      expect(validarUrlAvisos('https://mi servicio.com').valida).toBeFalse();
    });

    it('rechaza usuario y contraseña dentro de la dirección', () => {
      expect(validarUrlAvisos('https://user:clave@miservicio.com').error).toContain('usuario');
    });

    it('rechaza direcciones de la red local', () => {
      expect(validarUrlAvisos('https://localhost/avisos').error).toContain('pública');
      expect(validarUrlAvisos('https://192.168.1.10/a').valida).toBeFalse();
      expect(validarUrlAvisos('https://10.0.0.5/a').valida).toBeFalse();
      expect(validarUrlAvisos('https://miservicio.local/a').valida).toBeFalse();
      expect(validarUrlAvisos('https://[::1]/a').valida).toBeFalse();
    });

    it('rechaza una dirección demasiado larga', () => {
      expect(validarUrlAvisos('https://a.com/' + 'x'.repeat(2100)).valida).toBeFalse();
    });

    it('distingue las IP privadas de las públicas', () => {
      expect(esHostNoPublico('172.16.0.1')).toBeTrue();
      expect(esHostNoPublico('172.31.255.1')).toBeTrue();
      expect(esHostNoPublico('172.32.0.1')).toBeFalse();
      expect(esHostNoPublico('127.0.0.1')).toBeTrue();
      expect(esHostNoPublico('169.254.1.1')).toBeTrue();
      expect(esHostNoPublico('8.8.8.8')).toBeFalse();
      expect(esHostNoPublico('miservicio.com')).toBeFalse();
    });
  });

  describe('validarNombreLlave', () => {
    it('pide un nombre y lo limpia', () => {
      expect(validarNombreLlave('  Mi tienda web ')).toEqual({ valido: true, error: null, nombre: 'Mi tienda web' });
      expect(validarNombreLlave('   ').valido).toBeFalse();
      expect(validarNombreLlave(null).valido).toBeFalse();
      expect(validarNombreLlave('x'.repeat(MAX_NOMBRE_LLAVE + 1)).error).toContain(String(MAX_NOMBRE_LLAVE));
    });
  });

  describe('normalizarConfiguracion', () => {
    it('lee el objeto suelto', () => {
      const c = normalizarConfiguracion({
        habilitado: true, webhookUrl: 'https://a.co/x', webhookSecretoDefinido: true,
        recogidaPorDefecto: { direccion: 'Calle 1', ciudad: 'Cali', raro: 5 }
      });
      expect(c).toEqual({ habilitado: true, webhookUrl: 'https://a.co/x', webhookSecretoDefinido: true, recogidaPorDefecto: { direccion: 'Calle 1', ciudad: 'Cali' } });
    });

    it('lee el objeto dentro de `configuracion`', () => {
      expect(normalizarConfiguracion({ success: true, configuracion: { habilitado: true } }).habilitado).toBeTrue();
    });

    it('con basura queda apagado y vacío', () => {
      expect(normalizarConfiguracion(null)).toEqual({ habilitado: false, webhookUrl: '', webhookSecretoDefinido: false, recogidaPorDefecto: {} });
      expect(normalizarConfiguracion({ habilitado: 'si', webhookUrl: 5 }).habilitado).toBeFalse();
    });
  });

  describe('normalizarLlaves', () => {
    it('lee la lista y solo se queda con los campos conocidos', () => {
      const llaves = normalizarLlaves({
        success: true,
        llaves: [
          { id: 'k1', prefijo: 'kdom_ab12', nombre: 'Web', creada: '2026-10-20T10:00:00.000Z', ultimoUso: null, secreto: 'kdom_COMPLETA_NO_DEBERIA_ESTAR', hash: 'x' },
          { prefijo: 'sin id' }
        ]
      });
      expect(llaves).toEqual([{ id: 'k1', prefijo: 'kdom_ab12', nombre: 'Web', creada: '2026-10-20T10:00:00.000Z', ultimoUso: null }]);
      expect(JSON.stringify(llaves)).not.toContain('COMPLETA');
    });

    it('acepta un arreglo directo y no se rompe con basura', () => {
      expect(normalizarLlaves([{ id: 'k2', prefijo: 'p', nombre: 'n', creada: 'c', ultimoUso: '2026-10-21' }])[0].ultimoUso).toBe('2026-10-21');
      expect(normalizarLlaves(undefined)).toEqual([]);
      expect(normalizarLlaves({ llaves: 'no' })).toEqual([]);
    });
  });

  describe('extraerSecreto', () => {
    it('lo encuentra con los nombres que puede traer', () => {
      expect(extraerSecreto({ success: true, secreto: 'kdom_abcdef123456' })).toBe('kdom_abcdef123456');
      expect(extraerSecreto({ llave: 'kdom_abcdef123456' })).toBe('kdom_abcdef123456');
      expect(extraerSecreto({ llaveCompleta: 'kdom_abcdef123456' })).toBe('kdom_abcdef123456');
      expect(extraerSecreto({ llave: { id: 'k', secreto: 'kdom_abcdef123456' } })).toBe('kdom_abcdef123456');
      expect(extraerSecreto({ webhookSecreto: 'whsec_abcdef123456' })).toBe('whsec_abcdef123456');
    });

    it('si no vino ninguno devuelve null', () => {
      expect(extraerSecreto({ success: true, llave: { id: 'k' } })).toBeNull();
      expect(extraerSecreto({ secreto: 'corto' })).toBeNull();
      expect(extraerSecreto(null)).toBeNull();
    });
  });

  describe('interpretarPruebaAviso', () => {
    it('una respuesta 2xx es buena y dice cómo respondió', () => {
      const p = interpretarPruebaAviso({ success: true, estado: 200, ms: 120 });
      expect(p.exitosa).toBeTrue();
      expect(p.texto).toBe('Tu dirección respondió bien (código 200) en 120 ms.');
    });

    it('un 500 de la dirección del comercio no es éxito aunque la prueba se haya enviado', () => {
      const p = interpretarPruebaAviso({ success: true, status: 500 });
      expect(p.exitosa).toBeFalse();
      expect(p.estadoHttp).toBe(500);
      expect(p.texto).toContain('código 500');
    });

    it('usa la frase del servidor cuando falla', () => {
      const p = interpretarPruebaAviso({ success: false, error: 'No pudimos conectar con tu dirección.' });
      expect(p.exitosa).toBeFalse();
      expect(p.texto).toBe('No pudimos conectar con tu dirección.');
    });

    it('lo explícito manda sobre lo demás y lo anidado se lee', () => {
      expect(interpretarPruebaAviso({ exito: false, status: 200 }).exitosa).toBeFalse();
      expect(interpretarPruebaAviso({ ok: true }).exitosa).toBeTrue();
      expect(interpretarPruebaAviso({ respuesta: { status: 204 } }).exitosa).toBeTrue();
      expect(interpretarPruebaAviso(null).exitosa).toBeFalse();
    });
  });

  describe('guía rápida', () => {
    it('lista los seis eventos y el ejemplo usa la llave de una variable', () => {
      expect(EVENTOS_AVISO.map(e => e.evento)).toEqual([
        'domicilio.asignado', 'domicilio.liberado', 'domicilio.recogido', 'domicilio.entregado', 'domicilio.no_entregado', 'domicilio.cancelado'
      ]);
      const curl = ejemploCurl('https://back.katuq.com');
      expect(curl).toContain('POST https://back.katuq.com/v1/domicilios');
      expect(curl).toContain('Bearer $KATUQ_LLAVE');
      expect(curl).not.toMatch(/kdom_[a-z0-9]{8,}/);
      expect(JSON.parse(curl.split("-d '")[1].replace(/'$/, '')).valorDomicilio).toBe(7000);
    });

    it('el ejemplo de firma usa HMAC SHA-256 de «timestamp.cuerpo»', () => {
      expect(EJEMPLO_VERIFICAR_FIRMA).toContain("createHmac('sha256', secreto)");
      expect(EJEMPLO_VERIFICAR_FIRMA).toContain('${timestamp}.${cuerpoCrudo}');
      expect(EJEMPLO_VERIFICAR_FIRMA).toContain('timingSafeEqual');
    });
  });

  describe('puedeAdministrarIntegracion', () => {
    it('es del administrador del comercio y de la familia Administrador', () => {
      expect(puedeAdministrarIntegracion({ rol: 'Administrador' })).toBeTrue();
      expect(puedeAdministrarIntegracion({ rol: 'administrador LT' })).toBeTrue();
      expect(puedeAdministrarIntegracion({ rol: 'Super Administrador' })).toBeTrue();
    });

    it('los demás roles no la ven', () => {
      expect(puedeAdministrarIntegracion({ rol: 'Vendedor' })).toBeFalse();
      expect(puedeAdministrarIntegracion({ rol: 'Despachador' })).toBeFalse();
      expect(puedeAdministrarIntegracion({})).toBeFalse();
      expect(puedeAdministrarIntegracion(null)).toBeFalse();
    });
  });
});
