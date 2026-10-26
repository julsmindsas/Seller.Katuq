import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { take } from 'rxjs/operators';
import { TicketsSoporteService } from '../../services/soporte/tickets-soporte.service';
import { SecurityService } from '../../services/security/security.service';
import { Menu, NavService } from '../../services/nav.service';
import { CATEGORIA_POR_DEFECTO } from '../../data/clasificacion-tickets';
import { rutaSinQuery } from '../../data/rutas-publicas';

import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
type TipoOpinion = 'idea' | 'bug';

interface OpcionOpinion {
  key: TipoOpinion;
  /** Lo que ya entiende Support: 'idea' sale en "Mis ideas", 'soporte' en "Mis tickets". */
  motivo: 'idea' | 'soporte';
  label: string;
  ayuda: string;
  icono: string;
  destino: { ruta: string; nombre: string };
}

const TIPOS: OpcionOpinion[] = [
  {
    key: 'idea', motivo: 'idea', label: 'opinarModal.tipos.ideaLabel', ayuda: 'opinarModal.tipos.ideaAyuda',
    icono: 'pi-star', destino: { ruta: '/misIdeas', nombre: 'opinarModal.tipos.ideaDestino' },
  },
  {
    key: 'bug', motivo: 'soporte', label: 'opinarModal.tipos.bugLabel', ayuda: 'opinarModal.tipos.bugAyuda',
    icono: 'pi-exclamation-triangle', destino: { ruta: '/misTickets', nombre: 'opinarModal.tipos.bugDestino' },
  },
];

/** Primeras palabras del texto, sin cortar una palabra a la mitad. */
export function asuntoDe(texto: string, max = 70): string {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max - 1);
  const ultimoEspacio = corte.lastIndexOf(' ');
  const base = ultimoEspacio > max / 2 ? corte.slice(0, ultimoEspacio) : corte;
  return base.replace(/[\s.,;:¡!¿?-]+$/, '') + '…';
}

/**
 * Nombre de la pantalla en el menú (la ruta más larga que coincida). D-546: una pantalla dentro de un grupo se
 * nombra con su grupo, porque los nombres cortos se repiten («Listado» de Clientes, de Cotizaciones y de Productos):
 * «Bodegas · Ajustes». Un grupo de un solo hijo se dibuja como enlace y se nombra como él; un grupo `inline`
 * (Finanzas, Comunicaciones) no se ve, así que sus entradas van solas.
 */
export function nombreDePantalla(ruta: string, menu: Menu[] | undefined): string | null {
  let titulo: string | null = null;
  let largo = 0;
  const pendientes: Array<{ item: Menu; padre?: Menu }> = (menu || []).map(item => ({ item }));
  while (pendientes.length) {
    const { item, padre } = pendientes.pop() as { item: Menu; padre?: Menu };
    if (item.children) pendientes.push(...item.children.map(hijo => ({ item: hijo, padre: item })));
    if (!item.path || !item.title) continue;
    const p = '/' + item.path.replace(/^\/+/, '');
    if ((ruta === p || ruta.startsWith(p + '/')) && p.length > largo) {
      largo = p.length;
      titulo = nombreEnMenu(item, padre);
    }
  }
  return titulo;
}

function nombreEnMenu(item: Menu, padre?: Menu): string {
  if (!padre || !padre.title || padre.display === 'inline') return item.title as string;
  const navegables = (padre.children || []).filter(hijo => hijo.type !== 'info');
  if (navegables.length <= 1) return padre.title;
  return padre.title === item.title ? padre.title : `${padre.title} · ${item.title}`;
}

/**
 * "Opinar" (D-483): atajo de un solo campo que crea el mismo ticket que Soporte, por el
 * mismo servicio. La pantalla de origen se guarda sola (campo `pantalla` y pie de la
 * descripción, para que el equipo la vea sin cambiar Support).
 */
@Component({
  selector: 'app-opinar-modal',
  standalone: true,
  imports: [TranslateModule, CommonModule, FormsModule],
  templateUrl: './opinar-modal.component.html',
  styleUrls: ['./opinar-modal.component.scss'],
})
export class OpinarModalComponent {
  readonly MIN = 10;
  readonly MAX = 2000;
  readonly tipos = TIPOS;

  tipo: TipoOpinion | null = null;
  texto = '';
  intento = false;
  enviando = false;
  error: string | null = null;

  /** Ruta desde donde se abrió, sin query (puede traer búsquedas o datos del cliente). */
  readonly pantalla: string;
  readonly nombrePantalla: string | null;

  constructor(
    public activeModal: NgbActiveModal,
    private router: Router,
    private security: SecurityService,
    private ticketsSoporte: TicketsSoporteService,
    private toastr: ToastrService,
    nav: NavService,
    private translate: TranslateService,
  ) {
    this.pantalla = rutaSinQuery(this.router.url);
    this.nombrePantalla = nombreDePantalla(this.pantalla, nav.ALLMENUITEMS);
  }

  get largo(): number { return this.texto.trim().length; }
  get textoValido(): boolean { return this.largo >= this.MIN && this.largo <= this.MAX; }
  get opcion(): OpcionOpinion | undefined { return TIPOS.find((t) => t.key === this.tipo); }

  async enviar(): Promise<void> {
    if (this.enviando) return;
    this.intento = true;
    this.error = null;
    const opcion = this.opcion;
    if (!opcion || !this.textoValido) return;

    // Empresa activa desde la fuente canónica; sin ella no se crea un ticket huérfano
    const empresa = this.security.getCompanyInformationLogged();
    if (!empresa?.nombreComercio) {
      this.error = this.translate.instant('opinarModal.opinarModal.noPudimosIdentificarTuComercio');
      return;
    }
    const usuario = this.usuarioActual();

    this.enviando = true;
    try {
      const ticket = await this.ticketsSoporte.preparar(this.armarDatos(opcion, usuario), empresa, usuario);
      this.ticketsSoporte.enviar(ticket, empresa, usuario).subscribe({
        next: ({ numeroVisible }) => {
          this.enviando = false;
          this.avisarEnviado(numeroVisible, opcion);
          this.activeModal.close(numeroVisible);
        },
        error: () => this.fallo(),
      });
    } catch {
      this.fallo();
    }
  }

  cerrar(): void {
    if (!this.enviando) this.activeModal.dismiss();
  }

  /** Los mismos campos que arma Soporte; identidad, número y responsable los pone el servicio. */
  private armarDatos(opcion: OpcionOpinion, usuario: any): any {
    const hoy = new Date().toISOString().split('T')[0];
    const texto = this.texto.trim();
    const lugar = this.nombrePantalla ? `${this.nombrePantalla} (${this.pantalla})` : this.pantalla;
    return {
      adjuntos: [],
      ticketComments: '',
      canal: 'opinar',
      categoria: CATEGORIA_POR_DEFECTO.valor,
      subcategoria: CATEGORIA_POR_DEFECTO.subcategorias[0].valor,
      motivo: opcion.motivo,
      tipoSolicitud: opcion.key,
      nombreUsuarioReporta: usuario?.name || usuario?.email || '',
      fechaRegistro: hoy,
      fechaEvento: hoy,
      asunto: asuntoDe(texto),
      descripcion: `${texto}\n\n—\nPantalla: ${lugar}`,
      pantalla: this.pantalla,
      status: 'Pendiente',
      prioridad: 'media',
      base64String: '',
    };
  }

  private avisarEnviado(numero: string | number, opcion: OpcionOpinion): void {
    const aviso = this.toastr.success(
      this.translate.instant('opinarModal.opinarModal.quedoConElNumero', { numero, destino: this.translate.instant(opcion.destino.nombre) }),
      this.translate.instant('opinarModal.opinarModal.graciasLoLeemosTodo'),
      { timeOut: 8000, closeButton: true, progressBar: true },
    );
    aviso.onTap.pipe(take(1)).subscribe(() => this.router.navigate([opcion.destino.ruta]));
  }

  private fallo(): void {
    this.enviando = false;
    this.error = this.translate.instant('opinarModal.opinarModal.noPudimosEnviarloRevisaTu');
  }

  private usuarioActual(): any {
    try {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }
}

/**
 * Abre "Opinar". NgbModal lo monta en el body: declarado dentro de la pantalla quedaría
 * atrapado bajo el menú (contexto de apilamiento de `.page-body`). Lo usan el botón del
 * header (escritorio) y el menú de la cuenta (celular, donde la barra no tiene espacio).
 */
export function abrirOpinar(modal: NgbModal): void {
  const ref = modal.open(OpinarModalComponent, {
    centered: true,
    backdrop: 'static', // un clic afuera no borra lo escrito; Esc y la X sí cierran
    modalDialogClass: 'katuq-modal',
    ariaLabelledBy: 'opinar-titulo',
    beforeDismiss: () => !ref.componentInstance?.enviando,
  });
  ref.result.catch(() => { /* cerrado sin enviar */ });
}
