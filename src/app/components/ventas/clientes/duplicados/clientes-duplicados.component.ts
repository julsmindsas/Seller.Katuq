import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { ClientesListaService, DuplicadoGrupo } from '../services/clientes-lista.service';

/** Veces seguidas que se revisa otra tanda sola cuando la anterior no trajo ningún grupo. */
const TANDAS_AUTOMATICAS = 8;

type Criterio = 'documento' | 'nombre';

/**
 * Vista «Posibles duplicados» de Clientes (ticket 1462, D-667, fase 1). SOLO LEE: muestra grupos de fichas que
 * parecen la misma persona o empresa (mismo documento sin contar el dígito de verificación, o mismo nombre y
 * mismo teléfono o correo) con sus pedidos y saldo. Se abre desde la lista de Clientes con la bandera
 * `calidadDatosClientes`, para Administrador y Tesorería. No fusiona nada: abrir una ficha reutiliza la
 * edición de siempre.
 *
 * El servidor revisa el índice por tandas (no toda la empresa a la vez): `siguiente` pide la tanda que sigue.
 */
@Component({
  selector: 'app-clientes-duplicados',
  templateUrl: './clientes-duplicados.component.html',
  styleUrls: ['./clientes-duplicados.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesDuplicadosComponent implements OnInit, OnDestroy {
  /** Pide abrir la ficha de un cliente (la lista la abre con su ventana de edición). */
  @Output() abrir = new EventEmitter<{ cd: string }>();

  criterio: Criterio = 'documento';
  grupos: DuplicadoGrupo[] = [];
  siguiente: string | null = null;
  cargando = false;
  error = false;
  revisadas = 0;

  private sub?: Subscription;
  private tandasSinGrupos = 0;

  constructor(private servicio: ClientesListaService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.reiniciar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  cambiarCriterio(criterio: Criterio): void {
    if (criterio === this.criterio) { return; }
    this.criterio = criterio;
    this.reiniciar();
  }

  reiniciar(): void {
    this.sub?.unsubscribe();
    this.grupos = [];
    this.siguiente = null;
    this.revisadas = 0;
    this.error = false;
    this.tandasSinGrupos = 0;
    this.cargar();
  }

  /** Revisa la tanda siguiente (o la primera). Si no trae grupos, sigue sola unas cuantas tandas más. */
  cargar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.error = false;
    const criterio = this.criterio;
    this.sub = this.servicio.listarDuplicados(criterio, this.siguiente).subscribe({
      next: (pagina) => {
        if (criterio !== this.criterio) { return; }
        // Defensa: si una tanda trae un grupo que ya se muestra (mismo motivo, clave y fichas), no se repite.
        const vistos = new Set(this.grupos.map((g) => this.trackGrupo(0, g)));
        const nuevos = (pagina.grupos || []).filter((g) => !vistos.has(this.trackGrupo(0, g)));
        this.grupos = [...this.grupos, ...nuevos];
        this.revisadas += pagina.escaneadas || 0;
        this.siguiente = pagina.siguiente || null;
        this.tandasSinGrupos = nuevos.length ? 0 : this.tandasSinGrupos + 1;
        if (this.siguiente && this.tandasSinGrupos > 0 && this.tandasSinGrupos < TANDAS_AUTOMATICAS && !this.grupos.length) {
          this.cargar();
          return;
        }
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.error = true;
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  verFicha(cd: string): void {
    this.abrir.emit({ cd });
  }

  trackGrupo(_: number, g: DuplicadoGrupo): string {
    return `${g.motivo}:${g.clave}:${g.fichas.map((f) => f.cd).join(',')}`;
  }

  trackFicha(_: number, f: { cd: string }): string {
    return f.cd;
  }

  get hayMas(): boolean {
    return !!this.siguiente && !this.cargando;
  }

  get terminado(): boolean {
    return !this.siguiente && !this.cargando && !this.error;
  }
}
