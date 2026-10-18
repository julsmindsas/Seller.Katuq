import { Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Escala NPS de 0 a 10 (D-483). La usan la tarjeta del Seller y la página pública de la
 * encuesta a compradores.
 *
 * Accesible como grupo de radios: un solo tope de tabulación (el escogido o el 0), las
 * flechas mueven el foco y Enter o espacio escogen. Las flechas no escogen solas porque
 * cada nota escogida se registra de inmediato en el servidor.
 */
@Component({
  selector: 'app-escala-nps',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './escala-nps.component.html',
  styleUrls: ['./escala-nps.component.scss'],
})
export class EscalaNpsComponent {
  /** Nota escogida (null si todavía no hay). */
  @Input() set valor(v: number | null) {
    this._valor = typeof v === 'number' && v >= 0 && v <= 10 ? v : null;
    if (this._valor !== null) this.foco = this._valor;
  }
  get valor(): number | null { return this._valor; }

  /** Nombre del grupo para lectores de pantalla, si no hay un título que lo nombre. */
  @Input() etiqueta = 'Nota del 0 al 10';
  /** Id del elemento que nombra el grupo (p. ej. la pregunta); tiene prioridad sobre `etiqueta`. */
  @Input() etiquetadoPor: string | null = null;

  @Output() cambio = new EventEmitter<number>();

  @ViewChildren('opcion') private opciones!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly notas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  /** Opción con el tope de tabulación. */
  foco = 0;
  private _valor: number | null = null;

  escoger(n: number): void {
    this.foco = n;
    if (n === this._valor) return;
    this._valor = n;
    this.cambio.emit(n);
  }

  teclado(evento: KeyboardEvent): void {
    const destino = this.destinoDeTecla(evento.key);
    if (destino === null) return;
    evento.preventDefault();
    this.foco = destino;
    this.opciones.get(destino)?.nativeElement.focus();
  }

  ariaDe(n: number): string {
    if (n === 0) return '0, nada probable';
    if (n === 10) return '10, muy probable';
    return String(n);
  }

  private destinoDeTecla(tecla: string): number | null {
    switch (tecla) {
      case 'ArrowRight':
      case 'ArrowDown':
        return this.foco === 10 ? 0 : this.foco + 1;
      case 'ArrowLeft':
      case 'ArrowUp':
        return this.foco === 0 ? 10 : this.foco - 1;
      case 'Home':
        return 0;
      case 'End':
        return 10;
      default:
        return null;
    }
  }
}
