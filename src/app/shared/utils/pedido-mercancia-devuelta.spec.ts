import { debePreguntarSiVolvio } from './pedido-mercancia-devuelta';

/** Ticket 1299 (D-493): cuándo se pregunta si el producto volvió a la bodega. */
describe('debePreguntarSiVolvio', () => {
  it('pregunta al cancelar el pago de un pedido que ya salió', () => {
    for (const proceso of ['EnDespacho', 'Despachado', 'Entregado', 'Cerrado']) {
      expect(debePreguntarSiVolvio('Pendiente', 'Cancelado', proceso)).toBe(true);
    }
    expect(debePreguntarSiVolvio('Aprobado', 'Precancelado', 'Entregado')).toBe(true);
    expect(debePreguntarSiVolvio('PreAprobado', 'Rechazado', 'Despachado')).toBe(true);
  });

  it('no pregunta si el pedido no ha salido: ahí se devuelve solo', () => {
    expect(debePreguntarSiVolvio('Pendiente', 'Cancelado', 'ParaDespachar')).toBe(false);
    expect(debePreguntarSiVolvio('Pendiente', 'Cancelado', 'SinProducir')).toBe(false);
  });

  it('no pregunta si el pago no se cae o ya estaba caído', () => {
    expect(debePreguntarSiVolvio('Pendiente', 'Aprobado', 'Entregado')).toBe(false);
    expect(debePreguntarSiVolvio('Precancelado', 'Cancelado', 'Entregado')).toBe(false);
    expect(debePreguntarSiVolvio('Cancelado', 'Cancelado', 'Entregado')).toBe(false);
    expect(debePreguntarSiVolvio('Pendiente', '', 'Entregado')).toBe(false);
  });
});
