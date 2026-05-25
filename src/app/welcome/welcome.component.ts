import { Component, OnInit } from '@angular/core';
import { ServiciosService } from '../shared/services/servicios.service';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  public userActive: any;
  public currentCompany: any;

  // Set de paths del menú asignados al rol del usuario (sin barra inicial).
  // Se llena en ngOnInit leyendo user.menu del localStorage. Los admins lo dejan
  // vacío y `canAccess()` retorna true siempre para ellos (escape hatch).
  private userMenuPaths: Set<string> = new Set();
  private isAdminRole = false;
  // Si el JWT no tiene menu (sesión legacy / token viejo), mostrar TODO en lugar
  // de ocultar — no romper operación de users con tokens previos al cambio.
  private hasMenuMetadata = false;

  // Onboarding banner
  showOnboardingBanner = false;

  // Indicadores economicos Colombia (defaults como fallback)
  trmHoy: number | null = null;
  trmCargando = false;
  indicadores = {
    salarioMinimo: 1623500,
    auxilioTransporte: 229468,
    uvt: 49799,
    anio: 2026,
  };

  constructor(
    private service: ServiciosService,
    private http: HttpClient,
    private afs: AngularFirestore
  ) {}

  ngOnInit() {
    this.currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    this.userActive = JSON.parse(localStorage.getItem('user') ?? '{}');

    // Construir set de paths del menú del rol — usado por canAccess() para
    // ocultar cards del welcome que el rol no puede usar.
    const rol = (this.userActive?.rol || this.userActive?.role || '').toLowerCase();
    this.isAdminRole = rol === 'administrador' || rol === 'super administrador';
    const menus = Array.isArray(this.userActive?.menu) ? this.userActive.menu : [];
    this.hasMenuMetadata = menus.length > 0;
    for (const m of menus) {
      if (m && typeof m.path === 'string') {
        // Normalizar: sin barra inicial (los routerLinks del HTML sí la llevan)
        this.userMenuPaths.add(m.path.replace(/^\/+/, ''));
      }
    }

    if (localStorage.getItem('showOnboardingBanner') === 'true') {
      this.showOnboardingBanner = true;
    }

    this.cargarTRM();
    this.cargarIndicadoresEconomicos();
  }

  /**
   * Verifica si el rol del usuario tiene acceso a un path específico del welcome.
   * - Admin/Super Admin: siempre true.
   * - Otros: chequea contra el set de menús asignados al rol.
   *
   * @param path Ruta del routerLink (con o sin barra inicial).
   * @returns true si el usuario puede ver la card.
   */
  canAccess(path: string): boolean {
    if (this.isAdminRole) return true;
    // Fallback defensivo: si el JWT no trae menu (sesión legacy / token viejo
    // anterior al cambio), mostrar TODO. Evita romper operación de users con
    // sesiones previas. Cuando re-loguean, el JWT nuevo trae menu y el filtro
    // empieza a aplicar.
    if (!this.hasMenuMetadata) return true;
    if (!path) return false;
    const normalized = path.replace(/^\/+/, '');
    return this.userMenuPaths.has(normalized);
  }

  /**
   * Verifica si el usuario tiene acceso a AL MENOS uno de los paths.
   * Útil para mostrar una sección entera del welcome que tiene varias cards
   * de la misma categoría.
   */
  canAccessAny(paths: string[]): boolean {
    if (this.isAdminRole) return true;
    if (!this.hasMenuMetadata) return true;
    return paths.some((p) => this.canAccess(p));
  }

  dismissOnboarding(): void {
    this.showOnboardingBanner = false;
    localStorage.removeItem('showOnboardingBanner');
  }

  cargarTRM(): void {
    this.trmCargando = true;
    this.http.get<any[]>('https://www.datos.gov.co/resource/mcec-87by.json?$limit=1&$order=vigenciadesde%20DESC')
      .subscribe({
        next: (data) => {
          if (data?.length > 0) {
            this.trmHoy = parseFloat(data[0].valor);
          }
          this.trmCargando = false;
        },
        error: () => { this.trmCargando = false; }
      });
  }

  /**
   * Carga indicadores económicos desde Firestore (colección config/indicadores_economicos).
   * Si no existe el documento, usa los valores hardcodeados como fallback.
   * Para actualizar: editar el doc en Firestore o crear un script.
   */
  private cargarIndicadoresEconomicos(): void {
    this.afs.doc('config/indicadores_economicos').valueChanges().subscribe({
      next: (data: any) => {
        if (data) {
          this.indicadores = {
            salarioMinimo: data.salarioMinimo || this.indicadores.salarioMinimo,
            auxilioTransporte: data.auxilioTransporte || this.indicadores.auxilioTransporte,
            uvt: data.uvt || this.indicadores.uvt,
            anio: data.anio || this.indicadores.anio,
          };
        }
      },
      error: () => { /* Usa fallback hardcodeado */ }
    });
  }
}
