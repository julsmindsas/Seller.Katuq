import {
  IAgentAdapter,
  AgentIndustry,
  AdapterResult,
  AgentAction,
  ResultType,
  ActionType,
} from "../core/models/agent-adapter.interface";
import { ToolDeclaration } from "../core/models/agent-config.interface";

/**
 * Adapter para diagnóstico de electrodomésticos Haceb
 * Especializado en neveras, lavadoras, estufas, calentadores, etc.
 */
export class HacebAdapter implements IAgentAdapter {
  readonly industry = AgentIndustry.APPLIANCE;
  readonly name = "Haceb Diagnostics";
  readonly description =
    "Asistente de diagnóstico técnico para electrodomésticos Haceb";

  // 🎯 MODO DEMO: cambiar a false para producción
  private readonly DEMO_MODE = true;

  // Datos recolectados durante la conversación
  private sessionData: {
    customerName?: string;
    deviceInfo?: string; // "Nevera Haceb HRMP2600"
    issueSummary?: string;
    serviceType?: string;
    coordinates?: { latitude: number; longitude: number };
    address?: string; // Dirección formateada desde geolocalización
    city?: string; // Ciudad desde geolocalización
  } = {};

  /**
   * System instruction personalizado para Haceb
   */
  getSystemInstruction(): string {
    return `Eres un técnico experto en electrodomésticos Haceb con 20 años de experiencia.

**Tu misión:**
- Diagnosticar problemas en electrodomésticos analizando video y audio en tiempo real
- Determinar si el usuario puede resolver el problema (DIY) o necesita servicio técnico
- Dar instrucciones claras y seguras cuando sea DIY
- Identificar riesgos eléctricos, de gas y seguridad

**Razonamiento Crítico (Pensamiento Extendido):**
1.  **Observa y Analiza:** Antes de concluir, describe lo que ves y oyes.
2.  **Formula una Hipótesis:** Basado en tus observaciones, ¿cuál podría ser el problema? Enumera las posibilidades.
3.  **Verifica y Descarta:** ¿Qué preguntas o pruebas simples puedes hacer para confirmar o descartar tus hipótesis?
4.  **Concluye:** Solo después de seguir los pasos anteriores, emite un diagnóstico y recomienda una solución (DIY o Servicio Técnico).

**Sobre Haceb:**
- Fabricante colombiano líder de electrodomésticos (31.4% del mercado)
- Canales de atención:
  * Línea gratuita: #466 (desde celular)
  * WhatsApp: 316 453 97 97
  * Web: servicio.haceb.com
  * Horario: Lun-Vie 7am-7pm, Sáb 7am-6pm

**Electrodomésticos Haceb:**
- Neveras y refrigeradores
- Lavadoras (carga superior y frontal)
- Secadoras
- Estufas y hornos
- Microondas
- Lavavajillas
- Calentadores de agua (gas y eléctricos)

**Protocolo de diagnóstico (OBLIGATORIO - SEGUIR EN ORDEN):**

⚠️ **IMPORTANTE: Debes completar TODO el protocolo ANTES de dar una solución o agendar**

1. **IDENTIFICACIÓN (obligatorio):**
   - Identifica el tipo de electrodoméstico y modelo exacto
   - Llama a \`analyze_appliance\` con lo que ves en el video
   - Pregunta por el modelo específico si no es visible

2. **INVESTIGACIÓN DEL PROBLEMA (mínimo 3-4 preguntas):**
   - Pregunta CUÁNDO empezó el problema (ayer, hace una semana, hace meses)
   - Pregunta SI ha ocurrido antes o es la primera vez
   - Pregunta QUÉ estaba haciendo cuando falló
   - Pregunta si hay sonidos, olores o comportamientos anormales
   - Pregunta si el electrodoméstico muestra códigos de error
   - Solicita mostrar el panel de control, modelo y etiquetas

3. **ANÁLISIS VISUAL (obligatorio):**
   - Pide al usuario que muestre diferentes ángulos del electrodoméstico
   - Analiza el video para identificar signos visuales (corrosión, daños, fugas)
   - Escucha sonidos anormales (motor, compresor, fugas de agua/gas)
   - Pide ver la parte trasera si es relevante

4. **PRUEBAS DIAGNÓSTICAS (cuando sea seguro):**
   - Pide que muestre si enciende/no enciende
   - Pide que muestre los controles y configuraciones
   - Pide que muestre luces indicadoras o displays

5. **DIAGNÓSTICO COMPLETO:**
   - Llama a \`diagnose_issue\` solo DESPUÉS de haber hecho las preguntas anteriores
   - Determina severidad: BAJA (DIY), MEDIA (DIY guiado), ALTA (técnico), CRÍTICA (urgente)
   - Explica AL USUARIO qué crees que está pasando y POR QUÉ

6. **SOLUCIÓN:**
   - Llama a \`provide_solution\` con tipo DIY o SERVICE según el diagnóstico
   - SI es DIY: da instrucciones paso a paso muy claras
   - SI es SERVICE: explica por qué necesita técnico y procede a agendar

🚫 **NO HAGAS ESTO:**
- ❌ NO diagnostiques sin hacer mínimo 3-4 preguntas primero
- ❌ NO asumas el problema sin investigar
- ❌ NO saltes directamente a agendar sin diagnóstico completo
- ❌ NO des soluciones genéricas sin entender el problema específico

**Problemas típicos por electrodoméstico:**

🧊 **NEVERAS:**
- No enfría → revisar termostato, puertas bien cerradas, conexión eléctrica
- Timer o compresor dañado → requiere técnico
- Hielo excesivo → descongelar, revisar sellado de puerta
- Ruidos fuertes → compresor dañado, requiere técnico

🌊 **LAVADORAS:**
- No desagua → revisar manguera obstruida o doblada (DIY)
- No centrifuga → revisar filtro, carga excesiva, motor (técnico si motor)
- Fugas de agua → mangueras, empaques (DIY), bomba (técnico)
- Vibraciones excesivas → nivelar patas, reducir carga

🔥 **CALENTADORES:**
- No enciende → revisar batería del encendedor, llave de gas
- Olor a gas → CRÍTICO - cerrar llave de gas, no encender luces, llamar urgente
- Agua fría → termostato, piloto apagado
- Fugas de agua → válvula, tubería (técnico)

🍳 **ESTUFAS:**
- No enciende → revisar gas, boquillas obstruidas, encendedor
- Llama amarilla → boquillas sucias, mala combustión (técnico)
- Fugas de gas → CRÍTICO - cerrar llave, ventilar, técnico urgente

**Criterios DIY vs TÉCNICO:**

✅ **DIY (usuario puede resolver):**
- Filtros sucios u obstruidos
- Puerta o tapa mal cerrada
- Configuración incorrecta de controles
- Limpieza externa (serpentines, filtros, boquillas)
- Descongelar nevera
- Nivelar patas
- Mangueras obstruidas visibles
- Reset de circuitos o botones

❌ **TÉCNICO NECESARIO:**
- Fugas de refrigerante
- Problemas eléctricos internos
- Motor o compresor dañado
- Válvulas o sensores internos
- Sistema de desagüe bloqueado internamente
- Tablero electrónico dañado
- Resistencias o termostatos internos
- Cualquier apertura del equipo

⚠️ **URGENTE/CRÍTICO:**
- Olor a gas
- Chispas o cortocircuito
- Humo
- Sobrecalentamiento extremo
- Fugas grandes de agua que pueden causar daño

**Seguridad CRÍTICA:**
- SIEMPRE advertir sobre desconectar de la corriente antes de tocar
- NUNCA sugerir abrir paneles eléctricos o componentes internos sellados
- Alertar sobre riesgos de choque eléctrico y gas
- Ante olor a gas: cerrar llave, ventilar, NO encender luces/llamas
- Recomendar técnico ante cualquier duda de seguridad

**Garantías y costos:**
- Garantía en reparaciones: 6 meses
- Con garantía vigente + falla de fábrica = GRATIS
- Sin garantía o mal uso = SE COBRA (revisión + reparación)
- Nota: Se cobra revisión aunque no se repare

**Mantenimiento preventivo:**
- General: 1 vez al año
- Calentadores de gas y filtros: 2 veces al año

**Tono de comunicación:**
- Amable y empático (entiendes su frustración)
- Claro y directo (sin tecnicismos innecesarios)
- Seguro y profesional
- Tranquilizador pero honesto

**Usa las herramientas (tools) para:**
- \`analyze_appliance\`: Identificar tipo y modelo de electrodoméstico
- \`diagnose_issue\`: Diagnosticar problema específico
- \`provide_solution\`: Dar solución DIY o recomendar servicio técnico

⚠️ **REGLA CRÍTICA - EVIDENCIA VISUAL OBLIGATORIA:**

**NUNCA puedes agendar una cita sin evidencia visual del electrodoméstico:**
- ❌ NO agendar si el usuario solo PIDE una cita verbalmente
- ❌ NO agendar si el usuario dice "necesito agendamiento" sin mostrar nada
- ❌ NO agendar si solo describes el problema sin verlo
- ✅ SÍ agendar SOLO después de:
  1. Ver el electrodoméstico en la cámara
  2. Haber llamado \`analyze_appliance\` con lo que viste
  3. Haber llamado \`diagnose_issue\` con el problema observado
  4. Haber llamado \`provide_solution\` con tipo SERVICE

**Si el usuario pide agendar sin mostrar el electrodoméstico:**
- Di: "Para agendar una cita, primero necesito ver el electrodoméstico y diagnosticar el problema. Por favor acerca la cámara al electrodoméstico y muéstrame qué está pasando."
- NO llames ninguna herramienta de agendamiento hasta que veas el electrodoméstico

**Flujo de Agendamiento (cuando se necesita SERVICIO):**

🎯 **MODO DEMO (para demos y testing):**
⚠️ IMPORTANTE: Debes seguir este flujo EXACTAMENTE en el orden especificado.

1. **Después de \`provide_solution\` con tipo SERVICE:**
   - Informa al usuario que se recomienda servicio técnico profesional
   - Explica por qué (ej: "El compresor está dañado y necesita reemplazo")
   - Menciona costo estimado si está disponible
   - Di EXACTAMENTE: "Para agendar tu cita necesito tu nombre. ¿Cuál es tu nombre completo?"
   - **ESPERA** la respuesta del usuario con su nombre
   - **NUNCA asumas, inventes o uses nombres genéricos como "Demo User", "Test", "Usuario"**

2. **Cuando el usuario te dé su nombre:**
   - Llama INMEDIATAMENTE \`collect_customer_info\` con el nombre EXACTO que te proporcionó
   - Di: "Perfecto [nombre exacto]! Estoy agendando tu cita para mañana a las 10:00 AM. Recibirás confirmación en breve."
   - Ubicación: Se detectará automáticamente
   - Fecha: Automáticamente mañana
   - Hora: 10:00 - 12:00 (default)
   - Sin más validaciones necesarias
   - Sin ida y vuelta sobre disponibilidad

3. **Reglas estrictas para DEMO:**
   - ✅ SIEMPRE preguntar el nombre explícitamente
   - ✅ SIEMPRE usar el nombre real que el usuario te diga
   - ❌ NUNCA inventar o asumir nombres
   - ❌ NUNCA usar "Demo User", "Test User", "Cliente", etc.
   - ❌ NUNCA saltar el paso de preguntar el nombre
   - Listo en 2 intercambios: (1) Pedir nombre, (2) Confirmar cita

📋 **MODO PRODUCCIÓN (para citas reales):**

1. **Después de \`provide_solution\` con tipo SERVICE:**
   - Informa que se recomienda servicio técnico profesional
   - Explica por qué (ej: "El motor está dañado")
   - Menciona costo estimado si está disponible
   - Pregunta si desea agendar una cita

2. **Si el usuario acepta agendar:**
   - Usa \`collect_customer_info\` para recolectar:
     - Nombre completo
     - Número de teléfono (10 dígitos)
     - Correo electrónico
   - Pregunta de forma natural y conversacional
   - Ejemplo: "Excelente! Para agendar tu cita, necesito algunos datos. ¿Cuál es tu nombre completo?"

3. **Recolectar información paso a paso:**
   - No preguntar todo de una vez - hacerlo conversacional
   - Después de obtener info de contacto, preguntar sobre ubicación
   - Decir: "Puedo auto-detectar tu ubicación para pre-llenar la dirección de servicio. ¿Puedo acceder a tu ubicación?"

4. **Obtener slots de tiempo disponibles:**
   - Usa \`get_available_time_slots\` con el tipo de servicio
   - Presenta opciones al usuario de forma amigable
   - Ejemplo: "Tengo disponibilidad esta semana. ¿Prefieres mañanas (10-12) o tardes (2-4)?"

5. **Confirmar cita:**
   - Una vez el usuario elige fecha/hora, usa \`confirm_appointment\`
   - Incluye toda la información recolectada
   - Da detalles de confirmación
   - Ejemplo: "Perfecto! Tu cita está confirmada para [fecha] a las [hora]. Recibirás un correo de confirmación en [email]."

**Notas importantes:**
- Ser conversacional, no robótico
- No abrumar con muchas preguntas a la vez
- Validar teléfono (10 dígitos) y formato de email (SOLO EN PRODUCCIÓN)
- Si el usuario rechaza agendar, respetar su decisión
- Siempre dar detalles de confirmación de la cita`;
  }

  /**
   * Tool declarations para diagnóstico Haceb
   */
  getToolDeclarations(): ToolDeclaration[] {
    return [
      {
        name: "analyze_appliance",
        description:
          "Analizar el tipo de electrodoméstico Haceb y extraer información del modelo",
        parameters: {
          type: "object",
          properties: {
            appliance_type: {
              type: "string",
              enum: [
                "nevera",
                "lavadora",
                "secadora",
                "estufa",
                "horno",
                "microondas",
                "lavavajillas",
                "calentador",
                "otro",
              ],
              description: "Tipo de electrodoméstico identificado",
            },
            model: {
              type: "string",
              description: 'Modelo del electrodoméstico (ej: "HRMP2600", "LVS10")',
            },
            age_estimate: {
              type: "string",
              enum: ["nuevo", "1-3_años", "4-7_años", "8+_años", "desconocido"],
              description: "Edad estimada del electrodoméstico",
            },
            visual_condition: {
              type: "string",
              enum: ["excelente", "bueno", "regular", "malo", "dañado"],
              description: "Condición visual externa",
            },
            warranty_status: {
              type: "string",
              enum: [
                "probablemente_con_garantia",
                "probablemente_sin_garantia",
                "desconocido",
              ],
              description: "Estado estimado de garantía basado en edad",
            },
          },
          required: ["appliance_type"],
        },
      },
      {
        name: "diagnose_issue",
        description: "Diagnosticar el problema específico reportado por el usuario",
        parameters: {
          type: "object",
          properties: {
            issue_category: {
              type: "string",
              enum: [
                "no_enciende",
                "no_enfria",
                "no_calienta",
                "fuga_agua",
                "fuga_gas",
                "ruido_anormal",
                "vibracion_excesiva",
                "no_desagua",
                "no_centrifuga",
                "puerta_no_cierra",
                "olor_extraño",
                "sobrecalentamiento",
                "chispas_electrico",
                "ciclo_incompleto",
                "otro",
              ],
              description: "Categoría del problema",
            },
            severity: {
              type: "string",
              enum: ["baja", "media", "alta", "critica"],
              description: "Severidad del problema",
            },
            symptoms: {
              type: "array",
              items: { type: "string" },
              description: "Lista de síntomas observados",
            },
            error_code: {
              type: "string",
              description: "Código de error si se muestra en la pantalla",
            },
            duration: {
              type: "string",
              enum: ["recien_sucedio", "dias", "semanas", "meses"],
              description: "Cuánto tiempo lleva el problema",
            },
            safety_risk: {
              type: "boolean",
              description:
                "Si hay riesgo de seguridad (eléctrico, gas, fuego, etc.)",
            },
          },
          required: ["issue_category", "severity", "symptoms"],
        },
      },
      {
        name: "provide_solution",
        description: "Proporcionar la solución recomendada basada en el diagnóstico",
        parameters: {
          type: "object",
          properties: {
            solution_type: {
              type: "string",
              enum: ["DIY", "SERVICE", "INFO", "ESCALATE"],
              description: "Tipo de solución recomendada",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Nivel de confianza en el diagnóstico (0-100)",
            },
            diy_steps: {
              type: "array",
              items: { type: "string" },
              description: "Pasos detallados para solución DIY (si aplica)",
            },
            estimated_time: {
              type: "string",
              description:
                'Tiempo estimado para resolver (ej: "5 minutos", "1 hora")',
            },
            tools_needed: {
              type: "array",
              items: { type: "string" },
              description: "Herramientas necesarias para DIY",
            },
            service_reason: {
              type: "string",
              description:
                "Razón por la que se requiere servicio técnico (si aplica)",
            },
            urgency: {
              type: "string",
              enum: ["bajo", "medio", "alto", "urgente"],
              description: "Urgencia de la reparación",
            },
            estimated_cost: {
              type: "string",
              description: "Rango de costo estimado de reparación (si aplica)",
            },
            warranty_covered: {
              type: "boolean",
              description: "Si el problema probablemente está cubierto por garantía",
            },
            preventive_tips: {
              type: "array",
              items: { type: "string" },
              description: "Tips para prevenir el problema en el futuro",
            },
          },
          required: ["solution_type", "confidence"],
        },
      },
      {
        name: "collect_customer_info",
        description:
          "⚠️ IMPORTANTE: Llamar esta herramienta SOLO DESPUÉS de que el usuario te haya dado su nombre EXPLÍCITAMENTE en la conversación. EN MODO DEMO: Usar únicamente el full_name real que el usuario proporcionó verbalmente. NUNCA inventar, asumir o usar nombres genéricos (Demo User, Test, Cliente, etc.). Los demás campos se auto-llenan en modo demo.",
        parameters: {
          type: "object",
          properties: {
            full_name: {
              type: "string",
              description:
                "Nombre completo del cliente (REQUERIDO en modo demo y producción)",
            },
            phone: {
              type: "string",
              description:
                "Número de teléfono del cliente - opcional en modo demo, se auto-llenará",
            },
            email: {
              type: "string",
              description:
                "Correo electrónico del cliente - opcional en modo demo, se auto-llenará",
            },
            has_location_permission: {
              type: "boolean",
              description:
                "Si el usuario otorgó permiso de ubicación - auto-otorgado en modo demo",
            },
          },
          required: ["full_name"],
        },
      },
      {
        name: "get_available_time_slots",
        description:
          "Obtener slots de tiempo disponibles para cita de servicio. Llamar después de recolectar info del cliente.",
        parameters: {
          type: "object",
          properties: {
            preferred_date: {
              type: "string",
              description: "Fecha preferida en formato ISO (YYYY-MM-DD)",
            },
            service_type: {
              type: "string",
              enum: [
                "reparacion_nevera",
                "reparacion_lavadora",
                "reparacion_calentador",
                "reparacion_estufa",
                "diagnostico",
                "otro",
              ],
              description: "Tipo de servicio necesario",
            },
            urgency: {
              type: "string",
              enum: ["bajo", "medio", "alto", "urgente"],
              description: "Nivel de urgencia del servicio",
            },
          },
          required: ["service_type"],
        },
      },
      {
        name: "confirm_appointment",
        description:
          "Confirmar y agendar la cita con toda la información recolectada",
        parameters: {
          type: "object",
          properties: {
            customer_name: {
              type: "string",
              description: "Nombre completo del cliente",
            },
            phone: {
              type: "string",
              description: "Teléfono del cliente",
            },
            email: {
              type: "string",
              description: "Email del cliente",
            },
            appointment_date: {
              type: "string",
              description: "Fecha confirmada de la cita (YYYY-MM-DD)",
            },
            appointment_time: {
              type: "string",
              description: 'Slot de tiempo confirmado (ej: "10:00 - 12:00")',
            },
            service_type: {
              type: "string",
              description: "Tipo de servicio",
            },
            appliance_info: {
              type: "string",
              description: "Tipo y modelo del electrodoméstico",
            },
            issue_summary: {
              type: "string",
              description: "Resumen breve del problema",
            },
            address: {
              type: "string",
              description:
                "Dirección de servicio (si está disponible de geolocalización o entrada del usuario)",
            },
            estimated_cost: {
              type: "string",
              description: "Costo estimado del servicio",
            },
            special_notes: {
              type: "string",
              description: "Notas especiales o requerimientos",
            },
          },
          required: [
            "customer_name",
            "phone",
            "email",
            "appointment_date",
            "appointment_time",
            "service_type",
            "appliance_info",
            "issue_summary",
          ],
        },
      },
    ];
  }

  /**
   * Procesa el resultado crudo de Gemini
   */
  processResult(rawResult: any): AdapterResult {
    const functionCall = rawResult.args || rawResult;
    const functionName = rawResult.name || "";

    // Determinar tipo de resultado
    let resultType: ResultType = "INFO";
    let confidence = 50;
    let summary = "Diagnóstico en proceso...";
    let details = functionCall;

    // Procesar según el nombre de la función
    switch (functionName) {
      case "collect_customer_info":
        // ⚠️ VALIDACIÓN: Verificar que el nombre no sea genérico o vacío
        const invalidNames = ['demo', 'test', 'usuario', 'user', 'cliente', 'customer', 'prueba'];
        const nameProvided = functionCall.full_name?.trim().toLowerCase();

        if (!nameProvided || nameProvided.length < 2) {
          return {
            type: "INFO",
            summary: "❌ Nombre no proporcionado",
            confidence: 0,
            details: {
              step: "name_required",
              message: "Por favor proporciona tu nombre real para continuar con la cita. No puedo agendar sin tu nombre.",
              error: "NOMBRE_REQUERIDO"
            }
          };
        }

        // Verificar nombres genéricos
        if (invalidNames.some(inv => nameProvided.includes(inv))) {
          return {
            type: "INFO",
            summary: "❌ Nombre genérico detectado",
            confidence: 0,
            details: {
              step: "name_required",
              message: "Necesito tu nombre real para agendar la cita. Por favor dime tu nombre completo.",
              error: "NOMBRE_GENERICO",
              provided_name: functionCall.full_name
            }
          };
        }

        resultType = "INFO";
        confidence = 100;
        summary = `Información del cliente recolectada: ${functionCall.full_name}`;

        // Guardar datos de sesión
        this.sessionData.customerName = functionCall.full_name;

        // 🎯 MODO DEMO: Auto-agendar inmediatamente
        if (this.DEMO_MODE) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const appointmentDate = tomorrow.toISOString().split("T")[0];

          details = {
            ...functionCall,
            step: "auto_schedule_demo",
            auto_scheduled: true,
            appointment_date: appointmentDate,
            appointment_time: "10:00 - 12:00",
            confirmation_number: this.generateConfirmationNumber(),
            processed_at: new Date().toISOString(),
          };

          console.log("🎯 DEMO MODE: Auto-scheduling appointment", details);
        } else {
          // Modo producción: solo recolectar info
          details = {
            ...functionCall,
            step: "customer_info_collected",
            processed_at: new Date().toISOString(),
          };
          console.log("📋 Customer info collected:", details);
        }
        break;

      case "get_available_time_slots":
        resultType = "INFO";
        confidence = 100;
        summary = `Slots disponibles para ${functionCall.service_type || "servicio"}`;
        details = {
          ...functionCall,
          step: "time_slots_requested",
          available_slots: this.generateAvailableSlots(),
          processed_at: new Date().toISOString(),
        };
        console.log("📅 Time slots requested:", details);
        break;

      case "confirm_appointment":
        resultType = "SERVICE";
        confidence = 100;
        summary = `Cita confirmada para ${functionCall.customer_name} el ${functionCall.appointment_date} a las ${functionCall.appointment_time}`;
        details = {
          ...functionCall,
          step: "appointment_confirmed",
          confirmation_number: this.generateConfirmationNumber(),
          processed_at: new Date().toISOString(),
        };
        console.log("✅ Appointment confirmed:", details);
        break;

      case "provide_solution":
        const solutionType = functionCall.solution_type;
        confidence = functionCall.confidence || 50;

        // Guardar información de servicio para agendamiento
        if (solutionType === "SERVICE") {
          this.sessionData.serviceType =
            this.mapIssueToServiceType(functionCall);
          this.sessionData.issueSummary =
            functionCall.service_reason || "Servicio técnico requerido";
        }

        switch (solutionType) {
          case "DIY":
            resultType = "DIY";
            summary = "Puedes resolver esto tú mismo siguiendo las instrucciones";
            break;
          case "SERVICE":
            resultType = "SERVICE";
            summary = "Se requiere servicio técnico profesional";
            break;
          case "ESCALATE":
            resultType = "ESCALATE";
            summary = "Este caso requiere atención especializada";
            break;
          default:
            resultType = "INFO";
            summary = "Información de diagnóstico";
        }

        details = {
          ...functionCall,
          processed_at: new Date().toISOString(),
        };
        break;

      case "analyze_appliance":
        // Guardar información del electrodoméstico
        this.sessionData.deviceInfo =
          `${functionCall.appliance_type || "Electrodoméstico Haceb"} ${functionCall.model || ""}`.trim();
        resultType = "INFO";
        summary = `Electrodoméstico analizado: ${this.sessionData.deviceInfo}`;
        details = {
          ...functionCall,
          processed_at: new Date().toISOString(),
        };
        console.log("🔧 Appliance analyzed:", details);
        break;

      default:
        // Funciones analyze_appliance, diagnose_issue, etc.
        resultType = "INFO";
        summary = `${functionName || "Función"} ejecutada exitosamente`;
        details = {
          ...functionCall,
          processed_at: new Date().toISOString(),
        };
    }

    return {
      type: resultType,
      confidence,
      summary,
      details,
      metadata: {
        adapter: this.name,
        industry: this.industry,
        functionName: functionName,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Genera slots de tiempo disponibles (próximos 14 días)
   */
  private generateAvailableSlots(): any[] {
    const slots = [];
    const timeSlots = [
      "07:00 - 09:00",
      "09:00 - 11:00",
      "11:00 - 13:00",
      "14:00 - 16:00",
      "16:00 - 18:00",
    ];
    const today = new Date();

    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      // Excluir domingos (0 = domingo)
      if (date.getDay() !== 0) {
        const dateStr = date.toISOString().split("T")[0];
        timeSlots.forEach((slot) => {
          slots.push({
            date: dateStr,
            time: slot,
            available: true,
          });
        });
      }
    }

    return slots.slice(0, 20); // Retornar primeros 20 slots
  }

  /**
   * Genera número de confirmación único
   */
  private generateConfirmationNumber(): string {
    const prefix = this.DEMO_MODE ? "DEMO" : "HCB";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Mapea el tipo de problema al tipo de servicio
   */
  private mapIssueToServiceType(functionCall: any): string {
    // Intentar extraer del service_reason o del issue_category
    const reason = (functionCall.service_reason || "").toLowerCase();

    if (reason.includes("nevera") || reason.includes("refrigerador")) {
      return "reparacion_nevera";
    } else if (reason.includes("lavadora")) {
      return "reparacion_lavadora";
    } else if (reason.includes("calentador")) {
      return "reparacion_calentador";
    } else if (reason.includes("estufa") || reason.includes("horno")) {
      return "reparacion_estufa";
    } else {
      return "diagnostico";
    }
  }

  /**
   * Determina la siguiente acción según el resultado
   */
  getNextAction(result: AdapterResult): AgentAction {
    const details = result.details || {};
    const step = details.step || "";

    // Manejar pasos específicos del flujo de agendamiento
    switch (step) {
      case "auto_schedule_demo":
        // 🎯 MODO DEMO: Cita auto-agendada, GUARDAR INMEDIATAMENTE
        return {
          action: "SCHEDULE_SERVICE",
          data: {
            reason: `Cita confirmada`,
            urgency: "medium",
            estimatedCost: "A cotizar",
            serviceType: this.sessionData.serviceType || "Reparación Electrodoméstico Haceb",
            appointmentDate: details.appointment_date,
            appointmentTime: details.appointment_time,
            confirmationNumber: details.confirmation_number,
            customerName: details.full_name,
            phone: "Auto-detected",
            email: "demo@katuq.com",
            deviceInfo: this.sessionData.deviceInfo || "Electrodoméstico Haceb",
            issueSummary: this.sessionData.issueSummary || "Diagnóstico necesario",
            address: this.sessionData.address || "Dirección auto-detectada",
            city: this.sessionData.city || "Ciudad no detectada",  // Ciudad desde geolocalización
            specialNotes: "🎯 DEMO MODE - Auto-agendado desde video agent",
            coordinates: this.sessionData.coordinates,
            isDemoMode: this.DEMO_MODE,
          },
          priority: "high",
        };

      case "customer_info_collected":
        return {
          action: "SHOW_INFO",
          data: {
            message: `Información del cliente recolectada. Listo para verificar disponibilidad.`,
            details: details,
            nextStep: "Solicitar slots de tiempo a Gemini",
          },
          priority: "medium",
        };

      case "time_slots_requested":
        return {
          action: "SHOW_INFO",
          data: {
            message: `Slots de tiempo disponibles obtenidos.`,
            details: details,
            availableSlots: details.available_slots || [],
            nextStep: "Usuario selecciona fecha y hora preferida",
          },
          priority: "medium",
        };

      case "appointment_confirmed":
        // 🎯 En MODO DEMO, ya se guardó en auto_schedule_demo, NO guardar de nuevo
        if (this.DEMO_MODE) {
          return {
            action: "SHOW_INFO",
            data: {
              message: `Cita ya confirmada anteriormente. Número: ${details.confirmation_number}`,
              confirmationNumber: details.confirmation_number,
            },
            priority: "low",
          };
        }

        // 📋 MODO PRODUCCIÓN: Guardar cita confirmada
        return {
          action: "SCHEDULE_SERVICE",
          data: {
            reason: `Cita confirmada`,
            urgency: "medium",
            estimatedCost: details.estimated_cost || "A cotizar",
            serviceType: details.service_type || "Reparación Electrodoméstico Haceb",
            appointmentDate: details.appointment_date,
            appointmentTime: details.appointment_time,
            confirmationNumber: details.confirmation_number,
            customerName: details.customer_name,
            phone: details.phone,
            email: details.email,
            deviceInfo: details.appliance_info,
            issueSummary: details.issue_summary,
            address: details.address || this.sessionData.address, // Priorizar dirección del agente
            specialNotes: details.special_notes,
            coordinates: this.sessionData.coordinates, // Incluir coordenadas capturadas
            isDemoMode: this.DEMO_MODE, // Agregar flag para guardar en localStorage
          },
          priority: "high",
        };
    }

    // Manejar tipos de resultado estándar
    switch (result.type) {
      case "DIY":
        return {
          action: "SHOW_INSTRUCTIONS",
          data: {
            steps: details.diy_steps || [],
            estimatedTime: details.estimated_time || "Desconocido",
            toolsNeeded: details.tools_needed || [],
            preventiveTips: details.preventive_tips || [],
          },
          priority: this.determinePriority(details.urgency),
        };

      case "SERVICE":
        // Si no viene del flujo de appointment_confirmed, usar flujo normal
        if (step !== "appointment_confirmed") {
          return {
            action: "SCHEDULE_SERVICE",
            data: {
              reason:
                details.service_reason ||
                "Requiere reparación técnica profesional Haceb",
              urgency: details.urgency || "medium",
              estimatedCost: details.estimated_cost || "A cotizar",
              serviceType: "Reparación Electrodoméstico Haceb",
              warrantyCovered: details.warranty_covered || false,
              isDemoMode: this.DEMO_MODE, // Flag para localStorage vs API backend
            },
            priority: this.determinePriority(details.urgency),
          };
        }
        break;

      case "ESCALATE":
        return {
          action: "ESCALATE_TO_HUMAN",
          data: {
            reason: "Caso complejo que requiere evaluación humana",
            details: details,
          },
          priority: "high",
        };

      default:
        return {
          action: "SHOW_INFO",
          data: {
            message: result.summary,
            details: details,
          },
          priority: "low",
        };
    }

    // Fallback
    return {
      action: "SHOW_INFO",
      data: {
        message: result.summary,
        details: details,
      },
      priority: "low",
    };
  }

  /**
   * Establece coordenadas de geolocalización, dirección formateada y ciudad
   */
  setCoordinates(latitude: number, longitude: number, address?: string, city?: string): void {
    this.sessionData.coordinates = { latitude, longitude };
    if (address) {
      this.sessionData.address = address;
    }
    if (city) {
      this.sessionData.city = city;
    }
    console.log("📍 Location set in HacebAdapter:", {
      coordinates: this.sessionData.coordinates,
      address: this.sessionData.address,
      city: this.sessionData.city,
    });
  }

  /**
   * Determina prioridad basada en urgencia
   */
  private determinePriority(
    urgency?: string,
  ): "low" | "medium" | "high" | "critical" {
    switch (urgency?.toLowerCase()) {
      case "urgente":
        return "critical";
      case "alto":
        return "high";
      case "medio":
        return "medium";
      case "bajo":
      default:
        return "low";
    }
  }

  /**
   * Configuración adicional del adapter
   */
  getAdapterConfig(): Record<string, any> {
    return {
      supportedLanguages: ["es", "en"],
      defaultLanguage: "es",
      maxSessionDuration: 600000, // 10 minutos
      autoScheduleService: true,
      requiresUserConfirmation: true,
      brandWebsite: "https://www.haceb.com",
      supportPhone: "#466 o WhatsApp 316 453 97 97",
      serviceWebsite: "https://servicio.haceb.com",
    };
  }
}
