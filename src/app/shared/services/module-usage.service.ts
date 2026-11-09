import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BaseService } from './base.service';
import { Menu, NavService } from './nav.service';

/**
 * Uso por módulo (D-700, F2-5): avisa a Katuq qué módulo del menú abre el comercio, para que el equipo
 * pueda acompañarlo. Es invisible para quien usa la app: no muestra nada, no cambia ninguna pantalla y
 * un fallo se traga sin avisar.
 *
 * Reglas:
 *  - Solo se envía el módulo (la ruta del menú reducida a dos segmentos, como en las novedades de versión)
 *    y solo si está en el menú de esta persona. La empresa y el usuario los toma el servidor de la sesión.
 *  - A lo sumo una vez por módulo y por día en esta pestaña (`sessionStorage`).
 *  - Si el servidor dice que está apagado, o la llamada falla, deja de enviar hasta el próximo inicio de sesión.
 */
@Injectable({ providedIn: 'root' })
export class ModuleUsageService extends BaseService implements OnDestroy {

  private iniciado = false;
  private apagado = false;
  private sesion = '';
  private enviadosEnMemoria = new Set<string>();
  private readonly subs = new Subscription();

  constructor(http: HttpClient, private router: Router, private nav: NavService) {
    super(http);
  }

  /** Con sesión abierta: empieza a escuchar la navegación. Se puede llamar varias veces. */
  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.registrar(this.router.url);
    this.subs.add(
      this.router.events
        .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
        .subscribe((evento) => this.registrar(evento.urlAfterRedirects)),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private registrar(url: string): void {
    this.revisarSesion();
    if (!this.sesion || this.apagado) return;
    const modulo = this.normalizar(url, 2);
    if (!modulo || !this.estaEnElMenu(modulo)) return;

    const clave = `${this.hoy()}|${modulo}`;
    if (this.yaEnviado(clave)) return;
    this.marcarEnviado(clave);

    this.postSinLoader<{ activo?: boolean } | null>('/v1/module-usage/open', { modulo }).subscribe({
      next: (respuesta) => {
        if (respuesta && respuesta.activo === false) this.apagado = true;
      },
      // Sin permiso, sin conexión o con error del servidor: se deja de enviar en esta sesión.
      error: () => {
        this.apagado = true;
      },
    });
  }

  private estaEnElMenu(modulo: string): boolean {
    return this.rutasDelMenu(this.nav.items.getValue()).includes(modulo);
  }

  private rutasDelMenu(menu: Menu[]): string[] {
    const rutas: string[] = [];
    const recorrer = (items: Menu[] = []) => {
      for (const item of items) {
        if (item.path) rutas.push(this.normalizar(item.path, 2));
        if (item.children) recorrer(item.children);
      }
    };
    recorrer(menu);
    return rutas.filter(Boolean);
  }

  /** `/ventas/pedidos/123?x=1` → `ventas/pedidos` (con `segmentos` = 2): igual que las novedades de versión. */
  private normalizar(url: string, segmentos: number): string {
    return (url || '')
      .split(/[?#]/)[0]
      .split('/')
      .filter(Boolean)
      .slice(0, segmentos)
      .join('/');
  }

  /** Cambió el usuario o la empresa: se vuelve a empezar. */
  private revisarSesion(): void {
    const sesion = this.claveSesion();
    if (sesion === this.sesion) return;
    this.sesion = sesion;
    this.apagado = false;
    this.enviadosEnMemoria = new Set<string>();
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

  /** Día de Colombia (AAAA-MM-DD), el mismo con que el servidor cuenta. */
  private hoy(): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  private llaveAlmacen(): string {
    return `moduloUsoEnviado:${this.sesion}:${this.hoy()}`;
  }

  private yaEnviado(clave: string): boolean {
    if (this.enviadosEnMemoria.has(clave)) return true;
    try {
      const guardado = JSON.parse(sessionStorage.getItem(this.llaveAlmacen()) || '[]');
      return Array.isArray(guardado) && guardado.includes(clave);
    } catch {
      return false;
    }
  }

  private marcarEnviado(clave: string): void {
    this.enviadosEnMemoria.add(clave);
    try {
      const guardado = JSON.parse(sessionStorage.getItem(this.llaveAlmacen()) || '[]');
      const lista = Array.isArray(guardado) ? guardado : [];
      if (!lista.includes(clave)) lista.push(clave);
      sessionStorage.setItem(this.llaveAlmacen(), JSON.stringify(lista.slice(-150)));
    } catch {
      // Sin almacenamiento solo se pierde el recuerdo: la memoria de esta pestaña evita repetir.
    }
  }
}
