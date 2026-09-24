import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { KatuqQuickStartService, DiagnosticResponse, PromocionRegistro } from '../../shared/services/quickstart/katuq-quickstart.service';
import { ContextualQuestionsService, ContextualQuestion } from '../../shared/services/quickstart/contextual-questions.service';
import { PromocionesService, PromocionPublica } from '../../shared/services/promociones.service';
import { PixelesPautaService } from '../../shared/services/pixeles-pauta.service';
import { Subscription } from 'rxjs';
import { clearOnboardingStorage } from '../onboarding/utils/onboarding-v2.utils';
import { AuthService } from '../../shared/services/firebase/auth.service';
import { UtilsService } from '../../shared/services/utils.service';

/** Contraseñas por defecto del sistema: el backend las rechaza (D-319). */
const CONTRASENAS_POR_DEFECTO = ['Katuq2025!', 'Default@123'];

/**
 * Reglas mínimas de la contraseña del registro (D-319, decisión de Daniel):
 * 8 caracteres, al menos una letra y un número. Nada más, para no frenar el
 * registro en el último paso.
 */
export function reglasContrasena(valor: string): { largo: boolean; letra: boolean; numero: boolean } {
    const texto = valor || '';
    return {
        largo: texto.length >= 8,
        letra: /[A-Za-zÀ-ÿ]/.test(texto),
        numero: /\d/.test(texto),
    };
}

function validarContrasenaRegistro(control: AbstractControl): ValidationErrors | null {
    const valor: string = control.value || '';
    if (!valor) return null; // de eso se encarga `required`
    const reglas = reglasContrasena(valor);
    if (!reglas.largo || !reglas.letra || !reglas.numero) return { reglas: true };
    if (CONTRASENAS_POR_DEFECTO.includes(valor)) return { porDefecto: true };
    return null;
}

@Component({
    selector: 'app-diagnostic-survey',
    templateUrl: './diagnostic-survey.component.html',
    styleUrls: ['./diagnostic-survey.component.scss']
})
export class DiagnosticSurveyComponent implements OnInit, OnDestroy {
    private subscriptions: Subscription[] = [];
    private readonly STORAGE_KEY = 'katuq_diagnostic_progress';
    private autoSaveTimeout: any;

    surveyData = {
        "formTitle": "Diagnóstico Rápido para tu Negocio Digital",
        "formDescription": "Descubre cómo optimizar tu negocio con respuestas personalizadas basadas en tu sector y necesidades.",
        "sections": [
            {
                "sectionTitle": "Diagnóstico Esencial",
                "questions": [
                    {
                        "id": "q1",
                        "question": "¿En qué sector opera tu negocio?",
                        "type": "single_choice",
                        "options": [
                            "Retail - Comercial",
                            "Manufactura",
                            "Restaurante",
                            "Servicios",
                            "Otros"
                        ],
                        "allowOther": true
                    },
                    {
                        "id": "q3",
                        "question": "¿En qué etapa de digitalización está tu empresa?",
                        "type": "single_choice",
                        "options": [
                            "Opero 100% offline (papel, Excel)",
                            "Uso algunas herramientas digitales básicas",
                            "Tengo un software, pero quiero mejorar",
                            "Ya opero digitalmente, busco alternativas"
                        ]
                    },
                    {
                        "id": "q6",
                        "question": "¿Cuántos productos tienes en tu catálogo?",
                        "type": "single_choice",
                        "options": [
                            "Menos de 50",
                            "Entre 50 y 200",
                            "Entre 200 y 500",
                            "Más de 500"
                        ]
                    },
                    {
                        "id": "q7",
                        "question": "¿Qué tipo de clientes tienes?",
                        "type": "single_choice",
                        "options": [
                            "Solo clientes finales (B2C)",
                            "Solo empresas (B2B)",
                            "Ambos: clientes finales y empresas"
                        ]
                    },
                    {
                        "id": "q8",
                        "question": "¿Dónde vendes más actualmente?",
                        "type": "single_choice",
                        "options": [
                            "Punto de venta físico",
                            "Tienda online propia",
                            "Marketplaces (Amazon, MercadoLibre)",
                            "Redes sociales",
                            "Venta directa/domicilio",
                            "Otro"
                        ],
                        "allowOther": true
                    },
                    {
                        "id": "q12",
                        "question": "¿Cómo manejas tu inventario?",
                        "type": "single_choice",
                        "options": [
                            "Vendo sobre pedido (no mantengo stock)",
                            "Mantengo inventario disponible",
                            "Combinación de ambos"
                        ]
                    },
                    {
                        "id": "q26",
                        "question": "¿Cuál es tu principal objetivo para los próximos 12 meses?",
                        "type": "single_choice",
                        "options": [
                            "Aumentar ventas en mi mercado actual",
                            "Mejorar eficiencia y reducir costos",
                            "Expandirme a nuevos mercados",
                            "Mantener operación estable",
                            "No tengo un plan definido"
                        ]
                    },
                    {
                        "id": "q27",
                        "question": "¿Cuál es tu mayor obstáculo para crecer?",
                        "type": "single_choice",
                        "options": [
                            "Falta de automatización",
                            "Falta de herramientas tecnológicas",
                            "Problemas de logística",
                            "Dificultad para conseguir clientes",
                            "Resistencia al cambio",
                            "Otro"
                        ],
                        "allowOther": true
                    }
                ]
            }
        ]
    }

    currentSectionIndex = 0;
    currentQuestionIndex = 0;
    responses: { [id: string]: string } = {};
    showSummary: boolean = false;
    summaryHTML: string = "";
    submissionSuccess: boolean = false;
    welcomeMessage: string = "";
    currentStep: 'welcome' | 'video' | 'questionnaire' | 'contextual' | 'introduction' | 'registration' | 'summary' | 'quickstart-success' = 'welcome';
    registrationOnly: boolean = false;
    
    // Variables para Quick Start
    quickStartInProgress: boolean = false;
    quickStartCompleted: boolean = false;
    quickStartError: string = "";
    registrationAlreadyExists: boolean = false; // 409: comercio/usuario ya registrado
    registrationPendingReview: boolean = false; // 202: registro en cuarentena anti-abuso
    registrationBlocked: boolean = false; // 403/422: bloqueado o datos inválidos
    credentialsEmailSent: boolean = true;
    quickStartMessage: string = "";
    nextSteps: string[] = [];

    // Campaña de pauta: si llegó por /promo/:codigo, el código viaja con el
    // registro y la empresa nace en premium por el tiempo de la campaña.
    codigoPromocional: string | null = null;
    promocionCampana: PromocionPublica | null = null;
    promocionAplicada: PromocionRegistro | null = null;
    promocionNoAplicada: boolean = false; // el código se cayó entre la landing y el registro

    // Variables para preguntas contextuales
    contextualQuestions: ContextualQuestion[] = [];
    currentContextualIndex: number = 0;
    contextualResponses: { [id: string]: string } = {};

    mainForm: FormGroup; // Formulario principal
    isProcessing: boolean = false; // nueva bandera para animación de procesamiento
    showAutoSaveIndicator: boolean = false; // Indicador de guardado automático

    // Variables para página de bienvenida y marketing
    totalCompaniesConfigured: number = 15247; // Puede venir de API
    estimatedTimeMinutes: number = 5;
    showCelebration: boolean = false;
    milestonesReached: number[] = [];

    // Variables para video explicativo
    videoPlaying: boolean = true; // Empieza reproduciendo
    videoEnded: boolean = false; // Controla si el video terminó

    // Registro simplificado: 4 datos esenciales + la contraseña con la que entra
    // de una vez al terminar (D-319).
    registrationQuestions = [
        { formControl: 'nombre', question: '¿Cuál es el nombre de tu empresa?', placeholder: 'Nombre de la empresa' },
        { formControl: 'nit', question: '¿Cuál es tu NIT o documento de identidad?', placeholder: 'NIT o cédula' },
        { formControl: 'correo', question: '¿Cuál es tu correo electrónico?', placeholder: 'correo@ejemplo.com' },
        { formControl: 'celular', question: '¿Cuál es tu número de celular?', placeholder: 'Número de celular' },
        { formControl: 'password', question: 'Crea tu contraseña', placeholder: 'Mínimo 8 caracteres' }
    ];
    registrationIndex = 0;
    private readonly PASO_CONTRASENA = 4;

    mostrarContrasena = false;
    /** Tras un registro aprobado, mientras abre la sesión (D-319). */
    entrandoACuenta = false;
    /** La persona eligió su contraseña: no hay credenciales por correo. */
    eligioContrasena = false;
    /**
     * Hash de la contraseña (nunca el texto plano) entre el registro y el login.
     * Solo en memoria: no entra al borrador ni a ningún storage, y se borra
     * apenas se intenta entrar.
     */
    private contrasenaHash: string | null = null;

    constructor(
        private fb: FormBuilder, 
        private router: Router,
        private quickStartService: KatuqQuickStartService,
        private contextualQuestionsService: ContextualQuestionsService,
        private promocionesService: PromocionesService,
        private pixeles: PixelesPautaService,
        private authService: AuthService,
        private utils: UtilsService
    ) {
        // No se vuelve a asignar registrationQuestions aquí
        this.mainForm = this.fb.group({
            registration: this.fb.group({
                nombre: ['', [Validators.required, Validators.minLength(2), Validators.pattern('^[a-zA-ZÀ-ÿ\\s]+$')]],
                nit: ['', [Validators.required, Validators.pattern('^[0-9]{8,11}$')]],
                correo: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
                celular: ['', [Validators.required, Validators.pattern('^3[0-9]{9}$')]],
                // Nunca se guarda en el borrador (saveProgress la excluye).
                password: ['', [Validators.required, validarContrasenaRegistro]],
                // 🍯 Honeypot anti-bot: invisible para humanos. Si llega con valor, el
                // backend descarta el registro en silencio. Sin validadores (no debe
                // afectar la validez del formulario para usuarios reales).
                website: ['']
            })
        });
    }

    ngOnInit() {
        // Medición de la pauta: de qué anuncio llegó y la visita al registro.
        this.pixeles.capturarOrigen();
        this.pixeles.iniciar();
        this.cargarPromocionPendiente();
        this.loadProgress();
        this.abrirRegistroRapidoSiLoPide();
        this.setupAutoSave();
        
        // Escuchar cambios en el formulario para autoguardado
        const registrationForm = this.mainForm.get('registration');
        if (registrationForm) {
            const formSubscription = registrationForm.valueChanges.subscribe(() => {
                this.debouncedSave();
            });
            this.subscriptions.push(formSubscription);
        }
    }

    ngOnDestroy() {
        // Limpiar todas las suscripciones
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions = [];

        // Un registro ya enviado no debe reaparecer como una pantalla de éxito
        // vacía cuando otra persona use este navegador.
        if (this.currentStep !== 'quickstart-success' && !this.submissionSuccess) {
            this.saveProgress();
        }

        // Limpiar timeout de autoguardado
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
    }

    /**
     * Guarda el progreso del usuario en localStorage
     */
    private saveProgress(): void {
        try {
            // La contraseña NUNCA va al borrador de localStorage (D-319).
            const { password, ...registrationData } = this.mainForm.get('registration')?.value || {};
            const progress = {
                responses: this.responses,
                contextualResponses: this.contextualResponses,
                registrationData,
                currentStep: this.currentStep,
                currentSectionIndex: this.currentSectionIndex,
                currentQuestionIndex: this.currentQuestionIndex,
                currentContextualIndex: this.currentContextualIndex,
                registrationIndex: this.registrationIndex,
                registrationOnly: this.registrationOnly,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
        } catch (error) {
            console.warn('No se pudo guardar el progreso:', error);
        }
    }

    /**
     * Carga el progreso guardado del localStorage
     */
    private loadProgress(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            // El registro Gratis es la entrada principal. El video y el
            // diagnóstico quedan disponibles como ayuda opcional.
            if (!saved) {
                this.currentStep = 'welcome';
                return;
            }

            if (saved) {
                const progress = JSON.parse(saved);

                // Restaurar respuestas
                if (progress.responses) {
                    this.responses = progress.responses;
                }

                // Restaurar respuestas contextuales
                if (progress.contextualResponses) {
                    this.contextualResponses = progress.contextualResponses;
                }

                // Restaurar datos de registro
                if (progress.registrationData) {
                    const { password, ...datos } = progress.registrationData;
                    this.mainForm.get('registration')?.patchValue(datos);
                }

                // Restaurar índices de navegación
                if (progress.currentSectionIndex !== undefined) {
                    this.currentSectionIndex = progress.currentSectionIndex;
                }
                if (progress.currentQuestionIndex !== undefined) {
                    this.currentQuestionIndex = progress.currentQuestionIndex;
                }
                if (progress.currentContextualIndex !== undefined) {
                    this.currentContextualIndex = progress.currentContextualIndex;
                }
                if (progress.registrationIndex !== undefined) {
                    this.registrationIndex = progress.registrationIndex;
                }
                this.registrationOnly = progress.registrationOnly === true;

                // Restaurar paso actual (con validación)
                if (progress.currentStep && this.isValidStep(progress.currentStep)) {
                    this.currentStep = ['video', 'welcome', 'quickstart-success'].includes(progress.currentStep)
                        ? 'welcome'
                        : progress.currentStep;
                }

                // La contraseña no se guarda: si iba en el resumen, vuelve a pedirla.
                if (this.currentStep === 'summary') {
                    this.currentStep = 'registration';
                    this.registrationIndex = this.PASO_CONTRASENA;
                }

                // Si había preguntas contextuales, cargarlas
                if (this.currentStep === 'contextual' && this.contextualQuestions.length === 0) {
                    this.contextualQuestions = this.contextualQuestionsService.getContextualQuestions(this.responses, 2);
                }
            }
        } catch (error) {
            console.warn('No se pudo cargar el progreso guardado:', error);
            // Si hay error al cargar, limpiar el localStorage corrupto
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }

    /**
     * Valida que el paso sea válido
     */
    private isValidStep(step: string): boolean {
        const validSteps: string[] = ['welcome', 'video', 'questionnaire', 'contextual', 'introduction', 'registration', 'summary', 'quickstart-success'];
        return validSteps.includes(step);
    }

    /**
     * Configura el autoguardado con debounce
     */
    private setupAutoSave(): void {
        // Se guarda automáticamente en selectOption, selectContextualOption, y cambios en formulario
    }

    /**
     * Guarda progreso con debounce para evitar escrituras excesivas
     */
    private debouncedSave(): void {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        this.autoSaveTimeout = setTimeout(() => {
            this.saveProgress();
            // Mostrar indicador de guardado
            this.showAutoSaveIndicator = true;
            setTimeout(() => {
                this.showAutoSaveIndicator = false;
            }, 2000); // Ocultar después de 2 segundos
        }, 1000); // Guardar después de 1 segundo de inactividad
    }

    /**
     * Limpia el progreso guardado (usar después de envío exitoso)
     */
    private clearProgress(): void {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Listener para prevenir salida accidental
     */
    @HostListener('window:beforeunload', ['$event'])
    beforeUnloadHandler(event: any): void {
        // Guardar progreso antes de salir
        this.saveProgress();
    }

    // Métodos helper para validación de campos
    getFieldError(fieldName: string): string | null {
        const field = this.mainForm.get(`registration.${fieldName}`);
        if (field && field.invalid && (field.dirty || field.touched)) {
            if (field.errors?.['required']) {
                return this.getRequiredMessage(fieldName);
            }
            if (field.errors?.['email'] || field.errors?.['pattern']) {
                return this.getPatternMessage(fieldName);
            }
            if (field.errors?.['minlength']) {
                return this.getMinLengthMessage(fieldName);
            }
            if (field.errors?.['reglas']) {
                return 'Te falta cumplir las reglas de abajo';
            }
            if (field.errors?.['porDefecto']) {
                return 'Esa contraseña no se puede usar. Elige otra.';
            }
            if (field.errors?.['servidor']) {
                return field.errors['servidor'];
            }
        }
        return null;
    }

    private getRequiredMessage(fieldName: string): string {
        const messages: { [key: string]: string } = {
            'nombre': 'El nombre de la empresa es requerido',
            'nit': 'El NIT o documento de identidad es requerido',
            'correo': 'El correo electrónico es requerido',
            'celular': 'El número de celular es requerido',
            'password': 'Crea una contraseña para entrar'
        };
        return messages[fieldName] || 'Este campo es requerido';
    }

    private getPatternMessage(fieldName: string): string {
        const messages: { [key: string]: string } = {
            'nombre': 'Solo se permiten letras y espacios',
            'nit': 'Debe contener entre 8 y 11 dígitos',
            'correo': 'Ingresa un correo válido (ejemplo@dominio.com)',
            'celular': 'Debe ser un celular colombiano válido (3XXXXXXXXX)'
        };
        return messages[fieldName] || 'Formato inválido';
    }

    private getMinLengthMessage(fieldName: string): string {
        const messages: { [key: string]: string } = {
            'nombre': 'Mínimo 2 caracteres'
        };
        return messages[fieldName] || 'Muy corto';
    }

    isFieldValid(fieldName: string): boolean {
        const field = this.mainForm.get(`registration.${fieldName}`);
        return field ? field.valid && (field.dirty || field.touched) : false;
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.mainForm.get(`registration.${fieldName}`);
        return field ? field.invalid && (field.dirty || field.touched) : false;
    }

    isCurrentRegistrationFieldValid(): boolean {
        const currentField = this.registrationQuestions[this.registrationIndex].formControl;
        const field = this.mainForm.get(`registration.${currentField}`);
        return field ? field.valid : false;
    }

    get reglasDeContrasena() {
        return reglasContrasena(this.mainForm.get('registration.password')?.value);
    }

    get currentSection() {
        return this.surveyData.sections[this.currentSectionIndex];
    }
    get currentQuestion() {
        return this.currentSection.questions[this.currentQuestionIndex];
    }

    /**
     * `?registro=rapido` (enlaces de pauta): entra directo a los cuatro datos del
     * registro Gratis, sin la pantalla de bienvenida. Cada paso de más antes de
     * escribir el primer dato es gente que se va. Si ya venía a mitad de un
     * registro guardado, se respeta dónde iba.
     */
    private abrirRegistroRapidoSiLoPide(): void {
        try {
            const pideRapido = new URLSearchParams(window.location.search).get('registro') === 'rapido';
            if (pideRapido && this.currentStep === 'welcome') {
                this.startFreeRegistration();
            }
        } catch {
            // Sin parámetros legibles se muestra la bienvenida de siempre.
        }
    }

    /**
     * Recupera el código de campaña que dejó la landing `/promo/:codigo`.
     *
     * Se relee el beneficio contra el backend en vez de confiar en lo que quedó
     * guardado: entre que la persona abrió el enlace y termina el registro, la
     * campaña pudo apagarse o agotarse, y no se le va a prometer algo que el
     * registro no vaya a cumplir.
     */
    private cargarPromocionPendiente() {
        const codigo = this.promocionesService.obtenerCodigoPendiente();
        if (!codigo) return;

        this.codigoPromocional = codigo;
        this.promocionesService.validarCodigo(codigo).subscribe({
            next: (respuesta) => {
                if (respuesta.disponible && respuesta.promocion) {
                    this.promocionCampana = respuesta.promocion;
                } else {
                    // Ya no sirve: se olvida y el registro sigue como uno normal.
                    this.promocionCampana = null;
                    this.codigoPromocional = null;
                    this.promocionesService.limpiarCodigoPendiente();
                }
            },
            error: () => {
                this.promocionCampana = null;
            }
        });
    }

    selectOption(option: string) {
        this.responses[this.currentQuestion.id] = option;
        this.debouncedSave(); // Guardar progreso
        
        // Si no es la última pregunta, se avanza automáticamente;
        // en caso contrario, se detiene y se deja que el usuario haga clic en "Siguiente paso".
        if (!(this.currentSectionIndex === this.surveyData.sections.length - 1 &&
            this.currentQuestionIndex === this.currentSection.questions.length - 1)) {
            setTimeout(() => {
                this.nextQuestion();
            }, 300);
        }
    }

    backQuestion() {
        if (this.currentStep === 'questionnaire') {
            if (this.currentQuestionIndex > 0) {
                this.currentQuestionIndex--;
            } else if (this.currentSectionIndex > 0) {
                this.currentSectionIndex--;
                this.currentQuestionIndex = this.currentSection.questions.length - 1;
            }
        } else if (this.currentStep === 'registration') {
            this.backRegistration();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentSection.questions.length - 1) {
            this.currentQuestionIndex++;
        } else if (this.currentSectionIndex < this.surveyData.sections.length - 1) {
            this.currentSectionIndex++;
            this.currentQuestionIndex = 0;
        } else {
            // Terminó el cuestionario principal, evaluar preguntas contextuales
            this.evaluateContextualQuestions();
        }
        this.debouncedSave(); // Guardar progreso después de cambiar de pregunta
    }

    evaluateContextualQuestions() {
        // Obtener preguntas contextuales basadas en respuestas
        this.contextualQuestions = this.contextualQuestionsService.getContextualQuestions(this.responses, 2);
        
        if (this.contextualQuestions.length > 0) {
            // Mostrar preguntas contextuales
            this.currentStep = 'contextual';
            this.currentContextualIndex = 0;
        } else {
            // No hay preguntas contextuales, ir directo al registro
            this.currentStep = 'introduction';
        }
    }

    confirmFinish() {
        let summary = '<div style="text-align: left;" class="survey-summary">';
        if (this.registrationOnly) {
            summary += '<p><strong>Empezarás en el plan Gratis:</strong> sin tarjeta y con hasta 15 pedidos. Podrás activar Premium cuando realmente lo necesites.</p>';
        } else {
            summary += `<p>${this.surveyData.formDescription}</p>`;
            summary += '<p>A continuación, se muestra el resumen de tus respuestas:</p>';
            this.surveyData.sections.forEach(section => {
                summary += `<h3 style="margin: 10px 0 5px; color: #00FFCC ; font-size: 1.5em;">${section.sectionTitle}</h3>`;
                section.questions.forEach(q => {
                    summary += `<p style="margin: 0 0 10px;"><strong>${q.question}</strong><br><em>${this.escapeHtml(this.responses[q.id] || 'Sin respuesta')}</em></p>`;
                });
            });
        }
        summary += `<h3 style="margin: 20px 0 10px; color: #9020FF; font-size: 1.5em;">Información de Empresa</h3>`;
        this.registrationQuestions.forEach(item => {
            if (item.formControl === 'password') {
                summary += `<p style="margin: 0 0 10px;"><strong>Contraseña</strong><br><em>La que acabas de crear</em></p>`;
                return;
            }
            const value = this.mainForm.get('registration.' + item.formControl)?.value;
            summary += `<p style="margin: 0 0 10px;"><strong>${item.question}</strong><br><em>${this.escapeHtml(value || 'Sin respuesta')}</em></p>`;
        });
        summary += '</div>';
        this.summaryHTML = summary;
        this.currentStep = 'summary';
    }

    editResponses() {
        this.currentStep = this.registrationOnly ? 'registration' : 'questionnaire';
        if (this.registrationOnly) {
            this.registrationIndex = 0;
        }
    }

    private escapeHtml(value: string): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Agrega este método en la clase para hacer trim a los valores del grupo "registration"
    private trimRegistrationValues(): void {
        const regGroup = this.mainForm.get('registration');
        if (regGroup) {
            const keys = Object.keys(regGroup.value);
            const trimmedValues: { [key: string]: string } = {};
            keys.filter(key => key !== 'password').forEach(key => {
                const value = regGroup.get(key)?.value;
                trimmedValues[key] = value ? value.trim() : '';
            });
            regGroup.patchValue(trimmedValues);
        }
    }

    async submitResponses() {
        // Validar que todas las preguntas estén respondidas
        const unansweredQuestions = this.surveyData.sections.flatMap(section => 
            section.questions.filter(q => !this.responses[q.id])
        );
        
        if (!this.registrationOnly && unansweredQuestions.length > 0) {
            alert(`Por favor, responde todas las preguntas antes de continuar. Faltan ${unansweredQuestions.length} pregunta(s).`);
            this.currentStep = 'questionnaire';
            // Ir a la primera pregunta sin respuesta
            const firstUnanswered = unansweredQuestions[0];
            const sectionIndex = this.surveyData.sections.findIndex(s => 
                s.questions.some(q => q.id === firstUnanswered.id)
            );
            if (sectionIndex !== -1) {
                this.currentSectionIndex = sectionIndex;
                this.currentQuestionIndex = this.surveyData.sections[sectionIndex].questions.findIndex(q => q.id === firstUnanswered.id);
            }
            return;
        }

        // Realiza trim de los inputs antes de enviarlos
        this.trimRegistrationValues();
        
        // Validar datos de registro
        if (!this.mainForm.get('registration')?.valid) {
            alert('Por favor, completa todos los campos del registro correctamente.');
            this.currentStep = 'registration';
            this.registrationIndex = 0;
            return;
        }
        
        const responsesArray: { questionId: string; question: string; answer: string }[] = [];
        this.surveyData.sections.forEach(section => {
            section.questions.forEach(q => responsesArray.push({
                questionId: q.id,
                question: q.question,
                answer: this.responses[q.id] || ''
            }));
        });
        // La contraseña no viaja en `registration`: va aparte y ya con hash.
        const { password, ...registrationData } = this.mainForm.get('registration')?.value || {};
        this.contrasenaHash = password ? this.utils.hash(password) : null;
        this.eligioContrasena = !!this.contrasenaHash;
        
        try {
            // Iniciar Quick Start directamente (el service se encarga de guardar el diagnóstico)
            await this.startQuickStart(null, registrationData, responsesArray);
            
        } catch (error: any) {
            console.error("Error en el proceso de configuración automática", error);
            // En caso de error, mostrar proceso tradicional con mejor mensaje
            this.submissionSuccess = true;
            const empresa = this.mainForm.get('registration.nombre')?.value || 'tu empresa';
            this.welcomeMessage = `${empresa}`;
            this.processAndRedirect();
        }
    }

    async startQuickStart(apiResponse: any, registrationData: any, responsesArray: any[]) {
        this.quickStartInProgress = true;
        this.currentStep = 'quickstart-success';
        
        // Suscribirse al status del Quick Start
        const statusSubscription = this.quickStartService.quickStartStatus$.subscribe(status => {
            this.quickStartMessage = status.message;
        });
        this.subscriptions.push(statusSubscription);

        // Preparar datos para Quick Start (incluir respuestas contextuales)
        const capturedResponses = { ...this.responses, ...this.contextualResponses };
        const allResponses = Object.keys(capturedResponses).length > 0
            ? capturedResponses
            : { q1: 'No especificado' };
        const diagnosticData: DiagnosticResponse = {
            responses: allResponses,
            registration: registrationData,
            aiRecommendation: {
                modulosRecomendados: ['POS', 'Inventarios'],
                permisos: [
                    'ver_dashboard',
                    'gestionar_productos',
                    'gestionar_inventario', 
                    'gestionar_pedidos',
                    'usar_pos'
                ],
                sector: allResponses.q1 || 'No especificado',
                complejidad: 'basica',
                canales: ['POS']
            },
            codigoPromocional: this.codigoPromocional,
            origenCampana: this.pixeles.obtenerOrigen(),
            contrasenaHash: this.contrasenaHash
        };

        try {
            // Ejecutar Quick Start
            const quickStartResult = await this.quickStartService.setupQuickStart(diagnosticData);
            
            if (quickStartResult.success) {
                this.quickStartInProgress = false;
                this.welcomeMessage = registrationData.nombre;
                this.quickStartMessage = quickStartResult.message || "¡Tu comercio está configurado y listo!";
                this.credentialsEmailSent = quickStartResult.credentialsEmailSent !== false;
                this.clearProgress();
                clearOnboardingStorage(localStorage);
                localStorage.removeItem('katuq_onboarding_state');
                localStorage.removeItem('showOnboardingBanner');
                sessionStorage.removeItem('onboarding_banner_dismissed');
                sessionStorage.removeItem('onboarding_postponed');
                sessionStorage.removeItem('onboarding_reminder_shown');

                // Resultado del código de campaña. Si el cupo se agotó entre la
                // landing y este momento, se dice claro — pero el registro ya
                // quedó hecho, no se pierde nada.
                if (quickStartResult.promocion?.aplicada) {
                    this.promocionAplicada = quickStartResult.promocion;
                } else if (this.codigoPromocional) {
                    this.promocionNoAplicada = true;
                }
                this.promocionesService.limpiarCodigoPendiente();

                if (quickStartResult.pendingReview) {
                    // Cuarentena anti-abuso: la cuenta queda inactiva, no se intenta entrar.
                    // Tampoco se le cuenta a las plataformas de pauta (ver PixelesPautaService).
                    this.olvidarContrasena();
                    this.registrationPendingReview = true;
                    this.pixeles.limpiarOrigen();
                    return;
                }

                this.pixeles.registroCompleto();
                this.pixeles.limpiarOrigen();

                this.quickStartCompleted = true;
                this.nextSteps = quickStartResult.nextSteps || [];

                if (this.contrasenaHash) {
                    // D-319: entra de una vez con la contraseña que acaba de crear.
                    await this.entrarConLaCuentaNueva(registrationData.correo);
                } else {
                    // Sin contraseña elegida (no debería pasar): el flujo anterior.
                    setTimeout(() => {
                        this.redirectToMainSystem();
                    }, 8000);
                }

            } else {
                const err: any = new Error(quickStartResult.error || 'Error en configuración automática');
                err.code = quickStartResult.errorCode;
                err.fields = quickStartResult.errorFields;
                throw err;
            }

        } catch (error) {
            console.error('Error en Quick Start:', error);
            this.quickStartInProgress = false;
            this.contrasenaHash = null; // si reintenta, se vuelve a calcular del formulario

            // Si el comercio/usuario ya existe, NO mostrar el mensaje de éxito:
            // informar claramente y ofrecer ir al login
            const duplicateCodes = ['COMERCIO_YA_EXISTE', 'EMAIL_YA_EXISTE', 'USUARIO_YA_EXISTE'];
            if (duplicateCodes.includes(error.code)) {
                this.registrationAlreadyExists = true;
                this.quickStartError = error.message || 'Ya existe un registro con estos datos. Si ya tienes cuenta, ingresa con tu correo y contraseña.';
                return;
            }

            // La contraseña no pasó en el servidor: volver a ese paso con su mensaje.
            const errorContrasena = (Array.isArray(error.fields) ? error.fields : []).find((f: any) => f && f.field === 'password');
            if (error.code === 'VALIDATION_ERROR' && errorContrasena) {
                this.olvidarContrasena();
                this.currentStep = 'registration';
                this.registrationIndex = this.PASO_CONTRASENA;
                const control = this.mainForm.get('registration.password');
                control?.setValue('');
                control?.markAsTouched();
                control?.setErrors({ servidor: errorContrasena.message || 'Elige otra contraseña.' });
                return;
            }

            // Datos inválidos (422): dejar corregir sin falso "éxito"
            if (error.code === 'VALIDATION_ERROR') {
                this.registrationBlocked = true;
                this.quickStartError = error.message || 'Algunos datos no son válidos. Revísalos e intenta de nuevo.';
                return;
            }

            // Bloqueado por anti-abuso (403): mensaje claro + contacto a soporte
            if (error.code === 'REGISTRATION_BLOCKED') {
                this.registrationBlocked = true;
                this.quickStartError = error.message || 'No pudimos completar tu registro automáticamente. Escríbenos a soporte@katuq.com.';
                return;
            }

            this.quickStartError = error.message || 'Error en la configuración automática';

            // Fallback al proceso tradicional (solo errores desconocidos / 500 / red)
            setTimeout(() => {
                this.submissionSuccess = true;
                this.welcomeMessage = registrationData.nombre;
                this.processAndRedirect();
            }, 3000);
        }
    }

    redirectToMainSystem() {
        // Para QuickStart exitoso, mostrar instrucciones para ingresar
        // o redirigir al login con las credenciales creadas

        // Un registro nuevo no puede heredar el borrador de otro usuario o
        // comercio que haya usado antes este navegador.
        clearOnboardingStorage(localStorage);
        localStorage.removeItem('katuq_onboarding_state');
        localStorage.removeItem('showOnboardingBanner');
        sessionStorage.removeItem('onboarding_banner_dismissed');
        sessionStorage.removeItem('onboarding_postponed');
        sessionStorage.removeItem('onboarding_reminder_shown');

        this.router.navigate(['/login'], {
            queryParams: {
                message: 'Tu comercio ha sido configurado exitosamente. Usa las credenciales proporcionadas para ingresar.'
            }
        });
    }

    /**
     * D-319: abre la sesión con el login de siempre apenas queda creada la
     * cuenta, sin pasar por /login ni esperar. Si no entra (red, o una
     * respuesta que no creó nada), manda a /login con el correo puesto y el
     * aviso de que la cuenta quedó creada.
     */
    private async entrarConLaCuentaNueva(correo: string): Promise<void> {
        const hash = this.contrasenaHash;
        this.olvidarContrasena();
        if (!hash) {
            this.irAlLoginConCuentaCreada(correo);
            return;
        }
        this.entrandoACuenta = true;
        const entro = await this.authService.signInAfterRegistration(correo, hash);
        if (!entro) {
            this.entrandoACuenta = false;
            this.irAlLoginConCuentaCreada(correo);
        }
    }

    private irAlLoginConCuentaCreada(correo: string): void {
        this.router.navigate(['/login'], { queryParams: { correo, cuenta: 'creada' } });
    }

    /** Borra la contraseña de la memoria del componente y del formulario. */
    private olvidarContrasena(): void {
        this.contrasenaHash = null;
        this.mainForm.get('registration.password')?.setValue('', { emitEvent: false });
    }

    processAndRedirect(): void {
        // Muestra primero el mensaje de procesamiento
        this.isProcessing = true;
        // Después de 5000 ms (5 segundos), oculta el mensaje de procesamiento para mostrar "Bienvenido"
        setTimeout(() => {
            this.isProcessing = false;
        }, 5000);
        // Para el proceso tradicional, no redirigir automáticamente
        // Mostrar botón para que el usuario decida si quiere ir al login
    }

    // Método para ir al login manualmente
    goToLogin(): void {
        this.router.navigate(['/login']);
    }

    // Volver al paso de registro para corregir datos (ej: tras un 409 de duplicado)
    backToRegistration(): void {
        this.registrationAlreadyExists = false;
        this.registrationBlocked = false;
        this.registrationPendingReview = false;
        this.quickStartError = "";
        this.currentStep = 'registration';
        this.registrationIndex = 0;
    }

    // Métodos para cambiar de paso
    moveNextStep() {
        if (this.currentStep === 'questionnaire') {
            // Evitar avanzar si no se ha seleccionado una opción
            if (!this.responses[this.currentQuestion.id]) {
                // Usar una notificación más amigable (podría reemplazarse por un servicio de notificaciones)
                const message = "Por favor, selecciona una opción para continuar";
                // Mostrar feedback visual en lugar de alert
                console.warn(message);
                // Opcional: podrías añadir aquí una notificación toast
                return;
            }
            if (this.currentSectionIndex === this.surveyData.sections.length - 1 &&
                this.currentQuestionIndex === this.currentSection.questions.length - 1) {
                this.currentStep = 'introduction';
            } else {
                this.nextQuestion();
            }
        } else if (this.currentStep === 'introduction') {
            // Inicia el registro paso a paso.
            this.currentStep = 'registration';
            this.registrationIndex = 0;
            this.debouncedSave(); // Guardar progreso
            // Opcional: si se desea limpiar el primer campo cuando se entra, se puede llamar reset().
            // Pero cuidado: hacerlo luego borra el valor ingresado.
            // this.mainForm.get('registration.' + this.registrationQuestions[0].formControl)?.reset();
        } else if (this.currentStep === 'registration') {
            // Validar el campo actual antes de avanzar
            if (!this.isCurrentRegistrationFieldValid()) {
                // Marcar el campo como touched para mostrar errores
                const currentField = this.registrationQuestions[this.registrationIndex].formControl;
                this.mainForm.get(`registration.${currentField}`)?.markAsTouched();
                return;
            }
            
            if (this.registrationIndex < this.registrationQuestions.length - 1) {
                // Pasar del nombre de la empresa al siguiente dato = empezó a registrarse.
                if (this.registrationIndex === 0) this.pixeles.inicioRegistro();
                this.registrationIndex++;
            } else {
                this.confirmFinish();
                this.currentStep = 'summary';
            }
            this.debouncedSave(); // Guardar progreso después de avanzar en registro
        }
    }

    backRegistration() {
        if (this.registrationIndex > 0) {
            this.registrationIndex--;
        } else {
            this.currentStep = this.registrationOnly ? 'welcome' : 'questionnaire';
        }
    }

    goToQuestionnaire() {
        this.currentStep = 'questionnaire';
    }

    // Método para controlar retorno en navegación (puede implementarse de acuerdo a la lógica)
    canGoBack() {
        return this.currentSectionIndex > 0 || this.currentQuestionIndex > 0;
    }

    isLastQuestion() {
        return this.currentSectionIndex === this.surveyData.sections.length - 1 &&
            this.currentQuestionIndex === this.currentSection.questions.length - 1;
    }

    // Métodos para preguntas contextuales
    get currentContextualQuestion() {
        return this.contextualQuestions[this.currentContextualIndex];
    }

    selectContextualOption(option: string) {
        this.contextualResponses[this.currentContextualQuestion.id] = option;
        this.debouncedSave(); // Guardar progreso
        
        // Avanzar automáticamente a la siguiente pregunta contextual
        setTimeout(() => {
            this.nextContextualQuestion();
        }, 300);
    }

    nextContextualQuestion() {
        if (this.currentContextualIndex < this.contextualQuestions.length - 1) {
            this.currentContextualIndex++;
        } else {
            // Terminaron las preguntas contextuales, ir al registro
            this.currentStep = 'introduction';
        }
        this.debouncedSave(); // Guardar progreso
    }

    backContextualQuestion() {
        if (this.currentContextualIndex > 0) {
            this.currentContextualIndex--;
        } else {
            // Si está en la primera pregunta contextual, volver al cuestionario principal
            this.currentStep = 'questionnaire';
            // Posicionarse en la última pregunta del cuestionario principal
            this.currentSectionIndex = this.surveyData.sections.length - 1;
            this.currentQuestionIndex = this.currentSection.questions.length - 1;
        }
    }

    canGoBackContextual() {
        return this.currentContextualIndex > 0 || this.canGoBack();
    }

    isLastContextualQuestion() {
        return this.currentContextualIndex === this.contextualQuestions.length - 1;
    }

    getStepNumber(): number {
        switch(this.currentStep) {
            case 'welcome': return 0;
            case 'questionnaire': return 1;
            case 'contextual': return 2;
            case 'introduction': return this.contextualQuestions.length > 0 ? 3 : 2;
            case 'registration': return this.contextualQuestions.length > 0 ? 3 : 2;
            case 'summary': return this.contextualQuestions.length > 0 ? 4 : 3;
            default: return 0;
        }
    }

    /**
     * Método para iniciar el diagnóstico desde la página de bienvenida
     */
    startDiagnostic(): void {
        this.registrationOnly = false;
        this.currentStep = 'questionnaire';
        this.debouncedSave();
    }

    /**
     * Inicia el camino corto: cuatro datos, plan Gratis y sin diagnóstico forzado.
     */
    startFreeRegistration(): void {
        this.registrationOnly = true;
        this.responses = {};
        this.contextualResponses = {};
        this.contextualQuestions = [];
        this.registrationIndex = 0;
        this.currentStep = 'registration';
        this.debouncedSave();
    }

    showIntroVideo(): void {
        this.videoPlaying = true;
        this.videoEnded = false;
        this.currentStep = 'video';
    }

    /**
     * Obtiene tiempo estimado restante en minutos
     */
    getEstimatedTimeRemaining(): number {
        const totalQuestions = this.getTotalQuestions();
        const currentQuestion = this.getCurrentQuestionNumber();
        const questionsRemaining = totalQuestions - currentQuestion;
        const avgTimePerQuestion = this.estimatedTimeMinutes / totalQuestions;
        return Math.max(1, Math.ceil(questionsRemaining * avgTimePerQuestion));
    }

    /**
     * Calcula el número total de preguntas
     */
    getTotalQuestions(): number {
        return this.surveyData.sections.reduce((total, section) => total + section.questions.length, 0);
    }

    /**
     * Calcula el número de la pregunta actual (1-indexed)
     */
    getCurrentQuestionNumber(): number {
        let count = 0;
        for (let i = 0; i < this.currentSectionIndex; i++) {
            count += this.surveyData.sections[i].questions.length;
        }
        return count + this.currentQuestionIndex + 1;
    }

    /**
     * Calcula el progreso total como porcentaje
     */
    getTotalProgress(): number {
        const total = this.getTotalQuestions();
        const current = this.getCurrentQuestionNumber();
        return Math.round((current / total) * 100);
    }

    /**
     * Método que se llama cuando el video termina de reproducirse
     */
    onVideoEnded(): void {
        this.videoPlaying = false;
        this.videoEnded = true;
        // Ir automáticamente a la página de bienvenida
        this.currentStep = 'welcome';
    }

    /**
     * Método para saltar el video y ir a la página de bienvenida
     */
    skipVideoAndStart(): void {
        this.videoPlaying = false;
        this.videoEnded = true;
        this.currentStep = 'welcome';
    }

    /**
     * Método para iniciar la reproducción del video manualmente
     */
    playVideo(): void {
        this.videoPlaying = true;
        this.videoEnded = false;
    }

    /**
     * Método para saltar el video manualmente
     */
    skipVideo(): void {
        this.videoPlaying = false;
        this.videoEnded = true;
    }
}
