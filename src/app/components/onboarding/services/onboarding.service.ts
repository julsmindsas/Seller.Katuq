import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  OnboardingState,
  OnboardingStep,
  OnboardingStepId,
  OnboardingStepStatus,
  OnboardingProgress,
  initializeOnboardingState,
  calculateProgress,
  isStepAvailable,
  getNextAvailableStep,
  ONBOARDING_STEPS_CONFIG
} from '../models/onboarding-state.model';

/**
 * Servicio principal para gestionar el estado y progreso del onboarding
 * Maneja la persistencia en localStorage y sincronización con backend
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private readonly STORAGE_KEY = 'katuq_onboarding_state';
  private readonly POSTPONE_REMINDER_HOURS = 24;
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 segundos

  private urlBase: string = environment.urlApi;
  private httpOptions: any;

  // Estado reactivo del onboarding - públicos para acceso desde componentes
  public onboardingState$ = new BehaviorSubject<OnboardingState | null>(null);
  public currentStep$ = new BehaviorSubject<OnboardingStep | null>(null);
  public isWizardOpen$ = new BehaviorSubject<boolean>(false);

  // Timer para auto-guardado
  private autoSaveTimer: any;

  constructor(private http: HttpClient) {
    // Fix: HttpHeaders es inmutable, usar .set() y asignar el resultado
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    this.httpOptions = { headers };

    // Cargar estado inicial del localStorage
    this.loadStateFromStorage();
  }

  /**
   * Obtiene opciones HTTP con headers correctos incluyendo company
   */
  private getHttpOptions(company?: string): any {
    let headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    if (company) {
      headers = headers.set('company', company);
    }

    return { headers };
  }

  // ==================== OBSERVABLES PÚBLICOS ====================

  /**
   * Observable del estado completo del onboarding
   */
  get state(): Observable<OnboardingState | null> {
    return this.onboardingState$.asObservable();
  }

  /**
   * Observable del paso actual
   */
  get currentStep(): Observable<OnboardingStep | null> {
    return this.currentStep$.asObservable();
  }

  /**
   * Observable del estado del wizard (abierto/cerrado)
   */
  get isWizardOpen(): Observable<boolean> {
    return this.isWizardOpen$.asObservable();
  }

  // ==================== INICIALIZACIÓN Y ESTADO ====================

  /**
   * Inicializa el onboarding para un nuevo usuario
   */
  async initializeOnboarding(userEmail: string, userId: string): Promise<OnboardingState> {
    const state = initializeOnboardingState(userEmail, userId);

    // Verificar y cargar datos existentes
    await this.loadExistingData(state);

    // loadExistingData puede marcar varios pasos como COMPLETED (empresa
    // detectada con bodegas, pagos, categorías, etc. ya configurados por el
    // registro). Sin esto, el wizard siempre abría en COMPANY_INFO aunque
    // casi todo ya estuviera hecho.
    const nextStepId = getNextAvailableStep(state) || OnboardingStepId.COMPANY_INFO;
    state.currentStepId = nextStepId;

    this.onboardingState$.next(state);
    this.currentStep$.next(state.steps.get(nextStepId)!);
    this.saveStateToStorage();
    return state;
  }

  /**
   * Espera a que los datos de empresa estén disponibles en storage
   * FIX: Retry logic para evitar race conditions
   */
  private async waitForCompanyData(maxRetries: number = 10, delayMs: number = 300): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      const company = this.getCompanyFromStorage();
      if (company?.nit || company?.nomComercial || company?.NIT) {
        console.log(`✅ Empresa encontrada en storage (intento ${i + 1}/${maxRetries})`);
        return company;
      }

      console.log(`⏳ Esperando empresa en storage (intento ${i + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    console.warn(`⚠️ Empresa no disponible después de ${maxRetries} intentos`);
    return null;
  }

  /**
   * Obtiene empresa desde storage (sessionStorage o localStorage)
   */
  private getCompanyFromStorage(): any {
    try {
      let company = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      if (!company?.nit && !company?.nomComercial) {
        company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      }
      return company;
    } catch (error) {
      console.error('Error parsing company from storage:', error);
      return null;
    }
  }

  /**
   * Carga datos existentes de la empresa y marca pasos como completados
   */
  private async loadExistingData(state: OnboardingState): Promise<void> {
    try {
      // FIX #1: Usar retry logic para esperar a que los datos estén disponibles
      let company = await this.waitForCompanyData();

      // Si después del retry no hay datos, intentar una vez más desde storage
      if (!company || (!company.nit && !company.nomComercial && !company.NIT)) {
        company = this.getCompanyFromStorage();
        if (company?.nit || company?.nomComercial) {
          console.log('📦 Empresa cargada desde storage:', company.nomComercial || company.nombre);
        }
      }

      // NUEVO: Si no hay en storage, buscar en Firestore por usuario
      if (!company?.nit && !company?.nomComercial) {
        console.log('🔍 No hay empresa en storage, buscando en Firestore por usuario:', state.userEmail);
        try {
          const response: any = await this.http.get(
            `${this.urlBase}/v1/companies/by-user?email=${state.userEmail}`,
            this.httpOptions
          ).toPromise();

          if (response && response.length > 0) {
            company = response[0]; // Tomar la primera empresa del usuario
            console.log('✅ Empresa encontrada en Firestore:', company.nomComercial || company.nombre);
            // Guardar en storage para futuras cargas
            localStorage.setItem('currentCompany', JSON.stringify(company));
            sessionStorage.setItem('currentCompany', JSON.stringify(company));
          } else {
            console.log('⚠️ No se encontró empresa para el usuario en Firestore');
          }
        } catch (error) {
          console.error('❌ Error buscando empresa en Firestore:', error);
        }
      }

      console.log('🏢 Datos de empresa encontrados:', { nit: company?.nit, nomComercial: company?.nomComercial, nombre: company?.nombre });

      // FIX #4: Verificación más flexible - aceptar diferentes nombres de campos
      const companyIdentifier = company.nit || company.NIT || company.numeroDocumento || company.id;
      if (!companyIdentifier) {
        console.log('ℹ️ Usuario nuevo sin empresa - se iniciará desde el paso 1');
        return; // Esto es esperado para usuarios que están iniciando el onboarding
      }

      console.log('🔍 Verificando datos existentes para:', company.nomComercial || company.nombre);

      // Fix: Primero verificar si la empresa existe para evitar 11 requests innecesarios en usuarios nuevos
      const companyExists = await this.checkCompanyInfo(company, state);

      if (!companyExists) {
        console.log('ℹ️ Usuario nuevo detectado - inicializando desde cero (sin recursos configurados)');
        // No hacer más verificaciones, es usuario nuevo
        state.completedSteps = 0;
        state.progressPercentage = 0;
      } else {
        console.log('✓ Empresa existente - verificando recursos configurados...');

        // Solo si la empresa existe, verificar otros recursos
        const checks = await Promise.all([
          this.checkRoles(companyIdentifier, state),
          this.checkUsers(state), // Auto-completar si el usuario actual existe
          this.checkDeliveryMethods(companyIdentifier, state),
          this.checkDeliveryTypes(companyIdentifier, state),
          this.checkDeliveryTimes(companyIdentifier, state),
          this.checkPaymentMethods(companyIdentifier, state),
          this.checkBillingZones(companyIdentifier, state),
          this.checkCategories(companyIdentifier, state),
          this.checkWarehouses(companyIdentifier, state),
          this.checkProducts(companyIdentifier, state),
          this.checkSequences(companyIdentifier, state)
        ]);

        // +1 por companyInfo que ya verificamos
        const completedCount = checks.filter(c => c).length + 1;
        console.log(`✅ ${completedCount} de 12 pasos ya configurados`);

        // Recalcular progreso
        state.completedSteps = Array.from(state.steps.values()).filter(
          s => s.status === OnboardingStepStatus.COMPLETED
        ).length;
        state.progressPercentage = calculateProgress(state);
      }

    } catch (error) {
      console.error('Error cargando datos existentes:', error);
    }
  }

  /**
   * Recarga datos existentes desde el backend (para cuando el usuario refresca la página)
   */
  async reloadExistingData(): Promise<void> {
    const state = this.onboardingState$.value;
    if (!state) {
      console.warn('⚠️ No hay estado para recargar');
      return;
    }

    await this.loadExistingData(state);
    this.saveStateToStorage();
  }

  /**
   * Verifica si la empresa tiene información completa
   */
  private async checkCompanyInfo(company: any, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando información de empresa:', {
        nombre: company.nombre,
        nit: company.nit,
        email: company.email || company.emailContactoGeneral,
        nomComercial: company.nomComercial
      });

      // Construir query parameter (preferir nit, fallback a nomComercial)
      const queryParam = company.nit
        ? `nit=${encodeURIComponent(company.nit)}`
        : `nomComercial=${encodeURIComponent(company.nomComercial || company.nombre)}`;

      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/company/check?${queryParam}`,
        this.httpOptions
      ).toPromise();

      if (response.exists && response.data) {
        console.log(`✅ Empresa encontrada en backend: ${response.data.nomComercial || response.data.nombre}`);
        const step = state.steps.get(OnboardingStepId.COMPANY_INFO);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = response.data;
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ Empresa no encontrada en backend');
    } catch (error) {
      console.error('❌ Error checking company info:', error);
    }
    return false;
  }

  /**
   * Verifica si existen roles configurados
   */
  private async checkRoles(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando roles para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/roles/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Roles encontrados: ${response.count}`);
        const step = state.steps.get(OnboardingStepId.ROLES_SETUP);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { roles: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron roles');
    } catch (error) {
      console.error('❌ Error checking roles:', error);
    }
    return false;
  }

  /**
   * Verifica si el usuario actual existe (auto-completa paso USERS_SETUP)
   */
  private async checkUsers(state: OnboardingState): Promise<boolean> {
    try {
      console.log('👤 Verificando usuario actual para auto-completar USERS_SETUP');

      // Si el usuario está logeado y tiene email, el paso USERS_SETUP debe estar completado
      if (state.userEmail) {
        console.log(`✅ Usuario actual encontrado: ${state.userEmail}`);
        const step = state.steps.get(OnboardingStepId.USERS_SETUP);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = {
            currentUser: {
              email: state.userEmail,
              uid: state.userId
            },
            count: 1
          };
          step.completedAt = new Date();
        }
        return true;
      }

      console.log('⚠️ No se encontró usuario actual');
    } catch (error) {
      console.error('❌ Error checking users:', error);
    }
    return false;
  }

  /**
   * Verifica si existen formas de entrega
   */
  private async checkDeliveryMethods(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando formas de entrega para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/delivery-methods/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Formas de entrega encontradas: ${response.count}`);
        const step = state.steps.get(OnboardingStepId.DELIVERY_METHODS);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { methods: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron formas de entrega');
    } catch (error) {
      console.error('❌ Error checking delivery methods:', error);
    }
    return false;
  }

  /**
   * Verifica si existen tipos de entrega
   */
  private async checkDeliveryTypes(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando tipos de entrega para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/delivery-types/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Tipos de entrega encontrados: ${response.count}`);
        const step = state.steps.get(OnboardingStepId.DELIVERY_TYPES);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { data: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron tipos de entrega');
    } catch (error) {
      console.error('❌ Error checking delivery types:', error);
    }
    return false;
  }

  /**
   * Verifica si existen tiempos de entrega
   */
  private async checkDeliveryTimes(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando tiempos de entrega para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/delivery-times/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Tiempos de entrega encontrados: ${response.count}`);
        const step = state.steps.get(OnboardingStepId.DELIVERY_TIMES);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { times: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron tiempos de entrega');
    } catch (error) {
      console.error('❌ Error checking delivery times:', error);
    }
    return false;
  }

  /**
   * Verifica si existen zonas de cobro
   */
  private async checkBillingZones(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando zonas de cobro para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/billing-zones/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Zonas de cobro encontradas: ${response.count}`);
        const step = state.steps.get(OnboardingStepId.BILLING_ZONES);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { zones: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron zonas de cobro');
    } catch (error) {
      console.error('❌ Error checking billing zones:', error);
    }
    return false;
  }

  /**
   * Verifica si existen formas de pago
   */
  private async checkPaymentMethods(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando formas de pago para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/payment-methods/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Formas de pago encontradas: ${response.count} (web: ${response.breakdown?.web || 0}, pos: ${response.breakdown?.pos || 0})`);
        const step = state.steps.get(OnboardingStepId.PAYMENT_METHODS);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = {
            methods: response.data,
            count: response.count,
            breakdown: response.breakdown
          };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron formas de pago');
    } catch (error) {
      console.error('❌ Error checking payment methods:', error);
    }
    return false;
  }

  /**
   * Verifica si existen categorías
   */
  private async checkCategories(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando categorías para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/categories/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Categorías encontradas: ${response.count}`);
        const step = state.steps.get(OnboardingStepId.CATEGORIES);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { categories: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron categorías');
    } catch (error) {
      console.error('❌ Error checking categories:', error);
    }
    return false;
  }

  /**
   * Verifica si existen bodegas
   */
  private async checkWarehouses(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando bodegas para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/warehouses/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Bodegas encontradas: ${response.count}`);
        const step = state.steps.get(OnboardingStepId.WAREHOUSES);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { warehouses: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron bodegas');
    } catch (error) {
      console.error('❌ Error checking warehouses:', error);
    }
    return false;
  }

  /**
   * Verifica si existen productos
   */
  private async checkProducts(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando productos para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/products/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Productos encontrados: ${response.count}`);
        const step = state.steps.get(OnboardingStepId.FIRST_PRODUCT);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { products: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron productos');
    } catch (error) {
      console.error('❌ Error checking products:', error);
    }
    return false;
  }

  /**
   * Verifica si existen secuencias de numeración configuradas
   */
  private async checkSequences(company: string, state: OnboardingState): Promise<boolean> {
    try {
      console.log('🔍 Verificando consecutivos para:', company);
      const response: any = await this.http.get(
        `${this.urlBase}/v1/onboarding/sequences/check`,
        this.getHttpOptions(company)
      ).toPromise();

      if (response.exists && response.count > 0) {
        console.log(`✅ Consecutivos encontrados: ${response.count}${response.isComplete ? ' (completo)' : ''}`);
        const step = state.steps.get(OnboardingStepId.SEQUENCES);
        if (step) {
          step.status = OnboardingStepStatus.COMPLETED;
          step.data = { consecutivos: response.data, count: response.count };
          step.completedAt = new Date();
        }
        return true;
      }
      console.log('⚠️ No se encontraron consecutivos');
    } catch (error) {
      console.error('❌ Error checking consecutivos:', error);
    }
    return false;
  }

  /**
   * Verifica todos los pasos del onboarding en paralelo
   * Útil para mostrar progreso general y pasos completados
   *
   * @param company Identificador de la empresa (NIT o ID)
   * @returns Objeto con el estado de cada paso verificado
   */
  async checkAllSteps(company: string): Promise<{
    company: boolean;
    roles: boolean;
    warehouses: boolean;
    paymentMethods: boolean;
    deliveryMethods: boolean;
    categories: boolean;
    products: boolean;
    sequences: boolean;
  }> {
    try {
      console.log('🔍 Verificando todos los pasos del onboarding para:', company);

      const httpOptions = this.getHttpOptions(company);
      const [roles, warehouses, payments, delivery, categories, products, sequences] = await Promise.all([
        this.http.get(`${this.urlBase}/v1/onboarding/roles/check`, httpOptions).toPromise(),
        this.http.get(`${this.urlBase}/v1/onboarding/warehouses/check`, httpOptions).toPromise(),
        this.http.get(`${this.urlBase}/v1/onboarding/payment-methods/check`, httpOptions).toPromise(),
        this.http.get(`${this.urlBase}/v1/onboarding/delivery-methods/check`, httpOptions).toPromise(),
        this.http.get(`${this.urlBase}/v1/onboarding/categories/check`, httpOptions).toPromise(),
        this.http.get(`${this.urlBase}/v1/onboarding/products/check`, httpOptions).toPromise(),
        this.http.get(`${this.urlBase}/v1/onboarding/sequences/check`, httpOptions).toPromise()
      ]);

      const result = {
        company: true, // si llegamos aquí, la empresa existe
        roles: (roles as any)?.exists || false,
        warehouses: (warehouses as any)?.exists || false,
        paymentMethods: (payments as any)?.exists || false,
        deliveryMethods: (delivery as any)?.exists || false,
        categories: (categories as any)?.exists || false,
        products: (products as any)?.exists || false,
        sequences: (sequences as any)?.exists || false
      };

      console.log('✅ Verificación completa:', result);
      return result;
    } catch (error) {
      console.error('❌ Error verificando pasos:', error);
      throw error;
    }
  }

  /**
   * Verifica si el usuario ha completado el onboarding
   * FIX: Backend es la fuente de verdad, localStorage solo como fallback
   */
  async checkOnboardingStatus(userEmail: string): Promise<boolean> {
    try {
      // ✅ PRIMERO: Verificar en backend (fuente de verdad)
      const response: any = await this.http.get(
        `${this.urlBase}/v1/users/onboarding/status?email=${userEmail}`,
        this.httpOptions
      ).toPromise();

      const backendCompleted = response?.onboardingCompleted || false;

      // ✅ SEGUNDO: Sincronizar localStorage con backend
      const localState = this.loadStateFromStorage();
      if (localState && localState.isCompleted !== backendCompleted) {
        console.log(`🔄 Sincronizando localStorage con backend: ${backendCompleted}`);
        localState.isCompleted = backendCompleted;
        this.onboardingState$.next(localState);
        this.saveStateToStorage();
      }

      return backendCompleted;

    } catch (error) {
      console.error('❌ Error verificando estado de onboarding:', error);

      // Fallback: Si falla el backend, usar localStorage
      const localState = this.loadStateFromStorage();
      if (localState?.isCompleted) {
        console.warn('⚠️ Usando localStorage como fallback');
        return true;
      }

      return false;
    }
  }

  /**
   * Obtiene el estado actual del onboarding
   */
  getCurrentState(): OnboardingState | null {
    return this.onboardingState$.value;
  }

  /**
   * Obtiene un paso específico por su ID
   */
  getStep(stepId: OnboardingStepId): OnboardingStep | null {
    const state = this.onboardingState$.value;
    return state?.steps.get(stepId) || null;
  }

  /**
   * Obtiene el progreso en porcentaje
   */
  getProgressPercentage(): number {
    const state = this.onboardingState$.value;
    return state ? calculateProgress(state) : 0;
  }

  /**
   * Obtiene el número de pasos completados
   */
  getCompletedStepsCount(): number {
    const state = this.onboardingState$.value;
    if (!state) return 0;

    return Array.from(state.steps.values()).filter(
      step => step.status === OnboardingStepStatus.COMPLETED ||
              step.status === OnboardingStepStatus.SKIPPED
    ).length;
  }

  // ==================== NAVEGACIÓN DE PASOS ====================

  /**
   * Navega al siguiente paso disponible
   */
  goToNextStep(): boolean {
    const state = this.onboardingState$.value;
    if (!state) return false;

    const nextStepId = getNextAvailableStep(state);
    if (!nextStepId) return false;

    return this.goToStep(nextStepId);
  }

  /**
   * Navega al paso anterior
   */
  goToPreviousStep(): boolean {
    const state = this.onboardingState$.value;
    const currentStep = this.currentStep$.value;
    if (!state || !currentStep) return false;

    const previousStepNumber = currentStep.number - 1;
    if (previousStepNumber < 1) return false;

    const previousStep = Array.from(state.steps.values()).find(
      step => step.number === previousStepNumber
    );

    if (!previousStep) return false;
    return this.goToStep(previousStep.id);
  }

  /**
   * Navega a un paso específico
   */
  goToStep(stepId: OnboardingStepId): boolean {
    const state = this.onboardingState$.value;
    if (!state) return false;

    const step = state.steps.get(stepId);
    if (!step) return false;

    // Verificar si el paso está disponible
    if (!isStepAvailable(state, stepId)) {
      console.warn(`El paso ${stepId} no está disponible aún`);
      return false;
    }

    // Actualizar estado
    state.currentStepId = stepId;
    state.lastUpdated = new Date();

    // Marcar paso como en progreso si estaba pendiente
    if (step.status === OnboardingStepStatus.PENDING) {
      step.status = OnboardingStepStatus.IN_PROGRESS;
    }

    this.onboardingState$.next(state);
    this.currentStep$.next(step);
    this.saveStateToStorage();

    return true;
  }

  // ==================== GUARDADO DE PROGRESO ====================

  /**
   * Guarda el progreso de un paso específico
   */
  async saveStepProgress(stepId: OnboardingStepId, data: any): Promise<boolean> {
    const state = this.onboardingState$.value;
    if (!state) return false;

    const step = state.steps.get(stepId);
    if (!step) return false;

    // Actualizar datos del paso
    step.data = data;
    step.status = OnboardingStepStatus.IN_PROGRESS;
    state.lastUpdated = new Date();

    this.onboardingState$.next(state);
    this.saveStateToStorage();

    // Intentar sincronizar con backend (no bloqueante)
    this.syncWithBackend().catch(err =>
      console.warn('Error sincronizando con backend:', err)
    );

    return true;
  }

  /**
   * Marca un paso como completado
   */
  async markStepComplete(stepId: OnboardingStepId, data?: any): Promise<boolean> {
    const state = this.onboardingState$.value;
    if (!state) return false;

    const step = state.steps.get(stepId);
    if (!step) return false;

    // Guardar datos del paso
    if (data) {
      step.data = data;
    }

    // ==================== LLAMAR ENDPOINTS CENTRALIZADOS ====================
    // Crear los recursos en el backend ANTES de marcar como completado
    try {
      const companyId = state.companyId || state.companyName;

      switch (stepId) {
        case OnboardingStepId.COMPANY_INFO:
          // Crear/actualizar empresa
          console.log('📝 Creando empresa en backend...');
          const companyResponse = await this.createCompanyOnboarding(data);
          if (companyResponse?.data?.id) {
            state.companyId = companyResponse.data.id;
            state.companyName = companyResponse.data.nomComercial || companyResponse.data.nombre;

            // IMPORTANTE: Guardar en localStorage para que se pueda cargar al refrescar
            localStorage.setItem('currentCompany', JSON.stringify(companyResponse.data));
            sessionStorage.setItem('currentCompany', JSON.stringify(companyResponse.data));
            console.log(`✅ Empresa creada y guardada en storage: ${state.companyId}`);
          }
          break;

        case OnboardingStepId.ROLES_SETUP:
          // Crear roles
          console.log('🔐 Creando roles en backend...');
          await this.createRolesOnboarding(data?.roles, companyId);
          console.log('✅ Roles creados');
          break;

        case OnboardingStepId.WAREHOUSES:
          // Crear bodegas
          console.log('📦 Creando bodegas en backend...');
          await this.createWarehousesOnboarding(data?.bodegas, companyId);
          console.log('✅ Bodegas creadas');
          break;

        case OnboardingStepId.PAYMENT_METHODS:
          // Crear formas de pago
          console.log('💳 Creando formas de pago en backend...');
          await this.createPaymentMethodsOnboarding(
            data?.formasPago,
            data?.createPOS !== false, // Por defecto crear POS
            companyId
          );
          console.log('✅ Formas de pago creadas');
          break;

        case OnboardingStepId.DELIVERY_METHODS:
          // Crear formas de entrega
          console.log('🚚 Creando formas de entrega en backend...');
          await this.createDeliveryMethodsOnboarding(data?.formasEntrega, companyId);
          console.log('✅ Formas de entrega creadas');
          break;

        case OnboardingStepId.CATEGORIES:
          // Crear categorías
          console.log('📁 Creando categorías en backend...');
          await this.createCategoriesOnboarding(data?.categorias, data?.sector, companyId);
          console.log('✅ Categorías creadas');
          break;

        case OnboardingStepId.FIRST_PRODUCT:
          // Crear primer producto
          console.log('🛍️ Creando primer producto en backend...');
          await this.createFirstProductOnboarding(data?.producto, companyId);
          console.log('✅ Primer producto creado');
          break;

        case OnboardingStepId.SEQUENCES:
          // Crear consecutivos
          console.log('🔢 Creando consecutivos en backend...');
          await this.createSequencesOnboarding(data?.consecutivos, companyId);
          console.log('✅ Consecutivos creados');
          break;

        // Otros pasos que no tienen endpoint centralizado aún
        case OnboardingStepId.USERS_SETUP:
        case OnboardingStepId.DELIVERY_TYPES:
        case OnboardingStepId.DELIVERY_TIMES:
        case OnboardingStepId.BILLING_ZONES:
        case OnboardingStepId.ADDONS:
          console.log(`ℹ️ Paso ${stepId}: sin endpoint centralizado (usando lógica existente)`);
          break;
      }
    } catch (error) {
      console.error(`❌ Error creando recursos para ${stepId}:`, error);
      // No marcar como completado si hay error
      throw error;
    }

    // ==================== ACTUALIZAR ESTADO LOCAL ====================
    // Marcar paso como completado SOLO si la creación en backend fue exitosa
    step.status = OnboardingStepStatus.COMPLETED;
    step.completedAt = new Date();

    // Actualizar estado general
    state.lastUpdated = new Date();
    state.completedSteps = this.getCompletedStepsCount();
    state.progressPercentage = calculateProgress(state);

    // Verificar si todo el onboarding está completado
    const allCompleted = Array.from(state.steps.values())
      .filter(s => s.isRequired)
      .every(s =>
        s.status === OnboardingStepStatus.COMPLETED ||
        s.status === OnboardingStepStatus.SKIPPED
      );

    if (allCompleted) {
      state.isCompleted = true;
      state.completedAt = new Date();
      await this.markOnboardingComplete();
    }

    this.onboardingState$.next(state);
    this.saveStateToStorage();

    // Sincronizar progreso con backend
    await this.syncWithBackend();

    return true;
  }

  /**
   * Marca un paso como omitido (solo pasos opcionales)
   */
  async skipStep(stepId: OnboardingStepId): Promise<boolean> {
    const state = this.onboardingState$.value;
    if (!state) return false;

    const step = state.steps.get(stepId);
    if (!step || step.isRequired) {
      console.warn('No se puede omitir un paso obligatorio');
      return false;
    }

    step.status = OnboardingStepStatus.SKIPPED;
    step.completedAt = new Date();
    state.lastUpdated = new Date();

    this.onboardingState$.next(state);
    this.saveStateToStorage();

    return true;
  }

  /**
   * Marca todo el onboarding como completado
   */
  async markOnboardingComplete(): Promise<void> {
    const state = this.onboardingState$.value;
    if (!state) return;

    state.isCompleted = true;
    state.completedAt = new Date();

    this.onboardingState$.next(state);
    this.saveStateToStorage();

    // Notificar al backend
    try {
      await this.http.post(
        `${this.urlBase}/v1/users/onboarding/complete`,
        { email: state.userEmail },
        this.httpOptions
      ).toPromise();

      // Limpiar flag de pospuesto
      sessionStorage.removeItem('onboarding_postponed');

      console.log('✅ Onboarding completado exitosamente');
    } catch (error) {
      console.error('Error marcando onboarding como completado:', error);
    }
  }

  /**
   * Completa todo el onboarding (wrapper para compatibilidad)
   */
  async completeOnboarding(): Promise<boolean> {
    try {
      await this.markOnboardingComplete();
      return true;
    } catch (error) {
      console.error('Error al completar onboarding:', error);
      return false;
    }
  }

  // ==================== SISTEMA DE POSPONER ====================

  /**
   * Pospone el onboarding
   */
  postponeOnboarding(): void {
    const state = this.onboardingState$.value;
    if (!state) return;

    state.postponedAt = new Date();
    this.onboardingState$.next(state);
    this.saveStateToStorage();

    // Marcar en sessionStorage para evitar mostrar múltiples veces
    sessionStorage.setItem('onboarding_postponed', new Date().toISOString());

    // Cerrar wizard
    this.closeWizard();
  }

  /**
   * Verifica si debe mostrar el recordatorio de onboarding
   */
  shouldShowReminder(): boolean {
    const state = this.onboardingState$.value;

    // No mostrar si ya está completado
    if (!state || state.isCompleted) return false;

    // No mostrar si ya se mostró en esta sesión
    if (sessionStorage.getItem('onboarding_reminder_shown')) {
      return false;
    }

    // Mostrar si no hay fecha de pospuesto (nunca se ha abierto)
    if (!state.postponedAt) return true;

    // Mostrar si pasaron más de X horas desde que se pospuso
    const hoursSincePostponed = (Date.now() - new Date(state.postponedAt).getTime()) / (1000 * 60 * 60);

    return hoursSincePostponed >= this.POSTPONE_REMINDER_HOURS;
  }

  /**
   * Marca el recordatorio como mostrado en esta sesión
   */
  markReminderShown(): void {
    sessionStorage.setItem('onboarding_reminder_shown', 'true');
  }

  // ==================== GESTIÓN DEL WIZARD ====================

  /**
   * Abre el wizard de onboarding
   */
  openWizard(): void {
    const state = this.onboardingState$.value;

    // Si no hay estado, inicializar
    if (!state) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.email) {
        this.initializeOnboarding(user.email, user._id || user.email);
      }
    }

    this.isWizardOpen$.next(true);
    this.startAutoSave();
  }

  /**
   * Cierra el wizard de onboarding
   */
  closeWizard(): void {
    this.isWizardOpen$.next(false);
    this.stopAutoSave();
    this.saveStateToStorage();
  }

  // ==================== PERSISTENCIA ====================

  /**
   * Guarda el estado en localStorage
   */
  private saveStateToStorage(): void {
    const state = this.onboardingState$.value;
    if (!state) return;

    try {
      // Convertir Map a objeto para serialización
      const stepsObject: any = {};
      state.steps.forEach((step, id) => {
        stepsObject[id] = step;
      });

      const serializable = {
        ...state,
        steps: stepsObject
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Error guardando estado en localStorage:', error);
    }
  }

  /**
   * Carga el estado desde localStorage
   */
  private loadStateFromStorage(): OnboardingState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Reconstruir Map desde objeto
      const stepsMap = new Map<OnboardingStepId, OnboardingStep>();
      Object.keys(parsed.steps).forEach((key) => {
        stepsMap.set(key as OnboardingStepId, parsed.steps[key]);
      });

      const state: OnboardingState = {
        ...parsed,
        steps: stepsMap,
        startedAt: new Date(parsed.startedAt),
        lastUpdated: new Date(parsed.lastUpdated),
        completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
        postponedAt: parsed.postponedAt ? new Date(parsed.postponedAt) : undefined
      };

      this.onboardingState$.next(state);
      const currentStep = state.steps.get(state.currentStepId);
      if (currentStep) {
        this.currentStep$.next(currentStep);
      }

      return state;
    } catch (error) {
      console.error('Error cargando estado desde localStorage:', error);
      return null;
    }
  }

  /**
   * Sincroniza el estado con el backend
   */
  private async syncWithBackend(): Promise<void> {
    const state = this.onboardingState$.value;
    if (!state) return;

    try {
      // Convertir Map a objeto
      const stepsObject: any = {};
      state.steps.forEach((step, id) => {
        stepsObject[id] = {
          status: step.status,
          data: step.data,
          completedAt: step.completedAt
        };
      });

      const progress: OnboardingProgress = {
        email: state.userEmail,
        onboardingCompleted: state.isCompleted,
        currentStepId: state.currentStepId,
        steps: stepsObject,
        postponedAt: state.postponedAt?.toISOString(),
        lastUpdated: state.lastUpdated.toISOString(),
        progressPercentage: state.progressPercentage
      };

      await this.http.post(
        `${this.urlBase}/v1/users/onboarding/save-progress`,
        progress,
        this.httpOptions
      ).toPromise();

    } catch (error) {
      console.warn('Error sincronizando con backend:', error);
      // No lanzar error para no bloquear la UI
    }
  }

  /**
   * Carga el progreso desde el backend
   */
  async loadProgressFromBackend(userEmail: string): Promise<void> {
    try {
      const response: any = await this.http.get(
        `${this.urlBase}/v1/users/onboarding/status?email=${userEmail}`,
        this.httpOptions
      ).toPromise();

      if (response && response.steps) {
        // Reconstruir estado desde el backend
        const state = this.onboardingState$.value || initializeOnboardingState(userEmail, response.userId || userEmail);

        // Actualizar pasos con datos del backend
        Object.keys(response.steps).forEach((stepId) => {
          const step = state.steps.get(stepId as OnboardingStepId);
          if (step && response.steps[stepId]) {
            step.status = response.steps[stepId].status;
            step.data = response.steps[stepId].data;
            step.completedAt = response.steps[stepId].completedAt ?
              new Date(response.steps[stepId].completedAt) : undefined;
          }
        });

        state.isCompleted = response.onboardingCompleted;
        state.currentStepId = response.currentStepId as OnboardingStepId;
        state.progressPercentage = response.progressPercentage;
        state.postponedAt = response.postponedAt ? new Date(response.postponedAt) : undefined;

        this.onboardingState$.next(state);
        this.saveStateToStorage();
      }
    } catch (error) {
      console.warn('Error cargando progreso desde backend:', error);
    }
  }

  // ==================== ENDPOINTS CENTRALIZADOS DE ONBOARDING ====================

  /**
   * Crear o actualizar empresa en onboarding
   */
  async createCompanyOnboarding(companyData: any): Promise<any> {
    try {
      const response: any = await this.http.post(
        `${this.urlBase}/v1/onboarding/company`,
        companyData
      ).toPromise();

      console.log('✅ Empresa creada/actualizada:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando empresa:', error);
      throw error;
    }
  }

  /**
   * Crear roles durante onboarding
   */
  async createRolesOnboarding(roles?: any[], company?: string): Promise<any> {
    try {
      const headers = { company: company || '' };
      const response: any = await this.http.post(
        `${this.urlBase}/v1/onboarding/roles`,
        { roles: roles || [] },
        { headers }
      ).toPromise();

      console.log('✅ Roles creados:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando roles:', error);
      throw error;
    }
  }

  /**
   * Crear bodegas durante onboarding
   */
  async createWarehousesOnboarding(bodegas?: any[], company?: string): Promise<any> {
    try {
      const headers = { company: company || '' };
      const response: any = await this.http.post(
        `${this.urlBase}/v1/onboarding/warehouses`,
        { bodegas: bodegas || [] },
        { headers }
      ).toPromise();

      console.log('✅ Bodegas creadas:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando bodegas:', error);
      throw error;
    }
  }

  /**
   * Crear formas de pago durante onboarding
   */
  async createPaymentMethodsOnboarding(formasPago?: any[], createPOS: boolean = true, company?: string): Promise<any> {
    try {
      const headers = { company: company || '' };
      const response: any = await this.http.post(
        `${this.urlBase}/v1/onboarding/payment-methods`,
        { formasPago: formasPago || [], createPOS },
        { headers }
      ).toPromise();

      console.log('✅ Formas de pago creadas:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando formas de pago:', error);
      throw error;
    }
  }

  /**
   * Crear formas de entrega durante onboarding
   */
  async createDeliveryMethodsOnboarding(formasEntrega?: any[], company?: string): Promise<any> {
    try {
      const headers = { company: company || '' };
      const response: any = await this.http.post(
        `${this.urlBase}/v1/onboarding/delivery-methods`,
        { formasEntrega: formasEntrega || [] },
        { headers }
      ).toPromise();

      console.log('✅ Formas de entrega creadas:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando formas de entrega:', error);
      throw error;
    }
  }

  /**
   * Crear categorías durante onboarding
   */
  async createCategoriesOnboarding(categorias?: any, sector?: string, company?: string): Promise<any> {
    try {
      const headers = { company: company || '' };
      const response: any = await this.http.post(
        `${this.urlBase}/v1/onboarding/categories`,
        { categorias, sector },
        { headers }
      ).toPromise();

      console.log('✅ Categorías creadas:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando categorías:', error);
      throw error;
    }
  }

  /**
   * Crear primer producto durante onboarding
   */
  async createFirstProductOnboarding(producto: any, company?: string): Promise<any> {
    try {
      const headers = { company: company || '' };
      const response: any = await this.http.post(
        `${this.urlBase}/v1/onboarding/products`,
        { producto },
        { headers }
      ).toPromise();

      console.log('✅ Producto creado:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando producto:', error);
      throw error;
    }
  }

  /**
   * Crear secuencias de numeración durante onboarding
   */
  async createSequencesOnboarding(consecutivos?: any[], company?: string): Promise<any> {
    try {
      const headers = { company: company || '' };
      const response: any = await this.http.post(
        `${this.urlBase}/v1/onboarding/sequences`,
        { consecutivos: consecutivos || [] },
        { headers }
      ).toPromise();

      console.log('✅ Consecutivos creados:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando consecutivos:', error);
      throw error;
    }
  }

  // ==================== AUTO-GUARDADO ====================

  /**
   * Inicia el timer de auto-guardado
   */
  private startAutoSave(): void {
    this.stopAutoSave(); // Limpiar timer anterior si existe

    this.autoSaveTimer = setInterval(() => {
      this.saveStateToStorage();
      this.syncWithBackend().catch(err =>
        console.warn('Error en auto-guardado:', err)
      );
    }, this.AUTO_SAVE_INTERVAL);
  }

  /**
   * Detiene el timer de auto-guardado
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Resetea todo el onboarding (útil para testing)
   */
  resetOnboarding(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem('onboarding_postponed');
    sessionStorage.removeItem('onboarding_reminder_shown');
    this.onboardingState$.next(null);
    this.currentStep$.next(null);
    this.isWizardOpen$.next(false);
    this.stopAutoSave();
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  ngOnDestroy(): void {
    this.stopAutoSave();
  }
}
