import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { map, catchError, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { IntegrationUIHelperService } from './integration-ui-helper.service';

export interface ValidationResult {
  valid: boolean;
  errors?: { [key: string]: any };
  warnings?: string[];
  suggestions?: string[];
  score?: number;
  securityLevel?: 'low' | 'medium' | 'high';
}

export interface FieldValidationConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: ValidatorFn;
  asyncValidator?: AsyncValidatorFn;
  errorMessages?: { [key: string]: string };
  strengthCheck?: boolean;
  environmentSpecific?: boolean;
}

export interface ValidationFeedback {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  field?: string;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationFormValidatorService {
  private readonly apiUrl = `${environment.urlApi}/v1/integration/validate`;
  
  // Patrones de validación comunes
  private readonly patterns = {
    shopifyUrl: /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    phone: /^\+?[\d\s\-\(\)]{10,}$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    // Patrones específicos para cada proveedor
    wompiPublicKey: /^pub_(test_|prod_)[a-zA-Z0-9]+$/,
    wompiPrivateKey: /^prv_(test_|prod_)[a-zA-Z0-9]+$/,
    stripeKey: /^pk_(test_|live_)[a-zA-Z0-9]+$/,
    paypalClientId: /^A[a-zA-Z0-9_-]{80,}$/,
    // Patrones adicionales para seguridad
    strongApiKey: /^[A-Za-z0-9!@#$%^&*()_+-=\[\]{}|;':",./<>?]{32,}$/,
    webhookUrl: /^https:\/\/[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\/.*$/
  };

  // Mensajes de error personalizados
  private readonly errorMessages = {
    required: 'Este campo es obligatorio',
    email: 'Ingrese un email válido',
    url: 'Ingrese una URL válida',
    minlength: 'Debe tener al menos {requiredLength} caracteres',
    maxlength: 'No puede exceder {actualLength} caracteres',
    pattern: 'El formato no es válido',
    shopifyUrl: 'Debe ser una URL de Shopify válida (ej: mitienda.myshopify.com)',
    wompiPublicKey: 'La clave pública debe comenzar con pub_test_ o pub_prod_',
    wompiPrivateKey: 'La clave privada debe comenzar con prv_test_ o prv_prod_',
    paypalClientId: 'El Client ID de PayPal debe comenzar con A y tener al menos 80 caracteres',
    credentialMismatch: 'Las credenciales no coinciden con el ambiente seleccionado',
    connectionFailed: 'No se pudo conectar con el proveedor',
    duplicateName: 'Ya existe una integración con este nombre',
    invalidEnvironment: 'El ambiente seleccionado no es compatible con las credenciales'
  };

  constructor(
    private http: HttpClient,
    private uiHelper: IntegrationUIHelperService
  ) {}

  // Validadores síncronos
  createRequiredValidator(errorMessage?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || control.value.toString().trim().length === 0) {
        return { required: { message: errorMessage || this.errorMessages.required } };
      }
      return null;
    };
  }

  createPatternValidator(pattern: RegExp, errorKey: string, errorMessage?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      if (!pattern.test(control.value)) {
        return { 
          [errorKey]: { 
            message: errorMessage || this.errorMessages[errorKey] || this.errorMessages.pattern,
            actualValue: control.value,
            pattern: pattern.toString()
          } 
        };
      }
      return null;
    };
  }

  createShopifyUrlValidator(): ValidatorFn {
    return this.createPatternValidator(
      this.patterns.shopifyUrl, 
      'shopifyUrl', 
      this.errorMessages.shopifyUrl
    );
  }

  createWompiKeyValidator(keyType: 'public' | 'private', environment?: 'test' | 'production'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const pattern = keyType === 'public' ? this.patterns.wompiPublicKey : this.patterns.wompiPrivateKey;
      const errorKey = keyType === 'public' ? 'wompiPublicKey' : 'wompiPrivateKey';
      
      // Validar patrón básico
      if (!pattern.test(control.value)) {
        return { 
          [errorKey]: { 
            message: this.errorMessages[errorKey],
            actualValue: control.value
          } 
        };
      }

      // Validar ambiente si se especifica
      if (environment) {
        const expectedPrefix = keyType === 'public' ? 'pub_' : 'prv_';
        const environmentPrefix = environment === 'test' ? 'test_' : 'prod_';
        const expectedStart = expectedPrefix + environmentPrefix;
        
        if (!control.value.startsWith(expectedStart)) {
          return {
            credentialMismatch: {
              message: this.errorMessages.credentialMismatch,
              expected: expectedStart,
              actual: control.value.substring(0, expectedStart.length)
            }
          };
        }
      }

      return null;
    };
  }

  createPayPalClientIdValidator(): ValidatorFn {
    return this.createPatternValidator(
      this.patterns.paypalClientId,
      'paypalClientId',
      this.errorMessages.paypalClientId
    );
  }

  createUrlValidator(required: boolean = false): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return required ? { required: { message: this.errorMessages.required } } : null;
      }

      if (!this.patterns.url.test(control.value)) {
        return { 
          url: { 
            message: this.errorMessages.url,
            actualValue: control.value
          } 
        };
      }

      return null;
    };
  }

  // Validadores asíncronos
  createUniqueNameValidator(currentId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return timer(300).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(() => 
          this.http.post<{ exists: boolean }>(`${this.apiUrl}/check-name`, {
            name: control.value,
            excludeId: currentId
          })
        ),
        map(response => {
          return response.exists 
            ? { duplicateName: { message: this.errorMessages.duplicateName } }
            : null;
        }),
        catchError(() => of(null))
      );
    };
  }

  createCredentialValidator(integrationType: string, environment: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      const credentials = this.buildCredentialsObject(control.parent?.value, integrationType);
      
      return timer(500).pipe(
        debounceTime(500),
        switchMap(() => 
          this.http.post<{ valid: boolean; message?: string }>(`${this.apiUrl}/credentials`, {
            type: integrationType,
            environment,
            credentials
          })
        ),
        map(response => {
          return !response.valid 
            ? { 
                connectionFailed: { 
                  message: response.message || this.errorMessages.connectionFailed 
                } 
              }
            : null;
        }),
        catchError(error => of({
          connectionFailed: { 
            message: error.error?.message || this.errorMessages.connectionFailed 
          }
        }))
      );
    };
  }

  // Validación completa de formulario
  validateIntegrationForm(formValue: any, integrationType: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: {},
      warnings: [],
      suggestions: []
    };

    // Validaciones específicas por tipo
    switch (integrationType) {
      case 'shopify':
        this.validateShopifyForm(formValue, result);
        break;
      case 'wompi':
        this.validateWompiForm(formValue, result);
        break;
      case 'epayco':
        this.validateEpaycoForm(formValue, result);
        break;
      case 'paypal':
        this.validatePayPalForm(formValue, result);
        break;
      case 'partners_logistics':
        this.validatePartnersLogisticsForm(formValue, result);
        break;
      case 'enviame':
        this.validateEnviameForm(formValue, result);
        break;
      case 'aliaddo_fulfillment':
        this.validateAliaddoFulfillmentForm(formValue, result);
        break;
      case 'prindel':
        this.validatePrindelForm(formValue, result);
        break;
      default:
        this.validateGenericForm(formValue, result);
    }

    // Validaciones comunes
    this.validateCommonFields(formValue, result);

    result.valid = Object.keys(result.errors || {}).length === 0;
    return result;
  }

  private validateShopifyForm(formValue: any, result: ValidationResult): void {
    // Validar URL de tienda
    if (formValue.shopUrl) {
      if (!this.patterns.shopifyUrl.test(formValue.shopUrl)) {
        result.errors!['shopUrl'] = this.errorMessages.shopifyUrl;
      }
    }

    // Validar API Key y Secret
    if (!formValue.apiKey || formValue.apiKey.length < 32) {
      result.errors!['apiKey'] = 'La API Key debe tener al menos 32 caracteres';
    }

    if (!formValue.apiSecret || formValue.apiSecret.length < 32) {
      result.errors!['apiSecret'] = 'El API Secret debe tener al menos 32 caracteres';
    }

    // Validar Access Token
    if (!formValue.accessToken || !formValue.accessToken.startsWith('shpat_')) {
      result.errors!['accessToken'] = 'El Access Token de Shopify debe comenzar con "shpat_"';
    } else if (formValue.accessToken.length < 32) {
      result.errors!['accessToken'] = 'El Access Token parece ser demasiado corto';
    }

    // Sugerencias
    if (formValue.apiVersion && formValue.apiVersion < '2023-01') {
      result.warnings!.push('Se recomienda usar una versión más reciente de la API');
    }
  }

  private validateWompiForm(formValue: any, result: ValidationResult): void {
    const environment = formValue.environment || 'test';
    
    // Validar claves públicas y privadas
    if (formValue.publicKey) {
      const publicKeyValidator = this.createWompiKeyValidator('public', environment);
      const publicKeyError = publicKeyValidator({ value: formValue.publicKey } as AbstractControl);
      if (publicKeyError) {
        result.errors!['publicKey'] = Object.values(publicKeyError)[0].message;
      }
    }

    if (formValue.privateKey) {
      const privateKeyValidator = this.createWompiKeyValidator('private', environment);
      const privateKeyError = privateKeyValidator({ value: formValue.privateKey } as AbstractControl);
      if (privateKeyError) {
        result.errors!['privateKey'] = Object.values(privateKeyError)[0].message;
      }
    }

    // Validar URL de redirección
    if (formValue.redirectUrl) {
      const urlValidator = this.createUrlValidator();
      const urlError = urlValidator({ value: formValue.redirectUrl } as AbstractControl);
      if (urlError) {
        result.errors!['redirectUrl'] = urlError.url.message;
      }
    }
  }

  private validateEpaycoForm(formValue: any, result: ValidationResult): void {
    // Validaciones específicas para ePayco
    const requiredFields = ['clientId', 'publicKey', 'privateKey'];
    
    requiredFields.forEach(field => {
      if (!formValue[field] || formValue[field].length < 10) {
        result.errors![field] = `El campo ${field} debe tener al menos 10 caracteres`;
      }
    });
  }

  private validatePayPalForm(formValue: any, result: ValidationResult): void {
    // Validar Client ID
    if (formValue.clientId) {
      const clientIdValidator = this.createPayPalClientIdValidator();
      const clientIdError = clientIdValidator({ value: formValue.clientId } as AbstractControl);
      if (clientIdError) {
        result.errors!['clientId'] = clientIdError.paypalClientId.message;
      }
    }

    // Validar Client Secret
    if (!formValue.clientSecret || formValue.clientSecret.length < 80) {
      result.errors!['clientSecret'] = 'El Client Secret debe tener al menos 80 caracteres';
    }
  }

  private validatePartnersLogisticsForm(formValue: any, result: ValidationResult): void {
    // Validar API Key
    if (!formValue.apiKey || formValue.apiKey.length < 10) {
      result.errors!['apiKey'] = 'La API Key debe tener al menos 10 caracteres';
    }

    // Validar URL de API
    if (formValue.apiUrl) {
      const urlValidator = this.createUrlValidator();
      const urlError = urlValidator({ value: formValue.apiUrl } as AbstractControl);
      if (urlError) {
        result.errors!['apiUrl'] = 'La URL de API debe ser una URL válida (https://...)';
      }
    } else {
      result.errors!['apiUrl'] = 'La URL de API es obligatoria';
    }

    // Validar URL de Webhook
    if (formValue.webhookUrl) {
      const webhookValidator = this.createUrlValidator();
      const webhookError = webhookValidator({ value: formValue.webhookUrl } as AbstractControl);
      if (webhookError) {
        result.errors!['webhookUrl'] = 'La URL del webhook debe ser una URL válida (https://...)';
      }
      
      // Verificar que sea HTTPS para seguridad
      if (!formValue.webhookUrl.startsWith('https://')) {
        result.warnings!.push('Se recomienda usar HTTPS para la URL del webhook por seguridad');
      }
    } else {
      result.errors!['webhookUrl'] = 'La URL del webhook es obligatoria';
    }

    // Validar timeout
    if (formValue.timeout && (formValue.timeout < 5 || formValue.timeout > 300)) {
      result.errors!['timeout'] = 'El timeout debe estar entre 5 y 300 segundos';
    }

    // Validar reintentos
    if (formValue.retryAttempts && (formValue.retryAttempts < 0 || formValue.retryAttempts > 10)) {
      result.errors!['retryAttempts'] = 'Los reintentos deben estar entre 0 y 10';
    }

    // Sugerencias de configuración
    if (formValue.environment === 'production' && formValue.timeout && formValue.timeout < 30) {
      result.suggestions!.push('En producción se recomienda un timeout de al menos 30 segundos');
    }

    if (formValue.retryAttempts && formValue.retryAttempts < 3) {
      result.suggestions!.push('Se recomienda configurar al menos 3 reintentos para mejor confiabilidad');
    }
  }

  private validateEnviameForm(formValue: any, result: ValidationResult): void {
    // Validar API Key
    if (!formValue.apiKey || formValue.apiKey.length < 10) {
      result.errors!['apiKey'] = 'La API Key debe tener al menos 10 caracteres';
    }

    // Validar ID Seller
    if (!formValue.id_seller || !/^\d+$/.test(formValue.id_seller)) {
      result.errors!['id_seller'] = 'El ID Seller debe ser un número válido';
    }

    // Validar URL de API
    if (formValue.apiUrl) {
      const urlValidator = this.createUrlValidator();
      const urlError = urlValidator({ value: formValue.apiUrl } as AbstractControl);
      if (urlError) {
        result.errors!['apiUrl'] = 'La URL de API debe ser una URL válida (https://...)';
      }
    } else {
      result.errors!['apiUrl'] = 'La URL de API es obligatoria';
    }

    // Validar código de bodega
    if (!formValue.warehouse_code || formValue.warehouse_code.trim().length === 0) {
      result.errors!['warehouse_code'] = 'El código de bodega es obligatorio';
    }

    // Validar carrier por defecto
    if (!formValue.default_carrier || formValue.default_carrier.trim().length === 0) {
      result.errors!['default_carrier'] = 'El carrier por defecto es obligatorio';
    }

    // Validar servicio por defecto
    if (!formValue.default_service || formValue.default_service.trim().length === 0) {
      result.errors!['default_service'] = 'El servicio por defecto es obligatorio';
    }

    // Validar país
    if (!formValue.country || formValue.country.length !== 2) {
      result.errors!['country'] = 'El código de país debe tener exactamente 2 caracteres';
    }

    // Validar URL de Webhook
    if (formValue.webhookUrl) {
      const webhookValidator = this.createUrlValidator();
      const webhookError = webhookValidator({ value: formValue.webhookUrl } as AbstractControl);
      if (webhookError) {
        result.errors!['webhookUrl'] = 'La URL del webhook debe ser una URL válida (https://...)';
      }

      // Verificar que sea HTTPS para seguridad
      if (!formValue.webhookUrl.startsWith('https://')) {
        result.warnings!.push('Se recomienda usar HTTPS para la URL del webhook por seguridad');
      }
    }

    // Validar secret del webhook
    if (formValue.webhook_secret && formValue.webhook_secret.length < 10) {
      result.warnings!.push('El secret del webhook debe tener al menos 10 caracteres para mayor seguridad');
    }

    // Validar eventos del webhook
    if (formValue.webhook_events && (!Array.isArray(formValue.webhook_events) || formValue.webhook_events.length === 0)) {
      result.warnings!.push('Se recomienda configurar eventos de webhook para recibir notificaciones');
    }

    // Validar timeout
    if (formValue.timeout && (formValue.timeout < 5 || formValue.timeout > 300)) {
      result.errors!['timeout'] = 'El timeout debe estar entre 5 y 300 segundos';
    }

    // Validar reintentos
    if (formValue.retry_attempts && (formValue.retry_attempts < 1 || formValue.retry_attempts > 10)) {
      result.errors!['retry_attempts'] = 'Los reintentos deben estar entre 1 y 10';
    }

    // Validar delay de reintentos
    if (formValue.retry_delay && (formValue.retry_delay < 500 || formValue.retry_delay > 10000)) {
      result.errors!['retry_delay'] = 'El delay de reintentos debe estar entre 500 y 10000 ms';
    }

    // Sugerencias específicas para Enviame
    if (formValue.environment === 'production' && formValue.timeout && formValue.timeout < 30) {
      result.suggestions!.push('En producción se recomienda un timeout de al menos 30 segundos');
    }

    if (formValue.retry_attempts && formValue.retry_attempts < 3) {
      result.suggestions!.push('Se recomienda configurar al menos 3 reintentos para mejor confiabilidad');
    }

    if (!formValue.webhook_secret) {
      result.suggestions!.push('Configura un secret para el webhook para mayor seguridad');
    }

    if (formValue.country === 'CL' && !formValue.carrier_code) {
      result.suggestions!.push('Para Chile, considera configurar un carrier específico como STARKEN o BLUEXPRESS');
    }
  }

  private validateAliaddoFulfillmentForm(formValue: any, result: ValidationResult): void {
    // Validar API token format
    if (formValue.apiToken && formValue.apiToken.length < 20) {
      result.errors!['apiToken'] = 'El token debe tener al menos 20 caracteres';
    }

    // Validar API URL
    if (formValue.apiUrl && !formValue.apiUrl.startsWith('https://')) {
      result.warnings!.push('Se recomienda usar HTTPS para la URL de la API');
    }

    // Validar terceroInternoId (REQUERIDO para crear remisiones de venta)
    if (!formValue.terceroInternoId || formValue.terceroInternoId.trim() === '') {
      result.errors!['terceroInternoId'] = 'El Tercero Interno es requerido. Crea un contacto "Ventas Katuq" en Aliaddo y pega su UUID aquí.';
    } else if (formValue.terceroInternoId.length < 10) {
      result.errors!['terceroInternoId'] = 'El UUID del tercero parece inválido (muy corto)';
    }

    // Validar timeout
    if (formValue.timeout && (formValue.timeout < 5 || formValue.timeout > 300)) {
      result.errors!['timeout'] = 'El timeout debe estar entre 5 y 300 segundos';
    }

    // Validar retry attempts
    if (formValue.retryAttempts && (formValue.retryAttempts < 1 || formValue.retryAttempts > 10)) {
      result.errors!['retryAttempts'] = 'Los intentos de reintento deben estar entre 1 y 10';
    }

    // Success message
    if (Object.keys(result.errors!).length === 0) {
      result.suggestions!.push('Configuración válida. El tercero interno se usará para crear remisiones de venta que descuentan stock.');
    }
  }

  private validatePrindelForm(formValue: any, result: ValidationResult): void {
    // Validar Customer Token
    if (!formValue.customerToken || formValue.customerToken.length < 10) {
      result.errors!['customerToken'] = 'El Customer Token debe tener al menos 10 caracteres';
    }

    // Validar URL de API
    if (formValue.apiUrl) {
      const urlValidator = this.createUrlValidator();
      const urlError = urlValidator({ value: formValue.apiUrl } as AbstractControl);
      if (urlError) {
        result.errors!['apiUrl'] = 'La URL de API debe ser una URL válida (https://...)';
      }

      // Verificar que sea HTTPS para seguridad
      if (!formValue.apiUrl.startsWith('https://')) {
        result.warnings!.push('Se recomienda usar HTTPS para la URL de la API por seguridad');
      }
    } else {
      result.errors!['apiUrl'] = 'La URL de API es obligatoria';
    }

    // Validar ambiente
    if (!formValue.environment || !['production', 'sandbox'].includes(formValue.environment)) {
      result.errors!['environment'] = 'Seleccione un ambiente válido (production o sandbox)';
    }

    // Validar tarifa por defecto
    if (formValue.defaultRate && formValue.defaultRate < 0) {
      result.errors!['defaultRate'] = 'La tarifa por defecto no puede ser negativa';
    }

    // Validar formato de días estimados
    if (formValue.estimatedDays && !/^\d+(-\d+)?$/.test(formValue.estimatedDays)) {
      result.warnings!.push('El formato de días estimados debe ser un número o rango (ej: 1-3)');
    }

    // Sugerencias específicas para Prindel
    if (formValue.environment === 'production' && (!formValue.defaultRate || formValue.defaultRate === 0)) {
      result.suggestions!.push('Recuerde configurar la tarifa acordada comercialmente con Prindel');
    }

    if (!formValue.estimatedDays) {
      result.suggestions!.push('Configure los días estimados de entrega para informar a sus clientes');
    }

    // Success message
    if (Object.keys(result.errors!).length === 0) {
      result.suggestions!.push('Configuración válida. Asegúrate de tener el Customer Token correcto proporcionado por Prindel');
    }
  }

  private validateGenericForm(formValue: any, result: ValidationResult): void {
    // Validaciones genéricas para integraciones no específicas
    if (!formValue.name || formValue.name.trim().length < 3) {
      result.errors!['name'] = 'El nombre debe tener al menos 3 caracteres';
    }
  }

  private validateCommonFields(formValue: any, result: ValidationResult): void {
    // Validar nombre
    if (!formValue.name || formValue.name.trim().length === 0) {
      result.errors!['name'] = this.errorMessages.required;
    }

    // Validar longitud del nombre
    if (formValue.name && formValue.name.length > 100) {
      result.errors!['name'] = 'El nombre no puede exceder 100 caracteres';
    }

    // Validaciones de seguridad
    if (formValue.name && /[<>\"'&]/.test(formValue.name)) {
      result.errors!['name'] = 'El nombre contiene caracteres no permitidos';
    }
  }

  private buildCredentialsObject(formValue: any, integrationType: string): any {
    switch (integrationType) {
      case 'shopify':
        return {
          shopUrl: formValue?.shopUrl,
          apiKey: formValue?.apiKey,
          apiSecret: formValue?.apiSecret
        };
      case 'wompi':
        return {
          publicKey: formValue?.publicKey,
          privateKey: formValue?.privateKey,
          environment: formValue?.environment
        };
      case 'epayco':
        return {
          clientId: formValue?.clientId,
          publicKey: formValue?.publicKey,
          privateKey: formValue?.privateKey,
          environment: formValue?.environment
        };
      case 'paypal':
        return {
          clientId: formValue?.clientId,
          clientSecret: formValue?.clientSecret,
          environment: formValue?.environment
        };
      case 'partners_logistics':
        return {
          apiKey: formValue?.apiKey,
          apiUrl: formValue?.apiUrl,
          webhookUrl: formValue?.webhookUrl,
          environment: formValue?.environment
        };
      case 'enviame':
        return {
          apiKey: formValue?.apiKey,
          id_seller: formValue?.id_seller,
          apiUrl: formValue?.apiUrl,
          webhookUrl: formValue?.webhookUrl,
          environment: formValue?.environment,
          country: formValue?.country,
          carrier_code: formValue?.carrier_code,
          warehouse_code: formValue?.warehouse_code,
          default_carrier: formValue?.default_carrier,
          default_service: formValue?.default_service,
          webhook_secret: formValue?.webhook_secret,
          webhook_events: formValue?.webhook_events
        };
      default:
        return formValue;
    }
  }

  // Métodos utilitarios
  getErrorMessage(field: string, error: any): string {
    if (error.message) {
      return error.message;
    }

    const errorKey = Object.keys(error)[0];
    const errorValue = error[errorKey];

    if (typeof errorValue === 'object' && errorValue.message) {
      return errorValue.message;
    }

    return this.errorMessages[errorKey] || `Error en el campo ${field}`;
  }

  formatValidationErrors(errors: ValidationErrors): string[] {
    const messages: string[] = [];
    
    Object.keys(errors).forEach(field => {
      const error = errors[field];
      messages.push(this.getErrorMessage(field, error));
    });

    return messages;
  }

  // Validación en tiempo real para campos específicos
  validateFieldRealTime(field: string, value: any, integrationType: string, environment?: string): Observable<ValidationErrors | null> {
    return timer(300).pipe(
      debounceTime(300),
      switchMap(() => {
        const validator = this.getFieldValidator(field, integrationType, environment);
        if (validator) {
          const result = validator({ value } as AbstractControl);
          return of(result);
        }
        return of(null);
      })
    );
  }

  private getFieldValidator(field: string, integrationType: string, environment?: string): ValidatorFn | null {
    switch (field) {
      case 'shopUrl':
        return this.createShopifyUrlValidator();
      case 'publicKey':
        if (integrationType === 'wompi') {
          return this.createWompiKeyValidator('public', environment as 'test' | 'production');
        }
        break;
      case 'privateKey':
        if (integrationType === 'wompi') {
          return this.createWompiKeyValidator('private', environment as 'test' | 'production');
        }
        break;
      case 'clientId':
        if (integrationType === 'paypal') {
          return this.createPayPalClientIdValidator();
        }
        break;
      case 'redirectUrl':
      case 'webhookUrl':
        return this.createUrlValidator();
    }
    return null;
  }

  // Método para limpiar y sanitizar datos de entrada
  sanitizeFormData(formData: any): any {
    const sanitized = { ...formData };

    // Limpiar espacios en blanco
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key].trim();
      }
    });

    // Remover campos vacíos opcionales
    const optionalFields = ['eventKey', 'integrityKey', 'merchantId', 'p_key', 'webhookUrl'];
    optionalFields.forEach(field => {
      if (sanitized[field] === '') {
        delete sanitized[field];
      }
    });

    return sanitized;
  }

  // Validación en tiempo real con feedback visual
  validateFieldWithFeedback(field: string, value: any, integrationType: string, environment?: string): Observable<ValidationFeedback | null> {
    return this.validateFieldRealTime(field, value, integrationType, environment).pipe(
      map(errors => {
        if (!errors) {
          return { type: 'success' as const, message: `✓ ${this.getFieldDisplayName(field)} válido` };
        }
        
        const errorKeys = Object.keys(errors);
        const firstError = errors[errorKeys[0]];
        
        return {
          type: 'error' as const,
          message: firstError.message || this.getErrorMessage(field, firstError),
          field,
          code: errorKeys[0]
        };
      })
    );
  }

  // Analizar fortaleza de credenciales
  analyzeCredentialStrength(credentials: any, integrationType: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      warnings: [],
      suggestions: [],
      score: 0,
      securityLevel: 'low'
    };

    let score = 0;
    const maxScore = 100;

    // Verificar longitud de claves
    if (credentials.apiKey && credentials.apiKey.length >= 32) {
      score += 20;
    } else if (credentials.apiKey) {
      result.warnings?.push('La API Key es demasiado corta para ser segura');
    }

    // Verificar diversidad de caracteres
    if (credentials.apiKey && this.patterns.strongApiKey.test(credentials.apiKey)) {
      score += 25;
    } else if (credentials.apiKey) {
      result.suggestions?.push('Usa una API Key con mayor diversidad de caracteres');
    }

    // Verificar configuración de webhooks
    if (credentials.webhookUrl && this.patterns.webhookUrl.test(credentials.webhookUrl)) {
      score += 15;
    } else if (!credentials.webhookUrl) {
      result.suggestions?.push('Configura un webhook para recibir notificaciones en tiempo real');
    }

    // Verificar ambiente apropiado
    if (integrationType === 'wompi' && credentials.publicKey) {
      if (credentials.publicKey.includes('test_') && this.getCurrentEnvironment() === 'production') {
        result.warnings?.push('Estás usando credenciales de prueba en ambiente de producción');
        score -= 30;
      } else if (credentials.publicKey.includes('prod_') && this.getCurrentEnvironment() === 'test') {
        result.warnings?.push('Estás usando credenciales de producción en ambiente de prueba');
      }
    }

    // Configuración específica por proveedor
    score += this.getProviderSpecificScore(credentials, integrationType);

    // Asignar nivel de seguridad
    if (score >= 80) result.securityLevel = 'high';
    else if (score >= 50) result.securityLevel = 'medium';
    else result.securityLevel = 'low';

    result.score = Math.max(0, Math.min(100, score));
    return result;
  }

  private getProviderSpecificScore(credentials: any, integrationType: string): number {
    switch (integrationType) {
      case 'shopify':
        return this.getShopifySecurityScore(credentials);
      case 'wompi':
        return this.getWompiSecurityScore(credentials);
      case 'paypal':
        return this.getPayPalSecurityScore(credentials);
      default:
        return 0;
    }
  }

  private getShopifySecurityScore(credentials: any): number {
    let score = 0;
    if (credentials.apiVersion && credentials.apiVersion >= '2023-01') score += 10;
    if (credentials.shopUrl && credentials.shopUrl.includes('.myshopify.com')) score += 15;
    return score;
  }

  private getWompiSecurityScore(credentials: any): number {
    let score = 0;
    if (credentials.integrityKey) score += 20; // Clave de integridad es importante
    if (credentials.eventKey) score += 10; // Para webhooks
    return score;
  }

  private getPayPalSecurityScore(credentials: any): number {
    let score = 0;
    if (credentials.clientSecret && credentials.clientSecret.length >= 80) score += 15;
    return score;
  }

  private getFieldDisplayName(field: string): string {
    const fieldNames: { [key: string]: string } = {
      name: 'Nombre',
      apiKey: 'API Key',
      apiSecret: 'API Secret',
      shopUrl: 'URL de la tienda',
      webhookUrl: 'URL del webhook',
      publicKey: 'Clave pública',
      privateKey: 'Clave privada',
      clientId: 'Client ID',
      clientSecret: 'Client Secret'
    };
    return fieldNames[field] || field;
  }

  private getCurrentEnvironment(): string {
    return environment.production ? 'production' : 'test';
  }
}