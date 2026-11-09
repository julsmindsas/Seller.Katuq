import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TEXTOS } from '../../plataforma.textos';
import { textoONulo, textoSiNo } from '../../logica/formato';
import { filasDeSerie, mesesCerradosConDato, puntosDePedidos } from '../../logica/serie-mensual';

/**
 * D-700 13.7b y 19.7c — Uso: ingreso (no uso), pedidos del mes actual y anterior, la serie mensual de pedidos de 12 meses por
 * canal (cierres de mes: reconstruida o hueco, nunca estimada) y adopción configurada. Las sesiones llegan con D-634 (hasta entonces «—»).
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

        <h3 class="pl-subtitulo">{{ textos.ficha.serie.titulo }} <small class="pl-muted">(12 meses)</small></h3>
        <ng-container *ngIf="d.serieMensual as s; else sinSerie">
          <p class="cfg-aviso" *ngIf="s.estado === 'no_leido'" role="status">{{ textos.ficha.serie.noLeida }}</p>
          <p class="cfg-aviso" *ngIf="s.estado === 'sin_dato' || (s.estado === 'ok' && cerrados(s) === 0)" role="status">{{ textos.ficha.serie.sinDatoTodo }}</p>
          <app-grafico-tendencia clave="pedidos" unidad="n" [puntos]="puntos(s)" [embebido]="true"></app-grafico-tendencia>
          <h4 class="pl-subtitulo pl-subtitulo--menor">{{ textos.ficha.serie.porCanal }}</h4>
          <div class="pl-tabla-caja pl-tabla-siempre">
            <table class="pl-tabla">
              <thead><tr><th scope="col">Mes</th><th scope="col" class="pl-der">Pedidos</th><th scope="col" class="pl-der">GMV</th><th scope="col">{{ textos.ficha.serie.canal }}</th><th scope="col">Estado</th></tr></thead>
              <tbody>
                <tr *ngFor="let f of filas(s)">
                  <td class="pl-col-mes">{{ f.etiqueta }}</td>
                  <td class="pl-der pl-num">{{ f.pedidos }}</td>
                  <td class="pl-der pl-num">{{ f.gmv }}</td>
                  <td>{{ f.canales }}</td>
                  <td><span class="cfg-pill cfg-pill--neutro" *ngIf="f.insignia">{{ f.insignia }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="pl-muted">{{ s.nota || textos.ficha.serie.nota }}</p>
        </ng-container>
        <ng-template #sinSerie><p class="pl-muted">—</p></ng-template>

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
  puntos = puntosDePedidos;
  filas = filasDeSerie;
  cerrados = mesesCerradosConDato;
}
