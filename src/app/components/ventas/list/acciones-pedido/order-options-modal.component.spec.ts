import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconoTablerComponent } from '../../../../shared/icons/icono-tabler.component';
import { OrderOptionsModalComponent } from './order-options-modal.component';
import { EntradaEstadoAcciones, estadoAcciones } from './acciones-pedido.estado';

/**
 * D-547 (F1, tarea 3.2): el modal solo pinta y avisa. Una tarjeta deshabilitada no emite `(accion)`;
 * Esc, la X, «Cerrar» y el clic fuera emiten `(cerrar)` sin `(accion)`; Enter con una sola coincidencia
 * emite su id; sin acciones de contexto no existe la fila «Para este pedido».
 */
const base: EntradaEstadoAcciones = {
  produccion: false, puedeDireccion: true, puedeFacturacion: true, puedeProductos: true,
  puedeDescuentoEImpuestos: true, puedeAsesor: true, esPOS: false, tieneDescuento: false,
  puedeEliminar: false, esBrenda: false, estadoProceso: 'Pendiente', puedeFacturarSiigo: false,
  puedeRefacturar: false, puedeLiberar: false, esDian: false, despachadoOEntregado: false, revisado: false,
};

describe('OrderOptionsModalComponent (D-547)', () => {
  let fixture: ComponentFixture<OrderOptionsModalComponent>;
  let acciones: string[];
  let cierres: number;

  function abrir(cambios: Partial<EntradaEstadoAcciones> = {}, desdeProduccion = false): HTMLElement {
    const comp = fixture.componentInstance;
    comp.pedido = { nroPedido: 'ALM-001234' };
    comp.estados = estadoAcciones({ ...base, ...cambios });
    comp.desdeProduccion = desdeProduccion;
    comp.ngOnChanges();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const q = (el: HTMLElement, sel: string) => el.querySelector(sel) as HTMLElement;
  const todos = (el: HTMLElement, sel: string) => Array.from(el.querySelectorAll(sel)) as HTMLElement[];
  const tarjeta = (el: HTMLElement, titulo: string) =>
    todos(el, '.opm-tarjeta').find(t => (t.querySelector('.opm-tarjeta-titulo') as HTMLElement).textContent!.trim() === titulo) as HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [OrderOptionsModalComponent], imports: [IconoTablerComponent] });
    fixture = TestBed.createComponent(OrderOptionsModalComponent);
    acciones = []; cierres = 0;
    fixture.componentInstance.accion.subscribe((id: string) => acciones.push(id));
    fixture.componentInstance.cerrar.subscribe(() => cierres++);
  });

  it('pinta las 16 tarjetas en 4 columnas y el número del pedido', () => {
    const el = abrir();
    expect(todos(el, '.opm-tarjeta').length).toBe(16);
    expect(todos(el, '.opm-etiqueta').map(e => e.textContent!.trim())).toEqual(['Documentos', 'Cliente y entrega', 'Productos y pagos', 'Seguimiento']);
    expect(q(el, '.opm-numero').textContent).toContain('ALM-001234');
  });

  it('una tarjeta habilitada emite su id al tocarla', () => {
    const el = abrir();
    tarjeta(el, 'PDF del pedido').click();
    expect(acciones).toEqual(['orderPdf']);
    expect(cierres).toBe(0);
  });

  it('una tarjeta deshabilitada no emite (accion), muestra candado con su motivo y queda con aria-disabled', () => {
    const el = abrir({ puedeProductos: false, estadoProceso: 'Despachado' });
    const t = tarjeta(el, 'Editar productos');
    expect(t.disabled).toBeTrue();
    expect(t.getAttribute('aria-disabled')).toBe('true');
    expect(t.textContent).toContain('Congelado · Despachado');
    t.click();
    expect(acciones).toEqual([]);
  });

  it('Esc, la X, «Cerrar» y el clic fuera emiten (cerrar) sin (accion)', () => {
    const el = abrir();
    q(el, '.opm-modal').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    q(el, '.opm-cerrar-x').click();
    q(el, '.opm-cerrar').click();
    q(el, '.opm-fondo').click();
    expect(cierres).toBe(4);
    expect(acciones).toEqual([]);
  });

  it('un clic dentro del modal no lo cierra', () => {
    const el = abrir();
    q(el, '.opm-modal').click();
    expect(cierres).toBe(0);
  });

  it('Enter con una sola coincidencia emite su id; con dos, no abre nada', () => {
    const el = abrir();
    const campo = q(el, '.opm-buscar-campo') as HTMLInputElement;
    campo.value = 'imprimir';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(todos(el, '.opm-tarjeta').length).toBe(1);
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(acciones).toEqual(['orderPdf']);

    acciones.length = 0;
    campo.value = 'pdf';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(acciones).toEqual([]);
  });

  it('sin coincidencias dice «Ninguna acción con ese nombre» y vuelve la grilla al borrar el texto', () => {
    const el = abrir();
    const campo = q(el, '.opm-buscar-campo') as HTMLInputElement;
    campo.value = 'zzzz';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(q(el, '.opm-vacio').textContent).toContain('Ninguna acción con ese nombre');
    campo.value = '';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(todos(el, '.opm-tarjeta').length).toBe(16);
  });

  it('sin acciones de contexto no existe la fila «Para este pedido»', () => {
    const el = abrir();
    expect(q(el, '.opm-contexto')).toBeNull();
  });

  it('con una sola acción de Factura electrónica, el botón lleva su nombre y la ejecuta', () => {
    const el = abrir({ puedeFacturarSiigo: true });
    const boton = todos(el, '.opm-contexto-boton')[0];
    expect(boton.textContent).toContain('Facturar');
    boton.click();
    expect(acciones).toEqual(['invoice']);
  });

  it('con varias, Factura electrónica abre una segunda fila con las que aplican', () => {
    const el = abrir({ esDian: true, puedeLiberar: true });
    const boton = todos(el, '.opm-contexto-boton')[0];
    expect(boton.textContent).toContain('Factura electrónica');
    boton.click();
    fixture.detectChanges();
    const hijos = todos(el, '.opm-contexto-hijo').map(h => h.textContent!.trim());
    expect(hijos).toEqual(['Liberar factura', 'Estado DIAN', 'PDF DIAN', 'Nota crédito', 'Ajuste NC/ND']);
    todos(el, '.opm-contexto-hijo')[1].click();
    expect(acciones).toEqual(['dianStatus']);
  });

  it('con descuento aplicado, Descuento abre un menú de dos opciones y no emite hasta escoger', () => {
    const el = abrir({ tieneDescuento: true });
    tarjeta(el, 'Descuento').click();
    fixture.detectChanges();
    expect(acciones).toEqual([]);
    const opciones = todos(el, '.opm-menu-opcion');
    expect(opciones.map(o => o.textContent!.trim())).toEqual(['Aplicar otro', 'Editar o quitar']);
    opciones[1].click();
    expect(acciones).toEqual(['editDiscount']);
  });

  it('sin descuento, Descuento emite directo', () => {
    const el = abrir();
    tarjeta(el, 'Descuento').click();
    expect(acciones).toEqual(['discount']);
  });

  it('sin permiso de eliminar no existe «Eliminar pedido»', () => {
    const el = abrir();
    expect(q(el, '.opm-eliminar')).toBeNull();
  });

  it('con permiso, «Eliminar pedido» emite deleteOrder', () => {
    const el = abrir({ puedeEliminar: true });
    q(el, '.opm-eliminar').click();
    expect(acciones).toEqual(['deleteOrder']);
  });

  it('desde Producción pinta solo las 6 fijas, sin etiquetas ni tarjetas deshabilitadas', () => {
    const el = abrir({ produccion: true, estadoProceso: 'EnProduccion' }, true);
    expect(todos(el, '.opm-tarjeta').length).toBe(6);
    expect(todos(el, '.opm-etiqueta').length).toBe(0);
    expect(todos(el, '.opm-tarjeta[disabled]').length).toBe(0);
  });
});
