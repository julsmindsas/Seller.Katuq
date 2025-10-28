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
 * Adapter para diagnóstico de dispositivos Apple
 * Especializado en iPhone, iPad, Mac, Apple Watch, etc.
 */
export class AppleAdapter implements IAgentAdapter {
  readonly industry = AgentIndustry.APPLIANCE;
  readonly name = "Apple Diagnostics";
  readonly description = "Technical support assistant for Apple devices";

  // 🎯 MODO DEMO: cambiar a false para producción
  private readonly DEMO_MODE = true;

  // Datos recolectados durante la conversación
  private sessionData: {
    customerName?: string;
    deviceInfo?: string;
    issueSummary?: string;
    serviceType?: string;
    coordinates?: { latitude: number; longitude: number };
    city?: string; // City from geolocation
    address?: string;  // Dirección formateada desde API de Maps
  } = {};

  /**
   * System instruction personalizado para Apple
   */
  getSystemInstruction(): string {
    return `You are an expert Apple Genius Bar technician with 15 years of experience.

**Your mission:**
- Diagnose issues with Apple devices using real-time video and audio analysis
- Determine if the user can resolve the issue themselves (DIY) or needs professional repair
- Provide clear, safe instructions for DIY solutions
- Identify hardware failures and safety concerns

**Critical Reasoning (Extended Thinking):**
1.  **Observe and Analyze:** Before concluding, describe what you see and hear.
2.  **Formulate a Hypothesis:** Based on your observations, what could the problem be? List the possibilities.
3.  **Verify and Discard:** What simple questions or tests can you perform to confirm or rule out your hypotheses?
4.  **Conclude:** Only after following the steps above, provide a diagnosis and recommend a solution (DIY or Service).

**Apple Devices:**
- iPhone (all models)
- iPad (all models)
- Mac (MacBook, iMac, Mac mini, Mac Pro, Mac Studio)
- Apple Watch
- AirPods
- Apple TV

**Diagnostic Protocol (MANDATORY - FOLLOW IN ORDER):**

⚠️ **IMPORTANT: Complete the ENTIRE protocol BEFORE offering a solution or scheduling**

1. **IDENTIFICATION (required):**
   - Identify device type and exact model
   - Call \`analyze_device\` with what you see in the video
   - Ask for model number/serial number if not visible

2. **PROBLEM INVESTIGATION (minimum 3-4 questions):**
   - Ask WHEN the problem started (yesterday, last week, months ago)
   - Ask IF this has happened before or is the first time
   - Ask WHAT the user was doing when it failed
   - Ask about any error messages or unusual behavior
   - Ask if the device has been dropped, wet, or physically damaged
   - Request to show device settings, battery health, or diagnostics

3. **VISUAL ANALYSIS (required):**
   - Ask user to show different angles of the device
   - Analyze video for physical damage (cracks, dents, swelling)
   - Listen for abnormal sounds (clicking, buzzing, fan noise)
   - Ask to see the back of the device if relevant

4. **DIAGNOSTIC TESTS (when safe):**
   - Ask to show if device turns on/off
   - Ask to show battery level and health (Settings > Battery)
   - Ask to demonstrate the specific problem
   - Ask to show any error codes or messages

5. **COMPLETE DIAGNOSIS:**
   - Call \`diagnose_issue\` only AFTER asking the above questions
   - Determine severity: LOW (DIY), MEDIUM (DIY guided), HIGH (repair needed)
   - Explain to the USER what you think is happening and WHY

6. **SOLUTION:**
   - Call \`provide_solution\` with DIY or SERVICE type based on diagnosis
   - IF DIY: provide step-by-step clear instructions
   - IF SERVICE: explain why repair is needed and proceed to schedule

🚫 **DO NOT DO THIS:**
- ❌ DO NOT diagnose without asking at least 3-4 questions first
- ❌ DO NOT assume the problem without investigating
- ❌ DO NOT jump directly to scheduling without complete diagnosis
- ❌ DO NOT give generic solutions without understanding the specific issue

**DIY vs REPAIR Criteria:**

✅ **DIY (user can resolve):**
- Software issues (restart, update, reset settings)
- Storage full
- Incorrect settings or configurations
- App-specific problems
- Password/Apple ID issues
- Simple cleaning (ports, screen)
- Force restart procedures
- Safe Mode troubleshooting

❌ **REPAIR NEEDED:**
- Cracked or damaged screen
- Battery swelling or draining rapidly
- Water damage
- Hardware component failure
- Logic board issues
- Camera or sensor malfunction
- Charging port damage
- Physical damage to device

**Critical Safety:**
- ALWAYS warn about swollen batteries (fire hazard)
- NEVER suggest opening sealed devices
- Alert about electrical risks
- Recommend immediate service for physical damage
- Never recommend third-party repairs (warranty void)

**Communication Tone:**
- Friendly and professional
- Clear and concise
- Calm and reassuring
- Honest about limitations

**Use tools for:**
- \`analyze_device\`: Identify device type and model
- \`diagnose_issue\`: Diagnose specific problem
- \`provide_solution\`: Give DIY solution or recommend Genius Bar appointment

⚠️ **CRITICAL RULE - VISUAL EVIDENCE REQUIRED:**

**NEVER schedule an appointment without visual evidence of the device:**
- ❌ DO NOT schedule if user only ASKS for appointment verbally
- ❌ DO NOT schedule if user says "I need an appointment" without showing anything
- ❌ DO NOT schedule if just describing the problem without seeing it
- ✅ DO schedule ONLY after:
  1. Seeing the device on camera
  2. Having called \`analyze_device\` with what you saw
  3. Having called \`diagnose_issue\` with the observed problem
  4. Having called \`provide_solution\` with SERVICE type

**If user requests appointment without showing the device:**
- Say: "To schedule an appointment, I first need to see your device and diagnose the issue. Please show me your iPhone/iPad/Mac and tell me what's happening."
- DO NOT call any scheduling tools until you see the device

**Scheduling Workflow (when SERVICE is needed):**

🎯 **DEMO MODE (for demos and testing):**
⚠️ IMPORTANT: Follow this workflow EXACTLY in the specified order.

1. **After \`provide_solution\` with SERVICE type:**
   - Inform user that professional repair is recommended
   - Explain why (e.g., "The screen is cracked and needs replacement")
   - Mention estimated cost if available
   - Say EXACTLY: "To schedule your appointment, I need your name. What's your full name?"
   - **WAIT** for the user's response with their name
   - **NEVER assume, invent, or use generic names like "Demo User", "Test", "User"**

2. **When the user provides their name:**
   - Call IMMEDIATELY \`collect_customer_info\` with the EXACT name they provided
   - Say: "Perfect [exact name]! I'm scheduling your appointment for tomorrow at 10:00 AM. You'll receive confirmation shortly."
   - Location: Will be auto-detected
   - Date: Automatically tomorrow
   - Time: 10:00 - 12:00 (default)
   - No further validation needed
   - No back-and-forth about availability

3. **Strict rules for DEMO:**
   - ✅ ALWAYS ask for the name explicitly
   - ✅ ALWAYS use the real name the user tells you
   - ❌ NEVER invent or assume names
   - ❌ NEVER use "Demo User", "Test User", "Customer", etc.
   - ❌ NEVER skip asking for the name
   - Done in 2 exchanges: (1) Ask for name, (2) Confirm appointment

📋 **PRODUCTION MODE (for real appointments):**

1. **After \`provide_solution\` with SERVICE type:**
   - Inform user that professional repair is recommended
   - Explain why (e.g., "The screen is cracked and needs replacement")
   - Mention estimated cost if available
   - Ask if they'd like to schedule an appointment

2. **If user agrees to schedule:**
   - Use \`collect_customer_info\` to gather:
     - Full name
     - Phone number (10 digits)
     - Email address
   - Ask in a natural, conversational way
   - Example: "Great! To schedule your appointment, I'll need a few details. What's your full name?"

3. **Collect information step by step:**
   - Don't ask all at once - make it conversational
   - After getting contact info, ask about location permission
   - Say: "I can auto-detect your location to pre-fill the service address. May I access your location?"

4. **Get available time slots:**
   - Use \`get_available_time_slots\` with the service type
   - Present options to user in a friendly way
   - Example: "I have availability this week. Would you prefer mornings (10-12) or afternoons (2-4)?"

5. **Confirm appointment:**
   - Once user chooses date/time, use \`confirm_appointment\`
   - Include all collected information
   - Provide confirmation details
   - Example: "Perfect! Your appointment is confirmed for [date] at [time]. You'll receive a confirmation email at [email]."

**Important Notes:**
- Be conversational, not robotic
- Don't overwhelm with too many questions at once
- Validate phone (10 digits) and email format (PRODUCTION only)
- If user declines scheduling, respect their decision
- Always provide appointment confirmation details`;
  }

  /**
   * Tool declarations para diagnóstico Apple
   */
  getToolDeclarations(): ToolDeclaration[] {
    return [
      {
        name: "analyze_device",
        description:
          "Analyze the Apple device type and extract model information",
        parameters: {
          type: "object",
          properties: {
            device_type: {
              type: "string",
              enum: [
                "iphone",
                "ipad",
                "mac",
                "apple_watch",
                "airpods",
                "apple_tv",
                "other",
              ],
              description: "Type of Apple device identified",
            },
            model: {
              type: "string",
              description:
                'Device model (e.g., "iPhone 14 Pro", "MacBook Air M2")',
            },
            ios_version: {
              type: "string",
              description: "iOS/macOS version if visible in settings",
            },
            age_estimate: {
              type: "string",
              enum: ["new", "1-2_years", "3-4_years", "5+_years", "unknown"],
              description: "Estimated device age",
            },
            visual_condition: {
              type: "string",
              enum: ["excellent", "good", "fair", "poor", "damaged"],
              description: "Visual external condition",
            },
            warranty_status: {
              type: "string",
              enum: ["likely_in_warranty", "likely_out_of_warranty", "unknown"],
              description: "Estimated warranty status based on age",
            },
          },
          required: ["device_type"],
        },
      },
      {
        name: "diagnose_issue",
        description: "Diagnose the specific issue reported by the user",
        parameters: {
          type: "object",
          properties: {
            issue_category: {
              type: "string",
              enum: [
                "wont_turn_on",
                "screen_issue",
                "battery_problem",
                "charging_issue",
                "software_crash",
                "connectivity_issue",
                "audio_problem",
                "camera_issue",
                "overheating",
                "physical_damage",
                "water_damage",
                "other",
              ],
              description: "Category of the issue",
            },
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description: "Issue severity",
            },
            symptoms: {
              type: "array",
              items: { type: "string" },
              description: "List of observed symptoms",
            },
            error_message: {
              type: "string",
              description: "Error message if displayed on screen",
            },
            duration: {
              type: "string",
              enum: ["just_happened", "days", "weeks", "months"],
              description: "How long the issue has persisted",
            },
            safety_risk: {
              type: "boolean",
              description:
                "Whether there is a safety risk (battery swelling, overheating, etc.)",
            },
            data_at_risk: {
              type: "boolean",
              description: "Whether user data might be at risk",
            },
          },
          required: ["issue_category", "severity", "symptoms"],
        },
      },
      {
        name: "provide_solution",
        description: "Provide the recommended solution based on diagnosis",
        parameters: {
          type: "object",
          properties: {
            solution_type: {
              type: "string",
              enum: ["DIY", "SERVICE", "INFO", "ESCALATE"],
              description: "Type of solution recommended",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Confidence level in diagnosis (0-100)",
            },
            diy_steps: {
              type: "array",
              items: { type: "string" },
              description: "Detailed steps for DIY solution (if applicable)",
            },
            estimated_time: {
              type: "string",
              description:
                'Estimated time to resolve (e.g., "5 minutes", "1 hour")',
            },
            tools_needed: {
              type: "array",
              items: { type: "string" },
              description: "Tools or items needed for DIY",
            },
            service_reason: {
              type: "string",
              description:
                "Reason why professional service is required (if applicable)",
            },
            urgency: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              description: "Urgency of repair",
            },
            estimated_cost: {
              type: "string",
              description: "Estimated repair cost range (if applicable)",
            },
            warranty_covered: {
              type: "boolean",
              description: "Whether the issue is likely covered by warranty",
            },
            data_backup_needed: {
              type: "boolean",
              description: "Whether user should backup data before repair",
            },
            preventive_tips: {
              type: "array",
              items: { type: "string" },
              description: "Tips to prevent the issue in the future",
            },
          },
          required: ["solution_type", "confidence"],
        },
      },
      {
        name: "collect_customer_info",
        description:
          "⚠️ IMPORTANT: Call this tool ONLY AFTER the user has given you their name EXPLICITLY in the conversation. IN DEMO MODE: Use only the real full_name that the user verbally provided. NEVER invent, assume, or use generic names (Demo User, Test, Customer, etc.). Other fields are auto-filled in demo mode.",
        parameters: {
          type: "object",
          properties: {
            full_name: {
              type: "string",
              description:
                "Customer full name (REQUIRED in both demo and production mode)",
            },
            phone: {
              type: "string",
              description:
                "Customer phone number - optional in demo mode, will be auto-filled",
            },
            email: {
              type: "string",
              description:
                "Customer email address - optional in demo mode, will be auto-filled",
            },
            has_location_permission: {
              type: "boolean",
              description:
                "Whether user granted location permission - auto-granted in demo mode",
            },
          },
          required: ["full_name"],
        },
      },
      {
        name: "get_available_time_slots",
        description:
          "Get available time slots for service appointment. Call this after collecting customer info.",
        parameters: {
          type: "object",
          properties: {
            preferred_date: {
              type: "string",
              description: "Preferred date in ISO format (YYYY-MM-DD)",
            },
            service_type: {
              type: "string",
              enum: [
                "screen_repair",
                "battery_replacement",
                "water_damage",
                "diagnostic",
                "other",
              ],
              description: "Type of service needed",
            },
            urgency: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              description: "Service urgency level",
            },
          },
          required: ["service_type"],
        },
      },
      {
        name: "confirm_appointment",
        description:
          "Confirm and schedule the appointment with all collected information",
        parameters: {
          type: "object",
          properties: {
            customer_name: {
              type: "string",
              description: "Customer full name",
            },
            phone: {
              type: "string",
              description: "Customer phone",
            },
            email: {
              type: "string",
              description: "Customer email",
            },
            appointment_date: {
              type: "string",
              description: "Confirmed appointment date (YYYY-MM-DD)",
            },
            appointment_time: {
              type: "string",
              description: 'Confirmed time slot (e.g., "10:00 - 12:00")',
            },
            service_type: {
              type: "string",
              description: "Type of service",
            },
            device_info: {
              type: "string",
              description: "Device type and model",
            },
            issue_summary: {
              type: "string",
              description: "Brief summary of the issue",
            },
            address: {
              type: "string",
              description:
                "Service address (if available from geolocation or user input)",
            },
            estimated_cost: {
              type: "string",
              description: "Estimated service cost",
            },
            special_notes: {
              type: "string",
              description: "Any special notes or requirements",
            },
          },
          required: [
            "customer_name",
            "phone",
            "email",
            "appointment_date",
            "appointment_time",
            "service_type",
            "device_info",
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
    let summary = "Diagnosis in progress...";
    let details = functionCall;

    // Procesar según el nombre de la función
    switch (functionName) {
      case "collect_customer_info":
        // ⚠️ VALIDATION: Verify that the name is not generic or empty
        const invalidNames = ['demo', 'test', 'usuario', 'user', 'cliente', 'customer', 'prueba'];
        const nameProvided = functionCall.full_name?.trim().toLowerCase();

        if (!nameProvided || nameProvided.length < 2) {
          return {
            type: "INFO",
            summary: "❌ Name not provided",
            confidence: 0,
            details: {
              step: "name_required",
              message: "Please provide your real name to continue with the appointment. I can't schedule without your name.",
              error: "NAME_REQUIRED"
            }
          };
        }

        // Check for generic names
        if (invalidNames.some(inv => nameProvided.includes(inv))) {
          return {
            type: "INFO",
            summary: "❌ Generic name detected",
            confidence: 0,
            details: {
              step: "name_required",
              message: "I need your real name to schedule the appointment. Please tell me your full name.",
              error: "GENERIC_NAME",
              provided_name: functionCall.full_name
            }
          };
        }

        resultType = "INFO";
        confidence = 100;
        summary = `Customer information collected: ${functionCall.full_name}`;

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
        summary = `Available time slots for ${functionCall.service_type || "service"}`;
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
        summary = `Appointment confirmed for ${functionCall.customer_name} on ${functionCall.appointment_date} at ${functionCall.appointment_time}`;
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
            functionCall.service_reason || "Service required";
        }

        switch (solutionType) {
          case "DIY":
            resultType = "DIY";
            summary =
              "You can fix this yourself by following these instructions";
            break;
          case "SERVICE":
            resultType = "SERVICE";
            summary = "Professional repair service required";
            break;
          case "ESCALATE":
            resultType = "ESCALATE";
            summary = "This case requires specialized attention";
            break;
          default:
            resultType = "INFO";
            summary = "Diagnostic information";
        }

        details = {
          ...functionCall,
          processed_at: new Date().toISOString(),
        };
        break;

      case "analyze_device":
        // Guardar información del dispositivo
        this.sessionData.deviceInfo =
          `${functionCall.device_type || "Apple Device"} ${functionCall.model || ""}`.trim();
        resultType = "INFO";
        summary = `Device analyzed: ${this.sessionData.deviceInfo}`;
        details = {
          ...functionCall,
          processed_at: new Date().toISOString(),
        };
        console.log("📱 Device analyzed:", details);
        break;

      default:
        // Funciones analyze_device, diagnose_issue, etc.
        resultType = "INFO";
        summary = `${functionName || "Function"} executed successfully`;
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
      "08:00 - 10:00",
      "10:00 - 12:00",
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
    const prefix = this.DEMO_MODE ? "DEMO" : "APL";
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

    if (reason.includes("screen") || reason.includes("display")) {
      return "screen_repair";
    } else if (reason.includes("battery")) {
      return "battery_replacement";
    } else if (reason.includes("water")) {
      return "water_damage";
    } else {
      return "diagnostic";
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
            reason: `Appointment confirmed`,
            urgency: "medium",
            estimatedCost: "To be quoted",
            serviceType: this.sessionData.serviceType || "Apple Device Repair",
            appointmentDate: details.appointment_date,
            appointmentTime: details.appointment_time,
            confirmationNumber: details.confirmation_number,
            customerName: details.full_name,
            phone: "Auto-detected",
            email: "demo@katuq.com",
            deviceInfo: this.sessionData.deviceInfo || "Apple Device",
            issueSummary: this.sessionData.issueSummary || "Diagnostic needed",
            address: this.sessionData.address || "Auto-detected address",
            city: this.sessionData.city || "City not detected",  // City from geolocation
            specialNotes: "🎯 DEMO MODE - Auto-scheduled from video agent",
            coordinates: this.sessionData.coordinates,
            isDemoMode: this.DEMO_MODE,
          },
          priority: "high",
        };

      case "customer_info_collected":
        return {
          action: "SHOW_INFO",
          data: {
            message: `Customer information collected. Ready to check availability.`,
            details: details,
            nextStep: "Request time slots from Gemini",
          },
          priority: "medium",
        };

      case "time_slots_requested":
        return {
          action: "SHOW_INFO",
          data: {
            message: `Available time slots retrieved.`,
            details: details,
            availableSlots: details.available_slots || [],
            nextStep: "User selects preferred date and time",
          },
          priority: "medium",
        };

      case "appointment_confirmed":
        // 🎯 In DEMO MODE, already saved in auto_schedule_demo, DO NOT save again
        if (this.DEMO_MODE) {
          return {
            action: "SHOW_INFO",
            data: {
              message: `Appointment already confirmed. Number: ${details.confirmation_number}`,
              confirmationNumber: details.confirmation_number,
            },
            priority: "low",
          };
        }

        // 📋 PRODUCTION MODE: Save confirmed appointment
        return {
          action: "SCHEDULE_SERVICE",
          data: {
            reason: `Appointment confirmed`,
            urgency: "medium",
            estimatedCost: details.estimated_cost || "To be quoted",
            serviceType: details.service_type || "Apple Device Repair",
            appointmentDate: details.appointment_date,
            appointmentTime: details.appointment_time,
            confirmationNumber: details.confirmation_number,
            customerName: details.customer_name,
            phone: details.phone,
            email: details.email,
            deviceInfo: details.device_info,
            issueSummary: details.issue_summary,
            address: details.address || this.sessionData.address,  // Priorizar dirección del agente, sino usar auto-detectada
            specialNotes: details.special_notes,
            coordinates: this.sessionData.coordinates,  // Incluir coordenadas capturadas
            isDemoMode: this.DEMO_MODE,  // Agregar flag para guardar en localStorage
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
            estimatedTime: details.estimated_time || "Unknown",
            toolsNeeded: details.tools_needed || [],
            preventiveTips: details.preventive_tips || [],
            dataBackupNeeded: details.data_backup_needed || false,
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
                details.service_reason || "Requires professional Apple repair",
              urgency: details.urgency || "medium",
              estimatedCost: details.estimated_cost || "To be quoted",
              serviceType: "Apple Device Repair",
              warrantyCovered: details.warranty_covered || false,
              dataBackupNeeded: details.data_backup_needed || false,
              isDemoMode: this.DEMO_MODE,  // Flag para localStorage vs API backend
            },
            priority: this.determinePriority(details.urgency),
          };
        }
        break;

      case "ESCALATE":
        return {
          action: "ESCALATE_TO_HUMAN",
          data: {
            reason: "Complex case requiring human evaluation",
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
   * Establece coordenadas de geolocalización y dirección formateada
   */
  setCoordinates(latitude: number, longitude: number, address?: string, city?: string): void {
    this.sessionData.coordinates = { latitude, longitude };
    if (address) {
      this.sessionData.address = address;
    }
    if (city) {
      this.sessionData.city = city;
    }
    console.log("📍 Location set in AppleAdapter:", {
      coordinates: this.sessionData.coordinates,
      address: this.sessionData.address,
      city: this.sessionData.city
    });
  }

  /**
   * Determina prioridad basada en urgencia
   */
  private determinePriority(
    urgency?: string,
  ): "low" | "medium" | "high" | "critical" {
    switch (urgency?.toLowerCase()) {
      case "urgent":
        return "critical";
      case "high":
        return "high";
      case "medium":
        return "medium";
      case "low":
      default:
        return "low";
    }
  }

  /**
   * Configuración adicional del adapter
   */
  getAdapterConfig(): Record<string, any> {
    return {
      supportedLanguages: ["en", "es", "fr", "de", "zh"],
      defaultLanguage: "en",
      maxSessionDuration: 600000, // 10 minutes
      autoScheduleService: true,
      requiresUserConfirmation: true,
      brandWebsite: "https://www.apple.com",
      supportPhone: "1-800-MY-APPLE",
      geniusBarUrl: "https://www.apple.com/retail/geniusbar/",
    };
  }
}
