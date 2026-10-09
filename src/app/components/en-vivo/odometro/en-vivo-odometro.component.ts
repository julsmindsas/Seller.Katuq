import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Una posición del odómetro, contada desde la derecha para que cada dígito conserve su columna. */
interface Columna {
  /** 0 = la última (unidades). */
  pos: number;
  /** Dígito 0 a 9, o null si es un símbolo ("$", "."). */
  digito: number | null;
  simbolo: string;
}

const DIGITOS: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Odómetro: cada dígito es una columna del 0 al 9 que rueda hasta su valor. Las posiciones se
 * cuentan desde la derecha: cuando el número crece ("$999.999" → "$1.000.000") los dígitos que
 * ya estaban siguen en su columna y ruedan, y solo aparece la nueva. El valor lo pone quien lo
 * usa (viene del servidor); aquí solo se pinta. Con "reducir movimiento" el cambio es de una.
 */
@Component({
  selector: 'app-en-vivo-odometro',
  templateUrl: './en-vivo-odometro.component.html',
  styleUrls: ['./en-vivo-odometro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoOdometroComponent {
  readonly digitos = DIGITOS;
  columnas: Columna[] = [];
  private textoActual = '';

  /** El número ya escrito ("$1.284.500"). */
  @Input() set texto(valor: string | null | undefined) {
    const texto = valor ?? '';
    this.textoActual = texto;
    const caracteres = Array.from(texto);
    this.columnas = caracteres.map((c, i) => ({
      pos: caracteres.length - 1 - i,
      digito: /\d/.test(c) ? Number(c) : null,
      simbolo: c,
    }));
  }

  /** Lo que lee un lector de pantalla (por defecto, el mismo número). */
  @Input() leyenda = '';

  get anunciar(): string {
    return this.leyenda || this.textoActual;
  }

  porPosicion(_: number, columna: Columna): number {
    return columna.pos;
  }

  porDigito(indice: number): number {
    return indice;
  }
}
