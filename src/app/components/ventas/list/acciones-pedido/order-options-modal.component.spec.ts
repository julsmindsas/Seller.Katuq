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
  // ── F2 (11.3): pines ────────────────────────────────────────────────────────────────────────
  describe('pines (bandera orderPinnedActions)', () => {
    const GENERAL = ['orderPdf', 'salesOrder', 'editCustomer', 'billingData'] as any[];
    let fijadas: { id: string; fijar: boolean }[];

    function abrirConPines(pines: string[] = [], activos = true, cambios: Partial<EntradaEstadoAcciones> = {}): HTMLElement {
      const comp = fixture.componentInstance;
      comp.pinesActivos = activos;
      comp.delRol = GENERAL;
      comp.pines = pines as any[];
      fijadas = [];
      comp.fijar.subscribe((e: any) => fijadas.push(e));
      return abrir(cambios);
    }
    const pin = (el: HTMLElement, titulo: string) => {
      const t = tarjeta(el, titulo);
      return t.parentElement!.querySelector('.opm-pin') as HTMLButtonElement;
    };

    it('sin la bandera no existe ningún pin y el modal es el de F1', () => {
      const el = abrirConPines([], false);
      expect(todos(el, '.opm-pin').length).toBe(0);
    });

    it('con la bandera, las 16 tarjetas llevan su pin como botón propio (no dentro de la tarjeta)', () => {
      const el = abrirConPines();
      expect(todos(el, '.opm-pin').length).toBe(16);
      expect(todos(el, '.opm-tarjeta .opm-pin').length).toBe(0);
      expect(todos(el, '.opm-contexto-boton .opm-pin').length).toBe(0);
    });

    it('gris libre, azul fijado por el usuario y azul con candado fijado por el rol, con su nombre accesible', () => {
      const el = abrirConPines(['payments']);
      const libre = pin(el, 'Descuento');
      expect(libre.getAttribute('aria-label')).toBe('Fijar en acciones principales');
      expect(libre.getAttribute('aria-pressed')).toBe('false');
      expect(libre.classList.contains('opm-pin-fijado')).toBeFalse();

      const usuario = pin(el, 'Pagos');
      expect(usuario.getAttribute('aria-label')).toBe('Quitar de acciones principales');
      expect(usuario.getAttribute('aria-pressed')).toBe('true');
      expect(usuario.classList.contains('opm-pin-fijado')).toBeTrue();

      const rol = pin(el, 'PDF del pedido');
      expect(rol.getAttribute('aria-label')).toBe('Fijada por tu rol');
      expect(rol.getAttribute('aria-disabled')).toBe('true');
      expect(rol.querySelector('.opm-pin-candado')).not.toBeNull();
    });

    it('tocar un pin gris pide fijar, uno azul pide soltar, y no activa la tarjeta', () => {
      const el = abrirConPines(['payments']);
      pin(el, 'Descuento').click();
      pin(el, 'Pagos').click();
      expect(fijadas).toEqual([{ id: 'discount', fijar: true }, { id: 'payments', fijar: false }]);
      expect(acciones).toEqual([]);
    });

    it('el pin de una acción del rol no emite nada', () => {
      const el = abrirConPines();
      pin(el, 'PDF del pedido').click();
      expect(fijadas).toEqual([]);
    });

    it('una tarjeta deshabilitada igual se puede fijar (fijar no da acceso)', () => {
      const el = abrirConPines([], true, { puedeAsesor: false });
      expect(tarjeta(el, 'Cambiar asesor').disabled).toBeTrue();
      pin(el, 'Cambiar asesor').click();
      expect(fijadas).toEqual([{ id: 'changeSeller', fijar: true }]);
      expect(acciones).toEqual([]);
    });

    it('las acciones de contexto y Eliminar no tienen pin', () => {
      const el = abrirConPines();
      expect(todos(el, '.opm-contexto .opm-pin').length).toBe(0);
      expect(todos(el, '.opm-pie .opm-pin').length).toBe(0);
    });
  });
  // ── F2 (11.5): resaltado sin mover ──────────────────────────────────────────────────────────
  describe('resaltado (D17)', () => {
    function abrirResaltada(r: any): HTMLElement {
      fixture.componentInstance.resaltada = r;
      return abrir();
    }
    const orden = (el: HTMLElement) => todos(el, '.opm-tarjeta-titulo').map(t => t.textContent!.trim());

    it('sin resaltado, ninguna tarjeta lo lleva', () => {
      const el = abrirResaltada(null);
      expect(todos(el, '.opm-tarjeta-resaltada').length).toBe(0);
      expect(todos(el, '.opm-tarjeta-alerta').length).toBe(0);
    });

    it('resalta la tarjeta con su etiqueta en lugar de la reseña y no mueve ninguna', () => {
      const sin = orden(abrirResaltada(null));
      fixture = TestBed.createComponent(OrderOptionsModalComponent);
      const el = abrirResaltada({ id: 'payments', etiqueta: 'Pago pendiente' });
      const t = tarjeta(el, 'Pagos');
      expect(t.classList.contains('opm-tarjeta-resaltada')).toBeTrue();
      expect(t.querySelector('.opm-tarjeta-alerta')!.textContent!.trim()).toBe('Pago pendiente');
      expect(t.querySelector('.opm-tarjeta-resena')).toBeNull();
      expect(todos(el, '.opm-tarjeta-resaltada').length).toBe(1);
      expect(orden(el)).toEqual(sin);
    });

    it('la tarjeta resaltada sigue siendo una acción normal: emite su id', () => {
      const el = abrirResaltada({ id: 'billingData', etiqueta: 'Sin factura' });
      tarjeta(el, 'Facturación').click();
      expect(acciones).toEqual(['billingData']);
    });
  });
});
