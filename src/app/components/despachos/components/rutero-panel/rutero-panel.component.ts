import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import {
  armarRutas, COLORES_RUTA, etiquetaHora, kmDeOrden, medirRuta, OPCIONES_POR_DEFECTO, OpcionesRutero, ordenarParadas,
  ParadaRutero, Punto, RutaRutero
} from '../../rutero/rutero.algoritmo';
import { CumplimientoRutas, OpinionOpttia, RuteroService } from '../../rutero/rutero.service';

export interface DibujoRutero {
  rutas: RutaRutero[];
  salida: Punto | null;
  /** Fase 3: trazado por calles reales de cada ruta (por id), cuando el motor lo midió. */
  trazados?: Record<string, Array<[number, number]>>;
}

export interface MensajeroRutero {
  nombre: string;
  enLinea: boolean;
}

/** Lo que el rutero le pide a Envíos para crear la orden de envío de una ruta (fase 2). */
export interface PedidoOrdenRuta {
  /** Mensajero sugerido para la ruta; puede ir vacío. Se asigna de verdad al despachar la orden. */
  mensajero: string;
  nroPedidos: string[];
  /** Plan de la ruta que se guarda con la orden: secuencia y estimados, para comparar luego con lo real. */
  rutero: {
    secuencia: Array<{ nroPedido: string; orden: number; llegadaMin: number; franja: string | null }>;
    kmEstimados: number;
    minutosEstimados: number;
    horaSalidaMin: number;
    salida: Punto;
    regresa: boolean;
  };
  /** Envíos avisa cómo terminó: el número de la orden creada, o null si no se creó. */
  listo: (nroOrden: string | number | null) => void;
}

type Ajustes = Omit<OpcionesRutero, 'salida'>;

/**
 * Rutero de Envíos (openspec `rutero-envios`): arma rutas por cercanía con los pedidos listos que el
 * mapa ya ubicó, las deja ajustar a mano y le pide a Opttia una lectura. No guarda nada en el pedido.
 */
@Component({
  selector: 'app-rutero-panel',
  templateUrl: './rutero-panel.component.html',
  styleUrls: ['./rutero-panel.component.scss']
})
export class RuteroPanelComponent implements OnInit, OnChanges, OnDestroy {
  private readonly destruir$ = new Subject<void>();
  /** Pedidos listos para salir que tienen punto en el mapa. */
  @Input() paradas: ParadaRutero[] = [];
  @Input() sinUbicar = 0;
  /** Punto de partida sugerido (ubicación de quien usa el mapa), si lo hay. */
  @Input() ubicacionUsuario: Punto | null = null;
  @Input() empresa = '';
  @Input() eligiendoSalida = false;
  /** Mensajeros propios del comercio (fase 2). */
  @Input() mensajeros: MensajeroRutero[] = [];

  @Output() dibujar = new EventEmitter<DibujoRutero>();
  @Output() elegirSalida = new EventEmitter<boolean>();
  @Output() verParada = new EventEmitter<ParadaRutero>();
  @Output() crearOrden = new EventEmitter<PedidoOrdenRuta>();

  /** Fase 3: recorrido por calles de cada ruta, guardado con la firma del orden con que se midió. */
  private calles: Record<string, { firma: string; km: number[]; trazado: Array<[number, number]> }> = {};
  /** null = aún no se sabe si hay motor de calles; false = no hay y no se vuelve a preguntar. */
  porCalles: boolean | null = null;
  private relojCalles: any = null;
  private turnoCalles = 0;

  cumplimiento: CumplimientoRutas | null = null;
  cargandoCumplimiento = false;
  verCumplimiento = false;

  /** Mensajero elegido por ruta, orden ya creada por ruta y ruta que se está guardando. */
  mensajeroDe: Record<string, string> = {};
  ordenDe: Record<string, string> = {};
  creando: string | null = null;

  ajustes: Ajustes = { ...OPCIONES_POR_DEFECTO };
  salida: Punto | null = null;
  salidaEsSugerida = false;
  rutas: RutaRutero[] = [];
  sinRuta: ParadaRutero[] = [];
  /** Pedidos que la persona sacó de las rutas. */
  fuera: ParadaRutero[] = [];
  armado = false;
  verAjustes = false;
  abierta: string | null = null;
  /** Kilómetros si se saliera en el orden en que están los pedidos, para mostrar cuánto se ahorra. */
  kmSinOrdenar = 0;

  instruccion = '';
  pensando = false;
  opinando = false;
  opinion: OpinionOpttia | null = null;
  notaOpttia = '';
  avisoOpttia = '';

  constructor(private rutero: RuteroService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.leerGuardado();
    this.resolverSalida();
    // El punto de salida se ve en el mapa desde que se abre el modo Rutas
    Promise.resolve().then(() => this.emitir());
  }

  ngOnChanges(cambios: SimpleChanges): void {
    // Con rutas armadas la salida sugerida no se mueve: las horas y los km ya se calcularon con ella.
    // Tampoco se desarman las rutas si la lista de Envíos cambia de página o de filtro: al crear la orden,
    // Envíos avisa si algún pedido ya no está a la vista.
    if ((cambios['ubicacionUsuario'] || cambios['paradas']) && !this.armado) this.resolverSalida();
  }

  ngOnDestroy(): void {
    clearTimeout(this.relojCalles);
    this.destruir$.next();
    this.destruir$.complete();
  }

  // ---------- Datos derivados ----------
  get horaSalida(): string {
    const m = this.ajustes.horaSalidaMin;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  set horaSalida(valor: string) {
    const [h, m] = String(valor || '').split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) this.ajustes.horaSalidaMin = h * 60 + m;
  }
  get totalParadas(): number { return this.rutas.reduce((s, r) => s + r.paradas.length, 0); }
  get totalKm(): number { return this.rutas.reduce((s, r) => s + r.km, 0); }
  get totalTarde(): number { return this.rutas.reduce((s, r) => s + r.tarde, 0); }
  get totalPorCobrar(): number { return this.rutas.reduce((s, r) => s + r.porCobrar, 0); }
  get ahorro(): number {
    return this.kmSinOrdenar > 0 && this.totalKm < this.kmSinOrdenar ? Math.round((1 - this.totalKm / this.kmSinOrdenar) * 100) : 0;
  }
  get listas(): string[] { return this.rutas.map(r => 'rt-' + r.id); }

  hora(min: number): string { return etiquetaHora(min); }
  duracion(min: number): string {
    const t = Math.round(min);
    return t < 60 ? `${t} min` : `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')} min`;
  }
  porId(_: number, x: { id: string }): string { return x.id; }

  // ---------- Punto de salida ----------
  private resolverSalida(): void {
    if (this.salida && !this.salidaEsSugerida) return;
    if (this.ubicacionUsuario) {
      this.salida = this.ubicacionUsuario;
    } else if (this.paradas.length) {
      this.salida = {
        lat: this.paradas.reduce((s, p) => s + p.lat, 0) / this.paradas.length,
        lng: this.paradas.reduce((s, p) => s + p.lng, 0) / this.paradas.length,
      };
    }
    this.salidaEsSugerida = true;
  }

  /** El mapa avisa dónde hizo clic la persona. */
  fijarSalida(punto: Punto): void {
    this.salida = punto;
    this.salidaEsSugerida = false;
    this.guardar();
    if (this.armado) this.remedir(); else this.emitir();
  }

  pedirSalida(): void { this.elegirSalida.emit(!this.eligiendoSalida); }

  // ---------- Armar ----------
  armar(): void {
    if (!this.salida || !this.paradas.length || this.creando) return;
    const fuera = new Set(this.fuera.map(p => p.id));
    const entran = this.paradas.filter(p => !fuera.has(p.id));
    const opciones = this.opciones();
    const r = armarRutas(entran, opciones);
    this.rutas = r.rutas;
    this.sinRuta = r.sinRuta;
    this.mensajeroDe = {};
    this.ordenDe = {};
    this.calles = {};
    this.kmSinOrdenar = this.rutas.reduce((s, x) => s + kmDeOrden(opciones.salida, entran.filter(p => x.paradas.some(q => q.id === p.id)), opciones), 0);
    this.armado = true;
    this.abierta = this.rutas.length === 1 ? this.rutas[0].id : null;
    this.opinion = null;
    this.guardar();
    this.emitir();
    this.programarCalles();
  }

  limpiar(): void {
    if (this.creando) return;
    this.rutas = [];
    this.sinRuta = [];
    this.fuera = [];
    this.armado = false;
    this.opinion = null;
    this.notaOpttia = '';
    this.emitir();
  }

  private opciones(): OpcionesRutero {
    const a = this.ajustes;
    return {
      salida: this.salida!,
      rutas: Math.max(1, Math.min(10, Math.round(Number(a.rutas) || 1))),
      maxParadas: Math.max(0, Math.round(Number(a.maxParadas) || 0)),
      velocidadKmh: Math.max(5, Math.min(80, Number(a.velocidadKmh) || OPCIONES_POR_DEFECTO.velocidadKmh)),
      minutosPorParada: Math.max(0, Math.min(60, Number(a.minutosPorParada) || 0)),
      factorUrbano: OPCIONES_POR_DEFECTO.factorUrbano,
      horaSalidaMin: a.horaSalidaMin,
      regresa: !!a.regresa,
    };
  }

  private remedir(): void {
    const opciones = this.opciones();
    this.rutas = this.rutas.filter(r => r.paradas.length || this.ordenDe[r.id]).map(r => medirRuta(r, opciones, this.kmDeCalles(r)));
    const vivas = new Set(this.rutas.map(r => r.id));
    Object.keys(this.mensajeroDe).forEach(id => { if (!vivas.has(id)) delete this.mensajeroDe[id]; });
    this.opinion = null;
    this.emitir();
    this.programarCalles();
  }

  private emitir(): void {
    const trazados: Record<string, Array<[number, number]>> = {};
    for (const r of this.rutas) {
      const c = this.calles[r.id];
      if (c && c.firma === this.firmaDe(r) && c.trazado.length > 1) trazados[r.id] = c.trazado;
    }
    this.dibujar.emit({ rutas: this.rutas, salida: this.salida, trazados });
    this.cd.markForCheck();
  }

  // ---------- Fase 3: calles reales ----------
  private firmaDe(ruta: { paradas: ParadaRutero[] }): string {
    const s = this.salida;
    return `${s?.lat},${s?.lng}|${this.ajustes.regresa ? 1 : 0}|${ruta.paradas.map(p => p.id).join(',')}`;
  }

  /** Kilómetros por calles de una ruta, solo si se midieron con este mismo orden. */
  private kmDeCalles(ruta: { id: string; paradas: ParadaRutero[] }): number[] | null {
    const c = this.calles[ruta.id];
    return c && c.firma === this.firmaDe(ruta) ? c.km : null;
  }

  /** Las rutas medidas por calles son todas las que hay. */
  get todoPorCalles(): boolean {
    return this.rutas.length > 0 && this.rutas.every(r => !!this.kmDeCalles(r));
  }

  /** Tras cada cambio se espera un momento y se miden por calles solo las rutas cuyo orden cambió. */
  private programarCalles(): void {
    clearTimeout(this.relojCalles);
    if (this.porCalles === false || !this.salida || !this.rutas.length) return;
    this.relojCalles = setTimeout(() => this.medirPorCalles(), 700);
  }

  private medirPorCalles(): void {
    const salida = this.salida;
    const pendientes = this.rutas.filter(r => !this.kmDeCalles(r));
    if (!salida || !pendientes.length) return;
    const turno = ++this.turnoCalles;
    const firmas = new Map(pendientes.map(r => [r.id, this.firmaDe(r)]));
    this.rutero.calles({
      salida,
      regresa: !!this.ajustes.regresa,
      rutas: pendientes.map(r => ({ id: r.id, paradas: r.paradas.map(p => ({ lat: p.lat, lng: p.lng })) })),
    }).pipe(takeUntil(this.destruir$)).subscribe({
      next: (respuesta) => {
        this.porCalles = !!respuesta?.disponible;
        if (!respuesta?.disponible || turno !== this.turnoCalles) { this.cd.markForCheck(); return; }
        let cambio = false;
        for (const medida of respuesta.rutas || []) {
          const firma = firmas.get(medida.id);
          if (!firma || !medida.tramos || !medida.tramos.length) continue;
          this.calles[medida.id] = { firma, km: medida.tramos.map(t => t.km), trazado: medida.trazado || [] };
          cambio = true;
        }
        if (cambio) {
          const opciones = this.opciones();
          this.rutas = this.rutas.map(r => medirRuta(r, opciones, this.kmDeCalles(r)));
          this.emitir();
        }
      },
      // Un error no apaga el motor: se vuelve a intentar con el siguiente cambio
      error: () => this.cd.markForCheck(),
    });
  }

  // ---------- Fase 3: avisar al cliente y planeado contra real ----------
  /** Enlace de WhatsApp con el aviso ya escrito; lo envía la persona, Katuq no manda nada. */
  enlaceAviso(p: { id: string; cliente: string; telefono?: string; llegadaMin: number }): string | null {
    let numero = String(p.telefono || '').replace(/\D/g, '');
    if (numero.length === 10 && numero.startsWith('3')) numero = '57' + numero;
    if (numero.length < 11 || numero.length > 13) return null;
    const nombre = String(p.cliente || '').trim().split(/\s+/)[0] || '';
    const desde = Math.max(0, Math.floor((p.llegadaMin - 20) / 10) * 10);
    const hasta = Math.ceil((p.llegadaMin + 40) / 10) * 10;
    const texto = `Hola${nombre ? ' ' + nombre : ''}, tu pedido #${p.id}${this.empresa ? ' de ' + this.empresa : ''} va en ruta. `
      + `Llegada estimada entre ${this.hora(desde)} y ${this.hora(hasta)}`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  alternarCumplimiento(): void {
    this.verCumplimiento = !this.verCumplimiento;
    if (!this.verCumplimiento || this.cargandoCumplimiento) return;
    this.cargandoCumplimiento = true;
    this.rutero.cumplimiento().pipe(takeUntil(this.destruir$)).subscribe({
      next: (c) => { this.cumplimiento = c; this.cargandoCumplimiento = false; this.cd.markForCheck(); },
      error: () => { this.cumplimiento = null; this.cargandoCumplimiento = false; this.cd.markForCheck(); },
    });
  }

  diaCorto(dia: string): string {
    const [, m, d] = String(dia || '').split('-');
    return d && m ? `${Number(d)}/${Number(m)}` : dia;
  }

  /** Pedidos listos que llegaron después de armar las rutas: se pueden sumar a la ruta más cercana. */
  get nuevos(): ParadaRutero[] {
    if (!this.armado) return [];
    const vistos = new Set<string>([...this.sinRuta, ...this.fuera].map(p => p.id));
    this.rutas.forEach(r => r.paradas.forEach(p => vistos.add(p.id)));
    return this.paradas.filter(p => !vistos.has(p.id));
  }

  get hayRutaAbierta(): boolean { return this.rutas.some(r => !this.ordenDe[r.id]); }

  // ---------- Ajuste a mano ----------
  /** Una ruta que ya es orden de envío no recibe paradas (`cdkDropListDisabled` solo impide sacarlas). */
  puedeRecibir = (ruta: RutaRutero) => () => !this.ordenDe[ruta.id];

  soltar(evento: CdkDragDrop<any[]>): void {
    if (evento.previousContainer === evento.container) {
      moveItemInArray(evento.container.data, evento.previousIndex, evento.currentIndex);
    } else {
      transferArrayItem(evento.previousContainer.data, evento.container.data, evento.previousIndex, evento.currentIndex);
    }
    this.remedir();
  }

  mover(ruta: RutaRutero, i: number, paso: number): void {
    const j = i + paso;
    if (j < 0 || j >= ruta.paradas.length) return;
    moveItemInArray(ruta.paradas, i, j);
    this.remedir();
  }

  pasarA(ruta: RutaRutero, i: number, destinoId: string): void {
    const destino = this.rutas.find(r => r.id === destinoId);
    if (!destino || destino === ruta || this.ordenDe[destino.id] || this.ordenDe[ruta.id]) return;
    destino.paradas.push(ruta.paradas.splice(i, 1)[0]);
    destino.paradas = ordenarParadas(this.salida!, destino.paradas) as any;
    this.remedir();
  }

  sacar(ruta: RutaRutero, i: number): void {
    this.fuera = [...this.fuera, ruta.paradas.splice(i, 1)[0]];
    this.remedir();
  }

  /** Suma un pedido a la ruta que le queda más cerca (entre las que aún no son orden de envío). */
  devolver(parada: ParadaRutero, lista: 'fuera' | 'sinRuta' | 'nuevos'): void {
    const abiertas = this.rutas.filter(r => !this.ordenDe[r.id]);
    if (!abiertas.length) return;
    const destino = abiertas.sort((a, b) => this.cercania(a, parada) - this.cercania(b, parada))[0];
    if (lista !== 'nuevos') this[lista] = this[lista].filter(p => p.id !== parada.id);
    destino.paradas = ordenarParadas(this.salida!, [...destino.paradas, parada]) as any;
    this.remedir();
  }

  private cercania(ruta: RutaRutero, p: Punto): number {
    return Math.min(...ruta.paradas.map(q => (q.lat - p.lat) ** 2 + (q.lng - p.lng) ** 2));
  }

  reordenar(ruta: RutaRutero): void {
    ruta.paradas = ordenarParadas(this.salida!, ruta.paradas) as any;
    this.remedir();
  }

  alternar(ruta: RutaRutero): void { this.abierta = this.abierta === ruta.id ? null : ruta.id; }

  // ---------- Fase 2: la ruta se vuelve orden de envío ----------
  /** Un mensajero lleva una sola ruta: los que ya se eligieron en otra no se ofrecen. */
  mensajerosPara(ruta: RutaRutero): MensajeroRutero[] {
    const ocupados = new Set(Object.entries(this.mensajeroDe).filter(([id, n]) => id !== ruta.id && n).map(([, n]) => n));
    return this.mensajeros.filter(m => !ocupados.has(m.nombre));
  }

  pedirOrden(ruta: RutaRutero): void {
    const mensajero = this.mensajeroDe[ruta.id] || '';
    if (!this.salida || !ruta.paradas.length || this.creando || this.ordenDe[ruta.id]) return;
    this.creando = ruta.id;
    this.crearOrden.emit({
      mensajero,
      nroPedidos: ruta.paradas.map(p => p.id),
      rutero: {
        secuencia: ruta.paradas.map((p, i) => ({
          nroPedido: p.id,
          orden: i + 1,
          llegadaMin: Math.round(p.llegadaMin),
          franja: p.franja.inicioMin != null || p.franja.urgente ? p.franja.etiqueta : null,
        })),
        kmEstimados: Math.round(ruta.km * 10) / 10,
        minutosEstimados: Math.round(ruta.minutos),
        horaSalidaMin: this.ajustes.horaSalidaMin,
        salida: this.salida,
        regresa: !!this.ajustes.regresa,
      },
      listo: (nro) => {
        this.creando = null;
        if (nro != null) {
          this.ordenDe[ruta.id] = String(nro);
          // La ruta pudo volverse a medir mientras se guardaba: se busca la vigente por su id
          const vigente = this.rutas.find(r => r.id === ruta.id);
          if (vigente && mensajero && /^Ruta \d+$/.test(vigente.nombre)) vigente.nombre = mensajero;
        }
        this.cd.markForCheck();
      },
    });
  }

  // ---------- Salidas útiles sin guardar nada ----------
  /** Google Maps acepta hasta 9 puntos intermedios: con más paradas el enlace no se ofrece. */
  enlaceMaps(ruta: RutaRutero): string | null {
    if (!this.salida || !ruta.paradas.length || ruta.paradas.length > 10) return null;
    const p = (x: Punto) => `${x.lat.toFixed(6)},${x.lng.toFixed(6)}`;
    const puntos = ruta.paradas.map(p);
    const destino = this.ajustes.regresa ? p(this.salida) : puntos.pop()!;
    const medio = puntos.length ? `&waypoints=${encodeURIComponent(puntos.join('|'))}` : '';
    return `https://www.google.com/maps/dir/?api=1&origin=${p(this.salida)}&destination=${destino}${medio}&travelmode=driving`;
  }

  imprimir(ruta: RutaRutero): void {
    const esc = (t: any) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    const filas = ruta.paradas.map((p, i) => `<tr><td>${i + 1}</td><td>#${esc(p.id)}</td><td>${esc(p.cliente)}</td><td>${esc(p.direccion)}</td>`
      + `<td>${esc(p.franja.inicioMin != null || p.franja.urgente ? p.franja.etiqueta : '')}</td><td>${esc(this.hora(p.llegadaMin))}</td>`
      + `<td style="text-align:right">${p.porCobrar ? '$' + Math.round(p.porCobrar).toLocaleString('es-CO') : ''}</td><td></td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(ruta.nombre)}</title><style>
      body{font-family:Arial,sans-serif;color:#211F3A;margin:24px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 14px;color:#555;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f4f1ff;text-transform:uppercase;font-size:10px;letter-spacing:.5px}</style></head><body>
      <h1>${esc(ruta.nombre)}${this.empresa ? ' · ' + esc(this.empresa) : ''}</h1>
      <p>${ruta.paradas.length} paradas · ${ruta.km.toFixed(1)} km estimados · sale ${esc(this.hora(this.ajustes.horaSalidaMin))} · termina hacia ${esc(this.hora(ruta.finMin))}${ruta.porCobrar ? ' · por cobrar $' + Math.round(ruta.porCobrar).toLocaleString('es-CO') : ''}</p>
      <table><thead><tr><th>#</th><th>Pedido</th><th>Cliente</th><th>Dirección</th><th>Franja</th><th>Llegada estimada</th><th>Por cobrar</th><th>Recibido</th></tr></thead><tbody>${filas}</tbody></table>
      </body></html>`;
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  // ---------- Opttia ----------
  /** Opttia entiende la instrucción y devuelve ajustes; las rutas las arma el código. */
  aplicarInstruccion(): void {
    const texto = this.instruccion.trim();
    if (!texto || this.pensando) return;
    this.pensando = true;
    this.avisoOpttia = '';
    this.rutero.instruccion({ texto, paradas: this.paradas.length, actuales: { ...this.ajustes } }).pipe(takeUntil(this.destruir$)).subscribe({
      next: ({ ajustes }) => {
        this.pensando = false;
        if (!ajustes) { this.avisoOpttia = 'Opttia no entendió la instrucción. Ajusta los valores a mano.'; this.cd.markForCheck(); return; }
        const { nota, ...valores } = ajustes;
        this.ajustes = { ...this.ajustes, ...valores };
        this.notaOpttia = nota || '';
        this.instruccion = '';
        this.armar();
      },
      error: () => { this.pensando = false; this.avisoOpttia = 'Opttia no respondió. Ajusta los valores a mano.'; this.cd.markForCheck(); },
    });
  }

  pedirOpinion(): void {
    if (!this.rutas.length || this.opinando) return;
    this.opinando = true;
    this.avisoOpttia = '';
    const rutas = this.rutas.map(r => ({
      paradas: r.paradas.length,
      km: Math.round(r.km * 10) / 10,
      minutos: Math.round(r.minutos),
      porCobrar: Math.round(r.porCobrar),
      tarde: r.tarde,
      conFranja: r.paradas.filter(p => p.franja.inicioMin != null).length,
      urgentes: r.paradas.filter(p => p.franja.urgente).length,
    }));
    this.rutero.opinion({ rutas, sinRuta: this.sinRuta.length + this.fuera.length, sinUbicar: this.sinUbicar, horaSalidaMin: this.ajustes.horaSalidaMin }).pipe(takeUntil(this.destruir$)).subscribe({
      next: ({ opinion }) => {
        this.opinando = false;
        this.opinion = opinion;
        if (!opinion) this.avisoOpttia = 'Opttia no respondió esta vez. Las cifras de las rutas siguen siendo las del cálculo.';
        this.cd.markForCheck();
      },
      error: () => { this.opinando = false; this.avisoOpttia = 'Opttia no respondió esta vez. Las cifras de las rutas siguen siendo las del cálculo.'; this.cd.markForCheck(); },
    });
  }

  fraseDe(ruta: RutaRutero, i: number): string { return this.opinion?.rutas?.[`r${i + 1}`] || ''; }

  // ---------- Preferencias de esta persona (solo comodidad; nada de esto es dato del comercio) ----------
  private get clave(): string { return `rutero_envios_${this.empresa || 'x'}`; }

  private leerGuardado(): void {
    try {
      const g = JSON.parse(localStorage.getItem(this.clave) || 'null');
      if (!g) return;
      if (g.ajustes) this.ajustes = { ...OPCIONES_POR_DEFECTO, ...g.ajustes };
      if (g.salida && Number.isFinite(g.salida.lat) && Number.isFinite(g.salida.lng)) { this.salida = g.salida; this.salidaEsSugerida = false; }
    } catch { /* sin almacenamiento: se usan los valores por defecto */ }
  }

  private guardar(): void {
    try {
      localStorage.setItem(this.clave, JSON.stringify({ ajustes: this.ajustes, salida: this.salidaEsSugerida ? null : this.salida }));
    } catch { /* sin almacenamiento */ }
  }

  colorDe(i: number): string { return COLORES_RUTA[i % COLORES_RUTA.length]; }
}
