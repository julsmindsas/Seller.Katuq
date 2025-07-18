import { Injectable, OnInit, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { ServiciosService } from "../servicios.service";
import { TranslateService } from "@ngx-translate/core";
import Swal from "sweetalert2";
import { NavService } from "../nav.service";
import { InitializationService } from "../initialization.service";
import { BehaviorSubject } from 'rxjs';

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
    private initializationService: InitializationService
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

  private handleSignInSuccess(result: any): void {
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
      } else if (isJulsmindAdmin) {
        // Redirigir a la página de administración de Julsmind
        this.router.navigate(["/dashboards"]);
      } else {
        // Redirigir a la página de bienvenida para otros roles
        this.router.navigate(["/welcome"]);
      }

      this.services.getEmpresaByName({ company: result.company });
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
    
    this.router.navigateByUrl('/login');
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
