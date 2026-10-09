import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { sesionEsAdministrador } from '../paginas/sesion-katuq';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EnVivoService } from '../servicios/en-vivo.service';

/**
 * Botón "Opttia" del encabezado de "En vivo" (D-386): prende o apaga a Opttia para la empresa de
 * la sesión. En "Katuq en vivo" (sesión de Julsmind) es el de toda la plataforma. Solo lo ven el
 * Administrador y el Super Administrador; el servidor rechaza a los demás. Con el interruptor general
 * del servidor apagado (`EN_VIVO_OPTTIA=false`) queda deshabilitado: "apagado por Katuq".
 *
 * Tras guardar, `EnVivoEstadoService.cambiarOpttia` lo muestra o lo esconde sin recargar.
 */
@Component({
  selector: 'app-en-vivo-opttia-interruptor',
  templateUrl: './en-vivo-opttia-interruptor.component.html',
  styleUrls: ['./en-vivo-opttia-interruptor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoOpttiaInterruptorComponent implements OnInit, OnDestroy {
  /** true en "Katuq en vivo": el aviso dice que aplica a todos los comercios juntos. */
  @Input() katuq = false;

  /** null hasta que responde el servidor (o si no se puede leer): el botón no se pinta. */
  activado: boolean | null = null;
  general = true;
  guardando = false;

  private readonly suscripciones = new Subscription();

  constructor(
    private readonly api: EnVivoService,
    private readonly estado: EnVivoEstadoService,
    private readonly cambios: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!sesionEsAdministrador()) return;
    this.suscripciones.add(
      this.api.interruptorOpttia().subscribe({
        next: (r) => {
          this.activado = r?.activado !== false;
          this.general = r?.general !== false;
          this.cambios.markForCheck();
        },
        error: () => {
          this.activado = null;
          this.cambios.markForCheck();
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  get prendido(): boolean {
    return this.general && this.activado === true;
  }

  get texto(): string {
    if (!this.general) return 'Opttia apagado por Katuq';
    return this.activado ? 'Opttia prendido' : 'Opttia apagado';
  }

  get titulo(): string {
    if (!this.general) return 'Katuq apagó a Opttia en En vivo para todos los comercios.';
    return this.activado
      ? 'Opttia analiza la operación y responde preguntas. Clic para apagarlo.'
      : 'Opttia no analiza ni responde aquí. Clic para prenderlo.';
  }

  cambiar(): void {
    if (this.activado === null || !this.general || this.guardando) return;
    const nuevo = !this.activado;
    const alcance = this.katuq
      ? '<p style="color:#6b7280;margin:12px 0 0;font-size:13px;">Aplica a "Katuq en vivo" (todos los comercios juntos).</p>'
      : '<p style="color:#6b7280;margin:12px 0 0;font-size:13px;">Aplica a todas las pantallas En vivo de tu empresa.</p>';
    Swal.fire({
      title: nuevo ? '¿Prender a Opttia?' : '¿Apagar a Opttia?',
      html:
        (nuevo
          ? 'Opttia vuelve a analizar la operación (un resumen cada 15 a 30 minutos) y a responder preguntas.'
          : 'Opttia deja de analizar y de responder. Las cifras, la escena y los eventos siguen igual.') + alcance,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: nuevo ? 'Sí, prender' : 'Sí, apagar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.guardando = true;
      this.cambios.markForCheck();
      this.suscripciones.add(
        this.api.guardarInterruptorOpttia(nuevo).subscribe({
          next: () => {
            this.activado = nuevo;
            this.guardando = false;
            this.estado.cambiarOpttia(nuevo);
            this.cambios.markForCheck();
          },
          error: (e) => {
            this.guardando = false;
            this.cambios.markForCheck();
            Swal.fire('Error', e?.error?.message || 'No fue posible guardar el cambio.', 'error');
          },
        })
      );
    });
  }
}
