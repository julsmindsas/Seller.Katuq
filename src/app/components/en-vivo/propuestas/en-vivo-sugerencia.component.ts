import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, NgZone, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnVivoPropuestasService, VistaPropuestas } from './en-vivo-propuestas.service';
import { CONFIRMAR_MS, ItemCola } from './propuestas.reglas';

type Confirmacion = 'uno' | 'todos';

/**
 * Tarjeta "Opttia propone" dentro de la escena de En vivo (D-421, fase 1). Una propuesta a la vez,
 * con su razón y lo que pasa de verdad al aprobar. Va dentro de `.ev-escena-slot`, entre la
 * narración y la ficha: arriba al centro en pantallas anchas y acoplada abajo en el celular.
 *
 * - Aprobar en DOS toques en el mismo botón: el primero cambia el texto a "Confirmar: …" con el
 *   efecto real y vuelve solo a los 5 s; el segundo aprueba ("Despachando…").
 * - Despachos: Aprobar, Ajustar (hoja lateral) y Después. Producción (sombra): "Así lo haría
 *   Opttia", sin botón. Cobro: "Abrir pedido" (no escribe nada).
 * - ← → recorren la cola y Esc es "Después". El lector de pantalla oye solo lo nuevo.
 * - En modo pantalla (TV) no hay botones (ocultos, no deshabilitados) y durante "Repetir el día"
 *   la tarjeta no se muestra.
 *
 * Toda la lógica vive en `EnVivoPropuestasService`; aquí solo se pinta y se arma la confirmación.
 */
@Component({
  selector: 'app-en-vivo-sugerencia',
  templateUrl: './en-vivo-sugerencia.component.html',
  styleUrls: ['./en-vivo-sugerencia.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoSugerenciaComponent implements OnDestroy {
  /** En la vista "Pedidos" (lista que se desplaza) la tarjeta se pega abajo del recuadro. */
  @Input() enLista = false;

  readonly vm$: Observable<VistaPropuestas>;

  /** Qué botón está esperando el segundo toque. */
  confirmando: Confirmacion | null = null;
  /** En el celular la razón se abre con "¿Por qué?". */
  razonAbierta = false;
  /** El menú "…" con "No hoy". */
  masAbierto = false;

  private confirmandoId: string | null = null;
  private temporizador = 0;
  private ultimoId: string | null = null;

  constructor(
    private readonly propuestas: EnVivoPropuestasService,
    private readonly zona: NgZone,
    private readonly cd: ChangeDetectorRef
  ) {
    this.vm$ = propuestas.vista$.pipe(
      tap((vm) => {
        const id = vm.item?.id ?? null;
        if (id === this.ultimoId) return;
        // Cambió la propuesta: se suelta la confirmación y se cierra lo que estaba abierto.
        this.ultimoId = id;
        this.razonAbierta = false;
        this.masAbierto = false;
        if (this.confirmando && this.confirmandoId !== id) this.soltarConfirmacion();
      })
    );
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.temporizador);
    this.propuestas.fijarConfirmando(false);
  }

  // ── Botones ───────────────────────────────────────────────────────────────

  /** Primer toque: pide confirmar. Segundo toque (en 5 s): aprueba. */
  tocarAprobar(vm: VistaPropuestas): void {
    this.propuestas.actividad();
    const it = vm.item;
    if (!it || !vm.aprobable || vm.falta || vm.bloqueado || vm.viejo || vm.ocupado || vm.tv || vm.repitiendo) return;
    if (this.confirmando === 'uno' && this.confirmandoId === it.id) {
      this.soltarConfirmacion();
      this.propuestas.aprobar(it.id);
      return;
    }
    this.armarConfirmacion('uno', it.id);
  }

  tocarAprobarTodos(vm: VistaPropuestas): void {
    this.propuestas.actividad();
    const it = vm.item;
    if (!it || !vm.todos || vm.bloqueado || vm.ocupado || vm.tv || vm.repitiendo) return;
    if (this.confirmando === 'todos' && this.confirmandoId === it.id) {
      this.soltarConfirmacion();
      this.propuestas.aprobarTodos();
      return;
    }
    this.armarConfirmacion('todos', it.id);
  }

  ajustar(): void {
    this.soltarConfirmacion();
    this.propuestas.abrirAjuste();
  }

  despues(): void {
    this.soltarConfirmacion();
    this.propuestas.despues();
  }

  noHoy(): void {
    this.soltarConfirmacion();
    this.masAbierto = false;
    this.propuestas.noHoy();
  }

  abrirPedido(it: ItemCola): void {
    this.propuestas.abrirPedido(it.pedidoId);
  }

  anterior(): void {
    this.soltarConfirmacion();
    this.propuestas.anterior();
  }

  siguiente(): void {
    this.soltarConfirmacion();
    this.propuestas.siguiente();
  }

  /**
   * "¿Por qué?" (celular): la tarjeta acoplada es baja y Aprobar va pegado abajo, así que al abrir la
   * razón la tarjeta se desplaza por dentro hasta ella (si no, quedaría debajo de los botones); al
   * cerrarla vuelve arriba.
   */
  alternarRazon(ev?: Event): void {
    this.razonAbierta = !this.razonAbierta;
    this.propuestas.actividad();
    const boton = ev?.currentTarget instanceof HTMLElement ? ev.currentTarget : null;
    const tarjeta = boton?.closest<HTMLElement>('.ev-sug');
    if (!boton || !tarjeta) return;
    const abierta = this.razonAbierta;
    // Después de pintar (la razón se muestra con la clase de la tarjeta).
    this.zona.runOutsideAngular(() =>
      window.requestAnimationFrame(() => {
        if (tarjeta.scrollHeight <= tarjeta.clientHeight) return;
        tarjeta.scrollTop = abierta ? Math.max(0, boton.offsetTop - 8) : 0;
      })
    );
  }

  alternarMas(): void {
    this.masAbierto = !this.masAbierto;
    this.propuestas.actividad();
  }

  actividad(): void {
    this.propuestas.actividad();
  }

  /** ← → recorren la cola; Esc suelta la confirmación o, si no hay, es "Después". */
  alTeclado(ev: KeyboardEvent, vm: VistaPropuestas): void {
    const destino = ev.target as HTMLElement | null;
    const etiqueta = destino?.tagName ?? '';
    if (etiqueta === 'SELECT' || etiqueta === 'INPUT' || etiqueta === 'TEXTAREA') return;
    if (vm.tv) return;
    switch (ev.key) {
      case 'ArrowLeft':
        ev.preventDefault();
        this.anterior();
        break;
      case 'ArrowRight':
        ev.preventDefault();
        this.siguiente();
        break;
      case 'Escape':
        ev.preventDefault();
        if (this.confirmando) {
          this.soltarConfirmacion();
          this.propuestas.actividad();
        } else if (this.masAbierto) {
          this.masAbierto = false;
        } else {
          this.despues();
        }
        break;
      default:
        break;
    }
  }

  // ── Textos ────────────────────────────────────────────────────────────────

  textoAprobar(vm: VistaPropuestas): string {
    if (vm.aplicando && !vm.aplicandoTodos) return 'Despachando…';
    if (this.confirmando === 'uno' && this.confirmandoId === vm.item?.id) return vm.confirmar;
    return 'Aprobar';
  }

  textoTodos(vm: VistaPropuestas): string {
    if (vm.aplicandoTodos) return 'Despachando los grupos…';
    if (!vm.todos) return '';
    if (this.confirmando === 'todos' && this.confirmandoId === vm.item?.id) return vm.todos.confirmar;
    return `Aprobar los ${vm.todos.grupos} grupos (${vm.todos.pedidos} ${vm.todos.pedidos === 1 ? 'pedido' : 'pedidos'})`;
  }

  /** En la TV no hay botones: se dice desde dónde se aprueba. */
  textoTv(it: ItemCola): string {
    if (it.modo === 'sombra') return 'Así lo haría Opttia · pronto se podrá aprobar';
    if (it.tipo === 'cobro') return 'Revísalo desde tu celular o el computador';
    return 'Apruébalo desde tu celular o el computador';
  }

  esConfirmando(tipo: Confirmacion, vm: VistaPropuestas): boolean {
    return this.confirmando === tipo && this.confirmandoId === vm.item?.id;
  }

  /** El resultado ya está y no se puede aprobar otra vez: no se muestran los botones de aprobar. */
  conResultadoFinal(vm: VistaPropuestas): boolean {
    return !!vm.resultado && vm.resultado.tono !== 't-bad';
  }

  trackChip(i: number): number {
    return i;
  }

  trackFuera(_: number, f: { id: string }): string {
    return f.id;
  }

  // ── Confirmación de dos toques ────────────────────────────────────────────

  private armarConfirmacion(tipo: Confirmacion, id: string): void {
    this.confirmando = tipo;
    this.confirmandoId = id;
    this.propuestas.fijarConfirmando(true);
    window.clearTimeout(this.temporizador);
    // Si no se confirma en 5 s, el botón vuelve solo a "Aprobar".
    this.zona.runOutsideAngular(() => {
      this.temporizador = window.setTimeout(() => {
        this.zona.run(() => {
          this.soltarConfirmacion();
          this.cd.markForCheck();
        });
      }, CONFIRMAR_MS);
    });
    this.cd.markForCheck();
  }

  private soltarConfirmacion(): void {
    window.clearTimeout(this.temporizador);
    if (!this.confirmando) return;
    this.confirmando = null;
    this.confirmandoId = null;
    this.propuestas.fijarConfirmando(false);
  }
}
