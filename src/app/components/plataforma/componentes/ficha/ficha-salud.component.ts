import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TEXTOS } from '../../plataforma.textos';
import { formatearNumero, textoONulo } from '../../logica/formato';

/**
 * D-700 13.7b / 14.6 — Salud (`salud-v1`): el puntaje de riesgo con cada componente (valor, peso y aporte). Un componente sin dato
 * no aporta y el puntaje se rotula parcial. Solo informa. Todo lo calcula el servidor.
 */
@Component({
  selector: 'app-ficha-salud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ficha-seccion [docId]="docId" nombre="salud" [titulo]="textos.ficha.secciones.salud">
      <ng-template let-d>
        <p class="cfg-aviso" *ngIf="d.estado === 'nuevo'" role="status">{{ t.nuevo }}</p>
        <dl class="pl-datos">
          <div><dt>{{ textos.cifras['puntaje'] }}</dt><dd class="pl-num">{{ numero(d.puntaje) }}</dd></div>
          <div><dt>{{ t.nivel }}</dt><dd>{{ nivel(d.nivel) }} <span class="cfg-pill cfg-pill--warn" *ngIf="d.parcial">{{ textos.comercios.parcial }}</span></dd></div>
          <div *ngIf="d.pesoTotal"><dt>&nbsp;</dt><dd class="pl-muted">{{ t.pesoDato(d.pesoConDato, d.pesoTotal) }}</dd></div>
        </dl>
        <p class="cfg-aviso" *ngIf="d.parcial" role="status">{{ t.parcial }}</p>
        <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="d.componentes?.length">
          <table class="pl-tabla">
            <thead><tr><th scope="col">{{ t.componente }}</th><th scope="col" class="pl-der">{{ t.peso }}</th><th scope="col" class="pl-der">{{ t.valor }}</th><th scope="col" class="pl-der">{{ t.aporte }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let c of d.componentes">
                <td>{{ nulo(c.nombre) }}<div *ngIf="c.estado === 'sin_dato'"><small class="pl-muted">{{ nulo(c.motivo) }}</small></div></td>
                <td class="pl-der pl-num">{{ c.peso }}</td>
                <td class="pl-der pl-num">{{ numero(c.valor) }}</td>
                <td class="pl-der pl-num">{{ numero(c.aporte) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="pl-muted">{{ t.tendencia }} {{ t.soloInforma }}</p>
      </ng-template>
    </app-ficha-seccion>
  `,
})
export class FichaSaludComponent {
  @Input() docId = '';
  readonly textos = TEXTOS;
  readonly t = TEXTOS.saludFicha;
  nulo = textoONulo;
  numero = formatearNumero;

  nivel(n: string | null | undefined): string {
    return (n && this.t.niveles[n]) || '—';
  }
}
