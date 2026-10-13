import { enlaceMaps, esPuntoValido, formatoCoordenadas, leerUbicacion, pareceEnlace } from './ubicacion-enlace.util';

/** Ticket 1203: fincas de Punto Verde Vidagas en Yumbo (Valle). */
describe('ubicacion-enlace.util', () => {
  describe('leerUbicacion', () => {
    it('lee coordenadas pegadas como texto', () => {
      expect(leerUbicacion('3.5841, -76.4925')).toEqual({ lat: 3.5841, lng: -76.4925 });
      expect(leerUbicacion(' 3.5841,-76.4925 ')).toEqual({ lat: 3.5841, lng: -76.4925 });
      expect(leerUbicacion('(3.5841, -76.4925)')).toEqual({ lat: 3.5841, lng: -76.4925 });
    });

    it('lee el punto buscado de un enlace con q=', () => {
      expect(leerUbicacion('https://maps.google.com/?q=3.5841,-76.4925')).toEqual({ lat: 3.5841, lng: -76.4925 });
    });

    it('lee query= de un enlace universal (también codificado)', () => {
      expect(leerUbicacion('https://www.google.com/maps/search/?api=1&query=3.5841%2C-76.4925')).toEqual({ lat: 3.5841, lng: -76.4925 });
    });

    it('lee ll= y destination=', () => {
      expect(leerUbicacion('https://maps.google.com/maps?ll=3.58,-76.49&z=15')).toEqual({ lat: 3.58, lng: -76.49 });
      expect(leerUbicacion('https://www.google.com/maps/dir/?api=1&destination=3.58,-76.49')).toEqual({ lat: 3.58, lng: -76.49 });
    });

    it('prefiere el punto del lugar (!3d!4d) sobre el centro de la vista (@)', () => {
      const enlace = 'https://www.google.com/maps/place/Finca/@3.60,-76.50,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d3.5841!4d-76.4925';
      expect(leerUbicacion(enlace)).toEqual({ lat: 3.5841, lng: -76.4925 });
    });

    it('usa @lat,lng si es lo único que trae el enlace', () => {
      expect(leerUbicacion('https://www.google.com/maps/@3.5841,-76.4925,15z')).toEqual({ lat: 3.5841, lng: -76.4925 });
    });

    it('devuelve null con un enlace corto sin coordenadas', () => {
      expect(leerUbicacion('https://maps.app.goo.gl/AbCdEf123')).toBeNull();
    });

    it('devuelve null con puntos inválidos o fuera de Colombia', () => {
      expect(leerUbicacion('0, 0')).toBeNull();
      expect(leerUbicacion('40.4168, -3.7038')).toBeNull(); // Madrid
      expect(leerUbicacion('calle 10 # 5-20')).toBeNull();
      expect(leerUbicacion('')).toBeNull();
      expect(leerUbicacion(null)).toBeNull();
    });
  });

  describe('esPuntoValido', () => {
    it('acepta números y textos dentro de Colombia', () => {
      expect(esPuntoValido(3.5841, -76.4925)).toBeTrue();
      expect(esPuntoValido('6.2442', '-75.5812')).toBeTrue();
      expect(esPuntoValido(12.5847, -81.7006)).toBeTrue(); // San Andrés
    });

    it('rechaza vacíos, 0,0 y puntos fuera del país', () => {
      expect(esPuntoValido('', '')).toBeFalse();
      expect(esPuntoValido(0, 0)).toBeFalse();
      expect(esPuntoValido(4.6, 76.1)).toBeFalse(); // longitud con el signo cambiado
    });
  });

  describe('enlaceMaps y formatoCoordenadas', () => {
    it('arma el enlace universal y el texto "lat, lng"', () => {
      expect(enlaceMaps(3.5841, -76.4925)).toBe('https://www.google.com/maps/search/?api=1&query=3.5841,-76.4925');
      expect(formatoCoordenadas('3.5841', '-76.4925')).toBe('3.5841, -76.4925');
    });

    it('devuelve vacío si el punto no es válido', () => {
      expect(enlaceMaps(0, 0)).toBe('');
      expect(formatoCoordenadas('', '')).toBe('');
    });
  });

  describe('pareceEnlace', () => {
    it('distingue enlaces de texto', () => {
      expect(pareceEnlace('https://maps.app.goo.gl/x')).toBeTrue();
      expect(pareceEnlace('maps.app.goo.gl/x')).toBeTrue();
      expect(pareceEnlace('3.58, -76.49')).toBeFalse();
    });
  });
});
