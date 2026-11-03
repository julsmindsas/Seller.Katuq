import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Menu, NavService } from './nav.service';
import { NotaVersion, VersionCheckService } from './version-check.service';

/**
 * D-581: novedades de versión sin interrumpir y solo de lo que cada uno usa.
 *
 * Una nota con `modulos` (rutas del menú) le aplica al usuario si alguno de esos
 * módulos está en su menú (permisos del rol y banderas de la empresa) y él lo abrió
 * en los últimos 90 días. Sin `modulos`, le aplica a todos.
 *
 * Las pantallas usadas y la última novedad vista viven solo en este navegador, por
 * usuario y empresa. No se envían a ningún lado: es una preferencia local, no telemetría.
 */
@Injectable({ providedIn: 'root' })
export class NovedadesVersionService implements OnDestroy {

  private readonly DIAS_USO = 90;
  private readonly MAX_RUTAS = 150;
  private readonly DIA_MS = 24 * 60 * 60 * 1000;

  private readonly notas$ = new BehaviorSubject<NotaVersion[]>([]);
  private readonly uso$ = new BehaviorSubject<Record<string, string>>({});
  private readonly vistasHasta$ = new BehaviorSubject<string>('');

  /** Las novedades que le aplican al usuario, de la más nueva a la más vieja. */
  readonly novedades$: Observable<NotaVersion[]>;
  /** Hay al menos una novedad que le aplica y que no ha visto. */
  readonly hayNuevas$: Observable<boolean>;

  private sesion = '';
  private iniciado = false;
  private readonly subs = new Subscription();

  constructor(
    private router: Router,
    private nav: NavService,
    private versionCheck: VersionCheckService,
  ) {
    this.novedades$ = combineLatest([this.notas$, this.nav.items, this.uso$]).pipe(
      map(([notas, menu, uso]) => {
        const rutas = this.rutasDelMenu(menu);
        return notas.filter((nota) => this.aplicaCon(nota, rutas, uso));
      }),
    );
    this.hayNuevas$ = combineLatest([this.novedades$, this.vistasHasta$]).pipe(
      map(([notas, hasta]) => notas.some((nota) => this.tiempo(nota.fecha) > this.tiempo(hasta))),
    );
  }

  /** Con sesión abierta: empieza a registrar el uso y carga las novedades publicadas. */
  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;

    this.registrarUso(this.router.url);
    this.subs.add(
      this.router.events
        .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
        .subscribe((evento) => this.registrarUso(evento.urlAfterRedirects)),
    );
    // Si se publica otra versión mientras trabaja, la pestaña ya muestra sus notas.
    this.subs.add(
      this.versionCheck.actualizacionDisponible$.subscribe((data) => {
        if (data) this.tomarNotas(data.recientes || data.notas);
      }),
    );
    this.versionCheck.leerPublicada().then((data) => {
      if (data) this.tomarNotas(data.recientes || data.notas);
    });
  }

  /** Para la píldora de versión nueva: misma regla, con lo que se sabe en este momento. */
  aplica(nota: NotaVersion): boolean {
    this.revisarSesion();
    return this.aplicaCon(nota, this.rutasDelMenu(this.nav.items.getValue()), this.uso$.getValue());
  }

  /** Al abrir la pestaña: todo lo que le aplica hasta hoy queda visto. */
  marcarVistas(notas: NotaVersion[]): void {
    const masNueva = notas.reduce((max, nota) => Math.max(max, this.tiempo(nota.fecha)), 0);
    if (masNueva <= this.tiempo(this.vistasHasta$.getValue())) return;
    const hasta = new Date(masNueva).toISOString();
    this.vistasHasta$.next(hasta);
    this.guardar('novedadesVistasHasta', hasta);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private tomarNotas(notas?: NotaVersion[]): void {
    const validas = (Array.isArray(notas) ? notas : []).filter((nota) => nota && nota.texto);
    validas.sort((a, b) => this.tiempo(b.fecha) - this.tiempo(a.fecha));
    this.notas$.next(validas);
  }

  private aplicaCon(nota: NotaVersion, rutasMenu: string[], uso: Record<string, string>): boolean {
    const modulos = Array.isArray(nota.modulos) ? nota.modulos.filter(Boolean) : [];
    if (!modulos.length) return true;
    const desde = Date.now() - this.DIAS_USO * this.DIA_MS;
    const usadas = Object.keys(uso).filter((ruta) => this.tiempo(uso[ruta]) >= desde);
    return modulos.some((modulo) =>
      rutasMenu.some((ruta) => this.esDe(ruta, modulo)) && usadas.some((ruta) => this.esDe(ruta, modulo)),
    );
  }

  /** `ventas/ventas-pos` es de `ventas` y de `ventas/ventas-pos`; `ventas-pos` no es de `ventas`. */
  private esDe(ruta: string, modulo: string): boolean {
    return ruta === modulo || ruta.startsWith(modulo + '/');
  }

  private rutasDelMenu(menu: Menu[]): string[] {
    const rutas: string[] = [];
    const recorrer = (items: Menu[] = []) => {
      for (const item of items) {
        if (item.path) rutas.push(this.normalizar(item.path, 99));
        if (item.children) recorrer(item.children);
      }
    };
    recorrer(menu);
    return rutas.filter(Boolean);
  }

  private registrarUso(url: string): void {
    this.revisarSesion();
    if (!this.sesion) return;
    const ruta = this.normalizar(url, 2);
    if (!ruta) return;

    const ahora = new Date();
    const uso = { ...this.uso$.getValue() };
    // Una escritura por ruta y por día basta para saber si la usa.
    if ((uso[ruta] || '').slice(0, 10) === ahora.toISOString().slice(0, 10)) return;
    uso[ruta] = ahora.toISOString();

    const desde = ahora.getTime() - this.DIAS_USO * this.DIA_MS;
    const vigentes = Object.keys(uso)
      .filter((r) => this.tiempo(uso[r]) >= desde)
      .sort((a, b) => this.tiempo(uso[b]) - this.tiempo(uso[a]))
      .slice(0, this.MAX_RUTAS);
    const limpio: Record<string, string> = {};
    for (const r of vigentes) limpio[r] = uso[r];

    this.uso$.next(limpio);
    this.guardar('novedadesUso', limpio);
  }

  /** `/ventas/pedidos/123?x=1` → `ventas/pedidos` (con `segmentos` = 2). */
  private normalizar(url: string, segmentos: number): string {
    return (url || '')
      .split(/[?#]/)[0]
      .split('/')
      .filter(Boolean)
      .slice(0, segmentos)
      .join('/');
  }

  /** Cambió el usuario o la empresa: se cargan su uso y sus novedades vistas. */
  private revisarSesion(): void {
    const sesion = this.claveSesion();
    if (sesion === this.sesion) return;
    this.sesion = sesion;
    this.uso$.next(sesion ? this.leer('novedadesUso', {}) : {});
    this.vistasHasta$.next(sesion ? this.leer('novedadesVistasHasta', '') : '');
  }

  private claveSesion(): string {
    try {
      const usuario = JSON.parse(localStorage.getItem('user') || '{}');
      const email = String(usuario?.email || '').toLowerCase();
      const empresa = String(usuario?.company || '');
      return email && empresa ? `${email}:${empresa}` : '';
    } catch {
      return '';
    }
  }

  private leer<T>(prefijo: string, vacio: T): T {
    try {
      const texto = localStorage.getItem(`${prefijo}:${this.sesion}`);
      return texto ? (JSON.parse(texto) as T) : vacio;
    } catch {
      return vacio;
    }
  }

  private guardar(prefijo: string, valor: unknown): void {
    if (!this.sesion) return;
    try {
      localStorage.setItem(`${prefijo}:${this.sesion}`, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento solo se pierde el recuerdo; la pantalla sigue funcionando.
    }
  }

  private tiempo(fecha?: string): number {
    return Date.parse(fecha || '') || 0;
  }
}
