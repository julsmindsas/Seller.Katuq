import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EjecutorRepeticion, RelojRepeticion, ResultadoRepeticion } from './ejecutor-repeticion';
import { EscenaRepetible } from './repeticion.tipos';

/**
 * "Repetir el día" (D-386, tarea 5.7): vuelve a contar el día de hoy en ~28 s, con cada llegada en
 * su hora real, un reloj de Colombia que avanza y una barra de progreso. Las cifras que se ven
 * (héroe, tarjetas, ventas por hora, pulso, carrera, eventos, etapas) salen de un estado simulado
 * que se pone en `EnVivoEstadoService` como sustituto; el estado real no se toca y el canal
 * sigue alimentándolo, así que al terminar la pantalla vuelve al estado real sin perder nada.
 *
 * - Comercio: reproduce los pedidos de hoy de la foto (`foto.pedidos`): cada llegada en su
 *   `horas.recibido`, los cambios de etapa con hora en su hora y los que no la tienen, al final.
 * - Toda Katuq: reproduce los eventos de hoy de la foto global y acumula las cifras por hora.
 *
 * Sin sonido, celebraciones ni narración (se callan con `EnVivoInteraccionService.repitiendo`); el
 * radar se congela solo. Los eventos simulados llegan a las escenas 3D por la interfaz
 * `EscenaRepetible` (registro con `registrarEscena`), igual que los reales.
 *
 * Quien enciende la repetición es el shell (botón del encabezado): `alRepetirDia` -> `iniciar()`.
 * Solo lectura: no escribe nada en el servidor ni cambia pedidos.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoRepeticionService implements OnDestroy {
  private readonly escenas = new Set<EscenaRepetible>();
  private readonly ejecutor: EjecutorRepeticion;
  private readonly suscripcion: Subscription;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly zona: NgZone
  ) {
    this.ejecutor = new EjecutorRepeticion(
      estado,
      interaccion,
      () => Array.from(this.escenas),
      this.relojReal()
    );
    // Si alguien cierra la repetición por fuera (el shell se destruye y reinicia la interacción), se corta aquí también.
    this.suscripcion = interaccion.repeticion$.subscribe((r) => {
      if (!r.activa && this.ejecutor.activa) this.ejecutor.cancelar();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion.unsubscribe();
    this.ejecutor.cancelar();
  }

  /** true mientras corre una repetición. */
  get repitiendo(): boolean {
    return this.ejecutor.activa;
  }

  /**
   * Empieza la repetición del día con el estado real de ahora. Si hoy no hubo llegadas (o aún no
   * hay datos) no hace nada y avisa con un aviso pasajero.
   */
  iniciar(): ResultadoRepeticion {
    return this.ejecutor.iniciar(Date.now());
  }

  /** Corta la repetición y deja todo en el estado real. */
  cancelar(): void {
    this.ejecutor.cancelar();
  }

  /** Una escena 3D se anota para recibir los eventos simulados. Se quita con `quitarEscena`. */
  registrarEscena(escena: EscenaRepetible): void {
    this.escenas.add(escena);
  }

  quitarEscena(escena: EscenaRepetible): void {
    this.escenas.delete(escena);
  }

  /** `performance.now()` y un temporizador fuera de la zona (cada cuadro vuelve a entrar para repintar). */
  private relojReal(): RelojRepeticion {
    return {
      ahora: () => performance.now(),
      cada: (ms, fn) => {
        let id = 0;
        this.zona.runOutsideAngular(() => {
          id = window.setInterval(() => this.zona.run(fn), ms);
        });
        return () => window.clearInterval(id);
      },
    };
  }
}
