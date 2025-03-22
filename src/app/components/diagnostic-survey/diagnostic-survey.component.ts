import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Se agregó Validators
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-diagnostic-survey',
    templateUrl: './diagnostic-survey.component.html',
    styleUrls: ['./diagnostic-survey.component.scss']
})
export class DiagnosticSurveyComponent implements OnInit {

    surveyData = {
        "formTitle": "Diagnóstico para la Transformación Digital de tu Negocio",
        "formDescription": "Con los siguientes datos, prepararemos la mejor interfaz que se acomoda a tus necesidades.",
        "sections": [
            {
                "sectionTitle": "Información General del Negocio",
                "questions": [
                    {
                        "id": "q1",
                        "question": "¿En qué sector opera tu negocio?",
                        "type": "single_choice",
                        "options": [
                            "Retail - Comercial",
                            "Manufactura",
                            "Otros"
                        ],
                        "allowOther": true
                    },
                    {
                        "id": "q2",
                        "question": "¿Cómo encontraste Katuq?",
                        "type": "single_choice",
                        "options": [
                            "Redes Sociales",
                            "Anuncio en Google",
                            "Recomendación",
                            "Evento o conferencia",
                            "Otro"
                        ],
                        "allowOther": true
                    },
                    {
                        "id": "q3",
                        "question": "¿En qué etapa de digitalización está tu empresa?",
                        "type": "single_choice",
                        "options": [
                            "Opero 100% offline (Sin herramientas digitales), papel, Excel",
                            "Uso algunas herramientas digitales, pero no todo está conectado",
                            "Tengo un software, pero quiero mejorar mis procesos",
                            "Ya opero con sistemas digitales avanzados, pero quiero ver alternativas"
                        ]
                    },
                    {
                        "id": "q4",
                        "question": "¿Cómo manejas actualmente la administración de tu negocio?",
                        "type": "single_choice",
                        "options": [
                            "Todo manualmente en papel o Excel",
                            "Uso herramientas digitales básicas, pero no están conectadas",
                            "Tengo varios sistemas, pero no están bien integrados",
                            "Uso un ERP / Plataforma centralizada"
                        ]
                    },
                    {
                        "id": "q5",
                        "question": "¿Qué es más importante para tu negocio en este momento? (Selecciona una opción)",
                        "type": "single_choice",
                        "options": [
                            "Optimizar la gestión de productos e inventario",
                            "Mejorar la logística y despachos",
                            "Automatizar pagos y facturación",
                            "Vender más con marketing digital",
                            "Mejorar la experiencia del cliente",
                            "Expandirme a nuevos mercados"
                        ]
                    }
                ]
            },
            {
                "sectionTitle": "Gestión de Productos y Ventas",
                "questions": [
                    {
                        "id": "q6",
                        "question": "¿Cuántos productos tienes en tu catálogo?",
                        "type": "single_choice",
                        "options": [
                            "Menos de 50",
                            "Entre 50 y 200",
                            "Entre 200 y 500",
                            "Entre 500 y 1.000",
                            "Más de 1.000"
                        ]
                    },
                    {
                        "id": "q7",
                        "question": "¿Tienes diferentes tipos de clientes?",
                        "type": "single_choice",
                        "options": [
                            "Solo vendo a clientes finales (B2C)",
                            "Solo vendo a empresas (B2B)",
                            "Vendo tanto a clientes finales como a empresas (B2B y B2C)"
                        ]
                    },
                    {
                        "id": "q8",
                        "question": "¿Dónde vendes más actualmente? (Selecciona una opción)",
                        "type": "single_choice",
                        "options": [
                            "Punto de venta",
                            "Ecommerce propio",
                            "Marketplaces (Amazon, Mercado Libre, etc.)",
                            "Redes Sociales",
                            "Dropshipping",
                            "Tienda a Tienda",
                            "Otro"
                        ],
                        "allowOther": true
                    },
                    {
                        "id": "q9",
                        "question": "¿Cuál es el proveedor de tu página web?",
                        "type": "single_choice",
                        "options": [
                            "Shopify",
                            "Tienda Nube",
                            "Wordpress + WooCommerce",
                            "Magento",
                            "Wix",
                            "Otro"
                        ],
                        "allowOther": true
                    }
                ]
            },
            {
                "sectionTitle": "Pedidos y Logística",
                "questions": [
                    {
                        "id": "q10",
                        "question": "¿Cómo gestionas los pedidos y envíos?",
                        "type": "single_choice",
                        "options": [
                            "Excel",
                            "Automatizado con software propio",
                            "Delegado a terceros como un Fulfillment y/o Pasarelas de envío"
                        ]
                    },
                    {
                        "id": "q11",
                        "question": "¿Cómo organizas la entrega de tus pedidos?",
                        "type": "single_choice",
                        "options": [
                            "Lo que vendo, lo pongo en cola de despacho",
                            "Permito que el cliente programe la fecha y hora de entrega",
                            "Tengo ambas opciones disponibles a mis clientes"
                        ]
                    },
                    {
                        "id": "q12",
                        "question": "¿Cómo gestionas tu inventario?",
                        "type": "single_choice",
                        "options": [
                            "Ventas sobre pedido",
                            "Inventario disponible en stock",
                            "Ofrezco ambas opciones"
                        ]
                    },
                    {
                        "id": "q13",
                        "question": "¿Cuál es la cobertura principal de tus pedidos? (Selecciona una opción)",
                        "type": "single_choice",
                        "options": [
                            "Local",
                            "Departamental",
                            "Nacional",
                            "Internacional"
                        ]
                    },
                    {
                        "id": "q14",
                        "question": "¿Cuánto tiempo tardas en procesar y despachar un pedido?",
                        "type": "single_choice",
                        "options": [
                            "Mismo día",
                            "24-48 horas",
                            "Más de 48 horas"
                        ]
                    },
                    {
                        "id": "q15",
                        "question": "¿Tus clientes pueden hacer seguimiento de sus pedidos en línea?",
                        "type": "single_choice",
                        "options": [
                            "Sí, ya tienen acceso a un portal de seguimiento",
                            "No, pero me interesa",
                            "No lo considero necesario"
                        ]
                    }
                ]
            },
            {
                "sectionTitle": "Pagos y Facturación",
                "questions": [
                    {
                        "id": "q16",
                        "question": "¿Cuentas con integración para pagos en línea?",
                        "type": "single_choice",
                        "options": [
                            "Sí, está integrada en mi web",
                            "Sí, pero no está integrada, valido y asiento el pago manualmente",
                            "No"
                        ]
                    },
                    {
                        "id": "q17",
                        "question": "¿Tienes facturación electrónica?",
                        "type": "single_choice",
                        "options": [
                            "Sí, integrada y automática",
                            "Sí, pero la hago manualmente paso por paso",
                            "No",
                            "En proceso"
                        ]
                    },
                    {
                        "id": "q18",
                        "question": "¿Cuál es el método de pago que más usan tus clientes? (Selecciona una opción)",
                        "type": "single_choice",
                        "options": [
                            "Tarjeta de crédito / débito",
                            "PSE",
                            "Transferencias bancarias",
                            "Pagos contra entrega",
                            "Nequi / Daviplata",
                            "PayPal / Stripe",
                            "Criptomonedas",
                            "Otro"
                        ],
                        "allowOther": true
                    }
                ]
            },
            {
                "sectionTitle": "Publicidad y Marketing",
                "questions": [
                    {
                        "id": "q19",
                        "question": "¿Tienes una base de datos de clientes?",
                        "type": "single_choice",
                        "options": [
                            "Sí, la gestiono en Excel",
                            "Sí, uso un CRM",
                            "No, pero quiero empezar a construir una"
                        ]
                    },
                    {
                        "id": "q20",
                        "question": "¿Inviertes regularmente en publicidad digital?",
                        "type": "single_choice",
                        "options": [
                            "Sí, mensualmente",
                            "Sí, ocasionalmente",
                            "No, pero quiero empezar",
                            "No, no lo considero necesario"
                        ]
                    },
                    {
                        "id": "q21",
                        "question": "¿Para la pauta publicitaria de tu comercio cuál de los siguientes canales usas más frecuentemente? (Selecciona una opción)",
                        "type": "single_choice",
                        "options": [
                            "SMS marketing",
                            "Email marketing",
                            "WhatsApp Marketing"
                        ]
                    }
                ]
            },
            {
                "sectionTitle": "Análisis de Innovación y Digitalización",
                "questions": [
                    {
                        "id": "q22",
                        "question": "¿Utilizas IA en tu negocio para mejorar operaciones o ventas?",
                        "type": "single_choice",
                        "options": [
                            "Sí",
                            "No"
                        ]
                    },
                    {
                        "id": "q23",
                        "question": "¿Usas un CRM para gestionar la data de tus clientes?",
                        "type": "single_choice",
                        "options": [
                            "Sí",
                            "No"
                        ]
                    },
                    {
                        "id": "q24",
                        "question": "¿Tienes integración con transportadoras para envíos?",
                        "type": "single_choice",
                        "options": [
                            "Sí",
                            "No"
                        ]
                    }
                ]
            },
            {
                "sectionTitle": "Estrategia y Crecimiento",
                "questions": [
                    {
                        "id": "q25",
                        "question": "¿Estás interesado en usar herramientas de IA para mejorar tu negocio?",
                        "type": "single_choice",
                        "options": [
                            "Sí, quiero explorar opciones para automatización",
                            "Sí, pero no sé cómo aplicarlas",
                            "No, prefiero seguir con mi sistema actual"
                        ]
                    },
                    {
                        "id": "q26",
                        "question": "¿Cuál es tu principal objetivo de crecimiento para los próximos 12 meses? (Selecciona la opción que mejor represente tu plan actual)",
                        "type": "single_choice",
                        "options": [
                            "Aumentar mis ventas en el mismo mercado (Optimizar estrategias y mejorar presencia en mi mercado actual)",
                            "Mantener mis ventas estables (Consolidar mi negocio sin grandes cambios en ventas)",
                            "Mejorar la productividad y rentabilidad (Reducir costos, automatizar procesos y hacer más eficiente la operación)",
                            "Expandirme a nuevos mercados nacionales (Abrir operaciones en otras ciudades o regiones dentro del país)",
                            "Internacionalizar mi negocio (Llevar mis productos/servicios a mercados fuera del país)",
                            "No tengo un plan de expansión en este momento"
                        ]
                    },
                    {
                        "id": "q27",
                        "question": "¿Cuál es el mayor obstáculo para escalar tu negocio?",
                        "type": "single_choice",
                        "options": [
                            "Falta de automatización para optimizar costos",
                            "Falta de herramientas tecnológicas",
                            "Dificultades con la logística y envíos",
                            "Problemas para conseguir más clientes",
                            "Resistencia al cambio y la digitalización",
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
    currentStep: 'questionnaire' | 'introduction' | 'registration' | 'summary' = 'questionnaire';

    mainForm: FormGroup; // Formulario principal
    isProcessing: boolean = false; // nueva bandera para animación de procesamiento

    // Definición única de registrationQuestions
    registrationQuestions = [
        { formControl: 'nombre', question: '¿Cuál es el Nombre Completo o Razón Social de la empresa?', placeholder: 'Nombre o Razón Social' },
        { formControl: 'nomComercial', question: '¿Cuál es el Nombre Comercial de la empresa?', placeholder: 'Nombre Comercial' },
        { formControl: 'nit', question: '¿Cuál es el CC o NIT de la empresa?', placeholder: 'CC o NIT' },
        { formControl: 'digitoVerificacion', question: '¿Cuál es el DV de la empresa?', placeholder: 'DV' },
        { formControl: 'correo', question: '¿Cuál es el correo de contacto de la empresa?', placeholder: 'Correo' },
        { formControl: 'celular', question: '¿Cuál es el número de celular de la empresa?', placeholder: 'Celular' }
    ];
    registrationIndex = 0;

    constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
        // No se vuelve a asignar registrationQuestions aquí
        this.mainForm = this.fb.group({
            registration: this.fb.group({
                nombre: ['', Validators.required],
                nomComercial: ['', Validators.required],
                nit: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
                digitoVerificacion: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
                correo: ['', [Validators.required, Validators.email]],
                celular: ['', [Validators.required, Validators.pattern('^[0-9]+$')]]
            })
        });
    }

    ngOnInit() { }

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
            this.confirmFinish();
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
        summary += `<h3 style="margin: 20px 0 10px; color: #9020FF; font-size: 1.5em;">Registro de Empresa</h3>`;
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

    submitResponses() {
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
        this.http.post(apiUrl, payload).subscribe({
            next: (res) => {
                console.log("Respuestas enviadas:", res);
                this.submissionSuccess = true;
                const empresa = this.mainForm.get('registration.nombre')?.value || 'tu empresa';
                this.welcomeMessage = `${empresa}`;
                // Inicia el proceso: primero se muestra "Procesando"
                this.processAndRedirect();
            },
            error: (err) => {
                console.error("Error al enviar respuestas", err);
            }
        });
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
            // Se elimina la llamada a reset() para preservar los datos ingresados.
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
}
