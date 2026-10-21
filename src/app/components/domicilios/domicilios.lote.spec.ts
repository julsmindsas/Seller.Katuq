import { ResultadoLote } from './domicilios.models';
import { agruparResultadosLote, csvDeFallidos, MAX_BYTES_ARCHIVO, resumirArchivo, validarArchivoElegido } from './domicilios.lote';
import { FilaLeida, leerArchivoDomicilios } from './domicilios.utils';

describe('domicilios.lote', () => {
  const recogida = { direccion: 'Carrera 7 # 40-10', ciudad: 'Bogotá' };
  const csv = [
    'id_externo;cliente;telefono;direccion;ciudad;valor_domicilio',
    'A-1;Ana;3101234567;Calle 1;Bogotá;7000',
    'A-2;Luis;3001112233;Calle 2;Cali;6500',
    'A-3;;;;;0',
    'A-4;Marta;3205556677;Calle 4;Medellín;8000'
  ].join('\n');

  it('resume el archivo en listos y con errores', () => {
    const r = resumirArchivo(leerArchivoDomicilios(csv, recogida));
    expect(r.listos.map(f => f.linea)).toEqual([2, 3, 5]);
    expect(r.conErrores.map(f => f.linea)).toEqual([4]);
    expect(r.texto).toBe('3 listos, 1 con error');
  });

  it('en plural y en singular', () => {
    const uno = resumirArchivo(leerArchivoDomicilios('cliente;telefono;direccion;ciudad;valor_domicilio\nAna;3101234567;Calle 1;Bogotá;7000', recogida));
    expect(uno.texto).toBe('1 listo, 0 con errores');
    const dos = resumirArchivo(leerArchivoDomicilios('cliente;telefono;direccion;ciudad;valor_domicilio\n;;;;0\n;;;;0', recogida));
    expect(dos.texto).toBe('0 listos, 2 con errores');
  });

  describe('agruparResultadosLote', () => {
    const enviadas: FilaLeida[] = resumirArchivo(leerArchivoDomicilios(csv, recogida)).listos;
    const resultados: ResultadoLote[] = [
      { indice: 0, success: true, domicilio: { numero: 'SOL-000001' } as any },
      { indice: 1, success: true, repetido: true, domicilio: { numero: 'SOL-000002' } as any },
      { indice: 2, success: false, codigo: 'DATOS_INVALIDOS', error: 'Falta la ciudad de entrega.', campo: 'entrega.ciudad' }
    ];

    it('separa creados, repetidos y fallidos con la línea del archivo', () => {
      const r = agruparResultadosLote(resultados, enviadas);
      expect(r.creados.map(i => [i.linea, i.numero])).toEqual([[2, 'SOL-000001']]);
      expect(r.repetidos.map(i => [i.linea, i.numero])).toEqual([[3, 'SOL-000002']]);
      expect(r.fallidos.map(i => [i.linea, i.motivo, i.campo])).toEqual([[5, 'Falta la ciudad de entrega.', 'entrega.ciudad']]);
      expect(r.texto).toBe('1 creado, 1 repetido, 1 falló');
    });

    it('una fila sin respuesta cuenta como fallida', () => {
      const r = agruparResultadosLote(resultados.slice(0, 1), enviadas);
      expect(r.creados.length).toBe(1);
      expect(r.fallidos.length).toBe(2);
      expect(r.fallidos[0].codigo).toBe('SIN_RESPUESTA');
      expect(r.fallidos[0].motivo).toContain('Mis domicilios');
    });

    it('sin lista de resultados todo falla, sin romper', () => {
      expect(agruparResultadosLote(undefined, enviadas).fallidos.length).toBe(3);
      expect(agruparResultadosLote(null, []).items).toEqual([]);
    });

    it('si el servidor no da la frase usa la del código', () => {
      const r = agruparResultadosLote([{ indice: 0, success: false, codigo: 'SIN_MENSAJEROS_HABILITADOS' }], enviadas.slice(0, 1));
      expect(r.fallidos[0].motivo).toContain('Transportadores');
    });

    it('los textos con solo creados no hablan de fallos', () => {
      const r = agruparResultadosLote(resultados.slice(0, 1), enviadas.slice(0, 1));
      expect(r.texto).toBe('1 creado');
    });
  });

  describe('csvDeFallidos', () => {
    it('baja las columnas de la plantilla más el motivo, con el separador protegido', () => {
      const enviadas = resumirArchivo(leerArchivoDomicilios(csv, recogida)).listos;
      const r = agruparResultadosLote([{ indice: 2, success: false, codigo: 'DATOS_INVALIDOS', error: 'Falta; algo.', campo: 'entrega.ciudad' }], enviadas);
      const lineas = csvDeFallidos(r.fallidos).replace(/^﻿/, '').trim().split('\r\n');
      expect(lineas[0]).toBe('id_externo;cliente;telefono;direccion;ciudad;barrio;indicaciones;valor_domicilio;valor_pedido;cobrar_al_entregar;descripcion;motivo_del_error');
      expect(lineas.length).toBe(4); // encabezado + 3 sin respuesta/fallo
      expect(lineas[3]).toContain('A-4;Marta;3205556677;Calle 4;Medellín');
      expect(lineas[3]).toContain('"Falta; algo."');
    });

    it('lo que se baja se puede volver a leer con la misma plantilla', () => {
      const enviadas = resumirArchivo(leerArchivoDomicilios(csv, recogida)).listos;
      const r = agruparResultadosLote([], enviadas);
      const releido = leerArchivoDomicilios(csvDeFallidos(r.fallidos), recogida);
      expect(releido.errores).toEqual([]);
      expect(releido.columnasIgnoradas).toEqual(['motivo_del_error']);
      expect(releido.filas.length).toBe(3);
      expect(releido.filas.every(f => f.errores.length === 0)).toBeTrue();
    });

    it('una celda que parece fórmula se neutraliza', () => {
      const enviadas = resumirArchivo(leerArchivoDomicilios('cliente;telefono;direccion;ciudad;valor_domicilio\n=SUMA(1);3101234567;Calle 1;Bogotá;7000', recogida)).listos;
      const r = agruparResultadosLote([], enviadas);
      expect(csvDeFallidos(r.fallidos)).toContain("'=SUMA(1)");
    });
  });

  describe('validarArchivoElegido', () => {
    it('acepta un .csv con contenido', () => {
      expect(validarArchivoElegido({ name: 'Pedidos.CSV', size: 1200, type: '' })).toBeNull();
      expect(validarArchivoElegido({ name: 'x', size: 10, type: 'text/csv' })).toBeNull();
    });

    it('rechaza otros formatos, vacíos y muy grandes', () => {
      expect(validarArchivoElegido({ name: 'pedidos.xlsx', size: 1200, type: 'application/vnd.ms-excel.sheet' })).toContain('.csv');
      expect(validarArchivoElegido({ name: 'a.csv', size: 0 })).toContain('vacío');
      expect(validarArchivoElegido({ name: 'a.csv', size: MAX_BYTES_ARCHIVO + 1 })).toContain('grande');
      expect(validarArchivoElegido(null)).toContain('No se pudo');
    });
  });
});
