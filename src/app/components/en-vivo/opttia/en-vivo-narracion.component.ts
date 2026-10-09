import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { prefiereMenosMovimiento } from '../utilidades/movimiento';
import { EnVivoNarracionService } from './en-vivo-narracion.service';
import { LineaNarracion } from './opttia-narrador';
import { escribirAnimado, MS_POR_PASO_NARRACION } from './opttia-escritura';

/**
 * Barra de narración de Opttia sobre la escena: una línea que se escribe sola y cambia cada
 * 9 segundos (`EnVivoNarracionService`). Sin llamar al modelo. Se coloca DENTRO de un contenedor
 * con `position: relative` (la escena): la barra se centra abajo y no atrapa el puntero. Con
 * "reducir movimiento" la línea sale completa y sin animación. No se anuncia a lectores de
 * pantalla (cambia cada 9 s); lo mismo se lee en la tarjeta de Opttia y en la lista de eventos.
 *
 * Posición: `--ev-narra-abajo` (66 px por defecto) mueve la barra hacia arriba o abajo.
 */
@Component({
  selector: 'app-en-vivo-narracion',
  templateUrl: './en-vivo-narracion.component.html',
  styleUrls: ['./en-vivo-narracion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoNarracionComponent implements OnInit, OnDestroy {
  /** Lo que se ve ahora de la línea (se va completando al escribir). */
  texto = '';
  hayLinea = false;
  /** true cuando terminó de escribir: se apaga el cursor. */
  quieto = true;

  private suscripcion: Subscription | null = null;
  private cancelarEscritura: (() => void) | null = null;
  private destruido = false;

  constructor(
    private readonly narracion: EnVivoNarracionService,
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.narracion.iniciar();
    this.suscripcion = this.narracion.linea$.subscribe((linea) => this.mostrar(linea));
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.suscripcion?.unsubscribe();
    this.cancelarEscritura?.();
    this.cancelarEscritura = null;
    this.narracion.detener();
  }

  private mostrar(linea: LineaNarracion | null): void {
    this.cancelarEscritura?.();
    this.cancelarEscritura = null;

    if (!linea) {
      this.hayLinea = false;
      this.texto = '';
      this.quieto = true;
      this.cambios.markForCheck();
      return;
    }

    this.hayLinea = true;
    this.texto = '';
    this.quieto = false;
    this.cambios.markForCheck();
    // El temporizador va fuera de la zona (cada paso no debe disparar la detección de toda la app).
    this.zona.runOutsideAngular(() => {
      this.cancelarEscritura = escribirAnimado(
        linea.texto,
        { ms: MS_POR_PASO_NARRACION, reducir: prefiereMenosMovimiento() },
        (visible) => {
          this.texto = visible;
          this.pintar();
        },
        () => {
          this.quieto = true;
          this.pintar();
        }
      );
    });
  }

  private pintar(): void {
    if (!this.destruido) this.cambios.detectChanges();
  }
}
