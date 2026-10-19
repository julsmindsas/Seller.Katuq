import { Inject, Injectable, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRouteSnapshot, NavigationEnd, Route, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { LayoutService } from './layout.service';
import { NgpThemeService } from './ngtheme.service';

// D-502 (ticket 1180): los bundles de PrimeNG por tema se nombran solo aquí.
const BUNDLE_CLARO = 'lara-light-blue';
const BUNDLE_OSCURO = 'md-dark-deeppurple';
const CLASE_OSCURO = 'dark-only';
const MAX_REDIRECCIONES = 3;

function segmentosDe(pathname: string): string[] {
  return String(pathname || '/')
    .split(/[?#]/)[0]
    .split('/')
    .filter(Boolean)
    .map(segmento => {
      const limpio = segmento.split(';')[0];
      try {
        return decodeURIComponent(limpio);
      } catch {
        return limpio;
      }
    });
}

// Recorre las rutas en orden, como el router. Devuelve null si ninguna coincide.
function buscarMarco(segs: string[], rutas: Route[], raiz: Route[], enMarco: boolean, saltos: number): boolean | null {
  for (const ruta of rutas) {
    if (ruta.matcher) continue; // un matcher propio no se puede evaluar sin el router
    const marco = enMarco || ruta.data?.['shell'] === true;
    const path = ruta.path ?? '';
    if (path === '**') return marco;
    const propios = path.split('/').filter(Boolean);
    if (propios.length > segs.length) continue;
    if (!propios.every((p, i) => p.startsWith(':') || p === segs[i])) continue;
    const resto = segs.slice(propios.length);
    if (ruta.pathMatch === 'full' && resto.length) continue;

    if (typeof ruta.redirectTo === 'string') {
      if (saltos >= MAX_REDIRECCIONES) continue;
      const destino = segmentosDe(ruta.redirectTo);
      const resultado = ruta.redirectTo.startsWith('/')
        ? buscarMarco(destino, raiz, raiz, false, saltos + 1)
        // relativa: el router sigue con el mismo nivel, ya sin redirecciones
        : buscarMarco([...destino, ...resto], rutas.filter(r => r.redirectTo === undefined), raiz, enMarco, saltos + 1);
      if (resultado !== null) return resultado;
      continue;
    }
    if (ruta.children) {
      const hijo = buscarMarco(resto, ruta.children, raiz, marco, saltos);
      if (hijo !== null) return hijo;
      continue;
    }
    if (ruta.loadChildren) return marco; // el resto lo resuelve el módulo perezoso
    if (!resto.length) return marco;     // un componente debe consumir toda la URL
  }
  return null;
}

/**
 * D-502: ¿la URL cae dentro del marco con menú (rutas con `data: { shell: true }`)?
 * Usa solo la configuración en línea: los `path` de los hijos no requieren bajar ningún chunk.
 * Un `:param` acepta cualquier valor y los `path` vacíos no consumen segmentos.
 */
export function isShellUrl(pathname: string, routes: Route[] | null | undefined): boolean {
  if (!Array.isArray(routes)) return false;
  return buscarMarco(segmentosDe(pathname), routes, routes, false, 0) === true;
}

function identidadDe(usuario: any): string {
  return `${usuario?.email ?? ''}|${usuario?.company ?? ''}`;
}

/**
 * D-502 (ticket 1180): único dueño del tema. Oscuro si y solo si la pantalla está dentro del
 * marco con menú y la preferencia de la sesión es oscura; todo lo demás, claro.
 * Es lo único que toca el DOM del tema (clase del body, `layout_version` y bundle de PrimeNG).
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeModeService implements OnDestroy {
  private readonly oscuro$ = new BehaviorSubject<boolean>(false);

  /** Tema aplicado ahora mismo. */
  readonly isDark$: Observable<boolean> = this.oscuro$.asObservable();

  // Preferencia de la sesión en memoria: una copia vieja del `user` no la cambia.
  private preferencia = false;
  // La sesión se reconoce por email y empresa, nunca por el token.
  private identidad: string | null = null;
  private enMarco = false;
  private readonly navegacion: Subscription;

  constructor(
    private router: Router,
    private layout: LayoutService,
    private ngpTheme: NgpThemeService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.cargarSesion(this.leerUsuario());
    // Arranque provisional, antes de cualquier evento del router: quien recarga en oscuro
    // lo ve desde el inicio aunque el chunk de la pantalla siga bajando.
    this.enMarco = isShellUrl(this.document.location?.pathname || '/', this.router.config);
    this.apply(this.enMarco && this.preferencia);

    // Se confirma al terminar la navegación; NavigationCancel y NavigationError no cambian nada.
    this.navegacion = this.router.events.subscribe(evento => {
      if (evento instanceof NavigationEnd) this.confirmar();
    });
  }

  get isDark(): boolean {
    return this.oscuro$.value;
  }

  /** Aplica el tema al DOM. Es idempotente: si el bundle no cambia, no toca el <link>. */
  apply(dark: boolean): void {
    const oscuro = !!dark;
    const body = this.document.body;
    if (body) {
      if (oscuro) body.classList.add(CLASE_OSCURO);
      else body.classList.remove(CLASE_OSCURO);
      // El fondo en línea ganaba a las hojas de estilo y quedaba negro después de cerrar sesión.
      body.style.removeProperty('background-color');
    }
    this.layout.config.settings.layout_version = oscuro ? 'dark-only' : 'light';

    const bundle = oscuro ? BUNDLE_OSCURO : BUNDLE_CLARO;
    const link = this.document.getElementById('app-theme');
    if (link && link.getAttribute('href') !== `${bundle}.css`) {
      this.ngpTheme.switchTheme(bundle);
    }
    if (this.oscuro$.value !== oscuro) this.oscuro$.next(oscuro);
  }

  /** El botón del header: cambia la preferencia, guarda solo `tema` en el `user` y aplica. */
  setPreference(dark: boolean): void {
    this.preferencia = !!dark;
    const usuario = this.leerUsuario();
    if (usuario) {
      this.identidad = identidadDe(usuario);
      usuario.tema = this.preferencia;
      this.escribirUsuario(usuario);
    }
    this.apply(this.enMarco && this.preferencia);
  }

  /** Cerrar sesión: claro y memoria vacía. */
  reset(): void {
    this.preferencia = false;
    this.identidad = null;
    this.apply(false);
  }

  ngOnDestroy(): void {
    this.navegacion.unsubscribe();
  }

  private confirmar(): void {
    const usuario = this.leerUsuario();
    if (!usuario) {
      this.cargarSesion(null); // la sesión terminó
    } else if (identidadDe(usuario) !== this.identidad) {
      this.cargarSesion(usuario); // otra persona o empresa en el mismo navegador
    }
    this.enMarco = this.arbolEnMarco(this.router.routerState?.snapshot?.root ?? null);
    this.apply(this.enMarco && this.preferencia);
  }

  private cargarSesion(usuario: any): void {
    this.identidad = usuario ? identidadDe(usuario) : null;
    this.preferencia = !!usuario?.tema;
  }

  private arbolEnMarco(nodo: ActivatedRouteSnapshot | null): boolean {
    if (!nodo) return false;
    if (nodo.routeConfig?.data?.['shell'] === true) return true;
    return (nodo.children || []).some(hijo => this.arbolEnMarco(hijo));
  }

  // localStorage puede fallar (modo privado o bloqueado): queda claro, sin lanzar.
  private leerUsuario(): any {
    try {
      const raw = localStorage.getItem('user');
      const usuario = raw ? JSON.parse(raw) : null;
      return usuario && typeof usuario === 'object' ? usuario : null;
    } catch {
      return null;
    }
  }

  private escribirUsuario(usuario: any): void {
    try {
      localStorage.setItem('user', JSON.stringify(usuario));
    } catch {
      // Sin almacenamiento la preferencia sigue en memoria durante la sesión.
    }
  }
}
