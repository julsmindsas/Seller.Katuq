import { Domicilio } from './domicilios.models';
import {
  construirFila, construirFilas, csvDelListado, diasDelRango, esFechaIso, fechaIsoLocal, filtrarFilas, formatearPesos, hayDomiciliosAbiertos,
  iconoEstadoDomicilio, lineaDeTiempo, lineasDePunto, MAX_DIAS_RANGO, nombreArchivoListado, parametrosListado,
  rangoPorDefecto, resumenMensajero, textoEstadoPaso, tonoEstadoDomicilio, validarRangoFechas
} from './domicilios.presentacion';

function domicilio(extra: Partial<Domicilio> = {}): Domicilio {
  return {
    id: 'dom_1', numero: 'SOL-000123', idExterno: 'MP-1001', estado: 'pendiente', creado: '2026-10-20T15:30:00.000Z',
    valorDomicilio: 7000, valorPedido: 45000, cobrarAlEntregar: 52000, descripcion: '2 hamburguesas',
    recogida: { direccion: 'Carrera 7 # 40-10', ciudad: 'Bogotá' },
    entrega: { nombre: 'Ana Gómez', telefono: '3101234567', direccion: 'Calle 10 # 5-20', ciudad: 'Bogotá', barrio: 'Chapinero' },
    mensajero: null, asignadoEn: null, recogidoEn: null, entregadoEn: null, canceladoEn: null, motivoCancelacion: null,
    ...extra
  };
}

describe('domicilios.presentacion', () => {
  describe('estados', () => {
    it('cada estado tiene su tono semántico y su ícono', () => {
      expect(tonoEstadoDomicilio('pendiente')).toBe('warn');
      expect(tonoEstadoDomicilio('asignado')).toBe('info');
      expect(tonoEstadoDomicilio('en_camino')).toBe('primario');
      expect(tonoEstadoDomicilio('entregado')).toBe('ok');
      expect(tonoEstadoDomicilio('no_entregado')).toBe('err');
      expect(tonoEstadoDomicilio('cancelado')).toBe('neutro');
      expect(tonoEstadoDomicilio('algo_nuevo')).toBe('neutro');
      expect(iconoEstadoDomicilio('entregado')).toBe('pi-check-circle');
      expect(iconoEstadoDomicilio('algo_nuevo')).toBe('pi-question-circle');
    });

    it('no repite el ícono entre estados', () => {
      const iconos = ['pendiente', 'asignado', 'en_camino', 'entregado', 'no_entregado', 'cancelado'].map(iconoEstadoDomicilio);
      expect(new Set(iconos).size).toBe(6);
    });
  });

  describe('mensajero', () => {
    it('arma el nombre, el vehículo y la placa', () => {
      const m = resumenMensajero({ nombre: 'Carlos', vehiculo: 'moto', placa: 'abc12d', independiente: true });
      expect(m).toEqual({ nombre: 'Carlos', detalle: 'Moto · ABC12D', independiente: true });
    });

    it('sin vehículo ni placa deja el detalle vacío; sin nombre no hay mensajero', () => {
      expect(resumenMensajero({ nombre: 'Luisa' })).toEqual({ nombre: 'Luisa', detalle: '', independiente: false });
      expect(resumenMensajero({ nombre: '  ' })).toBeNull();
      expect(resumenMensajero(null)).toBeNull();
      expect(resumenMensajero(undefined)).toBeNull();
    });
  });

  describe('lineaDeTiempo', () => {
    const claves = (d: Domicilio) => lineaDeTiempo(d).map(p => `${p.clave}:${p.estado}`);

    it('un pendiente espera mensajero', () => {
      expect(claves(domicilio())).toEqual(['creado:hecho', 'asignado:actual', 'recogido:pendiente', 'entregado:pendiente']);
      expect(lineaDeTiempo(domicilio())[1].nota).toContain('Esperando');
    });

    it('un pendiente que fue soltado ignora la hora de asignación vieja', () => {
      const d = domicilio({ asignadoEn: '2026-10-20T15:40:00.000Z' });
      expect(lineaDeTiempo(d)[1].fecha).toBeNull();
    });

    it('asignado: dice quién lo tomó y lo siguiente es recoger', () => {
      const d = domicilio({ estado: 'asignado', asignadoEn: '2026-10-20T15:40:00.000Z', mensajero: { nombre: 'Carlos', independiente: true } });
      expect(claves(d)).toEqual(['creado:hecho', 'asignado:hecho', 'recogido:actual', 'entregado:pendiente']);
      const paso = lineaDeTiempo(d)[1];
      expect(paso.nota).toContain('Carlos');
      expect(paso.nota).toContain('independiente');
      expect(paso.fecha).toEqual(new Date('2026-10-20T15:40:00.000Z'));
    });

    it('en camino y entregado avanzan los pasos', () => {
      expect(claves(domicilio({ estado: 'en_camino' }))).toEqual(['creado:hecho', 'asignado:hecho', 'recogido:hecho', 'entregado:actual']);
      const e = domicilio({ estado: 'entregado', entregadoEn: '2026-10-20T16:12:00.000Z' });
      expect(claves(e)).toEqual(['creado:hecho', 'asignado:hecho', 'recogido:hecho', 'entregado:hecho']);
      expect(lineaDeTiempo(e)[3].fecha).toEqual(new Date('2026-10-20T16:12:00.000Z'));
    });

    it('cancelado termina en un paso fallido con el motivo y no inventa pasos que no ocurrieron', () => {
      const d = domicilio({ estado: 'cancelado', canceladoEn: '2026-10-20T15:45:00.000Z', motivoCancelacion: 'El cliente canceló' });
      expect(claves(d)).toEqual(['creado:hecho', 'cancelado:fallo']);
      expect(lineaDeTiempo(d)[1].nota).toBe('El cliente canceló');
      const conAsignado = domicilio({ estado: 'cancelado', asignadoEn: '2026-10-20T15:40:00.000Z' });
      expect(claves(conAsignado)).toEqual(['creado:hecho', 'asignado:hecho', 'cancelado:fallo']);
    });

    it('no entregado muestra todo el camino y falla al final', () => {
      expect(claves(domicilio({ estado: 'no_entregado' }))).toEqual(['creado:hecho', 'asignado:hecho', 'recogido:hecho', 'no_entregado:fallo']);
    });

    it('un estado desconocido se trata como pendiente', () => {
      expect(claves(domicilio({ estado: 'otro' as any }))[1]).toBe('asignado:actual');
    });

    it('cada paso tiene un texto, para que no dependa del color', () => {
      expect(textoEstadoPaso('hecho')).toBe('Hecho');
      expect(textoEstadoPaso('actual')).toBe('En curso');
      expect(textoEstadoPaso('pendiente')).toBe('Pendiente');
      expect(textoEstadoPaso('fallo')).toBe('No se completó');
    });
  });

  describe('filas y búsqueda', () => {
    const lista = [
      domicilio({ id: 'a', numero: 'SOL-000001', creado: '2026-10-18T10:00:00.000Z', idExterno: 'MP-1' }),
      domicilio({ id: 'b', numero: 'SOL-000002', creado: '2026-10-20T10:00:00.000Z', idExterno: 'WEB-77', entrega: { nombre: 'Luis Pérez', ciudad: 'Cali' } }),
      domicilio({ id: 'c', numero: 'SOL-000003', creado: '2026-10-19T10:00:00.000Z', estado: 'entregado' })
    ];

    it('ordena del más reciente al más antiguo', () => {
      expect(construirFilas(lista).map(f => f.id)).toEqual(['b', 'c', 'a']);
    });

    it('ignora entradas vacías y listas ausentes', () => {
      expect(construirFilas(undefined)).toEqual([]);
      expect(construirFilas([null as any, { numero: 'x' } as any])).toEqual([]);
    });

    it('arma lo que se ve en la fila', () => {
      const f = construirFila(domicilio({ estado: 'asignado', mensajero: { nombre: 'Carlos', vehiculo: 'moto', placa: 'abc12d' } }));
      expect(f.estadoEtiqueta).toBe('Mensajero asignado');
      expect(f.estadoTono).toBe('info');
      expect(f.cliente).toBe('Ana Gómez');
      expect(f.direccion).toBe('Calle 10 # 5-20, Chapinero');
      expect(f.mensajero?.nombre).toBe('Carlos');
      expect(f.puedeCancelar).toBeTrue();
      expect(f.valorDomicilio).toBe(7000);
    });

    it('solo se puede cancelar antes de recoger', () => {
      expect(construirFila(domicilio({ estado: 'en_camino' })).puedeCancelar).toBeFalse();
      expect(construirFila(domicilio({ estado: 'entregado' })).puedeCancelar).toBeFalse();
    });

    it('busca por número, cliente e id externo sin importar tildes ni mayúsculas', () => {
      const filas = construirFilas(lista);
      expect(filtrarFilas(filas, 'sol-000002').map(f => f.id)).toEqual(['b']);
      expect(filtrarFilas(filas, 'PEREZ').map(f => f.id)).toEqual(['b']);
      expect(filtrarFilas(filas, 'gomez').map(f => f.id)).toEqual(['c', 'a']);
      expect(filtrarFilas(filas, 'web-77').map(f => f.id)).toEqual(['b']);
      expect(filtrarFilas(filas, '  ').length).toBe(3);
      expect(filtrarFilas(filas, 'no existe')).toEqual([]);
    });

    it('sabe si queda algo que puede cambiar solo', () => {
      expect(hayDomiciliosAbiertos(construirFilas(lista))).toBeTrue();
      expect(hayDomiciliosAbiertos(construirFilas([domicilio({ estado: 'entregado' }), domicilio({ id: 'z', estado: 'cancelado' })]))).toBeFalse();
    });
  });

  describe('rango de fechas', () => {
    it('por defecto son los últimos 7 días, contando hoy', () => {
      const r = rangoPorDefecto(new Date(2026, 9, 20));
      expect(r).toEqual({ desde: '2026-10-14', hasta: '2026-10-20' });
      expect(diasDelRango(r.desde, r.hasta)).toBe(7);
    });

    it('cruza el cambio de mes y de año', () => {
      expect(rangoPorDefecto(new Date(2026, 0, 3))).toEqual({ desde: '2025-12-28', hasta: '2026-01-03' });
    });

    it('usa la hora local para el día', () => {
      expect(fechaIsoLocal(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
    });

    it('reconoce solo días reales', () => {
      expect(esFechaIso('2026-02-28')).toBeTrue();
      expect(esFechaIso('2026-02-31')).toBeFalse();
      expect(esFechaIso('20/10/2026')).toBeFalse();
      expect(esFechaIso(null)).toBeFalse();
    });

    it('valida el rango y el máximo de 31 días', () => {
      expect(validarRangoFechas('2026-10-01', '2026-10-31')).toBeNull();
      expect(validarRangoFechas('2026-10-01', '2026-10-01')).toBeNull();
      expect(validarRangoFechas('', '2026-10-31')).toContain('inicio');
      expect(validarRangoFechas('2026-10-01', '')).toContain('final');
      expect(validarRangoFechas('2026-10-05', '2026-10-01')).toContain('posterior');
      expect(validarRangoFechas('2026-02-31', '2026-03-01')).toContain('no es válida');
      expect(diasDelRango('2026-10-01', '2026-10-31')).toBe(MAX_DIAS_RANGO);
      expect(validarRangoFechas('2026-10-01', '2026-11-01')).toContain('31');
    });

    it('arma la consulta con o sin estado', () => {
      expect(parametrosListado({ estado: '', desde: '2026-10-14', hasta: '2026-10-20' })).toBe('?desde=2026-10-14&hasta=2026-10-20&limite=100');
      expect(parametrosListado({ estado: 'en_camino', desde: '2026-10-14', hasta: '2026-10-20', limite: 50 }))
        .toBe('?estado=en_camino&desde=2026-10-14&hasta=2026-10-20&limite=50');
    });
  });

  describe('csv del listado', () => {
    it('baja las filas con el estado en palabras y el mensajero', () => {
      const filas = construirFilas([domicilio({ estado: 'asignado', mensajero: { nombre: 'Carlos', vehiculo: 'moto', placa: 'abc12d' } })]);
      const lineas = csvDelListado(filas).replace(/^﻿/, '').trim().split('\r\n');
      expect(lineas[0]).toBe('numero;id_externo;estado;creado;cliente;direccion;ciudad;valor_domicilio;mensajero');
      expect(lineas[1]).toContain('SOL-000123;MP-1001;Mensajero asignado;');
      expect(lineas[1]).toContain('Carlos (Moto · ABC12D)');
      expect(lineas[1]).toContain(';7000;');
    });

    it('nombra el archivo con el rango', () => {
      expect(nombreArchivoListado('2026-10-14', '2026-10-20')).toBe('domicilios_2026-10-14_2026-10-20.csv');
      expect(nombreArchivoListado('', '')).toBe('domicilios.csv');
    });
  });

  it('del detalle solo muestra los datos que existen', () => {
    expect(lineasDePunto({ nombre: ' Ana ', direccion: 'Calle 1', telefono: '', barrio: undefined })).toEqual([
      { etiqueta: 'Nombre', valor: 'Ana' },
      { etiqueta: 'Dirección', valor: 'Calle 1' }
    ]);
    expect(lineasDePunto(null)).toEqual([]);
  });

  it('muestra los pesos con puntos de miles', () => {
    const limpio = (t: string) => t.replace(/\s/g, ' ');
    expect(limpio(formatearPesos(7000))).toBe('$ 7.000');
    expect(limpio(formatearPesos(1234567.4))).toBe('$ 1.234.567');
    expect(limpio(formatearPesos(undefined))).toBe('$ 0');
    expect(limpio(formatearPesos('abc'))).toBe('$ 0');
  });
});
