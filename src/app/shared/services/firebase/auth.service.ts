import { Injectable, OnInit, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { ServiciosService } from "../servicios.service";
import { TranslateService } from "@ngx-translate/core";
import Swal from "sweetalert2";
import { NavService } from "../nav.service";
import { InitializationService } from "../initialization.service";
import { OnboardingService } from "../../../components/onboarding/services/onboarding.service";
import { BehaviorSubject } from 'rxjs';
import { syncSentryUserContext } from "../errores/sentry-context";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
}

@Injectable({
  providedIn: "root",
})
export class AuthService implements OnInit {
  private _showLoader = new BehaviorSubject<boolean>(false);
  public showLoader$ = this._showLoader.asObservable();

  public userData: any;

  constructor(
    private services: ServiciosService,
    public router: Router,
    public ngZone: NgZone,
    public toster: ToastrService,
    private translate: TranslateService,
    private navServices: NavService,
    private initializationService: InitializationService,
    private onboardingService: OnboardingService
  ) { }

  ngOnInit(): void { }

  // Getter y setter para showLoader
  get showLoader(): boolean {
    return this._showLoader.value;
  }

  set showLoader(value: boolean) {
    this._showLoader.next(value);
  }

  SignIn(email: string, password: string, token: string): void {
    this.showLoader = true; // Activar indicador de carga
    
    const datos = {
      email: email.toLowerCase(),
      password: password,
      token: token,
    };

    this.services.signInWithEmailAndPassword(datos).subscribe({
      next: (result: any) => this.handleSignInSuccess(result),
      error: (err) => {
        this.handleSignInError(err);
        this.showLoader = false; // Desactivar indicador de carga en caso de error
      }
    });
  }

  private async handleSignInSuccess(result: any): Promise<void> {
    if (result.error) {
      this.showLoader = false; // Desactivar indicador de carga
      this.showErrorAlert("¡ Datos incorrectos !");
      return;
    }

    if (result.token) {
      this.SetUserData(result.token);
      this.setMenu(result.menu);

      if (result.lang) {
        this.setLanguage(result.lang);
      }

      localStorage.setItem("user", JSON.stringify(result));
      localStorage.setItem("loginTime", new Date().toISOString());
      syncSentryUserContext();

      // Inicializar datos maestros en segundo plano después del login exitoso
      this.initializeBackgroundServices();

      if (result.mustChangePassword) {
        this.router.navigate(["/change-password"]);
        this.services.getEmpresaByName({ company: result.company });
        return;
      }

      // Verificar roles y redirigir según corresponda
      const isSuperAdmin = result.rol === 'Super Administrador';
      const isJulsmindAdmin = result.rol === 'Administrador' && result.company === 'Julsmind';

      if (isSuperAdmin) {
        // Redirigir a la página principal de superadmin
        this.router.navigate(["/superadmin/clientes"]);
        this.services.getEmpresaByName({ company: result.company });
      } else if (isJulsmindAdmin) {
        // Redirigir a la página de administración de Julsmind
        this.router.navigate(["/dashboards"]);
        this.services.getEmpresaByName({ company: result.company });
      } else {
        // Para usuarios regulares, diferenciar entre Administrador y otros roles
        const isAdmin = result.rol === 'Administrador';

        if (isAdmin) {
          // ADMINISTRADORES: Verificar estado de onboarding
          try {
            // ✅ FIX: Cargar empresa PRIMERO para evitar race condition
            await this.loadCompanyData(result.company, result.email);

            const onboardingCompleted = await this.onboardingService.checkOnboardingStatus(result.email);

            if (!onboardingCompleted) {
              // Usuario nuevo: ir a welcome directamente (onboarding accesible desde menú)
              localStorage.setItem('showOnboardingBanner', 'true');
            }

            // Usuario con onboarding completado
            console.log('✅ Administrador con onboarding completado, redirigiendo a /welcome');
            this.router.navigate(["/welcome"]);
          } catch (error) {
            console.error('❌ Error verificando estado de onboarding:', error);
            // En caso de error, cargar empresa de forma async y permitir acceso a welcome
            this.services.getEmpresaByName({ company: result.company });
            this.router.navigate(["/welcome"]);
          }
        } else {
          // OTROS ROLES (Vendedor, Cajero, Operador, etc.): respetar bienvenida
          // personalizada si el admin la configuró desde /usuarios. Default: /welcome.
          this.services.getEmpresaByName({ company: result.company });

          const destino = (result.bienvenidaPath && typeof result.bienvenidaPath === 'string')
            ? result.bienvenidaPath
            : '/welcome';
          console.log(`👤 Usuario con rol "${result.rol}" - redirigiendo a ${destino}`);
          this.router.navigate([destino]);
        }
      }
    } else {
      this.showLoader = false; // Desactivar indicador de carga
      this.showErrorAlert("¡ Datos incorrectos !");
      this.ngZone.run(() => this.router.navigate(["/login"]));
    }
  }

  /**
   * Inicializa servicios en segundo plano después del login
   */
  private initializeBackgroundServices(): void {
    this.initializationService.initializeAppServices().subscribe({
      next: (success) => {
        if (success) {
          console.log('🎉 Servicios inicializados correctamente en segundo plano');
        } else {
          console.warn('⚠️ Algunos servicios no se pudieron inicializar');
        }
      },
      error: (error) => {
        console.error('❌ Error inicializando servicios en segundo plano:', error);
      }
    });
  }

  setMenu(menu: any) {
    localStorage.setItem("authorizedMenuItems", JSON.stringify(menu));
    this.navServices.filterMenuItemsByAuthorization();
  }

  private handleSignInError(err: any): void {
    console.error("Error: ", err);
    this.toster.error("Correo o contraseña incorrecta.");
  }

  private showErrorAlert(message: string): void {
    Swal.fire({
      icon: "error",
      title: message,
      showConfirmButton: false,
      timer: 1500,
    });
  }

  private setLanguage(lang: any): void {
    this.translate.setDefaultLang(lang.code);
    this.translate.use(lang.code);
  }

  ForgotPassword(passwordResetEmail: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const resetData = {
        email: passwordResetEmail.toLowerCase()
      };

      this.services.forgotPassword(resetData).subscribe({
        next: (result: any) => {
          if (result.success) {
            resolve(result);
          } else {
            reject(result.message || 'Error al enviar email de recuperación');
          }
        },
        error: (error) => {
          console.error('Error in forgot password:', error);
          reject('Error al enviar email de recuperación');
        }
      });
    });
  }

  AuthLogin(provider: any): void {
    // Implementar lógica para autenticación con proveedor externo
  }

  SetUserData(user: any): void {
    // Implementar lógica para establecer datos del usuario
  }

  SignOut(): void {
    this.showLoader = false;

    // Resetear servicios de inicialización
    this.initializationService.resetInitialization();

    // Limpiar datos de localStorage (currentCompany migrado de sessionStorage)
    localStorage.removeItem('user');
    localStorage.removeItem('currentCompany');
    localStorage.removeItem('authorizedMenuItems');
    localStorage.removeItem('company');
    localStorage.removeItem('warehousePOS');
    localStorage.removeItem('warehouse');

    // ✅ FIX: Limpiar estado de onboarding y diagnostic survey para evitar conflictos en próximo login
    localStorage.removeItem('katuq_onboarding_state');
    localStorage.removeItem('katuq_diagnostic_progress');

    this.router.navigateByUrl('/login');
  }

  /**
   * Carga los datos de la empresa y espera a que se complete
   * FIX: Soluciona race condition al cargar empresa ANTES de redirigir a onboarding
   */
  private loadCompanyData(companyName: string, userEmail: string): Promise<void> {
    console.log(`📥 Cargando datos de empresa: ${companyName}`);

    return new Promise((resolve, reject) => {
      // Llamar al método existente que ya maneja la lógica de guardado
      // Este método retorna un Subscription y maneja internamente el guardado
      const subscription = this.services.getEmpresaByName({ company: companyName });

      // Dar tiempo para que la suscripción interna se complete
      // Verificar en intervalos si los datos ya están disponibles
      let attempts = 0;
      const maxAttempts = 20; // 2 segundos máximo (20 * 100ms)

      const checkInterval = setInterval(() => {
        attempts++;
        const companyData = this.getCompanyFromStorage();

        if (companyData && (companyData.nit || companyData.NIT || companyData.nomComercial)) {
          clearInterval(checkInterval);

          // Asegurar que esté en ambos storages para compatibilidad
          sessionStorage.setItem('currentCompany', JSON.stringify(companyData));

          console.log('✅ Empresa cargada correctamente:', companyData.nomComercial || companyData.nombre);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.warn('⚠️ Timeout esperando datos de empresa');
          reject(new Error('Timeout loading company data'));
        }
      }, 100);
    });
  }

  /**
   * Obtiene los datos de la empresa desde storage
   */
  private getCompanyFromStorage(): any {
    try {
      // Primero intentar desde sessionStorage
      let company = sessionStorage.getItem('currentCompany');
      if (company && company !== 'undefined' && company !== 'null') {
        const parsed = JSON.parse(company);
        if (parsed && (parsed.nit || parsed.NIT)) {
          return parsed;
        }
      }

      // Si no está en sessionStorage, intentar localStorage
      company = localStorage.getItem('currentCompany');
      if (company && company !== 'undefined' && company !== 'null') {
        const parsed = JSON.parse(company);
        if (parsed && (parsed.nit || parsed.NIT)) {
          return parsed;
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing company from storage:', error);
      return null;
    }
  }

  // Constantes para la validación de sesión
  private readonly SESSION_DURATION_HOURS = 48;
  private readonly REQUIRED_USER_FIELDS = ['token', 'email', 'rol'];

  get isLoggedIn(): boolean {
    try {
      // Validar existencia de datos básicos
      const user = localStorage.getItem("user");
      const loginTime = localStorage.getItem("loginTime");
      
      if (!user || !loginTime || user.trim() === '' || loginTime.trim() === '') {
        this.clearInvalidSession();
        return false;
      }

      // Validar formato JSON del usuario
      let parsedUser: any;
      try {
        parsedUser = JSON.parse(user);
      } catch (parseError) {
        console.error("Error parsing user JSON from localStorage:", parseError);
        this.clearInvalidSession();
        return false;
      }

      // Validar estructura del objeto usuario
      if (!this.isValidUserObject(parsedUser)) {
        console.warn("Invalid user object structure");
        this.clearInvalidSession();
        return false;
      }

      // Validar token
      if (!this.isValidToken(parsedUser.token)) {
        console.warn("Invalid or missing token");
        this.clearInvalidSession();
        return false;
      }

      // Validar tiempo de sesión
      if (!this.isValidSessionTime(loginTime)) {
        console.warn("Session expired");
        this.clearInvalidSession();
        return false;
      }

      return true;

    } catch (error) {
      console.error("Unexpected error in isLoggedIn:", error);
      this.clearInvalidSession();
      return false;
    }
  }

  /**
   * Valida si el objeto usuario tiene la estructura requerida
   */
  private isValidUserObject(user: any): boolean {
    if (!user || typeof user !== 'object') {
      return false;
    }

    // Verificar campos requeridos
    for (const field of this.REQUIRED_USER_FIELDS) {
      if (!user.hasOwnProperty(field) || 
          user[field] === null || 
          user[field] === undefined || 
          (typeof user[field] === 'string' && user[field].trim() === '')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Valida si el token tiene un formato válido
   */
  private isValidToken(token: any): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Verificar que no esté vacío y tenga una longitud mínima
    const trimmedToken = token.trim();
    if (trimmedToken === '' || trimmedToken.length < 10) {
      return false;
    }

    // Validar formato básico del token (puedes ajustar según tu formato específico)
    // Asumiendo que es un token JWT o similar
    const tokenParts = trimmedToken.split('.');
    if (tokenParts.length !== 3) {
      return false;
    }

    return true;
  }

  /**
   * Valida si el tiempo de sesión no ha expirado
   */
  private isValidSessionTime(loginTime: string): boolean {
    try {
      const loginDate = new Date(loginTime);
      
      // Verificar que la fecha sea válida
      if (isNaN(loginDate.getTime())) {
        return false;
      }

      const currentDate = new Date();
      
      // Verificar que la fecha de login no sea futura
      if (loginDate.getTime() > currentDate.getTime()) {
        return false;
      }

      // Calcular diferencia en horas
      const timeDifferenceMs = currentDate.getTime() - loginDate.getTime();
      const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);

      return timeDifferenceHours >= 0 && timeDifferenceHours <= this.SESSION_DURATION_HOURS;

    } catch (error) {
      console.error("Error validating session time:", error);
      return false;
    }
  }

  /**
   * Limpia la sesión inválida del localStorage
   */
  private clearInvalidSession(): void {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('loginTime');
      localStorage.removeItem('authorizedMenuItems');
      localStorage.removeItem('company');
      localStorage.removeItem('warehousePOS');
      localStorage.removeItem('warehouse');
      localStorage.removeItem('currentCompany');
    } catch (error) {
      console.error("Error clearing invalid session:", error);
    }
  }
}
