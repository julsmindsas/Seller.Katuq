import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { map, catchError, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ValidationResult {
  valid: boolean;
  errors?: { [key: string]: any };
  warnings?: string[];
  suggestions?: string[];
}

export interface FieldValidationConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: ValidatorFn;
  asyncValidator?: AsyncValidatorFn;
  errorMessages?: { [key: string]: string };
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
    paypalClientId: /^A[a-zA-Z0-9_-]{80,}$/
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

  constructor(private http: HttpClient) {}

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
}