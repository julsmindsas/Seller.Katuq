import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { crearGrupoPunto, GrupoRecogida } from './domicilios.formularios';
import { puedeAdministrarIntegracion } from './domicilios.integracion';
import { ConfiguracionDomicilios, PuntoDomicilio } from './domicilios.models';
import { DomiciliosService } from './domicilios.service';
import { interpretarErrorDomicilios } from './domicilios.errores';
import { PUNTO_VACIO } from './domicilios.utils';

export type PestanaDomicilios = 'nuevo' | 'archivo' | 'lista' | 'integracion';

interface DefinicionPestana {
  clave: PestanaDomicilios;
  texto: string;
  icono: string;
}

const PESTANAS: DefinicionPestana[] = [
  { clave: 'nuevo', texto: 'Nuevo domicilio', icono: 'pi-plus' },
  { clave: 'archivo', texto: 'Cargar archivo', icono: 'pi-upload' },
  { clave: 'lista', texto: 'Mis domicilios', icono: 'pi-list' },
  { clave: 'integracion', texto: 'Integración', icono: 'pi-cog' }
];

/**
 * Domicilios: monta entregas a mano o por archivo, las sigue y administra la integración por API.
 * Esta pantalla solo reparte el trabajo entre las pestañas; cada una vive en su componente.
 *
 * - «Nuevo domicilio», «Cargar archivo» y «Mis domicilios» se crean la primera vez que se abren y se
 *   conservan (ocultas) para no perder lo que la persona tenía a medias.
 * - «Integración» se crea al abrirla y se destruye al salir: así ningún secreto queda en pantalla.
 */
@Component({
  selector: 'app-domicilios',
  templateUrl: './domicilios.component.html',
  styleUrls: ['./domicilios.component.scss']
})
export class DomiciliosComponent implements OnInit, OnDestroy {
  /** Solo decide qué se muestra; el candado real es del servidor (403). */
  readonly esAdmin = this.leerSiEsAdmin();
  readonly pestanas: DefinicionPestana[] = PESTANAS.filter(p => p.clave !== 'integracion' || this.esAdmin);

  pestana: PestanaDomicilios = 'nuevo';
  private readonly visitadas = new Set<PestanaDomicilios>(['nuevo']);

  /** Configuración del comercio; `null` si no se pudo leer (por ejemplo, un usuario que no es administrador). */
  config: ConfiguracionDomicilios | null = null;
  avisoConfig: string | null = null;
  readonly recogida: GrupoRecogida = crearGrupoPunto();

  /** Texto que «Mis domicilios» pone en su búsqueda cuando se llega desde «Nuevo domicilio». */
  busquedaLista = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly servicio: DomiciliosService,
    private readonly ruta: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const pedida = this.ruta.snapshot.queryParamMap.get('pestana') as PestanaDomicilios | null;
    if (pedida && this.pestanas.some(p => p.clave === pedida)) this.seleccionar(pedida);
    this.cargarConfiguracion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** La configuración trae la recogida guardada del comercio; para quien no es administrador el servidor responde 403 y se sigue sin ella. */
  private cargarConfiguracion(): void {
    this.servicio
      .configuracion()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: config => this.alCambiarConfiguracion(config),
        error: err => {
          const e = interpretarErrorDomicilios(err);
          if (e.status !== 403) {
            this.avisoConfig = 'No pudimos traer tu dirección de recogida guardada. Escríbela a mano.';
          }
        }
      });
  }

  /** Se llama al leer la configuración y cada vez que la pestaña Integración la cambia. */
  alCambiarConfiguracion(config: ConfiguracionDomicilios): void {
    this.config = config;
    // Lo que la persona ya escribió a mano no se pisa.
    if (!this.recogida.dirty) this.recogida.reset({ ...PUNTO_VACIO, ...config.recogidaPorDefecto });
  }

  alGuardarRecogida(punto: Partial<PuntoDomicilio>): void {
    if (this.config) this.config = { ...this.config, recogidaPorDefecto: punto };
  }

  // --- Pestañas -------------------------------------------------------------

  seleccionar(clave: PestanaDomicilios): void {
    if (!this.pestanas.some(p => p.clave === clave)) return;
    this.pestana = clave;
    this.visitadas.add(clave);
  }

  fueVisitada(clave: PestanaDomicilios): boolean {
    return this.visitadas.has(clave);
  }

  /** Flechas, Inicio y Fin mueven entre pestañas (patrón de pestañas accesibles). */
  alTeclado(evento: KeyboardEvent): void {
    const n = this.pestanas.length;
    let i = this.pestanas.findIndex(p => p.clave === this.pestana);
    switch (evento.key) {
      case 'ArrowRight': i = (i + 1) % n; break;
      case 'ArrowLeft': i = (i - 1 + n) % n; break;
      case 'Home': i = 0; break;
      case 'End': i = n - 1; break;
      default: return;
    }
    evento.preventDefault();
    const destino = this.pestanas[i].clave;
    this.seleccionar(destino);
    document.getElementById(this.idPestana(destino))?.focus();
  }

  idPestana(clave: PestanaDomicilios): string {
    return `dom-pestana-${clave}`;
  }

  idPanel(clave: PestanaDomicilios): string {
    return `dom-panel-${clave}`;
  }

  verEnLista(numero: string): void {
    this.busquedaLista = numero;
    this.seleccionar('lista');
  }

  trackPorClave(_i: number, p: DefinicionPestana): string {
    return p.clave;
  }

  private leerSiEsAdmin(): boolean {
    try {
      const crudo = localStorage.getItem('user');
      return puedeAdministrarIntegracion(crudo ? JSON.parse(crudo) : null);
    } catch {
      return false;
    }
  }
}
