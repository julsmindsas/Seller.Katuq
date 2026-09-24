import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { Sitio, SitiosService } from '../../../../components/sitios/sitios.service';
import { MarketingCorreoService, Suscriptor } from '../../services/marketing-correo.service';

/**
 * Quién autorizó recibir los correos de la tienda (D-318), con la prueba de
 * cada autorización: desde cuándo, desde dónde y el texto que aceptó. Es lo
 * que el comercio muestra si alguien le reclama por haberle escrito.
 */
@Component({
  selector: 'app-suscriptores-correo',
  templateUrl: './suscriptores-correo.component.html',
  styleUrls: ['./suscriptores-correo.component.scss'],
})
export class SuscriptoresCorreoComponent implements OnInit {
  sitios: Sitio[] = [];
  siteId = '';
  cargando = true;
  noDisponible = false;
  filtro: 'todos' | 'suscrito' | 'baja' | 'suprimido' = 'todos';
  busqueda = '';
  items: Suscriptor[] = [];
  totales = { suscritos: 0, bajas: 0, suprimidos: 0 };

  readonly origenes: Record<string, string> = {
    checkout: 'Al comprar',
    formulario: 'Formulario de contacto',
    boletin: 'Boletín',
    cuenta: 'Su cuenta',
    reactivacion: 'Deshizo la baja',
  };

  constructor(private correo: MarketingCorreoService, private sitiosService: SitiosService) {}

  ngOnInit(): void {
    this.sitiosService.listar().subscribe({
      next: (r) => {
        this.sitios = (r.data || []).filter((s) => s.estado === 'publicado');
        this.siteId = this.sitios.length ? this.sitios[0].id : '';
        this.cargar();
      },
      error: () => (this.cargando = false),
    });
  }

  cargar(): void {
    if (!this.siteId) {
      this.cargando = false;
      return;
    }
    this.cargando = true;
    this.correo.suscriptores(this.siteId).subscribe({
      next: (r) => {
        this.items = r.data.items || [];
        this.totales = r.data.totales;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        if (e && e.status === 404) this.noDisponible = true;
      },
    });
  }

  get visibles(): Suscriptor[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.items.filter(
      (s) =>
        (this.filtro === 'todos' || s.estado === this.filtro) &&
        (!q || s.correo.includes(q) || (s.nombre || '').toLowerCase().includes(q)),
    );
  }

  verEvidencia(s: Suscriptor): void {
    const a = s.autorizacion;
    if (!a) return;
    const fecha = new Date(a.fecha).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
    Swal.fire({
      title: 'Autorización',
      html:
        '<div style="text-align:left;font-size:14px;line-height:1.6">' +
        `<b>Correo:</b> ${this.esc(s.correo)}<br>` +
        `<b>Fecha:</b> ${this.esc(fecha)}<br>` +
        `<b>Desde:</b> ${this.esc(this.origenes[a.origen] || a.origen)}<br>` +
        `<b>Texto aceptado (${this.esc(a.version)}):</b><br><i>“${this.esc(a.texto)}”</i></div>`,
      confirmButtonText: 'Listo',
    });
  }

  private esc(v: string): string {
    const d = document.createElement('div');
    d.textContent = String(v || '');
    return d.innerHTML;
  }
}
