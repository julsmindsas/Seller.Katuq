import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { LoaderService } from '../../../shared/services/loader.service';
import {
  MinimalOnboardingProduct,
  OnboardingReadiness,
  OnboardingService,
  OnboardingV2Progress
} from '../services/onboarding.service';
import {
  buildOnboardingStorageKey,
  parseLowStockThreshold
} from '../utils/onboarding-v2.utils';

type StepId = 'goal' | 'context' | 'product' | 'payment' | 'result';
type Goal = 'sell_today' | 'import_excel' | 'explore';
type Offering = 'products' | 'services' | 'both' | 'unknown';
type Channel = 'local' | 'social' | 'delivery' | 'unknown';
type ProductType = 'producto' | 'servicio';

interface WizardStep {
  id: StepId;
  name: string;
  shortName: string;
  mins: number;
}

interface ProductDraft {
  nombre: string;
  precio: string | number;
  fotoUrl: string;
  tipo: ProductType;
  requestId?: string;
  requestFingerprint?: string;
  resourceId?: string;
}

@Component({
  selector: 'app-onboarding-wizard',
  templateUrl: './onboarding-wizard.component.html',
  styleUrls: ['./onboarding-wizard.component.scss'],
  providers: [MessageService]
})
export class OnboardingWizardComponent implements OnInit, OnDestroy {
  private readonly LEGACY_UNSCOPED_KEY = 'katuq_onboarding_v2';
  private cacheKey = '';
  private progressTimer: any;
  private progressUpdatedAt = '';

  private readonly baseSteps: WizardStep[] = [
    { id: 'goal', name: 'Tu primer objetivo', shortName: 'Objetivo', mins: 1 },
    { id: 'context', name: 'Conozcamos tu forma de vender', shortName: 'Tu negocio', mins: 2 },
    { id: 'product', name: 'Algo listo para vender', shortName: 'Producto o servicio', mins: 2 },
    { id: 'payment', name: 'Cómo recibes el dinero', shortName: 'Cobro', mins: 1 },
    { id: 'result', name: 'Revisemos que todo esté listo', shortName: 'Resultado', mins: 1 }
  ];

  activeId: StepId = 'goal';
  status: Partial<Record<StepId, 'done'>> = {};
  goal: Goal | null = null;
  offering: Offering | null = null;
  channel: Channel | null = null;
  inventoryEnabled: boolean | null = null;

  warehouseName = 'Bodega principal';
  warehouseCity = '';
  warehouseBusinessCode = '';
  lowStockThreshold: string | number = 5;
  initialQuantity: string | number = 1;

  product: ProductDraft = {
    nombre: '',
    precio: '',
    fotoUrl: '',
    tipo: 'producto'
  };

  paymentMethods: string[] = [];
  customPayment = '';
  readonly paymentOptions = [
    { label: 'Efectivo', hint: 'Pago en caja o contraentrega' },
    { label: 'Transferencia bancaria', hint: 'Cuenta bancaria o PSE' },
    { label: 'Nequi', hint: 'Transferencia desde el celular' },
    { label: 'Daviplata', hint: 'Transferencia desde el celular' },
    { label: 'Tarjeta débito', hint: 'Registro de pago con datáfono' },
    { label: 'Tarjeta crédito', hint: 'Registro de pago con datáfono' }
  ];

  importOpened = false;
  readiness: OnboardingReadiness | null = null;
  companyKey = '';
  companyLabel = 'Tu negocio';
  isInitializing = true;
  isSaving = false;
  isCheckingReadiness = false;
  mobileNavOpen = false;
  errorMessage = '';
  progressWarning = '';
  paymentNeedsManualActivation = false;
  deferred = false;

  constructor(
    private onboardingService: OnboardingService,
    private messageService: MessageService,
    private loaderService: LoaderService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // El onboarding ya tiene estados de carga propios. Las precargas globales
    // de maestros que arrancan después del login no deben cubrirlo con un
    // overlay bloqueante mientras el usuario intenta responder.
    this.loaderService.suppressGlobalLoader();
    const user = this.readJson(localStorage.getItem('user'));
    const currentCompany = this.readJson(localStorage.getItem('currentCompany'));
    const sessionCompany = this.readJson(sessionStorage.getItem('currentCompany'));
    const hasSessionCompany = sessionCompany && typeof sessionCompany === 'object' &&
      Object.keys(sessionCompany).length > 0;
    const company = hasSessionCompany ? sessionCompany : currentCompany;

    // La empresa activa siempre viene de la sesión. Nunca se restaura desde un
    // borrador local ni desde la respuesta de un endpoint de progreso.
    this.companyKey = String(user?.company || '').trim();
    this.companyLabel = String(
      company?.nombreComercio || company?.nomComercial || user?.company || 'Tu negocio'
    ).trim();
    const userKey = String(user?.uid || user?.id || user?._id || user?.email || '').trim();

    if (!userKey || !this.companyKey) {
      this.isInitializing = false;
      this.errorMessage = 'No pudimos identificar tu sesión o tu negocio. Vuelve a ingresar para continuar.';
      return;
    }

    // El wizard V2 no consulta ni vuelve a persistir el estado global legacy.
    // Se descarta antes de cargar la caché aislada por usuario + tenant.
    this.onboardingService.resetOnboarding();
    this.cacheKey = buildOnboardingStorageKey(userKey, this.companyKey);
    localStorage.removeItem(this.LEGACY_UNSCOPED_KEY);
    const cachedProgress = this.loadCachedProgress();
    this.applyProgress(cachedProgress);

    try {
      const remoteProgress = await this.onboardingService.loadV2Progress();
      const onboardingWasCompleted = remoteProgress?.onboardingCompleted === true;
      if (onboardingWasCompleted) {
        // El login ya evita enviar automáticamente al wizard a quien terminó.
        // Por eso llegar manualmente a /onboarding es una intención explícita
        // de revisar la guía, no una razón para devolverlo silenciosamente a
        // /welcome. Abrimos el resumen y dejamos todos los pasos consultables.
        this.clearProgress();
        localStorage.removeItem('showOnboardingBanner');
        sessionStorage.removeItem('onboarding_banner_dismissed');
      }
      if (remoteProgress) {
        // Un onboarding ya completado siempre se hidrata desde la fuente
        // autenticada; un borrador local antiguo no puede reabrirlo a medias.
        const preferredProgress = onboardingWasCompleted
          ? remoteProgress
          : this.newestProgress(cachedProgress, remoteProgress);
        this.applyProgress(preferredProgress, true);
        if (onboardingWasCompleted) {
          this.status = { ...this.status, result: 'done' };
          this.activeId = 'result';
          this.deferred = false;
        }
        // Si el dispositivo tenía cambios más recientes (por ejemplo, cerró la
        // pestaña durante el debounce), recuperarlos también en el backend.
        if (preferredProgress === cachedProgress && cachedProgress !== remoteProgress) {
          await this.onboardingService.saveV2Progress(this.buildProgress());
        }
        if (typeof preferredProgress.context?.inventoryEnabled === 'boolean' &&
            preferredProgress.context.inventoryEnabled !== this.requiresInventoryReadiness) {
          await this.persistProgress();
        }
      } else if (cachedProgress) {
        // Un cierre abrupto puede alcanzar a guardar localmente pero no en el
        // backend. Si allí todavía no existe progreso, rehidratarlo evita que
        // otro dispositivo empiece el onboarding desde cero.
        await this.onboardingService.saveV2Progress(this.buildProgress());
      }
    } catch {
      // La caché namespaced permite continuar durante una interrupción corta. El
      // siguiente guardado reintentará la sincronización canónica.
      this.progressWarning = 'Estás trabajando con el avance guardado en este dispositivo.';
    }

    await this.clearDeferredOnEntry();

    // Respetar los datos maestros existentes: si el borrador aún no eligió una
    // bodega, mostramos la principal real en vez de renombrarla con el placeholder.
    if (!this.warehouseBusinessCode &&
        (!this.warehouseName.trim() || this.warehouseName === 'Bodega principal')) {
      try {
        const warehouse = await this.onboardingService.getPreferredActiveWarehouse(this.companyKey);
        if (warehouse) {
          this.warehouseBusinessCode = warehouse.idBodega;
          this.warehouseName = warehouse.nombre;
          if (!this.warehouseCity) this.warehouseCity = warehouse.ciudad || '';
        }
      } catch {
        // Es una ayuda de hidratación; la validación al guardar sigue siendo la
        // fuente definitiva y mostrará un error accionable si hiciera falta.
      }
    }

    try {
      await this.refreshReadiness();
    } catch (error) {
      this.errorMessage = this.errorText(error, 'No pudimos comprobar la configuración de tu negocio.');
    } finally {
      this.normalizeActiveStep();
      this.saveCache();
      this.isInitializing = false;
    }
  }

  ngOnDestroy(): void {
    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
      this.progressTimer = null;
      // La caché local es inmediata y la siguiente entrada resolverá cualquier
      // conflicto por fecha. El intento remoto cubre navegaciones dentro del SPA.
      this.saveCache();
      this.onboardingService.saveV2Progress(this.buildProgress()).catch(() => undefined);
    }
    this.loaderService.releaseGlobalLoader();
  }

  get all(): WizardStep[] {
    if (this.goal === 'explore') {
      return this.baseSteps.filter(step => step.id === 'goal' || step.id === 'result');
    }
    return this.baseSteps;
  }

  get active(): WizardStep {
    return this.all.find(step => step.id === this.activeId) || this.all[0];
  }

  get stepPosition(): number {
    const index = this.all.findIndex(step => step.id === this.activeId);
    return index < 0 ? 1 : index + 1;
  }

  get doneCount(): number {
    return this.all.filter(step => this.status[step.id] === 'done').length;
  }

  get progressPercentage(): number {
    if (!this.all.length) return 0;
    return Math.round((this.doneCount / this.all.length) * 100);
  }

  get minsLeft(): number {
    return this.all
      .filter(step => this.status[step.id] !== 'done')
      .reduce((sum, step) => sum + step.mins, 0);
  }

  get isImportRoute(): boolean {
    return this.goal === 'import_excel';
  }

  get isExploreRoute(): boolean {
    return this.goal === 'explore';
  }

  get productTypeNeedsChoice(): boolean {
    return this.offering === 'both' || this.offering === 'unknown';
  }

  get productNoun(): string {
    return this.selectedProductType === 'servicio' ? 'servicio' : 'producto';
  }

  get tracksInitialInventory(): boolean {
    return this.inventoryEnabled === true && this.selectedProductType === 'producto';
  }

  get requiresInventoryReadiness(): boolean {
    return this.inventoryEnabled === true &&
      (this.isImportRoute || this.selectedProductType === 'producto');
  }

  get needsImportedInventory(): boolean {
    return this.isImportRoute && this.requiresInventoryReadiness &&
      this.readiness?.product_ready === true && this.readiness?.inventory_ready !== true;
  }

  get selectedProductType(): ProductType {
    if (this.offering === 'services') return 'servicio';
    if (this.offering === 'products') return 'producto';
    return this.product.tipo;
  }

  get canSubmitCurrentStep(): boolean {
    if (this.isInitializing || this.isSaving) return false;

    switch (this.activeId) {
      case 'goal':
        return !!this.goal;
      case 'context':
        return !!this.offering && !!this.channel && this.inventoryEnabled !== null &&
          (this.inventoryEnabled !== true || this.warehouseName.trim().length >= 2) &&
          this.validThreshold;
      case 'product':
        if (this.readiness?.product_ready) return true;
        if (this.isImportRoute) return true;
        return this.product.nombre.trim().length >= 2 && this.parsedPrice > 0 &&
          (!this.tracksInitialInventory || this.validInitialQuantity);
      case 'payment':
        return this.readiness?.payment_ready === true || this.paymentMethods.length > 0;
      case 'result':
        // El intento final puede sembrar y verificar la numeración que aún
        // falte. Solo se completa después de que readiness lo confirme.
        return true;
      default:
        return false;
    }
  }

  get nextLabel(): string {
    if (this.activeId === 'product' && this.needsImportedInventory) {
      return 'Cargar existencias';
    }
    if (this.activeId === 'product' && this.isImportRoute && !this.readiness?.product_ready) {
      return 'Ya importé, verificar';
    }
    if (this.activeId === 'result') {
      if (this.isExploreRoute) return 'Explorar Katuq';
      return this.readiness?.ready_to_sell
        ? 'Finalizar y hacer una venta'
        : 'Preparar lo que falta';
    }
    return 'Guardar y continuar';
  }

  get nextHint(): string {
    switch (this.activeId) {
      case 'goal': return 'Elige lo que quieres lograr primero';
      case 'context':
        if (!this.offering) return 'Cuéntanos qué vendes';
        if (!this.channel) return 'Elige cómo vendes hoy';
        if (this.inventoryEnabled === null) return 'Indica si quieres controlar existencias';
        if (this.inventoryEnabled && this.warehouseName.trim().length < 2) return 'Escribe dónde guardas tus productos';
        if (!this.validThreshold) return 'El aviso de existencias debe ser un número entero desde cero';
        return 'Completa esta información';
      case 'product':
        if (this.isImportRoute) return 'Importa el archivo y vuelve para verificarlo';
        if (this.tracksInitialInventory && !this.validInitialQuantity) return 'Escribe cuántas unidades tienes hoy';
        return 'Escribe un nombre y un precio mayor que cero';
      case 'payment': return 'Elige al menos una forma de cobro';
      case 'result': return 'Todavía falta confirmar parte de la configuración';
      default: return 'Continuar';
    }
  }

  get parsedPrice(): number {
    if (typeof this.product.precio === 'number') {
      return Number.isFinite(this.product.precio) ? this.product.precio : 0;
    }
    const raw = String(this.product.precio || '').trim().replace(/\s|\$/g, '');
    if (!raw || !/^\d[\d.,]*$/.test(raw)) return 0;

    // En Colombia es natural escribir 50.000. También aceptamos 1,000.50 y
    // 1.000,50 sin convertir accidentalmente cincuenta mil en cincuenta.
    let normalized = raw;
    if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
      normalized = raw.replace(/[.,]/g, '');
    } else if (raw.includes('.') && raw.includes(',')) {
      const decimalSeparator = raw.lastIndexOf(',') > raw.lastIndexOf('.') ? ',' : '.';
      const groupingSeparator = decimalSeparator === ',' ? '.' : ',';
      normalized = raw.split(groupingSeparator).join('').replace(decimalSeparator, '.');
    } else if (raw.includes(',')) {
      normalized = raw.replace(',', '.');
    }
    const value = Number(normalized);
    return Number.isFinite(value) ? value : 0;
  }

  get validThreshold(): boolean {
    if (!this.inventoryEnabled || this.lowStockThreshold === '' || this.lowStockThreshold === null) return true;
    return parseLowStockThreshold(this.lowStockThreshold) !== null;
  }

  get validInitialQuantity(): boolean {
    const parsed = parseLowStockThreshold(this.initialQuantity);
    return parsed !== null && parsed > 0;
  }

  get readinessRows(): Array<{ key: string; label: string; ready: boolean }> {
    const readiness = this.readiness;
    const rows = [
      { key: 'company', label: 'Información de tu negocio', ready: readiness?.company_ready === true },
      { key: 'product', label: 'Producto o servicio con precio', ready: readiness?.product_ready === true },
      { key: 'payment', label: 'Una forma de cobro', ready: readiness?.payment_ready === true },
      { key: 'sequences', label: 'Numeración automática de ventas', ready: readiness?.sequences_ready === true }
    ];
    if (this.requiresInventoryReadiness) {
      rows.splice(2, 0, {
        key: 'inventory',
        label: 'Existencias iniciales',
        ready: readiness?.inventory_ready === true
      });
    }
    if (this.channel === 'delivery') {
      rows.splice(rows.length - 1, 0, {
        key: 'delivery',
        label: 'Forma de entrega',
        ready: readiness?.delivery_ready === true
      });
    }
    return rows;
  }

  get missingActionLabel(): string {
    if (this.readiness?.company_ready === false) return 'Completar datos de mi negocio';
    if (this.readiness?.product_ready === false) return 'Volver al producto o servicio';
    if (this.requiresInventoryReadiness && this.readiness?.inventory_ready === false) return 'Revisar mis existencias';
    if (this.readiness?.payment_ready === false) return 'Volver a las formas de cobro';
    if (this.channel === 'delivery' && this.readiness?.delivery_ready === false) return 'Revisar cómo entrego mis pedidos';
    return '';
  }

  selectGoal(goal: Goal): void {
    if (this.goal !== goal) {
      const previousOffering = this.offering;
      this.goal = goal;
      delete this.status.goal;
      delete this.status.context;
      delete this.status.result;
      if (goal === 'import_excel') {
        this.offering = 'products';
        this.product.tipo = 'producto';
        if (previousOffering === 'services' || previousOffering === 'unknown') {
          this.inventoryEnabled = null;
        }
      }
    }
    this.onDraftChange();
  }

  selectOffering(offering: Offering): void {
    const previous = this.offering;
    this.offering = offering;
    if (offering === 'services') {
      this.product.tipo = 'servicio';
      this.inventoryEnabled = false;
    }
    if (offering === 'unknown') this.inventoryEnabled = false;
    if (offering === 'products') this.product.tipo = 'producto';
    if ((offering === 'products' || offering === 'both') &&
        (previous === 'services' || previous === 'unknown')) {
      this.inventoryEnabled = null;
    }
    this.onDraftChange();
  }

  selectChannel(channel: Channel): void {
    this.channel = channel;
    this.onDraftChange();
  }

  selectInventory(enabled: boolean): void {
    this.inventoryEnabled = enabled;
    this.onDraftChange();
  }

  selectProductType(type: ProductType): void {
    this.product.tipo = type;
    this.onDraftChange();
  }

  togglePayment(label: string): void {
    const index = this.paymentMethods.indexOf(label);
    if (index >= 0) {
      this.paymentMethods = this.paymentMethods.filter(item => item !== label);
    } else {
      this.paymentMethods = this.paymentMethods.concat(label);
    }
    this.onDraftChange();
  }

  addCustomPayment(): void {
    const value = this.customPayment.trim();
    if (!value) return;
    if (!this.paymentMethods.some(item => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      this.paymentMethods = this.paymentMethods.concat(value);
    }
    this.customPayment = '';
    this.onDraftChange();
  }

  onDraftChange(): void {
    this.errorMessage = '';
    this.deferred = false;
    // Editar un paso que ya estaba listo obliga a volver a confirmarlo antes de
    // avanzar; de otro modo el menú permitiría saltar con datos aún no guardados.
    if (this.activeId !== 'result') delete this.status[this.activeId];
    delete this.status.result;
    this.resetProductRequestIfChanged();
    this.touchProgress();
    this.saveCache();
    this.queueProgressSync();
  }

  canOpenStep(step: WizardStep): boolean {
    if (step.id === this.activeId) return true;
    const firstUnresolved = this.all.findIndex(item => this.status[item.id] !== 'done');
    const stepIndex = this.all.findIndex(item => item.id === step.id);
    const boundary = firstUnresolved < 0 ? this.all.length - 1 : firstUnresolved;
    return stepIndex >= 0 && stepIndex <= boundary;
  }

  goStep(id: StepId): void {
    const step = this.all.find(item => item.id === id);
    if (!step || !this.canOpenStep(step)) return;
    this.activeId = id;
    this.touchProgress();
    this.mobileNavOpen = false;
    this.saveCache();
    this.queueProgressSync();
    if (id === 'result') this.refreshReadinessSafely();
  }

  goBack(): void {
    const index = this.all.findIndex(step => step.id === this.activeId);
    if (index <= 0) return;
    this.activeId = this.all[index - 1].id;
    this.touchProgress();
    this.saveCache();
    this.queueProgressSync();
  }

  async goNext(): Promise<void> {
    if (!this.canSubmitCurrentStep || this.isSaving) return;

    if (this.activeId === 'product' && this.needsImportedInventory) {
      await this.openInventoryImporter();
      return;
    }

    if (this.activeId === 'result') {
      if (this.isExploreRoute) await this.exploreNow();
      else await this.finishAndSell();
      return;
    }

    this.isSaving = true;
    this.deferred = false;
    this.errorMessage = '';
    try {
      await this.provisionCurrentStep();
      this.status = { ...this.status, [this.activeId]: 'done' };
      const currentIndex = this.all.findIndex(step => step.id === this.activeId);
      const remaining = this.all.slice(currentIndex + 1);
      const nextStep = remaining.find(step => this.status[step.id] !== 'done') ||
        remaining[remaining.length - 1] || this.all[this.all.length - 1];
      this.activeId = nextStep.id;
      this.touchProgress();
      await this.persistProgress();
      if (this.activeId === 'result') await this.refreshReadiness();
    } catch (error) {
      if (this.activeId === 'payment' && this.isInactiveResourceError(error)) {
        this.paymentNeedsManualActivation = true;
        const detail = error?.error?.details ||
          this.errorText(error, 'Ya existe una forma de cobro con ese nombre, pero está desactivada.');
        this.errorMessage = `${detail} Revísala en Métodos de pago o elige una diferente.`;
      } else {
        this.errorMessage = this.errorText(error, 'No pudimos guardar este paso. Inténtalo de nuevo.');
      }
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo continuar',
        detail: this.errorMessage
      });
    } finally {
      this.isSaving = false;
    }
  }

  async openImporter(): Promise<void> {
    this.importOpened = true;
    localStorage.setItem('showOnboardingBanner', 'true');
    sessionStorage.removeItem('onboarding_banner_dismissed');
    await this.persistProgress().catch(() => undefined);
    this.router.navigate(['/productos'], {
      queryParams: { onboardingImport: 'products', onboardingReturn: '/onboarding' }
    });
  }

  async openInventoryImporter(): Promise<void> {
    this.importOpened = true;
    localStorage.setItem('showOnboardingBanner', 'true');
    sessionStorage.removeItem('onboarding_banner_dismissed');
    await this.persistProgress().catch(() => undefined);
    this.router.navigate(['/inventario/inventario-catalogo'], {
      queryParams: { onboardingImport: 'inventory', onboardingReturn: '/onboarding' }
    });
  }

  async continueLater(): Promise<void> {
    this.deferred = true;
    localStorage.setItem('showOnboardingBanner', 'true');
    sessionStorage.removeItem('onboarding_banner_dismissed');
    await this.persistProgress().catch(() => undefined);
    this.router.navigate(['/welcome']);
  }

  async viewProducts(): Promise<void> {
    localStorage.setItem('showOnboardingBanner', 'true');
    sessionStorage.removeItem('onboarding_banner_dismissed');
    await this.persistProgress().catch(() => undefined);
    this.router.navigate(['/productos']);
  }

  async managePaymentMethods(): Promise<void> {
    localStorage.setItem('showOnboardingBanner', 'true');
    sessionStorage.removeItem('onboarding_banner_dismissed');
    await this.persistProgress().catch(() => undefined);
    this.router.navigate(['/extras/formasPago']);
  }

  async resolveFirstMissing(): Promise<void> {
    if (this.readiness?.company_ready === false) {
      localStorage.setItem('showOnboardingBanner', 'true');
      sessionStorage.removeItem('onboarding_banner_dismissed');
      await this.persistProgress().catch(() => undefined);
      this.router.navigate(['/empresas']);
      return;
    }
    if (this.readiness?.product_ready === false) {
      this.goStep('product');
      return;
    }
    if (this.requiresInventoryReadiness && this.readiness?.inventory_ready === false) {
      localStorage.setItem('showOnboardingBanner', 'true');
      sessionStorage.removeItem('onboarding_banner_dismissed');
      await this.persistProgress().catch(() => undefined);
      this.router.navigate(['/inventario/inventario-catalogo'], {
        queryParams: { onboardingImport: 'inventory', onboardingReturn: '/onboarding' }
      });
      return;
    }
    if (this.readiness?.payment_ready === false) this.goStep('payment');
    else if (this.channel === 'delivery' && this.readiness?.delivery_ready === false) {
      localStorage.setItem('showOnboardingBanner', 'true');
      sessionStorage.removeItem('onboarding_banner_dismissed');
      await this.persistProgress().catch(() => undefined);
      this.router.navigate(['/formasEntrega']);
    }
  }

  async retryReadiness(): Promise<void> {
    await this.refreshReadinessSafely();
  }

  private async provisionCurrentStep(): Promise<void> {
    switch (this.activeId) {
      case 'goal':
        return;
      case 'context':
        if (this.inventoryEnabled && this.warehouseName.trim()) {
          this.warehouseBusinessCode = await this.onboardingService.savePrimaryWarehouse(
            this.companyKey,
            this.warehouseName,
            this.warehouseCity
          ) || '';
          const threshold = parseLowStockThreshold(this.lowStockThreshold);
          if (threshold !== null) {
            await this.onboardingService.saveLowStockThreshold(threshold);
          }
        }
        return;
      case 'product':
        if (this.readiness?.product_ready) return;
        if (this.isImportRoute) {
          await this.refreshReadiness();
          if (!this.readiness?.product_ready) {
            throw new Error('Aún no encontramos productos importados. Termina la importación y vuelve a verificar.');
          }
          return;
        }
        await this.createMinimalProduct();
        return;
      case 'payment':
        if (!this.readiness?.payment_ready || this.paymentMethods.length > 0) {
          const hints: Record<string, string> = {};
          this.paymentOptions.forEach(option => { hints[option.label] = option.hint; });
          await this.onboardingService.savePaymentMethods(this.companyKey, this.paymentMethods, hints);
        }
        await this.refreshReadiness();
        if (!this.readiness?.payment_ready) {
          throw new Error('La forma de cobro no quedó confirmada. Inténtalo nuevamente.');
        }
        return;
      default:
        return;
    }
  }

  private async createMinimalProduct(): Promise<void> {
    const type = this.selectedProductType;
    const inventariable = this.tracksInitialInventory;
    const cantidadInicial = inventariable ? parseLowStockThreshold(this.initialQuantity) : 0;
    const fingerprint = JSON.stringify({
      nombre: this.product.nombre.trim(),
      precio: this.parsedPrice,
      fotoUrl: this.product.fotoUrl.trim(),
      tipo: type,
      inventariable,
      cantidadInicial,
      idBodega: inventariable ? this.warehouseBusinessCode : ''
    });

    if (!this.product.requestId || this.product.requestFingerprint !== fingerprint) {
      this.product.requestId = this.createRequestId();
      this.product.requestFingerprint = fingerprint;
      // La clave se persiste antes del comando para cubrir refresco/doble pestaña.
      await this.persistProgress();
    }

    const payload: MinimalOnboardingProduct = {
      nombre: this.product.nombre.trim(),
      precio: this.parsedPrice,
      tipo: type,
      requestId: this.product.requestId,
      inventariable,
      cantidadInicial: cantidadInicial || 0
    };
    if (this.product.fotoUrl.trim()) payload.fotoUrl = this.product.fotoUrl.trim();
    if (inventariable && this.warehouseBusinessCode) payload.idBodega = this.warehouseBusinessCode;

    const created = await this.onboardingService.createMinimalProduct(payload);
    this.product.resourceId = created?.id || created?.cd || created?.productId || this.product.resourceId;
    await this.refreshReadiness();
    if (!this.readiness?.product_ready) {
      throw new Error(`El ${this.productNoun} se guardó, pero todavía no aparece listo para vender.`);
    }
  }

  private async finishAndSell(): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    this.errorMessage = '';
    try {
      // Readiness lee el contexto canónico del backend. Guardarlo primero evita
      // exigir inventario antiguo si la persona cambió su primer ítem a servicio.
      await this.persistProgress();
      const seedResult = await this.onboardingService.seedRemainingDefaults(this.companyKey);
      await this.refreshReadiness();
      if (!this.readiness?.ready_to_sell) {
        throw new Error(this.describeMissingReadiness());
      }

      await this.onboardingService.completeOnboarding();
      this.status = { ...this.status, result: 'done' };
      if (this.progressTimer) {
        clearTimeout(this.progressTimer);
        this.progressTimer = null;
      }
      this.clearProgress();
      localStorage.removeItem('showOnboardingBanner');
      sessionStorage.removeItem('onboarding_banner_dismissed');
      this.messageService.add({
        severity: 'success',
        summary: '¡Ya puedes vender!',
        detail: seedResult.optionalFailures.length
          ? 'Producto, cobro y numeración están listos. Algunas opciones de equipo o entrega quedaron para después.'
          : 'Abriremos una venta para que pruebes el flujo completo.',
        life: 3000
      });
      setTimeout(() => this.router.navigate(['/ventas/crear-ventas']), seedResult.optionalFailures.length ? 1200 : 600);
    } catch (error) {
      this.errorMessage = this.errorText(error, 'No pudimos finalizar la configuración. Tu avance sigue guardado.');
      this.messageService.add({
        severity: 'error',
        summary: 'Tu avance está a salvo',
        detail: this.errorMessage
      });
    } finally {
      this.isSaving = false;
    }
  }

  private async exploreNow(): Promise<void> {
    this.deferred = true;
    localStorage.setItem('showOnboardingBanner', 'true');
    sessionStorage.removeItem('onboarding_banner_dismissed');
    await this.persistProgress().catch(() => undefined);
    this.router.navigate(['/welcome']);
  }

  private async refreshReadiness(): Promise<OnboardingReadiness> {
    this.isCheckingReadiness = true;
    try {
      const readiness = await this.onboardingService.getReadiness();
      this.readiness = readiness;

      if (readiness.product_ready) this.status = { ...this.status, product: 'done' };
      else delete this.status.product;

      if (readiness.payment_ready) {
        // Tener un método previo permite confirmar este paso con un clic, pero
        // no debe saltárselo: la persona necesita entender cómo se registran
        // los cobros antes de llegar al resultado.
        this.paymentNeedsManualActivation = false;
      } else {
        delete this.status.payment;
      }

      return readiness;
    } finally {
      this.isCheckingReadiness = false;
    }
  }

  private async refreshReadinessSafely(): Promise<void> {
    this.errorMessage = '';
    try {
      // Primero sincronizar las decisiones contextuales que cambian los
      // requisitos (inventario/entrega); después pedir la verificación real.
      await this.persistProgress();
      await this.refreshReadiness();
      this.normalizeActiveStep();
      await this.persistProgress();
    } catch (error) {
      this.errorMessage = this.errorText(error, 'No pudimos volver a comprobar la configuración.');
    }
  }

  private normalizeActiveStep(): void {
    if (!this.all.some(step => step.id === this.activeId)) this.activeId = this.all[0].id;
    const active = this.all.find(step => step.id === this.activeId);
    if (!active || !this.canOpenStep(active)) {
      this.activeId = this.all.find(step => this.status[step.id] !== 'done')?.id || this.all[0].id;
    }
  }

  private buildProgress(): OnboardingV2Progress {
    return {
      schemaVersion: 'v2',
      activeRoute: this.goal || undefined,
      context: {
        offering: this.offering,
        channel: this.channel,
        inventoryEnabled: this.requiresInventoryReadiness,
        lastUpdated: this.progressUpdatedAt || new Date().toISOString()
      },
      currentStepId: this.activeId,
      steps: Object.keys(this.status).reduce((result, key) => {
        result[key] = { status: this.status[key as StepId] };
        return result;
      }, {} as Record<string, any>),
      draft: {
        warehouseName: this.warehouseName,
        warehouseCity: this.warehouseCity,
        warehouseBusinessCode: this.warehouseBusinessCode,
        lowStockThreshold: this.lowStockThreshold,
        inventoryPreference: this.inventoryEnabled,
        initialQuantity: this.initialQuantity,
        product: this.product,
        paymentMethods: this.paymentMethods,
        importOpened: this.importOpened,
        deferred: this.deferred
      }
    };
  }

  private applyProgress(progress: OnboardingV2Progress | null, replace = false): void {
    if (!progress || progress.schemaVersion !== 'v2') return;
    const progressTimestamp = String(progress.context?.lastUpdated || '');
    if (this.validTimestamp(progressTimestamp)) this.progressUpdatedAt = progressTimestamp;
    const validGoals: Goal[] = ['sell_today', 'import_excel', 'explore'];
    const validOfferings: Offering[] = ['products', 'services', 'both', 'unknown'];
    const validChannels: Channel[] = ['local', 'social', 'delivery', 'unknown'];
    this.goal = validGoals.includes(progress.activeRoute as Goal)
      ? progress.activeRoute as Goal
      : (replace ? null : this.goal);
    this.offering = validOfferings.includes(progress.context?.offering as Offering)
      ? progress.context?.offering as Offering
      : (replace ? null : this.offering);
    this.channel = validChannels.includes(progress.context?.channel as Channel)
      ? progress.context?.channel as Channel
      : (replace ? null : this.channel);
    if (typeof progress.context?.inventoryEnabled === 'boolean') {
      this.inventoryEnabled = progress.context.inventoryEnabled;
    } else if (replace) {
      this.inventoryEnabled = null;
    }
    if ((this.offering === 'services' || this.offering === 'unknown') && this.inventoryEnabled === null) {
      this.inventoryEnabled = false;
    }

    const statuses: Partial<Record<StepId, 'done'>> = {};
    Object.keys(progress.steps || {}).forEach(key => {
      const value = progress.steps?.[key];
      if ((value?.status || value) === 'done' && this.baseSteps.some(step => step.id === key)) {
        statuses[key as StepId] = 'done';
      }
    });
    this.status = statuses;

    const draft = progress.draft || {};
    if (typeof draft.inventoryPreference === 'boolean') {
      this.inventoryEnabled = draft.inventoryPreference;
    }
    if (this.offering === 'services' || this.offering === 'unknown') {
      this.inventoryEnabled = false;
    }
    this.warehouseName = String(draft.warehouseName || (replace ? 'Bodega principal' : this.warehouseName));
    this.warehouseCity = String(draft.warehouseCity || (replace ? '' : this.warehouseCity));
    this.warehouseBusinessCode = String(draft.warehouseBusinessCode || (replace ? '' : this.warehouseBusinessCode));
    if (draft.lowStockThreshold !== undefined) this.lowStockThreshold = draft.lowStockThreshold;
    else if (replace) this.lowStockThreshold = 5;
    if (draft.initialQuantity !== undefined) this.initialQuantity = draft.initialQuantity;
    else if (replace) this.initialQuantity = 1;
    if (draft.product && typeof draft.product === 'object') {
      this.product = {
        ...(replace ? { nombre: '', precio: '', fotoUrl: '', tipo: 'producto' as ProductType } : this.product),
        ...draft.product,
        tipo: draft.product.tipo === 'servicio' ? 'servicio' : 'producto'
      };
    } else if (replace) {
      this.product = { nombre: '', precio: '', fotoUrl: '', tipo: 'producto' };
    }
    this.paymentMethods = Array.isArray(draft.paymentMethods)
      ? draft.paymentMethods.filter((item: any) => typeof item === 'string').slice(0, 20)
      : (replace ? [] : this.paymentMethods);
    this.importOpened = draft.importOpened === true || (!replace && this.importOpened);
    this.deferred = draft.deferred === true;

    if (this.baseSteps.some(step => step.id === progress.currentStepId)) {
      this.activeId = progress.currentStepId as StepId;
    } else if (replace) {
      this.activeId = 'goal';
    }

    if (!this.goal) delete this.status.goal;
    if (!this.offering || !this.channel || this.inventoryEnabled === null) delete this.status.context;
    // El resultado solo se marca como terminado desde el flag autenticado del
    // backend, después de aplicar el progreso remoto en ngOnInit.
    delete this.status.result;
  }

  private loadCachedProgress(): OnboardingV2Progress | null {
    if (!this.cacheKey) return null;
    return this.readJson(localStorage.getItem(this.cacheKey));
  }

  private saveCache(): void {
    if (!this.cacheKey) return;
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.buildProgress()));
    } catch { /* la sincronización remota sigue siendo la fuente canónica */ }
  }

  private clearProgress(): void {
    if (this.cacheKey) localStorage.removeItem(this.cacheKey);
  }

  private queueProgressSync(): void {
    if (!this.cacheKey) return;
    if (this.progressTimer) clearTimeout(this.progressTimer);
    this.progressTimer = setTimeout(() => {
      this.persistProgress().catch(() => {
        this.progressWarning = 'No pudimos sincronizar ahora; conservamos una copia segura en este dispositivo.';
      });
    }, 700);
  }

  private async clearDeferredOnEntry(): Promise<void> {
    if (!this.deferred) return;
    this.deferred = false;
    this.touchProgress();
    this.saveCache();
    try {
      await this.onboardingService.saveV2Progress(this.buildProgress());
      this.progressWarning = '';
    } catch {
      this.progressWarning = 'Abrimos tu avance, pero todavía no pudimos sincronizarlo.';
      this.queueProgressSync();
    }
  }

  private async persistProgress(): Promise<void> {
    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
      this.progressTimer = null;
    }
    this.touchProgress();
    this.saveCache();
    await this.onboardingService.saveV2Progress(this.buildProgress());
    this.progressWarning = '';
  }

  private resetProductRequestIfChanged(): void {
    if (!this.product.requestFingerprint) return;
    const current = JSON.stringify({
      nombre: this.product.nombre.trim(),
      precio: this.parsedPrice,
      fotoUrl: this.product.fotoUrl.trim(),
      tipo: this.selectedProductType,
      inventariable: this.tracksInitialInventory,
      cantidadInicial: this.tracksInitialInventory ? parseLowStockThreshold(this.initialQuantity) : 0,
      idBodega: this.tracksInitialInventory ? this.warehouseBusinessCode : ''
    });
    if (current !== this.product.requestFingerprint) {
      delete this.product.requestId;
      delete this.product.requestFingerprint;
    }
  }

  private touchProgress(): void {
    this.progressUpdatedAt = new Date().toISOString();
  }

  private newestProgress(
    cached: OnboardingV2Progress | null,
    remote: OnboardingV2Progress
  ): OnboardingV2Progress {
    if (!cached) return remote;
    const cachedAt = this.progressTimestamp(cached);
    const remoteAt = this.progressTimestamp(remote);
    if (!cachedAt) return remote;
    if (!remoteAt) return cached;
    return cachedAt > remoteAt ? cached : remote;
  }

  private progressTimestamp(progress: OnboardingV2Progress | null): number {
    if (!progress) return 0;
    const value = String(progress.context?.lastUpdated || '');
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private validTimestamp(value: string): boolean {
    return !!value && Number.isFinite(Date.parse(value));
  }

  private createRequestId(): string {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch { /* fallback */ }
    return `onb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private readJson(raw: string | null): any {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  private errorText(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.details || error?.error?.error || error?.message || fallback;
  }

  private isInactiveResourceError(error: any): boolean {
    return error?.error?.code === 'ONBOARDING_RESOURCE_INACTIVE' ||
      error?.code === 'ONBOARDING_RESOURCE_INACTIVE';
  }

  private describeMissingReadiness(): string {
    const labels: Record<string, string> = {
      company: 'los datos del negocio',
      product: 'un producto o servicio real',
      payment_method: 'una forma de cobro',
      sequences: 'la numeración automática',
      delivery_method: 'una forma de entrega',
      inventory: 'existencias disponibles'
    };
    const missing = (this.readiness?.missing || [])
      .map(item => labels[item] || '')
      .filter(Boolean);
    return missing.length
      ? `Aún falta confirmar ${missing.join(', ')}. Tu avance sigue guardado.`
      : 'Todavía falta confirmar uno de los requisitos. Revisa el resumen e inténtalo de nuevo.';
  }
}
