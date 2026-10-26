import { pagoValido, pasosQueFaltan, textoPasos } from './domicilios.preparacion';

describe('Dejar todo listo (domicilios)', () => {
  it('no pide nada cuando todo está hecho', () => {
    expect(pasosQueFaltan({ domiciliosActivados: true, pagoDefinido: true, ofreceAIndependientes: true })).toEqual([]);
  });

  it('pide los tres pasos, en orden, cuando no hay nada', () => {
    expect(pasosQueFaltan({ domiciliosActivados: false, pagoDefinido: false, ofreceAIndependientes: false })).toEqual(['activar', 'pago', 'ofrecer']);
  });

  it('solo pide lo que falta', () => {
    expect(pasosQueFaltan({ domiciliosActivados: true, pagoDefinido: false, ofreceAIndependientes: false })).toEqual(['pago', 'ofrecer']);
    expect(pasosQueFaltan({ domiciliosActivados: false, pagoDefinido: true, ofreceAIndependientes: true })).toEqual(['activar']);
  });

  it('acepta un pago entero entre 1 y 500.000', () => {
    expect(pagoValido(5000)).toBeTrue();
    expect(pagoValido('5000')).toBeTrue();
    expect(pagoValido(500000)).toBeTrue();
  });

  it('rechaza un pago vacío, cero, negativo, con decimales o pasado del tope', () => {
    [null, undefined, '', 0, -1, 10.5, 500001, 'abc'].forEach(v => expect(pagoValido(v)).toBeFalse());
  });

  it('dice cada paso en una frase', () => {
    expect(textoPasos(['activar', 'ofrecer'])).toEqual(['Activar los domicilios', 'Mostrar tus domicilios a los mensajeros independientes']);
  });
});
