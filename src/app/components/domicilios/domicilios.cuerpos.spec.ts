import { cuerpoDomicilio, cuerpoLote, cuerpoRecogidaPorDefecto, MAX_DESCRIPCION, MAX_ID_EXTERNO } from './domicilios.cuerpos';
import { domicilioVacio } from './domicilios.utils';

describe('domicilios.cuerpos', () => {
  const completo = () => {
    const d = domicilioVacio({ nombre: 'Panadería Sol', direccion: 'Carrera 7 # 40-10', ciudad: 'Bogotá', telefono: '601 555 0000' });
    d.idExterno = ' MP-1001 ';
    d.entrega = { nombre: 'Ana Gómez', telefono: '+57 310 123 4567', direccion: 'Calle 10 # 5-20', ciudad: 'Bogotá', barrio: 'Chapinero', indicaciones: '' };
    d.valorDomicilio = 7000;
    d.valorPedido = 45000;
    d.cobrarAlEntregar = 52000;
    d.descripcion = '2 hamburguesas';
    return d;
  };

  it('manda lo que hay, con el teléfono limpio, y deja afuera lo opcional vacío', () => {
    expect(cuerpoDomicilio(completo())).toEqual({
      idExterno: 'MP-1001',
      recogida: { nombre: 'Panadería Sol', telefono: '6015550000', direccion: 'Carrera 7 # 40-10', ciudad: 'Bogotá' },
      entrega: { nombre: 'Ana Gómez', telefono: '3101234567', direccion: 'Calle 10 # 5-20', ciudad: 'Bogotá', barrio: 'Chapinero' },
      valorDomicilio: 7000,
      valorPedido: 45000,
      cobrarAlEntregar: 52000,
      descripcion: '2 hamburguesas'
    });
  });

  it('sin id externo no manda la llave (un vacío se tomaría como repetido)', () => {
    const d = completo();
    d.idExterno = '   ';
    expect('idExterno' in cuerpoDomicilio(d)).toBeFalse();
  });

  it('sin valor del pedido ni cobro no los manda, y sin descripción tampoco', () => {
    const d = completo();
    d.valorPedido = 0;
    d.cobrarAlEntregar = 0;
    d.descripcion = '';
    const c = cuerpoDomicilio(d);
    expect('valorPedido' in c).toBeFalse();
    expect('cobrarAlEntregar' in c).toBeFalse();
    expect('descripcion' in c).toBeFalse();
  });

  it('una recogida vacía va como objeto vacío para que el servidor use la del comercio', () => {
    const d = completo();
    d.recogida = { nombre: '', telefono: '', direccion: '', ciudad: '', barrio: '', indicaciones: '' };
    expect(cuerpoDomicilio(d)['recogida']).toEqual({});
  });

  it('respeta los máximos de la API', () => {
    const d = completo();
    d.idExterno = 'x'.repeat(MAX_ID_EXTERNO + 20);
    d.descripcion = 'y'.repeat(MAX_DESCRIPCION + 20);
    const c = cuerpoDomicilio(d);
    expect((c['idExterno'] as string).length).toBe(MAX_ID_EXTERNO);
    expect((c['descripcion'] as string).length).toBe(MAX_DESCRIPCION);
  });

  it('redondea los valores a pesos enteros', () => {
    const d = completo();
    d.valorDomicilio = 7000.6;
    expect(cuerpoDomicilio(d)['valorDomicilio']).toBe(7001);
  });

  it('el lote lleva todos los domicilios', () => {
    expect(cuerpoLote([completo(), completo()]).domicilios.length).toBe(2);
  });

  it('la recogida por defecto se guarda completa, con los vacíos incluidos', () => {
    expect(cuerpoRecogidaPorDefecto({ direccion: ' Calle 1 ', ciudad: 'Cali', telefono: '(602) 123-4567' })).toEqual({
      nombre: '', telefono: '6021234567', direccion: 'Calle 1', ciudad: 'Cali', barrio: '', indicaciones: ''
    });
  });
});
