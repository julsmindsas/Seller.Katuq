import {
  esDireccionBasura,
  puntoComodin,
  resolverAreaEsperada,
} from './areas-geograficas.util';
import {
  coordenadasCoincidenConZona,
  validarResultadoGeocodificacion,
} from './geocoding-validador.util';

// Casos reales de ALMARA FELICIDAD (lectura 2026-10-06), ticket 1136.
const SAP_BUENO = { latitud: '6.18538', longitud: '-75.64874' };      // DAD-012592, Calle 39D Sur #67-51
const SAP_EN_BELEN = { latitud: '6.2381533', longitud: '-75.58380319999999' }; // DAD-014046 (el del ticket)
const SAP_EN_BELLO = { latitud: '6.336728799999999', longitud: '-75.55958869999999' }; // DAD-011824
const COMODIN = { latitud: '6.1861684', longitud: '-75.6415486' };   // 87 pedidos
const BELEN_URBANO = { latitud: '6.2355', longitud: '-75.5990' };     // Calle 28 #77-124, Belén
const CENTRO_MED = { latitud: '6.2518', longitud: '-75.5636' };       // Prado Centro
const BELLO_OK = { latitud: '6.3360', longitud: '-75.5560' };

describe('areas-geograficas: resolverAreaEsperada (D3)', () => {
  it('el barrio "SAN ANTONIO DE PRADO" resuelve al corregimiento aunque la ciudad sea Medellín', () => {
    const a = resolverAreaEsperada('SAN ANTONIO DE PRADO', '', 'Medellín');
    expect(a?.nombre).toBe('San Antonio de Prado');
    expect(a?.tipo).toBe('corregimiento');
  });

  it('la zona "Corregimiento San Antonio de Prado" resuelve al corregimiento con barrio vacío', () => {
    expect(resolverAreaEsperada('', 'Corregimiento San Antonio de Prado', 'Medellín')?.nombre)
      .toBe('San Antonio de Prado');
  });

  it('"Prado Centro" NO es San Antonio de Prado: resuelve al municipio Medellín', () => {
    const a = resolverAreaEsperada('Prado Centro', 'Medellin Parte baja', 'Medellín');
    expect(a?.nombre).toBe('Medellín');
    expect(a?.tipo).toBe('municipio');
  });

  it('ciudad fuera del Valle de Aburrá → sin área (solo comodín y aproximado)', () => {
    expect(resolverAreaEsperada('', 'NACIONAL', 'Bogotá D.C.')).toBeNull();
  });

  it('tolera tildes y mayúsculas en la ciudad', () => {
    expect(resolverAreaEsperada('', '', 'ITAGÜÍ')?.nombre).toBe('Itagüí');
    expect(resolverAreaEsperada('', '', 'la estrella')?.nombre).toBe('La Estrella');
  });
});

describe('validarResultadoGeocodificacion (D1, D2, D4)', () => {
  const ctxSAP = { barrio: 'SAN ANTONIO DE PRADO', zonaCobro: 'Corregimiento San Antonio de Prado', ciudad: 'Medellín' };

  it('el caso del ticket: San Antonio de Prado ubicado en Belén se rechaza por fuera de área', () => {
    const v = validarResultadoGeocodificacion(SAP_EN_BELEN, ctxSAP);
    expect(v.valido).toBeFalse();
    expect(v.motivo).toBe('FUERA_DE_AREA');
    expect(v.distanciaKm).toBeGreaterThan(8);
  });

  it('San Antonio de Prado ubicado en Bello (DAD-011824) se rechaza: es el centroide que Google da para Bello', () => {
    expect(validarResultadoGeocodificacion(SAP_EN_BELLO, ctxSAP).motivo).toBe('PUNTO_COMODIN');
  });

  it('un punto real dentro del corregimiento se acepta', () => {
    const v = validarResultadoGeocodificacion(SAP_BUENO, ctxSAP);
    expect(v.valido).toBeTrue();
    expect(v.areaEsperada?.nombre).toBe('San Antonio de Prado');
  });

  it('el punto comodín se rechaza para cualquier dirección, con o sin área', () => {
    expect(validarResultadoGeocodificacion(COMODIN, { ciudad: 'Bello' }).motivo).toBe('PUNTO_COMODIN');
    expect(validarResultadoGeocodificacion(COMODIN, {}).motivo).toBe('PUNTO_COMODIN');
    expect(puntoComodin(6.18618, -75.64156)).not.toBeNull(); // a pocos metros también
  });

  it('el centroide de Medellín (respaldo viejo) se rechaza', () => {
    expect(validarResultadoGeocodificacion({ latitud: 6.2442, longitud: -75.5812 }, { ciudad: 'Medellín' }).motivo)
      .toBe('PUNTO_COMODIN');
  });

  it('direcciones urbanas correctas se aceptan dentro de su municipio', () => {
    expect(validarResultadoGeocodificacion(BELEN_URBANO, { barrio: 'Belén', ciudad: 'Medellín' }).valido).toBeTrue();
    expect(validarResultadoGeocodificacion(CENTRO_MED, { barrio: 'Prado Centro', ciudad: 'Medellín' }).valido).toBeTrue();
    expect(validarResultadoGeocodificacion(BELLO_OK, { barrio: 'Niquía', ciudad: 'Bello' }).valido).toBeTrue();
  });

  it('una dirección de Bello ubicada en el sur de Medellín se rechaza (radio del municipio)', () => {
    expect(validarResultadoGeocodificacion(SAP_BUENO, { ciudad: 'Bello' }).motivo).toBe('FUERA_DE_AREA');
  });

  it('Google APPROXIMATE se rechaza aunque caiga dentro del área', () => {
    const v = validarResultadoGeocodificacion(
      { ...BELLO_OK, senales: { locationType: 'APPROXIMATE', types: ['locality', 'political'] } },
      { ciudad: 'Bello' },
    );
    expect(v.motivo).toBe('RESULTADO_APROXIMADO');
  });

  it('Google partial_match sin tipo de dirección exacta se rechaza; con street_address se acepta', () => {
    expect(validarResultadoGeocodificacion(
      { ...BELEN_URBANO, senales: { locationType: 'GEOMETRIC_CENTER', partialMatch: true, types: ['neighborhood'] } },
      { ciudad: 'Medellín' },
    ).motivo).toBe('RESULTADO_APROXIMADO');
    expect(validarResultadoGeocodificacion(
      { ...BELEN_URBANO, senales: { locationType: 'RANGE_INTERPOLATED', partialMatch: true, types: ['street_address'] } },
      { ciudad: 'Medellín' },
    ).valido).toBeTrue();
  });

  it('coordenadas vacías, cero o fuera de Colombia se rechazan', () => {
    expect(validarResultadoGeocodificacion({ latitud: '', longitud: '' }).motivo).toBe('COORDENADAS_INVALIDAS');
    expect(validarResultadoGeocodificacion({ latitud: 0, longitud: 0 }).motivo).toBe('COORDENADAS_INVALIDAS');
    expect(validarResultadoGeocodificacion({ latitud: 40.4, longitud: -3.7 }).motivo).toBe('COORDENADAS_INVALIDAS');
  });

  it('sin área conocida (ciudad fuera del Aburrá) acepta cualquier punto no comodín', () => {
    expect(validarResultadoGeocodificacion({ latitud: 4.65, longitud: -74.06 }, { ciudad: 'Bogotá D.C.' }).valido).toBeTrue();
  });
});

describe('esDireccionBasura (D6)', () => {
  it('detecta las direcciones que hoy están en geocoding_cache como basura', () => {
    expect(esDireccionBasura('Calle 00 #00-00')).toBeTrue();
    expect(esDireccionBasura('Calle 0 #0-0')).toBeTrue();
    expect(esDireccionBasura('N/A')).toBeTrue();
    expect(esDireccionBasura('Completa el formulario para ver la dirección')).toBeTrue();
    expect(esDireccionBasura('')).toBeTrue();
    expect(esDireccionBasura(null)).toBeTrue();
  });

  it('no marca direcciones reales', () => {
    expect(esDireccionBasura('Carrera 65B #52B Sur-54')).toBeFalse();
    expect(esDireccionBasura('Calle 10 #0-50')).toBeFalse(); // un cero entre números reales
    expect(esDireccionBasura('Manzana 36 Casa 26')).toBeFalse();
  });
});

describe('coordenadasCoincidenConZona (D7)', () => {
  it('zona de corregimiento con punto en Belén → no coincide', () => {
    const r = coordenadasCoincidenConZona(SAP_EN_BELEN.latitud, SAP_EN_BELEN.longitud, 'Corregimiento San Antonio de Prado', 'Medellín');
    expect(r.aplica).toBeTrue();
    expect(r.coincide).toBeFalse();
  });

  it('zona de corregimiento con punto correcto → coincide', () => {
    expect(coordenadasCoincidenConZona(SAP_BUENO.latitud, SAP_BUENO.longitud, 'Corregimiento San Antonio de Prado', 'Medellín').coincide).toBeTrue();
  });

  it('zona sin corregimiento (envío nacional o municipio) → no aplica', () => {
    expect(coordenadasCoincidenConZona(BELEN_URBANO.latitud, BELEN_URBANO.longitud, 'NACIONAL', 'Bogotá').aplica).toBeFalse();
    expect(coordenadasCoincidenConZona(BELEN_URBANO.latitud, BELEN_URBANO.longitud, 'Medellin Parte baja', 'Medellín').aplica).toBeFalse();
  });
});
