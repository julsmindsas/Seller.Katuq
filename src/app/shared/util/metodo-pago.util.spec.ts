import {
  normalizeNombre,
  esActivo,
  parsePosicion,
  fusionarMetodosPorCanal,
  FormaPagoRaw,
} from './metodo-pago.util';

describe('metodo-pago.util', () => {
  describe('normalizeNombre', () => {
    it('trim + minúsculas + espacios colapsados', () => {
      expect(normalizeNombre('  Efectivo ')).toBe('efectivo');
      expect(normalizeNombre('Tarjeta   de  Crédito')).toBe('tarjeta de crédito');
      expect(normalizeNombre(undefined)).toBe('');
    });
  });

  describe('esActivo', () => {
    it('acepta boolean y string', () => {
      expect(esActivo(true)).toBe(true);
      expect(esActivo('true')).toBe(true);
      expect(esActivo('false')).toBe(false);
      expect(esActivo(undefined)).toBe(false);
    });
  });

  describe('parsePosicion', () => {
    it('number o string → number|null', () => {
      expect(parsePosicion(3)).toBe(3);
      expect(parsePosicion('5')).toBe(5);
      expect(parsePosicion('')).toBeNull();
      expect(parsePosicion(undefined)).toBeNull();
    });
  });

  describe('fusionarMetodosPorCanal', () => {
    const ecom: FormaPagoRaw[] = [
      { cd: 'e1', nombre: 'Efectivo', online: 'Offline', integracion: 'No', activo: true, posicion: 1 },
      { cd: 'e2', nombre: 'Wompi', online: 'Online', integracion: 'Si', activo: 'true', posicion: 2 },
    ];
    const pos: FormaPagoRaw[] = [
      { cd: 'p1', nombre: 'efectivo ', online: 'Offline', integracion: 'No', activo: true, posicion: 9 },
      { cd: 'p3', nombre: 'Datáfono', online: 'Offline', integracion: 'No', activo: false, posicion: 3 },
    ];

    it('fusiona por nombre normalizado: Efectivo queda en una sola fila con ambos canales', () => {
      const filas = fusionarMetodosPorCanal(ecom, pos);
      const efectivo = filas.find((f) => f.clave === 'efectivo')!;
      expect(efectivo).toBeTruthy();
      expect(efectivo.ecommerce.disponible).toBe(true);
      expect(efectivo.ecommerce.cd).toBe('e1');
      expect(efectivo.ecommerce.posicion).toBe(1);
      expect(efectivo.pos.disponible).toBe(true);
      expect(efectivo.pos.cd).toBe('p1');
      expect(efectivo.pos.posicion).toBe(9); // posición por canal independiente
    });

    it('método exclusivo de e-com queda con pos.existe=false', () => {
      const filas = fusionarMetodosPorCanal(ecom, pos);
      const wompi = filas.find((f) => f.clave === 'wompi')!;
      expect(wompi.ecommerce.existe).toBe(true);
      expect(wompi.integracion).toBe('Si');
      expect(wompi.pos.existe).toBe(false);
      expect(wompi.pos.disponible).toBe(false);
    });

    it('método inactivo: existe pero no disponible', () => {
      const filas = fusionarMetodosPorCanal(ecom, pos);
      const dat = filas.find((f) => f.clave === 'datáfono')!;
      expect(dat.pos.existe).toBe(true);
      expect(dat.pos.disponible).toBe(false);
    });

    it('total de filas = métodos distintos por nombre', () => {
      const filas = fusionarMetodosPorCanal(ecom, pos);
      // efectivo, wompi, datáfono
      expect(filas.length).toBe(3);
    });

    it('tolera null/undefined', () => {
      expect(fusionarMetodosPorCanal(null, undefined)).toEqual([]);
    });

    it('ignora métodos sin nombre', () => {
      const filas = fusionarMetodosPorCanal([{ cd: 'x', activo: true } as FormaPagoRaw], []);
      expect(filas.length).toBe(0);
    });
  });
});
