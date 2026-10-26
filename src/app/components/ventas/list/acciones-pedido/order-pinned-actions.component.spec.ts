import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconoTablerComponent } from '../../../../shared/icons/icono-tabler.component';
import { OrderPinnedActionsComponent } from './order-pinned-actions.component';
import { EntradaEstadoAcciones, estadoAcciones } from './acciones-pedido.estado';
import { ochoAcciones } from './acciones-pedido.ocho';
import { AccionPedidoId } from './acciones-pedido.catalogo';

/**
 * D-547 (F2, tarea 11.2): el bloque de 8 solo pinta y avisa. Una acción deshabilitada no emite `(accion)`;
 * las habilitadas emiten su id; el resaltado solo pinta una etiqueta; «Restablecer acciones» avisa al padre.
 */
const base: EntradaEstadoAcciones = {
  produccion: false, puedeDireccion: true, puedeFacturacion: true, puedeProductos: true,
  puedeDescuentoEImpuestos: true, puedeAsesor: true, esPOS: false, tieneDescuento: false,
  puedeEliminar: false, esBrenda: false, estadoProceso: 'Pendiente', puedeFacturarSiigo: false,
  puedeRefacturar: false, puedeLiberar: false, esDian: false, despachadoOEntregado: false, revisado: false,
};

describe('OrderPinnedActionsComponent (D-547 F2)', () => {
  let fixture: ComponentFixture<OrderPinnedActionsComponent>;
  let emitidas: string[];
  let restablecidas: number;

  /** Cada llamada crea un componente nuevo: es OnPush y no se vuelve a pintar por cambiar sus propiedades a mano. */
  function pintar(cambios: Partial<EntradaEstadoAcciones> = {}, pines: string[] = [], resaltada: any = null): HTMLElement {
    fixture = TestBed.createComponent(OrderPinnedActionsComponent);
    fixture.componentInstance.accion.subscribe((id: AccionPedidoId) => emitidas.push(id));
    fixture.componentInstance.restablecer.subscribe(() => restablecidas++);
    const comp = fixture.componentInstance;
    comp.acciones = ochoAcciones(null, pines);
    comp.estados = estadoAcciones({ ...base, ...cambios });
    comp.pedido = { nroPedido: 'ALM-001234' };
    comp.resaltada = resaltada;
    comp.ngOnChanges();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const todos = (el: HTMLElement, sel: string) => Array.from(el.querySelectorAll(sel)) as HTMLElement[];
  const titulo = (b: HTMLElement) => (b.querySelector('.opa-titulo') as HTMLElement).textContent!.trim();
  const accion = (el: HTMLElement, t: string) =>
    todos(el, '.opa-accion').find(b => titulo(b) === t) as HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [OrderPinnedActionsComponent], imports: [IconoTablerComponent] });
    fixture = TestBed.createComponent(OrderPinnedActionsComponent);
    emitidas = []; restablecidas = 0;
    fixture.componentInstance.accion.subscribe((id: AccionPedidoId) => emitidas.push(id));
    fixture.componentInstance.restablecer.subscribe(() => restablecidas++);
  });

  it('pinta las 8 acciones: las 4 del rol (General) y 4 personales en el orden fijo', () => {
    const el = pintar();
    expect(todos(el, '.opa-accion').map(titulo)).toEqual([
      'PDF del pedido', 'Orden de venta', 'Editar cliente', 'Facturación', 'Notas', 'Cambiar estado', 'Editar productos', 'Editar dirección',
    ]);
  });

  it('una acción habilitada emite su id al tocarla', () => {
    const el = pintar();
    accion(el, 'PDF del pedido').click();
    accion(el, 'Notas').click();
    expect(emitidas).toEqual(['orderPdf', 'notes']);
  });

  it('una acción deshabilitada muestra su motivo y no emite nada', () => {
    const el = pintar({ puedeAsesor: false }, ['changeSeller']);
    const b = accion(el, 'Cambiar asesor');
    expect(b.disabled).toBeTrue();
    expect(b.getAttribute('aria-disabled')).toBe('true');
    expect(b.textContent).toContain('Solo administradores');
    b.click();
    expect(emitidas).toEqual([]);
  });

  it('el resaltado pinta la etiqueta en la misma acción y no cambia el orden', () => {
    const sin = todos(pintar({}, ['payments']), '.opa-accion').map(titulo);
    const el = pintar({}, ['payments'], { id: 'payments', etiqueta: 'Pago pendiente' });
    expect(todos(el, '.opa-accion').map(titulo)).toEqual(sin);
    const pagos = accion(el, 'Pagos');
    expect(pagos.classList.contains('opa-resaltada')).toBeTrue();
    expect(pagos.textContent).toContain('Pago pendiente');
    expect(todos(el, '.opa-resaltada').length).toBe(1);
  });

  it('con descuento aplicado, Descuento abre dos opciones y cada una emite su id', () => {
    const el = pintar({ tieneDescuento: true }, ['discount']);
    expect(todos(el, '.opa-menu').length).toBe(0);
    accion(el, 'Descuento').click();
    fixture.detectChanges();
    expect(emitidas).toEqual([]);
    const opciones = todos(el, '.opa-menu-opcion');
    expect(opciones.map(o => o.textContent!.trim())).toEqual(['Aplicar otro', 'Editar o quitar']);
    opciones[1].click();
    expect(emitidas).toEqual(['editDiscount']);
  });

  it('sin descuento aplicado, Descuento emite directo', () => {
    const el = pintar({}, ['discount']);
    accion(el, 'Descuento').click();
    expect(emitidas).toEqual(['discount']);
  });

  it('las acciones de factura electrónica que aplican van debajo y emiten su id', () => {
    const el = pintar({ puedeFacturarSiigo: true, esDian: true });
    const botones = todos(el, '.opa-factura-boton');
    expect(botones.map(b => b.textContent!.trim())).toEqual(['Facturar', 'Estado DIAN', 'PDF DIAN', 'Nota crédito', 'Ajuste NC/ND']);
    botones[0].click();
    expect(emitidas).toEqual(['invoice']);
  });

  it('sin acciones de factura no existe esa fila', () => {
    expect(pintar().querySelector('.opa-factura')).toBeNull();
  });

  it('«Restablecer acciones» avisa al padre sin emitir ninguna acción', () => {
    const el = pintar();
    (el.querySelector('.opa-restablecer') as HTMLButtonElement).click();
    expect(restablecidas).toBe(1);
    expect(emitidas).toEqual([]);
  });

  it('sin estados no pinta nada', () => {
    const comp = fixture.componentInstance;
    comp.estados = null;
    comp.ngOnChanges();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.opa-bloque')).toBeNull();
  });
});
