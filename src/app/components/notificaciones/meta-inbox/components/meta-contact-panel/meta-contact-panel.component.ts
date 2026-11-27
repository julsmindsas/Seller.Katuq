import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { inicialesDe } from '../../../inbox-core/iniciales';
import { MetaInboxService } from '../../meta-inbox.service';
import { META_CANAL_LABEL, MetaCanal, MetaPerfilContacto } from '../../models/meta-thread.model';

/**
 * Panel de contacto de un hilo de Meta.
 *
 * La diferencia con WhatsApp: Instagram y Messenger NO entregan teléfono, así
 * que el cliente no se puede resolver solo. Mientras no haya vínculo, el panel
 * NO muestra pedidos de nadie — mostrar los del cliente equivocado, en un buzón
 * donde se habla de plata, es peor que no mostrar ninguno.
 *
 * El vínculo lo hace el operador a mano. El backend guarda su `origen` para que
 * una sugerencia automática futura entre como propuesta a confirmar.
 */
@Component({
  selector: 'app-meta-contact-panel',
  templateUrl: './meta-contact-panel.component.html',
  styleUrls: ['./meta-contact-panel.component.scss'],
})
export class MetaContactPanelComponent implements OnChanges, OnDestroy {
  @Input() canal: MetaCanal = 'instagram';
  @Input() identidadHash = '';
  @Input() nombrePerfil: string | null = null;

  perfil: MetaPerfilContacto | null = null;

  /** Nombre de la red para mostrar (marca, no se traduce). */
  get nombreCanal(): string {
    return META_CANAL_LABEL[this.canal];
  }
  cargando = false;

  buscando = false;
  termino = '';
  resultados: any[] = [];
  vinculando = false;

  private busqueda$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private perfilSub?: Subscription;

  constructor(
    private servicio: MetaInboxService,
    private maestros: MaestroService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {
    this.busqueda$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((t) => this.ejecutarBusqueda(t));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['identidadHash'] || changes['canal']) {
      this.resultados = [];
      this.termino = '';
      this.cargarPerfil();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarPerfil(): void {
    // Al cambiar de conversación se descarta la petición anterior y su perfil: una respuesta tardía
    // de otro chat nunca debe pintar su cliente y sus pedidos junto al chat actual.
    this.perfilSub?.unsubscribe();
    this.perfil = null;
    if (!this.identidadHash) {
      this.cargando = false;
      return;
    }
    this.cargando = true;
    this.perfilSub = this.servicio
      .perfilDeHilo(this.canal, this.identidadHash)
      .pipe(takeUntil(this.destroy$))
      .subscribe((p) => {
        this.perfil = p;
        this.cargando = false;
      });
  }

  alEscribir(termino: string): void {
    this.termino = termino;
    if (termino.trim().length >= 2) {
      this.buscando = true;
      this.busqueda$.next(termino.trim());
    } else {
      this.resultados = [];
      this.buscando = false;
    }
  }

  private ejecutarBusqueda(termino: string): void {
    this.maestros
      .searchClients(termino, 8)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r: any) => {
          this.resultados = Array.isArray(r) ? r : r?.data || [];
          this.buscando = false;
        },
        error: () => {
          this.resultados = [];
          this.buscando = false;
        },
      });
  }

  /** Nombre del contacto en la red, o «Contacto de Instagram» si la red no lo dio. */
  get nombreContacto(): string {
    return (
      (this.perfil?.perfilNombre || this.nombrePerfil || '').trim() ||
      this.translate.instant('notificaciones.meta.contactOf', { canal: this.nombreCanal })
    );
  }

  /** Iniciales del avatar (sin «@» ni emojis partidos); vacío = ícono de persona. */
  get iniciales(): string {
    return inicialesDe(this.perfil?.perfilNombre || this.nombrePerfil);
  }

  /**
   * Nombre de un cliente del buscador, como se ve en su ficha: el que arma el servidor (`displayLabel`),
   * luego nombres + apellidos, la razón social de una empresa y al final el nombre suelto.
   */
  nombreDe(cliente: any): string {
    const completo = [cliente?.nombres_completos, cliente?.apellidos_completos]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
      .join(' ');
    return (
      (typeof cliente?.displayLabel === 'string' && cliente.displayLabel.trim()) ||
      completo ||
      cliente?.razon_social ||
      cliente?.nombre_completo ||
      cliente?.nombre ||
      this.translate.instant('notificaciones.meta.unnamedCustomer')
    );
  }

  /** Teléfono del resultado con solo los últimos 4 dígitos a la vista («··· 4567»). Vacío si no hay. */
  telefonoDe(cliente: any): string {
    const crudo = String(cliente?.numero_celular_whatsapp || cliente?.telefono || cliente?.numero_celular || '');
    const digitos = crudo.replace(/\D/g, '');
    if (digitos.length < 4) return '';
    return `··· ${digitos.slice(-4)}`;
  }

  /** El buscador entrega el id de la ficha en `cd`; `id` y `docId` quedan de respaldo. */
  private idDe(cliente: any): string {
    const id = cliente?.cd || cliente?.id || cliente?.docId;
    return typeof id === 'string' ? id : '';
  }

  vincular(cliente: any): void {
    const id = this.idDe(cliente);
    if (!id || this.vinculando) return;

    const { canal, identidadHash } = this;
    this.vinculando = true;
    this.servicio
      .vincularCliente(canal, identidadHash, id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((p) => {
        this.vinculando = false;
        if (canal !== this.canal || identidadHash !== this.identidadHash) return;
        if (!p) {
          // Antes fallaba en silencio: el asesor tocaba el cliente y no pasaba nada.
          this.toastr.error(this.translate.instant('notificaciones.redes2.vincularError'));
          return;
        }
        this.perfil = p;
        this.resultados = [];
        this.termino = '';
      });
  }

  desvincular(): void {
    if (this.vinculando) return;
    const { canal, identidadHash } = this;
    this.vinculando = true;
    this.servicio
      .desvincularCliente(canal, identidadHash)
      .pipe(takeUntil(this.destroy$))
      .subscribe((p) => {
        this.vinculando = false;
        if (canal !== this.canal || identidadHash !== this.identidadHash) return;
        if (!p) {
          this.toastr.error(this.translate.instant('notificaciones.redes2.desvincularError'));
          return;
        }
        this.perfil = p;
      });
  }

  trackCliente(_: number, c: any): string {
    return this.idDe(c) || String(_);
  }
}
