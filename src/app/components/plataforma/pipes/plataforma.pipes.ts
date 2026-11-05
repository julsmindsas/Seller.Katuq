import { Pipe, PipeTransform } from '@angular/core';
import { Cifra } from '../plataforma.tipos';
import { CifraPintada, fechaCo, formatearCop, pintarCifra } from '../logica/formato';

/** Pesos con separador de miles; `null` es «—». */
@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatearCop(valor);
  }
}

/** Fecha o instante en hora de Colombia; sin valor, «—». */
@Pipe({ name: 'fechaCo' })
export class FechaCoPipe implements PipeTransform {
  transform(valor: string | number | Date | null | undefined, conHora = true): string {
    return fechaCo(valor, conHora);
  }
}

/** Cifra del servidor → `{ texto, insignia, nulo }`: `null` se pinta «—» con la insignia de su estado. */
@Pipe({ name: 'metrica' })
export class MetricaPipe implements PipeTransform {
  transform(c: Cifra | null | undefined): CifraPintada {
    return pintarCifra(c);
  }
}
