import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { MetaInboxService } from '../../meta-inbox.service';
import { MetaCanal, MetaPerfilContacto } from '../../models/meta-thread.model';

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
  cargando = false;

  buscando = false;
  termino = '';
  resultados: any[] = [];
  vinculando = false;

  private busqueda$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private servicio: MetaInboxService,
    private maestros: MaestroService,
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
    if (!this.identidadHash) return;
    this.cargando = true;
    this.servicio
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

  nombreDe(cliente: any): string {
    return (
      cliente?.nombre_completo ||
      cliente?.nombre ||
      cliente?.razon_social ||
      'Cliente sin nombre'
    );
  }

  vincular(cliente: any): void {
    const id = cliente?.id || cliente?.docId;
    if (!id || this.vinculando) return;

    this.vinculando = true;
    this.servicio
      .vincularCliente(this.canal, this.identidadHash, id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((p) => {
        this.vinculando = false;
        if (p) {
          this.perfil = p;
          this.resultados = [];
          this.termino = '';
        }
      });
  }

  desvincular(): void {
    if (this.vinculando) return;
    this.vinculando = true;
    this.servicio
      .desvincularCliente(this.canal, this.identidadHash)
      .pipe(takeUntil(this.destroy$))
      .subscribe((p) => {
        this.vinculando = false;
        if (p) this.perfil = p;
      });
  }

  trackCliente(_: number, c: any): string {
    return c?.id || c?.docId || String(_);
  }
}
