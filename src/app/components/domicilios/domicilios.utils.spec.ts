import {
  celdaCsv, csvDeDomicilios, domicilioVacio, leerArchivoDomicilios, leerValor, limpiarTelefono, MAX_FILAS_POR_LOTE,
  parsearCsv, plantillaCsv, sePuedeCancelar, validarDomicilio, validarDomicilioPorCampo
} from './domicilios.utils';

describe('domicilios.utils', () => {
  const recogida = { nombre: 'Panadería Sol', direccion: 'Carrera 7 # 40-10', ciudad: 'Bogotá', telefono: '6015550000' };

  describe('leerValor', () => {
    it('entiende puntos y comas de miles y decimales', () => {
      expect(leerValor('7000')).toBe(7000);
      expect(leerValor('$ 7.000')).toBe(7000);
      expect(leerValor('7,000')).toBe(7000);
      expect(leerValor('1.234.567')).toBe(1234567);
      expect(leerValor('7000,50')).toBe(7001);
      expect(leerValor('1.234,56')).toBe(1235);
      expect(leerValor('1,234.56')).toBe(1235);
    });

    it('vacío, texto o negativo es cero', () => {
      expect(leerValor('')).toBe(0);
      expect(leerValor('gratis')).toBe(0);
      expect(leerValor(undefined)).toBe(0);
      expect(leerValor('-500')).toBe(0);
    });
  });

  it('limpia el teléfono y quita el 57 de un celular', () => {
    expect(limpiarTelefono('(310) 123-4567')).toBe('3101234567');
    expect(limpiarTelefono('+57 310 123 4567')).toBe('3101234567');
    expect(limpiarTelefono('573101234567')).toBe('3101234567');
    expect(limpiarTelefono(null)).toBe('');
  });

  describe('parsearCsv', () => {
    it('lee ; , y tabulador según el encabezado', () => {
      expect(parsearCsv('a;b;c\n1;2;3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
      expect(parsearCsv('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
      expect(parsearCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('respeta comillas, comillas dobles y saltos de línea dentro de comillas', () => {
      const t = 'a;b\n"hola; mundo";"dijo ""sí"""\n"dos\nlíneas";x';
      expect(parsearCsv(t)).toEqual([['a', 'b'], ['hola; mundo', 'dijo "sí"'], ['dos\nlíneas', 'x']]);
    });

    it('ignora el BOM, los finales de línea de Windows y las filas vacías', () => {
      expect(parsearCsv('﻿a;b\r\n1;2\r\n\r\n')).toEqual([['a', 'b'], ['1', '2']]);
    });
  });

  describe('validarDomicilio', () => {
    const bueno = () => {
      const d = domicilioVacio(recogida);
      d.entrega = { nombre: 'Ana', telefono: '3101234567', direccion: 'Calle 1 # 2-3', ciudad: 'Bogotá', barrio: '', indicaciones: '' };
      d.valorDomicilio = 7000;
      return d;
    };

    it('uno completo no tiene errores', () => {
      expect(validarDomicilio(bueno())).toEqual([]);
    });

    it('avisa cada cosa que falta', () => {
      const d = domicilioVacio();
      expect(validarDomicilio(d).length).toBe(7);
      const sinValor = bueno();
      sinValor.valorDomicilio = 0;
      expect(validarDomicilio(sinValor)).toEqual(['El valor del domicilio debe ser mayor a cero.']);
      const telMalo = bueno();
      telMalo.entrega.telefono = '123';
      expect(validarDomicilio(telMalo)).toEqual(['El teléfono de quien recibe no es válido.']);
    });
  });

  describe('leerArchivoDomicilios', () => {
    it('la plantilla descargada se lee sin errores con la recogida de la pantalla', () => {
      const r = leerArchivoDomicilios(plantillaCsv(), recogida);
      expect(r.errores).toEqual([]);
      expect(r.columnasIgnoradas).toEqual([]);
      expect(r.filas.length).toBe(1);
      expect(r.filas[0].errores).toEqual([]);
      const d = r.filas[0].domicilio;
      expect(d.idExterno).toBe('MP-1001');
      expect(d.entrega.nombre).toBe('Ana Gómez');
      expect(d.entrega.telefono).toBe('3101234567');
      expect(d.valorDomicilio).toBe(7000);
      expect(d.cobrarAlEntregar).toBe(52000);
      expect(d.recogida.direccion).toBe('Carrera 7 # 40-10');
    });

    it('acepta encabezados con otros nombres, tildes y mayúsculas', () => {
      const csv = 'Cliente;Celular;Dirección;Ciudad;Valor Domicilio\nLuis;3001112233;Av 1 # 2;Cali;$ 6.500';
      const r = leerArchivoDomicilios(csv, recogida);
      expect(r.filas[0].errores).toEqual([]);
      expect(r.filas[0].domicilio.valorDomicilio).toBe(6500);
      expect(r.filas[0].domicilio.entrega.ciudad).toBe('Cali');
    });

    it('las columnas de recogida del archivo mandan sobre las de la pantalla', () => {
      const csv = 'cliente;telefono;direccion;ciudad;valor_domicilio;recogida_direccion;recogida_ciudad\nLuis;3001112233;Av 1 # 2;Cali;6500;Calle 9 # 9-9;Cali';
      const d = leerArchivoDomicilios(csv, recogida).filas[0].domicilio;
      expect(d.recogida.direccion).toBe('Calle 9 # 9-9');
      expect(d.recogida.ciudad).toBe('Cali');
      expect(d.recogida.nombre).toBe('Panadería Sol');
    });

    it('marca los errores por fila con su número de línea y avisa de columnas desconocidas', () => {
      const csv = 'cliente;telefono;direccion;ciudad;valor_domicilio;color\nLuis;3001112233;Av 1 # 2;Cali;6500;rojo\n;;;;0;azul';
      const r = leerArchivoDomicilios(csv, recogida);
      expect(r.columnasIgnoradas).toEqual(['color']);
      expect(r.filas[0].linea).toBe(2);
      expect(r.filas[0].errores).toEqual([]);
      expect(r.filas[1].linea).toBe(3);
      expect(r.filas[1].errores.length).toBeGreaterThan(0);
    });

    it('rechaza un archivo sin datos, sin encabezados conocidos o demasiado largo', () => {
      expect(leerArchivoDomicilios('cliente;telefono', recogida).errores.length).toBe(1);
      expect(leerArchivoDomicilios('foo;bar\n1;2', recogida).errores[0]).toContain('plantilla');
      const filas = Array.from({ length: MAX_FILAS_POR_LOTE + 1 }, () => 'Ana;3101234567;Calle 1;Bogotá;7000').join('\n');
      const largo = leerArchivoDomicilios('cliente;telefono;direccion;ciudad;valor_domicilio\n' + filas, recogida);
      expect(largo.filas).toEqual([]);
      expect(largo.errores[0]).toContain('máximo');
    });
  });

  it('solo se cancela antes de que el mensajero recoja', () => {
    expect(sePuedeCancelar('pendiente')).toBeTrue();
    expect(sePuedeCancelar('asignado')).toBeTrue();
    expect(sePuedeCancelar('en_camino')).toBeFalse();
    expect(sePuedeCancelar('entregado')).toBeFalse();
    expect(sePuedeCancelar('cancelado')).toBeFalse();
  });

  it('el CSV de descarga neutraliza fórmulas y protege el separador', () => {
    const csv = csvDeDomicilios([{
      numero: 'DOM-1', idExterno: '=HYPERLINK("x")', estado: 'entregado', creado: '2026-10-20', cliente: 'Ana; Gómez',
      direccion: 'Calle 1', ciudad: 'Bogotá', valorDomicilio: 7000, mensajero: ''
    }]);
    const lineas = csv.replace(/^﻿/, '').trim().split('\r\n');
    expect(lineas[1]).toContain(`"'=HYPERLINK(""x"")"`);
    expect(lineas[1]).toContain('"Ana; Gómez"');
    expect(lineas[1]).toContain('Entregado');
  });

  describe('validarDomicilioPorCampo', () => {
    it('dice a qué campo de la API pertenece cada error, en el mismo orden que las frases', () => {
      const d = domicilioVacio();
      const porCampo = validarDomicilioPorCampo(d);
      expect(porCampo.map(e => e.campo)).toEqual([
        'entrega.nombre', 'entrega.telefono', 'entrega.direccion', 'entrega.ciudad', 'recogida.direccion', 'recogida.ciudad', 'valorDomicilio'
      ]);
      expect(porCampo.map(e => e.mensaje)).toEqual(validarDomicilio(d));
    });
  });

  it('celdaCsv protege el separador, las comillas, los saltos de línea y las fórmulas', () => {
    expect(celdaCsv('hola')).toBe('hola');
    expect(celdaCsv('a;b')).toBe('"a;b"');
    expect(celdaCsv('dijo "sí"')).toBe('"dijo ""sí"""');
    expect(celdaCsv('=1+1')).toBe("'=1+1");
    expect(celdaCsv(7000)).toBe('7000');
    expect(celdaCsv(null)).toBe('');
  });
});
