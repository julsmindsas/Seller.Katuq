import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { OnboardingService } from '../services/onboarding.service';

/**
 * Onboarding Wizard — versión mínima de 5 pasos.
 *
 * UI portada del diseño "Onboarding KATUQ" (Claude Design). Estructura:
 *   Lo básico   → Información de empresa, Formas de pago
 *   Tu catálogo → Categorías, Bodega, Primer producto
 *
 * Aprovisionamiento V1 seguro (decisión del usuario):
 *  - Empresa: se guarda con los datos reales del formulario.
 *  - Pagos / Categorías / Bodega: idempotente y NO destructivo — cada paso
 *    verifica con /check y solo siembra el default del backend si el recurso
 *    NO existe (así nunca se pisa el catálogo de categorías). Los chips/campos
 *    son intención de UX; el detalle fino se ajusta luego desde el panel.
 *  - Primer producto: abre el maestro real en otra pestaña (no crea inline).
 *  - Al finalizar: seedRemainingDefaults (roles, formas de entrega, consecutivos)
 *    para que el comercio quede funcional aunque se termine temprano.
 */

type ProvisionKind = 'company' | 'payment-methods' | 'categories' | 'warehouses' | 'product';

interface WizField {
  key: string;
  label: string;
  required?: boolean;
  col?: 'full';
  placeholder?: string;
  help?: string;
}
interface WizOption { label: string; hint: string; }
interface WizTask { title: string; desc: string; cta: string; route: string; }
interface WizStep {
  id: string;
  num: number;
  name: string;
  group: string;
  mins: number;
  desc: string;
  why: string;
  provision: ProvisionKind;
  fields?: WizField[];
  suggestTitle?: string;
  addOwn?: string;
  options?: WizOption[];
  defaults?: string[];
  task?: WizTask;
}

@Component({
  selector: 'app-onboarding-wizard',
  templateUrl: './onboarding-wizard.component.html',
  styleUrls: ['./onboarding-wizard.component.scss'],
  providers: [MessageService]
})
export class OnboardingWizardComponent implements OnInit {
  private readonly STORAGE_KEY = 'katuq_onboarding_v2';

  activeId = 'negocio';
  status: Record<string, 'done' | 'skipped'> = {};
  picked: Record<string, string[]> = {};
  values: Record<string, Record<string, string>> = {};
  tasks: Record<string, boolean> = {};

  isSaving = false;
  companyKey = '';
  companyLabel = 'Tu Comercio';

  private readonly _steps: WizStep[] = [
    {
      id: 'negocio', num: 1, name: 'Información de empresa', group: 'Lo básico', mins: 2,
      provision: 'company',
      desc: 'Nombre, dirección y contacto que verán tus clientes en facturas y en tu tienda.',
      why: 'Es la información que aparece impresa en cada factura y recibo que entregues.',
      fields: [
        { key: 'razon', label: 'Nombre del negocio', required: true, col: 'full', placeholder: 'Versatilidad e Innovaciones SAS', help: 'Así aparecerá en tus facturas' },
        { key: 'nit', label: 'NIT o cédula', required: true, placeholder: '900.123.456-7' },
        { key: 'tel', label: 'Teléfono de contacto', required: true, placeholder: '300 123 4567' },
        { key: 'dir', label: 'Dirección', col: 'full', placeholder: 'Calle 80 #12-34, Bogotá' }
      ]
    },
    {
      id: 'pago', num: 2, name: 'Formas de pago', group: 'Lo básico', mins: 2,
      provision: 'payment-methods',
      desc: 'Cómo te pagan tus clientes: efectivo, tarjeta, transferencia.',
      why: 'Al vender, podrás registrar con qué medio te pagaron y cuadrar la caja al cierre del día.',
      suggestTitle: 'Formas de pago más usadas en Colombia',
      addOwn: 'Agregar otra forma de pago',
      options: [
        { label: 'Efectivo', hint: 'Pago en caja' },
        { label: 'Tarjeta débito', hint: 'Datáfono' },
        { label: 'Tarjeta crédito', hint: 'Datáfono' },
        { label: 'Nequi', hint: 'Transferencia' },
        { label: 'Daviplata', hint: 'Transferencia' },
        { label: 'Transferencia bancaria', hint: 'PSE o cuenta' }
      ],
      defaults: ['Efectivo', 'Tarjeta débito', 'Nequi']
    },
    {
      id: 'categorias', num: 3, name: 'Categorías', group: 'Tu catálogo', mins: 3,
      provision: 'categories',
      desc: 'Los grupos en los que organizas lo que vendes.',
      why: 'Con categorías encuentras un producto en segundos al vender, en vez de buscar en una lista larga.',
      suggestTitle: 'Categorías sugeridas para tu tipo de negocio',
      addOwn: 'Crear mi propia categoría',
      options: [
        { label: 'Chocolates', hint: '12 productos típicos' },
        { label: 'Cupcakes', hint: '8 productos típicos' },
        { label: 'Floristería', hint: '15 productos típicos' },
        { label: 'Desayunos', hint: '6 productos típicos' },
        { label: 'Peluches', hint: '9 productos típicos' },
        { label: 'Tarjetas', hint: '5 productos típicos' }
      ],
      defaults: ['Chocolates', 'Cupcakes', 'Floristería']
    },
    {
      id: 'bodegas', num: 4, name: 'Bodega', group: 'Tu catálogo', mins: 3,
      provision: 'warehouses',
      desc: 'Dónde guardas la mercancía y cuánto tienes de cada cosa.',
      why: 'KATUQ descuenta el stock solo con cada venta y te avisa cuando algo está por agotarse.',
      fields: [
        { key: 'bodega', label: 'Nombre de tu bodega principal', required: true, col: 'full', placeholder: 'Bodega Principal', help: 'Si solo tienes un local, este es su nombre' },
        { key: 'ciudad', label: 'Ciudad', required: true, placeholder: 'Bogotá' },
        { key: 'alerta', label: 'Avísame cuando queden menos de', placeholder: '5 unidades', help: 'Recibirás una alerta para reponer a tiempo' }
      ]
    },
    {
      id: 'producto', num: 5, name: 'Primer producto', group: 'Tu catálogo', mins: 4,
      provision: 'product',
      desc: 'Crea el primero para ver cómo funciona. Con uno ya puedes vender.',
      why: 'Con un producto creado ya puedes hacer tu primera venta de prueba y ver el flujo completo.',
      task: {
        title: 'Crea tu primer producto',
        desc: 'Se abre el formulario en otra pestaña, así no pierdes tu avance aquí. Solo necesitas nombre, precio y una foto.',
        cta: 'Crear producto',
        route: '/productos/crearProductos'
      }
    }
  ];

  constructor(
    private onboardingService: OnboardingService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCompanyFromStorage();
    this.loadProgress();
    this.prefillCompany();

    // Inicializa el estado del servicio para poder cerrar el onboarding al final
    // (completeOnboarding necesita userEmail en el estado). No bloquea la UI.
    const user = this.readUser();
    if (user?.email) {
      this.onboardingService
        .initializeOnboarding(user.email, user.uid || user.id || user.email)
        .then(() => {
          const st = this.onboardingService.getCurrentState();
          // No pisar companyKey con el doc id de Firestore: el header de tenant
          // que usa la app es el NOMBRE (user.company). Solo refrescamos el label.
          if (st?.companyName) this.companyLabel = st.companyName;
        })
        .catch(() => { /* no bloquear */ });
    }
  }

  // ==================== DATOS / PERSISTENCIA ====================

  steps(): WizStep[] { return this._steps; }

  private readUser(): any {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }

  private loadCompanyFromStorage(): void {
    try {
      const user = this.readUser();
      let c = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      if (!c?.id && !c?.nit) c = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      // La llave de tenant canónica es `user.company` (NOMBRE de empresa): es lo
      // que el HttpInterceptor2 pone en el header `company` de TODA petición al
      // backend, y con la que el back consulta/crea (roles, consecutivos, etc.).
      // Se usa como fuente de verdad para que los checks y seeds apunten al mismo
      // tenant que el resto de la app. NUNCA el doc id de Firestore.
      this.companyKey = user?.company || c?.nomComercial || c?.nombre || '';
      this.companyLabel = c?.nomComercial || c?.nombre || user?.company || 'Tu Comercio';
      (this as any)._company = c;
    } catch { /* ignore */ }
  }

  private prefillCompany(): void {
    const c = (this as any)._company || {};
    const cur = this.values['negocio'] || {};
    this.values['negocio'] = {
      razon: cur.razon || c.nomComercial || c.nombre || '',
      nit: cur.nit || c.nit || '',
      tel: cur.tel || c.telefono || '',
      dir: cur.dir || c.direccion || ''
    };
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.status) this.status = d.status;
      if (d.picked) this.picked = d.picked;
      if (d.values) this.values = d.values;
      if (d.tasks) this.tasks = d.tasks;
      if (d.companyKey) this.companyKey = d.companyKey;
      if (d.activeId && this._steps.some(s => s.id === d.activeId)) {
        this.activeId = d.activeId;
      }
    } catch { /* ignore */ }
  }

  private saveProgress(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        activeId: this.activeId,
        status: this.status,
        picked: this.picked,
        values: this.values,
        tasks: this.tasks,
        companyKey: this.companyKey
      }));
    } catch { /* ignore */ }
  }

  private clearProgress(): void {
    try { localStorage.removeItem(this.STORAGE_KEY); } catch { /* ignore */ }
  }

  // ==================== DERIVADOS PARA LA VISTA ====================

  get all(): WizStep[] { return this._steps; }
  get idx(): number { const i = this._steps.findIndex(s => s.id === this.activeId); return i < 0 ? 0 : i; }
  get active(): WizStep { return this._steps[this.idx]; }

  private resolvedCount(): number {
    return this._steps.filter(s => this.status[s.id]).length;
  }
  get doneCount(): number { return this.resolvedCount(); }
  get totalCount(): number { return this._steps.length; }
  get minsLeft(): number {
    return this._steps.filter(s => !this.status[s.id]).reduce((a, s) => a + s.mins, 0);
  }
  get progressPct(): number {
    return Math.round(this.resolvedCount() / this._steps.length * 100);
  }
  get progressFillStyle(): string {
    return `width:${this.progressPct}%;height:100%;background:linear-gradient(90deg,#7b5bff,#22c07a);border-radius:99px;transition:width .5s cubic-bezier(.4,0,.2,1)`;
  }

  pickedFor(step: WizStep): string[] {
    return this.picked[step.id] || step.defaults || [];
  }

  groups(): any[] {
    const names: string[] = [];
    this._steps.forEach(s => { if (!names.includes(s.group)) names.push(s.group); });
    return names.map(g => {
      const list = this._steps.filter(s => s.group === g);
      const d = list.filter(s => this.status[s.id]).length;
      return {
        title: g.toUpperCase(),
        count: d + '/' + list.length,
        steps: list.map(s => this.stepRow(s))
      };
    });
  }

  private stepRow(s: WizStep): any {
    const state = this.status[s.id];
    const isActive = s.id === this.activeId;
    return {
      id: s.id, num: s.num, name: s.name,
      isDone: state === 'done', isSkipped: state === 'skipped', showNum: !state,
      showState: !!state && !isActive,
      stateText: state === 'done' ? 'Listo' : 'Saltado · puedes hacerlo después',
      stateStyle: state === 'done'
        ? 'font-size:11.5px;font-weight:700;color:#16a34a'
        : 'font-size:11.5px;font-weight:600;color:#9793ac',
      rowStyle: isActive
        ? 'display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:12px;cursor:pointer;background:#f6f4fe;border:1px solid #e6ddff'
        : 'display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:12px;cursor:pointer;background:transparent;border:1px solid transparent',
      markStyle: state === 'done'
        ? 'width:26px;height:26px;flex:none;border-radius:99px;display:flex;align-items:center;justify-content:center;background:#e7f8ee;color:#16a34a;font-weight:800;font-size:12px'
        : (state === 'skipped'
          ? 'width:26px;height:26px;flex:none;border-radius:99px;display:flex;align-items:center;justify-content:center;background:#f4f2fb;color:#a7a3bd;font-weight:800;font-size:12px'
          : (isActive
            ? 'width:26px;height:26px;flex:none;border-radius:99px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7b5bff,#6338f0);color:#fff;font-weight:800;font-size:12px'
            : 'width:26px;height:26px;flex:none;border-radius:99px;display:flex;align-items:center;justify-content:center;background:#f4f2fb;color:#8b879f;font-weight:800;font-size:12px')),
      nameStyle: isActive
        ? 'font-size:13.5px;font-weight:800;color:#5537e8'
        : (state ? 'font-size:13.5px;font-weight:600;color:#8b879f' : 'font-size:13.5px;font-weight:700;color:#211d33')
    };
  }

  get stepPos(): number { return this.idx + 1; }

  get hasSuggestions(): boolean { return (this.active.options || []).length > 0; }
  get hasFields(): boolean { return (this.active.fields || []).length > 0; }
  get hasTask(): boolean { return !!this.active.task; }
  get hasPicked(): boolean { return this.pickedFor(this.active).length > 0; }

  get allSelected(): boolean {
    const opts = this.active.options || [];
    return opts.length > 0 && this.pickedFor(this.active).length === opts.length;
  }
  get selectAllLabel(): string { return this.allSelected ? 'Quitar todas' : 'Seleccionar todas'; }

  get pickedText(): string {
    const p = this.pickedFor(this.active);
    return p.length + ' seleccionada' + (p.length > 1 ? 's' : '') + ' · ' + p.join(', ');
  }

  suggestions(): any[] {
    const picked = this.pickedFor(this.active);
    return (this.active.options || []).map(o => {
      const sel = picked.includes(o.label);
      return {
        label: o.label, hint: o.hint, selected: sel,
        style: sel
          ? 'display:flex;align-items:center;gap:11px;border:1.5px solid #6a4dfb;background:#f6f4fe;border-radius:13px;padding:13px 15px;cursor:pointer;text-align:left'
          : 'display:flex;align-items:center;gap:11px;border:1.5px solid #e9e6f3;background:#fff;border-radius:13px;padding:13px 15px;cursor:pointer;text-align:left',
        boxStyle: sel
          ? 'width:22px;height:22px;flex:none;border-radius:7px;background:#6a4dfb;color:#fff;display:flex;align-items:center;justify-content:center'
          : 'width:22px;height:22px;flex:none;border-radius:7px;border:1.6px solid #d8d4e8;background:#fff'
      };
    });
  }

  fieldValue(step: WizStep, key: string): string {
    return (this.values[step.id] || {})[key] || '';
  }

  isComplete(): boolean {
    const a = this.active;
    const opts = a.options || [];
    if (opts.length > 0) return this.pickedFor(a).length > 0;
    const reqF = (a.fields || []).filter(f => f.required);
    if (reqF.length > 0) return reqF.every(f => String(this.fieldValue(a, f.key)).trim().length > 0);
    if (a.task) return !!this.tasks[a.id];
    return true;
  }

  get nextHint(): string {
    const a = this.active;
    if ((a.options || []).length > 0) return 'Elige al menos una opción';
    if ((a.fields || []).some(f => f.required)) return 'Completa los campos con *';
    if (a.task) return 'Crea el producto o marca "Ya lo creé"';
    return 'Continuar';
  }

  get nextLabel(): string {
    if (!this.isComplete()) return this.nextHint;
    return this.idx === this.all.length - 1 ? 'Terminar configuración' : 'Guardar y continuar';
  }

  get nextStyle(): string {
    return this.isComplete()
      ? 'display:flex;align-items:center;gap:9px;border:none;background:linear-gradient(135deg,#7b5bff,#6338f0);color:#fff;font-weight:800;font-size:14.5px;padding:14px 26px;border-radius:12px;cursor:pointer;box-shadow:0 6px 18px rgba(107,78,251,.32)'
      : 'display:flex;align-items:center;gap:9px;border:none;background:#eeecf6;color:#b0abc4;font-weight:800;font-size:14.5px;padding:14px 26px;border-radius:12px;cursor:not-allowed';
  }

  get backStyle(): string {
    return this.idx > 0
      ? 'display:flex;align-items:center;gap:8px;border:1.5px solid #e4e1f0;background:#fff;color:#5b5772;font-weight:700;font-size:14px;padding:13px 20px;border-radius:12px;cursor:pointer'
      : 'display:flex;align-items:center;gap:8px;border:1.5px solid #f2f0f8;background:#fff;color:#c9c5d8;font-weight:700;font-size:14px;padding:13px 20px;border-radius:12px;cursor:not-allowed';
  }

  // ==================== ACCIONES ====================

  goStep(id: string): void { this.activeId = id; this.saveProgress(); }

  goBack(): void {
    if (this.idx > 0) { this.activeId = this.all[this.idx - 1].id; this.saveProgress(); }
  }

  onField(key: string, value: string): void {
    const a = this.active;
    this.values[a.id] = { ...(this.values[a.id] || {}), [key]: value };
    this.saveProgress();
  }

  toggleOpt(label: string): void {
    const a = this.active;
    const cur = this.pickedFor(a).slice();
    const i = cur.indexOf(label);
    if (i >= 0) cur.splice(i, 1); else cur.push(label);
    this.picked[a.id] = cur;
    this.saveProgress();
  }

  selectAll(): void {
    const a = this.active;
    this.picked[a.id] = this.allSelected ? [] : (a.options || []).map(o => o.label);
    this.saveProgress();
  }

  doTask(): void {
    this.tasks[this.active.id] = true;
    this.saveProgress();
  }

  /** Abre el maestro de productos real en otra pestaña y marca el paso como hecho. */
  openProductMaster(): void {
    const route = this.active.task?.route || '/productos/crearProductos';
    try {
      const url = this.router.serializeUrl(this.router.createUrlTree([route]));
      window.open(window.location.origin + url, '_blank');
    } catch { /* si falla el open, igual dejamos marcar "Ya lo creé" */ }
    this.doTask();
  }

  continuarLuego(): void {
    try { this.onboardingService.postponeOnboarding(); } catch { /* ignore */ }
    this.router.navigate(['/welcome']);
  }

  async goNext(): Promise<void> {
    if (!this.isComplete() || this.isSaving) return;

    const step = this.active;
    const curIdx = this.idx;
    this.isSaving = true;

    try {
      await this.provision(step);

      this.status = { ...this.status, [step.id]: 'done' };
      this.saveProgress();

      if (curIdx < this.all.length - 1) {
        this.activeId = this.all[curIdx + 1].id;
        this.saveProgress();
      } else {
        await this.finish();
      }
    } catch (error) {
      console.error(`Error aprovisionando paso ${step.id}:`, error);
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo guardar',
        detail: 'Revisa los datos e inténtalo de nuevo.'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Aprovisiona el recurso del paso. Empresa se guarda con datos reales; el resto
   * usa el camino idempotente/no destructivo (ensureResourceDefault). El producto
   * se crea desde el maestro (otra pestaña), no inline.
   */
  private async provision(step: WizStep): Promise<void> {
    switch (step.provision) {
      case 'company': {
        const v = this.values['negocio'] || {};
        const payload = {
          nit: (v.nit || '').trim(),
          nombre: (v.razon || '').trim(),
          nomComercial: (v.razon || '').trim(),
          telefono: (v.tel || '').trim(),
          direccion: (v.dir || '').trim()
        };
        const res: any = await this.onboardingService.createCompanyOnboarding(payload);
        const data = res?.data;
        if (data) {
          this.companyLabel = data.nomComercial || data.nombre || this.companyLabel;
          // Fallback SOLO si aún no había tenant key: usar el nombre comercial
          // (misma llave que el header `company`). NUNCA el doc id de Firestore.
          if (!this.companyKey) this.companyKey = data.nomComercial || data.nombre || '';
          this.saveProgress();
        }
        break;
      }
      case 'payment-methods':
        if (this.companyKey) await this.onboardingService.ensureResourceDefault('payment-methods', this.companyKey);
        break;
      case 'categories':
        if (this.companyKey) await this.onboardingService.ensureResourceDefault('categories', this.companyKey);
        break;
      case 'warehouses':
        if (this.companyKey) await this.onboardingService.ensureResourceDefault('warehouses', this.companyKey);
        break;
      case 'product':
        // El producto se crea desde el maestro (otra pestaña). Nada que aprovisionar aquí.
        break;
    }
  }

  private async finish(): Promise<void> {
    // Siembra defaults críticos faltantes (roles, formas de entrega, consecutivos)
    // para que el comercio quede funcional aunque se termine temprano.
    if (this.companyKey) {
      await this.onboardingService.seedRemainingDefaults(this.companyKey);
    }
    await this.onboardingService.completeOnboarding();
    this.clearProgress();

    this.messageService.add({
      severity: 'success',
      summary: '¡Listo para vender!',
      detail: 'Tu comercio quedó configurado.',
      life: 3000
    });

    setTimeout(() => this.router.navigate(['/welcome']), 1500);
  }
}
