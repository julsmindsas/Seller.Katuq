import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TEXTOS } from '../../plataforma.textos';
import { textoONulo, textoSiNo } from '../../logica/formato';

/**
 * D-700 13.7b — Uso: ingreso (no uso), pedidos del mes actual y anterior y adopción configurada. La serie mensual de
 * 12 meses llega con 19.7b y las sesiones con D-634 (hasta entonces «—»).
 */
@Component({
  selector: 'app-ficha-uso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ficha-seccion [docId]="docId" nombre="uso" [titulo]="textos.ficha.secciones.uso">
      <ng-template let-d>
        <h3 class="pl-subtitulo">Ingreso a la plataforma <small class="pl-muted">(es ingreso, no uso)</small></h3>
        <dl class="pl-datos pl-datos--clave" *ngIf="d.ingreso?.estado !== 'sin_dato'; else sinIngreso">
          <div><dt>Último ingreso</dt><dd>{{ d.ingreso?.ultimoIngreso | fechaCo }}</dd></div>
          <div><dt>Usuarios</dt><dd>{{ nulo(d.ingreso?.usuarios) }}</dd></div>
          <div><dt>Ingresaron en 7 días</dt><dd>{{ si(d.ingreso?.ingreso7d) }}</dd></div>
          <div><dt>Ingresaron en 30 días</dt><dd>{{ si(d.ingreso?.ingreso30d) }}</dd></div>
        </dl>
        <ng-template #sinIngreso><p class="cfg-aviso">{{ d.ingreso?.motivo }}</p></ng-template>

        <h3 class="pl-subtitulo">Pedidos</h3>
        <ng-container *ngIf="d.pedidos?.estado !== 'sin_dato'; else sinPedidos">
          <div class="pl-tabla-caja pl-tabla-siempre">
            <table class="pl-tabla">
              <thead><tr><th scope="col">Periodo</th><th scope="col" class="pl-der">Pedidos</th><th scope="col" class="pl-der">GMV</th></tr></thead>
              <tbody>
                <tr><td>Mes actual</td><td class="pl-der pl-num">{{ nulo(d.pedidos?.mes?.pedidos) }}</td><td class="pl-der pl-num">{{ d.pedidos?.mes?.gmv | cop }}</td></tr>
                <tr><td>Mes anterior</td><td class="pl-der pl-num">{{ nulo(d.pedidos?.mesAnterior?.pedidos) }}</td><td class="pl-der pl-num">{{ d.pedidos?.mesAnterior?.gmv | cop }}</td></tr>
                <tr><td>Últimos 30 días</td><td class="pl-der pl-num">{{ nulo(d.pedidos?.ventana30d?.pedidos) }}</td><td class="pl-der pl-num">{{ d.pedidos?.ventana30d?.gmv | cop }}</td></tr>
              </tbody>
            </table>
          </div>
          <p class="pl-muted">Último pedido: {{ d.pedidos?.ultimoPedido | fechaCo }}. {{ d.pedidos?.nota }}</p>
        </ng-container>
        <ng-template #sinPedidos><p class="cfg-aviso">{{ d.pedidos?.motivo }}</p></ng-template>

        <h3 class="pl-subtitulo">Adopción <small class="pl-muted">({{ textos.configurado }})</small></h3>
        <dl class="pl-datos" *ngIf="d.adopcion; else sinAdopcion">
          <div><dt>Integración</dt><dd>{{ si(d.adopcion.integracion) }}</dd></div>
          <div><dt>Facturación electrónica</dt><dd>{{ si(d.adopcion.dian) }}</dd></div>
          <div><dt>Funciones activadas</dt><dd>{{ si(d.adopcion.banderas) }}</dd></div>
          <div><dt>Sitio</dt><dd>{{ si(d.adopcion.sitio) }}</dd></div>
        </dl>
        <ng-template #sinAdopcion><p class="pl-muted">—</p></ng-template>

        <h3 class="pl-subtitulo">Pendiente de otras fases</h3>
        <dl class="pl-datos">
          <div><dt>Uso por módulo</dt><dd>{{ d.modulosUsados?.motivo || '—' }}</dd></div>
          <div><dt>Sesiones</dt><dd>—</dd></div>
          <div><dt>Serie de 12 meses</dt><dd>—</dd></div>
        </dl>
        <p class="pl-muted">{{ textos.ficha.sesionesPendientes }}</p>
      </ng-template>
    </app-ficha-seccion>
  `,
})
export class FichaUsoComponent {
  @Input() docId = '';
  readonly textos = TEXTOS;
  nulo = textoONulo;
  si = textoSiNo;
}
