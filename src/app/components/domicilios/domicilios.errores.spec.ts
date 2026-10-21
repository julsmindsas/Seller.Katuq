import { etiquetaDeCampo, interpretarErrorDomicilios, textoDeCodigo } from './domicilios.errores';

describe('domicilios.errores', () => {
  const http = (status: number, error?: unknown) => ({ status, error });

  it('SIN_MENSAJEROS_HABILITADOS explica qué hacer y lleva a Transportadores', () => {
    const e = interpretarErrorDomicilios(http(409, { success: false, codigo: 'SIN_MENSAJEROS_HABILITADOS', error: 'x' }));
    expect(e.codigo).toBe('SIN_MENSAJEROS_HABILITADOS');
    expect(e.accion).toBe('transportadores');
    expect(e.texto).toContain('Transportadores');
  });

  it('API_DESHABILITADA lleva a la pestaña Integración', () => {
    const e = interpretarErrorDomicilios(http(403, { codigo: 'API_DESHABILITADA' }));
    expect(e.accion).toBe('integracion');
    expect(e.texto).toContain('Integración');
  });

  it('DATOS_INVALIDOS usa la frase del servidor y marca el campo', () => {
    const e = interpretarErrorDomicilios(http(400, { codigo: 'DATOS_INVALIDOS', error: 'Falta la ciudad de entrega.', campo: 'entrega.ciudad' }));
    expect(e.texto).toBe('Falta la ciudad de entrega.');
    expect(e.campo).toBe('entrega.ciudad');
    expect(e.accion).toBe('campo');
  });

  it('DATOS_INVALIDOS sin campo no marca nada', () => {
    const e = interpretarErrorDomicilios(http(400, { codigo: 'DATOS_INVALIDOS' }));
    expect(e.accion).toBe('ninguna');
    expect(e.campo).toBeNull();
    expect(e.texto).toBe('Revisa los datos del domicilio.');
  });

  it('un campo que llega con otro código no se marca', () => {
    expect(interpretarErrorDomicilios(http(409, { codigo: 'NO_SE_PUEDE_CANCELAR', campo: 'x' })).campo).toBeNull();
  });

  it('traduce los demás códigos', () => {
    expect(interpretarErrorDomicilios(http(409, { codigo: 'NO_SE_PUEDE_CANCELAR' })).texto).toContain('ya no se puede cancelar');
    expect(interpretarErrorDomicilios(http(429, { codigo: 'DEMASIADAS_PETICIONES' })).texto).toContain('Espera');
    expect(interpretarErrorDomicilios(http(413, { codigo: 'CUERPO_MUY_GRANDE' })).texto).toContain('256 KB');
    expect(textoDeCodigo('LOTE_MUY_GRANDE')).toContain('50');
    expect(textoDeCodigo('NOPE')).toBeNull();
    expect(textoDeCodigo(null)).toBeNull();
  });

  it('sin código habla según el estado HTTP', () => {
    expect(interpretarErrorDomicilios(http(0)).texto).toContain('conexión');
    expect(interpretarErrorDomicilios(http(403, {})).texto).toContain('administrador');
    expect(interpretarErrorDomicilios(http(404)).texto).toContain('No encontramos');
    expect(interpretarErrorDomicilios(http(500, { error: 'boom interno' })).texto).toContain('nuestro lado');
    expect(interpretarErrorDomicilios(undefined).texto).toContain('No pudimos');
  });

  it('un 200 con success:false (falla armada por el servicio) usa la frase que trae', () => {
    expect(interpretarErrorDomicilios(http(200, { success: false, error: 'El servidor no devolvió el secreto.' })).texto)
      .toBe('El servidor no devolvió el secreto.');
    expect(interpretarErrorDomicilios(http(200, { success: false })).texto).toContain('No pudimos');
  });

  it('no se cuela el cuerpo del error en la frase', () => {
    const e = interpretarErrorDomicilios(http(500, { error: 'stack secreto', token: 'abc' }));
    expect(e.texto).not.toContain('secreto');
    expect(JSON.stringify(e)).not.toContain('abc');
  });

  it('nombra los campos en cristiano', () => {
    expect(etiquetaDeCampo('entrega.ciudad')).toBe('Ciudad de entrega');
    expect(etiquetaDeCampo('algo.raro')).toBe('');
    expect(etiquetaDeCampo(null)).toBe('');
  });
});
