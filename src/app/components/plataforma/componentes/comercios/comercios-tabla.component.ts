import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { merge, Subject } from 'rxjs';
import { debounceTime, skip, switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { EstadoCarga, FiltrosTabla, Listado, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { filtrosIniciales, ordenarPor, TAMANOS, textoUltimoPago, totalDelServidor } from '../../logica/consulta';
import { fechaCo } from '../../logica/formato';
import { TEXTOS } from '../../plataforma.textos';

const CICLOS: Array<[string, string]> = [
  ['trial', 'En prueba'], ['active', 'Activo'], ['past_due', 'En mora'], ['suspended', 'Suspendido'],
  ['paused', 'Pausado'], ['blocked', 'Bloqueado'], ['cancelled', 'Cancelado'], ['deleted', 'Eliminado'],
];
const TIPOS: Array<[string, string]> = [
  ['real', 'Real'], ['porConfirmar', 'Por confirmar'], ['demo', 'Demo'], ['prueba', 'Prueba'], ['cortesia', 'Cortesía'], ['interna', 'Interna'],
];
const SEGMENTOS: Array<[string, string]> = [
  ['nuevos_sin_primer_pedido', 'Nuevos sin primer pedido'], ['pagan_sin_medio_de_pago', 'Pagan sin medio de pago'],
  ['premium_ventas_en_caida', 'Premium con ventas en caída'], ['gratuitos_cerca_limite', 'Gratuitos en el límite de integraciones'],
  ['plan_vencido_o_por_vencer', 'Plan vencido o por vencer'],
];
const COLUMNAS: Array<{ orden: string | null; clave: string; der?: boolean }> = [
  { orden: 'nombre', clave: 'nombre' }, { orden: null, clave: 'ciclo' }, { orden: null, clave: 'plan' }, { orden: 'alta', clave: 'alta' },
  { orden: 'pedidos', clave: 'pedidos', der: true }, { orden: 'gmv', clave: 'gmv', der: true }, { orden: 'contratado', clave: 'contratado', der: true },
  { orden: 'cobrado', clave: 'cobrado', der: true }, { orden: 'porCobrar', clave: 'porCobrar', der: true }, { orden: 'mora', clave: 'mora', der: true },
  { orden: 'ultimoIngreso', clave: 'ultimoIngreso' }, { orden: 'ultimoPago', clave: 'ultimoPago' },
];

/** D-700 13.6 — Comercios: filtros, orden y paginación en el servidor; en pantallas angostas la tabla es una lista de tarjetas. */
@Component({
  selector: 'app-comercios-tabla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comercios-tabla.component.html',
})
export class ComerciosTablaComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.comercios;
  readonly segmentos = SEGMENTOS;
  readonly ciclos = CICLOS;
  readonly tipos = TIPOS;
  readonly planes = Object.keys(TEXTOS.comercios.planesNombres);
  readonly columnas = COLUMNAS;
  readonly tamanos = TAMANOS;
  filtros: FiltrosTabla = filtrosIniciales();
  estado: EstadoCarga<SobrePlataforma<Listado | null>> = estadoInicial();
  private cargar$ = new Subject<void>();
  private busqueda$ = new Subject<void>();
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    merge(this.cargar$, this.ctx.recarga$.pipe(skip(1))).pipe(
      switchMap(() => conEstado(this.servicio.comercios(this.filtros))),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
    this.busqueda$.pipe(debounceTime(350), takeUntil(this.fin$)).subscribe(() => { this.filtros = { ...this.filtros, pagina: 1 }; this.cargar$.next(); });
    this.cargar$.next();
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  escribir(q: string): void {
    this.filtros = { ...this.filtros, q };
    this.busqueda$.next();
  }

  cambiar(campo: 'segmento' | 'ciclo' | 'tipoCuenta' | 'plan', valor: string): void {
    this.filtros = { ...this.filtros, [campo]: valor, pagina: 1 };
    this.cargar$.next();
  }

  cambiarTamano(valor: string): void {
    this.filtros = { ...this.filtros, tamano: Number(valor), pagina: 1 };
    this.cargar$.next();
  }

  ordenar(columna: string | null): void {
    if (!columna) return;
    this.filtros = ordenarPor(this.filtros, columna);
    this.cargar$.next();
  }

  ir(pagina: number): void {
    this.filtros = { ...this.filtros, pagina };
    this.cargar$.next();
  }

  reintentar(): void {
    this.cargar$.next();
  }

  ariaOrden(orden: string | null): 'ascending' | 'descending' | 'none' | null {
    if (!orden) return null;
    return this.filtros.orden === orden ? (this.filtros.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  }

  totales(l: Listado | null) {
    return totalDelServidor(l);
  }

  ultimoPago(u: { estado: string; fecha: string | null } | null | undefined): string {
    return textoUltimoPago(u, (f) => fechaCo(f, false));
  }

  nombreDe(f: { nomComercial: string | null; nombre: string | null; docId: string }): string {
    return f.nomComercial || f.nombre || f.docId;
  }

  cicloTexto(c: string | null): string {
    const par = CICLOS.find((x) => x[0] === c);
    return par ? par[1] : c || '—';
  }

  planTexto(p: string | null): string {
    return (p && TEXTOS.comercios.planesNombres[p]) || '—';
  }

  rotuloColumna(clave: string): string {
    return TEXTOS.comercios.columnas[clave] || clave;
  }

  trackFila(_: number, f: { docId: string }): string {
    return f.docId;
  }
}
