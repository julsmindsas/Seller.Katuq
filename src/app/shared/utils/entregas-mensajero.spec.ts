import {
  claveDeMensajero, entregaAsignada, EntregaAsignada, entregasDeMensajero, esClaveIndependiente,
  etiquetaEstadoEntrega, nombreDeIndependiente, nombreDeTransportador
} from './entregas-mensajero';

describe('entregas-mensajero', () => {
  const pedido = (extra: any = {}) => ({
    nroPedido: 'DAD-014225',
    estadoProceso: 'Despachado',
    cliente: { nombres_completos: 'Ana Gómez' },
    envio: { direccionEntrega: 'Calle 1 # 2-3' },
    transportador: 'Juan Pérez',
    ...extra
  });

  describe('nombreDeTransportador', () => {
    it('acepta texto, objeto con nombre y objeto con nombres y apellidos', () => {
      expect(nombreDeTransportador('Juan Pérez')).toBe('Juan Pérez');
      expect(nombreDeTransportador({ nombre: 'Juan Pérez', placa: 'ABC123' })).toBe('Juan Pérez');
      expect(nombreDeTransportador({ nombres: 'Juan', apellidos: 'Pérez' })).toBe('Juan Pérez');
      expect(nombreDeTransportador(undefined)).toBe('');
    });

    it('quita el celular que el sistema viejo pegaba al nombre', () => {
      expect(nombreDeTransportador('Juan Pérez-3001234567')).toBe('Juan Pérez');
      expect(nombreDeTransportador('3001234567 - Juan Pérez')).toBe('Juan Pérez');
    });
  });

  describe('entregaAsignada', () => {
    it('toma los pedidos que siguen en manos del mensajero', () => {
      for (const estado of ['Empacado', 'ParaDespachar', 'EnDespacho', 'Despachado']) {
        expect(entregaAsignada(pedido({ estadoProceso: estado }))?.nroPedido).toBe('DAD-014225');
      }
    });

    it('descarta lo entregado, cancelado, sin mensajero o sin nada', () => {
      expect(entregaAsignada(pedido({ estadoProceso: 'Entregado' }))).toBeNull();
      expect(entregaAsignada(pedido({ estadoProceso: 'Cancelado' }))).toBeNull();
      expect(entregaAsignada(pedido({ transportador: '' }))).toBeNull();
      expect(entregaAsignada(pedido({ transportador: undefined }))).toBeNull();
      expect(entregaAsignada(null)).toBeNull();
    });

    it('guarda el id de la ficha y si lo tomó un independiente', () => {
      const e = entregaAsignada(pedido({
        transportadorId: 'AbC123', asignacionMensajero: { independiente: true }
      }))!;
      expect(e.transportadorId).toBe('AbC123');
      expect(e.independiente).toBeTrue();
      expect(e.cliente).toBe('Ana Gómez');
      expect(e.direccion).toBe('Calle 1 # 2-3');
    });
  });

  describe('entregasDeMensajero: de empresa', () => {
    const entregas: EntregaAsignada[] = [
      { nroPedido: 'A-1', cliente: 'x', direccion: '', estado: 'Despachado', transportador: 'Juan Pérez' },
      { nroPedido: 'A-2', cliente: 'x', direccion: '', estado: 'Empacado', transportador: 'Juan Pérez' },
      { nroPedido: 'A-3', cliente: 'x', direccion: '', estado: 'Despachado', transportador: 'Luis Díaz' },
      { nroPedido: 'A-4', cliente: 'x', direccion: '', estado: 'Despachado', transportador: 'Juan Pérez', independiente: true }
    ];

    it('arma la clave con la misma regla de la app (la tilde pasa a guion bajo)', () => {
      expect(claveDeMensajero('Juan Pérez', 'MI EMPRESA')).toBe('juan_p_rez_mi_empresa');
    });

    it('une por la clave completa y devuelve solo sus pedidos', () => {
      const lista = entregasDeMensajero('juan_p_rez_mi_empresa', 'MI EMPRESA', entregas);
      expect(lista.map(e => e.nroPedido)).toEqual(['A-1', 'A-2']);
    });

    it('un independiente con el mismo nombre no se cuenta como mensajero de la empresa', () => {
      const lista = entregasDeMensajero('juan_p_rez_mi_empresa', 'MI EMPRESA', entregas);
      expect(lista.some(e => e.nroPedido === 'A-4')).toBeFalse();
    });

    it('no confunde a otro mensajero de nombre parecido', () => {
      expect(entregasDeMensajero('juan_p_rez_otra_empresa', 'MI EMPRESA', entregas)).toEqual([]);
      expect(entregasDeMensajero('juan_mi_empresa', 'MI EMPRESA', entregas)).toEqual([]);
    });

    it('sin empresa o sin pedidos no devuelve nada', () => {
      expect(entregasDeMensajero('juan_p_rez_mi_empresa', '', entregas)).toEqual([]);
      expect(entregasDeMensajero('juan_p_rez_mi_empresa', 'MI EMPRESA', [])).toEqual([]);
      expect(entregasDeMensajero(null, 'MI EMPRESA', entregas)).toEqual([]);
    });
  });

  describe('entregasDeMensajero: independientes', () => {
    const entregas: EntregaAsignada[] = [
      { nroPedido: 'I-1', cliente: 'x', direccion: '', estado: 'Despachado', transportador: 'Juan Pérez', transportadorId: 'AbC123', independiente: true },
      { nroPedido: 'I-2', cliente: 'x', direccion: '', estado: 'Empacado', transportador: 'Juan Pérez', transportadorId: 'AbC123', independiente: true },
      { nroPedido: 'I-3', cliente: 'x', direccion: '', estado: 'Despachado', transportador: 'Juan Pérez', transportadorId: 'ZzZ999', independiente: true }
    ];

    it('reconoce la clave de un independiente', () => {
      expect(esClaveIndependiente('juan_p_rez_abc123_julsmind_independientes')).toBeTrue();
      expect(esClaveIndependiente('juan_p_rez_mi_empresa')).toBeFalse();
      expect(esClaveIndependiente(null)).toBeFalse();
    });

    it('une por el id de la ficha, no por el nombre', () => {
      const uno = entregasDeMensajero('juan_p_rez_abc123_julsmind_independientes', 'MI EMPRESA', entregas);
      expect(uno.map(e => e.nroPedido)).toEqual(['I-1', 'I-2']);
      const otro = entregasDeMensajero('juan_p_rez_zzz999_julsmind_independientes', 'MI EMPRESA', entregas);
      expect(otro.map(e => e.nroPedido)).toEqual(['I-3']);
    });

    it('si no lleva ningún pedido del comercio no aparece', () => {
      expect(entregasDeMensajero('juan_p_rez_qqq000_julsmind_independientes', 'MI EMPRESA', entregas)).toEqual([]);
    });

    it('un id que solo se parece al final de otro no cuenta', () => {
      const parecido: EntregaAsignada[] = [
        { nroPedido: 'I-9', cliente: 'x', direccion: '', estado: 'Despachado', transportador: 'Ana', transportadorId: 'bc123', independiente: true }
      ];
      expect(entregasDeMensajero('ana_abc123_julsmind_independientes', 'MI EMPRESA', parecido)).toEqual([]);
    });

    it('el nombre para mostrar sale del pedido', () => {
      expect(nombreDeIndependiente(entregas.slice(0, 2))).toBe('Juan Pérez');
      expect(nombreDeIndependiente([])).toBe('');
    });
  });

  it('etiqueta los estados para el panel', () => {
    expect(etiquetaEstadoEntrega('Despachado')).toBe('En camino');
    expect(etiquetaEstadoEntrega('ParaDespachar')).toBe('Para despachar');
    expect(etiquetaEstadoEntrega('Otro')).toBe('Otro');
  });
});
