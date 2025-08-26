import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Se agregó Validators
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { KatuqQuickStartService, DiagnosticResponse } from '../../shared/services/quickstart/katuq-quickstart.service';
import { ContextualQuestionsService, ContextualQuestion } from '../../shared/services/quickstart/contextual-questions.service';

@Component({
    selector: 'app-diagnostic-survey',
    templateUrl: './diagnostic-survey.component.html',
    styleUrls: ['./diagnostic-survey.component.scss']
})
export class DiagnosticSurveyComponent implements OnInit {

    surveyData = {
        "formTitle": "Diagnóstico Rápido para tu Negocio Digital",
        "formDescription": "Solo 8 preguntas esenciales para crear la configuración perfecta para tu negocio.",
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
    currentStep: 'questionnaire' | 'contextual' | 'introduction' | 'registration' | 'summary' | 'quickstart-success' = 'questionnaire';
    
    // Variables para Quick Start
    quickStartInProgress: boolean = false;
    quickStartCompleted: boolean = false;
    quickStartError: string = "";
    quickStartMessage: string = "";
    nextSteps: string[] = [];

    // Variables para preguntas contextuales
    contextualQuestions: ContextualQuestion[] = [];
    currentContextualIndex: number = 0;
    contextualResponses: { [id: string]: string } = {};

    mainForm: FormGroup; // Formulario principal
    isProcessing: boolean = false; // nueva bandera para animación de procesamiento

    // Registro simplificado: solo 4 campos esenciales
    registrationQuestions = [
        { formControl: 'nombre', question: '¿Cuál es el nombre de tu empresa?', placeholder: 'Nombre de la empresa' },
        { formControl: 'nit', question: '¿Cuál es tu NIT o documento de identidad?', placeholder: 'NIT o cédula' },
        { formControl: 'correo', question: '¿Cuál es tu correo electrónico?', placeholder: 'correo@ejemplo.com' },
        { formControl: 'celular', question: '¿Cuál es tu número de celular?', placeholder: 'Número de celular' }
    ];
    registrationIndex = 0;

    constructor(
        private fb: FormBuilder, 
        private http: HttpClient, 
        private router: Router,
        private quickStartService: KatuqQuickStartService,
        private contextualQuestionsService: ContextualQuestionsService
    ) {
        // No se vuelve a asignar registrationQuestions aquí
        this.mainForm = this.fb.group({
            registration: this.fb.group({
                nombre: ['', [Validators.required, Validators.minLength(2), Validators.pattern('^[a-zA-ZÀ-ÿ\\s]+$')]],
                nit: ['', [Validators.required, Validators.pattern('^[0-9]{8,11}$')]],
                correo: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
                celular: ['', [Validators.required, Validators.pattern('^3[0-9]{9}$')]]
            })
        });
    }

    ngOnInit() { }

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
        }
        return null;
    }

    private getRequiredMessage(fieldName: string): string {
        const messages: { [key: string]: string } = {
            'nombre': 'El nombre de la empresa es requerido',
            'nit': 'El NIT o documento de identidad es requerido',
            'correo': 'El correo electrónico es requerido',
            'celular': 'El número de celular es requerido'
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

    get currentSection() {
        return this.surveyData.sections[this.currentSectionIndex];
    }
    get currentQuestion() {
        return this.currentSection.questions[this.currentQuestionIndex];
    }

    selectOption(option: string) {
        this.responses[this.currentQuestion.id] = option;
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
        summary += `<p>${this.surveyData.formDescription}</p>`;
        summary += '<p>A continuación, se muestra el resumen de tus respuestas:</p>';
        this.surveyData.sections.forEach(section => {
            summary += `<h3 style="margin: 10px 0 5px; color: #00FFCC ; font-size: 1.5em;">${section.sectionTitle}</h3>`;
            section.questions.forEach(q => {
                summary += `<p style="margin: 0 0 10px;"><strong>${q.question}</strong><br><em>${this.responses[q.id] || 'Sin respuesta'}</em></p>`;
            });
        });
        summary += `<h3 style="margin: 20px 0 10px; color: #9020FF; font-size: 1.5em;">Información de Empresa</h3>`;
        this.registrationQuestions.forEach(item => {
            const value = this.mainForm.get('registration.' + item.formControl)?.value;
            summary += `<p style="margin: 0 0 10px;"><strong>${item.question}</strong><br><em>${value ? value : 'Sin respuesta'}</em></p>`;
        });
        summary += '</div>';
        this.summaryHTML = summary;
        this.currentStep = 'summary';
    }

    editResponses() {
        this.currentStep = 'questionnaire';
    }

    // Agrega este método en la clase para hacer trim a los valores del grupo "registration"
    private trimRegistrationValues(): void {
        const regGroup = this.mainForm.get('registration');
        if (regGroup) {
            const keys = Object.keys(regGroup.value);
            const trimmedValues: { [key: string]: string } = {};
            keys.forEach(key => {
                const value = regGroup.get(key)?.value;
                trimmedValues[key] = value ? value.trim() : '';
            });
            regGroup.patchValue(trimmedValues);
        }
    }

    async submitResponses() {
        // Realiza trim de los inputs antes de enviarlos
        this.trimRegistrationValues();
        const responsesArray: { questionId: string; question: string; answer: string }[] = [];
        this.surveyData.sections.forEach(section => {
            section.questions.forEach(q => responsesArray.push({
                questionId: q.id,
                question: q.question,
                answer: this.responses[q.id] || ''
            }));
        });
        const registrationData = this.mainForm.get('registration')?.value;
        const payload = {
            formTitle: this.surveyData.formTitle,
            responses: responsesArray,
            registration: registrationData
        };
        const apiUrl = environment.urlApi + '/v1/diagnostics/saveSurveyResponse';
        
        try {
            const response: any = await this.http.post(apiUrl, payload).toPromise();
            console.log("Respuestas enviadas:", response);
            
            // Iniciar Quick Start automáticamente
            await this.startQuickStart(response, registrationData, responsesArray);
            
        } catch (error) {
            console.error("Error al enviar respuestas", error);
            // En caso de error, mostrar proceso tradicional
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
        this.quickStartService.quickStartStatus$.subscribe(status => {
            this.quickStartMessage = status.message;
        });

        // Preparar datos para Quick Start (incluir respuestas contextuales)
        const allResponses = { ...this.responses, ...this.contextualResponses };
        const diagnosticData: DiagnosticResponse = {
            responses: allResponses,
            registration: registrationData,
            aiRecommendation: apiResponse.aiRecommendation || {
                modulosRecomendados: ['POS', 'Inventarios'],
                permisos: [
                    'ver_dashboard',
                    'gestionar_productos',
                    'gestionar_inventario', 
                    'gestionar_pedidos',
                    'usar_pos'
                ],
                sector: this.responses.q1 || 'Retail - Comercial',
                complejidad: 'basica',
                canales: ['POS']
            }
        };

        try {
            // Ejecutar Quick Start
            const quickStartResult = await this.quickStartService.setupQuickStart(diagnosticData);
            
            if (quickStartResult.success) {
                this.quickStartCompleted = true;
                this.quickStartInProgress = false;
                this.welcomeMessage = registrationData.nombre;
                this.nextSteps = quickStartResult.nextSteps || [];
                this.quickStartMessage = quickStartResult.message || "¡Tu comercio está configurado y listo!";
                
                // Redirigir después de mostrar éxito
                setTimeout(() => {
                    this.redirectToMainSystem();
                }, 8000);
                
            } else {
                throw new Error(quickStartResult.error || 'Error en configuración automática');
            }
            
        } catch (error) {
            console.error('Error en Quick Start:', error);
            this.quickStartInProgress = false;
            this.quickStartError = error.message || 'Error en la configuración automática';
            
            // Fallback al proceso tradicional
            setTimeout(() => {
                this.submissionSuccess = true;
                this.welcomeMessage = registrationData.nombre;
                this.processAndRedirect();
            }, 3000);
        }
    }

    redirectToMainSystem() {
        // Redirigir al dashboard principal en lugar del login
        this.router.navigate(['/dashboard']);
    }

    processAndRedirect(): void {
        // Muestra primero el mensaje de procesamiento
        this.isProcessing = true;
        // Después de 5000 ms (5 segundos), oculta el mensaje de procesamiento para mostrar "Bienvenido"
        setTimeout(() => {
            this.isProcessing = false;
        }, 5000);
        // Finalmente, redirige al login después de 10000 ms (10 segundos en total)
        setTimeout(() => {
            this.router.navigate(['/login']);
        }, 10000);
    }

    // Métodos para cambiar de paso
    moveNextStep() {
        if (this.currentStep === 'questionnaire') {
            // Evitar avanzar si no se ha seleccionado una opción
            if (!this.responses[this.currentQuestion.id]) {
                alert("Por favor, seleccione una opción para continuar");
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
                this.registrationIndex++;
            } else {
                this.confirmFinish();
                this.currentStep = 'summary';
            }
        }
    }

    backRegistration() {
        if (this.registrationIndex > 0) {
            this.registrationIndex--;
        } else {
            // Si estamos en la primera pregunta de registro, regresar al cuestionario
            this.currentStep = 'questionnaire';
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
            case 'questionnaire': return 1;
            case 'contextual': return 2;
            case 'introduction': return this.contextualQuestions.length > 0 ? 3 : 2;
            case 'registration': return this.contextualQuestions.length > 0 ? 3 : 2;
            case 'summary': return this.contextualQuestions.length > 0 ? 4 : 3;
            default: return 1;
        }
    }
}
