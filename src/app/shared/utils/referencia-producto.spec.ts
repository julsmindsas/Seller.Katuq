import { limpiarReferencia, referenciaRechazada, referenciaTieneEspacios } from './referencia-producto';

describe('referencia-producto (ticket 1113)', () => {
  it('quita los espacios de los lados: el caso real "REAN06G "', () => {
    expect(limpiarReferencia('REAN06G ')).toBe('REAN06G');
    expect(limpiarReferencia('  ALM-2925')).toBe('ALM-2925');
    expect(limpiarReferencia(null)).toBe('');
  });

  it('detecta espacios en el medio, que SIIGO rechaza', () => {
    expect(referenciaTieneEspacios('RWD-06-03-NUCLEO E30')).toBeTrue();
    expect(referenciaTieneEspacios(' CAM-ALG-001 ')).toBeFalse();
  });

  it('rechaza una referencia nueva o cambiada con espacios', () => {
    expect(referenciaRechazada('CAM ALG 001')).toBeTrue();
    expect(referenciaRechazada('B4.00 1.60AR', 'B4.00 1.59AR')).toBeTrue();
  });

  it('deja editar un producto que ya tenía la referencia con espacios sin cambiarla', () => {
    expect(referenciaRechazada('B4.00 1.59AR', 'B4.00 1.59AR')).toBeFalse();
    expect(referenciaRechazada('B4.00 1.59AR ', 'B4.00 1.59AR')).toBeFalse();
  });
});
