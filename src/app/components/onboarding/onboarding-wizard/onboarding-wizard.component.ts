import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';

// Services
import { OnboardingService } from '../services/onboarding.service';
import { OnboardingAIService } from '../services/onboarding-ai.service';

// Models
import {
  OnboardingState,
  OnboardingStep,
  OnboardingStepId,
  OnboardingStepStatus,
  AISuggestion,
  isStepAvailable
} from '../models/onboarding-state.model';

@Component({
  selector: 'app-onboarding-wizard',
  templateUrl: './onboarding-wizard.component.html',
  styleUrls: ['./onboarding-wizard.component.scss'],
  providers: [MessageService]
})
export class OnboardingWizardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  onboardingState: OnboardingState | null = null;
  currentStep: OnboardingStep | null = null;
  allSteps: OnboardingStep[] = [];

  // UI State
  sidebarVisible = true;
  isLoading = false;
  isSaving = false;
  showAISuggestions = false;
  currentAISuggestion: AISuggestion | null = null;
  isReviewMode = false;
  showSuccessBanner = false;

  // Mobile State
  isMobileView = false;

  // Progress
  progressPercentage = 0;
  completedStepsCount = 0;
  totalSteps = 13;

  // Step data
  currentStepData: any = null;

  // Enums for template
  StepStatus = OnboardingStepStatus;
  StepId = OnboardingStepId;

  constructor(
    private onboardingService: OnboardingService,
    private aiService: OnboardingAIService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkMobileView();
    this.initializeOnboarding();
    this.subscribeToState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Detecta cambios en el tamaño de la ventana
   */
  @HostListener('window:resize')
  onResize(): void {
    this.checkMobileView();
  }

  /**
   * Verifica si estamos en vista móvil
   */
  private checkMobileView(): void {
    this.isMobileView = window.innerWidth < 768;

    // En desktop, siempre mostrar sidebar
    if (!this.isMobileView) {
      this.sidebarVisible = true;
    } else {
      // En móvil, ocultar sidebar por defecto
      this.sidebarVisible = false;
    }
  }

  /**
   * Toggle sidebar (para móvil)
   */
  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  /**
   * Cierra el sidebar en móvil después de seleccionar un paso
   */
  private closeSidebarOnMobile(): void {
    if (this.isMobileView) {
      this.sidebarVisible = false;
    }
  }

  /**
   * Obtiene el nombre del paso actual
   */
  getCurrentStepName(): string {
    return this.currentStep?.title || '';
  }

  /**
   * Obtiene el porcentaje de progreso
   */
  getProgressPercentage(): number {
    return this.progressPercentage;
  }

  /**
   * Obtiene el índice del paso actual (0-based)
   */
  getCurrentStepIndex(): number {
    return this.currentStep ? this.currentStep.number - 1 : 0;
  }

  /**
   * Inicializa el estado del onboarding
   */
  private async initializeOnboarding(): Promise<void> {
    this.isLoading = true;

    // Obtener usuario del localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se encontró información del usuario'
      });
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(userStr);

    try {
      // Verificar si el usuario ya completó el onboarding
      const isCompleted = false //await this.onboardingService.checkOnboardingStatus(user.email);

      if (isCompleted) {
        // Ya completó el onboarding, redirigir al dashboard
        this.router.navigate(['/welcome']);
        return;
      }

      // Inicializar o cargar el estado del onboarding
      const state = this.onboardingService.getCurrentState();
      if (!state) {
        // Usuario nuevo: inicializar estado y cargar datos existentes
        await this.onboardingService.initializeOnboarding(user.email, user.uid || user.id);
        console.log('✅ Onboarding inicializado y datos cargados');
      } else {
        // Usuario que refrescó: recargar datos desde backend
        console.log('🔄 Recargando datos existentes desde backend...');
        await this.onboardingService.reloadExistingData();
        console.log('✅ Datos recargados desde backend');
      }

      this.isLoading = false;
    } catch (error) {
      console.error('Error al verificar estado de onboarding:', error);
      this.isLoading = false;
    }
  }

  /**
   * Suscribirse a los cambios de estado
   */
  private subscribeToState(): void {
    // Suscribirse al estado completo
    this.onboardingService.onboardingState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (state) {
          this.onboardingState = state;
          this.allSteps = Array.from(state.steps.values()).sort((a, b) => a.number - b.number);
          this.progressPercentage = state.progressPercentage;
          this.completedStepsCount = state.completedSteps;

          // Detectar modo review cuando el estado se actualiza
          this.detectReviewMode();
        }
      });

    // Suscribirse al paso actual
    this.onboardingService.currentStep$
      .pipe(takeUntil(this.destroy$))
      .subscribe(step => {
        this.currentStep = step;
        if (step) {
          this.loadStepData(step.id);
          this.loadAISuggestions(step);
        }
      });
  }

  /**
   * Cargar datos del paso actual
   */
  private loadStepData(stepId: OnboardingStepId): void {
    const step = this.onboardingState?.steps.get(stepId);
    if (step?.data) {
      this.currentStepData = { ...step.data };
    } else {
      this.currentStepData = null;
    }
  }

  /**
   * Cargar sugerencias de IA para el paso actual
   */
  private async loadAISuggestions(step: OnboardingStep): Promise<void> {
    if (!step.hasAISuggestion) {
      this.currentAISuggestion = null;
      return;
    }

    try {
      let suggestion: AISuggestion | null = null;

      switch (step.id) {
        case OnboardingStepId.COMPANY_INFO:
          suggestion = await this.aiService.getCompanyInfoSuggestions(
            this.onboardingState?.companyName || ''
          );
          break;
        case OnboardingStepId.ROLES_SETUP:
          suggestion = await this.aiService.getRolesSuggestions();
          break;
        case OnboardingStepId.DELIVERY_METHODS:
          suggestion = await this.aiService.getDeliveryMethodsSuggestions();
          break;
        case OnboardingStepId.DELIVERY_TYPES:
          suggestion = await this.aiService.getDeliveryTypesSuggestions();
          break;
        case OnboardingStepId.DELIVERY_TIMES:
          suggestion = await this.aiService.getDeliveryTimesSuggestions();
          break;
        case OnboardingStepId.PAYMENT_METHODS:
          suggestion = await this.aiService.getPaymentMethodsSuggestions();
          break;
        case OnboardingStepId.CATEGORIES:
          suggestion = await this.aiService.getCategoriesSuggestions();
          break;
        case OnboardingStepId.ADDONS:
          suggestion = await this.aiService.getAddonsSuggestions();
          break;
        case OnboardingStepId.FIRST_PRODUCT:
          suggestion = await this.aiService.getFirstProductSuggestion();
          break;
      }

      this.currentAISuggestion = suggestion;
    } catch (error) {
      console.error('Error al cargar sugerencias de IA:', error);
      this.currentAISuggestion = null;
    }
  }

  /**
   * Ir al siguiente paso
   */
  async goToNextStep(): Promise<void> {
    if (!this.currentStep) return;

    // Validar que el paso actual esté completado
    if (this.currentStep.status !== OnboardingStepStatus.COMPLETED) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Paso Incompleto',
        detail: 'Por favor completa este paso antes de continuar'
      });
      return;
    }

    const success = this.onboardingService.goToNextStep();
    if (!success) {
      // Ya completó todos los pasos
      this.completeOnboarding();
    }
  }

  /**
   * Ir al paso anterior (o al welcome si está en el primer paso)
   */
  goToPreviousStep(): void {
    const canGoPrevious = this.onboardingService.goToPreviousStep();

    // Si no pudo ir atrás (porque está en el primer paso), ir al welcome
    if (!canGoPrevious && this.currentStep?.number === 1) {
      this.router.navigate(['/welcome']);
    }
  }

  /**
   * Ir a un paso específico
   */
  goToStep(stepId: OnboardingStepId): void {
    const step = this.onboardingState?.steps.get(stepId);
    if (!step || !this.onboardingState) return;

    // Disponible si el paso INMEDIATO anterior está completado u omitido
    // (misma regla que ya define el modelo). Antes esto comparaba contra
    // currentStep.number + 1: como currentStepId se queda fijo en el primer
    // paso aunque el backend detecte varios pasos ya completados (empresa
    // creada por encuesta con bodegas/pagos/categorías por defecto), cualquier
    // clic más allá del segundo paso quedaba bloqueado sin motivo real.
    if (!isStepAvailable(this.onboardingState, stepId)) {
      this.messageService.add({
        severity: 'info',
        summary: 'Paso Bloqueado',
        detail: 'Completa los pasos anteriores primero'
      });
      return;
    }

    this.onboardingService.goToStep(stepId);
    this.closeSidebarOnMobile();
  }

  /**
   * Guardar progreso del paso actual
   */
  async saveStepProgress(data: any): Promise<void> {
    if (!this.currentStep) return;

    this.isSaving = true;
    try {
      const success = await this.onboardingService.saveStepProgress(
        this.currentStep.id,
        data
      );

      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Progreso guardado exitosamente',
          life: 2000
        });
      }
    } catch (error) {
      console.error('Error al guardar progreso:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar el progreso'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Marcar paso como completado
   */
  async markStepComplete(data?: any): Promise<void> {
    if (!this.currentStep) return;

    this.isSaving = true;
    try {
      const success = await this.onboardingService.markStepComplete(
        this.currentStep.id,
        data
      );

      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Completado',
          detail: `${this.currentStep.title} completado`,
          life: 2000
        });

        // Auto-avanzar al siguiente paso después de 500ms
        setTimeout(() => {
          this.goToNextStep();
        }, 500);
      }
    } catch (error) {
      console.error('Error al completar paso:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo completar el paso'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Omitir paso (solo para pasos opcionales)
   */
  async skipStep(): Promise<void> {
    if (!this.currentStep || this.currentStep.isRequired) return;

    this.isSaving = true;
    try {
      const success = await this.onboardingService.skipStep(this.currentStep.id);

      if (success) {
        this.messageService.add({
          severity: 'info',
          summary: 'Paso Omitido',
          detail: `${this.currentStep.title} ha sido omitido`,
          life: 2000
        });

        // Auto-avanzar al siguiente paso
        setTimeout(() => {
          this.goToNextStep();
        }, 500);
      }
    } catch (error) {
      console.error('Error al omitir paso:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo omitir el paso'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Aplicar sugerencia de IA
   */
  applyAISuggestion(): void {
    if (!this.currentAISuggestion) return;

    this.currentStepData = {
      ...this.currentStepData,
      ...this.currentAISuggestion.suggestedData
    };

    this.messageService.add({
      severity: 'success',
      summary: 'Sugerencia Aplicada',
      detail: 'Los datos sugeridos han sido cargados. Puedes editarlos antes de continuar.',
      life: 3000
    });

    this.showAISuggestions = false;
  }

  /**
   * Posponer el onboarding
   */
  postponeOnboarding(): void {
    this.onboardingService.postponeOnboarding();

    this.messageService.add({
      severity: 'info',
      summary: 'Onboarding Pospuesto',
      detail: 'Puedes continuar la configuración más tarde desde el menú',
      life: 4000
    });

    // Redirigir al welcome después de 2 segundos
    setTimeout(() => {
      this.router.navigate(['/welcome']);
    }, 2000);
  }

  /**
   * Completar el onboarding
   */
  private async completeOnboarding(): Promise<void> {
    this.isLoading = true;

    try {
      const success = await this.onboardingService.completeOnboarding();

      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: '¡Felicitaciones!',
          detail: 'Has completado la configuración de tu comercio',
          life: 5000
        });

        // Redirigir al welcome después de 3 segundos
        setTimeout(() => {
          this.router.navigate(['/welcome']);
        }, 3000);
      }
    } catch (error) {
      console.error('Error al completar onboarding:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo completar el onboarding'
      });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Obtener clase CSS para el estado del paso
   */
  getStepClass(step: OnboardingStep): string {
    if (step.id === this.currentStep?.id) {
      return 'step-current';
    }

    switch (step.status) {
      case OnboardingStepStatus.COMPLETED:
        return 'step-completed';
      case OnboardingStepStatus.IN_PROGRESS:
        return 'step-in-progress';
      case OnboardingStepStatus.SKIPPED:
        return 'step-skipped';
      default:
        return 'step-pending';
    }
  }

  /**
   * Obtener icono para el estado del paso
   */
  getStepIcon(step: OnboardingStep): string {
    if (step.status === OnboardingStepStatus.COMPLETED) {
      return 'pi-check-circle';
    }
    if (step.status === OnboardingStepStatus.IN_PROGRESS) {
      return 'pi-spin pi-spinner';
    }
    if (step.status === OnboardingStepStatus.SKIPPED) {
      return 'pi-forward';
    }
    return step.icon;
  }

  /**
   * Verificar si se puede ir al siguiente paso
   */
  canGoNext(): boolean {
    return this.currentStep?.status === OnboardingStepStatus.COMPLETED;
  }

  /**
   * Verificar si se puede ir al paso anterior
   */
  canGoPrevious(): boolean {
    return (this.currentStep?.number || 1) > 1;
  }

  /**
   * Verificar si un paso está disponible
   */
  isStepAvailable(step: OnboardingStep): boolean {
    if (step.number === 1) return true;

    const previousStep = this.allSteps.find(s => s.number === step.number - 1);
    return previousStep?.status === OnboardingStepStatus.COMPLETED ||
           previousStep?.status === OnboardingStepStatus.SKIPPED;
  }

  /**
   * Detecta si el usuario llegó con configuración completa (100%)
   * Típicamente desde el diagnóstico que creó todo automáticamente
   */
  private detectReviewMode(): void {
    if (!this.onboardingState) return;

    const is100Percent = this.progressPercentage === 100;
    const isNotCompleted = !this.onboardingState.isCompleted;

    if (is100Percent && isNotCompleted && !this.isReviewMode) {
      this.isReviewMode = true;
      this.showSuccessBanner = true;

      console.log('✅ Modo Review activado - Configuración completa detectada');

      // Mostrar toast de bienvenida
      this.messageService.add({
        severity: 'success',
        summary: '¡Configuración Lista!',
        detail: 'Tu empresa ya está configurada. Revisa los detalles y finaliza cuando estés listo.',
        life: 6000
      });
    }
  }

  /**
   * Permite finalizar directamente sin revisar paso a paso
   */
  async finishDirectly(): Promise<void> {
    if (!this.canFinishDirectly()) return;

    try {
      this.isSaving = true;
      await this.onboardingService.completeOnboarding();

      this.messageService.add({
        severity: 'success',
        summary: '¡Listo para Vender!',
        detail: 'Tu tienda está configurada y lista para empezar.',
        life: 3000
      });

      // Redirigir al dashboard
      setTimeout(() => {
        this.router.navigate(['/welcome']);
      }, 1500);

    } catch (error) {
      console.error('Error finalizando onboarding:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Hubo un problema al finalizar. Intenta de nuevo.'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Verifica si se puede finalizar directamente
   */
  canFinishDirectly(): boolean {
    return this.progressPercentage === 100 && !this.isSaving;
  }

  /**
   * Obtiene el tooltip apropiado para cada paso
   */
  getStepTooltip(step: OnboardingStep): string {
    if (!this.isStepAvailable(step)) {
      return 'Completa los pasos anteriores primero';
    }

    if (this.isReviewMode && step.status === OnboardingStepStatus.COMPLETED) {
      return '✓ Configurado automáticamente - Haz clic para revisar';
    }

    if (step.status === OnboardingStepStatus.COMPLETED) {
      return '✓ Completado';
    }

    return step.description;
  }
}
