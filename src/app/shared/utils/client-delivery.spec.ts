import {
  esEntregaCompleta,
  normalizarEntrega,
  normalizarFuente,
  puntoEsProtegido,
  textoDireccionRespaldo,
  tienePuntoValido,
} from './client-delivery';

/** D-415 / ticket 1203: entregas por ubicación (fincas sin nomenclatura en Yumbo). */
describe('client-delivery (entrega por ubicación)', () => {
  const finca = { ciudad: 'Yumbo', latitud: '3.5841', longitud: '-76.4925', coordenadas: '3.5841, -76.4925', fuenteUbicacion: 'manual' };

  describe('esEntregaCompleta', () => {
    it('acepta ciudad + dirección como antes', () => {
      expect(esEntregaCompleta({ ciudad: 'Cali', direccionEntrega: 'Calle 10 # 5-20' })).toBeTrue();
    });

    it('acepta ciudad + punto sin dirección', () => {
      expect(esEntregaCompleta(finca)).toBeTrue();
    });

    it('acepta el punto que solo viene en "coordenadas"', () => {
      expect(esEntregaCompleta({ ciudad: 'Yumbo', coordenadas: '3.5841, -76.4925' })).toBeTrue();
    });

    it('rechaza ciudad sin dirección ni punto, y punto sin ciudad', () => {
      expect(esEntregaCompleta({ ciudad: 'Yumbo' })).toBeFalse();
      expect(esEntregaCompleta({ latitud: '3.58', longitud: '-76.49' })).toBeFalse();
      expect(esEntregaCompleta({ ciudad: 'Yumbo', latitud: '0', longitud: '0' })).toBeFalse();
      expect(esEntregaCompleta(null)).toBeFalse();
    });
  });

  describe('fuente y protección del punto', () => {
    it('sin fuente se asume geocodificada (entregas anteriores)', () => {
      expect(normalizarFuente(undefined)).toBe('geocodificada');
      expect(normalizarFuente('otra')).toBe('geocodificada');
      expect(normalizarEntrega({ direccionEntrega: 'x' }).fuenteUbicacion).toBe('geocodificada');
    });

    it('conserva la fuente y el enlace al normalizar', () => {
      const n = normalizarEntrega({ ...finca, fuenteUbicacion: 'enlace', enlaceUbicacion: 'https://maps.google.com/?q=3.5841,-76.4925' });
      expect(n.fuenteUbicacion).toBe('enlace');
      expect(n.enlaceUbicacion).toBe('https://maps.google.com/?q=3.5841,-76.4925');
    });

    it('protege los puntos manuales, de enlace y de GPS, no los geocodificados', () => {
      expect(puntoEsProtegido(finca)).toBeTrue();
      expect(puntoEsProtegido({ ...finca, fuenteUbicacion: 'gps' })).toBeTrue();
      expect(puntoEsProtegido({ ...finca, fuenteUbicacion: 'geocodificada' })).toBeFalse();
      expect(puntoEsProtegido({ fuenteUbicacion: 'manual' })).toBeFalse(); // sin punto no hay nada que proteger
    });

    it('tienePuntoValido descarta puntos fuera de Colombia', () => {
      expect(tienePuntoValido(finca)).toBeTrue();
      expect(tienePuntoValido({ latitud: '40.41', longitud: '-3.70' })).toBeFalse();
    });
  });

  describe('textoDireccionRespaldo', () => {
    it('usa la referencia si la hay', () => {
      expect(textoDireccionRespaldo({ ...finca, referencias: 'Finca El Lago, vía Yumbo' })).toBe('Finca El Lago, vía Yumbo');
    });

    it('usa "Ubicación: lat, lng" sin referencia', () => {
      expect(textoDireccionRespaldo(finca)).toBe('Ubicación: 3.5841, -76.4925');
    });

    it('no usa las especificaciones internas (notas del equipo)', () => {
      expect(textoDireccionRespaldo({ ...finca, especificacionesInternas: 'cliente difícil' })).toBe('Ubicación: 3.5841, -76.4925');
    });

    it('devuelve vacío sin referencia ni punto', () => {
      expect(textoDireccionRespaldo({ ciudad: 'Yumbo' })).toBe('');
    });
  });
});
